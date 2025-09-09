"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  Calendar,
  MapPin,
  Download,
  Eye,
  TrendingUp,
  Leaf,
  AlertTriangle,
  CheckCircle,
  User,
  CreditCard,
  Key,
  ChevronDown,
  ChevronUp,
  Brain,
  Stethoscope,
  Shield,
} from "lucide-react"
import { RealDashboardMap } from "@/components/real-dashboard-map"

interface ProfileData {
  id: string
  clerk_id: string
  username: string
  email: string
  gender: string | null
  age: number | null
  points: number
  token: string
  created_at: string
  updated_at: string
}

interface DashboardProps {
  points: number
  userData: ProfileData | null
  onBuyPoints: () => void
}

// Mock data for demonstration (used only if no real data is available)
const mockScans = [
  {
    id: 1,
    date: "2024-01-15",
    time: "14:30",
    image: "/placeholder-uwum6.png",
    result: "Healthy",
    confidence: 95,
    treatment: "Continue current care routine",
    location: "Field A-1",
  },
  {
    id: 2,
    date: "2024-01-14",
    time: "09:15",
    image: "/placeholder-w5qcg.png",
    result: "Wheat Rust",
    confidence: 87,
    treatment: "Apply fungicide treatment within 48 hours",
    location: "Field B-3",
  },
  {
    id: 3,
    date: "2024-01-13",
    time: "16:45",
    image: "/placeholder-bzzds.png",
    result: "Healthy",
    confidence: 92,
    treatment: "Maintain current irrigation schedule",
    location: "Field C-2",
  },
  {
    id: 4,
    date: "2024-01-12",
    time: "11:20",
    image: "/placeholder-0hsth.png",
    result: "Late Blight",
    confidence: 89,
    treatment: "Remove affected plants, apply copper-based fungicide",
    location: "Field A-4",
  },
]

// Color palette for dynamic disease distribution
const diseaseColors = ["#22c55e", "#ef4444", "#f97316", "#eab308", "#06b6d4", "#8b5cf6", "#14b8a6", "#f43f5e"]

