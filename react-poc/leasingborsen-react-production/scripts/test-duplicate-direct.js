#!/usr/bin/env node

// Test script to debug duplicate Edge Function invocation
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function testDuplicate() {
  const listingId = process.argv[2];
  
  if (!listingId) {
    console.error('Usage: node test-duplicate-direct.js <listing-id>');
    console.error('Example: node test-duplicate-direct.js 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }

  console.log('Testing duplicate operation with listing ID:', listingId);
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Edge Function URL:', `${SUPABASE_URL}/functions/v1/admin-listing-operations`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-listing-operations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        operation: 'duplicate',
        listingId: listingId
      })
    });

    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('\nParsed response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('\n✅ Duplication successful!');
        console.log('New listing ID:', data.listingId);
      } else {
        console.log('\n❌ Duplication failed');
        console.log('Error:', data.error);
        if (data.validationErrors) {
          console.log('Validation errors:', data.validationErrors);
        }
      }
    } catch (parseError) {
      console.log('Failed to parse response as JSON');
      console.log('Raw response:', responseText);
    }
  } catch (error) {
    console.error('\nRequest failed:', error);
  }
}

testDuplicate();