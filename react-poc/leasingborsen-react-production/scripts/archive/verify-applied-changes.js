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

async function verifyAppliedChanges() {
  console.log('🔍 Verifying Applied Changes from Extraction\n');
  console.log('=' .repeat(80));
  
  try {
    // Get the latest extraction session
    const sessionId = 'da2976c3-5cf4-4c25-bb0b-89cd76ff78d3';
    
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    console.log('\nExtraction Session:');
    console.log(`  ID: ${session.id}`);
    console.log(`  Name: ${session.session_name}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Total Extracted: ${session.total_extracted}`);
    console.log(`  Seller ID: ${session.seller_id}`);
    
    // Get all changes for this session
    const { data: allChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');

    if (changesError) throw changesError;

    console.log('\n' + '=' .repeat(80));
    console.log('\nChange Status Summary:');
    
    const statusCounts = {};
    allChanges.forEach(change => {
      statusCounts[change.change_status] = (statusCounts[change.change_status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Filter for applied changes
    const appliedChanges = allChanges.filter(c => c.change_status === 'applied');
    
    console.log('\n' + '=' .repeat(80));
    console.log(`\n✅ Applied Changes (${appliedChanges.length} total):\n`);
    
    const creations = appliedChanges.filter(c => c.change_type === 'create');
    const updates = appliedChanges.filter(c => c.change_type === 'update');
    
    console.log(`  Creations: ${creations.length}`);
    console.log(`  Updates: ${updates.length}`);
    
    if (creations.length > 0) {
      console.log('\n📝 NEW LISTINGS CREATED:');
      console.log('-'.repeat(60));
      
      for (const creation of creations) {
        const data = creation.new_data || creation.extracted_data;
        console.log(`\n  Make/Model: ${data.make} ${data.model}`);
        console.log(`  Variant: ${data.variant}`);
        console.log(`  Horsepower: ${data.horsepower} HP`);
        console.log(`  Fuel Type: ${data.fuel_type}`);
        console.log(`  Transmission: ${data.transmission}`);
        
        // Check if this was actually created by searching for it
        const { data: createdListing, error: listingError } = await supabase
          .from('listings')
          .select('id, created_at, updated_at')
          .eq('seller_id', session.seller_id)
          .eq('variant', data.variant)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (createdListing) {
          console.log(`  ✅ Verified: Created with ID ${createdListing.id}`);
          console.log(`     Created: ${new Date(createdListing.created_at).toLocaleString()}`);
          
          // Check lease pricing
          const { data: pricing } = await supabase
            .from('lease_pricing')
            .select('monthly_price, down_payment, period_months, mileage_per_year')
            .eq('listing_id', createdListing.id)
            .order('monthly_price');
            
          if (pricing && pricing.length > 0) {
            console.log(`     Offers: ${pricing.length}`);
            pricing.forEach((p, idx) => {
              console.log(`       ${idx + 1}. ${p.monthly_price} kr/month, ${p.down_payment} kr down, ${p.period_months} months, ${p.mileage_per_year} km/year`);
            });
          }
        } else {
          console.log(`  ❌ Could not find created listing in database`);
        }
      }
    }
    
    if (updates.length > 0) {
      console.log('\n\n📝 LISTINGS UPDATED:');
      console.log('-'.repeat(60));
      
      for (const update of updates) {
        const oldData = update.existing_data;
        const newData = update.new_data || update.extracted_data;
        
        console.log(`\n  Make/Model: ${newData.make} ${newData.model}`);
        console.log(`  Old Variant: ${oldData.variant}`);
        console.log(`  New Variant: ${newData.variant}`);
        
        if (oldData.horsepower !== newData.horsepower) {
          console.log(`  Horsepower: ${oldData.horsepower} → ${newData.horsepower} HP`);
        }
        
        // Find the updated listing
        const { data: updatedListing, error: listingError } = await supabase
          .from('listings')
          .select('id, variant, updated_at')
          .eq('seller_id', session.seller_id)
          .eq('variant', newData.variant)
          .single();
          
        if (updatedListing) {
          console.log(`  ✅ Verified: Listing ID ${updatedListing.id} has new variant`);
          console.log(`     Updated: ${new Date(updatedListing.updated_at).toLocaleString()}`);
          
          // Check if offers were updated
          const { data: pricing } = await supabase
            .from('lease_pricing')
            .select('monthly_price, down_payment, period_months, mileage_per_year')
            .eq('listing_id', updatedListing.id)
            .order('monthly_price');
            
          if (pricing && pricing.length > 0) {
            console.log(`     Current Offers: ${pricing.length}`);
            const minPrice = Math.min(...pricing.map(p => p.monthly_price));
            const maxPrice = Math.max(...pricing.map(p => p.monthly_price));
            console.log(`     Price Range: ${minPrice} - ${maxPrice} kr/month`);
          }
        } else {
          console.log(`  ⚠️  Could not find listing with new variant in database`);
        }
      }
    }
    
    // Final verification summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 FINAL VERIFICATION:\n');
    
    // Count total listings for seller
    const { count: totalListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', session.seller_id)
      .eq('status', 'available');
      
    console.log(`Total active listings for seller: ${totalListings}`);
    
    // Get sample of recent listings
    const { data: recentListings } = await supabase
      .from('listings')
      .select('id, variant, created_at, updated_at')
      .eq('seller_id', session.seller_id)
      .order('updated_at', { ascending: false })
      .limit(5);
      
    console.log('\nMost recently modified listings:');
    recentListings.forEach(listing => {
      const isNew = new Date(listing.created_at).getTime() === new Date(listing.updated_at).getTime();
      console.log(`  - ${listing.variant} (${isNew ? 'NEW' : 'UPDATED'})`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run verification
verifyAppliedChanges().catch(console.error);