#!/usr/bin/env node

// VW Pattern Matcher Test - JavaScript Version
// Tests the extraction patterns against known VW PDF data

// VW extraction patterns from the TypeScript implementation
const VW_EXTRACTION_PATTERNS = {
  modelHeader: /^(.+?)\s+leasingpriser$/gm,
  variantLine: /^(.+?)\s+(\d+)\s+hk$|^(.+?)\s+\d+\s*kW\s*\((\d+)\s+hk\)$/gm,
  co2Specs: /CO₂:\s*(\d+)\s*g\/km.*?Forbrug:\s*([\d,]+)\s*km\/l.*?ejerafgift\s*:\s*(\d+)\s*kr\./g,
  electricSpecs: /Rækkevidde:\s*(\d+)\s*km.*?Forbrug:\s*([\d,]+)\s*kWh\/100km/g,
  pricingLine: /^(\d{1,2}[.,]?\d{3})\s*km\/år(\d+)\s*mdr\.([\d\s.,kr]+)(\d{1,3}[.,]?\d{3})\s*kr\.$/gm,
  tableHeader: /^Kørselsbehov.*Månedlig\s+ydelse$/gm
};

// Sample text from real VW PDF
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

function testPatterns() {
  console.log('🧪 Testing VW Pattern Matching Engine');
  console.log('=====================================\n');
  
  // Test 1: Model Headers
  console.log('📋 Test 1: Model Header Pattern');
  const modelMatches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.modelHeader)];
  console.log(`Found ${modelMatches.length} model headers:`);
  modelMatches.forEach((match, i) => {
    console.log(`  ${i + 1}. "${match[1]}" from line "${match[0]}"`);
  });
  console.log('');

  // Test 2: Variant Lines
  console.log('📋 Test 2: Variant Line Pattern');
  const variantMatches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.variantLine)];
  console.log(`Found ${variantMatches.length} variant lines:`);
  variantMatches.forEach((match, i) => {
    const variant = match[1]?.trim() || match[3]?.trim() || 'Unknown';
    const horsepower = parseInt(match[2] || match[4] || '0');
    console.log(`  ${i + 1}. Variant: "${variant}" | Horsepower: ${horsepower} hk`);
  });
  console.log('');

  // Test 3: CO₂ Specs
  console.log('📋 Test 3: CO₂ Specs Pattern');
  const co2Matches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.co2Specs)];
  console.log(`Found ${co2Matches.length} CO₂ specs lines:`);
  co2Matches.forEach((match, i) => {
    console.log(`  ${i + 1}. CO₂: ${match[1]} g/km | Consumption: ${match[2]} km/l | Tax: ${match[3]} kr`);
  });
  console.log('');

  // Test 4: Electric Specs
  console.log('📋 Test 4: Electric Specs Pattern');
  const electricMatches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.electricSpecs)];
  console.log(`Found ${electricMatches.length} electric specs lines:`);
  electricMatches.forEach((match, i) => {
    console.log(`  ${i + 1}. Range: ${match[1]} km | Consumption: ${match[2]} kWh/100km`);
  });
  console.log('');

  // Test 5: Pricing Lines
  console.log('📋 Test 5: Pricing Line Pattern');
  const lines = SAMPLE_VW_PDF_TEXT.split('\n');
  let pricingCount = 0;
  lines.forEach((line, i) => {
    const match = line.match(VW_EXTRACTION_PATTERNS.pricingLine);
    if (match) {
      pricingCount++;
      const [, mileage, period, , monthlyPrice] = match;
      console.log(`  ${pricingCount}. ${mileage} km/år, ${period} months → ${monthlyPrice} kr/month`);
    }
  });
  console.log(`Found ${pricingCount} pricing lines total\n`);

  return {
    models: modelMatches.length,
    variants: variantMatches.length,
    co2Specs: co2Matches.length,
    electricSpecs: electricMatches.length,
    pricingLines: pricingCount
  };
}

