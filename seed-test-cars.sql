-- Leasingbørsen Test Data Seeding Script
-- This script creates realistic Danish car leasing test data

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

-- Clear existing data (be careful in production!)
-- TRUNCATE TABLE lease_pricing CASCADE;
-- TRUNCATE TABLE listing_offers CASCADE;
-- TRUNCATE TABLE listings CASCADE;
-- DELETE FROM models;
-- DELETE FROM makes;
-- DELETE FROM body_types;
-- DELETE FROM fuel_types;
-- DELETE FROM transmissions;
-- DELETE FROM colours;

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
  
  -- Peugeot
  ('308', (SELECT id FROM makes WHERE name = 'Peugeot')),
  ('508', (SELECT id FROM makes WHERE name = 'Peugeot')),
  ('3008', (SELECT id FROM makes WHERE name = 'Peugeot')),
  ('e-208', (SELECT id FROM makes WHERE name = 'Peugeot')),
  
  -- Tesla
  ('Model 3', (SELECT id FROM makes WHERE name = 'Tesla')),
  ('Model Y', (SELECT id FROM makes WHERE name = 'Tesla')),
  ('Model S', (SELECT id FROM makes WHERE name = 'Tesla')),
  
  -- Volvo
  ('XC60', (SELECT id FROM makes WHERE name = 'Volvo')),
  ('XC90', (SELECT id FROM makes WHERE name = 'Volvo')),
  ('V60', (SELECT id FROM makes WHERE name = 'Volvo')),
  
  -- Toyota
  ('Corolla', (SELECT id FROM makes WHERE name = 'Toyota')),
  ('RAV4', (SELECT id FROM makes WHERE name = 'Toyota')),
  ('Prius', (SELECT id FROM makes WHERE name = 'Toyota'))
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

