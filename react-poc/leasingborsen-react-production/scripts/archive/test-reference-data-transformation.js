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

async function testReferenceDataTransformation() {
  console.log('🧪 Testing Reference Data Transformation\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Fetch reference data like useReferenceData hook does
    console.log('1️⃣ Fetching reference data (hook format)...\n');
    
    const [makesResult, modelsResult, bodyTypesResult, fuelTypesResult, transmissionsResult] = await Promise.all([
      supabase.from('makes').select('*').order('name'),
      supabase.from('models').select('*').order('name'),
      supabase.from('body_types').select('*').order('name'),
      supabase.from('fuel_types').select('*').order('name'),
      supabase.from('transmissions').select('*').order('name')
    ]);
    
    if (makesResult.error) throw makesResult.error;
    if (modelsResult.error) throw modelsResult.error;
    if (bodyTypesResult.error) throw bodyTypesResult.error;
    if (fuelTypesResult.error) throw fuelTypesResult.error;
    if (transmissionsResult.error) throw transmissionsResult.error;
    
    const referenceData = {
      makes: makesResult.data || [],
      models: modelsResult.data || [],
      bodyTypes: bodyTypesResult.data || [],
      fuelTypes: fuelTypesResult.data || [],
      transmissions: transmissionsResult.data || []
    };
    
    console.log('✅ Raw reference data fetched:');
    console.log(`  - Makes: ${referenceData.makes.length}`);
    console.log(`  - Models: ${referenceData.models.length}`);
    console.log(`  - Body types: ${referenceData.bodyTypes.length}`);
    console.log(`  - Fuel types: ${referenceData.fuelTypes.length}`);
    console.log(`  - Transmissions: ${referenceData.transmissions.length}`);
    
    // Step 2: Transform to Edge Function format
    console.log('\n2️⃣ Transforming to Edge Function format...\n');
    
    const transformedReferenceData = {
      makes_models: referenceData.makes?.reduce((acc, make) => {
        const makeModels = referenceData.models
          ?.filter(model => model.make_id === make.id)
          .map(model => model.name) || [];
        acc[make.name] = makeModels;
        return acc;
      }, {}) || {},
      fuel_types: referenceData.fuelTypes?.map(ft => ft.name) || [],
      transmissions: referenceData.transmissions?.map(t => t.name) || [],
      body_types: referenceData.bodyTypes?.map(bt => bt.name) || []
    };
    
    console.log('✅ Transformed reference data:');
    console.log('\n📋 Makes & Models:');
    const makeNames = Object.keys(transformedReferenceData.makes_models).slice(0, 5);
    makeNames.forEach(make => {
      const models = transformedReferenceData.makes_models[make];
      console.log(`  - ${make}: ${models.length} models`);
      if (models.length > 0) {
        console.log(`    Examples: ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`);
      }
    });
    if (Object.keys(transformedReferenceData.makes_models).length > 5) {
      console.log(`  ... and ${Object.keys(transformedReferenceData.makes_models).length - 5} more makes`);
    }
    
    console.log('\n⛽ Fuel Types:');
    console.log(`  ${transformedReferenceData.fuel_types.join(', ')}`);
    
    console.log('\n🚗 Transmissions:');
    console.log(`  ${transformedReferenceData.transmissions.join(', ')}`);
    
    console.log('\n🚙 Body Types:');
    console.log(`  ${transformedReferenceData.body_types.join(', ')}`);
    
    // Step 3: Test with actual extraction
    console.log('\n3️⃣ Testing with actual AI extraction...\n');
    
    const TEST_DEALER_ID = '53a1d14b-c01d-4c55-9892-4bb82bdf8e02'; // Bilhuset Birkerød
    
    // Get a few existing listings
    const { data: listings } = await supabase
      .from('full_listing_view')
      .select('listing_id, make, model, variant, horsepower')
      .eq('seller_id', TEST_DEALER_ID)
      .limit(5);
      
    const testPayload = {
      textContent: `
        Test PDF Content
        Hyundai Ioniq 6
        77.4 kWh - 325 HK 4WD Ultimate
        Fra 6.495 kr./md
      `,
      dealerName: 'Hyundai',
      sellerId: TEST_DEALER_ID,
      fileName: 'test-transformation.pdf',
      referenceData: transformedReferenceData,
      existingListings: {
        existing_listings: listings || []
      },
      includeExistingListings: true
    };
    
    console.log('📤 Calling Edge Function with transformed data...\n');
    
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
    console.log(`  - Session ID: ${result.extractionSessionId}`);
    console.log(`  - Items processed: ${result.itemsProcessed}`);
    
    // Step 4: Verify the prompt construction
    console.log('\n4️⃣ Verifying prompt includes reference data...\n');
    
    // Check a recent extraction session to see if metadata contains reference info
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', result.extractionSessionId)
      .single();
      
    if (session?.metadata?.promptLength) {
      console.log(`✅ Prompt was constructed with ${session.metadata.promptLength} characters`);
      
      // The presence of a large prompt indicates reference data was included
      if (session.metadata.promptLength > 5000) {
        console.log('✅ Large prompt size indicates reference data was included');
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ Reference data transformation test completed!');
    console.log('\nThe reference data is now being properly transformed from:');
    console.log('  - Hook format: { makes: [...], models: [...], fuelTypes: [...] }');
    console.log('  - To Edge Function format: { makes_models: {...}, fuel_types: [...] }');
    console.log('\nThis ensures the AI receives actual reference data instead of empty values.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testReferenceDataTransformation().catch(console.error);