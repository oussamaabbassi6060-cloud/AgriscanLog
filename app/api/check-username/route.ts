import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username } = body

    if (!username || username.trim().length < 3) {
      return NextResponse.json({ available: false, error: "Username too short" })
    }

    const supabase = await createSupabaseClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username.trim())
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Username check error:", error)
      return NextResponse.json({ available: false, error: "Error checking username" })
    }

    const available = !data
    return NextResponse.json({ 
      available, 
      message: available ? "Username is available" : "Username is already taken" 
    })
  } catch (e) {
    console.error("Check username error:", e)
    return NextResponse.json({ available: false, error: "Server error" }, { status: 500 })
  }
}
