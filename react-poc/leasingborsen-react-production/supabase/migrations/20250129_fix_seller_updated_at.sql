-- Fix seller updated_at field and trigger

-- First, ensure the updated_at column exists on sellers table
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;

-- Recreate the trigger function if needed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_sellers_updated_at
    BEFORE UPDATE ON sellers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update any existing records that might have NULL updated_at
UPDATE sellers 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;