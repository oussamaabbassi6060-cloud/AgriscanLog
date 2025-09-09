-- Add additional fields to scans table for AI model integration
ALTER TABLE public.scans 
ADD COLUMN IF NOT EXISTS species text,
ADD COLUMN IF NOT EXISTS disease text,
ADD COLUMN IF NOT EXISTS species_confidence integer,
ADD COLUMN IF NOT EXISTS disease_confidence integer,
ADD COLUMN IF NOT EXISTS ai_response jsonb;

-- Create index for better performance on species and disease queries
CREATE INDEX IF NOT EXISTS scans_species_idx ON public.scans(species);
CREATE INDEX IF NOT EXISTS scans_disease_idx ON public.scans(disease);
CREATE INDEX IF NOT EXISTS scans_created_at_idx ON public.scans(created_at DESC);

-- Add some sample data categories for better analytics
COMMENT ON COLUMN public.scans.species IS 'Plant species identified by AI model';
COMMENT ON COLUMN public.scans.disease IS 'Disease/condition identified by AI model';
COMMENT ON COLUMN public.scans.species_confidence IS 'Confidence percentage for species identification (0-100)';
COMMENT ON COLUMN public.scans.disease_confidence IS 'Confidence percentage for disease identification (0-100)';
COMMENT ON COLUMN public.scans.ai_response IS 'Full AI model response for debugging and analysis';
