#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Minimal test data
const testData = {
  text: `
    HYUNDAI TUCSON
    Essential 217 HK
    Automatgear
    WLTP: 625 km
    
    Privatleasing:
    36 måneder / 15.000 km/år
    Førstegangsydelse: 35.000 kr
    Ydelse pr. måned: 6.495 kr
  `,
  dealerName: 'Test Hyundai',
  sellerId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
  fileName: 'test-hyundai.pdf'
};

async function test() {
  console.log('🚀 Testing AI Vehicle Extraction...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-extract-vehicles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`⏱️  Response Time: ${duration}ms`);
    console.log(`📍 Response Headers:`);
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });
    
    const responseText = await response.text();
    console.log('\n📄 Raw Response:');
    console.log(responseText);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ Parsed Result:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.summary?.apiVersion) {
          console.log(`\n🎯 API Version Used: ${result.summary.apiVersion}`);
          if (result.summary.apiVersion === 'responses-api') {
            console.log('✅ SUCCESS: Responses API is working!');
          } else {
            console.log('⚠️  WARNING: Fell back to Chat Completions API');
          }
        }
      } catch (e) {
        console.error('❌ Failed to parse JSON:', e.message);
      }
    } else {
      console.error(`\n❌ Request failed with status ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Request error:', error);
  }
  
  console.log('\n💡 To check Edge Function logs on Supabase Dashboard:');
  console.log(`   ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/functions/ai-extract-vehicles/logs`);
}

test().catch(console.error);