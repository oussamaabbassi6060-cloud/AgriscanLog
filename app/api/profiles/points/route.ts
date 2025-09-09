import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { updateUserPoints } from "@/lib/auth"

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { points } = body

    if (typeof points !== 'number' || points < 0) {
      return NextResponse.json({ error: "Invalid points value" }, { status: 400 })
    }

    const { data, error } = await updateUserPoints(userId, points)
    
    if (error) {
      console.error("Points update error:", error)
      return NextResponse.json({ error: "Failed to update points" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
