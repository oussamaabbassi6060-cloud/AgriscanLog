import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Generate a new random token (64 characters)
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Update the user's token in the database
    const { data, error } = await supabase
      .from('profiles')
      .update({ token: newToken })
      .eq('clerk_id', userId)
      .select('token')
      .single()

    if (error) {
      console.error('Error updating token:', error)
      return NextResponse.json({ error: "Failed to update token" }, { status: 500 })
    }

    return NextResponse.json({ 
      token: data.token,
      message: "Token generated successfully" 
    })

  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get the user's current token
    const { data, error } = await supabase
      .from('profiles')
      .select('token')
      .eq('clerk_id', userId)
      .single()

    if (error) {
      console.error('Error fetching token:', error)
      return NextResponse.json({ error: "Failed to fetch token" }, { status: 500 })
    }

    return NextResponse.json({ 
      token: data.token,
      message: "Token retrieved successfully" 
    })

  } catch (error) {
    console.error('Token fetch error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
