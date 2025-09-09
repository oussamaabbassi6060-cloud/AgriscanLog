"use client"

import { useEffect, useRef, useState } from "react"
import type { ScanResult } from "@/components/agriscan-testing"

interface MapViewProps {
  results: ScanResult[]
}

export function MapView({ results }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userInteractedRef = useRef<boolean>(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)

  useEffect(() => {
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by this browser")
        setIsLoadingLocation(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          setIsLoadingLocation(false)
          console.log("[v0] User location obtained:", { lat: latitude, lng: longitude })
        },
        (error) => {
          console.log("[v0] Geolocation error:", error.message)
          setLocationError(`Location access denied: ${error.message}`)
          setIsLoadingLocation(false)
          // Fallback to New York coordinates
          setUserLocation({ lat: 40.7128, lng: -74.006 })
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      )
    }

    getUserLocation()
  }, [])

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    const initMap = async () => {
      if (typeof window === "undefined" || !userLocation || !mapRef.current) return

      const L = (await import("leaflet")).default

      // Fix for default markers in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      if (mapRef.current && !mapInstanceRef.current) {
        try {
          mapInstanceRef.current = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], 15)

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current)

        const userIcon = L.divIcon({
          html: `
            <div style="
              width: 16px;
              height: 16px;
              background-color: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `,
          className: "user-location-marker",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .bindPopup("<strong>Your Location</strong>")
          .addTo(mapInstanceRef.current)

        // Add event listeners to track user interaction
        mapInstanceRef.current.on('zoomend', () => {
          userInteractedRef.current = true
        })
        mapInstanceRef.current.on('dragend', () => {
          userInteractedRef.current = true
        })
        } catch (mapError) {
          console.error('Error initializing map:', mapError)
          mapInstanceRef.current = null
        }
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
  }, [userLocation]) // Added userLocation as dependency

  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstanceRef.current || typeof window === "undefined") return

      const L = (await import("leaflet")).default

      // Clear existing markers
      markersRef.current.forEach((marker) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker)
        }
      })
      markersRef.current = []

      // Add new markers for each result
      results.forEach((result) => {
        const isHealthy = result.status === "healthy"

        // Create custom icon based on health status
        const icon = L.divIcon({
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background-color: ${isHealthy ? "#22c55e" : "#ef4444"};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 0;
                height: 0;
                border-left: 3px solid transparent;
                border-right: 3px solid transparent;
                border-bottom: 6px solid white;
                ${isHealthy ? "" : "transform: rotate(180deg);"}
              "></div>
            </div>
          `,
          className: "custom-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        const marker = L.marker([result.location.lat, result.location.lng], { icon })
          .bindPopup(`
            <div style="text-align: center; padding: 4px;">
              <strong style="color: ${isHealthy ? "#22c55e" : "#ef4444"}; text-transform: capitalize;">
                ${result.status}
              </strong><br>
              <small>Confidence: ${result.confidence}%</small><br>
              <small>${result.timestamp.toLocaleString()}</small>
            </div>
          `)
        
        if (mapInstanceRef.current) {
          marker.addTo(mapInstanceRef.current)
          markersRef.current.push(marker)
        }
      })

      // Only fit bounds on initial load or if user hasn't interacted with the map
      if (results.length > 0 && markersRef.current.length > 0 && mapInstanceRef.current) {
        // Check if this is the first time we're adding markers
        const isInitialLoad = markersRef.current.length === results.length
        
        if (isInitialLoad || !userInteractedRef.current) {
          // Only fit bounds on first load or if user hasn't interacted
          const group = L.featureGroup(markersRef.current)
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
        }
        // If user has interacted, don't change the view at all
      }
    }

    // Debounce marker updates to prevent too frequent re-renders
    const timeoutId = setTimeout(updateMarkers, 100)
    
    return () => clearTimeout(timeoutId)
  }, [results])

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-96 rounded-lg border" />
      {isLoadingLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Getting your location...</p>
          </div>
        </div>
      )}
      {locationError && (
        <div className="absolute top-2 left-2 right-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
          <p className="text-sm text-yellow-800">{locationError}</p>
          <p className="text-xs text-yellow-600">Using default location (New York)</p>
        </div>
      )}
      {results.length === 0 && !isLoadingLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">No scan results yet</p>
            <p className="text-sm text-muted-foreground">Upload and scan images to see results on the map</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Healthy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Unhealthy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
