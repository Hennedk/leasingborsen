-- Function to mark listings for lease score recalculation
CREATE OR REPLACE FUNCTION mark_lease_score_stale()
RETURNS TRIGGER AS $$
BEGIN
  -- For listings table - retail price changes
  IF TG_TABLE_NAME = 'listings' THEN
    -- Only mark as stale if retail price actually changed and is not null
    IF OLD.retail_price IS DISTINCT FROM NEW.retail_price AND NEW.retail_price IS NOT NULL THEN
      NEW.lease_score := NULL;
      NEW.lease_score_calculated_at := NULL;
      NEW.lease_score_breakdown := NULL;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For lease_pricing table - any relevant changes
  IF TG_TABLE_NAME = 'lease_pricing' THEN
    -- Mark the associated listing for recalculation if it has a retail price
    UPDATE listings 
    SET 
      lease_score = NULL,
      lease_score_calculated_at = NULL,
      lease_score_breakdown = NULL
    WHERE id = NEW.listing_id
      AND retail_price IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for listings table - fires on retail price updates
CREATE TRIGGER listings_score_stale
BEFORE UPDATE OF retail_price ON listings
FOR EACH ROW
EXECUTE FUNCTION mark_lease_score_stale();

-- Trigger for lease_pricing table - fires on relevant pricing changes
CREATE TRIGGER pricing_score_stale
AFTER INSERT OR UPDATE OF monthly_price, period_months, mileage_per_year 
ON lease_pricing
FOR EACH ROW
EXECUTE FUNCTION mark_lease_score_stale();

-- Add comment for documentation
COMMENT ON FUNCTION mark_lease_score_stale() IS 'Marks listings for lease score recalculation when retail price or lease pricing changes';