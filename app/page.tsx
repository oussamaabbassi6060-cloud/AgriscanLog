"use client"

import { useEffect, useState } from "react"
import { RegistrationForm } from "@/components/registration-form"
import { LoginForm } from "@/components/login-form"
import { VerificationStep } from "@/components/verification-step"
import { TokenCreation } from "@/components/token-creation"
import { AgriScanTesting } from "@/components/agriscan-testing"
import { PaymentForm } from "@/components/payment-form"
import { Dashboard } from "@/components/dashboard"
import { SignedIn, SignOutButton, useUser } from "@clerk/nextjs"

export type UserData = {
  username: string
  email: string
  password: string
  gender: string
  age: number
}

export type ProfileData = {
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

export type AppState = {
  step: number
  userData: UserData | null
  profileData: ProfileData | null
  token: string | null
  points: number
  isLogin: boolean
  showPayment: boolean
  showDashboard: boolean
}

export default function AgriScanApp() {
  const { isSignedIn, isLoaded, user } = useUser()

  const [appState, setAppState] = useState<AppState>({
    step: 1,
    userData: null,
    profileData: null,
    token: null,
    points: 1000,
    isLogin: false,
    showPayment: false,
    showDashboard: false,
  })

  // Fetch user profile data when authenticated
  useEffect(() => {
    const fetchProfileData = async () => {
      if (isSignedIn && user) {
        try {
          const response = await fetch('/api/profiles')
          if (response.ok) {
            const { profile } = await response.json()
            if (profile) {
              setAppState((prev) => ({
                ...prev,
                profileData: profile,
                points: profile.points,
                token: profile.token,
              }))
            }
          } else {
            console.error('Failed to fetch profile:', response.statusText)
          }
        } catch (error) {
          console.error('Error fetching profile:', error)
        }
      }
    }

    fetchProfileData()
  }, [isSignedIn, user])

  // Keep UI flow in sync with Clerk auth state
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        // If user is authenticated, jump to scanning step
        setAppState((prev) => ({
          ...prev,
          step: 4,
          isLogin: true,
        }))
      } else {
        // If signed out, reset to initial registration/login
        setAppState((prev) => ({
          ...prev,
          step: 1,
          isLogin: false,
          showDashboard: false,
          showPayment: false,
          profileData: null,
        }))
      }
    }
  }, [isSignedIn, isLoaded])

  const nextStep = () => {
    setAppState((prev) => ({ ...prev, step: prev.step + 1 }))
  }

  const setUserData = (userData: UserData) => {
    setAppState((prev) => ({ ...prev, userData }))
  }

  const setToken = (token: string) => {
    setAppState((prev) => ({ ...prev, token }))
  }

  const updatePoints = async (newPoints: number) => {
    if (user) {
      // Update local state immediately for better UX
      setAppState((prev) => ({ ...prev, points: newPoints }))
      
      // Update database in background
      try {
        const response = await fetch('/api/profiles/points', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ points: newPoints })
        })
        
        if (response.ok) {
          // Update profile data to keep it in sync
          setAppState((prev) => ({
            ...prev,
            profileData: prev.profileData ? { ...prev.profileData, points: newPoints } : null
          }))
        } else {
          console.error('Failed to update points:', response.statusText)
        }
      } catch (error) {
        console.error('Error updating points:', error)
        // Optionally revert the local state if database update fails
      }
    } else {
      setAppState((prev) => ({ ...prev, points: newPoints }))
    }
  }

  const toggleLoginMode = () => {
    setAppState((prev) => ({ ...prev, isLogin: !prev.isLogin }))
  }

  const showPaymentForm = () => {
    setAppState((prev) => ({ ...prev, showPayment: true }))
  }

  const hidePaymentForm = () => {
    setAppState((prev) => ({ ...prev, showPayment: false }))
  }

  const handlePaymentComplete = (pointsPurchased: number) => {
    setAppState((prev) => ({
      ...prev,
      points: prev.points + pointsPurchased,
      showPayment: false,
    }))
  }

  const showDashboard = () => {
    setAppState((prev) => ({ ...prev, showDashboard: true }))
  }

  const hideDashboard = () => {
    setAppState((prev) => ({ ...prev, showDashboard: false }))
  }

  const skipToTesting = () => {
    setAppState((prev) => ({ ...prev, step: 4 }))
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/lush-green-agricultural-fields-with-crops-and-farm.jpg')`,
        }}
      />
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      <header className="relative z-10 glass-strong border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-sm">AS</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground drop-shadow-sm">AgriScan</h1>
            </div>
            <div className="flex items-center gap-3">
              <SignedIn>
                {appState.step === 4 && !appState.showDashboard && (
                  <button
                    onClick={showDashboard}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Dashboard
                  </button>
                )}
                {appState.showDashboard && (
                  <button
                    onClick={hideDashboard}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
                  >
                    Back to Scanner
                  </button>
                )}

                <SignOutButton redirectUrl="/">
                  <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium">
                    Logout
                  </button>
                </SignOutButton>
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="w-full mx-auto">
          {!isLoaded ? (
            // Loading screen while Clerk determines auth state
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="glass-strong rounded-xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-foreground font-medium">Loading AgriScan...</p>
                <p className="text-muted-foreground text-sm mt-2">Checking authentication status</p>
              </div>
            </div>
          ) : (
            // Main content after Clerk has loaded
            <>
              {appState.showPayment && <PaymentForm onPaymentComplete={handlePaymentComplete} onCancel={hidePaymentForm} />}

              {appState.showDashboard && appState.step === 4 && (
                <Dashboard points={appState.points} userData={appState.profileData} onBuyPoints={showPaymentForm} />
              )}

              {!appState.showDashboard && (
                <>
                  {appState.step === 1 && !appState.isLogin && (
                    <RegistrationForm onNext={nextStep} onUserData={setUserData} onToggleLogin={toggleLoginMode} />
                  )}
                  {appState.step === 1 && appState.isLogin && (
                    <LoginForm onNext={skipToTesting} onUserData={setUserData} onToggleRegister={toggleLoginMode} />
                  )}
                  {appState.step === 2 && <VerificationStep onNext={nextStep} />}
                  {appState.step === 3 && (
                    <TokenCreation onNext={nextStep} onTokenCreated={setToken} points={appState.points} />
                  )}
                  {appState.step === 4 && (
                    <AgriScanTesting points={appState.points} onUpdatePoints={updatePoints} onBuyPoints={showPaymentForm} />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
