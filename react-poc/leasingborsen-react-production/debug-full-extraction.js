#!/usr/bin/env node

// Debug the full VW extraction process to see why we get 8 instead of 15 listings

// Mock VWPDFExtractor class in JavaScript
class VWPDFExtractor {
  constructor() {
    this.patterns = {
      modelHeader: /^(.+?)\s+leasingpriser$/,
      variantLine: /^(.+?)\s+(\d+)\s+hk$|^(.+?)\s+\d+\s*kW\s*\((\d+)\s+hk\)$/,
      co2Specs: /CO₂:\s*(\d+)\s*g\/km.*?Forbrug:\s*([\d,]+)\s*km\/l.*?ejerafgift\s*:\s*(\d+)\s*kr\./,
      electricSpecs: /Rækkevidde:\s*(\d+)\s*km.*?Forbrug:\s*([\d,]+)\s*kWh\/100km/,
      pricingLine: /^(\d{1,2}[.,]?\d{3})\s*km\/år(\d+)\s*mdr\.(.+?)(\d{1,3}[.,]?\d{3})\s*kr\.$/,
      tableHeader: /^Kørselsbehov.*Månedlig\s+ydelse$/
    }
  }

  extractVWModels(pdfText) {
    const lines = pdfText.split('\n').map(line => line.trim())
    const modelSections = this.splitIntoModelSections(lines)
    const results = []
    
    console.log(`🔍 Found ${modelSections.length} model sections\n`)
    
    for (const section of modelSections) {
      console.log(`📋 Processing section: ${section.model}`)
      const sectionResults = this.extractFromModelSection(section)
      console.log(`   → Found ${sectionResults.length} variants in this section`)
      results.push(...sectionResults)
    }
    
    console.log(`\n📊 Total variants extracted: ${results.length}`)
    
    // Calculate total listings (each variant should create multiple listings)
    let totalListings = 0
    results.forEach((result, i) => {
      console.log(`\n🚗 Variant ${i + 1}: ${result.model} ${result.variant}`)
      console.log(`   Horsepower: ${result.horsepower} hk`)
      console.log(`   Pricing options: ${result.pricing_options.length}`)
      result.pricing_options.forEach((pricing, j) => {
        console.log(`     ${j + 1}. ${pricing.mileage_per_year} km/år → ${pricing.monthly_price} kr/month`)
      })
      totalListings += result.pricing_options.length
    })
    
    console.log(`\n🎯 Total expected listings: ${totalListings}`)
    return results
  }

  splitIntoModelSections(lines) {
    const sections = []
    let currentSection = null
    
    lines.forEach((line, index) => {
      const modelMatch = line.match(this.patterns.modelHeader)
      
      if (modelMatch) {
        if (currentSection) {
          sections.push(currentSection)
        }
        
        currentSection = {
          model: modelMatch[1]?.trim() || 'Unknown Model',
          lines: [line],
          startIndex: index
        }
      } else if (currentSection) {
        currentSection.lines.push(line)
      }
    })
    
    if (currentSection) {
      sections.push(currentSection)
    }
    
    return sections
  }

  extractFromModelSection(section) {
    const results = []
    const lines = section.lines
    
    let currentVariant = null
    let currentSpecs = {}
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = section.startIndex + i + 1
      
      // Check for variant line
      const variantMatch = line.match(this.patterns.variantLine)
      if (variantMatch) {
        // Save previous variant if exists
        if (currentVariant && currentVariant.pricing_options && currentVariant.pricing_options.length > 0) {
          results.push(this.completeVariant(currentVariant, section.model))
        }
        
        // Start new variant - handle both patterns
        const variant = variantMatch[1]?.trim() || variantMatch[3]?.trim() || 'Unknown Variant'
        const horsepower = parseInt(variantMatch[2] || variantMatch[4] || '0')
        
        currentVariant = {
          model: section.model,
          variant,
          horsepower,
          pricing_options: [],
          line_numbers: [lineNumber],
          source_section: `${section.model} Section`
        }
        currentSpecs = {}
        continue
      }
      
      // Check for CO₂ specs
      const co2Match = line.match(this.patterns.co2Specs)
      if (co2Match && currentVariant) {
        currentSpecs.co2_emission = parseInt(co2Match[1] || '0')
        currentSpecs.fuel_consumption = co2Match[2]?.replace(',', '.') || '0'
        currentSpecs.co2_tax_half_year = parseInt(co2Match[3] || '0')
        currentSpecs.is_electric = false
        currentVariant.line_numbers?.push(lineNumber)
        continue
      }
      
      // Check for electric specs
      const electricMatch = line.match(this.patterns.electricSpecs)
      if (electricMatch && currentVariant) {
        currentSpecs.range_km = parseInt(electricMatch[1] || '0')
        currentSpecs.fuel_consumption = (electricMatch[2]?.replace(',', '.') || '0') + ' kWh/100km'
        currentSpecs.is_electric = true
        currentVariant.line_numbers?.push(lineNumber)
        continue
      }
      
      // Skip table headers
      if (line.match(this.patterns.tableHeader)) {
        continue
      }
      
      // Check for pricing line
      const pricingMatch = this.parsePricingLine(line)
      if (pricingMatch && currentVariant) {
        currentVariant.pricing_options?.push(pricingMatch)
        currentVariant.line_numbers?.push(lineNumber)
        continue
      }
    }
    
