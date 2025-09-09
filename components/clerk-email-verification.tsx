"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, CheckCircle, RefreshCw, AlertCircle } from "lucide-react"
import { useSignUp } from "@clerk/nextjs"

interface ClerkEmailVerificationProps {
  email: string
  onVerified: () => void
  onBack: () => void
  userData?: {
    username: string
    gender: string
    age: number
  }
}

export function ClerkEmailVerification({ email, onVerified, onBack, userData }: ClerkEmailVerificationProps) {
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState<string>("")
  const { signUp, setActive } = useSignUp()

  // Handle cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp || !code.trim()) return

    setIsVerifying(true)
    setError("")

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      })

      if (result.status === "complete") {
        // Set the session as active
        await setActive({ session: result.createdSessionId })

        // Create the profile in Supabase after successful verification
        console.log('Creating profile for verified user with data:', {
          email,
          username: userData?.username,
          gender: userData?.gender,
          age: userData?.age
        })
        
        try {
          const response = await fetch('/api/profiles/ensure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,  // Include email explicitly
              username: userData?.username,
              gender: userData?.gender,
              age: userData?.age,
            }),
          })
          
          const responseData = await response.json()
          
          if (!response.ok) {
            console.error('Profile creation failed:', responseData)
            setError(`Profile creation failed: ${responseData.error || 'Unknown error'}`)
          } else {
            console.log('Profile created successfully:', responseData)
          }
        } catch (e) {
          console.error('Profile ensure error:', e)
          setError('Failed to create profile. Please try logging in.')
        }
        
        // Continue the flow
        onVerified()
      } else {
        setError("Verification incomplete. Please try again.")
      }
    } catch (error: any) {
      console.error("Email verification error:", error)
      setError(error.errors?.[0]?.message || "Failed to verify email. Please check the code and try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendEmail = async () => {
    if (!signUp) return

    setIsResending(true)
    setError("")
    
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setResendCooldown(60) // 60 second cooldown
    } catch (error: any) {
      console.error("Resend error:", error)
      setError(error.errors?.[0]?.message || "Failed to resend verification email")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="glass-strong shadow-2xl border-border/30">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-pretty text-foreground/90 text-lg">
              Enter the verification code sent to <strong>{email}</strong>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code" className="text-foreground font-medium">
                Verification Code
              </Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="glass-input h-12 text-foreground placeholder:text-muted-foreground text-center text-lg font-mono tracking-widest"
                maxLength={6}
                disabled={isVerifying}
              />
            </div>

            {error && (
              <div className="flex items-center justify-center space-x-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isVerifying || !code.trim()}
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Verify Email
                </>
              )}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-foreground/60">
                <CheckCircle className="w-4 h-4" />
                <span>Your profile will be created automatically after verification</span>
              </div>

              <p className="text-foreground/80 text-sm">
                Check your email inbox and spam folder for the verification code.
              </p>
            </div>

            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="w-full h-12 glass-subtle border-border/60 text-foreground hover:bg-primary/10 bg-transparent"
              disabled={isResending || resendCooldown > 0}
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Resend Code
                </>
              )}
            </Button>

            <Button 
              onClick={onBack} 
              variant="ghost" 
              className="w-full h-12 text-foreground/80 hover:text-foreground"
            >
              Back to Registration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
