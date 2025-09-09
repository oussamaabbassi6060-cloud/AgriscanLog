"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

interface VerificationStepProps {
  onNext: () => void
}

export function VerificationStep({ onNext }: VerificationStepProps) {
  // Automatically skip this step since verification already happened in the previous screen
  useEffect(() => {
    const t = setTimeout(() => onNext(), 300)
    return () => clearTimeout(t)
  }, [onNext])

  return (
    <div className="max-w-md mx-auto">
      <Card className="glass-strong shadow-2xl border-border/30">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 glass-subtle rounded-full flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle className="w-8 h-8 text-primary drop-shadow-sm" />
          </div>
          <CardTitle className="text-2xl text-balance text-foreground drop-shadow-sm">
            Email Verified!
          </CardTitle>
          <CardDescription className="text-pretty text-muted-foreground">
            Redirecting you to the next step...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center gap-2 text-primary drop-shadow-sm">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Verification Complete</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
