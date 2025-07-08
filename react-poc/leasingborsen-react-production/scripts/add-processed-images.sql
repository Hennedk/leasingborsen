-- Add processed image fields to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS processed_image_grid TEXT,
ADD COLUMN IF NOT EXISTS processed_image_detail TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add comments explaining the new fields
COMMENT ON COLUMN listings.processed_image_grid IS 'Background-removed image optimized for grid view (800x500px)';
COMMENT ON COLUMN listings.processed_image_detail IS 'Background-removed image optimized for detail view (1600x800px)';
COMMENT ON COLUMN listings.images IS 'Array of all image URLs for the listing';

-- Note: After running this migration, you'll need to recreate the full_listing_view
-- to include these new fields. The exact query depends on your current view definition.