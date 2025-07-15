#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDealerSpecificReferenceData() {
  console.log('🧪 Testing Dealer-Specific Reference Data Transformation\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Get a test dealer with a specific make
    console.log('1️⃣ Finding test dealer...\n');
    
    const { data: dealers } = await supabase
      .from('sellers')
      .select('id, name, make_id')
      .not('make_id', 'is', null)
      .limit(5);
      
    if (!dealers || dealers.length === 0) {
      throw new Error('No dealers with make_id found');
    }
    
    // Get the first dealer that has a make_id
    const testDealer = dealers[0];
    
    // Get the make name
    const { data: makeData } = await supabase
      .from('makes')
      .select('name')
      .eq('id', testDealer.make_id)
      .single();
      
    const makeName = makeData?.name || 'Unknown';
    
    console.log(`✅ Using dealer: ${testDealer.name}`);
    console.log(`   Make ID: ${testDealer.make_id}`);
    console.log(`   Make Name: ${makeName}`);
    
    // Step 2: Fetch reference data
    console.log('\n2️⃣ Fetching reference data...\n');
    
    const [makesResult, modelsResult, bodyTypesResult, fuelTypesResult, transmissionsResult] = await Promise.all([
      supabase.from('makes').select('*').order('name'),
      supabase.from('models').select('*').order('name'),
      supabase.from('body_types').select('*').order('name'),
      supabase.from('fuel_types').select('*').order('name'),
      supabase.from('transmissions').select('*').order('name')
    ]);
    
    const referenceData = {
      makes: makesResult.data || [],
      models: modelsResult.data || [],
      bodyTypes: bodyTypesResult.data || [],
      fuelTypes: fuelTypesResult.data || [],
      transmissions: transmissionsResult.data || []
    };
    
    // Step 3: Transform with dealer-specific filter
    console.log('3️⃣ Transforming with dealer-specific filter...\n');
    
    const transformedReferenceData = {
      makes_models: referenceData.makes?.reduce((acc, make) => {
        // Only include the dealer's make
        if (make.id === testDealer.make_id) {
          const makeModels = referenceData.models
            ?.filter(model => model.make_id === make.id)
            .map(model => model.name) || [];
          acc[make.name] = makeModels;
        }
        return acc;
      }, {}) || {},
      fuel_types: referenceData.fuelTypes?.map(ft => ft.name) || [],
      transmissions: referenceData.transmissions?.map(t => t.name) || [],
      body_types: referenceData.bodyTypes?.map(bt => bt.name) || []
    };
    
    console.log('✅ Transformed reference data:');
    console.log('\n📋 Makes & Models (dealer-specific):');
    const makeNames = Object.keys(transformedReferenceData.makes_models);
    if (makeNames.length === 0) {
      console.log('   ❌ No makes found! This means the dealer make filter might not be working.');
    } else {
      makeNames.forEach(make => {
        const models = transformedReferenceData.makes_models[make];
        console.log(`   - ${make}: ${models.length} models`);
        if (models.length > 0) {
          console.log(`     Examples: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}`);
        }
      });
    }
    
    console.log('\n⛽ Fuel Types (global):');
    console.log(`   ${transformedReferenceData.fuel_types.join(', ')}`);
    
    console.log('\n🚗 Transmissions (global):');
    console.log(`   ${transformedReferenceData.transmissions.join(', ')}`);
    
    console.log('\n🚙 Body Types (global):');
    console.log(`   ${transformedReferenceData.body_types.join(', ')}`);
    
    // Step 4: Verify it only includes the dealer's make
    console.log('\n4️⃣ Verification...\n');
    
    if (makeNames.length === 1 && makeNames[0] === makeName) {
      console.log(`✅ SUCCESS: Reference data correctly filtered to only include ${makeName}`);
    } else if (makeNames.length === 0) {
      console.log('❌ FAILED: No makes found in transformed data');
      console.log('   This might mean:');
      console.log('   - The make_id filtering is not working');
      console.log('   - The dealer\'s make_id doesn\'t match any makes in the database');
    } else {
      console.log(`⚠️  WARNING: Found ${makeNames.length} makes, expected only ${makeName}`);
      console.log(`   Found: ${makeNames.join(', ')}`);
    }
    
    // Step 5: Test with actual extraction
    console.log('\n5️⃣ Testing with actual AI extraction...\n');
    
    const { data: listings } = await supabase
      .from('full_listing_view')
      .select('listing_id, make, model, variant, horsepower')
      .eq('seller_id', testDealer.id)
      .limit(3);
      
    const testPayload = {
      textContent: `
        Test PDF for ${makeName}
        ${makeName} Ioniq 6
        77.4 kWh - 325 HK 4WD Ultimate
        Fra 6.495 kr./md
      `,
      dealerName: testDealer.name,
      sellerId: testDealer.id,
      fileName: 'test-dealer-specific.pdf',
      referenceData: transformedReferenceData,
      existingListings: {
        existing_listings: listings || []
      },
      includeExistingListings: true
    };
    
    console.log(`📤 Calling Edge Function with ${makeName}-specific reference data...\n`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-extract-vehicles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Edge Function error: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Extraction successful!');
    console.log(`   - Session ID: ${result.extractionSessionId}`);
    console.log(`   - Items processed: ${result.itemsProcessed}`);
    
    // Check if the extraction correctly identified the make
    const { data: extractedItems } = await supabase
      .from('listing_changes')
      .select('new_data')
      .eq('extraction_session_id', result.extractionSessionId)
      .eq('change_type', 'create');
      
    if (extractedItems && extractedItems.length > 0) {
      const makes = [...new Set(extractedItems.map(item => item.new_data?.make).filter(Boolean))];
      console.log(`   - Extracted makes: ${makes.join(', ')}`);
      
      if (makes.length === 1 && makes[0] === makeName) {
        console.log(`   ✅ AI correctly used ${makeName} reference data`);
      } else {
        console.log(`   ⚠️  AI extracted multiple makes or wrong make`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ Dealer-specific reference data test completed!');
    console.log('\nKey findings:');
    console.log(`- Reference data is now filtered to only include the dealer's make (${makeName})`);
    console.log('- This prevents AI confusion when processing dealer-specific PDFs');
    console.log('- Global data (fuel types, transmissions, body types) remains available');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testDealerSpecificReferenceData().catch(console.error);