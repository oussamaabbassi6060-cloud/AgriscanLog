import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createSupabaseClient()

    // Test 1: Check if we can connect to Supabase
    console.log('Testing Supabase connection...')
    
    // Test 2: Look for the user's profile
    console.log('Looking for profile with clerk_id:', userId)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_id", userId)
      .single()

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      return NextResponse.json({
        error: "Profile lookup failed",
        details: profileError,
        clerk_id: userId
      })
    }

    if (!profile) {
      return NextResponse.json({
        error: "No profile found",
        clerk_id: userId,
        suggestion: "Try creating a profile first"
      })
    }

    console.log('Found profile:', profile)

    // Test 3: Try to insert a test scan
    const testScanData = {
      user_id: profile.id,
      result: "Test Scan",
      confidence: 95,
      treatment: "Test treatment",
      location: "40.7128,-74.0060",
      points_used: 5,
      species: "Test Plant",
      disease: "healthy",
      species_confidence: 90,
      disease_confidence: 95,
      ai_response: JSON.stringify({ test: true })
    }

    console.log('Testing scan insertion with data:', testScanData)
    
    const { data: scanResult, error: scanError } = await supabase
      .from("scans")
      .insert(testScanData)
      .select()
      .single()

    if (scanError) {
      console.error('Scan insertion error:', scanError)
      return NextResponse.json({
        error: "Scan insertion failed",
        details: scanError,
        profile: profile,
        testData: testScanData
      })
    }

    // Test 4: Clean up - delete the test scan
    await supabase
      .from("scans")
      .delete()
      .eq("id", scanResult.id)

    return NextResponse.json({
      success: true,
      message: "All database operations successful",
      profile: {
        id: profile.id,
        clerk_id: profile.clerk_id,
        username: profile.username,
        email: profile.email,
        points: profile.points
      },
      testScan: {
        id: scanResult.id,
        inserted: true,
        deleted: true
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      error: "Debug test failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
