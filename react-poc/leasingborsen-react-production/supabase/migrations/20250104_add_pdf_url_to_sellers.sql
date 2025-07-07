-- Add pdf_url column to sellers table for storing dealer PDF URLs
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN sellers.pdf_url IS 'URL to the dealer''s PDF price list for automatic extraction';

-- Update sellers_with_make view to include pdf_url
CREATE OR REPLACE VIEW sellers_with_make AS
SELECT 
  s.*,
  m.name as make_name
FROM sellers s
LEFT JOIN makes m ON s.make_id = m.id;