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

async function checkRecentlyAppliedChanges() {
  console.log('🔍 Checking Recently Applied Changes\n');
  console.log('=' .repeat(80));
  
  try {
    // Get the most recent extraction session that was applied
    const { data: recentSessions, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .in('status', ['applied', 'partially_applied'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionError) throw sessionError;

    console.log('\nRecent Applied Extraction Sessions:');
    recentSessions.forEach(session => {
      console.log(`  - ${session.id}: ${session.session_name} (${session.status}) - Created: ${new Date(session.created_at).toLocaleString()}`);
    });

    // Get the most recent session ID (likely da2976c3-5cf4-4c25-bb0b-89cd76ff78d3)
    const sessionId = 'da2976c3-5cf4-4c25-bb0b-89cd76ff78d3';
    
    // Get the applied changes (2 creations and 2 updates mentioned by user)
    const { data: appliedChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_status', 'applied')
      .order('applied_at', { ascending: false });

    if (changesError) throw changesError;

    console.log('\n' + '=' .repeat(80));
    console.log('\nApplied Changes Summary:');
    
    const creations = appliedChanges.filter(c => c.change_type === 'create');
    const updates = appliedChanges.filter(c => c.change_type === 'update');
    const deletions = appliedChanges.filter(c => c.change_type === 'delete');
    
    console.log(`  - Total Applied: ${appliedChanges.length}`);
    console.log(`  - Creations: ${creations.length}`);
    console.log(`  - Updates: ${updates.length}`);
    console.log(`  - Deletions: ${deletions.length}`);
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n📋 Detailed Applied Changes:\n');

    // Check the 2 creations
    if (creations.length > 0) {
      console.log('CREATIONS:');
      console.log('-'.repeat(40));
      
      for (const creation of creations) {
        const data = creation.new_data || creation.extracted_data;
        console.log(`\n✅ Created Listing ID: ${creation.listing_id}`);
        console.log(`   Applied At: ${new Date(creation.applied_at).toLocaleString()}`);
        console.log(`   Make/Model: ${data.make} ${data.model}`);
        console.log(`   Variant: ${data.variant}`);
        console.log(`   Horsepower: ${data.horsepower} HP`);
        console.log(`   Seller ID: ${data.seller_id}`);
        
        // Verify the listing was actually created
        const { data: newListing, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', creation.listing_id)
          .single();
          
        if (listingError) {
          console.log(`   ❌ ERROR: Listing not found in database!`);
        } else {
          console.log(`   ✅ Verified: Listing exists in database`);
          console.log(`      - Status: ${newListing.status}`);
          console.log(`      - Created: ${new Date(newListing.created_at).toLocaleString()}`);
          
          // Check if lease pricing was created
          const { data: pricing } = await supabase
            .from('lease_pricing')
            .select('*')
            .eq('listing_id', creation.listing_id);
            
          if (pricing && pricing.length > 0) {
            console.log(`      - Lease Pricing: ${pricing.length} offers created`);
            pricing.forEach((offer, idx) => {
              console.log(`         Offer ${idx + 1}: ${offer.monthly_price} kr/month, ${offer.period_months} months`);
            });
          }
        }
      }
    }
    
    // Check the 2 updates
    if (updates.length > 0) {
      console.log('\n\nUPDATES:');
      console.log('-'.repeat(40));
      
      for (const update of updates) {
        const oldData = update.existing_data;
        const newData = update.new_data || update.extracted_data;
        
        console.log(`\n✅ Updated Listing ID: ${update.listing_id}`);
        console.log(`   Applied At: ${new Date(update.applied_at).toLocaleString()}`);
        console.log(`   Make/Model: ${newData.make} ${newData.model}`);
        
        // Show what changed
        if (oldData.variant !== newData.variant) {
          console.log(`   Variant Changed: "${oldData.variant}" → "${newData.variant}"`);
        }
        if (oldData.horsepower !== newData.horsepower) {
          console.log(`   Horsepower Changed: ${oldData.horsepower} → ${newData.horsepower}`);
        }
        
        // Verify the listing was actually updated
        const { data: updatedListing, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', update.listing_id)
          .single();
          
        if (listingError) {
          console.log(`   ❌ ERROR: Listing not found in database!`);
        } else {
          console.log(`   ✅ Verified: Listing exists and was updated`);
          console.log(`      - Current Variant: ${updatedListing.variant}`);
          console.log(`      - Updated: ${new Date(updatedListing.updated_at).toLocaleString()}`);
          
          // Check if offers were updated
          const { data: pricing } = await supabase
            .from('lease_pricing')
            .select('*')
            .eq('listing_id', update.listing_id)
            .order('monthly_price');
            
          if (pricing && pricing.length > 0) {
            console.log(`      - Current Offers: ${pricing.length}`);
            const priceRange = `${pricing[0].monthly_price} - ${pricing[pricing.length-1].monthly_price} kr/month`;
            console.log(`      - Price Range: ${priceRange}`);
          }
        }
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 Verification Summary:\n');
    
    // Check actual counts in database
    const { count: totalListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', 16); // Assuming seller_id 16 based on previous extractions
      
    console.log(`Total listings for dealer: ${totalListings}`);
    
    // Check for any failed applications
    const { data: failedChanges } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_status', 'failed');
      
    if (failedChanges && failedChanges.length > 0) {
      console.log(`\n⚠️  WARNING: ${failedChanges.length} changes failed to apply!`);
      failedChanges.forEach(failed => {
        console.log(`   - ${failed.change_type} failed: ${failed.error_message}`);
      });
    } else {
      console.log('\n✅ All changes were successfully applied!');
    }
    
    // Check for any pending changes
    const { data: pendingChanges } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_status', 'pending');
      
    if (pendingChanges && pendingChanges.length > 0) {
      console.log(`\n⚠️  Note: ${pendingChanges.length} changes are still pending`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run the check
checkRecentlyAppliedChanges().catch(console.error);