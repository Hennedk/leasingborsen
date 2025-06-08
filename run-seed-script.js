#!/usr/bin/env node

/**
 * Script to populate Supabase database with realistic Danish car leasing test data
 * 
 * Usage: node run-seed-script.js
 * 
 * This script will:
 * 1. Connect to your Supabase database
 * 2. Create the full_listing_view if it doesn't exist
 * 3. Populate reference tables (makes, models, body_types, etc.)
 * 4. Create 10 realistic car listings
 * 5. Generate multiple lease pricing options for each car
 * 6. Add Danish dealership information
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // You'll need to add this
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Use service key for admin operations, fallback to anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function seedDatabase() {
  console.log('🚀 Starting database seeding...');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(path.join(__dirname, 'seed-test-cars.sql'), 'utf8');
    
    // Split into individual statements (basic splitting)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute statements one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('select')) {
        // For SELECT statements, log the results
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            console.log(`⚠️  Query ${i + 1}: ${error.message}`);
          } else {
            console.log(`✅ Query ${i + 1} result:`, data);
          }
        } catch (err) {
          console.log(`⚠️  Query ${i + 1}: ${err.message}`);
        }
      } else {
        // For other statements, just execute
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            console.log(`❌ Statement ${i + 1} failed: ${error.message}`);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Statement ${i + 1} error: ${err.message}`);
        }
      }
    }
    
    // Verify the data was created
    console.log('\n🔍 Verifying data creation...');
    
    const { data: listings, error: listingsError } = await supabase
      .from('full_listing_view')
      .select('make, model, monthly_price, fuel_type')
      .limit(5);
    
    if (listingsError) {
      console.error('❌ Error fetching verification data:', listingsError);
    } else {
      console.log('✅ Sample listings created:');
      listings.forEach(car => {
        console.log(`   ${car.make} ${car.model} - ${car.monthly_price} kr/måned (${car.fuel_type})`);
      });
    }
    
    console.log('\n🎉 Database seeding completed!');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
}

// Alternative approach using individual Supabase API calls
async function seedDatabaseWithAPI() {
  console.log('🚀 Starting API-based database seeding...');
  
  try {
    // Insert makes
    const makes = [
      { name: 'BMW' },
      { name: 'Mercedes-Benz' },
      { name: 'Audi' },
      { name: 'Volkswagen' },
      { name: 'Tesla' },
      { name: 'Volvo' },
      { name: 'Peugeot' },
      { name: 'Toyota' }
    ];
    
    console.log('📝 Inserting car makes...');
    const { data: makesData, error: makesError } = await supabase
      .from('makes')
      .upsert(makes, { onConflict: 'name' })
      .select();
    
    if (makesError) {
      console.error('❌ Error inserting makes:', makesError);
      return;
    }
    
    console.log(`✅ Inserted ${makesData.length} makes`);
    
    // Insert body types
    const bodyTypes = [
      { name: 'Sedan' },
      { name: 'SUV' },
      { name: 'Stationcar' },
      { name: 'Hatchback' },
      { name: 'Coupe' }
    ];
    
    console.log('📝 Inserting body types...');
    const { error: bodyTypesError } = await supabase
      .from('body_types')
      .upsert(bodyTypes, { onConflict: 'name' });
    
    if (bodyTypesError) {
      console.error('❌ Error inserting body types:', bodyTypesError);
      return;
    }
    
    // Insert fuel types
    const fuelTypes = [
      { name: 'Benzin' },
      { name: 'Diesel' },
      { name: 'El' },
      { name: 'Hybrid' },
      { name: 'Plug-in Hybrid' }
    ];
    
    console.log('📝 Inserting fuel types...');
    const { error: fuelTypesError } = await supabase
      .from('fuel_types')
      .upsert(fuelTypes, { onConflict: 'name' });
    
    if (fuelTypesError) {
      console.error('❌ Error inserting fuel types:', fuelTypesError);
      return;
    }
    
    // Insert transmissions
    const transmissions = [
      { name: 'Automatgear' },
      { name: 'Manuel' },
      { name: 'CVT' }
    ];
    
    console.log('📝 Inserting transmissions...');
    const { error: transmissionsError } = await supabase
      .from('transmissions')
      .upsert(transmissions, { onConflict: 'name' });
    
    if (transmissionsError) {
      console.error('❌ Error inserting transmissions:', transmissionsError);
      return;
    }
    
    console.log('✅ Reference data inserted successfully!');
    console.log('📝 You can now use the Supabase dashboard to add models and complete listings');
    
  } catch (error) {
    console.error('❌ Error during API seeding:', error);
  }
}

// Check if we have the service key, otherwise use API approach
if (process.env.SUPABASE_SERVICE_KEY) {
  seedDatabase();
} else {
  console.log('ℹ️  Service key not found, using API-based approach...');
  console.log('ℹ️  Add SUPABASE_SERVICE_KEY to .env for full SQL execution');
  seedDatabaseWithAPI();
}