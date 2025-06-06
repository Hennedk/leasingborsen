-- Leasingbørsen Database Setup
-- Run this in your Supabase SQL Editor

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  variant VARCHAR(200) NOT NULL,
  year INTEGER NOT NULL,
  mileage INTEGER DEFAULT 0,
  horsepower INTEGER DEFAULT 0,
  fuel_type VARCHAR(50) DEFAULT 'Benzin',
  transmission VARCHAR(50) DEFAULT 'Automatisk',
  body_type VARCHAR(50) DEFAULT 'Sedan',
  drive_type VARCHAR(50) DEFAULT 'Forhjulstræk',
  seats INTEGER DEFAULT 5,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create lease_pricing table
CREATE TABLE IF NOT EXISTS lease_pricing (
  pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(listing_id) ON DELETE CASCADE,
  monthly_price INTEGER NOT NULL,
  first_payment INTEGER DEFAULT 0,
  mileage_per_year INTEGER DEFAULT 20000,
  period_months INTEGER DEFAULT 36,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the full_listing_view that combines both tables
CREATE OR REPLACE VIEW full_listing_view AS
SELECT 
  l.*,
  lp.monthly_price,
  lp.first_payment,
  lp.mileage_per_year,
  lp.period_months
FROM listings l
LEFT JOIN lease_pricing lp ON l.listing_id = lp.listing_id;

-- Enable Row Level Security (RLS) but allow all operations for now
-- You can restrict this later based on your authentication needs
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust as needed)
CREATE POLICY IF NOT EXISTS "Allow all operations on listings" 
  ON listings FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on lease_pricing" 
  ON lease_pricing FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO listings (make, model, variant, year, mileage, horsepower, fuel_type, transmission, body_type, description) VALUES
  ('BMW', '3 Series', '320d xDrive', 2023, 15000, 190, 'Diesel', 'Automatisk', 'Sedan', 'Flot BMW 3 Serie med xDrive og automatgear'),
  ('Audi', 'A4', '2.0 TDI', 2022, 25000, 150, 'Diesel', 'Automatisk', 'Sedan', 'Elegant Audi A4 med lav kilometerstand'),
  ('Mercedes-Benz', 'C-Class', 'C220d', 2023, 12000, 200, 'Diesel', 'Automatisk', 'Sedan', 'Luksuriøs Mercedes C-klasse')
ON CONFLICT DO NOTHING;

-- Insert sample lease pricing
INSERT INTO lease_pricing (listing_id, monthly_price, first_payment, mileage_per_year, period_months)
SELECT 
  l.listing_id,
  CASE 
    WHEN l.make = 'BMW' THEN 6500
    WHEN l.make = 'Audi' THEN 5800
    WHEN l.make = 'Mercedes-Benz' THEN 7200
  END,
  CASE 
    WHEN l.make = 'BMW' THEN 65000
    WHEN l.make = 'Audi' THEN 58000
    WHEN l.make = 'Mercedes-Benz' THEN 72000
  END,
  20000,
  36
FROM listings l
WHERE NOT EXISTS (
  SELECT 1 FROM lease_pricing lp WHERE lp.listing_id = l.listing_id
);

-- Verify the setup
SELECT 'Setup Complete! Tables created:' as status;
SELECT 'listings' as table_name, count(*) as records FROM listings
UNION ALL
SELECT 'lease_pricing' as table_name, count(*) as records FROM lease_pricing
UNION ALL
SELECT 'full_listing_view' as table_name, count(*) as records FROM full_listing_view; 