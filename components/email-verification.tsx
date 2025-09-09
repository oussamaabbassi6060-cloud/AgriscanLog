"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle, RefreshCw, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface EmailVerificationProps {
  email: string
  onVerified: () => void
  onBack: () => void
  userData?: {
    username: string
    gender: string
    age: number
  }
}

export function EmailVerification({ email, onVerified, onBack, userData }: EmailVerificationProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "creating-profile">("pending")
  const [error, setError] = useState<string>("")

  const supabase = createClient()

  const updateProfileWithMetadata = async (userId: string) => {
    if (!userData) return true

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: userData.username,
          gender: userData.gender,
          age: userData.age,
        })
        .eq("id", userId)

      if (error) {
        console.error("[v0] Error updating profile metadata:", error)
        return false
      }

      console.log("[v0] Profile metadata updated successfully")
      return true
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      return false
    }
  }

  useEffect(() => {
    const checkVerificationAndProfile = async () => {
      try {
        // Prefer getUser() first; refreshSession will throw if no session exists.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          // If there's no session yet, getUser may return an auth error - ignore and retry.
          const errMsg = (userError as any)?.message || ''
          if (errMsg.includes('Auth session missing') || (userError as any)?.name === 'AuthSessionMissingError') {
            // Not signed in yet; caller should wait for verification flow to create session on callback.
            return
          }

          console.error('[v0] Error getting user:', userError)
          return
        }

        if (user?.email_confirmed_at && verificationStatus === 'pending') {
          console.log('[v0] Email verified, checking for profile creation')
          setVerificationStatus('verified')

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('[v0] Error checking profile:', profileError)
            setError('Error checking profile creation')
            return
          }

          if (profile) {
            console.log('[v0] Profile found, updating with metadata')
            const updateSuccess = await updateProfileWithMetadata(user.id)
            if (updateSuccess) {
              onVerified()
            } else {
              setError('Error updating profile information')
            }
          } else {
            console.log('[v0] Profile not found yet, waiting for creation')
            setVerificationStatus('creating-profile')
          }
        }
      } catch (error) {
        // Handle network/auth library errors gracefully and keep polling.
        const errMsg = (error as any)?.message || ''
        if (errMsg.includes('Auth session missing') || (error as any)?.name === 'AuthSessionMissingError') {
          // No session yet; ignore and wait for callback to create session
          return
        }

        console.error('[v0] Verification check error:', error)
        setError('Error during verification check')
      }
    }

    checkVerificationAndProfile()
    const interval = setInterval(checkVerificationAndProfile, 3000) // Increased to 3 seconds
    return () => clearInterval(interval)
  }, [supabase, onVerified, verificationStatus, userData])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state change:", event, session?.user?.email_confirmed_at)

      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        console.log("[v0] User signed in with verified email")
        setVerificationStatus("verified")

        // Check for profile creation
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (profile) {
          console.log("[v0] Profile found, updating with metadata")
          const updateSuccess = await updateProfileWithMetadata(session.user.id)
          if (updateSuccess) {
            onVerified()
          } else {
            setError("Error updating profile information")
          }
        } else if (profileError?.code !== "PGRST116") {
          setError("Error checking profile creation")
        } else {
          setVerificationStatus("creating-profile")
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, onVerified, userData])

  const handleResendEmail = async () => {
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Resend error:", error)
      } else {
        setResendCooldown(60) // 60 second cooldown
      }
    } catch (error) {
      console.error("Resend error:", error)
    } finally {
      setIsResending(false)
    }
  }

  const handleCheckVerification = async () => {
    setIsChecking(true)
    setError("")
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setError("Error checking verification status")
        return
      }

      if (user?.email_confirmed_at) {
        setVerificationStatus("verified")

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profile) {
          const updateSuccess = await updateProfileWithMetadata(user.id)
          if (updateSuccess) {
            onVerified()
          } else {
            setError("Error updating profile information")
          }
        } else if (profileError?.code !== "PGRST116") {
          setError("Error checking profile creation")
        } else {
          setVerificationStatus("creating-profile")
        }
      } else {
        setError("Email not yet verified. Please check your email and click the verification link.")
      }
    } catch (error) {
      console.error("[v0] Manual verification check error:", error)
      setError("Error during verification check")
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="glass-strong shadow-2xl border-border/30">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            {verificationStatus === "creating-profile" ? (
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Mail className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              {verificationStatus === "creating-profile" ? "Creating Your Profile" : "Check Your Email"}
            </CardTitle>
            <CardDescription className="text-pretty text-foreground/90 text-lg">
              {verificationStatus === "creating-profile" ? (
                "Setting up your AgriScan account with your unique token..."
              ) : (
                <>
                  We've sent a verification link to <strong>{email}</strong>
                </>
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            {verificationStatus === "pending" && (
              <p className="text-foreground/80">
                Click the verification link in your email to activate your account and get your unique AgriScan token.
              </p>
            )}

            {verificationStatus === "creating-profile" && (
              <p className="text-foreground/80">
                Your email has been verified! We're now creating your profile and generating your AgriScan token.
              </p>
            )}

            <div className="flex items-center justify-center space-x-2 text-sm text-foreground/60">
              <CheckCircle className="w-4 h-4" />
              <span>Your profile will be created automatically after verification</span>
            </div>

            {error && (
              <div className="flex items-center justify-center space-x-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCheckVerification}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isChecking || verificationStatus === "creating-profile"}
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Checking...
                </>
              ) : verificationStatus === "creating-profile" ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  I've Verified My Email
                </>
              )}
            </Button>

            {verificationStatus === "pending" && (
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
                    Resend Email
                  </>
                )}
              </Button>
            )}

            <Button onClick={onBack} variant="ghost" className="w-full h-12 text-foreground/80 hover:text-foreground">
              Back to Registration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
