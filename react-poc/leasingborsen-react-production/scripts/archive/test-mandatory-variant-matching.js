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

async function testMandatoryVariantMatching() {
  console.log('🧪 Testing Mandatory Variant Matching Rules\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Get a test dealer with existing listings
    console.log('1️⃣ Finding test dealer with existing listings...\n');
    
    const { data: dealers } = await supabase
      .from('sellers')
      .select('id, name, make_id')
      .not('make_id', 'is', null)
      .limit(1);
      
    if (!dealers || dealers.length === 0) {
      throw new Error('No dealers with make_id found');
    }
    
    const testDealer = dealers[0];
    
    // Get dealer's make name
    const { data: makeData } = await supabase
      .from('makes')
      .select('name')
      .eq('id', testDealer.make_id)
      .single();
      
    const makeName = makeData?.name || 'Unknown';
    
    console.log(`✅ Using dealer: ${testDealer.name} (${makeName})`);
    
    // Step 2: Get existing listings for the dealer
    console.log('\n2️⃣ Fetching existing listings...\n');
    
    const { data: existingListings } = await supabase
      .from('full_listing_view')
      .select('listing_id, make, model, variant, horsepower, fuel_type, transmission')
      .eq('seller_id', testDealer.id)
      .limit(5);
      
    if (!existingListings || existingListings.length === 0) {
      console.log('❌ No existing listings found for dealer');
      return;
    }
    
    console.log('📋 Existing listings:');
    existingListings.forEach(listing => {
      console.log(`   - ${listing.make} ${listing.model} "${listing.variant}" (${listing.horsepower} HP)`);
    });
    
    // Step 3: Create test scenarios based on mandatory rules
    console.log('\n3️⃣ Testing variant matching scenarios...\n');
    
    const testScenarios = [];
    
    // Test Case 1: Within ±5 HP (should match)
    if (existingListings[0]) {
      const existing = existingListings[0];
      testScenarios.push({
        name: 'Step 1: ±5 HP Match',
        input: {
          make: existing.make,
          model: existing.model,
          hp: existing.horsepower + 3, // Within ±5 HP
          variant: `${existing.model} ${existing.horsepower + 3} HP Automatic` // Different name
        },
        expected: existing.variant, // Should use exact existing variant
        rule: 'Step 1: Match existing within ±5 HP'
      });
    }
    
    // Test Case 2: >10 HP difference (should create new)
    if (existingListings[0]) {
      const existing = existingListings[0];
      testScenarios.push({
        name: 'Step 2: >10 HP New Variant',
        input: {
          make: existing.make,
          model: existing.model,
          hp: existing.horsepower + 15, // >10 HP difference
          variant: `Performance ${existing.horsepower + 15} HK`
        },
        expected: `Performance ${existing.horsepower + 15} HK`,
        rule: 'Step 2: Create new for >10 HP difference'
      });
    }
    
    // Test Case 3: Equipment differentiation
    if (existingListings[0]) {
      const existing = existingListings[0];
      testScenarios.push({
        name: 'Step 3: Equipment Package',
        input: {
          make: existing.make,
          model: existing.model,
          hp: existing.horsepower, // Same HP
          variant: `${existing.variant} – 20" alufælge, soltag, BOSE`
        },
        expected: `${existing.variant} – 20" alufælge, soltag, BOSE`,
        rule: 'Step 3: Equipment differentiation with " – " separator'
      });
    }
    
    // Step 4: Test with actual AI extraction
    console.log('\n4️⃣ Testing with AI extraction...\n');
    
    // Prepare test PDF content
    const testPdfContent = testScenarios.map(scenario => `
${scenario.input.make} ${scenario.input.model}
${scenario.input.hp} HK
Fra 5.995 kr./md
Førstegangsydelse: 35.000 kr
36 måneder, 15.000 km/år
`).join('\n\n');
    
    // Get reference data
    const { data: referenceData } = await supabase
      .from('makes')
      .select(`
        id,
        name,
        models!inner(
          id,
          name
        )
      `)
      .eq('id', testDealer.make_id);
      
    // Transform reference data
    const transformedReferenceData = {
      makes_models: {
        [makeName]: referenceData?.[0]?.models?.map(m => m.name) || []
      },
      fuel_types: ['Electric', 'Petrol', 'Diesel', 'Hybrid - Petrol'],
      transmissions: ['Automatic', 'Manual'],
      body_types: ['SUV', 'Sedan', 'Hatchback', 'Stationcar']
    };
    
    console.log('📤 Calling Edge Function with test scenarios...\n');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-extract-vehicles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        textContent: testPdfContent,
        dealerName: testDealer.name,
        sellerId: testDealer.id,
        fileName: 'test-mandatory-matching.pdf',
        referenceData: transformedReferenceData,
        existingListings: {
          existing_listings: existingListings
        },
        includeExistingListings: true
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Edge Function error: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Extraction completed!');
    console.log(`   - Session ID: ${result.extractionSessionId}`);
    console.log(`   - Items processed: ${result.itemsProcessed}`);
    
    // Check extraction results
    const { data: extractedChanges } = await supabase
      .from('listing_changes')
      .select('*')
      .eq('extraction_session_id', result.extractionSessionId);
      
    console.log('\n5️⃣ Verifying variant matching results...\n');
    
    if (extractedChanges && extractedChanges.length > 0) {
      extractedChanges.forEach((change, idx) => {
        const scenario = testScenarios[idx];
        if (scenario) {
          const extractedVariant = change.new_data?.variant || change.extracted_data?.variant;
          const passed = extractedVariant === scenario.expected;
          
          console.log(`Test Case ${idx + 1}: ${scenario.name}`);
          console.log(`   Rule: ${scenario.rule}`);
          console.log(`   Input HP: ${scenario.input.hp}`);
          console.log(`   Expected: "${scenario.expected}"`);
          console.log(`   Got: "${extractedVariant}"`);
          console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
          console.log('');
        }
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ Mandatory variant matching test completed!');
    console.log('\nKey validation points:');
    console.log('- Step 1: ±5 HP matches use exact existing variant');
    console.log('- Step 2: >10 HP creates new variant');
    console.log('- Step 3: Equipment uses " – " separator');
    console.log('- Step 4: Naming follows dealer patterns');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testMandatoryVariantMatching().catch(console.error);