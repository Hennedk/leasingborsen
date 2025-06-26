#!/usr/bin/env node

/**
 * Final extraction of all 27 Toyota variants using exact PDF layout
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function extractAll27Toyota() {
  try {
    console.log('🚗 Extracting ALL 27 Toyota variants from PDF...');
    console.log('================================================');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    const { stdout: fullText } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    
    const cars = [];
    const lines = fullText.split('\n');
    
    // Parse each variant line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for variant patterns with prices
      // Pattern: "Variant    2.999    4.999    xxx    xxx"
      const match = line.match(/^\s*([A-Za-z][A-Za-z\s]+?)\s{3,}(\d{1,2}\.\d{3})\s+/);
      
      if (match) {
        const variant = match[1].trim();
        const price = match[2];
        
        // Valid Toyota variant names
        const validVariants = [
          'Active', 'Pulse', 'Style', 'Executive', 'Premium', 
          'Comfort', 'Active Safety', 'Style Comfort', 'Style Technology', 
          'Executive SkyView', 'GR Sport', 'Adventure', 'Prestige', 
          'VIP', 'Pure', 'Premium Style', 'Acitve' // Note: PDF has typo "Acitve"
        ];
        
        if (validVariants.some(v => variant === v || variant.startsWith(v))) {
          // Find which model this belongs to by looking backwards
          let model = '';
          let engineInfo = '';
          
          // Look back for model name
          for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
            const prevLine = lines[j];
            
            // Model detection
            if (prevLine.includes('AYGO X') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'AYGO X';
            } else if (prevLine.includes('YARIS CROSS') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'YARIS CROSS';
            } else if (prevLine.includes('YARIS') && prevLine.includes('SE UDSTYRSVARIANTER') && !prevLine.includes('CROSS')) {
              model = 'YARIS';
            } else if (prevLine.includes('COROLLA TOURING SPORTS') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'COROLLA TOURING SPORTS';
            } else if (prevLine.includes('COROLLA HATCHBACK') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'COROLLA HATCHBACK';
            } else if (prevLine.includes('COROLLA') && prevLine.includes('SE UDSTYRSVARIANTER') && !prevLine.includes('TOURING') && !prevLine.includes('HATCHBACK')) {
              model = 'COROLLA';
            } else if (prevLine.includes('C-HR') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'C-HR';
            } else if (prevLine.includes('RAV4') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'RAV4';
            } else if (prevLine.includes('HIGHLANDER') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'HIGHLANDER';
            } else if (prevLine.includes('PRIUS') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'PRIUS';
            } else if (prevLine.includes('BZ4X') && prevLine.includes('SE UDSTYRSVARIANTER')) {
              model = 'BZ4X';
            }
            
            // Engine info detection
            if (model && prevLine.match(/\d+-dørs.*\d+\.\d+.*hk|SUV.*\d+\.\d+.*hk/)) {
              engineInfo = prevLine.trim();
              break;
            }
          }
          
          if (model) {
            cars.push({
              make: 'Toyota',
              model: model,
              variant: variant === 'Acitve' ? 'Active' : variant, // Fix typo
              engineInfo: engineInfo,
              monthlyPrice: price,
              priceNum: parseInt(price.replace('.', ''))
            });
          }
        }
      }
    }
    
    // Display results grouped by model
    console.log('\n📊 EXTRACTED VEHICLES:');
    console.log('====================');
    
    const models = [...new Set(cars.map(c => c.model))];
    let totalCount = 0;
    
    models.forEach(model => {
      const modelCars = cars.filter(c => c.model === model);
      console.log(`\n🚗 ${model} (${modelCars.length} variants):`);
      modelCars.forEach((car, idx) => {
        totalCount++;
        console.log(`   ${totalCount}. ${car.variant} - ${car.monthlyPrice} kr/md`);
      });
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ TOTAL: ${cars.length} variants extracted`);
    
    if (cars.length === 27) {
      console.log('🎉 SUCCESS: Found all 27 Toyota variants!');
    } else {
      console.log(`⚠️  Expected 27, found ${cars.length}`);
    }
    
    // Save complete data
    const output = {
      extractionDate: new Date().toISOString(),
      source: 'Toyota Privatleasing Prisliste - 27. MAJ 2025',
      totalVariants: cars.length,
      priceRange: {
        min: Math.min(...cars.map(c => c.priceNum)),
        max: Math.max(...cars.map(c => c.priceNum))
      },
      cars: cars
    };
    
    const outputFile = join(__dirname, '../toyota-27-variants-final.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    
    console.log(`\n💾 Complete data saved to: ${outputFile}`);
    
    // Summary
    console.log('\n📈 PRICE SUMMARY:');
    console.log(`   Cheapest: ${cars.reduce((min, car) => car.priceNum < min.priceNum ? car : min).model} ${cars.reduce((min, car) => car.priceNum < min.priceNum ? car : min).variant} - ${cars.reduce((min, car) => car.priceNum < min.priceNum ? car : min).monthlyPrice} kr/md`);
    console.log(`   Most expensive: ${cars.reduce((max, car) => car.priceNum > max.priceNum ? car : max).model} ${cars.reduce((max, car) => car.priceNum > max.priceNum ? car : max).variant} - ${cars.reduce((max, car) => car.priceNum > max.priceNum ? car : max).monthlyPrice} kr/md`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

extractAll27Toyota().catch(console.error);