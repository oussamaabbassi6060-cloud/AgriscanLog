"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Scan, MapPin, Coins, AlertCircle, Leaf, CreditCard, CheckCircle, XCircle, Activity, Clock, Stethoscope, Shield, ChevronDown, ChevronRight } from "lucide-react"
import { MapView } from "@/components/map-view"

interface AgriScanTestingProps {
  points: number
  onUpdatePoints: (newPoints: number) => void
  onBuyPoints: () => void // Added buy points callback prop
  onShowDashboard?: () => void // Added dashboard callback prop
}

export type ScanResult = {
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
  treatment?: string
  analysis?: {
    aboutDisease: string
    treatmentRecommendations: string
    preventionTips: string
    analysisStatus: string
    aiAnalysisWorking: boolean
  }
}

export function AgriScanTesting({ points, onUpdatePoints, onBuyPoints, onShowDashboard }: AgriScanTestingProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [latestResult, setLatestResult] = useState<ScanResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [aboutOpen, setAboutOpen] = useState<boolean>(false)
  const [treatmentOpen, setTreatmentOpen] = useState<boolean>(false)
  const [preventionOpen, setPreventionOpen] = useState<boolean>(false)

  useEffect(() => {
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        console.log("[v0] Geolocation not supported, using default location")
        setUserLocation({ lat: 40.7128, lng: -74.006 })
        setLocationError("Geolocation not supported by this browser")
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          setLocationError(null)
          console.log("[v0] User location obtained:", { lat: latitude, lng: longitude })
        },
        (error) => {
          console.log("[v0] Geolocation error, using default:", error.message)
          setUserLocation({ lat: 40.7128, lng: -74.006 })
          setLocationError(`Location access denied: ${error.message}`)
        },
        {
          enableHighAccuracy: false, // Reduced accuracy for faster response
          timeout: 5000, // Reduced timeout to 5 seconds
          maximumAge: 600000, // Accept cached location up to 10 minutes
        },
      )
    }

    getUserLocation()
  }, [])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        alert("File size must be less than 10MB")
        return
      }

      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const runAgriScanTest = async () => {
    if (!selectedImage || points < 5 || !userLocation) return

    setIsScanning(true)

    try {
      // Prepare form data for API call
      const formData = new FormData()
      formData.append('image', selectedImage)
      formData.append('location', JSON.stringify(userLocation))

      // Call our scan API
      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Scan failed')
      }

      const { result } = await response.json()

      // Create scan result from API response
      const newResult: ScanResult = {
        id: result.id || Date.now().toString(),
        status: result.overall.status,
        location: result.location || userLocation,
        timestamp: new Date(result.timestamp),
        confidence: result.overall.confidence,
        species: result.species,
        disease: result.disease,
        treatment: result.treatment,
        analysis: result.analysis
      }

      // Show the new result with animation
      setLatestResult(newResult)
      setShowResult(true)
      onUpdatePoints(points - 5)
      
    } catch (error) {
      console.error('Scan error:', error)
      alert(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsScanning(false)
      setSelectedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const canRunTest = points >= 5 && selectedImage && !isScanning && userLocation

  return (
    <div className="w-full mx-auto space-y-10">
      <div className="text-center glass-subtle rounded-2xl p-10">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="p-4 bg-primary/20 rounded-full">
            <Leaf className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl font-bold text-balance">AgriScan Testing</h1>
        </div>
        <p className="text-muted-foreground text-xl text-pretty max-w-3xl mx-auto">
          Upload crop images to analyze plant health using smart scanning technology
        </p>
      </div>

      <div className="grid xl:grid-cols-3 lg:grid-cols-2 gap-10">
        <div className="xl:col-span-2 space-y-8">
          <Card className="glass-strong">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Upload className="w-7 h-7 text-primary" />
                  Upload Image
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-2 px-4 py-2 text-lg bg-accent/20 text-accent-foreground"
                  >
                    <Coins className="w-5 h-5" />
                    {points} points
                  </Badge>
                  {points < 5 && (
                    <Button
                      onClick={onBuyPoints}
                      size="sm"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy Points
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription className="text-lg">
                Select a crop image to analyze for health assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="relative border-2 border-dashed border-border/60 rounded-xl p-12 text-center glass-input transition-all duration-200 hover:border-primary/60">
                {imagePreview ? (
                  <div className="space-y-6">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Selected crop"
                      className="max-w-full max-h-72 mx-auto rounded-xl object-cover shadow-lg"
                    />
                    <p className="text-base font-medium text-muted-foreground">{selectedImage?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-6 bg-primary/10 rounded-full w-fit mx-auto">
                      <Upload className="w-16 h-16 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-medium">Click to upload an image</p>
                      <p className="text-base text-muted-foreground">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {locationError && (
                <Alert className="glass-subtle border-accent/50">
                  <AlertCircle className="h-4 w-4 text-accent" />
                  <AlertDescription className="text-accent-foreground">
                    {locationError} - Using default location for testing.
                  </AlertDescription>
                </Alert>
              )}

              {points < 5 && (
                <Alert className="glass-subtle border-destructive/50">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-destructive-foreground">
                      Insufficient points. You need at least 5 points to run a test.
                    </span>
                    <Button
                      onClick={onBuyPoints}
                      size="sm"
                      className="ml-3 bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Buy Points
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={runAgriScanTest}
                disabled={!canRunTest}
                className="w-full h-16 text-xl font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                size="lg"
              >
                {isScanning ? (
                  <>
                    <Scan className="w-5 h-5 mr-3 animate-spin" />
                    Analyzing Crop Health...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5 mr-3" />
                    Run AgriScan Test (5 points)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Animated Results Display */}
          {showResult && latestResult && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-700">
              <Card className="glass-strong border-2 border-primary/20 shadow-2xl shadow-primary/10">
                <CardContent className="p-8">
                  <div className="space-y-8">
                    {/* Result Header with Animation */}
                    <div className="text-center space-y-4">
                      <div className="relative">
                        {/* Animated Status Icon */}
                        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center relative overflow-hidden ${
                          latestResult.status === "healthy" 
                            ? "bg-gradient-to-r from-green-400 to-green-600" 
                            : "bg-gradient-to-r from-red-400 to-red-600"
                        }`}>
                          {latestResult.status === "healthy" ? (
                            <CheckCircle className="w-12 h-12 text-white animate-in zoom-in-50 duration-1000 delay-300" />
                          ) : (
                            <AlertCircle className="w-12 h-12 text-white animate-in zoom-in-50 duration-1000 delay-300" />
                          )}
                          {/* Ripple effect */}
                          <div className={`absolute inset-0 rounded-full animate-ping ${
                            latestResult.status === "healthy" ? "bg-green-400" : "bg-red-400"
                          } opacity-20`} style={{ animationDelay: '500ms' }} />
                        </div>
                      </div>
                      
                      {/* Status Text */}
                      <div className="animate-in slide-in-from-bottom-2 duration-1000 delay-500">
                        <h2 className="text-4xl font-bold text-foreground mb-2">
                          {latestResult.status === "healthy" 
                            ? "Plant is Healthy! 🌱" 
                            : `${latestResult.disease?.name || "Disease Detected"} ⚠️`
                          }
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                          <Activity className="w-5 h-5 text-primary" />
                          <span className="text-xl font-semibold text-primary">
                            {latestResult.confidence}% Confidence
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Species and Disease Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-3 duration-1000 delay-700">
                      {/* Species Card */}
                      {latestResult.species && (
                        <Card className="glass-subtle border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-blue-500 rounded-full">
                                <Leaf className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="text-lg font-bold text-blue-900">Species Identified</h3>
                            </div>
                            <div className="space-y-2">
                              <p className="text-2xl font-bold text-blue-800">
                                {latestResult.species.name}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                      width: `${latestResult.species.confidence}%`,
                                      animationDelay: '1000ms'
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-blue-700">
                                  {latestResult.species.confidence}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Disease/Health Card */}
                      {latestResult.disease && (
                        <Card className={`glass-subtle border ${
                          latestResult.disease.isHealthy 
                            ? "border-green-200 bg-gradient-to-br from-green-50 to-green-100" 
                            : "border-red-200 bg-gradient-to-br from-red-50 to-red-100"
                        }`}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`p-2 rounded-full ${
                                latestResult.disease.isHealthy ? "bg-green-500" : "bg-red-500"
                              }`}>
                                {latestResult.disease.isHealthy ? (
                                  <CheckCircle className="w-5 h-5 text-white" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <h3 className={`text-lg font-bold ${
                                latestResult.disease.isHealthy ? "text-green-900" : "text-red-900"
                              }`}>
                                Health Status
                              </h3>
                            </div>
                            <div className="space-y-2">
                              <p className={`text-2xl font-bold capitalize ${
                                latestResult.disease.isHealthy ? "text-green-800" : "text-red-800"
                              }`}>
                                {latestResult.disease.name}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className={`flex-1 rounded-full h-2 overflow-hidden ${
                                  latestResult.disease.isHealthy ? "bg-green-200" : "bg-red-200"
                                }`}>
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                      latestResult.disease.isHealthy ? "bg-green-600" : "bg-red-600"
                                    }`}
                                    style={{ 
                                      width: `${latestResult.disease.confidence}%`,
                                      animationDelay: '1200ms'
                                    }}
                                  />
                                </div>
                                <span className={`text-sm font-medium ${
                                  latestResult.disease.isHealthy ? "text-green-700" : "text-red-700"
                                }`}>
                                  {latestResult.disease.confidence}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Treatment Recommendation - removed per request */}

                    {/* Comprehensive Analysis Section */}
                    {latestResult.analysis && latestResult.analysis.aiAnalysisWorking && (
                      <div className="animate-in slide-in-from-bottom-4 duration-1000 delay-1100 space-y-6">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full">
                              <Shield className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                              Expert Analysis
                            </h2>
                          </div>
                          <p className="text-muted-foreground text-lg">
                            Comprehensive agricultural insights
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                          {/* About the Disease */}
                          {latestResult.analysis.aboutDisease && (
                            <Card className="glass-subtle border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 shadow-lg">
                              <CardContent className="p-6">
                                <button type="button" onClick={() => setAboutOpen(!aboutOpen)} className="w-full text-left">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                      <h3 className="text-2xl font-bold text-purple-900 mb-2 flex items-center gap-2">
                                        {aboutOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        About the Disease
                                      </h3>
                                      {aboutOpen && (
                                        <div className="prose prose-lg prose-purple max-w-none">
                                          <div className="text-purple-800 text-base leading-relaxed whitespace-pre-wrap">
                                            {latestResult.analysis.aboutDisease}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </CardContent>
                            </Card>
                          )}

                          {/* Treatment Recommendations */}
                          {latestResult.analysis.treatmentRecommendations && (
                            <Card className="glass-subtle border-2 border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 shadow-lg">
                              <CardContent className="p-6">
                                <button type="button" onClick={() => setTreatmentOpen(!treatmentOpen)} className="w-full text-left">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                      <h3 className="text-2xl font-bold text-green-900 mb-2 flex items-center gap-2">
                                        {treatmentOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        Treatment Recommendations
                                      </h3>
                                      {treatmentOpen && (
                                        <div className="prose prose-lg prose-green max-w-none">
                                          <div className="text-green-800 text-base leading-relaxed whitespace-pre-wrap">
                                            {latestResult.analysis.treatmentRecommendations}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </CardContent>
                            </Card>
                          )}

                          {/* Prevention Tips */}
                          {latestResult.analysis.preventionTips && (
                            <Card className="glass-subtle border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 shadow-lg">
                              <CardContent className="p-6">
                                <button type="button" onClick={() => setPreventionOpen(!preventionOpen)} className="w-full text-left">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                      <h3 className="text-2xl font-bold text-amber-900 mb-2 flex items-center gap-2">
                                        {preventionOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        Prevention Tips
                                      </h3>
                                      {preventionOpen && (
                                        <div className="prose prose-lg prose-amber max-w-none">
                                          <div className="text-amber-800 text-base leading-relaxed whitespace-pre-wrap">
                                            {latestResult.analysis.preventionTips}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </CardContent>
                            </Card>
                          )}
                        </div>

                        {/* Analysis Footer - status removed per request */}
                        <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
                          <p className="text-xs text-purple-600 mt-1">
                            Generated in real-time
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-5 duration-1000 delay-1200">
                      <Button 
                        onClick={() => {
                          setShowResult(false)
                          setLatestResult(null)
                        }}
                        className="flex-1 h-14 text-lg bg-primary hover:bg-primary/90"
                      >
                        <Scan className="w-5 h-5 mr-3" />
                        Scan Another Plant
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 h-14 text-lg bg-transparent border-2"
                        onClick={() => {
                          if (onShowDashboard) {
                            onShowDashboard()
                          } else {
                            // Fallback: Try to click the dashboard button in the header
                            const dashboardBtn = document.querySelector('[data-dashboard-button]')
                            if (dashboardBtn instanceof HTMLElement) {
                              dashboardBtn.click()
                            }
                          }
                        }}
                      >
                        <MapPin className="w-5 h-5 mr-3" />
                        View in Dashboard
                      </Button>
                    </div>

                    {/* Scan Details Footer */}
                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground border-t pt-4 animate-in fade-in duration-1000 delay-1400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {latestResult.timestamp.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {latestResult.location.lat.toFixed(4)}, {latestResult.location.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="xl:col-span-1 space-y-8">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MapPin className="w-7 h-7 text-primary" />
                Scan Location Preview
              </CardTitle>
              <CardDescription className="text-lg">
                Your current location for plant scanning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl overflow-hidden">
                <MapView results={latestResult ? [latestResult] : []} />
              </div>
              {!latestResult && (
                <div className="mt-4 text-center text-muted-foreground">
                  <p>Upload an image to see scan results here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          {!showResult && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="w-6 h-6 text-primary" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 glass-subtle rounded-lg">
                  <span className="text-muted-foreground">Available Points</span>
                  <span className="text-2xl font-bold text-accent">{points}</span>
                </div>
                <div className="flex justify-between items-center p-3 glass-subtle rounded-lg">
                  <span className="text-muted-foreground">Cost per Scan</span>
                  <span className="text-lg font-semibold text-primary">5 points</span>
                </div>
                <div className="flex justify-between items-center p-3 glass-subtle rounded-lg">
                  <span className="text-muted-foreground">Possible Scans</span>
                  <span className="text-lg font-semibold text-foreground">{Math.floor(points / 5)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
