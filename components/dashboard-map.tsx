"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Leaf, AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ScanData {
  id: string
  status: "healthy" | "unhealthy"
  location: { lat: number; lng: number }
  timestamp: Date
  confidence: number
  species?: {
    name: string
    confidence: number
  }
  disease?: {
    name: string
    confidence: number
    isHealthy: boolean
  }
}

interface DashboardMapProps {
  scans: ScanData[]
  className?: string
}

export function DashboardMap({ scans, className = "" }: DashboardMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Get user location
  useEffect(() => {
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        setUserLocation({ lat: 40.7128, lng: -74.0060 })
        setIsLoadingLocation(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          setIsLoadingLocation(false)
        },
        () => {
          setUserLocation({ lat: 40.7128, lng: -74.0060 })
          setIsLoadingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      )
    }

    getUserLocation()
  }, [])

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === "undefined" || !userLocation || !mapRef.current || mapLoaded || mapInstanceRef.current) return

      const L = (await import("leaflet")).default

      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      try {
        // Create map with custom styling
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [userLocation.lat, userLocation.lng],
          zoom: 10,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          dragging: true,
          touchZoom: true
        })

        // Add custom tile layer with better styling
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current)

        // Add user location marker
        const userIcon = L.divIcon({
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 6px;
                height: 6px;
                background: white;
                border-radius: 50%;
              "></div>
            </div>
          `,
          className: "user-location-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .bindPopup(`
            <div style="text-align: center; padding: 8px; font-family: system-ui;">
              <strong style="color: #3b82f6; font-size: 14px;">📍 Your Location</strong>
            </div>
          `)
          .addTo(mapInstanceRef.current)

        setMapLoaded(true)
      } catch (error) {
        console.error('Error initializing map:', error)
      }
    }

    initMap()

    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
      document.head.appendChild(link)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [userLocation, mapLoaded])

  // Update scan markers
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstanceRef.current || !mapLoaded || typeof window === "undefined") return

      console.log('Updating markers with scans:', scans)
      const L = (await import("leaflet")).default

      // Clear existing markers
      markersRef.current.forEach((marker) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker)
        }
      })
      markersRef.current = []

      // Add scan markers
      console.log('Adding markers for', scans.length, 'scans')
      scans.forEach((scan, index) => {
        console.log(`Adding marker ${index + 1}:`, scan)
        const isHealthy = scan.status === "healthy"
        const isRecent = new Date().getTime() - scan.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days

        // Create custom icon with better styling
        const icon = L.divIcon({
          html: `
            <div style="
              width: ${isRecent ? '32px' : '28px'};
              height: ${isRecent ? '32px' : '28px'};
              background: ${isHealthy 
                ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                : 'linear-gradient(135deg, #ef4444, #dc2626)'
              };
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px ${isHealthy 
                ? 'rgba(34, 197, 94, 0.4)' 
                : 'rgba(239, 68, 68, 0.4)'
              };
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              cursor: pointer;
              transition: all 0.2s ease;
            " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <div style="
                width: 0;
                height: 0;
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 8px solid white;
                ${isHealthy ? "" : "transform: rotate(180deg);"}
              "></div>
              ${isRecent ? `
                <div style="
                  position: absolute;
                  top: -2px;
                  right: -2px;
                  width: 8px;
                  height: 8px;
                  background: #f59e0b;
                  border: 2px solid white;
                  border-radius: 50%;
                "></div>
              ` : ''}
            </div>
          `,
          className: "scan-marker",
          iconSize: [isRecent ? 32 : 28, isRecent ? 32 : 28],
          iconAnchor: [isRecent ? 16 : 14, isRecent ? 16 : 14],
        })

        const marker = L.marker([scan.location.lat, scan.location.lng], { icon })
          .bindPopup(`
            <div style="
              text-align: left; 
              padding: 12px; 
              font-family: system-ui; 
              min-width: 200px;
              background: white;
              border-radius: 8px;
            ">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="
                  width: 12px; 
                  height: 12px; 
                  background: ${isHealthy ? '#22c55e' : '#ef4444'}; 
                  border-radius: 50%;
                "></div>
                <strong style="color: ${isHealthy ? '#16a34a' : '#dc2626'}; font-size: 14px;">
                  ${isHealthy ? 'Healthy' : 'Unhealthy'} Plant
                </strong>
                ${isRecent ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">NEW</span>' : ''}
              </div>
              ${scan.species ? `<div style="margin-bottom: 4px;"><strong>Species:</strong> ${scan.species.name}</div>` : ''}
              <div style="margin-bottom: 4px;"><strong>Confidence:</strong> ${scan.confidence}%</div>
              <div style="margin-bottom: 8px;"><strong>Date:</strong> ${scan.timestamp.toLocaleDateString()}</div>
              <button onclick="window.selectScan('${scan.id}')" style="
                background: #3b82f6; 
                color: white; 
                border: none; 
                padding: 6px 12px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 12px;
              ">View Details</button>
            </div>
          `)
          .on('click', () => setSelectedScan(scan))

        if (mapInstanceRef.current) {
          marker.addTo(mapInstanceRef.current)
          markersRef.current.push(marker)
        }
      })

      // Fit map to show all markers if there are any
      if (scans.length > 0 && markersRef.current.length > 0 && mapInstanceRef.current) {
        const group = L.featureGroup(markersRef.current)
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
        console.log('Fitted map to show', markersRef.current.length, 'markers')
      } else if (scans.length === 0) {
        console.log('No scans available to display on map')
        // Add a test marker if no scans are available
        const testIcon = L.divIcon({
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background: linear-gradient(135deg, #8b5cf6, #7c3aed);
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 0;
                height: 0;
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 8px solid white;
              "></div>
            </div>
          `,
          className: "test-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        const testMarker = L.marker([userLocation.lat, userLocation.lng], { icon: testIcon })
          .bindPopup(`
            <div style="text-align: center; padding: 8px; font-family: system-ui;">
              <strong style="color: #8b5cf6; font-size: 14px;">📍 Test Location</strong><br>
              <small>No scans available yet</small>
            </div>
          `)
          .addTo(mapInstanceRef.current)
        
        markersRef.current.push(testMarker)
      }
    }

    updateMarkers()
  }, [scans, mapLoaded])

  // Add global function for popup button
  useEffect(() => {
    (window as any).selectScan = (scanId: string) => {
      const scan = scans.find(s => s.id === scanId)
      if (scan) setSelectedScan(scan)
    }
  }, [scans])

  const healthyScans = scans.filter(s => s.status === "healthy").length
  const unhealthyScans = scans.filter(s => s.status === "unhealthy").length
  const recentScans = scans.filter(s => 
    new Date().getTime() - s.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
  ).length

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <div ref={mapRef} className="w-full h-[500px] rounded-lg" />
            
            {isLoadingLocation && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}

            {/* Map Legend */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Your Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Healthy ({healthyScans})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Unhealthy ({unhealthyScans})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span>Recent ({recentScans})</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Healthy Scans</p>
                <p className="text-2xl font-bold text-green-600">{healthyScans}</p>
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
                <p className="text-2xl font-bold text-red-600">{unhealthyScans}</p>
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
                <p className="text-2xl font-bold text-amber-600">{recentScans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <span className="text-sm font-medium">{selectedScan.confidence}%</span>
                </div>
                {selectedScan.species && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Species Confidence:</span>
                    <span className="text-sm font-medium">{selectedScan.species.confidence}%</span>
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
