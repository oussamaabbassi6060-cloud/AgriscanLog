"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { MapPin, Leaf, AlertTriangle, CheckCircle, Clock, Eye, Navigation } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ScanData {
  id: string
  status: "healthy" | "unhealthy"
  location: { lat: number; lng: number }
  timestamp: Date
  health: number
  species?: {
    name: string
    health: number
  }
  disease?: {
    name: string
    health: number
    isHealthy: boolean
  }
}

interface InteractiveDashboardMapProps {
  scans: ScanData[]
  className?: string
}

// Interactive map component using Leaflet
function InteractiveMap({ scans, center }: { scans: ScanData[]; center: [number, number] }) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInitializedRef = useRef(false)
  const cleanupRef = useRef<() => void>()
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapInitializedRef.current) return // Prevent double initialization

    const initMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import('leaflet')

        // Fix default markers
        delete (L.default.Icon.Default.prototype as any)._getIconUrl
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        })

        // Wait for container to be available and check size
        if (!mapContainerRef.current) {
          console.warn('Map container not ready')
          return
        }

        // Check if container has valid dimensions
        const containerWidth = mapContainerRef.current.offsetWidth
        const containerHeight = mapContainerRef.current.offsetHeight
        
        if (containerWidth === 0 || containerHeight === 0) {
          console.warn('Map container has no dimensions, retrying...')
          setTimeout(initMap, 200)
          return
        }

        // Clear any existing map
        if (mapContainerRef.current._leaflet_id) {
          mapContainerRef.current.innerHTML = ''
          mapContainerRef.current.removeAttribute('_leaflet_id')
        }

        // Mark as initialized
        mapInitializedRef.current = true

        // Create map instance with safer options
        const map = L.default.map(mapContainerRef.current, {
          center: center,
          zoom: scans.length > 0 ? 10 : 8,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          dragging: true,
          touchZoom: true,
          boxZoom: true,
          keyboard: true,
          // Add these options to prevent DOM issues
          preferCanvas: false,
          renderer: L.default.svg(),
          // Add these to handle container issues
          trackResize: true,
          markerZoomAnimation: true
        })

        // Add tile layer
        L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map)

        // Create custom icons
        const createCustomIcon = (isHealthy: boolean, isRecent: boolean) => {
          const color = isHealthy ? '#22c55e' : '#ef4444'
          const svg = `
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="3"/>
              <polygon points="16,8 20,16 16,24 12,16" fill="white"/>
              ${isRecent ? '<circle cx="24" cy="8" r="4" fill="#f59e0b" stroke="white" stroke-width="2"/>' : ''}
            </svg>
          `
          
          return L.default.divIcon({
            html: svg,
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          })
        }

        // Add markers
        const newMarkers: any[] = []
        scans.forEach((scan) => {
          const isHealthy = scan.status === "healthy"
          const isRecent = new Date().getTime() - scan.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000

          const icon = createCustomIcon(isHealthy, isRecent)
          const marker = L.default.marker([scan.location.lat, scan.location.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 200px; padding: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${isHealthy ? '#22c55e' : '#ef4444'}"></div>
                  <strong>${isHealthy ? 'Healthy' : 'Unhealthy'} Plant</strong>
                  ${isRecent ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Recent</span>' : ''}
                </div>
                ${scan.species ? `<div style="margin-bottom: 4px;"><strong>Species:</strong> ${scan.species.name}</div>` : ''}
                <div style="margin-bottom: 4px;"><strong>Health:</strong> ${scan.health}%</div>
                <div style="margin-bottom: 4px;"><strong>Date:</strong> ${scan.timestamp.toLocaleDateString()}</div>
                <div style="font-size: 12px; color: #666;">
                  ${scan.location.lat.toFixed(4)}, ${scan.location.lng.toFixed(4)}
                </div>
              </div>
            `)

          newMarkers.push(marker)
        })

        // Fit bounds if there are scans
        if (scans.length > 0 && newMarkers.length > 0) {
          const group = new L.default.featureGroup(newMarkers)
          map.fitBounds(group.getBounds().pad(0.1))
        }

        // Store cleanup function
        cleanupRef.current = () => {
          try {
            markers.forEach(marker => {
              try {
                marker.remove()
              } catch (e) {
                console.warn('Error removing marker:', e)
              }
            })
            map.remove()
          } catch (error) {
            console.warn('Error during map cleanup:', error)
          }
        }

        setMapInstance(map)
        setMarkers(newMarkers)
        setMapLoaded(true)

        // Handle window resize
        const handleResize = () => {
          if (map && mapContainerRef.current) {
            setTimeout(() => {
              map.invalidateSize()
            }, 100)
          }
        }
        window.addEventListener('resize', handleResize)

        // Store cleanup for resize listener
        const originalCleanup = cleanupRef.current
        cleanupRef.current = () => {
          window.removeEventListener('resize', handleResize)
          originalCleanup()
        }

      } catch (error) {
        console.error('Error initializing map:', error)
        setMapLoaded(true) // Still show the container even if map fails
        mapInitializedRef.current = false // Allow retry
      }
    }

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(initMap, 100)

    // Cleanup function
    return () => {
      clearTimeout(timeoutId)
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      mapInitializedRef.current = false
      setMapInstance(null)
      setMarkers([])
    }
  }, []) // Remove dependencies to prevent re-initialization

  // Update map when scans change
  useEffect(() => {
    if (!mapInstance || !mapInitializedRef.current) return

    const updateMarkers = async () => {
      try {
        const L = await import('leaflet')
        
        // Clear existing markers
        markers.forEach(marker => {
          try {
            marker.remove()
          } catch (e) {
            console.warn('Error removing marker:', e)
          }
        })

        // Create custom icons
        const createCustomIcon = (isHealthy: boolean, isRecent: boolean) => {
          const color = isHealthy ? '#22c55e' : '#ef4444'
          const svg = `
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="3"/>
              <polygon points="16,8 20,16 16,24 12,16" fill="white"/>
              ${isRecent ? '<circle cx="24" cy="8" r="4" fill="#f59e0b" stroke="white" stroke-width="2"/>' : ''}
            </svg>
          `
          
          return L.default.divIcon({
            html: svg,
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          })
        }

        // Add new markers
        const newMarkers: any[] = []
        scans.forEach((scan) => {
          const isHealthy = scan.status === "healthy"
          const isRecent = new Date().getTime() - scan.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000

          const icon = createCustomIcon(isHealthy, isRecent)
          const marker = L.default.marker([scan.location.lat, scan.location.lng], { icon })
            .addTo(mapInstance)
            .bindPopup(`
              <div style="min-width: 200px; padding: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${isHealthy ? '#22c55e' : '#ef4444'}"></div>
                  <strong>${isHealthy ? 'Healthy' : 'Unhealthy'} Plant</strong>
                  ${isRecent ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Recent</span>' : ''}
                </div>
                ${scan.species ? `<div style="margin-bottom: 4px;"><strong>Species:</strong> ${scan.species.name}</div>` : ''}
                <div style="margin-bottom: 4px;"><strong>Health:</strong> ${scan.health}%</div>
                <div style="margin-bottom: 4px;"><strong>Date:</strong> ${scan.timestamp.toLocaleDateString()}</div>
                <div style="font-size: 12px; color: #666;">
                  ${scan.location.lat.toFixed(4)}, ${scan.location.lng.toFixed(4)}
                </div>
              </div>
            `)

          newMarkers.push(marker)
        })

        // Fit bounds if there are scans
        if (scans.length > 0 && newMarkers.length > 0) {
          const group = new L.default.featureGroup(newMarkers)
          mapInstance.fitBounds(group.getBounds().pad(0.1))
        }

        setMarkers(newMarkers)
      } catch (error) {
        console.error('Error updating markers:', error)
      }
    }

    updateMarkers()
  }, [scans, mapInstance])

  return (
    <div className="relative h-[500px] w-full">
      <div 
        ref={mapContainerRef}
        className="h-full w-full rounded-lg"
        style={{ 
          minHeight: '500px',
          position: 'relative',
          zIndex: 1,
          display: 'block'
        }}
      />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading interactive map...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function InteractiveDashboardMap({ scans, className = "" }: InteractiveDashboardMapProps) {
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Memoized calculations
  const { healthyScans, unhealthyScans, recentScans, center } = useMemo(() => {
    const healthy = scans.filter(s => s.status === "healthy")
    const unhealthy = scans.filter(s => s.status === "unhealthy")
    const recent = scans.filter(s => 
      new Date().getTime() - s.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
    )
    
    const defaultCenter: [number, number] = [40.7128, -74.0060]
    const mapCenter = scans.length > 0 
      ? [scans[0].location.lat, scans[0].location.lng] as [number, number]
      : defaultCenter
    
    return {
      healthyScans: healthy,
      unhealthyScans: unhealthy,
      recentScans: recent,
      center: mapCenter
    }
  }, [scans])

  if (!isClient) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[500px] flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <InteractiveMap scans={scans} center={center} />
            
            {/* No scans message */}
            {scans.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl text-muted-foreground mb-2">No scan locations yet</p>
                  <p className="text-muted-foreground">Start scanning plants to see them on the map!</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Healthy Scans</p>
                <p className="text-2xl font-bold text-green-600">{healthyScans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unhealthy Scans</p>
                <p className="text-2xl font-bold text-red-600">{unhealthyScans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recent Scans</p>
                <p className="text-2xl font-bold text-amber-600">{recentScans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan List */}
      {scans.length > 0 && (
        <Card className="glass">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Scan Locations
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {scans.map((scan) => {
                const isHealthy = scan.status === "healthy"
                const isRecent = recentScans.includes(scan)
                
                return (
                  <div
                    key={scan.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedScan?.id === scan.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-muted/50 hover:bg-muted/80'
                    }`}
                    onClick={() => setSelectedScan(scan)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-medium">{scan.species?.name || 'Unknown Plant'}</p>
                          <p className="text-sm text-muted-foreground">
                            {scan.location.lat.toFixed(4)}, {scan.location.lng.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={isHealthy ? "default" : "destructive"} className="mb-1">
                          {isHealthy ? 'Healthy' : 'Unhealthy'}
                        </Badge>
                        {isRecent && (
                          <Badge variant="outline" className="ml-1">
                            Recent
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {scan.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Scan Details */}
      {selectedScan && (
        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedScan.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Leaf className={`w-5 h-5 ${selectedScan.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {selectedScan.species?.name || 'Unknown Plant'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedScan.timestamp.toLocaleDateString()} at {selectedScan.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedScan(null)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={selectedScan.status === 'healthy' ? 'default' : 'destructive'}>
                    {selectedScan.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Health Score:</span>
                  <span className="text-sm font-medium">{selectedScan.health}%</span>
                </div>
                {selectedScan.species && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Species Health:</span>
                    <span className="text-sm font-medium">{selectedScan.species.health}%</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Location:</span>
                  <span className="text-sm font-medium">
                    {selectedScan.location.lat.toFixed(4)}, {selectedScan.location.lng.toFixed(4)}
                  </span>
                </div>
                {selectedScan.disease && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Disease:</span>
                    <span className="text-sm font-medium capitalize">{selectedScan.disease.name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
