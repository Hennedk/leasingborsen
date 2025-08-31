-- Update lease score trigger to include first_payment field
-- This migration adds first_payment to the list of monitored fields in the lease score staleness trigger

-- Drop the existing trigger
DROP TRIGGER IF EXISTS pricing_score_stale ON lease_pricing;

-- Recreate the trigger with first_payment included
CREATE TRIGGER pricing_score_stale
AFTER INSERT OR UPDATE OF monthly_price, period_months, mileage_per_year, first_payment 
ON lease_pricing
FOR EACH ROW
EXECUTE FUNCTION mark_lease_score_stale();

-- Add comment for documentation
COMMENT ON TRIGGER pricing_score_stale ON lease_pricing IS 'Marks listings for lease score recalculation when lease pricing changes (including first_payment for v2.0 deposit-based scoring)';