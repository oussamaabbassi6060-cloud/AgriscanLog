-- Add Groq AI analysis fields to scans table
-- This adds fields to store comprehensive disease analysis from Groq AI

-- Add new columns for Groq AI analysis
ALTER TABLE public.scans 
ADD COLUMN IF NOT EXISTS about_disease text NULL,
ADD COLUMN IF NOT EXISTS treatment_recommendations text NULL,
ADD COLUMN IF NOT EXISTS prevention_tips text NULL,
ADD COLUMN IF NOT EXISTS groq_response text NULL,
ADD COLUMN IF NOT EXISTS groq_analysis_status text NULL DEFAULT 'pending' CHECK (groq_analysis_status IN ('pending', 'completed', 'failed'));

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS scans_groq_analysis_status_idx ON public.scans(groq_analysis_status);

-- Add comments for documentation
COMMENT ON COLUMN public.scans.about_disease IS 'Detailed disease information from Groq AI analysis';
COMMENT ON COLUMN public.scans.treatment_recommendations IS 'Treatment recommendations from Groq AI analysis';
COMMENT ON COLUMN public.scans.prevention_tips IS 'Prevention tips from Groq AI analysis';
COMMENT ON COLUMN public.scans.groq_response IS 'Full Groq AI response for debugging';
COMMENT ON COLUMN public.scans.groq_analysis_status IS 'Status of Groq AI analysis processing';
