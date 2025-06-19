#!/usr/bin/env node

// VW Pattern Matcher Test Script
// Tests the VW extraction engine against known PDF patterns

import { VWPDFExtractor, VW_EXTRACTION_PATTERNS } from './src/lib/extractors/vwPatternMatcher.ts';

// Sample text data from the real VW PDF (based on the analysis)
const SAMPLE_VW_PDF_TEXT = `
T-Roc leasingpriser

R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk
CO₂: 144 g/km | Forbrug: 15,9 km/l | Halvårlig CO₂-ejerafgift : 730 kr.

Kørselsbehov Leasingperiode Totalomkostninger Mindstepris 12 mdr. Depositum Månedlig ydelse
10.000 km/år12 mdr.49.940 kr.49.940 kr.5.000 kr.3.695 kr.
15.000 km/år12 mdr.51.540 kr.51.540 kr.5.000 kr.3.795 kr.
20.000 km/år12 mdr.53.140 kr.53.140 kr.5.000 kr.3.895 kr.

ID.3 leasingpriser

Pro S 150 kW (204 hk)
Rækkevidde: 455 km | Forbrug: 19,2 kWh/100km

Kørselsbehov Leasingperiode Totalomkostninger Mindstepris 12 mdr. Depositum Månedlig ydelse
10.000 km/år12 mdr.67.140 kr.67.140 kr.5.000 kr.5.095 kr.
15.000 km/år12 mdr.69.540 kr.69.540 kr.5.000 kr.5.295 kr.
20.000 km/år12 mdr.71.940 kr.71.940 kr.5.000 kr.5.495 kr.

ID.4 leasingpriser

Pro 150 kW (204 hk)
Rækkevidde: 358 km | Forbrug: 21,3 kWh/100km

10.000 km/år12 mdr.68.340 kr.68.340 kr.5.000 kr.5.195 kr.
15.000 km/år12 mdr.70.740 kr.70.740 kr.5.000 kr.5.395 kr.

Pro Max 210 kW (286 hk)
Rækkevidde: 358 km | Forbrug: 21,8 kWh/100km

10.000 km/år12 mdr.79.140 kr.79.140 kr.5.000 kr.6.095 kr.
15.000 km/år12 mdr.81.540 kr.81.540 kr.5.000 kr.6.295 kr.

Passat Variant leasingpriser

eHybrid R-Line 1.4 TSI DSG6 218 hk
CO₂: 26 g/km | Forbrug: 50,0 km/l | Halvårlig CO₂-ejerafgift : 160 kr.

10.000 km/år12 mdr.56.340 kr.56.340 kr.5.000 kr.4.195 kr.
15.000 km/år12 mdr.58.740 kr.58.740 kr.5.000 kr.4.395 kr.
20.000 km/år12 mdr.61.140 kr.61.140 kr.5.000 kr.4.595 kr.

Tiguan leasingpriser

Elegance 1.5 TSI EVO ACT DSG7 150 hk
CO₂: 149 g/km | Forbrug: 15,4 km/l | Halvårlig CO₂-ejerafgift : 760 kr.

10.000 km/år12 mdr.57.540 kr.57.540 kr.5.000 kr.4.295 kr.
15.000 km/år12 mdr.59.940 kr.59.940 kr.5.000 kr.4.495 kr.
`;

// Test functions
function testPatternMatching() {
  console.log('🧪 Testing VW Pattern Matching Engine\n');
  
  // Test 1: Model Header Pattern
  console.log('📋 Test 1: Model Header Pattern');
  const modelHeaderMatches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.modelHeader)];
  console.log(`Found ${modelHeaderMatches.length} model headers:`);
  modelHeaderMatches.forEach((match, i) => {
    console.log(`  ${i + 1}. "${match[1]}" from line "${match[0]}"`);
  });
  console.log('');

  // Test 2: Variant Line Pattern
  console.log('📋 Test 2: Variant Line Pattern');
  const variantMatches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.variantLine)];
  console.log(`Found ${variantMatches.length} variant lines:`);
  variantMatches.forEach((match, i) => {
    console.log(`  ${i + 1}. Variant: "${match[1]}" | Horsepower: ${match[2]} hk`);
  });
  console.log('');

  // Test 3: CO₂ Specs Pattern
  console.log('📋 Test 3: CO₂ Specs Pattern');
  const co2Matches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.co2Specs)];
  console.log(`Found ${co2Matches.length} CO₂ specs lines:`);
  co2Matches.forEach((match, i) => {
    console.log(`  ${i + 1}. CO₂: ${match[1]} g/km | Consumption: ${match[2]} km/l | Tax: ${match[3]} kr`);
  });
  console.log('');

  // Test 4: Electric Specs Pattern
  console.log('📋 Test 4: Electric Specs Pattern');
  const electricMatches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.electricSpecs)];
  console.log(`Found ${electricMatches.length} electric specs lines:`);
  electricMatches.forEach((match, i) => {
    console.log(`  ${i + 1}. Range: ${match[1]} km | Consumption: ${match[2]} kWh/100km`);
  });
  console.log('');

  // Test 5: Pricing Line Pattern
  console.log('📋 Test 5: Pricing Line Pattern');
  const lines = SAMPLE_VW_PDF_TEXT.split('\n');
  const pricingMatches = [];
  lines.forEach((line, i) => {
    const match = line.match(VW_EXTRACTION_PATTERNS.pricingLine);
    if (match) {
      pricingMatches.push({ match, line, lineNumber: i + 1 });
    }
  });
  console.log(`Found ${pricingMatches.length} pricing lines:`);
  pricingMatches.forEach((item, i) => {
    const [, mileage, period, , monthlyPrice] = item.match;
    console.log(`  ${i + 1}. ${mileage} km/år, ${period} months → ${monthlyPrice} kr/month`);
  });
  console.log('');
}

