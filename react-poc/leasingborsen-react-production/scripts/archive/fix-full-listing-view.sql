-- Fix full_listing_view to include proper joins with reference tables
-- Run this SQL in Supabase Dashboard: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/sql

CREATE OR REPLACE VIEW full_listing_view AS
SELECT 
  l.id,
  l.created_at,
  l.updated_at,
  l.seller_id,
  l.make_id,
  l.model_id,
  l.variant,
  l.year,
  l.image,
  l.mileage,
  l.body_type_id,
  l.fuel_type_id,
  l.transmission_id,
  l.horsepower,
  l.kw,
  l.wltp,
  l.consumption_l_100km,
  l.consumption_kwh_100km,
  l.seats,
  l.doors,
  l.co2_emission,
  l.co2_tax_half_year,
  l.description,
  l.drive_type,
  l.extraction_method,
  l.extraction_timestamp,
  l.processed_image_grid,
  l.processed_image_detail,
  l.images,
  l.retail_price,
  l.lease_score,
  l.lease_score_calculated_at,
  l.lease_score_breakdown,
  -- Lease pricing fields
  lp.monthly_price,
  lp.first_payment,
  lp.period_months,
  lp.mileage_per_year,
  -- Seller information
  s.name as seller_name,
  s.phone as seller_phone,
  s.address as seller_location,
  -- Reference data with human-readable names
  m.name as make,
  md.name as model,
  bt.name as body_type,
  ft.name as fuel_type,
  t.name as transmission
FROM listings l
LEFT JOIN lease_pricing lp ON l.id = lp.listing_id
LEFT JOIN sellers s ON l.seller_id = s.id
LEFT JOIN makes m ON l.make_id = m.id
LEFT JOIN models md ON l.model_id = md.id
LEFT JOIN body_types bt ON l.body_type_id = bt.id
LEFT JOIN fuel_types ft ON l.fuel_type_id = ft.id
LEFT JOIN transmissions t ON l.transmission_id = t.id;

COMMENT ON VIEW full_listing_view IS 'Complete denormalized view of listings with lease pricing, seller information, and reference data names, including lease score fields';

SELECT 'Full listing view fixed with proper reference data joins' as status;