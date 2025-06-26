#!/usr/bin/env node

/**
 * Extract ALL 27 Toyota variants from the PDF
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function extractAll27Cars() {
  try {
    console.log('🚗 Extracting ALL 27 Toyota variants from your PDF...');
    console.log('====================================================');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    const { stdout: fullText } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    
    const cars = [];
    const lines = fullText.split('\n');
    
    let currentModel = '';
    let currentSubtype = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Main model detection
      if (line.includes('AYGO X') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'AYGO X';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('YARIS') && line.includes('SE UDSTYRSVARIANTER') && !line.includes('YARIS CROSS')) {
        currentModel = 'YARIS';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('YARIS CROSS') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'YARIS CROSS';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('COROLLA TOURING SPORTS') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'COROLLA TOURING SPORTS';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('COROLLA HATCHBACK') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'COROLLA HATCHBACK';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('COROLLA') && line.includes('SE UDSTYRSVARIANTER') && !line.includes('TOURING') && !line.includes('HATCHBACK')) {
        currentModel = 'COROLLA';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('C-HR') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'C-HR';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('RAV4') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'RAV4';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('HIGHLANDER') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'HIGHLANDER';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('PRIUS') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'PRIUS';
        console.log(`\n📌 Found: ${currentModel}`);
      } else if (line.includes('BZ4X') && line.includes('SE UDSTYRSVARIANTER')) {
        currentModel = 'BZ4X';
        console.log(`\n📌 Found: ${currentModel}`);
      }
      
      // Engine/subtype detection (e.g., "5-dørs, 1.0 benzin 72 hk")
      if (currentModel && line.match(/^\d+-dørs|^SUV|^Stationcar|^Hatchback|^Crossover|^Sedan/)) {
        currentSubtype = line.trim();
        // Check next line for engine info
        if (i + 1 < lines.length && lines[i + 1].match(/\d+\.\d+.*hk/i)) {
          currentSubtype += ' ' + lines[i + 1].trim();
        }
      }
      
      // Price extraction - look for variant names followed by prices
      if (currentModel) {
        // Match patterns like "Active    2.699    4.999"
        const priceMatch = line.match(/^([A-Za-z][A-Za-z\s]+?)\s{2,}(\d{1,2}\.\d{3})\s+/);
        if (priceMatch) {
          const variant = priceMatch[1].trim();
          const price = priceMatch[2];
          
          // Valid variant names
          const validVariants = ['Active', 'Pulse', 'Style', 'Executive', 'Premium', 'Comfort', 
                                'Active Safety', 'Style Comfort', 'Style Technology', 'Executive SkyView',
                                'GR Sport', 'Adventure', 'Prestige', 'VIP', 'Pure'];
          
          if (validVariants.some(v => variant.startsWith(v))) {
            const carEntry = {
              make: 'Toyota',
              model: currentModel,
              variant: variant,
              engineType: currentSubtype,
              monthlyPrice: price,
              priceNum: parseInt(price.replace('.', ''))
            };
            
            cars.push(carEntry);
            console.log(`  ✅ ${variant}: ${price} kr/md`);
          }
        }
      }
    }
    
    console.log('\n📊 FINAL RESULTS');
    console.log('================');
    console.log(`✅ Successfully extracted ${cars.length} Toyota variants`);
    console.log('');
    
    // Group by model
    const models = [...new Set(cars.map(c => c.model))];
    models.forEach(model => {
      const modelCars = cars.filter(c => c.model === model);
      console.log(`\n🚗 ${model} (${modelCars.length} variants):`);
      modelCars.forEach((car, idx) => {
        console.log(`   ${idx + 1}. ${car.variant} - ${car.monthlyPrice} kr/md`);
      });
    });
    
    // Save results
    const output = {
      extractionDate: new Date().toISOString(),
      source: 'Privatleasing_priser.pdf',
      totalVariants: cars.length,
      cars: cars
    };
    
    const outputFile = join(__dirname, '../real-27-toyota-cars.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    
    console.log(`\n💾 Full data saved to: ${outputFile}`);
    console.log(`\n📋 Total: ${cars.length} variants (expected: 27)`);
    
    if (cars.length !== 27) {
      console.log('\n⚠️  Count mismatch - running diagnostic...');
      // Show what models we found
      const modelCounts = {};
      cars.forEach(car => {
        modelCounts[car.model] = (modelCounts[car.model] || 0) + 1;
      });
      console.log('\nModel breakdown:');
      Object.entries(modelCounts).forEach(([model, count]) => {
        console.log(`  ${model}: ${count} variants`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

extractAll27Cars().catch(console.error);