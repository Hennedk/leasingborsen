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

async function verifyListingsAfterApplication() {
  console.log('🔍 Verifying Listings After Application\n');
  console.log('=' .repeat(80));
  
  try {
    // Get seller ID from the extraction session
    const sessionId = 'da2976c3-5cf4-4c25-bb0b-89cd76ff78d3';
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('seller_id')
      .eq('id', sessionId)
      .single();
      
    const sellerId = session.seller_id;
    
    // Get all Hyundai Ioniq 6 listings for this seller
    const { data: listings, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('make', 'Hyundai')
      .eq('model', 'Ioniq 6')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`\nFound ${listings.length} Hyundai Ioniq 6 listings for seller:\n`);
    
    // Group by creation/update time to identify what was just applied
    const recentlyCreated = [];
    const recentlyUpdated = [];
    const existing = [];
    
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    listings.forEach(listing => {
      const createdAt = new Date(listing.created_at);
      const updatedAt = new Date(listing.updated_at);
      
      if (createdAt > fiveMinutesAgo) {
        recentlyCreated.push(listing);
      } else if (updatedAt > fiveMinutesAgo && updatedAt > createdAt) {
        recentlyUpdated.push(listing);
      } else {
        existing.push(listing);
      }
    });
    
    // Show recently created (should be 2)
    console.log(`✅ RECENTLY CREATED (last 5 minutes): ${recentlyCreated.length}`);
    console.log('-'.repeat(60));
    recentlyCreated.forEach((listing, idx) => {
      console.log(`\n${idx + 1}. ${listing.variant}`);
      console.log(`   ID: ${listing.listing_id}`);
      console.log(`   Horsepower: ${listing.horsepower} HP`);
      console.log(`   Created: ${new Date(listing.created_at).toLocaleString()}`);
      
      // Check offers
      if (listing.monthly_price) {
        console.log(`   Base Offer: ${listing.monthly_price} kr/month`);
      }
    });
    
    // Show recently updated (should be 2)
    console.log(`\n\n✅ RECENTLY UPDATED (last 5 minutes): ${recentlyUpdated.length}`);
    console.log('-'.repeat(60));
    recentlyUpdated.forEach((listing, idx) => {
      console.log(`\n${idx + 1}. ${listing.variant}`);
      console.log(`   ID: ${listing.listing_id}`);
      console.log(`   Horsepower: ${listing.horsepower} HP`);
      console.log(`   Updated: ${new Date(listing.updated_at).toLocaleString()}`);
      
      // Check offers
      if (listing.monthly_price) {
        console.log(`   Base Offer: ${listing.monthly_price} kr/month`);
      }
    });
    
    // Show all variants currently in database
    console.log('\n\n📋 ALL IONIQ 6 VARIANTS IN DATABASE:');
    console.log('-'.repeat(60));
    
    const variantMap = new Map();
    listings.forEach(listing => {
      const key = listing.variant;
      if (!variantMap.has(key)) {
        variantMap.set(key, {
          variant: listing.variant,
          horsepower: listing.horsepower,
          count: 0,
          ids: []
        });
      }
      variantMap.get(key).count++;
      variantMap.get(key).ids.push(listing.listing_id);
    });
    
    Array.from(variantMap.values())
      .sort((a, b) => a.variant.localeCompare(b.variant))
      .forEach(variant => {
        console.log(`\n- ${variant.variant} (${variant.horsepower} HP)`);
        console.log(`  Count: ${variant.count}`);
        if (variant.count > 1) {
          console.log(`  ⚠️  Duplicate variant detected!`);
        }
      });
    
    // Summary based on expected changes
    console.log('\n\n' + '=' .repeat(80));
    console.log('\n📊 VERIFICATION SUMMARY:\n');
    
    const expectedCreations = [
      'Ultimate 4WD 325 HK – 20" alufælge, soltag',
      'Ultimate 4WD 325 HK – 20" alufælge, soltag, digitale sidespejle'
    ];
    
    const expectedUpdates = [
      'Advanced 229 HK',
      'Ultimate 4WD 325 HK'
    ];
    
    console.log('Expected Creations:');
    expectedCreations.forEach(variant => {
      const found = recentlyCreated.find(l => l.variant === variant);
      console.log(`  - ${variant}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    });
    
    console.log('\nExpected Updates:');
    expectedUpdates.forEach(variant => {
      const found = recentlyUpdated.find(l => l.variant === variant);
      console.log(`  - ${variant}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    });
    
    // Check for any pricing issues
    console.log('\n\nPricing Check:');
    const allPrices = listings
      .filter(l => l.monthly_price)
      .map(l => l.monthly_price);
    
    if (allPrices.length > 0) {
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);
      console.log(`  Price Range: ${minPrice} - ${maxPrice} kr/month`);
      
      const suspiciousPrices = allPrices.filter(p => p > 10000);
      if (suspiciousPrices.length > 0) {
        console.log(`  ⚠️  WARNING: ${suspiciousPrices.length} listings with prices > 10,000 kr/month`);
      } else {
        console.log(`  ✅ All prices are in reasonable range (< 10,000 kr/month)`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run verification
verifyListingsAfterApplication().catch(console.error);