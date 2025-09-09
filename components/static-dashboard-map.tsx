"use client"

import { useState } from "react"
import { MapPin, Leaf, AlertTriangle, CheckCircle, Clock, Eye, Navigation } from "lucide-react"
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

interface StaticDashboardMapProps {
  scans: ScanData[]
  className?: string
}

export function StaticDashboardMap({ scans, className = "" }: StaticDashboardMapProps) {
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null)

  const healthyScans = scans.filter(s => s.status === "healthy")
  const unhealthyScans = scans.filter(s => s.status === "unhealthy")
  const recentScans = scans.filter(s => 
    new Date().getTime() - s.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
  )

  // Calculate map bounds
  const allLocations = scans.map(scan => scan.location)
  const minLat = Math.min(...allLocations.map(loc => loc.lat))
  const maxLat = Math.max(...allLocations.map(loc => loc.lat))
  const minLng = Math.min(...allLocations.map(loc => loc.lng))
  const maxLng = Math.max(...allLocations.map(loc => loc.lng))

  // Default to New York if no scans
  const centerLat = scans.length > 0 ? (minLat + maxLat) / 2 : 40.7128
  const centerLng = scans.length > 0 ? (minLng + maxLng) / 2 : -74.0060

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-blue-50 to-green-50 h-[500px] rounded-lg">
            {/* Map Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-100 to-yellow-100 opacity-50"></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full" style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}></div>
            </div>

            {/* Center Point */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
            </div>

            {/* Scan Markers */}
            {scans.map((scan, index) => {
              const isHealthy = scan.status === "healthy"
              const isRecent = recentScans.includes(scan)
              
              // Calculate relative position (simplified)
              const latRange = maxLat - minLat || 0.01
              const lngRange = maxLng - minLng || 0.01
              const relativeLat = scans.length > 1 ? (scan.location.lat - minLat) / latRange : 0.5
              const relativeLng = scans.length > 1 ? (scan.location.lng - minLng) / lngRange : 0.5
              
              const top = 20 + (relativeLat * 80) // 20% to 100% from top
              const left = 20 + (relativeLng * 60) // 20% to 80% from left

              return (
                <div
                  key={scan.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ top: `${top}%`, left: `${left}%` }}
                  onClick={() => setSelectedScan(scan)}
                >
                  <div className={`
                    w-6 h-6 rounded-full border-2 border-white shadow-lg
                    flex items-center justify-center
                    transition-all duration-200 group-hover:scale-110
                    ${isHealthy ? 'bg-green-500' : 'bg-red-500'}
                    ${isRecent ? 'ring-2 ring-amber-400 ring-opacity-50' : ''}
                  `}>
                    <div className={`
                      w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-white
                      ${isHealthy ? '' : 'rotate-180'}
                    `}></div>
                  </div>
                  
                  {/* Recent indicator */}
                  {isRecent && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-white"></div>
                  )}
                  
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {scan.species?.name || 'Plant'} - {isHealthy ? 'Healthy' : 'Unhealthy'}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Map Legend */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span>Center Point</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Healthy ({healthyScans.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Unhealthy ({unhealthyScans.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                  <span>Recent ({recentScans.length})</span>
                </div>
              </div>
            </div>

            {/* No scans message */}
            {scans.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl text-muted-foreground mb-2">No scan locations yet</p>
                  <p className="text-muted-foreground">Start scanning plants to see them on the map!</p>
                </div>
              </div>
            )}

            {/* Coordinates display */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
              Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
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