function calculateAccuracy() {
  console.log('📊 Calculating Extraction Accuracy');
  console.log('==================================\n');
  
  const results = testPatterns();
  
  // Expected results based on sample data
  const expected = {
    models: 5,        // T-Roc, ID.3, ID.4, Passat Variant, Tiguan
    variants: 6,      // R-Line Black, Pro S, Pro, Pro Max, eHybrid R-Line, Elegance
    co2Specs: 3,      // T-Roc, Passat Variant, Tiguan (conventional cars)
    electricSpecs: 3, // ID.3, ID.4 Pro, ID.4 Pro Max (electric cars)
    pricingLines: 14  // Total pricing options across all variants
  };
  
  console.log('🎯 Accuracy Results:');
  console.log(`   Models: ${results.models}/${expected.models} (${Math.min(results.models/expected.models * 100, 100).toFixed(1)}%)`);
  console.log(`   Variants: ${results.variants}/${expected.variants} (${Math.min(results.variants/expected.variants * 100, 100).toFixed(1)}%)`);
  console.log(`   CO₂ Specs: ${results.co2Specs}/${expected.co2Specs} (${Math.min(results.co2Specs/expected.co2Specs * 100, 100).toFixed(1)}%)`);
  console.log(`   Electric Specs: ${results.electricSpecs}/${expected.electricSpecs} (${Math.min(results.electricSpecs/expected.electricSpecs * 100, 100).toFixed(1)}%)`);
  console.log(`   Pricing Lines: ${results.pricingLines}/${expected.pricingLines} (${Math.min(results.pricingLines/expected.pricingLines * 100, 100).toFixed(1)}%)`);
  console.log('');
  
  // Calculate overall accuracy
  const modelAcc = Math.min(results.models/expected.models, 1);
  const variantAcc = Math.min(results.variants/expected.variants, 1);
  const co2Acc = Math.min(results.co2Specs/expected.co2Specs, 1);
  const electricAcc = Math.min(results.electricSpecs/expected.electricSpecs, 1);
  const pricingAcc = Math.min(results.pricingLines/expected.pricingLines, 1);
  
  const overallAccuracy = (modelAcc + variantAcc + co2Acc + electricAcc + pricingAcc) / 5 * 100;
  
  console.log(`🏆 Overall Pattern Accuracy: ${overallAccuracy.toFixed(1)}%`);
  console.log('');
  
  if (overallAccuracy >= 80) {
    console.log('🎉 SUCCESS: Pattern matcher meets 80% accuracy target!');
    console.log('✅ Ready for React UI implementation');
  } else {
    console.log('⚠️  WARNING: Pattern matcher below 80% accuracy target');
    console.log('❌ Patterns need refinement before UI implementation');
  }
  
  return overallAccuracy;
}

// Expected models check
function validateExpectedModels() {
  console.log('✅ Expected VW Models Validation');
  console.log('=================================\n');
  
  const expectedModels = ['T-Roc', 'ID.3', 'ID.4', 'Passat Variant', 'Tiguan'];
  const modelMatches = [...SAMPLE_VW_PDF_TEXT.matchAll(VW_EXTRACTION_PATTERNS.modelHeader)];
  const foundModels = modelMatches.map(match => match[1]);
  
  expectedModels.forEach(model => {
    const found = foundModels.includes(model);
    console.log(`   ${found ? '✅' : '❌'} ${model}`);
  });
  
  const accuracy = foundModels.length / expectedModels.length * 100;
  console.log(`\n📊 Model Detection Rate: ${accuracy}%\n`);
  
  return accuracy >= 80;
}

// Run all tests
function main() {
  console.log('🚀 VW Pattern Matcher Validation');
  console.log('Phase 1 MVP - Volkswagen PDF Processing');
  console.log('========================================\n');
  
  try {
    const accuracy = calculateAccuracy();
    const modelsValid = validateExpectedModels();
    
    console.log('🏁 Test Results Summary:');
    console.log(`   Pattern Accuracy: ${accuracy.toFixed(1)}%`);
    console.log(`   Model Detection: ${modelsValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Ready for Phase 1: ${accuracy >= 80 && modelsValid ? 'YES ✅' : 'NO ❌'}`);
    
    return accuracy >= 80 && modelsValid;
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    return false;
  }
}

// Execute tests
main();