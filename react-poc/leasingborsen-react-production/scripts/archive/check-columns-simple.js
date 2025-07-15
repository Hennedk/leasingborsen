#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  try {
    console.log('🔍 Checking Processing Jobs Table Columns...');
    console.log('============================================');
    
    // Get one row to see all available columns
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error querying processing_jobs:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('✅ Available columns in processing_jobs:');
      columns.forEach(col => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`  - ${col}: ${type} ${value !== null ? `(sample: ${JSON.stringify(value).substring(0, 50)})` : '(null)'}`);
      });
      
      // Check specifically for result-related columns
      const resultColumns = columns.filter(col => 
        col.toLowerCase().includes('result') || 
        col.toLowerCase().includes('extract') ||
        col.toLowerCase().includes('data')
      );
      
      console.log('\n🔍 Result-related columns:');
      if (resultColumns.length === 0) {
        console.log('❌ No result-related columns found');
        console.log('\n💡 The processing_jobs table is missing a column to store extracted results.');
        console.log('💡 We need to add a "result" JSONB column to store the extracted vehicle data.');
      } else {
        resultColumns.forEach(col => {
          console.log(`  ✅ ${col}`);
        });
      }
    } else {
      console.log('❌ No data found in processing_jobs table');
    }
    
    // Also check the job we're interested in
    console.log('\n🔍 Checking specific job data...');
    const { data: jobData, error: jobError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', 'e9a544d2-0989-4854-b482-d752646ddcee')
      .single();
    
    if (jobError) {
      console.log('❌ Error getting specific job:', jobError.message);
    } else if (jobData) {
      console.log('✅ Job data:');
      Object.entries(jobData).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }

  } catch (error) {
    console.error('❌ Column check failed:', error.message);
  }
}

checkColumns();