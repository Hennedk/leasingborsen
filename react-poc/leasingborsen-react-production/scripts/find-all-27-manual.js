#!/usr/bin/env node

/**
 * Manual extraction of ALL 27 Toyota variants from the complete PDF
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function findAll27Variants() {
  try {
    console.log('🔍 Finding ALL 27 Toyota variants manually...');
    console.log('============================================\n');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    const { stdout: fullText } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    
    // First, let's find ALL model sections
    const lines = fullText.split('\n');
    const models = [];
    const modelSections = {};
    
    // Find all model headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('SE UDSTYRSVARIANTER HER')) {
        // Extract model name from this line or previous lines
        let modelName = '';
        
        if (line.includes('AYGO X')) modelName = 'AYGO X';
        else if (line.includes('YARIS CROSS')) modelName = 'YARIS CROSS';
        else if (line.includes('YARIS')) modelName = 'YARIS';
        else if (line.includes('COROLLA TOURING SPORTS')) modelName = 'COROLLA TOURING SPORTS';
        else if (line.includes('COROLLA HATCHBACK')) modelName = 'COROLLA HATCHBACK';
        else if (line.includes('COROLLA')) modelName = 'COROLLA';
        else if (line.includes('C-HR')) modelName = 'C-HR';
        else if (line.includes('RAV4')) modelName = 'RAV4';
        else if (line.includes('HIGHLANDER')) modelName = 'HIGHLANDER';
        else if (line.includes('PRIUS')) modelName = 'PRIUS';
        else if (line.includes('BZ4X')) modelName = 'BZ4X';
        else if (line.includes('URBAN CRUISER')) modelName = 'URBAN CRUISER';
        
        if (modelName) {
          models.push(modelName);
          modelSections[modelName] = i;
          console.log(`📍 Found model: ${modelName} at line ${i}`);
        }
      }
    }
    
    console.log(`\n✅ Found ${models.length} models total\n`);
    
    // Now extract variants for each model
    const allCars = [];
    
    for (const model of models) {
      const startLine = modelSections[model];
      console.log(`\n🚗 Extracting ${model} variants...`);
      
      // Look for price patterns in the next 50 lines
      for (let i = startLine; i < Math.min(startLine + 50, lines.length); i++) {
        const line = lines[i];
        
        // Multiple patterns to catch all variants
        // Pattern 1: "Variant    2.999    4.999"
        // Pattern 2: "Variant                   2.999         4.999"
        const patterns = [
          /^\s*([A-Za-z][A-Za-z\s]+?)\s{3,}(\d{1,2}\.\d{3})\s+(\d{1,2}\.\d{3})/,
          /^\s*([A-Za-z][A-Za-z\s]+?)\s{3,}(\d{1,2}\.\d{3})\s+/,
          /^\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d{1,2}\.\d{3})\s+(\d{1,2}\.\d{3})/
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            const variant = match[1].trim();
            const monthlyPrice = match[2];
            
            // Valid variant names
            const validVariants = [
              'Active', 'Pulse', 'Style', 'Executive', 'Premium', 
              'Comfort', 'Active Safety', 'Style Comfort', 'Style Technology', 
              'Executive SkyView', 'GR Sport', 'Adventure', 'Prestige', 
              'VIP', 'Pure', 'Premium Style', 'Acitve', // Typo in PDF
              'Active Comfort', 'Active Comfort Plus', 'Style Safety'
            ];
            
            if (validVariants.some(v => variant === v || variant.startsWith(v))) {
              // Check if this is a different engine variant by looking back
              let engineInfo = '';
              for (let j = i - 1; j >= Math.max(startLine, i - 10); j--) {
                if (lines[j].match(/\d+-dørs.*\d+\.\d+.*hk|5-dørs.*benzin|5-dørs.*elbil|SUV/)) {
                  engineInfo = lines[j].trim();
                  break;
                }
              }
              
              allCars.push({
                make: 'Toyota',
                model: model,
                variant: variant === 'Acitve' ? 'Active' : variant,
                engineInfo: engineInfo,
                monthlyPrice: monthlyPrice,
                priceNum: parseInt(monthlyPrice.replace('.', ''))
              });
              
              console.log(`  ✅ ${variant} - ${monthlyPrice} kr/md`);
              break; // Don't match same line multiple times
            }
          }
        }
      }
    }
    
    // Display final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS - ALL TOYOTA VARIANTS');
    console.log('='.repeat(60) + '\n');
    
    let count = 0;
    for (const model of models) {
      const modelCars = allCars.filter(c => c.model === model);
      if (modelCars.length > 0) {
        console.log(`${model} (${modelCars.length} variants):`);
        modelCars.forEach(car => {
          count++;
          console.log(`  ${count}. ${car.variant} - ${car.monthlyPrice} kr/md`);
        });
        console.log('');
      }
    }
    
    console.log('='.repeat(60));
    console.log(`✅ TOTAL: ${allCars.length} variants found`);
    
    if (allCars.length === 27) {
      console.log('🎉 SUCCESS! Found all 27 variants!');
    } else if (allCars.length < 27) {
      console.log(`⚠️  Missing ${27 - allCars.length} variants`);
      console.log('\nSearching for additional patterns...\n');
      
      // Look for any price patterns we might have missed
      const allPrices = [];
      for (let i = 0; i < lines.length; i++) {
        const priceMatch = lines[i].match(/\b(\d{1,2}\.\d{3})\s+kr\.?\/?md/);
        if (priceMatch) {
          allPrices.push({
            line: i,
            price: priceMatch[1],
            context: lines[i].substring(0, 50)
          });
        }
      }
      
      console.log(`Found ${allPrices.length} total price entries in PDF`);
    }
    
    // Save complete data
    const output = {
      extractionDate: new Date().toISOString(),
      source: 'Toyota Privatleasing Prisliste - 27. MAJ 2025',
      expectedCount: 27,
      actualCount: allCars.length,
      models: models,
      vehicles: allCars
    };
    
    const outputFile = join(__dirname, '../toyota-all-27-variants.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n💾 Data saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findAll27Variants().catch(console.error);