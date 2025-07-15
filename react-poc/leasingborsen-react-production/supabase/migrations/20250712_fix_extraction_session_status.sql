-- Fix extraction_sessions status constraint to allow 'partially_applied'
ALTER TABLE extraction_sessions 
DROP CONSTRAINT IF EXISTS extraction_sessions_status_check;

ALTER TABLE extraction_sessions 
ADD CONSTRAINT extraction_sessions_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partially_applied'));

-- Also update the existing function to handle the constraint properly
-- The function already sets 'partially_applied' when there are errors,
-- so we just need to update the constraint to allow it