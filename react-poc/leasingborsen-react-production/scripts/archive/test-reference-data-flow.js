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

async function testReferenceDataFlow() {
  console.log('🧪 Testing Reference Data and Existing Listings Flow\n');
  console.log('=' .repeat(50));
  console.log('\n');
  
  const TEST_DEALER_ID = '53a1d14b-c01d-4c55-9892-4bb82bdf8e02'; // Bilhuset Birkerød (Hyundai)
  
  try {
    // Step 1: Fetch seller's existing listings (like the hook does)
    console.log('1️⃣ Fetching dealer listings...');
    
    const { data: listings, error: listingsError } = await supabase
      .from('full_listing_view')
      .select('listing_id, make, model, variant, horsepower')
      .eq('seller_id', TEST_DEALER_ID)
      .order('make, model, variant')
      .limit(200);
      
    if (listingsError) throw listingsError;
    
    // Deduplicate
    const uniqueListings = new Map();
    listings?.forEach(listing => {
      if (listing.listing_id && !uniqueListings.has(listing.listing_id)) {
        uniqueListings.set(listing.listing_id, listing);
      }
    });
    
    const dealerListings = Array.from(uniqueListings.values());
    console.log(`✅ Found ${dealerListings.length} unique listings`);
    console.log('Sample listings:');
    dealerListings.slice(0, 3).forEach(l => {
      console.log(`  - ${l.make} ${l.model} ${l.variant} (${l.horsepower} HP)`);
    });
    
    // Step 2: Fetch reference data
    console.log('\n2️⃣ Fetching reference data...');
    
    const [makesResult, fuelTypesResult, transmissionsResult, bodyTypesResult] = await Promise.all([
      supabase.from('makes').select('id, name').order('name'),
      supabase.from('fuel_types').select('id, name').order('name'),
      supabase.from('transmissions').select('id, name').order('name'),
      supabase.from('body_types').select('id, name').order('name')
    ]);
    
    const referenceData = {
      makes_models: {}, // Would need to be populated properly
      fuel_types: fuelTypesResult.data?.map(f => f.name) || [],
      transmissions: transmissionsResult.data?.map(t => t.name) || [],
      body_types: bodyTypesResult.data?.map(b => b.name) || []
    };
    
    console.log('✅ Reference data loaded:');
    console.log(`  - Fuel types: ${referenceData.fuel_types.length}`);
    console.log(`  - Transmissions: ${referenceData.transmissions.length}`);
    console.log(`  - Body types: ${referenceData.body_types.length}`);
    
    // Step 3: Prepare test payload
    console.log('\n3️⃣ Preparing test extraction payload...');
    
    const testPayload = {
      textContent: `
        Hyundai Ioniq 6
        77.4 kWh - 325 HK 4WD Ultimate
        Fra 6.495 kr./md
        
        Hyundai Ioniq 6
        77.4 kWh - 325 HK 4WD Ultimate - 20" alufælge, soltag
        Fra 6.795 kr./md
      `,
      dealerName: 'Hyundai',
      sellerId: TEST_DEALER_ID,
      fileName: 'test-extraction.pdf',
      referenceData: referenceData,
      existingListings: {
        existing_listings: dealerListings
      },
      includeExistingListings: true
    };
    
    const payloadSize = JSON.stringify(testPayload).length;
    console.log(`✅ Payload prepared (${(payloadSize / 1024).toFixed(2)}KB)`);
    
    // Step 4: Call Edge Function
    console.log('\n4️⃣ Calling AI extraction Edge Function...');
    
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
    console.log(`  - API version: ${result.summary?.apiVersion || 'unknown'}`);
    
    // Step 5: Check if reference data was used
    console.log('\n5️⃣ Verifying reference data usage...');
    
    if (result.summary?.inferenceRate !== undefined) {
      const inferenceRate = (result.summary.inferenceRate * 100).toFixed(1);
      console.log(`  - Inference rate: ${inferenceRate}%`);
      
      if (result.summary.inferenceRate < 0.5) {
        console.log('  ✅ Good! Low inference rate means existing data was used');
      } else {
        console.log('  ⚠️  High inference rate - might indicate reference data not being used');
      }
    }
    
    // Step 6: Check extraction session
    console.log('\n6️⃣ Checking extraction session details...');
    
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', result.extractionSessionId)
      .single();
      
    if (session) {
      console.log(`  - Status: ${session.status}`);
      console.log(`  - Total extracted: ${session.total_extracted}`);
      console.log(`  - Matched: ${session.total_matched}`);
      console.log(`  - API version: ${session.api_version}`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Test completed successfully!');
    console.log('Reference data and existing listings are being sent to AI.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testReferenceDataFlow().catch(console.error);