"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("message")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "verification_failed":
        return "Email verification failed. The link may be expired or invalid."
      case "callback_error":
        return "An error occurred during the verification process."
      default:
        return "An authentication error occurred."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <Card className="glass-strong shadow-2xl border-border/30 max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground mb-2">Verification Error</CardTitle>
            <CardDescription className="text-foreground/80">{getErrorMessage(error)}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">Back to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
