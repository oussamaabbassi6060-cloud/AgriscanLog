import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function analyzeDisease(cropName, diseaseName, details) {
  console.log('\n=== GROQ AI ANALYSIS START ===');
  console.log('Input parameters:', { cropName, diseaseName, details });
  console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
  
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is missing!');
    return {
      success: false,
      error: 'GROQ API key not configured',
      data: {
        about_disease: 'API configuration error: GROQ API key is missing. Please configure the GROQ_API_KEY environment variable.',
        treatment_recommendations: 'Please consult with a local agricultural expert for treatment recommendations.',
        prevention_tips: 'Follow general good agricultural practices and regular monitoring.'
      }
    };
  }

  try {
    const prompt = `You are an expert plant pathologist and agricultural consultant. Analyze the following plant disease case:

Crop/Plant: ${cropName}
Diagnosed Disease: ${diseaseName}
Confidence Data: ${details}

Provide a comprehensive analysis in the following EXACT format (use these exact headings):

**ABOUT THE DISEASE**
Provide a clear explanation of this disease, its causes, how it spreads, and its impact on the plant. Include symptoms farmers should look for.

**TREATMENT RECOMMENDATIONS**
List specific, actionable treatments including:
- Immediate actions to take
- Organic/biological treatments
- Chemical treatments (if necessary)
- Application methods and timing

**PREVENTION TIPS**
Provide practical prevention strategies including:
- Cultural practices
- Resistant varieties
- Environmental management
- Monitoring techniques

Keep each section concise but informative. Use simple language that farmers can easily understand and implement.`;

    console.log('✅ Calling Groq API...');
    console.log('Prompt length:', prompt.length);

    const startTime = Date.now();
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant", // Updated to current supported model
      temperature: 0.7,
      max_tokens: 1500, // Increased for more detailed responses
      top_p: 1,
      stream: false,
      stop: null
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ Groq API responded in ${responseTime}ms`);
    
    console.log('Full API response structure:', {
      choices: completion.choices?.length,
      usage: completion.usage,
      model: completion.model
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      console.error('❌ No response content from Groq API');
      console.log('Full completion object:', JSON.stringify(completion, null, 2));
      throw new Error('No response content from Groq API');
    }

    console.log('✅ Raw Groq API response:');
    console.log('Length:', response.length);
    console.log('Content preview:', response.substring(0, 200) + '...');
    console.log('Full response:', response);

    // Parse the response to extract structured information
    console.log('\n⚙️ Parsing Groq response...');
    const parsedResponse = parseGroqResponse(response);
    
    console.log('✅ Successfully parsed Groq response');
    console.log('=== GROQ AI ANALYSIS END ===\n');
    
    return {
      success: true,
      data: parsedResponse,
      rawResponse: response
    };

  } catch (error) {
    console.error('❌ Error calling Groq API:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    console.log('=== GROQ AI ANALYSIS END (ERROR) ===\n');
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Unable to fetch disease information at this time.';
    if (error.message.includes('API key')) {
      errorMessage = 'AI analysis service authentication failed.';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'AI analysis service is temporarily busy. Please try again later.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network connection to AI analysis service failed.';
    }
    
    return {
      success: false,
      error: error.message,
      data: {
        about_disease: errorMessage,
        treatment_recommendations: 'Please consult with a local agricultural expert for specific treatment recommendations.',
        prevention_tips: 'Follow general good agricultural practices including proper watering, fertilization, and regular monitoring.'
      }
    };
  }
}

function parseGroqResponse(response) {
  console.log('⚙️ Starting response parsing...');
  
  // Initialize default structure
  const parsed = {
    about_disease: '',
    treatment_recommendations: '',
    prevention_tips: ''
  };

  try {
    console.log('Response length:', response.length);
    console.log('Response sample:', response.substring(0, 300));
    
    // Split response by the exact headings we specified
    console.log('⚙️ Attempting primary parsing method...');
    const aboutMatch = response.match(/\*\*ABOUT THE DISEASE\*\*([\s\S]*?)(?=\*\*TREATMENT RECOMMENDATIONS\*\*|$)/i);
    const treatmentMatch = response.match(/\*\*TREATMENT RECOMMENDATIONS\*\*([\s\S]*?)(?=\*\*PREVENTION TIPS\*\*|$)/i);
    const preventionMatch = response.match(/\*\*PREVENTION TIPS\*\*([\s\S]*?)$/i);
    
    console.log('Primary parsing results:', {
      aboutMatch: !!aboutMatch,
      treatmentMatch: !!treatmentMatch,
      preventionMatch: !!preventionMatch
    });
    
    if (aboutMatch) {
      parsed.about_disease = aboutMatch[1].trim();
    }
    
    if (treatmentMatch) {
      parsed.treatment_recommendations = treatmentMatch[1].trim();
    }
    
    if (preventionMatch) {
      parsed.prevention_tips = preventionMatch[1].trim();
    }
    
    // Log what was parsed
    console.log('Parsed sections:', {
      about_disease: parsed.about_disease ? 'Found' : 'Missing',
      treatment_recommendations: parsed.treatment_recommendations ? 'Found' : 'Missing',
      prevention_tips: parsed.prevention_tips ? 'Found' : 'Missing'
    });

    // Fallback parsing if primary method fails
    if (!parsed.about_disease && !parsed.treatment_recommendations && !parsed.prevention_tips) {
      console.log('Primary parsing failed, trying fallback methods...');
      
      // Try alternative section markers
      const altAboutMatch = response.match(/(?:about|disease information|disease description)[:\s]*([\s\S]*?)(?=treatment|prevention|$)/i);
      const altTreatmentMatch = response.match(/(?:treatment|cure|remedy)[:\s]*([\s\S]*?)(?=prevention|$)/i);
      const altPreventionMatch = response.match(/(?:prevention|prevent|avoid)[:\s]*([\s\S]*?)$/i);
      
      if (altAboutMatch) parsed.about_disease = altAboutMatch[1].trim();
      if (altTreatmentMatch) parsed.treatment_recommendations = altTreatmentMatch[1].trim();
      if (altPreventionMatch) parsed.prevention_tips = altPreventionMatch[1].trim();
    }

    // Final fallback - split the response into equal parts
    if (!parsed.about_disease && !parsed.treatment_recommendations && !parsed.prevention_tips) {
      console.log('All parsing methods failed, using response splitting...');
      const sentences = response.split(/[.!?]\s+/).filter(s => s.trim().length > 30);
      
      if (sentences.length >= 3) {
        const third = Math.floor(sentences.length / 3);
        parsed.about_disease = sentences.slice(0, third).join('. ') + '.';
        parsed.treatment_recommendations = sentences.slice(third, third * 2).join('. ') + '.';
        parsed.prevention_tips = sentences.slice(third * 2).join('. ') + '.';
      } else {
        parsed.about_disease = response;
        parsed.treatment_recommendations = 'Please consult with a local agricultural expert for specific treatment recommendations.';
        parsed.prevention_tips = 'Follow general good agricultural practices and regular monitoring.';
      }
    }

  } catch (parseError) {
    console.error('Error parsing Groq response:', parseError);
    parsed.about_disease = response || 'Unable to analyze disease at this time.';
    parsed.treatment_recommendations = 'Please consult with a local agricultural expert for treatment guidance.';
    parsed.prevention_tips = 'Follow general good agricultural practices and regular plant monitoring.';
  }

  // Ensure no field is empty
  if (!parsed.about_disease) parsed.about_disease = 'Disease analysis not available.';
  if (!parsed.treatment_recommendations) parsed.treatment_recommendations = 'Consult agricultural experts for treatment advice.';
  if (!parsed.prevention_tips) parsed.prevention_tips = 'Practice good crop management and regular monitoring.';

  console.log('Final parsed result:', parsed);
  return parsed;
}
