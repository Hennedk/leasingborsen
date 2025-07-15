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

async function findRealDuplicates() {
  const sessionId = 'ab47ea71-46ed-4f52-b24c-7f1286110b53';
  const listingId = '5a7ae866-d1f1-4ec3-8ceb-bdffc66c6aa5';
  
  console.log('🔍 Finding REAL duplicates based on actual constraint\n');
  console.log('Unique constraint is on: (listing_id, mileage_per_year, first_payment, period_months)\n');
  
  // Get the extracted data
  const { data: change } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('session_id', sessionId)
    .eq('existing_listing_id', listingId)
    .eq('change_type', 'update')
    .single();
    
  const offers = change.extracted_data.offers || [];
  
  // Group by the ACTUAL constraint columns
  const groupedOffers = {};
  offers.forEach((offer, idx) => {
    const key = `${offer.mileage_per_year || 'null'}-${offer.first_payment || 'null'}-${offer.period_months || 'null'}`;
    if (!groupedOffers[key]) {
      groupedOffers[key] = [];
    }
    groupedOffers[key].push({ idx, offer });
  });
  
  // Find duplicates
  const duplicates = Object.entries(groupedOffers).filter(([key, items]) => items.length > 1);
  
  console.log(`🔄 Duplicate combinations found: ${duplicates.length}\n`);
  
  if (duplicates.length > 0) {
    console.log('DUPLICATE DETAILS:');
    duplicates.forEach(([key, items]) => {
      const [mileage, firstPayment, months] = key.split('-');
      console.log(`\n  Constraint values: Mileage=${mileage}, FirstPayment=${firstPayment}, Months=${months}`);
      console.log(`  Appears ${items.length} times:`);
      
      items.forEach(({ idx, offer }) => {
        console.log(`    [${idx}] Price: ${offer.monthly_price} kr/md`);
      });
      
      // This is the problem - different prices for same constraint values!
      const prices = items.map(i => i.offer.monthly_price);
      if (new Set(prices).size > 1) {
        console.log(`  ⚠️  PROBLEM: Different prices (${prices.join(', ')}) for same constraint!`);
      }
    });
  }
  
  // Show first few offers to understand the pattern
  console.log('\n📋 First 5 extracted offers:');
  offers.slice(0, 5).forEach((offer, idx) => {
    console.log(`  [${idx}] ${offer.monthly_price} kr/md, ${offer.period_months || '-'} mo, ${offer.mileage_per_year || '-'} km, first: ${offer.first_payment || '-'}`);
  });
}

findRealDuplicates().catch(console.error);