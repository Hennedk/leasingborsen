#!/usr/bin/env node

/**
 * Parse and display the REAL car data from your Privatleasing_priser.pdf
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function parseRealPDF() {
  try {
    console.log('🚗 REAL Toyota Price List - May 27, 2025');
    console.log('==========================================');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    const { stdout: fullText } = await execAsync(`pdftotext "${pdfPath}" -`);
    
    // Parse the structured data
    const cars = [];
    
    // Split into lines and parse
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Find AYGO X section
      if (line === 'AYGO X') {
        console.log('🚗 TOYOTA AYGO X');
        console.log('================');
        
        // Find Active and Pulse variants with prices
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          if (lines[j] === 'Active' && lines[j + 1] && lines[j + 1].match(/^\d{1,2}\.\d{3}$/)) {
            const price = lines[j + 1];
            console.log(`💰 Active: ${price} kr/md`);
            cars.push({ model: 'AYGO X', variant: 'Active', price: price });
          }
          if (lines[j] === 'Pulse' && lines[j + 1] && lines[j + 1].match(/^\d{1,2}\.\d{3}$/)) {
            const price = lines[j + 1];
            console.log(`💰 Pulse: ${price} kr/md`);
            cars.push({ model: 'AYGO X', variant: 'Pulse', price: price });
          }
        }
      }
      
      // Find YARIS section  
      if (line === 'YARIS') {
        console.log('\n🚗 TOYOTA YARIS');
        console.log('===============');
        
        // Look for variants and prices
        for (let j = i; j < Math.min(i + 30, lines.length); j++) {
          // Pattern: variant name followed by price
          if (lines[j] && lines[j + 1] && lines[j + 1].match(/^\d{1,2}\.\d{3}$/)) {
            const variant = lines[j];
            const price = lines[j + 1];
            
            // Skip if it's not a real variant
            if (variant.match(/^(Active|Comfort|Style|Executive|Premium)/i)) {
              console.log(`💰 ${variant}: ${price} kr/md`);
              cars.push({ model: 'YARIS', variant: variant, price: price });
            }
          }
        }
      }
      
      // Find bZ4X section
      if (line === 'BZ4X') {
        console.log('\n🚗 TOYOTA bZ4X (Electric)');
        console.log('=========================');
        
        for (let j = i; j < Math.min(i + 30, lines.length); j++) {
          if (lines[j] && lines[j + 1] && lines[j + 1].match(/^\d{1,2}\.\d{3}$/)) {
            const variant = lines[j];
            const price = lines[j + 1];
            
            // Electric variants
            if (variant.match(/^(Pure|Comfort|Executive|Premium)/i)) {
              console.log(`💰 ${variant}: ${price} kr/md`);
              cars.push({ model: 'bZ4X', variant: variant, price: price });
            }
          }
        }
      }
      
      i++;
    }
    
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`✅ Found ${cars.length} real Toyota models in your PDF`);
    console.log('📄 Source: Toyota Prisliste Privatleasing, May 27, 2025');
    
    if (cars.length > 0) {
      console.log('\n📋 Complete List:');
      cars.forEach((car, index) => {
        console.log(`${index + 1}. Toyota ${car.model} ${car.variant} - ${car.price} kr/md`);
      });
    } else {
      console.log('\n🔍 Let me show you the raw structure to debug:');
      console.log('First 30 lines of your PDF:');
      lines.slice(0, 30).forEach((line, index) => {
        console.log(`${index + 1}: "${line}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

parseRealPDF().catch(console.error);