-- Create realistic car listings
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
  
  -- Mercedes C-Class 2024
  (
    (SELECT id FROM makes WHERE name = 'Mercedes-Benz'),
    (SELECT id FROM models WHERE name = 'C-Class'),
    (SELECT id FROM body_types WHERE name = 'Sedan'),
    (SELECT id FROM fuel_types WHERE name = 'Hybrid'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2024, 8000, 204, 'fwd', 'C 300 e AMG Line', 5,
    14, 700, 50.0, 'Mercedes C-Class Plug-in Hybrid med AMG styling og premium interiør.',
    'https://www.mercedes-benz.dk/content/denmark/da/passengercars/models/saloon/c-class/_jcr_content/image.MQ6.8.20190411143453.jpeg'
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
  ),
  
  -- Volkswagen ID.4 2024 (Electric)
  (
    (SELECT id FROM makes WHERE name = 'Volkswagen'),
    (SELECT id FROM models WHERE name = 'ID.4'),
    (SELECT id FROM body_types WHERE name = 'SUV'),
    (SELECT id FROM fuel_types WHERE name = 'El'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2024, 12000, 204, 'rwd', 'Pro Performance', 5,
    0, 0, 20.5, 'Volkswagen ID.4 elbil med 520 km rækkevidde og hurtigladning.',
    'https://www.volkswagen.dk/content/medialib/vwd4/dk/homepage/models/id4/_jcr_content/image.img.jpg/1616576400000.jpg'
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
  
  -- Peugeot 3008 2023
  (
    (SELECT id FROM makes WHERE name = 'Peugeot'),
    (SELECT id FROM models WHERE name = '3008'),
    (SELECT id FROM body_types WHERE name = 'SUV'),
    (SELECT id FROM fuel_types WHERE name = 'Benzin'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2023, 16000, 130, 'fwd', '1.2 PureTech Allure', 5,
    132, 6600, 17.9, 'Peugeot 3008 med iCockpit og avanceret sikkerhedspakke.',
    'https://www.peugeot.dk/content/dam/peugeot/master/b2c/our-range/3008/3008-suv/design/exterior/peugeot-3008-suv-exterior-design.jpg'
  ),
  
  -- Volvo XC60 2024
  (
    (SELECT id FROM makes WHERE name = 'Volvo'),
    (SELECT id FROM models WHERE name = 'XC60'),
    (SELECT id FROM body_types WHERE name = 'SUV'),
    (SELECT id FROM fuel_types WHERE name = 'Hybrid'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2024, 9000, 250, 'awd', 'B5 AWD Inscription', 5,
    164, 8200, 15.4, 'Volvo XC60 mild-hybrid med Pilot Assist og premium lydanlæg.',
    'https://www.volvocars.com/images/v/-/media/applications/pdp/xc60/2022/hero-images/volvo-xc60-recharge-hero.jpg'
  ),
  
  -- Toyota RAV4 2023
  (
    (SELECT id FROM makes WHERE name = 'Toyota'),
    (SELECT id FROM models WHERE name = 'RAV4'),
    (SELECT id FROM body_types WHERE name = 'SUV'),
    (SELECT id FROM fuel_types WHERE name = 'Hybrid'),
    (SELECT id FROM transmissions WHERE name = 'CVT'),
    2023, 20000, 196, 'awd', '2.5 Hybrid AWD Style', 5,
    126, 6300, 20.0, 'Toyota RAV4 Hybrid med AWD og Toyota Safety Sense 2.0.',
    'https://www.toyota.dk/content/dam/toyota/vehicles/rav4/rav4-hybrid/gallery/exterior/2019_rav4_ext_1.jpg'
  ),
  
  -- BMW X5 2024
  (
    (SELECT id FROM makes WHERE name = 'BMW'),
    (SELECT id FROM models WHERE name = 'X5'),
    (SELECT id FROM body_types WHERE name = 'SUV'),
    (SELECT id FROM fuel_types WHERE name = 'Diesel'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2024, 5000, 265, 'awd', 'xDrive30d M Sport', 7,
    189, 9450, 15.6, 'BMW X5 med 7 sæder, M Sport pakke og adaptiv affjedring.',
    'https://www.bmw.dk/content/dam/bmw/common/all-models/x-series/x5/2018/inspire/bmw-x5-inspire-gallery-image-01.jpg'
  ),
  
  -- Mercedes EQC 2023 (Electric)
  (
    (SELECT id FROM makes WHERE name = 'Mercedes-Benz'),
    (SELECT id FROM models WHERE name = 'EQC'),
    (SELECT id FROM body_types WHERE name = 'SUV'),
    (SELECT id FROM fuel_types WHERE name = 'El'),
    (SELECT id FROM transmissions WHERE name = 'Automatgear'),
    2023, 14000, 408, 'awd', '400 4MATIC AMG Line', 5,
    0, 0, 21.3, 'Mercedes EQC elbil med AMG styling og 410 km rækkevidde.',
    'https://www.mercedes-benz.dk/content/denmark/da/passengercars/models/suv/eqc/_jcr_content/image.MQ6.8.20190507093253.jpeg'
  );

-- Create listing offers for each car
INSERT INTO listing_offers (
  listing_id, colour_id, condition, listing_status, 
  availability_date, security_deposit, final_payment, 
  excess_km_rate, total_lease_cost
)
SELECT 
  l.id,
  (SELECT id FROM colours WHERE name = 
    CASE 
      WHEN RANDOM() < 0.3 THEN 'Hvid'
      WHEN RANDOM() < 0.5 THEN 'Sort'
      WHEN RANDOM() < 0.7 THEN 'Sølv'
      WHEN RANDOM() < 0.85 THEN 'Grå'
      ELSE 'Blå'
    END
  ),
  CASE WHEN RANDOM() < 0.8 THEN 'Ny'::car_condition_enum ELSE 'Brugt'::car_condition_enum END,
  'Tilgængelig'::listing_status_enum,
  CURRENT_DATE + INTERVAL '7 days' + (RANDOM() * INTERVAL '30 days'),
  CASE WHEN RANDOM() < 0.5 THEN 0 ELSE (3000 + RANDOM() * 12000)::INTEGER END,
  (2000 + RANDOM() * 8000)::INTEGER,
  1.50 + RANDOM() * 2.0,
  (200000 + RANDOM() * 400000)::INTEGER
FROM listings l;

-- Create lease pricing options (multiple price points per car)
INSERT INTO lease_pricing (
  listing_id, mileage_per_year, first_payment, period_months, monthly_price
)
SELECT 
  l.id,
  mileage,
  first_payment,
  period,
  monthly_price
FROM listings l
CROSS JOIN (
  VALUES 
    -- Standard mileage options with varied pricing
    (15000, 0, 36, 3500 + (RANDOM() * 2000)::INTEGER),
    (15000, 25000, 36, 3200 + (RANDOM() * 1800)::INTEGER),
    (20000, 0, 36, 3800 + (RANDOM() * 2200)::INTEGER),
    (20000, 30000, 36, 3500 + (RANDOM() * 2000)::INTEGER),
    (25000, 0, 36, 4100 + (RANDOM() * 2500)::INTEGER),
    (25000, 35000, 36, 3800 + (RANDOM() * 2200)::INTEGER),
    
    -- 24-month options (higher monthly, lower total)
    (15000, 0, 24, 4200 + (RANDOM() * 2500)::INTEGER),
    (20000, 20000, 24, 4000 + (RANDOM() * 2300)::INTEGER),
    
    -- 48-month options (lower monthly, higher total)
    (15000, 0, 48, 2800 + (RANDOM() * 1500)::INTEGER),
    (20000, 25000, 48, 2900 + (RANDOM() * 1600)::INTEGER)
) AS pricing_options(mileage, first_payment, period, monthly_price);

-- Update monthly prices based on car value and features
UPDATE lease_pricing 
SET monthly_price = 
  CASE 
    -- Premium brands (BMW, Mercedes, Audi) cost more
    WHEN l.make_id IN (
      SELECT id FROM makes WHERE name IN ('BMW', 'Mercedes-Benz', 'Audi')
    ) THEN monthly_price + 1000 + (RANDOM() * 1500)::INTEGER
    
    -- Tesla and electric cars
    WHEN l.make_id = (SELECT id FROM makes WHERE name = 'Tesla') 
    OR l.fuel_type_id = (SELECT id FROM fuel_types WHERE name = 'El')
    THEN monthly_price + 800 + (RANDOM() * 1200)::INTEGER
    
    -- SUVs cost more
    WHEN l.body_type_id = (SELECT id FROM body_types WHERE name = 'SUV')
    THEN monthly_price + 500 + (RANDOM() * 800)::INTEGER
    
    -- Newer cars cost more
    WHEN l.year = 2024 THEN monthly_price + 300 + (RANDOM() * 500)::INTEGER
    
    -- Everything else stays the same or small adjustment
    ELSE monthly_price + (RANDOM() * 300)::INTEGER
  END
FROM listings l
WHERE lease_pricing.listing_id = l.id;

-- Ensure realistic pricing minimums (no car below 2000 kr/month)
UPDATE lease_pricing SET monthly_price = 2000 + (RANDOM() * 500)::INTEGER 
WHERE monthly_price < 2000;

-- Ensure realistic pricing maximums (no car above 12000 kr/month unless it's premium)
UPDATE lease_pricing 
SET monthly_price = 8000 + (RANDOM() * 2000)::INTEGER 
WHERE monthly_price > 12000 
AND listing_id NOT IN (
  SELECT l.id FROM listings l 
  JOIN makes m ON l.make_id = m.id 
  WHERE m.name IN ('BMW', 'Mercedes-Benz', 'Audi', 'Tesla')
  AND l.year >= 2023
);

-- Add some sellers (Danish dealerships)
INSERT INTO sellers (name, address, phone, email, website) VALUES 
  ('BMW Frederiksberg', 'Falkoner Plads 1, 2000 Frederiksberg', '+45 38 14 60 00', 'info@bmwfrederiksberg.dk', 'www.bmwfrederiksberg.dk'),
  ('Mercedes-Benz København', 'Lyngbyvej 20, 2100 København Ø', '+45 39 27 02 27', 'info@mercedes-koebenhavn.dk', 'www.mercedes-benz-koebenhavn.dk'),
  ('Audi Center København', 'Gl. Køge Landevej 735, 2665 Vallensbæk Strand', '+45 43 73 40 00', 'info@audicenter.dk', 'www.audi-center.dk'),
  ('Volkswagen Glostrup', 'Hovedvejen 35, 2600 Glostrup', '+45 43 43 16 00', 'info@vwglostrup.dk', 'www.volkswagen-glostrup.dk'),
  ('Tesla Center København', 'Frederiksholms Kanal 30, 1220 København K', '+45 77 77 77 77', 'info@tesla.dk', 'www.tesla.com/da_dk'),
  ('Peugeot Herlev', 'Bygmarken 15, 2730 Herlev', '+45 44 84 10 00', 'info@peugeotherlev.dk', 'www.peugeot-herlev.dk'),
  ('Volvo Gentofte', 'Helsingørsgade 15, 2900 Hellerup', '+45 39 40 68 00', 'info@volvogentofte.dk', 'www.volvo-gentofte.dk'),
  ('Toyota Ballerup', 'Baltorpvej 154, 2750 Ballerup', '+45 44 68 80 80', 'info@toyotaballerup.dk', 'www.toyota-ballerup.dk')
ON CONFLICT DO NOTHING;

-- Final verification queries
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
LIMIT 10;