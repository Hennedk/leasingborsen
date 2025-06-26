#!/usr/bin/env node

/**
 * Extract real car data from your Privatleasing_priser.pdf
 */

import { createClient } from '@supabase/supabase-js';
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
dotenv.config({ path: join(__dirname, '../.env.local') });

async function extractRealCarData() {
  try {
    console.log('🚗 Extracting REAL car data from your PDF...');
    console.log('=================================================');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    
    // Extract full text
    const { stdout: fullText } = await execAsync(`pdftotext "${pdfPath}" -`);
    
    console.log(`📊 Extracted ${fullText.length} characters from your PDF`);
    console.log('');
    
    // Parse Toyota models from real PDF
    const toyotaModels = [];
    const lines = fullText.split('\n');
    
    let currentModel = null;
    let isInModelSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect model names
      if (line.match(/^(AYGO X|YARIS|COROLLA|C-HR|RAV4|HIGHLANDER|PRIUS|BZ4X)$/i)) {
        currentModel = line;
        isInModelSection = true;
        console.log(`🚗 Found model: ${currentModel}`);
        continue;
      }
      
      // Extract pricing data
      if (isInModelSection && currentModel) {
        const priceMatch = line.match(/^([A-Za-z\s]+)\s+(\d{1,2}\.\d{3}|\d{1,2}\.?\d{3})/);
        if (priceMatch) {
          const variant = priceMatch[1].trim();
          const price = priceMatch[2].replace('.', '');
          
          // Look ahead for CO2 and fuel consumption
          let co2 = null;
          let fuelConsumption = null;
          
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j];
            const co2Match = nextLine.match(/(\d+(?:,\d+)?\/\d+)/);
            const fuelMatch = nextLine.match(/(\d+(?:,\d+)?)\s*km\/l/);
            
            if (co2Match) co2 = co2Match[1];
            if (fuelMatch) fuelConsumption = fuelMatch[1];
          }
          
          toyotaModels.push({
            make: 'Toyota',
            model: currentModel,
            variant: variant,
            monthlyPrice: parseInt(price),
            co2Emission: co2,
            fuelConsumption: fuelConsumption,
            source: 'Real PDF Extraction'
          });
        }
        
        // End of model section
        if (line === '' || line.match(/^[A-Z\s]+$/)) {
          isInModelSection = false;
        }
      }
    }
    
    console.log('');
    console.log('📋 REAL EXTRACTED CAR DATA:');
    console.log('=====================================');
    
    toyotaModels.forEach((car, index) => {
      console.log(`${index + 1}. ${car.make} ${car.model} ${car.variant}`);
      console.log(`   💰 Price: ${car.monthlyPrice.toLocaleString('da-DK')} kr/md`);
      if (car.co2Emission) console.log(`   🌍 CO2: ${car.co2Emission} g/km`);
      if (car.fuelConsumption) console.log(`   ⛽ Fuel: ${car.fuelConsumption} km/l`);
      console.log('');
    });
    
    console.log(`✅ Successfully extracted ${toyotaModels.length} real vehicles from your PDF!`);
    
    // Save to file
    const outputFile = join(__dirname, '../real-extracted-cars.json');
    fs.writeFileSync(outputFile, JSON.stringify(toyotaModels, null, 2));
    console.log(`💾 Data saved to: ${outputFile}`);
    
    return toyotaModels;
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
  }
}

extractRealCarData().catch(console.error);