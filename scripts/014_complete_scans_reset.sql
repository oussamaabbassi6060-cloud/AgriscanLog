-- Complete reset of scans table to ensure compatibility
-- This will drop and recreate the table with the correct structure

-- 1. Drop the existing scans table completely
DROP TABLE IF EXISTS public.scans CASCADE;

-- 2. Recreate the scans table with proper structure for Clerk integration
CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text NULL,
  result text NOT NULL,
  confidence integer NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  treatment text NULL,
  location text NULL,
  points_used integer NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- AI model specific fields
  species text NULL,
  disease text NULL,
  species_confidence integer NULL CHECK (species_confidence IS NULL OR (species_confidence >= 0 AND species_confidence <= 100)),
  disease_confidence integer NULL CHECK (disease_confidence IS NULL OR (disease_confidence >= 0 AND disease_confidence <= 100)),
  ai_response jsonb NULL
);

-- 3. Create indexes for better performance
CREATE INDEX scans_user_id_idx ON public.scans(user_id);
CREATE INDEX scans_created_at_idx ON public.scans(created_at DESC);
CREATE INDEX scans_species_idx ON public.scans(species);
CREATE INDEX scans_disease_idx ON public.scans(disease);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (permissive for now, can be tightened later)
CREATE POLICY "scans_select_all" ON public.scans FOR SELECT USING (true);
CREATE POLICY "scans_insert_all" ON public.scans FOR INSERT WITH CHECK (true);
CREATE POLICY "scans_update_all" ON public.scans FOR UPDATE USING (true);
CREATE POLICY "scans_delete_all" ON public.scans FOR DELETE USING (true);

-- 6. Grant permissions
GRANT ALL ON public.scans TO anon;
GRANT ALL ON public.scans TO authenticated;

-- 7. Add comments for documentation
COMMENT ON TABLE public.scans IS 'Stores AI plant disease scan results';
COMMENT ON COLUMN public.scans.user_id IS 'References profiles.id (internal UUID)';
COMMENT ON COLUMN public.scans.species IS 'Plant species identified by AI model';
COMMENT ON COLUMN public.scans.disease IS 'Disease/condition identified by AI model';
COMMENT ON COLUMN public.scans.species_confidence IS 'Confidence percentage for species identification (0-100)';
COMMENT ON COLUMN public.scans.disease_confidence IS 'Confidence percentage for disease identification (0-100)';
COMMENT ON COLUMN public.scans.ai_response IS 'Full AI model response for debugging and analysis';
