import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    console.log('Testing Hugging Face API connectivity...')
    
    // Test with a simple GET request first
    const testResponse = await fetch('https://aziz03-plant-disease-api.hf.space/', {
      method: 'GET',
      headers: {
        'User-Agent': 'AgriScan-App/1.0',
      },
    })
    
    console.log('Test response status:', testResponse.status)
    console.log('Test response headers:', Object.fromEntries(testResponse.headers.entries()))
    
    const responseText = await testResponse.text()
    
    return NextResponse.json({
      success: true,
      status: testResponse.status,
      statusText: testResponse.statusText,
      headers: Object.fromEntries(testResponse.headers.entries()),
      bodyPreview: responseText.substring(0, 500) // First 500 chars
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('Testing Hugging Face API with POST request...')
    
    // Create a minimal test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
      0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84,
      120, 156, 99, 248, 15, 0, 0, 1, 0, 1, 0, 18, 221, 204, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ])
    
    const formData = new FormData()
    const testFile = new File([testImageBuffer], 'test.png', { type: 'image/png' })
    formData.append('file', testFile)
    
    const hfResponse = await fetch('https://aziz03-plant-disease-api.hf.space/predict', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgriScan-App/1.0',
      },
    })
    
    console.log('HF API response status:', hfResponse.status)
    
    let responseData
    const contentType = hfResponse.headers.get('content-type')
    console.log('Response content-type:', contentType)
    
    if (contentType?.includes('application/json')) {
      responseData = await hfResponse.json()
    } else {
      responseData = await hfResponse.text()
    }
    
    return NextResponse.json({
      success: hfResponse.ok,
      status: hfResponse.status,
      statusText: hfResponse.statusText,
      headers: Object.fromEntries(hfResponse.headers.entries()),
      data: responseData
    })
    
  } catch (error) {
    console.error('POST test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