function testFullExtraction() {
  console.log('🔍 Testing Full VW Extraction Engine\n');
  
  const extractor = new VWPDFExtractor();
  const results = extractor.extractVWModels(SAMPLE_VW_PDF_TEXT);
  
  console.log(`✅ Extracted ${results.length} VW models:`);
  console.log('');
  
  results.forEach((result, i) => {
    console.log(`🚗 Model ${i + 1}: ${result.model}`);
    console.log(`   Variant: ${result.variant}`);
    console.log(`   Horsepower: ${result.horsepower} hk`);
    console.log(`   Electric: ${result.is_electric ? 'Yes' : 'No'}`);
    
    if (result.is_electric && result.range_km) {
      console.log(`   Range: ${result.range_km} km`);
    }
    if (result.co2_emission) {
      console.log(`   CO₂: ${result.co2_emission} g/km`);
    }
    if (result.co2_tax_half_year) {
      console.log(`   CO₂ Tax: ${result.co2_tax_half_year} kr (half year)`);
    }
    
    console.log(`   Pricing Options: ${result.pricing_options.length}`);
    result.pricing_options.forEach((pricing, j) => {
      console.log(`     ${j + 1}. ${pricing.mileage_per_year} km/år, ${pricing.period_months} months → ${pricing.monthly_price} kr/month`);
    });
    
    console.log(`   Confidence Score: ${result.confidence_score}`);
    console.log(`   Source Lines: ${result.line_numbers.join(', ')}`);
    console.log('');
  });
}

function calculateAccuracy() {
  console.log('📊 Calculating Extraction Accuracy\n');
  
  const extractor = new VWPDFExtractor();
  const results = extractor.extractVWModels(SAMPLE_VW_PDF_TEXT);
  
  // Expected results based on sample data
  const expectedModels = ['T-Roc', 'ID.3', 'ID.4', 'Passat Variant', 'Tiguan'];
  const expectedVariants = 6; // Total variants in sample
  const expectedPricingOptions = 15; // Total pricing options
  
  // Calculate accuracy
  const modelsFound = results.length;
  const modelsAccuracy = Math.min(modelsFound / expectedModels.length, 1) * 100;
  
  const totalPricingOptions = results.reduce((sum, result) => sum + result.pricing_options.length, 0);
  const pricingAccuracy = Math.min(totalPricingOptions / expectedPricingOptions, 1) * 100;
  
  const avgConfidence = results.reduce((sum, result) => sum + result.confidence_score, 0) / results.length * 100;
  
  console.log('🎯 Accuracy Results:');
  console.log(`   Models Found: ${modelsFound}/${expectedModels.length} (${modelsAccuracy.toFixed(1)}%)`);
  console.log(`   Total Pricing Options: ${totalPricingOptions}/${expectedPricingOptions} (${pricingAccuracy.toFixed(1)}%)`);
  console.log(`   Average Confidence: ${avgConfidence.toFixed(1)}%`);
  console.log('');
  
  // Check for specific models
  const foundModels = results.map(r => r.model);
  console.log('✅ Models Successfully Extracted:');
  expectedModels.forEach(model => {
    const found = foundModels.includes(model);
    console.log(`   ${found ? '✅' : '❌'} ${model}`);
  });
  console.log('');
  
  // Overall accuracy score
  const overallAccuracy = (modelsAccuracy + pricingAccuracy + avgConfidence) / 3;
  console.log(`🏆 Overall Accuracy Score: ${overallAccuracy.toFixed(1)}%`);
  
  if (overallAccuracy >= 80) {
    console.log('🎉 SUCCESS: Pattern matcher meets 80% accuracy target!');
  } else {
    console.log('⚠️  WARNING: Pattern matcher below 80% accuracy target');
  }
  
  return overallAccuracy;
}

// Run all tests
function runAllTests() {
  console.log('🚀 VW Pattern Matcher Validation Test Suite');
  console.log('===========================================\n');
  
  try {
    testPatternMatching();
    testFullExtraction();
    const accuracy = calculateAccuracy();
    
    console.log('\n🏁 Test Suite Complete!');
    console.log(`Final Accuracy: ${accuracy.toFixed(1)}%`);
    
    return accuracy >= 80;
  } catch (error) {
    console.error('❌ Test Suite Failed:', error);
    return false;
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

export { runAllTests, testPatternMatching, testFullExtraction, calculateAccuracy };