# Manual Database Seeding Instructions

Since you need test data for your React POC, here are step-by-step instructions to populate your Supabase database.

## Method 1: Supabase SQL Editor (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Navigate to your project
   - Go to **SQL Editor** in the left sidebar

2. **Copy and paste the SQL from `seed-test-cars.sql`**
   - Open the `seed-test-cars.sql` file
   - Copy all content and paste into SQL Editor
   - Click **Run** to execute

## Method 2: Quick API Test Data (Alternative)

If the SQL approach doesn't work, you can manually insert basic data through the Supabase Table Editor:

### Step 1: Insert Makes
Go to **Table Editor** > **makes** table and add:
```
BMW
Mercedes-Benz
Audi
Volkswagen
Tesla
Volvo
Peugeot
Toyota
```

### Step 2: Insert Models
Go to **models** table and add (with corresponding make_id):
```
3 Series (BMW)
C-Class (Mercedes-Benz) 
A4 (Audi)
Golf (Volkswagen)
Model 3 (Tesla)
XC60 (Volvo)
3008 (Peugeot)
RAV4 (Toyota)
```

### Step 3: Insert Body Types
Go to **body_types** table:
```
Sedan
SUV
Stationcar
Hatchback
Coupe
```

### Step 4: Insert Fuel Types
Go to **fuel_types** table:
```
Benzin
Diesel
El
Hybrid
Plug-in Hybrid
```

### Step 5: Insert Transmissions
Go to **transmissions** table:
```
Automatgear
Manuel
CVT
```

### Step 6: Insert Colours
Go to **colours** table:
```
Sort
Hvid
Sølv
Grå
Blå
Rød
```

### Step 7: Create Sample Listings
Go to **listings** table and add a few cars:

**BMW 3 Series Example:**
```json
{
  "make_id": [BMW_ID],
  "model_id": [3_SERIES_ID],
  "body_type_id": [SEDAN_ID],
  "fuel_type_id": [BENZIN_ID], 
  "transmission_id": [AUTOMATGEAR_ID],
  "year": 2023,
  "mileage": 15000,
  "horsepower": 184,
  "drive_type": "Forhjulstræk",
  "variant": "320i Sport Line",
  "seats": 5,
  "co2_emission": 142,
  "co2_tax_half_year": 7100,
  "wltp": "15.8 km/l",
  "description": "BMW 3 Series med Sport Line pakke",
  "image": "https://cdn.bmw.com/content/dam/bmw/common/all-models/3-series/sedan/2022/navigation/bmw-3-series-sedan-lci-modelfinder.png"
}
```

### Step 8: Create Listing Offers
For each listing, add to **listing_offers** table:
```json
{
  "listing_id": [LISTING_ID],
  "colour_id": [HVID_ID],
  "condition": "Ny",
  "listing_status": "Tilgængelig",
  "availability_date": "2025-01-15",
  "security_deposit": 5000,
  "final_payment": 3000,
  "excess_km_rate": 2.5,
  "total_lease_cost": 350000
}
```

### Step 9: Add Lease Pricing
For each listing, add to **lease_pricing** table:
```json
{
  "listing_id": [LISTING_ID],
  "mileage_per_year": 15000,
  "first_payment": 0,
  "period_months": 36,
  "monthly_price": 4500
}
```

## Method 3: Using the Node.js Script

1. **Install dependencies:**
```bash
cd /home/hennedk/projects/leasingborsen
npm install @supabase/supabase-js dotenv
```

2. **Run the seeding script:**
```bash
node run-seed-script.js
```

## Verification

After adding data, test your React POC:

1. **Visit:** http://localhost:5173/
2. **Check if:**
   - Make/Model dropdowns populate
   - Result count updates
   - Latest cars section shows data
   - No console errors

## Expected Result

Your POC should show:
- ✅ Working search filters with real data
- ✅ Car cards displaying in the "Latest Cars" section  
- ✅ Real-time result count in hero banner
- ✅ Danish formatting working correctly

## Troubleshooting

**If dropdowns are empty:**
- Check Supabase RLS (Row Level Security) policies
- Verify table relationships (foreign keys)
- Check browser console for errors

**If no cars display:**
- Ensure all required fields are filled
- Check that `full_listing_view` returns data
- Verify image URLs are accessible

**Database Access Issues:**
- Make sure your `.env` file has correct Supabase credentials
- Check if tables exist in Supabase dashboard
- Verify database connection in React app