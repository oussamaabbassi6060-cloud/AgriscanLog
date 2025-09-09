"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Key, Coins } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { createClient } from "@/lib/supabase/client"

interface TokenCreationProps {
  onNext: () => void
  onTokenCreated: (token: string) => void
  points: number
}

export function TokenCreation({ onNext, onTokenCreated, points }: TokenCreationProps) {
  const [token, setToken] = useState<string>("")
  const { toast } = useToast()
  const { user } = useUser()

  useEffect(() => {
    const loadToken = async () => {
      try {
        // Ensure profile exists (idempotent)
        await fetch('/api/profiles/ensure', { method: 'POST' })

        if (!user) return
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('token')
          .eq('clerk_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching token:', error)
          return
        }
        if (data?.token) {
          setToken(data.token)
          onTokenCreated(data.token)
        }
      } catch (e) {
        console.error('Token load error:', e)
      }
    }
    loadToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const copyToken = () => {
    navigator.clipboard.writeText(token)
    toast({
      title: "Token copied!",
      description: "Your API token has been copied to clipboard.",
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="glass-strong shadow-2xl border-border/30">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 glass-subtle rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Key className="w-8 h-8 text-primary drop-shadow-sm" />
          </div>
          <CardTitle className="text-2xl text-balance text-foreground drop-shadow-sm">
            Your API Token is Ready
          </CardTitle>
          <CardDescription className="text-pretty text-muted-foreground">
            Your AgriScan API token has been generated. Use this token to access our scanning services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">API Token</h3>
              <Badge variant="secondary" className="flex items-center gap-1 glass-subtle shadow-sm">
                <Coins className="w-3 h-3" />
                {points} points
              </Badge>
            </div>
            <div className="flex items-center gap-2 p-3 glass-subtle rounded-lg shadow-inner">
              <code className="flex-1 text-sm font-mono break-all text-foreground">{token}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToken}
                className="glass-subtle border-border/30 hover:bg-card/20 bg-transparent"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Example API Usage</h3>
            <div className="glass-subtle p-4 rounded-lg shadow-inner">
              <pre className="text-sm overflow-x-auto text-foreground">
                {`fetch('/api/agriscan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${token}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image: 'base64_image_data',
    location: { lat: 40.7128, lng: -74.0060 }
  })
})`}
              </pre>
            </div>
          </div>

          <div className="glass-subtle p-4 rounded-lg shadow-inner border border-accent/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Each scan costs 5 points. You start with 1000 points.
              When your balance reaches 0, you'll need to recharge to continue testing.
            </p>
          </div>

          <Button
            onClick={onNext}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm"
          >
            Start Testing AgriScan
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
