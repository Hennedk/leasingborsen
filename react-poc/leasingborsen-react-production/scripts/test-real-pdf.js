#!/usr/bin/env node

/**
 * Test script for REAL PDF processing - extracts actual text from Privatleasing_priser.pdf
 * Run with: node scripts/test-real-pdf.js
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    highlight: colors.cyan
  }[type] || colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
}

async function extractTextFromPDF(pdfPath) {
  try {
    log('📄 Reading PDF file...', 'info');
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }
    
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    log(`📊 PDF has ${pdf.numPages} pages`, 'info');
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      log(`📖 Processing page ${pageNum}/${pdf.numPages}...`, 'info');
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      fullText += pageText + '\n\n';
    }
    
    log(`✅ Extracted ${fullText.length} characters of text`, 'success');
    return fullText;
    
  } catch (error) {
    log(`❌ PDF extraction failed: ${error.message}`, 'error');
    throw error;
  }
}

async function processRealPDF() {
  try {
    log('🚀 Starting REAL PDF Processing Test', 'highlight');
    log('==========================================', 'info');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    
    // Step 1: Extract real text from PDF
    log('📄 Step 1: Extracting text from real PDF...', 'info');
    const realPdfText = await extractTextFromPDF(pdfPath);
    
    // Show first 500 characters of real extracted text
    log('📝 First 500 characters of extracted text:', 'info');
    console.log('---');
    console.log(realPdfText.substring(0, 500) + '...');
    console.log('---');
    
    // Step 2: Process through AI extraction system
    log('🤖 Step 2: Processing through AI extraction system...', 'info');
    
    const batchId = `real-pdf-test-${Date.now()}`;
    
    const payload = {
      filename: 'Privatleasing_priser.pdf',
      textContent: realPdfText,
      extractedData: {
        dealer_name: 'Real PDF Test',
        dealer_id: 'real-pdf-extraction',
        batch_id: batchId,
        processing_timestamp: new Date().toISOString()
      }
    };
    
    log('📤 Sending real PDF text to Edge Function...', 'info');
    
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
    log('✅ Edge Function processing completed', 'success');
    
    // Step 3: Monitor job progress
    log('📊 Step 3: Monitoring extraction job...', 'info');
    
    const jobId = result.job_id;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      const { data: jobData, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
        
      if (error) {
        log(`❌ Job monitoring failed: ${error.message}`, 'error');
        break;
      }
      
      log(`📈 Job Progress: ${jobData.progress}% - ${jobData.current_step || 'Processing...'}`, 'info');
      
      if (jobData.status === 'completed') {
        log('🎉 Real PDF processing completed!', 'success');
        log('==========================================', 'info');
        log(`✅ Status: ${jobData.status}`, 'success');
        log(`📊 Progress: ${jobData.progress}%`, 'success');
        log(`🚗 Vehicles Found: ${jobData.processed_items || 0}`, 'success');
        log(`💰 AI Cost: $${(jobData.ai_cost_cents || 0) / 100}`, 'info');
        log(`⏱️  Processing Time: ${new Date(jobData.completed_at) - new Date(jobData.started_at)}ms`, 'info');
        
        // Show extraction details if available
        if (jobData.result) {
          log('🚗 Extracted Vehicle Data:', 'highlight');
          console.log(JSON.stringify(jobData.result, null, 2));
        } else {
          log('⚠️  Vehicle data available but not stored (database schema needs update)', 'warning');
        }
        
        break;
      } else if (jobData.status === 'failed') {
        log(`❌ Job failed: ${jobData.error_message || 'Unknown error'}`, 'error');
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (attempts >= maxAttempts) {
      log('⏰ Job monitoring timeout - check database manually', 'warning');
    }
    
  } catch (error) {
    log(`❌ Real PDF processing failed: ${error.message}`, 'error');
    console.error(error);
  }
}

// Run the test
processRealPDF().catch(console.error);