export function Dashboard({ points, userData, onBuyPoints }: DashboardProps) {
  const [showApiDialog, setShowApiDialog] = useState(false)
  const [apiToken, setApiToken] = useState<string>("")
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const { toast } = useToast()
  
  // Load API token when dialog opens
  useEffect(() => {
    if (showApiDialog && userData?.token) {
      setApiToken(userData.token)
    }
  }, [showApiDialog, userData?.token])

  // API Token Management Functions
  const copyApiToken = async () => {
    if (apiToken) {
      try {
        await navigator.clipboard.writeText(apiToken)
        toast({
          title: "API Token Copied!",
          description: "Your API token has been copied to clipboard.",
        })
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy token to clipboard.",
          variant: "destructive",
        })
      }
    }
  }

  const generateNewToken = async () => {
    setIsGeneratingToken(true)
    try {
      const response = await fetch('/api/profiles/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const { token } = await response.json()
        setApiToken(token)
        toast({
          title: "New Token Generated!",
          description: "Your API token has been regenerated successfully.",
        })
      } else {
        throw new Error('Failed to generate token')
      }
    } catch (error) {
      toast({
        title: "Token Generation Failed",
        description: "Failed to generate new API token. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingToken(false)
    }
  }

  const [activeTab, setActiveTab] = useState("overview")
  const [realScans, setRealScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedScans, setExpandedScans] = useState<Set<string>>(new Set())
  const [refreshingAI, setRefreshingAI] = useState(false)

  // Fetch real scan data (initial + focus-based refresh only)
  useEffect(() => {
    let isCancelled = false

    const fetchScans = async () => {
      try {
        const response = await fetch('/api/scans', { cache: 'no-store' })
        if (response.ok) {
          const { scans } = await response.json()
          if (!isCancelled) setRealScans(scans || [])
        } else {
          console.error('Failed to fetch scans:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching scans:', error)
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    // Initial fetch
    fetchScans()

    // Only refresh on window focus/visibility change (no automatic polling)
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchScans() }
    const handleFocus = () => fetchScans()
    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    return () => {
      isCancelled = true
      window.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Use real data if available, fallback to mock data
  const scansToUse = realScans.length > 0 ? realScans : mockScans
  const totalScans = scansToUse.length
  const healthyScans = scansToUse.filter((scan) => 
    scan.result === "Healthy" || scan.disease === "healthy"
  ).length
  const diseaseScans = totalScans - healthyScans
  
  // Disease distribution from real data
  const diseaseCount: { [key: string]: number } = {}
  scansToUse.forEach((scan) => {
    const key = (scan.disease && scan.disease !== "healthy") ? scan.disease : "Healthy"
    diseaseCount[key] = (diseaseCount[key] || 0) + 1
  })
  const diseaseData = Object.entries(diseaseCount).map(([name, value], idx) => ({
    name,
    value,
    color: diseaseColors[idx % diseaseColors.length],
  }))

  // Most common disease (excluding Healthy)
  const nonHealthy = Object.entries(diseaseCount).filter(([k]) => k !== "Healthy")
  const mostCommonDisease = nonHealthy.length > 0
    ? nonHealthy.sort(([,a], [,b]) => b - a)[0][0]
    : "None detected"

  // Health trends over recent months from real data
  const monthKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,7) // YYYY-MM
  const monthLabel = (d: Date) => d.toLocaleString(undefined, { month: 'short' })
  const byMonth: Record<string, { healthy: number; diseased: number; label: string }> = {}
  scansToUse.forEach((scan) => {
    const date = new Date(scan.created_at || scan.date || Date.now())
    const key = monthKey(date)
    if (!byMonth[key]) byMonth[key] = { healthy: 0, diseased: 0, label: monthLabel(date) }
    const isHealthy = (scan.result === "Healthy" || scan.disease === "healthy")
    if (isHealthy) byMonth[key].healthy += 1
    else byMonth[key].diseased += 1
  })
  const timelineData = Object.entries(byMonth)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(-6) // last 6 months
    .map(([,v]) => ({ month: v.label, healthy: v.healthy, diseased: v.diseased }))

  const toggleScanExpansion = (scanId: string) => {
    const newExpanded = new Set(expandedScans)
    if (newExpanded.has(scanId)) {
      newExpanded.delete(scanId)
    } else {
      newExpanded.add(scanId)
    }
    setExpandedScans(newExpanded)
  }

  const refreshAIAnalysis = async () => {
    setRefreshingAI(true)
    try {
      const response = await fetch('/api/refresh-analysis', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('AI analysis refresh result:', result)
        
        alert(`✅ AI analysis refreshed for ${result.scansRefreshed} scans!`)
        
        const scansResponse = await fetch('/api/scans')
        if (scansResponse.ok) {
          const { scans } = await scansResponse.json()
          setRealScans(scans || [])
        }
      } else {
        const error = await response.json()
        alert(`❌ Failed to refresh AI analysis: ${error.error}`)
      }
    } catch (error) {
      console.error('Error refreshing AI analysis:', error)
      alert('❌ Error refreshing AI analysis. Please try again.')
    } finally {
      setRefreshingAI(false)
    }
  }

  return (
    <div className="w-full mx-auto space-y-8">
      <div className="glass-strong rounded-xl p-10">
        <h2 className="text-5xl font-bold text-foreground mb-4">AgriScan Dashboard</h2>
        <p className="text-muted-foreground text-xl">Monitor your crop health and scan analytics across all locations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 glass-subtle h-14">
          <TabsTrigger value="overview" className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scans" className="flex items-center gap-2 text-base">
            <Leaf className="w-5 h-5" />
            My Scans
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 text-base">
            <BarChart className="w-5 h-5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2 text-base">
            <User className="w-5 h-5" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-medium text-foreground">Total Scans</CardTitle>
                <Eye className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalScans}</div>
                <p className="text-sm text-muted-foreground">+2 from last week</p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-medium text-foreground">Healthy Plants</CardTitle>
                <CheckCircle className="h-6 w-6 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{healthyScans}</div>
                <p className="text-sm text-muted-foreground">
                  {Math.round((healthyScans / totalScans) * 100)}% of total scans
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-medium text-foreground">Diseased Plants</CardTitle>
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{diseaseScans}</div>
                <p className="text-sm text-muted-foreground">Most common: {mostCommonDisease}</p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-medium text-foreground">Remaining Credits</CardTitle>
                <CreditCard className="h-6 w-6 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{points}</div>
                <Button onClick={onBuyPoints} size="default" className="mt-3 w-full">
                  Buy More Points
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <Card className="glass xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">Recent Activity</CardTitle>
                <CardDescription className="text-lg">Your latest scan results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading scans...</span>
                    </div>
                  ) : scansToUse.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No scans yet. Start by uploading your first plant image!</p>
                    </div>
                  ) : (
                    scansToUse.slice(0, 3).map((scan) => {
                      const isHealthy = scan.result === "Healthy" || scan.disease === "healthy"
                      const displayName = scan.species || scan.result || "Unknown"
                      const diseaseInfo = scan.disease && scan.disease !== "healthy" ? scan.disease : null
                      
                      return (
                        <div key={scan.id} className="flex items-center space-x-4 p-4 glass-subtle rounded-lg">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isHealthy ? "bg-green-100" : "bg-red-100"
                          }`}>
                            <Leaf className={`w-6 h-6 ${
                              isHealthy ? "text-green-600" : "text-red-600"
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{displayName}</h3>
                            {diseaseInfo && (
                              <p className="text-sm text-red-600 capitalize">Disease: {diseaseInfo}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {new Date(scan.created_at || scan.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge 
                            variant={isHealthy ? "default" : "destructive"}
                            className="px-2 py-1"
                          >
                            {scan.confidence}% confidence
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Quick Summary</CardTitle>
                <CardDescription>At a glance statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-4 glass-subtle rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-2">{totalScans}</div>
                  <div className="text-sm text-muted-foreground">Total Scans</div>
                </div>
                <div className="text-center p-4 glass-subtle rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {totalScans > 0 ? Math.round((healthyScans / totalScans) * 100) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Health Rate</div>
                </div>
                <div className="text-center p-4 glass-subtle rounded-lg">
                  <div className="text-3xl font-bold text-accent mb-2">
                    {scansToUse.length > 0 ? Math.round(scansToUse.reduce((acc, s) => acc + (s.confidence || 0), 0) / scansToUse.length) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                </div>
                {mostCommonDisease !== "None detected" && (
                  <div className="text-center p-4 glass-subtle rounded-lg border-l-4 border-red-500">
                    <div className="text-lg font-bold text-red-600 mb-1 capitalize">{mostCommonDisease}</div>
                    <div className="text-sm text-muted-foreground">Most Common Issue</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scans" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Scan History</CardTitle>
                  <CardDescription>Complete list of all your plant scans</CardDescription>
                </div>
                <Button
                  onClick={refreshAIAnalysis}
                  disabled={refreshingAI}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Brain className={`w-4 h-4 ${refreshingAI ? 'animate-spin' : ''}`} />
                  {refreshingAI ? 'Refreshing AI...' : 'Refresh AI Analysis'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <span className="ml-3 text-lg">Loading scan history...</span>
                  </div>
                ) : scansToUse.length === 0 ? (
                  <div className="text-center py-12">
                    <Leaf className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground mb-2">No scans yet</p>
                    <p className="text-muted-foreground">Upload your first plant image to get started with AI analysis!</p>
                  </div>
                ) : (
                  scansToUse.map((scan) => {
                    const isHealthy = scan.result === "Healthy" || scan.disease === "healthy"
                    const displayName = scan.species || scan.result || "Unknown Plant"
                    const diseaseInfo = scan.disease && scan.disease !== "healthy" ? scan.disease : null
                    
                    return (
                      <Card key={scan.id} className="glass-subtle border-border/30">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-6">
                            <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${
                              isHealthy ? "bg-green-100" : "bg-red-100"
                            }`}>
                              <Leaf className={`w-10 h-10 ${
                                isHealthy ? "text-green-600" : "text-red-600"
                              }`} />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-xl font-bold text-foreground">{displayName}</h3>
                                  {diseaseInfo && (
                                    <p className="text-lg text-red-600 capitalize font-medium">
                                      Disease: {diseaseInfo}
                                    </p>
                                  )}
                                  {scan.species_confidence && (
                                    <p className="text-sm text-muted-foreground">
                                      Species confidence: {scan.species_confidence}%
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Badge 
                                    variant={isHealthy ? "default" : "destructive"}
                                    className="text-base px-3 py-1"
                                  >
                                    {scan.confidence}% confidence
                                  </Badge>
                                  {scan.disease_confidence && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Health: {scan.disease_confidence}%
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(scan.created_at || scan.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {scan.location || 'Location not recorded'}
                                </div>
                              </div>
                              {scan.treatment && (
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                  <h4 className="font-semibold text-sm text-blue-900 mb-1">Quick Treatment:</h4>
                                  <p className="text-sm text-blue-800">{scan.treatment}</p>
                                </div>
                              )}
                              
                              {/* AI Analysis Section */}
                              <div className="border-t border-border/50 pt-4">
                                {(scan.about_disease || scan.treatment_recommendations || scan.prevention_tips) ? (
                                  <div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => toggleScanExpansion(scan.id.toString())}
                                      className="flex items-center gap-2 mb-3 text-primary hover:text-primary/80"
                                    >
                                      <Brain className="w-4 h-4" />
                                      AI Detailed Analysis
                                      {scan.groq_analysis_status === 'completed' && (
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                      )}
                                      {scan.groq_analysis_status === 'failed' && (
                                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                      )}
                                      {expandedScans.has(scan.id.toString()) ? 
                                        <ChevronUp className="w-4 h-4" /> : 
                                        <ChevronDown className="w-4 h-4" />
                                      }
                                    </Button>
                                    
                                    {expandedScans.has(scan.id.toString()) && (
                                      <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        {scan.about_disease && (
                                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 p-6 rounded-xl shadow-sm">
                                            <h4 className="font-bold text-lg text-purple-900 mb-3 flex items-center gap-3">
                                              <div className="p-2 bg-purple-500 rounded-full">
                                                <Stethoscope className="w-5 h-5 text-white" />
                                              </div>
                                              🔬 About the Disease
                                            </h4>
                                            <div className="text-sm text-purple-800 leading-relaxed whitespace-pre-wrap font-medium">
                                              {scan.about_disease}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {scan.treatment_recommendations && (
                                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-6 rounded-xl shadow-sm">
                                            <h4 className="font-bold text-lg text-green-900 mb-3 flex items-center gap-3">
                                              <div className="p-2 bg-green-500 rounded-full">
                                                <Leaf className="w-5 h-5 text-white" />
                                              </div>
                                              💚 Treatment Recommendations
                                            </h4>
                                            <div className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap font-medium">
                                              {scan.treatment_recommendations}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {scan.prevention_tips && (
                                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 p-6 rounded-xl shadow-sm">
                                            <h4 className="font-bold text-lg text-amber-900 mb-3 flex items-center gap-3">
                                              <div className="p-2 bg-amber-500 rounded-full">
                                                <Shield className="w-5 h-5 text-white" />
                                              </div>
                                              🛡️ Prevention Tips
                                            </h4>
                                            <div className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap font-medium">
                                              {scan.prevention_tips}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {scan.groq_analysis_status === 'failed' && (
                                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                            <p className="text-sm text-yellow-800">
                                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                                              AI analysis partially failed. Basic treatment recommendation provided above.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Brain className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-600">AI Analysis Not Available</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">
                                      This scan was processed before enhanced AI analysis was available or failed to process.
                                    </p>
                                    <p className="text-xs text-blue-600">
                                      Use the "Refresh AI Analysis" button above to generate detailed insights for your existing scans.
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-3">
                                <Button size="sm" variant="outline" className="bg-transparent">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download Report
                                </Button>
                                <Button size="sm" variant="ghost">
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-3">
                <MapPin className="w-8 h-8 text-primary" />
                Scan Location Analytics
              </CardTitle>
              <CardDescription className="text-lg">
                Geographic distribution of all your plant health scans with color-coded results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RealDashboardMap 
                scans={(() => {
                  // Use ONLY real scans for the map to avoid flicker and fake points
                  const source = realScans
                  // Map and filter to geotagged scans only
                  const mappedScans = source.map((scan: any) => {
                  let locationObj = { lat: 40.7128, lng: -74.0060 }
                  
                  if (scan.location && typeof scan.location === 'string') {
                    try {
                      const parts = scan.location.split(',')
                      if (parts.length >= 2) {
                        const lat = parseFloat(parts[0].trim())
                        const lng = parseFloat(parts[1].trim())
                        
                        if (!isNaN(lat) && !isNaN(lng)) {
                          locationObj = { lat, lng }
                        }
                      }
                    } catch (error) {
                      console.error('Error parsing location:', error)
                    }
                  }
                  
                    return {
                      id: scan.id.toString(),
                      status: (scan.result === "Healthy" || scan.disease === "healthy") ? "healthy" as const : "unhealthy" as const,
                      location: locationObj,
                      timestamp: new Date(scan.created_at || scan.date || Date.now()),
                      confidence: scan.confidence || 0,
                      species: scan.species ? {
                        name: scan.species,
                        confidence: scan.species_confidence || 0
                      } : undefined,
                      disease: scan.disease ? {
                        name: scan.disease,
                        confidence: scan.disease_confidence || 0,
                        isHealthy: scan.disease === "healthy"
                      } : undefined
                    }
                  }).filter((result: any) => Number.isFinite(result.location.lat) && Number.isFinite(result.location.lng))

                  console.log('Dashboard: Original realScans:', realScans)
                  console.log('Dashboard: Mapped scans for map:', mappedScans)
                  return mappedScans
                })()}
              />
              {loading && (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl text-muted-foreground mb-2">Loading map…</p>
                  <p className="text-muted-foreground">Fetching your scan locations.</p>
                </div>
              )}
              {!loading && realScans.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl text-muted-foreground mb-2">No scan locations yet</p>
                  <p className="text-muted-foreground">Start scanning plants to see them plotted on this map!</p>
                </div>
              )}
              
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Disease Distribution</CardTitle>
                <CardDescription className="text-base">Breakdown of detected conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={420}>
                  <PieChart>
                    <Pie
                      data={diseaseData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {diseaseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Health Trends</CardTitle>
                <CardDescription className="text-base">Plant health over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="healthy" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="diseased" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Location Summary</CardTitle>
                <CardDescription className="text-base">Geographic scan statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 glass-subtle rounded-lg">
                    <span className="text-sm font-medium">Total Locations</span>
                    <span className="text-lg font-bold text-primary">
                      {new Set(scansToUse.map(s => s.location).filter(Boolean)).size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-subtle rounded-lg">
                    <span className="text-sm font-medium">Scans per Location</span>
                    <span className="text-lg font-bold text-accent">
                      {scansToUse.length > 0 ? Math.round(scansToUse.length / Math.max(1, new Set(scansToUse.map(s => s.location).filter(Boolean)).size)) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-subtle rounded-lg">
                    <span className="text-sm font-medium">Most Active Area</span>
                    <span className="text-lg font-bold text-muted-foreground">
                      {(() => {
                        const counts: Record<string, number> = {}
                        scansToUse.forEach(s => { if (s.location) counts[s.location] = (counts[s.location] || 0) + 1 })
                        const top = Object.entries(counts).sort(([,a],[,b]) => b - a)[0]
                        return top ? top[0] : 'N/A'
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-8">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground flex items-center gap-3">
                <User className="w-8 h-8 text-primary" />
                User Profile
              </CardTitle>
              <CardDescription className="text-lg">
                Your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Username</label>
                    <div className="p-3 glass-subtle rounded-lg text-foreground">
                      {userData?.username || 'Not set'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="p-3 glass-subtle rounded-lg text-foreground">
                      {userData?.email || 'Not set'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Current Points</label>
                    <div className="p-3 glass-subtle rounded-lg text-accent font-bold text-xl">
                      {points} credits
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Member Since</label>
                    <div className="p-3 glass-subtle rounded-lg text-foreground">
                      {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Account Actions</h3>
                  <div className="flex gap-4">
                    <Button onClick={onBuyPoints} className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Buy More Credits
                    </Button>
                    <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          API Access
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            API Access Management
                          </DialogTitle>
                          <DialogDescription>
                            Manage your API token for accessing AgriScan services programmatically.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* API Token Display */}
                          <div className="space-y-2">
                            <Label htmlFor="api-token">Your API Token</Label>
                            <div className="flex gap-2">
                              <Input
                                id="api-token"
                                value={apiToken}
                                readOnly
                                className="font-mono text-sm"
                                placeholder="Loading token..."
                              />
                              <Button
                                onClick={copyApiToken}
                                variant="outline"
                                size="sm"
                                disabled={!apiToken}
                              >
                                Copy
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Keep your API token secure and never share it publicly.
                            </p>
                          </div>

                          {/* API Usage Instructions */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">How to use your API token:</h4>
                            <div className="bg-muted/50 p-4 rounded-lg">
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
{`# Example API Usage
curl -X POST "https://your-domain.com/api/scan" \\
  -H "Authorization: Bearer ${apiToken || 'YOUR_TOKEN_HERE'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "base64_encoded_image",
    "location": "40.7128,-74.0060"
  }'`}
                              </pre>
                            </div>
                          </div>

                          {/* Token Management Actions */}
                          <div className="flex gap-3 pt-4 border-t">
                            <Button
                              onClick={generateNewToken}
                              variant="outline"
                              disabled={isGeneratingToken}
                              className="flex items-center gap-2"
                            >
                              {isGeneratingToken ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Key className="w-4 h-4" />
                                  Generate New Token
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => setShowApiDialog(false)}
                              variant="secondary"
                            >
                              Close
                            </Button>
                          </div>

                          {/* API Documentation Link */}
                          <div className="text-center pt-2">
                            <p className="text-xs text-muted-foreground">
                              Need help? Check our{" "}
                              <a 
                                href="#" 
                                className="text-primary hover:underline"
                                onClick={(e) => {
                                  e.preventDefault()
                                  toast({
                                    title: "Documentation",
                                    description: "API documentation will be available soon!",
                                  })
                                }}
                              >
                                API Documentation
                              </a>
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
