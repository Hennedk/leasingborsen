-- Update extraction_listing_changes constraints to support missing_model change type
-- This fixes the constraint violation error when inserting missing_model records

-- Drop existing constraints
ALTER TABLE extraction_listing_changes 
DROP CONSTRAINT IF EXISTS extraction_listing_changes_change_type_check;

ALTER TABLE extraction_listing_changes 
DROP CONSTRAINT IF EXISTS extraction_listing_changes_match_method_check;

-- Add updated constraints with missing_model support
ALTER TABLE extraction_listing_changes 
ADD CONSTRAINT extraction_listing_changes_change_type_check 
CHECK (change_type = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'unchanged'::text, 'missing_model'::text]));

ALTER TABLE extraction_listing_changes 
ADD CONSTRAINT extraction_listing_changes_match_method_check 
CHECK (match_method = ANY (ARRAY['exact'::text, 'fuzzy'::text, 'manual'::text, 'unmatched'::text, 'model_not_found'::text]));

-- Add comment for documentation
COMMENT ON CONSTRAINT extraction_listing_changes_change_type_check ON extraction_listing_changes 
IS 'Allows create, update, delete, unchanged, and missing_model change types';

COMMENT ON CONSTRAINT extraction_listing_changes_match_method_check ON extraction_listing_changes 
IS 'Allows exact, fuzzy, manual, unmatched, and model_not_found match methods';