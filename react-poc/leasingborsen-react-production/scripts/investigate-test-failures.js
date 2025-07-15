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

async function investigateFailures() {
  console.log('🔍 INVESTIGATING TEST FAILURES\n');
  
  // Issue 1: Duplicate errors after fix
  console.log('1️⃣ Investigating duplicate errors after fix deployment\n');
  
  const fixDate = new Date('2025-01-11T12:00:00');
  
  const { data: duplicateErrors } = await supabase
    .from('extraction_listing_changes')
    .select('session_id, review_notes, created_at')
    .like('review_notes', '%duplicate key%')
    .gte('created_at', fixDate.toISOString())
    .order('created_at', { ascending: false });
    
  if (duplicateErrors && duplicateErrors.length > 0) {
    console.log(`Found ${duplicateErrors.length} duplicate errors after fix:`);
    
    const uniqueSessions = [...new Set(duplicateErrors.map(e => e.session_id))];
    
    for (const sessionId of uniqueSessions) {
      const { data: session } = await supabase
        .from('extraction_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      console.log(`\nSession: ${sessionId}`);
      console.log(`Created: ${new Date(session.created_at).toLocaleString()}`);
      console.log(`Status: ${session.status}`);
      console.log(`API Version: ${session.api_version || 'unknown'}`);
      
      const sessionErrors = duplicateErrors.filter(e => e.session_id === sessionId);
      console.log(`Duplicate errors in session: ${sessionErrors.length}`);
      
      // Check if these are from apply attempts
      const applyErrors = sessionErrors.filter(e => e.review_notes?.includes('Apply error'));
      if (applyErrors.length > 0) {
        console.log(`⚠️  These are from apply attempts, not extraction`);
      }
    }
  } else {
    console.log('✅ No duplicate errors found after fix date');
  }
  
  // Issue 2: Invalid pricing records
  console.log('\n\n2️⃣ Investigating invalid pricing records\n');
  
  const { data: invalidPricing } = await supabase
    .from('lease_pricing')
    .select('*, listings!inner(make_id, model_id, variant)')
    .or('monthly_price.lte.0,monthly_price.is.null')
    .limit(10);
    
  if (invalidPricing && invalidPricing.length > 0) {
    console.log(`Found ${invalidPricing.length} invalid pricing records:`);
    
    invalidPricing.forEach((price, idx) => {
      console.log(`\n${idx + 1}. Pricing ID: ${price.id}`);
      console.log(`   Monthly Price: ${price.monthly_price}`);
      console.log(`   Listing ID: ${price.listing_id}`);
      console.log(`   Created: ${new Date(price.created_at).toLocaleString()}`);
    });
    
    // Check if these are test data
    const testListings = invalidPricing.filter(p => 
      p.listings?.variant?.toLowerCase().includes('test') ||
      p.monthly_price === 0
    );
    
    if (testListings.length > 0) {
      console.log(`\n⚠️  ${testListings.length} appear to be test data`);
    }
  }
  
  // Issue 3: High inference rate
  console.log('\n\n3️⃣ Investigating high inference rate\n');
  
  const { data: recentMetrics } = await supabase
    .from('extraction_sessions')
    .select('id, session_name, inference_rate, variant_source_stats')
    .eq('api_version', 'responses-api')
    .not('inference_rate', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentMetrics && recentMetrics.length > 0) {
    console.log('Recent sessions with inference metrics:');
    
    recentMetrics.forEach(m => {
      console.log(`\nSession: ${m.session_name}`);
      console.log(`Inference Rate: ${(m.inference_rate * 100).toFixed(1)}%`);
      
      if (m.variant_source_stats) {
        console.log('Variant Sources:');
        console.log(`  - Existing: ${m.variant_source_stats.existing || 0}`);
        console.log(`  - Reference: ${m.variant_source_stats.reference || 0}`);
        console.log(`  - Inferred: ${m.variant_source_stats.inferred || 0}`);
      }
    });
    
    // Check if these are new dealers without history
    console.log('\n💡 High inference rate might be due to:');
    console.log('- New dealers without existing inventory');
    console.log('- PDFs with new models not in reference data');
    console.log('- Need to update reference data with validated variants');
  }
  
  // Issue 4: Equipment formatting
  console.log('\n\n4️⃣ Investigating equipment formatting issues\n');
  
  const { data: equipmentVariants } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .like('extracted_data->>variant', '% - %')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (equipmentVariants && equipmentVariants.length > 0) {
    console.log('Recent equipment variant examples:');
    
    equipmentVariants.forEach((ev, idx) => {
      const variant = ev.extracted_data.variant;
      const parts = variant.split(' - ');
      
      console.log(`\n${idx + 1}. "${variant}"`);
      console.log(`   Parts: ${parts.length}`);
      
      if (parts.length > 2) {
        console.log(`   ⚠️  Multiple hyphens detected`);
      }
      
      // Check if it's actual equipment or misformatted
      const hasEquipmentTerms = variant.match(/alufælge|soltag|sidespejle|custom colour/i);
      if (!hasEquipmentTerms && parts.length === 2) {
        console.log(`   ⚠️  No equipment terms found - might be misformatted`);
      }
    });
  }
}

investigateFailures().catch(console.error);