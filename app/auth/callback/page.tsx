"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState("Checking for tokens...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient()

        // Parse fragment first (e.g. #access_token=...&refresh_token=...)
        const hash = typeof window !== "undefined" ? window.location.hash : ""
        const search = typeof window !== "undefined" ? window.location.search : ""

        const params = new URLSearchParams()

        if (hash && hash.startsWith("#")) {
          const frag = hash.slice(1)
          frag.split("&").forEach((pair) => {
            const [k, v] = pair.split("=")
            if (k) params.set(k, decodeURIComponent(v || ""))
          })
        }

        // fallback to query params
        if (search) {
          const sp = new URLSearchParams(search)
          sp.forEach((v, k) => {
            if (!params.has(k)) params.set(k, v)
          })
        }

        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        const rawToken = params.get("token")

        if (accessToken) {
          setStatus("Setting session from fragment tokens...")
          const args: any = { access_token: accessToken }
          if (refreshToken) args.refresh_token = refreshToken
          const { data, error } = await supabase.auth.setSession(args)
          if (error) {
            console.error("[auth/callback] setSession error:", error)
            setError(error.message || JSON.stringify(error))
            setStatus("Failed to set session")
            return
          }
          console.log("[auth/callback] Session set, redirecting to dashboard", data)
          // Remove tokens from URL for cleanliness
          window.history.replaceState({}, document.title, window.location.pathname)
          router.replace("/dashboard")
          return
        }

        if (rawToken) {
          setStatus("Verifying token with server...")
          // Call server verify (we already have server callback route that handles verify), so just redirect to server route with token as query param
          // This will trigger server-side verify logic added earlier.
          const redirectUrl = `/auth/callback?token=${encodeURIComponent(rawToken)}&type=email`
          window.location.replace(redirectUrl)
          return
        }

        setStatus("No tokens found in URL")
        setError("No verification tokens or access tokens found in URL fragment or query parameters.")
      } catch (e) {
        console.error("[auth/callback] Unexpected error:", e)
        setError(String(e))
        setStatus("Unexpected error")
      }
    }

    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full bg-card p-8 rounded-md">
        <h2 className="text-xl font-semibold mb-4">Authentication callback</h2>
        <p className="mb-2">{status}</p>
        {error && <pre className="text-sm text-destructive">{error}</pre>}
        {!error && <p className="text-sm text-muted-foreground">If you were not redirected, copy/paste the link from your email into the browser address bar.</p>}
      </div>
    </div>
  )
}
