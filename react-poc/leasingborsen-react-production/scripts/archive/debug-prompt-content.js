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

async function debugPromptContent() {
  console.log('🔍 Debugging What Should Be Sent to AI\n');
  
  const dealerId = '53a1d14b-c01d-4c55-9892-4bb82bdf8e02'; // Hyundai dealer
  
  // 1. Check reference data
  console.log('1️⃣ Reference Data Check:\n');
  
  const { data: makes } = await supabase
    .from('makes')
    .select('id, name')
    .limit(5);
    
  console.log(`Makes in database: ${makes?.length || 0}`);
  if (makes && makes.length > 0) {
    console.log('Sample makes:', makes.slice(0, 3).map(m => m.name).join(', '));
  }
  
  // 2. Check existing listings for this dealer
  console.log('\n2️⃣ Existing Listings Check:\n');
  
  const { data: listings } = await supabase
    .from('full_listing_view')
    .select('make, model, variant, horsepower')
    .eq('seller_id', dealerId)
    .limit(10);
    
  console.log(`Existing listings for dealer: ${listings?.length || 0}`);
  if (listings && listings.length > 0) {
    console.log('\nSample existing listings:');
    listings.slice(0, 5).forEach(l => {
      console.log(`- ${l.make} ${l.model} ${l.variant}`);
    });
  }
  
  // 3. Check what the Edge Function receives
  console.log('\n3️⃣ What Edge Function Should Receive:\n');
  
  console.log('When calling ai-extract-vehicles, the request should include:');
  console.log('```');
  console.log(JSON.stringify({
    text: "PDF content here...",
    dealerName: "Hyundai",
    sellerId: dealerId,
    fileName: "Ionic 6",
    referenceData: {
      makes_models: {"Hyundai": ["Ioniq 5", "Ioniq 6", "Kona", "Tucson"]},
      fuel_types: ["Electric", "Hybrid-Petrol", "Petrol", "Diesel"],
      transmissions: ["Automatic", "Manual"],
      body_types: ["SUV", "Hatchback", "Sedan", "Stationcar"]
    },
    existingListings: {
      existing_listings: listings || []
    }
  }, null, 2));
  console.log('```');
  
  // 4. Debug the actual prompt construction
  console.log('\n4️⃣ Expected AI Prompt Structure:\n');
  
  const sampleContext = `Dealer: Hyundai
File: Ionic 6

DATABASE REFERENCE DATA FOR CONTEXT:
MAKES & MODELS: ${JSON.stringify({"Hyundai": ["Ioniq 5", "Ioniq 6", "Kona"]})}
FUEL TYPES: ["Electric", "Hybrid-Petrol", "Petrol", "Diesel"]
TRANSMISSIONS: ["Automatic", "Manual"]
BODY TYPES: ["SUV", "Hatchback", "Sedan", "Stationcar"]

🚨 CRITICAL: EXISTING DEALER LISTINGS - YOU MUST MATCH THESE EXACTLY 🚨
${JSON.stringify(listings?.slice(0, 3) || [], null, 2)}

PDF Text:
[PDF content would go here...]`;

  console.log('The AI should receive a prompt like this:');
  console.log('---');
  console.log(sampleContext.substring(0, 800) + '...');
  console.log('---');
  
  // 5. Check if the issue is in the client-side call
  console.log('\n5️⃣ Possible Issues:\n');
  console.log('❓ The Edge Function might not be receiving referenceData and existingListings');
  console.log('❓ The client calling the Edge Function might not be sending this data');
  console.log('❓ The Edge Function might be receiving but not using the data');
  
  console.log('\n💡 To verify, check:');
  console.log('1. The client code that calls the Edge Function');
  console.log('2. Edge Function logs to see what it receives');
  console.log('3. The actual OpenAI prompt to see what was sent');
}

debugPromptContent().catch(console.error);