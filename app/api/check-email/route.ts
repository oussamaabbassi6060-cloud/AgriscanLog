import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ available: false, error: "Invalid email" })
    }

    const supabase = await createSupabaseClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Email check error:", error)
      return NextResponse.json({ available: false, error: "Error checking email" })
    }

    const available = !data
    return NextResponse.json({ 
      available, 
      message: available ? "Email is available" : "This email is already registered" 
    })
  } catch (e) {
    console.error("Check email error:", e)
    return NextResponse.json({ available: false, error: "Server error" }, { status: 500 })
  }
}
