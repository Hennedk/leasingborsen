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

async function checkDuplicateOffers() {
  // Get the extracted offers to check for duplicates
  const { data: change } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('id', 'c108a388-dce3-4cac-9ba8-f8b1d8a63065')
    .single();

  const offers = change.extracted_data.offers;

  // Check for duplicate combinations
  const combinations = offers.map((o, idx) => ({
    index: idx,
    price: o.monthly_price,
    months: o.period_months,
    mileage: o.mileage_per_year,
    key: `${o.monthly_price}-${o.period_months}-${o.mileage_per_year}`
  }));

  const uniqueKeys = new Set(combinations.map(c => c.key));

  console.log(`Total offers: ${offers.length}`);
  console.log(`Unique combinations: ${uniqueKeys.size}`);
  console.log(`Has duplicates: ${offers.length !== uniqueKeys.size ? 'YES' : 'NO'}`);

  // Find duplicates
  const counts = {};
  combinations.forEach(c => {
    if (!counts[c.key]) counts[c.key] = [];
    counts[c.key].push(c.index);
  });

  const duplicates = Object.entries(counts).filter(([key, indices]) => indices.length > 1);
  if (duplicates.length > 0) {
    console.log('\nDuplicate combinations found:');
    duplicates.forEach(([key, indices]) => {
      const [price, months, mileage] = key.split('-');
      console.log(`\n  ${price} kr/md, ${months} months, ${mileage} km/year`);
      console.log(`  Appears at indices: ${indices.join(', ')}`);
      
      // Show the full offers
      indices.forEach(idx => {
        const offer = offers[idx];
        console.log(`    [${idx}] First payment: ${offer.first_payment || 'null'}`);
      });
    });
  } else {
    console.log('\nNo duplicate combinations found - all offers are unique');
  }

  // Show unique constraint columns
  console.log('\n📋 Unique constraint on lease_pricing:');
  console.log('  (listing_id, monthly_price, period_months, mileage_per_year)');
}

checkDuplicateOffers().catch(console.error);