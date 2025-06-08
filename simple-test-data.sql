-- Simple Test Data for Leasingbørsen
-- Manual approach - run these step by step

-- Step 1: Insert basic reference data
INSERT INTO makes (name) VALUES 
  ('BMW'), ('Tesla'), ('Audi')
ON CONFLICT (name) DO NOTHING;

INSERT INTO models (name, make_id) VALUES 
  ('3 Series', (SELECT id FROM makes WHERE name = 'BMW')),
  ('Model 3', (SELECT id FROM makes WHERE name = 'Tesla')),
  ('Q5', (SELECT id FROM makes WHERE name = 'Audi'))
ON CONFLICT (name, make_id) DO NOTHING;

INSERT INTO body_types (name) VALUES 
  ('Sedan'), ('SUV')
ON CONFLICT (name) DO NOTHING;

INSERT INTO fuel_types (name) VALUES 
  ('Benzin'), ('El'), ('Diesel')
ON CONFLICT (name) DO NOTHING;

INSERT INTO transmissions (name) VALUES 
  ('Automatgear')
ON CONFLICT (name) DO NOTHING;

INSERT INTO colours (name) VALUES 
  ('Hvid'), ('Sort'), ('Sølv')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create one test listing
INSERT INTO listings (
  make_id, 
  model_id, 
  body_type_id, 
  fuel_type_id, 
  transmission_id,
  year, 
  mileage, 
  horsepower, 
  drive_type, 
  variant, 
  seats, 
  co2_emission, 
  co2_tax_half_year, 
  wltp, 
  description
) VALUES (
  (SELECT id FROM makes WHERE name = 'BMW'),
  (SELECT id FROM models WHERE name = '3 Series'),
  (SELECT id FROM body_types WHERE name = 'Sedan'),
  (SELECT id FROM fuel_types WHERE name = 'Benzin'),
  (SELECT id FROM transmissions WHERE name = 'Automatgear'),
  2023,
  15000,
  184,
  'fwd',
  '320i Sport Line',
  5,
  142,
  7100,
  15.8,
  'BMW 3 Series test car'
);

-- Step 3: Check what enum values are allowed
SELECT unnest(enum_range(NULL::car_condition_enum)) AS condition_values;
SELECT unnest(enum_range(NULL::listing_status_enum)) AS status_values;

-- Step 4: Create listing offer (you'll need to replace 'CONDITION_VALUE' and 'STATUS_VALUE' 
-- with actual values from the enum check above)
-- 
-- Example: If the enum values are 'new', 'used' for condition and 'available' for status:
-- 
-- INSERT INTO listing_offers (
--   listing_id,
--   colour_id,
--   condition,
--   listing_status,
--   availability_date,
--   security_deposit,
--   final_payment,
--   excess_km_rate,
--   total_lease_cost
-- ) VALUES (
--   (SELECT id FROM listings WHERE variant = '320i Sport Line'),
--   (SELECT id FROM colours WHERE name = 'Hvid'),
--   'new'::car_condition_enum,
--   'available'::listing_status_enum,
--   CURRENT_DATE + INTERVAL '7 days',
--   5000,
--   3000,
--   2.5,
--   350000
-- );

-- Step 5: Create lease pricing
-- INSERT INTO lease_pricing (
--   listing_id,
--   mileage_per_year,
--   first_payment,
--   period_months,
--   monthly_price
-- ) VALUES (
--   (SELECT id FROM listings WHERE variant = '320i Sport Line'),
--   15000,
--   0,
--   36,
--   4500
-- );

-- Step 6: Test the view
-- SELECT * FROM full_listing_view;