    // Save final variant
    if (currentVariant && currentVariant.pricing_options && currentVariant.pricing_options.length > 0) {
      results.push(this.completeVariant(currentVariant, section.model))
    }
    
    // Apply specs to all variants in this section
    return results.map(result => ({ ...result, ...currentSpecs }))
  }

  parsePricingLine(line) {
    const pricePattern = /^(\d{1,2}[.,]?\d{3})\s*km\/år(\d+)\s*mdr\.(.+?)(\d{1,3}[.,]?\d{3})\s*kr\.$/
    const match = line.match(pricePattern)
    
    if (!match) return null
    
    const mileage = parseInt(match[1].replace(/[.,]/g, ''))
    const period = parseInt(match[2])
    const priceSection = match[3]
    const monthlyPrice = parseInt(match[4].replace(/[.,]/g, ''))
    
    // Extract remaining prices from the middle section
    const prices = priceSection.match(/(\d{1,3}[.,]?\d{3})\s*kr\./g)
    
    if (!prices || prices.length < 3) return null
    
    const totalCost = parseInt(prices[0].replace(/[^\d]/g, ''))
    const minPrice = parseInt(prices[1].replace(/[^\d]/g, ''))
    const deposit = parseInt(prices[2].replace(/[^\d]/g, ''))
    
    return {
      mileage_per_year: mileage,
      period_months: period,
      total_cost: totalCost,
      min_price_12_months: minPrice,
      deposit: deposit,
      monthly_price: monthlyPrice
    }
  }

  completeVariant(partial, model) {
    const confidence = this.calculateConfidence(partial)
    
    return {
      model: model,
      variant: partial.variant || 'Unknown Variant',
      horsepower: partial.horsepower || 0,
      co2_emission: partial.co2_emission,
      fuel_consumption: partial.fuel_consumption,
      co2_tax_half_year: partial.co2_tax_half_year,
      is_electric: partial.is_electric || false,
      range_km: partial.range_km,
      pricing_options: partial.pricing_options || [],
      line_numbers: partial.line_numbers || [],
      confidence_score: confidence,
      source_section: partial.source_section || ''
    }
  }

  calculateConfidence(variant) {
    let score = 0
    const weights = {
      has_model: 0.2,
      has_variant: 0.2,
      has_horsepower: 0.15,
      has_pricing: 0.25,
      has_specs: 0.1,
      pricing_count: 0.1
    }
    
    if (variant.model) score += weights.has_model
    if (variant.variant) score += weights.has_variant
    if (variant.horsepower && variant.horsepower > 0) score += weights.has_horsepower
    if (variant.pricing_options && variant.pricing_options.length > 0) {
      score += weights.has_pricing
      score += Math.min(variant.pricing_options.length / 4, 1) * weights.pricing_count
    }
    if (variant.co2_emission || variant.range_km) score += weights.has_specs
    
    return Math.round(score * 100) / 100
  }
}

// Sample VW PDF text
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

ID.Buzz leasingpriser

Pro Lang 150 kW (204 hk)
Rækkevidde: 421 km | Forbrug: 20,5 kWh/100km

10.000 km/år12 mdr.72.540 kr.72.540 kr.5.000 kr.5.495 kr.
15.000 km/år12 mdr.74.940 kr.74.940 kr.5.000 kr.5.695 kr.
20.000 km/år12 mdr.77.340 kr.77.340 kr.5.000 kr.5.895 kr.

Pro Kort 150 kW (204 hk)
Rækkevidde: 423 km | Forbrug: 20,3 kWh/100km

10.000 km/år12 mdr.69.540 kr.69.540 kr.5.000 kr.5.295 kr.
15.000 km/år12 mdr.71.940 kr.71.940 kr.5.000 kr.5.495 kr.
20.000 km/år12 mdr.74.340 kr.74.340 kr.5.000 kr.5.695 kr.

GTX+ Lang 4Motion 250 kW (340 hk)
Rækkevidde: 487 km | Forbrug: 21,8 kWh/100km

10.000 km/år12 mdr.89.540 kr.89.540 kr.5.000 kr.6.795 kr.
15.000 km/år12 mdr.91.940 kr.91.940 kr.5.000 kr.6.995 kr.
20.000 km/år12 mdr.94.340 kr.94.340 kr.5.000 kr.7.195 kr.

GTX+ Kort 4Motion 250 kW (340 hk)
Rækkevidde: 431 km | Forbrug: 22,1 kWh/100km

10.000 km/år12 mdr.86.540 kr.86.540 kr.5.000 kr.6.595 kr.
15.000 km/år12 mdr.88.940 kr.88.940 kr.5.000 kr.6.795 kr.
20.000 km/år12 mdr.91.340 kr.91.340 kr.5.000 kr.6.995 kr.
`;

function runFullExtractionDebug() {
  console.log('🔍 Full VW Extraction Debug');
  console.log('============================\n');
  
  const extractor = new VWPDFExtractor()
  const results = extractor.extractVWModels(SAMPLE_VW_PDF_TEXT)
  
  console.log('\n✅ Extraction Complete!')
  console.log(`📊 Summary: ${results.length} variants found`)
  
  return results
}

runFullExtractionDebug();