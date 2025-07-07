-- Add lease score fields to listings table
ALTER TABLE listings 
ADD COLUMN retail_price NUMERIC(10, 2),
ADD COLUMN lease_score INTEGER CHECK (lease_score >= 0 AND lease_score <= 100),
ADD COLUMN lease_score_calculated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN lease_score_breakdown JSONB;

-- Add indexes for performance
CREATE INDEX idx_listings_lease_score ON listings(lease_score) WHERE lease_score IS NOT NULL;
CREATE INDEX idx_listings_retail_price ON listings(retail_price) WHERE retail_price IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN listings.retail_price IS 'The retail price of the vehicle used for lease score calculation';
COMMENT ON COLUMN listings.lease_score IS 'Calculated lease score (0-100) based on monthly rate, mileage, and contract flexibility';
COMMENT ON COLUMN listings.lease_score_calculated_at IS 'Timestamp when the lease score was last calculated';
COMMENT ON COLUMN listings.lease_score_breakdown IS 'JSON breakdown of score components including monthly rate, mileage, and flexibility scores';