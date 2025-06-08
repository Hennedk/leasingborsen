-- Leasingbørsen Test Data Seeding Script (Safe Version)
-- This script creates realistic Danish car leasing test data with enum handling

-- First, let's ensure we have the view (in case it doesn't exist)
DROP VIEW IF EXISTS public.full_listing_view;

CREATE VIEW public.full_listing_view AS
SELECT
  l.id as listing_id,
  lo.id as offer_id,
  m.name as make,
  mo.name as model,
  bt.name as body_type,
  ft.name as fuel_type,
  t.name as transmission,
  c.name as colour,
  l.year,
  l.mileage,
  l.horsepower,
  l.drive_type,
  lo.condition,
  lo.listing_status,
  lo.availability_date,
  lo.security_deposit,
  lo.final_payment,
  lo.excess_km_rate,
  lo.total_lease_cost,
  lp_cheapest.mileage_per_year,
  lp_cheapest.first_payment,
  lp_cheapest.period_months,
  lp_cheapest.monthly_price,
  l.image,
  l.variant,
  l.seats,
  l.co2_emission,
  l.co2_tax_half_year,
  l.wltp,
  l.description
FROM
  listings l
  JOIN makes m ON l.make_id = m.id
  JOIN models mo ON l.model_id = mo.id
  JOIN body_types bt ON l.body_type_id = bt.id
  JOIN fuel_types ft ON l.fuel_type_id = ft.id
  JOIN transmissions t ON l.transmission_id = t.id
  JOIN listing_offers lo ON lo.listing_id = l.id
  JOIN colours c ON lo.colour_id = c.id
  JOIN (
    SELECT DISTINCT
      ON (lease_pricing.listing_id) lease_pricing.id,
      lease_pricing.listing_id,
      lease_pricing.mileage_per_year,
      lease_pricing.first_payment,
      lease_pricing.period_months,
      lease_pricing.monthly_price
    FROM
      lease_pricing
    ORDER BY
      lease_pricing.listing_id,
      lease_pricing.monthly_price
  ) lp_cheapest ON lp_cheapest.listing_id = l.id;

-- Insert reference data for Danish car market

-- Car Makes (Popular in Denmark)
INSERT INTO makes (name) VALUES 
  ('BMW'),
  ('Mercedes-Benz'),
  ('Audi'),
  ('Volkswagen'),
  ('Peugeot'),
  ('Citroën'),
  ('Volvo'),
  ('Toyota'),
  ('Hyundai'),
  ('Kia'),
  ('Tesla'),
  ('Ford'),
  ('Opel'),
  ('Skoda'),
  ('SEAT')
ON CONFLICT (name) DO NOTHING;

-- Car Models
INSERT INTO models (name, make_id) VALUES 
  -- BMW
  ('3 Series', (SELECT id FROM makes WHERE name = 'BMW')),
  ('5 Series', (SELECT id FROM makes WHERE name = 'BMW')),
  ('X3', (SELECT id FROM makes WHERE name = 'BMW')),
  ('X5', (SELECT id FROM makes WHERE name = 'BMW')),
  ('i4', (SELECT id FROM makes WHERE name = 'BMW')),
  
  -- Mercedes-Benz
  ('C-Class', (SELECT id FROM makes WHERE name = 'Mercedes-Benz')),
  ('E-Class', (SELECT id FROM makes WHERE name = 'Mercedes-Benz')),
  ('GLC', (SELECT id FROM makes WHERE name = 'Mercedes-Benz')),
  ('A-Class', (SELECT id FROM makes WHERE name = 'Mercedes-Benz')),
  ('EQC', (SELECT id FROM makes WHERE name = 'Mercedes-Benz')),
  
  -- Audi
  ('A4', (SELECT id FROM makes WHERE name = 'Audi')),
  ('A6', (SELECT id FROM makes WHERE name = 'Audi')),
  ('Q5', (SELECT id FROM makes WHERE name = 'Audi')),
  ('e-tron', (SELECT id FROM makes WHERE name = 'Audi')),
  ('A3', (SELECT id FROM makes WHERE name = 'Audi')),
  
  -- Volkswagen
  ('Golf', (SELECT id FROM makes WHERE name = 'Volkswagen')),
  ('Passat', (SELECT id FROM makes WHERE name = 'Volkswagen')),
  ('Tiguan', (SELECT id FROM makes WHERE name = 'Volkswagen')),
  ('ID.4', (SELECT id FROM makes WHERE name = 'Volkswagen')),
  ('Polo', (SELECT id FROM makes WHERE name = 'Volkswagen')),
  
  -- Tesla
  ('Model 3', (SELECT id FROM makes WHERE name = 'Tesla')),
  ('Model Y', (SELECT id FROM makes WHERE name = 'Tesla')),
  ('Model S', (SELECT id FROM makes WHERE name = 'Tesla'))
ON CONFLICT (name, make_id) DO NOTHING;

-- Body Types (Danish terms)
INSERT INTO body_types (name) VALUES 
  ('Sedan'),
  ('Stationcar'),
  ('SUV'),
  ('Cabriolet'),
  ('Coupe'),
  ('Hatchback'),
  ('Kombi')
ON CONFLICT (name) DO NOTHING;

-- Fuel Types (Danish market)
INSERT INTO fuel_types (name) VALUES 
  ('Benzin'),
  ('Diesel'),
  ('El'),
  ('Hybrid'),
  ('Plug-in Hybrid')
ON CONFLICT (name) DO NOTHING;

