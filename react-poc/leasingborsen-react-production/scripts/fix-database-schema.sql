-- Fix: Add missing result column to store extracted vehicle data
-- This will allow viewing the actual extracted cars from PDF processing

ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS result JSONB;

-- Add index for better performance when querying results
CREATE INDEX IF NOT EXISTS idx_processing_jobs_result ON processing_jobs USING GIN (result);

-- Update existing successful jobs to show they had results (optional)
UPDATE processing_jobs 
SET result = jsonb_build_object(
  'vehicles_extracted', processed_items,
  'extraction_status', 'completed_but_data_not_stored',
  'note', 'Results available but not stored due to missing column'
)
WHERE status = 'completed' AND result IS NULL;