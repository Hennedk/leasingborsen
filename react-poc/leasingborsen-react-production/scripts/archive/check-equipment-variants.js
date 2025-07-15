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

async function checkEquipmentVariants() {
  const sessionId = '55787495-a921-4e9b-8171-4ac7ca2e5723'; // Recent successful session
  
  console.log('🔍 Checking equipment variants in recent successful extraction\n');
  console.log(`Session ID: ${sessionId}\n`);
  
  // Get all changes from this session
  const { data: changes, error } = await supabase
    .from('extraction_listing_changes')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at');
    
  if (error) {
    console.error('Error fetching changes:', error);
    return;
  }
  
  console.log(`Total changes in session: ${changes.length}\n`);
  
  // Group by base variant (without equipment)
  const variantGroups = {};
  
  changes.forEach(change => {
    const variant = change.extracted_data?.variant;
    if (!variant) return;
    
    // Extract base variant (before " - " if present)
    const baseVariant = variant.includes(' - ') ? variant.split(' - ')[0] : variant;
    const equipment = variant.includes(' - ') ? variant.split(' - ')[1] : null;
    
    if (!variantGroups[baseVariant]) {
      variantGroups[baseVariant] = [];
    }
    
    variantGroups[baseVariant].push({
      fullVariant: variant,
      equipment: equipment,
      changeType: change.change_type,
      make: change.extracted_data.make,
      model: change.extracted_data.model,
      offers: change.extracted_data.offers || []
    });
  });
  
  // Display groups with equipment differentiation
  console.log('📋 Variant Groups with Equipment Differentiation:\n');
  
  Object.entries(variantGroups).forEach(([baseVariant, items]) => {
    if (items.length > 1 || items[0].equipment) {
      console.log(`Base Variant: ${items[0].make} ${items[0].model} ${baseVariant}`);
      console.log(`Equipment Packages: ${items.length}`);
      
      items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.equipment || 'Base (no extra equipment)'}`);
        console.log(`     Offers: ${item.offers.length}`);
        if (item.offers.length > 0) {
          const prices = item.offers.map(o => o.monthly_price).join(', ');
          console.log(`     Prices: ${prices} kr/md`);
        }
      });
      
      console.log('');
    }
  });
  
  // Check for potential duplicates within equipment variants
  console.log('\n🔍 Checking for duplicate constraints within equipment variants:\n');
  
  let duplicateCount = 0;
  changes.forEach(change => {
    const offers = change.extracted_data?.offers || [];
    const seen = new Set();
    const duplicates = [];
    
    offers.forEach((offer, idx) => {
      const key = `${offer.mileage_per_year || 'null'}-${offer.first_payment || 'null'}-${offer.period_months || 'null'}`;
      if (seen.has(key)) {
        duplicates.push({ idx, offer, key });
      }
      seen.add(key);
    });
    
    if (duplicates.length > 0) {
      duplicateCount++;
      console.log(`⚠️  Variant: ${change.extracted_data.variant}`);
      console.log(`   Found ${duplicates.length} duplicate constraint combinations`);
    }
  });
  
  if (duplicateCount === 0) {
    console.log('✅ No duplicate constraints found within any variant!');
  }
}

checkEquipmentVariants().catch(console.error);