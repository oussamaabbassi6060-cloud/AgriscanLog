"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react"
import { useSignIn, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import type { UserData } from "@/app/page"

interface LoginFormProps {
  onNext: () => void
  onUserData: (userData: UserData) => void
  onToggleRegister: () => void
}

export function LoginForm({ onNext, onUserData, onToggleRegister }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, setActive } = useSignIn()
  const { user } = useUser()
  const router = useRouter()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (!signIn) {
        setErrors({ general: "Sign in not available" })
        return
      }

      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password,
      })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })

        // Ensure a profile exists - this will create one if it doesn't exist
        try {
          const response = await fetch('/api/profiles/ensure', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email
            })
          })
          
          if (!response.ok) {
            console.error('Profile ensure failed on login')
          }
        } catch (e) {
          console.error('Ensure profile on login error:', e)
        }
        
        // Create user data and proceed
        const userData: UserData = {
          username: user?.username || `user_${result.createdUserId?.slice(0, 8)}`,
          email: formData.email,
          password: formData.password,
          gender: (user?.publicMetadata?.gender as string) || "prefer-not-to-say",
          age: (user?.publicMetadata?.age as number) || 30,
        }
        onUserData(userData)
        onNext()
      } else {
        // Handle other statuses like needs verification
        setErrors({ general: "Login requires additional verification" })
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setErrors({ general: error.errors?.[0]?.message || "An unexpected error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="glass border-border/60 shadow-2xl shadow-primary/20">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <LogIn className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-3xl font-bold text-foreground mb-2">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground text-lg">Sign in to your AgriScan account</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="glass-input h-12 text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="glass-input h-12 pr-12 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
          </div>

          {errors.general && <p className="text-destructive text-sm">{errors.general}</p>}

          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={isLoading}
          >
            <LogIn className="w-5 h-5 mr-2" />
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">New to AgriScan?</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onToggleRegister}
            className="w-full h-12 glass-subtle border-border/60 text-foreground hover:bg-primary/10 font-medium bg-transparent"
            disabled={isLoading}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Create Account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
