-- Migration: Update lease score staleness triggers for v2.1
-- 
-- Changes for v2.1 Effective Monthly (EML) implementation:
-- - Add period_months to staleness trigger (now affects score calculation) 
-- - Add retail_price changes to staleness tracking
-- - Update trigger comments to reflect v2.1 logic
--
-- v2.1: period_months now affects EML calculation (contract term in denominator)
-- v2.1: retail_price changes affect score since it's denominator in percentage calculation

-- Drop existing pricing trigger to recreate with updated columns
DROP TRIGGER IF EXISTS pricing_score_stale ON lease_pricing;

-- Create updated pricing trigger that includes period_months 
CREATE OR REPLACE TRIGGER pricing_score_stale
AFTER INSERT OR UPDATE OF 
  monthly_price,      -- Monthly payment (affects EML calculation)
  period_months,      -- NOW AFFECTS SCORE: Contract term used in EML-Term calculation  
  mileage_per_year,   -- Mileage component (unchanged)
  first_payment       -- First payment/deposit (affects EML calculation)
ON lease_pricing
FOR EACH ROW 
EXECUTE FUNCTION mark_listing_score_stale();

-- Add trigger for retail_price changes on listings table
-- retail_price is the denominator in EML percentage calculation
CREATE OR REPLACE TRIGGER listing_retail_price_score_stale
AFTER UPDATE OF retail_price
ON listings
FOR EACH ROW 
WHEN (OLD.retail_price IS DISTINCT FROM NEW.retail_price)
EXECUTE FUNCTION mark_listing_score_stale();

-- Update trigger comments for documentation
COMMENT ON TRIGGER pricing_score_stale ON lease_pricing IS 
  'v2.1: Marks lease scores stale when EML inputs change. period_months now affects calculation as contract term in EML-Term formula.';

COMMENT ON TRIGGER listing_retail_price_score_stale ON listings IS
  'v2.1: Marks lease scores stale when retail_price changes since it affects EML percentage calculation.';

-- Verify the mark_listing_score_stale function exists
-- This function should set lease_score_calculated_at to NULL to mark score as stale
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'mark_listing_score_stale'
  ) THEN
    RAISE EXCEPTION 'Function mark_listing_score_stale() does not exist. Please create it first.';
  END IF;
END $$;