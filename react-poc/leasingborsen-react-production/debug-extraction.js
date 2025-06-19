#!/usr/bin/env node

// Debug VW extraction to see exactly what's being extracted

// VW extraction patterns (updated JavaScript version)
const VW_EXTRACTION_PATTERNS = {
  modelHeader: /^(.+?)\s+leasingpriser$/,
  variantLine: /^(.+?)\s+(\d+)\s+hk$|^(.+?)\s+\d+\s*kW\s*\((\d+)\s+hk\)$/,
  co2Specs: /CO₂:\s*(\d+)\s*g\/km.*?Forbrug:\s*([\d,]+)\s*km\/l.*?ejerafgift\s*:\s*(\d+)\s*kr\./,
  electricSpecs: /Rækkevidde:\s*(\d+)\s*km.*?Forbrug:\s*([\d,]+)\s*kWh\/100km/,
  pricingLine: /^(\d{1,2}[.,]?\d{3})\s*km\/år(\d+)\s*mdr\.(.+?)(\d{1,3}[.,]?\d{3})\s*kr\.$/,
  tableHeader: /^Kørselsbehov.*Månedlig\s+ydelse$/
};

// Sample text from VW PDF
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

function debugExtraction() {
  console.log('🔍 Debugging VW Extraction Process\n');
  
  const lines = SAMPLE_VW_PDF_TEXT.split('\n').map(line => line.trim());
  console.log(`📄 Total lines: ${lines.length}\n`);
  
  // Debug model sections
  console.log('📋 Model Sections:');
  lines.forEach((line, i) => {
    const modelMatch = line.match(VW_EXTRACTION_PATTERNS.modelHeader);
    if (modelMatch) {
      console.log(`  Line ${i + 1}: "${line}" → Model: "${modelMatch[1]}"`);
    }
  });
  
  console.log('\n📋 Variant Lines:');
  lines.forEach((line, i) => {
    const variantMatch = line.match(VW_EXTRACTION_PATTERNS.variantLine);
    if (variantMatch) {
      console.log(`  Line ${i + 1}: "${line}"`);
      const variant = variantMatch[1] || variantMatch[3] || 'Unknown';
      const horsepower = variantMatch[2] || variantMatch[4] || 'Unknown';
      console.log(`    → Variant: "${variant}" | HP: ${horsepower}`);
    }
  });
  
  console.log('\n💰 Pricing Lines:');
  lines.forEach((line, i) => {
    const pricingMatch = line.match(VW_EXTRACTION_PATTERNS.pricingLine);
    if (pricingMatch) {
      console.log(`  Line ${i + 1}: "${line}"`);
      console.log(`    → Mileage: ${pricingMatch[1]} | Period: ${pricingMatch[2]} | Monthly: ${pricingMatch[4]}`);
      console.log(`    → Middle section: "${pricingMatch[3]}"`);
    }
  });
  
  // Count expected vs actual
  const modelHeaders = lines.filter(line => line.match(VW_EXTRACTION_PATTERNS.modelHeader));
  const variants = lines.filter(line => line.match(VW_EXTRACTION_PATTERNS.variantLine));
  const pricingLines = lines.filter(line => line.match(VW_EXTRACTION_PATTERNS.pricingLine));
  
  console.log('\n📊 Summary:');
  console.log(`  Models: ${modelHeaders.length} (expected: 5)`);
  console.log(`  Variants: ${variants.length} (expected: 6)`);
  console.log(`  Pricing Lines: ${pricingLines.length} (expected: 14)`);
  
  // Expected breakdown:
  // T-Roc: 1 variant × 3 pricing = 3 listings
  // ID.3: 1 variant × 3 pricing = 3 listings  
  // ID.4: 2 variants × 2 pricing each = 4 listings
  // Passat Variant: 1 variant × 3 pricing = 3 listings
  // Tiguan: 1 variant × 2 pricing = 2 listings
  // Total expected: 15 listings
  
  const expectedTotal = 3 + 3 + 4 + 3 + 2; // 15 total listings
  console.log(`\n🎯 Expected Total Listings: ${expectedTotal}`);
  console.log(`   Each variant should create multiple listings (one per pricing option)`);
}

debugExtraction();