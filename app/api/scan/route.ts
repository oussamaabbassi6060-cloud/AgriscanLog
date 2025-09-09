import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createScan } from "@/lib/auth"
import { analyzeDisease } from "@/lib/groq"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('image') as File
    const location = formData.get('location') as string

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: "Image too large. Maximum size is 10MB" }, { status: 400 })
    }

    // Prepare form data for Hugging Face API
    const hfFormData = new FormData()
    hfFormData.append('file', file)

    // Call Hugging Face API
    console.log('Calling Hugging Face API with file:', file.name, file.type, file.size)
    
    const hfResponse = await fetch('https://aziz03-plant-disease-api.hf.space/predict', {
      method: 'POST',
      body: hfFormData,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgriScan-App/1.0',
      },
    })

    console.log('Hugging Face API response status:', hfResponse.status)
    
    if (!hfResponse.ok) {
      const errorText = await hfResponse.text().catch(() => 'Unknown error')
      console.error('Hugging Face API error:', {
        status: hfResponse.status,
        statusText: hfResponse.statusText,
        body: errorText
      })
      return NextResponse.json({ 
        error: `AI model error: ${hfResponse.status} - ${hfResponse.statusText}`,
        details: errorText
      }, { status: 503 })
    }

    let aiResult
    try {
      aiResult = await hfResponse.json()
      console.log('AI Response received:', JSON.stringify(aiResult, null, 2))
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error)
      const responseText = await hfResponse.text().catch(() => 'Could not read response')
      console.error('Raw response:', responseText)
      return NextResponse.json({ 
        error: "Invalid response from AI model",
        details: responseText
      }, { status: 502 })
    }
    
    // Parse location if provided
    let locationData = null
    if (location) {
      try {
        locationData = JSON.parse(location)
      } catch (e) {
        console.error('Invalid location data:', e)
      }
    }

    // Extract relevant information from AI response
    const species = aiResult.species?.label || 'Unknown'
    const disease = aiResult.disease?.label || 'Unknown'
    const speciesConfidence = Math.round((aiResult.species?.confidence || 0) * 100)
    const diseaseConfidence = Math.round((aiResult.disease?.confidence || 0) * 100)
    
    // Determine overall health status and confidence
    const isHealthy = disease.toLowerCase() === 'healthy'
    const overallConfidence = Math.round((speciesConfidence + diseaseConfidence) / 2)
    
    // Generate treatment recommendation based on disease
    let treatment = "Continue regular care routine"
    if (!isHealthy) {
      treatment = generateTreatmentRecommendation(disease)
    }

    // Get comprehensive analysis from Groq AI
    console.log('Calling Groq AI for detailed analysis...')
    const groqAnalysis = await analyzeDisease(
      species, 
      disease, 
      `Confidence: Species ${speciesConfidence}%, Disease ${diseaseConfidence}%`
    )

    console.log('Groq AI analysis result:', groqAnalysis)

    // Store scan result in database
    const scanData = {
      user_id: userId,
      result: isHealthy ? 'Healthy' : disease,
      confidence: overallConfidence,
      species: species,
      disease: disease,
      species_confidence: speciesConfidence,
      disease_confidence: diseaseConfidence,
      treatment: treatment,
      location: locationData ? `${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}` : null,
      points_used: 5,
      ai_response: JSON.stringify(aiResult), // Store full AI response for debugging
      // Add Groq AI fields
      about_disease: groqAnalysis.data.about_disease,
      treatment_recommendations: groqAnalysis.data.treatment_recommendations,
      prevention_tips: groqAnalysis.data.prevention_tips,
      groq_response: groqAnalysis.rawResponse,
      groq_analysis_status: groqAnalysis.success ? 'completed' : 'failed'
    }

    console.log('Attempting to store scan data:', {
      user_id: userId,
      species: scanData.species,
      disease: scanData.disease,
      confidence: scanData.confidence
    })
    
    const { data: scanRecord, error: scanError } = await createScan(scanData)
    
    if (scanError) {
      console.error('Error storing scan:', scanError)
      console.error('Full scan data that failed:', scanData)
      return NextResponse.json({ 
        error: "Failed to store scan result",
        details: scanError.message || scanError,
        scanData: {
          species: scanData.species,
          disease: scanData.disease,
          confidence: scanData.confidence
        }
      }, { status: 500 })
    }

    // Return formatted response
    return NextResponse.json({
      success: true,
      result: {
        id: scanRecord?.id,
        species: {
          name: species,
          confidence: speciesConfidence
        },
        disease: {
          name: disease,
          confidence: diseaseConfidence,
          isHealthy: isHealthy
        },
        overall: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          confidence: overallConfidence
        },
        treatment: treatment,
        location: locationData,
        timestamp: new Date(),
        pointsUsed: 5,
        // Add Groq AI analysis
        analysis: {
          aboutDisease: groqAnalysis.data.about_disease,
          treatmentRecommendations: groqAnalysis.data.treatment_recommendations,
          preventionTips: groqAnalysis.data.prevention_tips,
          analysisStatus: groqAnalysis.success ? 'completed' : 'failed',
          aiAnalysisWorking: groqAnalysis.success
        }
      }
    })

  } catch (error) {
    console.error('Scan API error:', error)
    
    // More specific error handling
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({ 
        error: "Network error - unable to connect to AI service",
        details: error.message
      }, { status: 503 })
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: "Request timeout - AI service took too long to respond",
        details: error.message
      }, { status: 504 })
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateTreatmentRecommendation(disease: string): string {
  const treatments: { [key: string]: string } = {
    'bacterial_spot': 'Apply copper-based bactericide. Remove affected leaves and improve air circulation.',
    'early_blight': 'Use fungicide with chlorothalonil or copper. Remove lower leaves and mulch around plants.',
    'late_blight': 'Apply fungicide immediately. Remove affected plants and avoid overhead watering.',
    'leaf_mold': 'Improve ventilation and reduce humidity. Apply fungicide if severe.',
    'septoria_leaf_spot': 'Use fungicide with chlorothalonil. Remove affected leaves and avoid overhead watering.',
    'spider_mites': 'Spray with water or insecticidal soap. Increase humidity around plants.',
    'target_spot': 'Apply fungicide and improve air circulation. Remove affected leaves.',
    'yellow_leaf_curl_virus': 'Remove affected plants immediately. Control whiteflies to prevent spread.',
    'mosaic_virus': 'Remove infected plants. Control aphids and disinfect tools.',
    'powdery_mildew': 'Apply sulfur-based fungicide. Improve air circulation and avoid overhead watering.',
    'rust': 'Apply fungicide with copper or sulfur. Remove affected leaves and improve ventilation.'
  }

  const diseaseKey = disease.toLowerCase().replace(/\s+/g, '_')
  return treatments[diseaseKey] || `Monitor plant closely and consult agricultural extension service for treatment of ${disease}.`
}
