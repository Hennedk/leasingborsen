#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function simulateExtractedData() {
  try {
    console.log('🚗 Simulating Extracted Vehicle Data from Toyota PDF');
    console.log('====================================================');
    console.log('Job ID: e9a544d2-0989-4854-b482-d752646ddcee');
    console.log('Processed Items: 50 vehicles');
    console.log('Extraction Method: pattern');
    console.log('');

    // Based on the Edge Function code, here's what the Toyota extraction would produce
    const simulatedExtractedData = {
      method: 'pattern',
      itemsProcessed: 50,
      averageConfidence: 0.85,
      aiCost: 0.00,
      aiTokens: 0,
      extractedItems: [
        // Toyota Yaris variants
        {
          model: 'Yaris',
          variant: 'Active',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 3299,
          extracted_line: 'Yaris Active 10.000 km/år 36 mdr. 3.299 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Yaris Active med komplet udstyr til privat leasing...'
        },
        {
          model: 'Yaris',
          variant: 'Comfort',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 3599,
          extracted_line: 'Yaris Comfort 10.000 km/år 36 mdr. 3.599 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Yaris Comfort med ekstra komfort udstyr...'
        },
        {
          model: 'Yaris',
          variant: 'Style',
          mileage_per_year: 15000,
          period_months: 36,
          monthly_price: 3899,
          extracted_line: 'Yaris Style 15.000 km/år 36 mdr. 3.899 kr/md',
          extraction_method: 'pattern_2',
          context_snippet: 'Toyota Yaris Style med sportslook og ekstra udstyr...'
        },
        
        // Toyota Corolla variants
        {
          model: 'Corolla',
          variant: 'Active',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 4199,
          extracted_line: 'Corolla Active 10.000 km/år 36 mdr. 4.199 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Corolla Active med hybrid teknologi...'
        },
        {
          model: 'Corolla',
          variant: 'Comfort',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 4599,
          extracted_line: 'Corolla Comfort 10.000 km/år 36 mdr. 4.599 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Corolla Comfort med premium interiør...'
        },
        {
          model: 'Corolla',
          variant: 'Executive',
          mileage_per_year: 15000,
          period_months: 36,
          monthly_price: 5199,
          extracted_line: 'Corolla Executive 15.000 km/år 36 mdr. 5.199 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Corolla Executive top udstyret model...'
        },
        
        // Toyota RAV4 variants
        {
          model: 'RAV4',
          variant: 'Active',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 6299,
          extracted_line: 'RAV4 Active 10.000 km/år 36 mdr. 6.299 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota RAV4 Active hybrid SUV med AWD...'
        },
        {
          model: 'RAV4',
          variant: 'Comfort',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 6899,
          extracted_line: 'RAV4 Comfort 10.000 km/år 36 mdr. 6.899 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota RAV4 Comfort med ekstra komfort...'
        },
        {
          model: 'RAV4',
          variant: 'Style',
          mileage_per_year: 15000,
          period_months: 36,
          monthly_price: 7499,
          extracted_line: 'RAV4 Style 15.000 km/år 36 mdr. 7.499 kr/md',
          extraction_method: 'pattern_2',
          context_snippet: 'Toyota RAV4 Style med sportslook og premium udstyr...'
        },
        
        // Toyota C-HR variants
        {
          model: 'C-HR',
          variant: 'Active',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 5199,
          extracted_line: 'C-HR Active 10.000 km/år 36 mdr. 5.199 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota C-HR Active hybrid crossover...'
        },
        {
          model: 'C-HR',
          variant: 'Comfort',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 5699,
          extracted_line: 'C-HR Comfort 10.000 km/år 36 mdr. 5.699 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota C-HR Comfort med ekstra udstyr...'
        },
        
        // Toyota bZ4X (Electric) variants
        {
          model: 'bZ4X',
          variant: 'Active',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 7299,
          extracted_line: 'bZ4X Active 10.000 km/år 36 mdr. 7.299 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota bZ4X Active elektrisk SUV...'
        },
        {
          model: 'bZ4X',
          variant: 'Premium',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 8299,
          extracted_line: 'bZ4X Premium 10.000 km/år 36 mdr. 8.299 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota bZ4X Premium med top udstyr...'
        },
        
        // Toyota Prius variants
        {
          model: 'Prius',
          variant: 'Active',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 4899,
          extracted_line: 'Prius Active 10.000 km/år 36 mdr. 4.899 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Prius Active hybrid med høj brændstofbesparelse...'
        },
        {
          model: 'Prius',
          variant: 'Executive',
          mileage_per_year: 15000,
          period_months: 36,
          monthly_price: 5599,
          extracted_line: 'Prius Executive 15.000 km/år 36 mdr. 5.599 kr/md',
          extraction_method: 'pattern_2',
          context_snippet: 'Toyota Prius Executive med premium udstyr...'
        },
        
        // Toyota Aygo X variants
        {
          model: 'Aygo X',
          variant: 'Active',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 2799,
          extracted_line: 'Aygo X Active 10.000 km/år 36 mdr. 2.799 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Aygo X Active compact bybil...'
        },
        {
          model: 'Aygo X',
          variant: 'Style',
          mileage_per_year: 10000,
          period_months: 36,
          monthly_price: 3099,
          extracted_line: 'Aygo X Style 10.000 km/år 36 mdr. 3.099 kr/md',
          extraction_method: 'pattern_1',
          context_snippet: 'Toyota Aygo X Style med personlig styling...'
        },
        
        // Additional variants to reach 50 items...
        // Different contract lengths and mileage combinations
        {
          model: 'Yaris',
          variant: 'Active',
          mileage_per_year: 20000,
          period_months: 48,
          monthly_price: 3599,
          extracted_line: 'Yaris Active 20.000 km/år 48 mdr. 3.599 kr/md',
          extraction_method: 'pattern_2',
          context_snippet: 'Toyota Yaris Active høj kilometertilladet...'
        },
        {
          model: 'Corolla',
          variant: 'Active',
          mileage_per_year: 20000,
          period_months: 48,
          monthly_price: 4499,
          extracted_line: 'Corolla Active 20.000 km/år 48 mdr. 4.499 kr/md',
          extraction_method: 'pattern_2',
          context_snippet: 'Toyota Corolla Active erhvervsleasing...'
        },
        {
          model: 'RAV4',
          variant: 'Active',
          mileage_per_year: 20000,
          period_months: 48,
          monthly_price: 6799,
          extracted_line: 'RAV4 Active 20.000 km/år 48 mdr. 6.799 kr/md',
          extraction_method: 'pattern_2',
          context_snippet: 'Toyota RAV4 Active erhverv pakke...'
        }
        // ... (continuing to reach 50 total items)
      ]
    };

    // Simulate additional items to reach 50
    const baseModels = ['Yaris', 'Corolla', 'RAV4', 'C-HR', 'bZ4X', 'Prius', 'Aygo X'];
    const variants = ['Active', 'Comfort', 'Style', 'Executive', 'Premium'];
    const mileages = [10000, 15000, 20000];
    const periods = [36, 48, 60];

    let currentCount = simulatedExtractedData.extractedItems.length;
    
    while (currentCount < 50) {
      const model = baseModels[currentCount % baseModels.length];
      const variant = variants[currentCount % variants.length];
      const mileage = mileages[currentCount % mileages.length];
      const period = periods[currentCount % periods.length];
      const basePrice = 2500 + (currentCount * 100);

      simulatedExtractedData.extractedItems.push({
        model: model,
        variant: variant,
        mileage_per_year: mileage,
        period_months: period,
        monthly_price: basePrice,
        extracted_line: `${model} ${variant} ${mileage.toLocaleString()} km/år ${period} mdr. ${basePrice.toLocaleString()} kr/md`,
        extraction_method: `pattern_${(currentCount % 3) + 1}`,
        context_snippet: `Toyota ${model} ${variant} variant ${currentCount + 1}...`
      });
      
      currentCount++;
    }

    // Display the results
    console.log('🎯 EXTRACTED VEHICLE DATA (50 items):');
    console.log('=====================================');
    
    simulatedExtractedData.extractedItems.forEach((vehicle, index) => {
      console.log(`${index + 1}. ${vehicle.model} ${vehicle.variant}`);
      console.log(`   Monthly Price: ${vehicle.monthly_price.toLocaleString('da-DK')} kr/md`);
      console.log(`   Mileage: ${vehicle.mileage_per_year.toLocaleString('da-DK')} km/year`);
      console.log(`   Period: ${vehicle.period_months} months`);
      console.log(`   Extraction Method: ${vehicle.extraction_method}`);
      console.log('');
    });

    // Summary by model
    console.log('\n📊 SUMMARY BY MODEL:');
    console.log('====================');
    const modelSummary = {};
    simulatedExtractedData.extractedItems.forEach(item => {
      if (!modelSummary[item.model]) {
        modelSummary[item.model] = [];
      }
      modelSummary[item.model].push(item);
    });

    Object.entries(modelSummary).forEach(([model, variants]) => {
      console.log(`${model}: ${variants.length} variants`);
      const uniqueVariants = [...new Set(variants.map(v => v.variant))];
      console.log(`  Variants: ${uniqueVariants.join(', ')}`);
      const priceRange = {
        min: Math.min(...variants.map(v => v.monthly_price)),
        max: Math.max(...variants.map(v => v.monthly_price))
      };
      console.log(`  Price range: ${priceRange.min.toLocaleString('da-DK')} - ${priceRange.max.toLocaleString('da-DK')} kr/md`);
      console.log('');
    });

    // Extraction method summary
    console.log('🔧 EXTRACTION METHOD BREAKDOWN:');
    console.log('===============================');
    const methods = {};
    simulatedExtractedData.extractedItems.forEach(item => {
      methods[item.extraction_method] = (methods[item.extraction_method] || 0) + 1;
    });

    Object.entries(methods).forEach(([method, count]) => {
      const percentage = ((count / 50) * 100).toFixed(1);
      console.log(`${method}: ${count} vehicles (${percentage}%)`);
    });

    console.log('\n✅ EXTRACTION SUCCESS SUMMARY:');
    console.log('==============================');
    console.log(`Total vehicles extracted: ${simulatedExtractedData.itemsProcessed}`);
    console.log(`Extraction method: ${simulatedExtractedData.method}`);
    console.log(`Average confidence: ${simulatedExtractedData.averageConfidence}`);
    console.log(`AI cost: $${simulatedExtractedData.aiCost.toFixed(4)}`);
    console.log(`Processing completed in ~1.2 seconds`);
    console.log('');
    console.log('🎉 This is what the extracted data would look like if the Edge Function');
    console.log('   had properly stored the result in the database result column.');

  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
  }
}

simulateExtractedData();