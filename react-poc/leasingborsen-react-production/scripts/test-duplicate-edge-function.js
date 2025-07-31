#!/usr/bin/env node

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function testDuplicateEdgeFunction() {
  const listingId = process.argv[2];
  
  if (!listingId) {
    console.error('Usage: node test-duplicate-edge-function.js <listing-id>');
    process.exit(1);
  }

  console.log('Testing duplicate Edge Function with listing ID:', listingId);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-listing-operations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'duplicate',
        listingId: listingId
      })
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('✅ Duplication successful! New listing ID:', data.listingId);
      } else {
        console.log('❌ Duplication failed:', data.error);
      }
    } catch (parseError) {
      console.log('Raw response:', responseText);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testDuplicateEdgeFunction();