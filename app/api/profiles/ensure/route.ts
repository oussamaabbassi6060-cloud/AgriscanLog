import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { email, username, gender, age } = body || {}

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "No user" }, { status: 401 })
    }

    const supabase = await createSupabaseClient()

    // Check if profile exists
    const { data: existing, error: selectErr } = await supabase
      .from("profiles")
      .select("id, token")
      .eq("clerk_id", userId)
      .maybeSingle()

    if (selectErr) {
      console.error("Select profile error", selectErr)
    }

    const profilePayload: any = {
      clerk_id: userId,
      username: username || clerkUser.username || `user_${userId.slice(0, 8)}`,
      email: email || clerkUser.primaryEmailAddress?.emailAddress || "",
      gender: gender ?? (clerkUser.publicMetadata?.gender as string) ?? null,
      age: age ?? (clerkUser.publicMetadata?.age as number) ?? null,
      points: 1000  // Ensure points are set on creation
    }

    if (!existing) {
      // Generate a UUID for the profile (since we can't use auth.users)
      const profileId = randomUUID()
      
      // Handle unique username conflicts by appending a suffix
      let finalPayload = { 
        id: profileId,  // Add the generated UUID
        ...profilePayload 
      }
      
      // Try to insert; if username conflict, retry with a generated one
      const tryInsert = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .insert(finalPayload)
          .select()
          .single()
        return { data, error }
      }

      let { data, error } = await tryInsert()
      if (error && (error as any)?.code === '23505') {
        // Check which constraint failed
        const errorMessage = (error as any)?.message || ''
        if (errorMessage.includes('username')) {
          // Username conflict - generate a new one
          finalPayload.username = `user_${userId.slice(0, 8)}_${Math.random().toString(36).slice(2, 6)}`
          const retry = await tryInsert()
          data = retry.data
          error = retry.error
        }
      }

      if (error) {
        console.error("Insert profile error", error)
        return NextResponse.json({ error: "Failed to create profile", details: error }, { status: 500 })
      }

      console.log("Profile created successfully:", data)
      return NextResponse.json({ ok: true, profile: data, created: true })
    } else {
      // Profile already exists - just return it without updating
      // This preserves existing token and points
      return NextResponse.json({ ok: true, profile: existing, created: false })
    }
  } catch (e) {
    console.error("Ensure profile error", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

