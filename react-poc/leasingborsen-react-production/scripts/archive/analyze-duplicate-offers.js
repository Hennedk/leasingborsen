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

async function analyzeDuplicateOffers() {
  const sessionId = 'ab47ea71-46ed-4f52-b24c-7f1286110b53';
  const listingId = '5a7ae866-d1f1-4ec3-8ceb-bdffc66c6aa5';
  
  console.log('🔍 Analyzing duplicate pricing issues\n');
  
  // 1. Get the extracted data
  const { data: change } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('session_id', sessionId)
    .eq('existing_listing_id', listingId)
    .eq('change_type', 'update')
    .single();
    
  if (!change) {
    console.error('No change found');
    return;
  }
  
  const offers = change.extracted_data.offers || [];
  console.log(`📊 Total extracted offers: ${offers.length}`);
  
  // 2. Group by unique constraint columns
  const groupedOffers = {};
  offers.forEach((offer, idx) => {
    const key = `${offer.monthly_price}-${offer.period_months || 'null'}-${offer.mileage_per_year || 'null'}`;
    if (!groupedOffers[key]) {
      groupedOffers[key] = [];
    }
    groupedOffers[key].push({ idx, offer });
  });
  
  // 3. Find duplicates
  const duplicates = Object.entries(groupedOffers).filter(([key, items]) => items.length > 1);
  
  console.log(`\n🔄 Duplicate combinations found: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\nDuplicate details:');
    duplicates.forEach(([key, items]) => {
      const [price, months, mileage] = key.split('-');
      console.log(`\n  Price: ${price} kr/md, Months: ${months}, Mileage: ${mileage} km/year`);
      console.log(`  Appears ${items.length} times at indices: ${items.map(i => i.idx).join(', ')}`);
      
      // Show first_payment differences
      const firstPayments = items.map(i => i.offer.first_payment || 'null');
      if (new Set(firstPayments).size > 1) {
        console.log(`  ⚠️  Different first payments: ${firstPayments.join(', ')}`);
      }
    });
  }
  
  // 4. Get current pricing from database
  console.log('\n📋 Current pricing in database:');
  const { data: currentPricing } = await supabase
    .from('lease_pricing')
    .select('monthly_price, period_months, mileage_per_year, first_payment')
    .eq('listing_id', listingId)
    .order('monthly_price');
    
  if (currentPricing) {
    currentPricing.forEach(p => {
      console.log(`  ${p.monthly_price} kr/md, ${p.period_months || '-'} months, ${p.mileage_per_year || '-'} km/year, first: ${p.first_payment || '-'}`);
    });
  }
  
  // 5. Find which extracted offers would conflict
  console.log('\n⚠️  Extracted offers that would conflict with existing:');
  let conflicts = 0;
  
  offers.forEach((offer, idx) => {
    const existing = currentPricing?.find(p => 
      p.monthly_price == offer.monthly_price &&
      (p.period_months || null) == (offer.period_months || null) &&
      (p.mileage_per_year || null) == (offer.mileage_per_year || null)
    );
    
    if (existing) {
      conflicts++;
      console.log(`  [${idx}] ${offer.monthly_price} kr/md, ${offer.period_months || '-'} months, ${offer.mileage_per_year || '-'} km/year`);
      if (existing.first_payment != offer.first_payment) {
        console.log(`       First payment differs: DB has ${existing.first_payment || 'null'}, extracted has ${offer.first_payment || 'null'}`);
      }
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Total extracted offers: ${offers.length}`);
  console.log(`  - Duplicate combinations in extracted data: ${duplicates.length}`);
  console.log(`  - Conflicts with existing DB data: ${conflicts}`);
  
  // 6. Show deduplication strategy
  console.log('\n💡 Deduplication strategy:');
  console.log('  The function deletes ALL existing pricing before inserting new ones');
  console.log('  But if extracted data has duplicates, the INSERT will fail on the second duplicate');
  console.log('  Solutions:');
  console.log('  1. Deduplicate extracted offers before inserting');
  console.log('  2. Use INSERT ... ON CONFLICT DO UPDATE to handle duplicates');
  console.log('  3. Fix the extraction to not produce duplicates');
}

analyzeDuplicateOffers().catch(console.error);