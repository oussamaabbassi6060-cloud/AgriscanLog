import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserScans } from "@/lib/auth"
import { analyzeDisease } from "@/lib/groq"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's scans that need analysis refresh
    const { data: scans, error } = await getUserScans(userId)
    
    if (error) {
      return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 })
    }

    if (!scans || scans.length === 0) {
      return NextResponse.json({ message: "No scans found" })
    }

    const supabase = await createClient()
    let updatedCount = 0
    const results = []

    // Find scans that need AI analysis refresh (those with fallback messages)
    const scansToRefresh = scans.filter(scan => 
      !scan.about_disease || 
      scan.about_disease.includes('Unable to fetch disease information') ||
      scan.about_disease.includes('API configuration error') ||
      scan.groq_analysis_status === 'failed'
    )

    console.log(`Found ${scansToRefresh.length} scans needing AI analysis refresh`)

    for (const scan of scansToRefresh) {
      try {
        console.log(`Refreshing AI analysis for scan ${scan.id}`)
        
        // Re-run AI analysis
        const groqAnalysis = await analyzeDisease(
          scan.species || 'Unknown Plant',
          scan.disease || scan.result || 'Unknown',
          `Species confidence: ${scan.species_confidence || 0}%, Disease confidence: ${scan.disease_confidence || 0}%`
        )

        // Update the scan with new AI analysis
        const { error: updateError } = await supabase
          .from('scans')
          .update({
            about_disease: groqAnalysis.data.about_disease,
            treatment_recommendations: groqAnalysis.data.treatment_recommendations,
            prevention_tips: groqAnalysis.data.prevention_tips,
            groq_response: groqAnalysis.rawResponse,
            groq_analysis_status: groqAnalysis.success ? 'completed' : 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', scan.id)

        if (updateError) {
          console.error(`Failed to update scan ${scan.id}:`, updateError)
          results.push({
            scanId: scan.id,
            success: false,
            error: updateError.message
          })
        } else {
          updatedCount++
          results.push({
            scanId: scan.id,
            success: true,
            analysisStatus: groqAnalysis.success ? 'completed' : 'failed'
          })
          console.log(`Successfully updated scan ${scan.id}`)
        }

        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (analysisError) {
        console.error(`Error analyzing scan ${scan.id}:`, analysisError)
        results.push({
          scanId: scan.id,
          success: false,
          error: analysisError instanceof Error ? analysisError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Refreshed AI analysis for ${updatedCount} scans`,
      totalScans: scans.length,
      scansRefreshed: updatedCount,
      results
    })

  } catch (error) {
    console.error('Refresh analysis error:', error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
