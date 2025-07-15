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

async function checkUpdateWasApplied() {
  const listingId = '16bfb19a-c9a1-48b4-ad2d-a51f055c8d73';
  const updateChangeId = 'c108a388-dce3-4cac-9ba8-f8b1d8a63065';
  
  console.log('🔍 Checking if UPDATE was applied to listing:', listingId);
  
  // Get the change details
  const { data: change } = await supabase
    .from('extraction_listing_changes')
    .select('*')
    .eq('id', updateChangeId)
    .single();
    
  if (change) {
    console.log('\n📋 Change Details:');
    console.log('  Status:', change.change_status);
    console.log('  Summary:', change.change_summary);
    console.log('  Field Changes:', change.field_changes);
    
    if (change.extracted_data?.offers) {
      console.log('\n💰 New Offers in Extracted Data:');
      change.extracted_data.offers.slice(0, 3).forEach((offer, idx) => {
        console.log(`  ${idx + 1}. ${offer.monthly_price} kr/md, ${offer.period_months} months, ${offer.mileage_per_year} km/year`);
      });
    }
  }
  
  // Get the listing details
  const { data: listing } = await supabase
    .from('listings')
    .select('id, variant, updated_at')
    .eq('id', listingId)
    .single();
    
  if (listing) {
    console.log('\n📦 Listing Details:');
    console.log('  ID:', listing.id);
    console.log('  Variant:', listing.variant);
    console.log('  Updated At:', listing.updated_at);
  }
  
  // Get current pricing
  const { data: pricing } = await supabase
    .from('lease_pricing')
    .select('monthly_price, period_months, mileage_per_year, created_at, updated_at')
    .eq('listing_id', listingId)
    .order('monthly_price', { ascending: true });
    
  if (pricing && pricing.length > 0) {
    console.log('\n💰 Current Lease Pricing:');
    pricing.forEach((price, idx) => {
      console.log(`  ${idx + 1}. ${price.monthly_price} kr/md, ${price.period_months || 'N/A'} months, ${price.mileage_per_year || 'N/A'} km/year`);
      console.log(`     Created: ${new Date(price.created_at).toLocaleString()}`);
      console.log(`     Updated: ${new Date(price.updated_at).toLocaleString()}`);
    });
  }
  
  // Check if the expected price from the change exists
  console.log('\n✅ Verification:');
  if (change?.extracted_data?.offers?.[0]) {
    const expectedPrice = change.extracted_data.offers[0].monthly_price;
    const found = pricing?.some(p => p.monthly_price === expectedPrice);
    console.log(`  Expected price ${expectedPrice} kr/md: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  }
}

checkUpdateWasApplied().catch(console.error);