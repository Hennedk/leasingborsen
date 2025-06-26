#!/usr/bin/env node

/**
 * Extract ENTIRE PDF content and send to AI for intelligent parsing of all 27 variants
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.staging') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function extractAndProcessWithAI() {
  try {
    console.log('🚗 Extracting ENTIRE PDF for AI processing...');
    console.log('============================================');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    
    // Extract complete PDF with layout
    const { stdout: fullText } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    
    console.log(`📄 Extracted ${fullText.length} characters from PDF`);
    console.log('🤖 Sending to AI extraction system...\n');
    
    // Create payload for AI extraction
    const payload = {
      filename: 'Privatleasing_priser.pdf',
      textContent: fullText,
      extractedData: {
        dealer_name: 'Toyota Danmark',
        dealer_id: 'toyota-complete-27',
        batch_id: `ai-extraction-27-${Date.now()}`,
        processing_timestamp: new Date().toISOString(),
        extraction_instructions: `
          IMPORTANT: Extract EXACTLY 27 Toyota vehicle variants from this price list.
          
          Models to find:
          1. AYGO X (multiple variants with manual and automatic)
          2. YARIS (multiple variants)
          3. YARIS CROSS (multiple variants)
          4. COROLLA (if exists)
          5. COROLLA HATCHBACK (if exists)
          6. COROLLA TOURING SPORTS (multiple variants)
          7. C-HR (if exists)
          8. RAV4 (if exists)
          9. HIGHLANDER (if exists)
          10. PRIUS (if exists)
          11. BZ4X (multiple variants - electric)
          12. URBAN CRUISER (electric variants)
          
          For each variant, extract:
          - Model name (e.g., AYGO X, YARIS)
          - Variant name (e.g., Active, Pulse, Style)
          - Engine type (if specified)
          - Monthly price in DKK
          - Any other relevant specs (CO2, fuel consumption, etc.)
          
          Expected total: EXACTLY 27 variants
        `
      }
    };
    
    console.log('📤 Processing through Edge Function with AI...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ AI Processing initiated');
    console.log(`📊 Job ID: ${result.job_id}`);
    
    // Monitor job progress
    console.log('\n⏳ Monitoring AI extraction progress...');
    
    let attempts = 0;
    const maxAttempts = 60; // 1 minute timeout
    
    while (attempts < maxAttempts) {
      const { data: jobData, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('id', result.job_id)
        .single();
        
      if (error) {
        console.error(`❌ Job monitoring failed: ${error.message}`);
        break;
      }
      
      console.log(`📈 Progress: ${jobData.progress}% - ${jobData.current_step || 'Processing...'}`);
      
      if (jobData.status === 'completed') {
        console.log('\n🎉 AI Extraction Complete!');
        console.log('==========================');
        console.log(`✅ Status: ${jobData.status}`);
        console.log(`🚗 Vehicles Found: ${jobData.processed_items || 0}`);
        console.log(`💰 AI Cost: $${(jobData.ai_cost_cents || 0) / 100}`);
        console.log(`⏱️  Processing Time: ${jobData.completed_at ? new Date(jobData.completed_at) - new Date(jobData.started_at) : 0}ms`);
        
        // Try to get the extracted data
        if (jobData.result && jobData.result.vehicles) {
          console.log('\n📋 EXTRACTED VEHICLES:');
          console.log('=====================');
          
          const vehicles = jobData.result.vehicles;
          vehicles.forEach((car, index) => {
            console.log(`${index + 1}. ${car.make || 'Toyota'} ${car.model} ${car.variant} - ${car.monthlyPrice} kr/md`);
          });
          
          console.log(`\n✅ Total: ${vehicles.length} variants (Expected: 27)`);
          
          // Save to file
          const outputFile = join(__dirname, '../ai-extracted-27-cars.json');
          fs.writeFileSync(outputFile, JSON.stringify({
            extractionDate: new Date().toISOString(),
            jobId: result.job_id,
            totalVariants: vehicles.length,
            vehicles: vehicles
          }, null, 2));
          
          console.log(`💾 Data saved to: ${outputFile}`);
        } else {
          console.log('\n⚠️  No vehicle data in response - checking alternative storage...');
          
          // Try alternative query for extraction results
          const { data: extractions, error: extractError } = await supabase
            .from('pdf_extractions')
            .select('*')
            .eq('job_id', result.job_id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (extractions && extractions.length > 0) {
            console.log('✅ Found extraction data in pdf_extractions table');
            console.log(JSON.stringify(extractions[0], null, 2));
          }
        }
        
        break;
      } else if (jobData.status === 'failed') {
        console.log(`\n❌ Job failed: ${jobData.error_message || 'Unknown error'}`);
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (attempts >= maxAttempts) {
      console.log('\n⏰ Timeout - job still processing. Check database for results.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Run the extraction
extractAndProcessWithAI().catch(console.error);