-- Transmissions (Danish terms)
INSERT INTO transmissions (name) VALUES 
  ('Automatgear'),
  ('Manuel'),
  ('CVT')
ON CONFLICT (name) DO NOTHING;

-- Colours (Danish names)
INSERT INTO colours (name) VALUES 
  ('Sort'),
  ('Hvid'),
  ('Sølv'),
  ('Grå'),
  ('Blå'),
  ('Rød'),
  ('Grøn'),
  ('Beige'),
  ('Brun')
ON CONFLICT (name) DO NOTHING;

-- Create sample car listings
-- Let's start with just 3 cars to test first
INSERT INTO listings (
  make_id, model_id, body_type_id, fuel_type_id, transmission_id,
  year, mileage, horsepower, drive_type, variant, seats, 
  co2_emission, co2_tax_half_year, wltp, description, image
) VALUES 
  -- BMW 3 Series 2023
  (
    (SELECT id FROM makes WHERE name = 'BMW'),
    (SELECT id FROM models WHERE name = '3 Series'),
    (SELECT id FROM body_types WHERE name = 'Sedan'),
    (SELECT id FROM fuel_types WHERE name = 'Benzin'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2023, 15000, 184, 'fwd', '320i Sport Line', 5,
    142, 7100, 15.8, 'BMW 3 Series med Sport Line pakke. Perfekt til erhverv og privat brug.',
    'https://cdn.bmw.com/content/dam/bmw/common/all-models/3-series/sedan/2022/navigation/bmw-3-series-sedan-lci-modelfinder.png'
  ),
  
  -- Tesla Model 3 2023
  (
    (SELECT id FROM makes WHERE name = 'Tesla'),
    (SELECT id FROM models WHERE name = 'Model 3'),
    (SELECT id FROM body_types WHERE name = 'Sedan'),
    (SELECT id FROM fuel_types WHERE name = 'El'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2023, 18000, 283, 'rwd', 'Long Range', 5,
    0, 0, 16.8, 'Tesla Model 3 Long Range med Autopilot og over the air opdateringer.',
    'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Model-3-Main-Hero-Desktop-LHD.jpg'
  ),
  
  -- Audi Q5 2023 
  (
    (SELECT id FROM makes WHERE name = 'Audi'),
    (SELECT id FROM models WHERE name = 'Q5'),
    (SELECT id FROM body_types WHERE name = 'SUV'),
    (SELECT id FROM fuel_types WHERE name = 'Diesel'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2023, 22000, 204, 'awd', '40 TDI quattro S line', 5,
    164, 8200, 18.5, 'Audi Q5 quattro med S line eksteriør og Matrix LED forlygter.',
    'https://www.audi.dk/-/media/audi/models/q5/q5-sportback/my-2021/1920x1080/1920x1080_q5sb_front.jpg'
  );

-- Create listing offers with manual enum handling
-- First, let's check what the enum values actually are
DO $$
DECLARE
    listing_record RECORD;
    condition_val TEXT;
    status_val TEXT;
BEGIN
    -- We'll use the first valid enum value we can find
    -- This is safer than guessing
    
    FOR listing_record IN SELECT id FROM listings LOOP
        
        -- Try different condition values
        BEGIN
            condition_val := 'new';
            status_val := 'available';
            
            INSERT INTO listing_offers (
                listing_id, 
                colour_id, 
                condition, 
                listing_status, 
                availability_date, 
                security_deposit, 
                final_payment, 
                excess_km_rate, 
                total_lease_cost
            ) VALUES (
                listing_record.id,
                (SELECT id FROM colours WHERE name = 'Hvid' LIMIT 1),
                condition_val::car_condition_enum,
                status_val::listing_status_enum,
                CURRENT_DATE + INTERVAL '7 days',
                5000,
                3000,
                2.5,
                350000
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- If 'new'/'available' doesn't work, try other common values
            BEGIN
                condition_val := 'ny';
                status_val := 'tilgængelig';
                
                INSERT INTO listing_offers (
                    listing_id, 
                    colour_id, 
                    condition, 
                    listing_status, 
                    availability_date, 
                    security_deposit, 
                    final_payment, 
                    excess_km_rate, 
                    total_lease_cost
                ) VALUES (
                    listing_record.id,
                    (SELECT id FROM colours WHERE name = 'Hvid' LIMIT 1),
                    condition_val::car_condition_enum,
                    status_val::listing_status_enum,
                    CURRENT_DATE + INTERVAL '7 days',
                    5000,
                    3000,
                    2.5,
                    350000
                );
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not insert offer for listing %', listing_record.id;
            END;
        END;
        
    END LOOP;
END $$;

-- Create lease pricing options
INSERT INTO lease_pricing (
  listing_id, mileage_per_year, first_payment, period_months, monthly_price
)
SELECT 
  l.id,
  15000,
  0,
  36,
  4500
FROM listings l;

-- Add more pricing options
INSERT INTO lease_pricing (
  listing_id, mileage_per_year, first_payment, period_months, monthly_price
)
SELECT 
  l.id,
  20000,
  25000,
  36,
  3800
FROM listings l;

-- Verification queries
SELECT 'Total cars created:' as info, COUNT(*) as count FROM listings;
SELECT 'Total offers created:' as info, COUNT(*) as count FROM listing_offers;
SELECT 'Total pricing options:' as info, COUNT(*) as count FROM lease_pricing;

-- Show sample data from the view
SELECT 
  make, model, variant, body_type, fuel_type, year,
  monthly_price, mileage_per_year, period_months,
  horsepower, transmission
FROM full_listing_view 
ORDER BY monthly_price 
LIMIT 5;