"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, X, Coins, CheckCircle } from "lucide-react"

interface PaymentFormProps {
  onPaymentComplete: (pointsPurchased: number) => void
  onCancel: () => void
}

export function PaymentForm({ onPaymentComplete, onCancel }: PaymentFormProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const packages = [
    { id: "basic", points: 1000, price: 5, popular: false },
    { id: "standard", points: 2500, price: 10, popular: true },
    { id: "premium", points: 5000, price: 18, popular: false },
    { id: "enterprise", points: 10000, price: 30, popular: false },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackage) return

    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const selectedPkg = packages.find((pkg) => pkg.id === selectedPackage)
    if (selectedPkg) {
      setIsComplete(true)
      setTimeout(() => {
        onPaymentComplete(selectedPkg.points)
      }, 1500)
    }
  }

  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="glass-strong border-border/60 shadow-2xl max-w-md w-full">
          <CardContent className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">Your points have been added to your account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="glass-strong border-border/60 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center space-y-4 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="absolute right-4 top-4 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Coins className="w-8 h-8 text-accent" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">Purchase Points</CardTitle>
            <CardDescription className="text-muted-foreground text-lg">
              Choose a package to continue using AgriScan
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Package Selection */}
          <div className="space-y-4">
            <Label className="text-foreground font-medium text-lg">Select Package</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPackage === pkg.id
                      ? "border-primary bg-primary/10"
                      : "border-border/40 glass-subtle hover:border-primary/50"
                  } ${pkg.popular ? "ring-2 ring-accent/50" : ""}`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">
                      POPULAR
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{pkg.points.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground mb-2">Points</div>
                    <div className="text-xl font-semibold text-primary">${pkg.price}</div>
                    <div className="text-xs text-muted-foreground">
                      ${((pkg.price / pkg.points) * 1000).toFixed(2)} per 1000 points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          {selectedPackage && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label className="text-foreground font-medium text-lg">Payment Information</Label>

                <div className="space-y-2">
                  <Label htmlFor="cardholderName" className="text-foreground">
                    Cardholder Name
                  </Label>
                  <Input
                    id="cardholderName"
                    placeholder="John Doe"
                    value={paymentData.cardholderName}
                    onChange={(e) => setPaymentData({ ...paymentData, cardholderName: e.target.value })}
                    className="glass-input h-12 text-foreground"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber" className="text-foreground">
                    Card Number
                  </Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={paymentData.cardNumber}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\s/g, "")
                        .replace(/(.{4})/g, "$1 ")
                        .trim()
                      setPaymentData({ ...paymentData, cardNumber: value })
                    }}
                    maxLength={19}
                    className="glass-input h-12 text-foreground"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate" className="text-foreground">
                      Expiry Date
                    </Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={paymentData.expiryDate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2")
                        setPaymentData({ ...paymentData, expiryDate: value })
                      }}
                      maxLength={5}
                      className="glass-input h-12 text-foreground"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv" className="text-foreground">
                      CVV
                    </Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value.replace(/\D/g, "") })}
                      maxLength={4}
                      className="glass-input h-12 text-foreground"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 h-12 glass-subtle border-border/60 text-foreground bg-transparent"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay ${packages.find((pkg) => pkg.id === selectedPackage)?.price}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
