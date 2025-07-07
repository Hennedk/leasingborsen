-- Add pdf_urls JSONB column to sellers table for storing multiple named PDF URLs
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS pdf_urls JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN sellers.pdf_urls IS 'Array of PDF URLs with names for different price lists (e.g., different brands, campaigns)';

-- Migrate existing single pdf_url to the new array structure (if not null)
UPDATE sellers 
SET pdf_urls = jsonb_build_array(
  jsonb_build_object(
    'name', 'Standard prisliste',
    'url', pdf_url
  )
)
WHERE pdf_url IS NOT NULL 
AND pdf_url != ''
AND (pdf_urls IS NULL OR pdf_urls = '[]'::jsonb);

-- Update sellers_with_make view to include pdf_urls
CREATE OR REPLACE VIEW sellers_with_make AS
SELECT 
  s.*,
  m.name as make_name
FROM sellers s
LEFT JOIN makes m ON s.make_id = m.id;