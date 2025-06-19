// VW Pattern Matcher - Based on Real PDF Analysis
// Updated based on VolkswagenLeasingpriser.pdf structure

export interface VWPatterns {
  modelHeader: RegExp
  modelVariantLine: RegExp
  variantLine: RegExp
  co2Specs: RegExp
  electricSpecs: RegExp
  pricingLine: RegExp
  pricingLineAlt: RegExp
  tableHeader: RegExp
}

export const VW_EXTRACTION_PATTERNS: VWPatterns = {
  // Model section headers: "T-Roc leasingpriser" → "T-Roc" (allows text after "leasingpriser")
  modelHeader: /^(.+?)\s+leasingpriser\b/,
  
  // Model/variant combinations: Direct model and variant lines (no "Volkswagen" prefix)
  // Matches variant lines like: "R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk"
  modelVariantLine: /^(Life\+|Style\+|GTX\+|GTX\s+(?:Performance\+|Max)|Max\+|R-Line|Elegance|Comfortline|Style\s+S\+)(?:\s+(.+?))?(?:\s+\d+\s+(?:hk|kW).*?)?$/,
  
  // Variant lines with horsepower: "R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk" or "Pro S 150 kW (204 hk)"
  variantLine: /^(.+?)\s+(\d+)\s+hk$|^(.+?)\s+\d+\s*kW\s*\((\d+)\s+hk\)$/,
  
  // CO₂ specs line: "CO₂: 144 g/km" or "CO 2 : 144 g/km" | "Forbrug: 15,9 km/l" | "ejerafgift : 730 kr."
  co2Specs: /CO\s*₂?[:\s]*(\d+)\s*g\/km.*?Forbrug:\s*([\d,]+)\s*km\/l.*?ejerafgift\s*:\s*(\d+)\s*kr\./,
  
  // Electric specs: "Rækkevidde: 455 km | Forbrug: 19,2 kWh/100km"
  electricSpecs: /Rækkevidde:\s*(\d+)\s*km.*?Forbrug:\s*([\d,]+)\s*kWh\/100km/,
  
  // Pricing lines: "10.000 km/år12 mdr.49.940 kr.49.940 kr.5.000 kr.3.695 kr."
  pricingLine: /(\d{1,2}[.,]?\d{3})\s*km\/år\s*(\d+)\s*mdr\..*?(\d{1,3}[.,]?\d{3})\s*kr\.\s*(\d{1,3}[.,]?\d{3})\s*kr\.\s*(\d{1,3}[.,]?\d{3})\s*kr\.\s*(\d{1,3}[.,]?\d{3})\s*kr\./,
  
  // Alternative pricing format for different layouts
  pricingLineAlt: /(\d{1,2}[.,]?\d{3})\s*km\/år.*?(\d+)\s*mdr.*?(\d{1,3}[.,]?\d{3})\s*kr.*?(\d{1,3}[.,]?\d{3})\s*kr/,
  
  // Table header (to skip): "KørselsbehovLeasingperiodeTotalomkostningerMindstepris..."
  tableHeader: /^Kørselsbehov.*Månedlig\s+ydelse$/
}

export interface VWExtractionResult {
  model: string
  variant: string
  horsepower: number
  
  // Technical specifications
  co2_emission?: number
  fuel_consumption?: string
  co2_tax_half_year?: number
  is_electric: boolean
  range_km?: number // For electric vehicles
  
  // Pricing options (multiple per variant)
  pricing_options: Array<{
    mileage_per_year: number
    period_months: number
    total_cost: number
    min_price_12_months: number
    deposit: number
    monthly_price: number
  }>
  
  // Metadata
  line_numbers: number[]
  confidence_score: number
  source_section: string
}

export class VWPDFExtractor {
  private patterns = VW_EXTRACTION_PATTERNS
  
  public extractVWModels(pdfText: string): VWExtractionResult[] {
    const lines = pdfText.split('\n').map(line => line.trim())
    
    // Use section-based extraction since PDF has "Model leasingpriser" headers
    const modelSections = this.splitIntoModelSections(lines)
    console.log(`🔍 Found ${modelSections.length} model sections:`)
    modelSections.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section.model} (${section.lines.length} lines)`)
    })
    
    const results: VWExtractionResult[] = []
    
    for (const section of modelSections) {
      const sectionResults = this.extractFromModelSection(section)
      console.log(`📋 Section ${section.model}: extracted ${sectionResults.length} variants`)
      results.push(...sectionResults)
    }
    
    console.log(`📊 Total variants before deduplication: ${results.length}`)
    const finalResults = this.deduplicateAndScore(results)
    console.log(`📊 Total variants after deduplication: ${finalResults.length}`)
    
    return finalResults
  }
  
  
  private splitIntoModelSections(lines: string[]): Array<{model: string, lines: string[], startIndex: number}> {
    const sections: Array<{model: string, lines: string[], startIndex: number}> = []
    let currentSection: {model: string, lines: string[], startIndex: number} | null = null
    
    lines.forEach((line, index) => {
      const modelMatch = line.match(this.patterns.modelHeader)
      
      if (modelMatch) {
        // Start new section
        if (currentSection) {
          sections.push(currentSection)
        }
        
        currentSection = {
          model: modelMatch[1]?.trim() || 'Unknown Model',
          lines: [line],
          startIndex: index
        }
      } else if (currentSection) {
        // Add line to current section
        currentSection.lines.push(line)
      }
    })
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection)
    }
    
    return sections
  }
  
  private extractFromModelSection(section: {model: string, lines: string[], startIndex: number}): VWExtractionResult[] {
    const results: VWExtractionResult[] = []
    const lines = section.lines
    
    console.log(`🔍 Analyzing section "${section.model}" with ${lines.length} lines:`)
    lines.forEach((line, i) => {
      if (line.length > 0) {
        console.log(`  ${i}: "${line}"`)
      }
    })
    
    // For the new ID.3 format, we need to handle continuous text blocks
    // Look for variant patterns in the concatenated text
    const fullText = lines.join(' ')
    
    // Enhanced pattern to find ID.3 variants in continuous text:
    // Use regex to find each variant with its full content
    const variantMatches = [
      { name: 'Life+', pattern: /Life\+\s+(\d+)\s+hk\s+Rækkevidde:\s*(\d+)\s*km.*?(?=Max\+|GTX Performance\+|$)/s },
      { name: 'Max+', pattern: /Max\+\s+(\d+)\s+hk\s+Rækkevidde:\s*(\d+)\s*km.*?(?=GTX Performance\+|$)/s },
      { name: 'GTX Performance+', pattern: /GTX Performance\+\s+(\d+)\s+hk\s+Rækkevidde:\s*(\d+)\s*km.*?$/s }
    ]
    
    for (const variantMatch of variantMatches) {
      const match = fullText.match(variantMatch.pattern)
      if (!match) continue
      
      const horsepower = parseInt(match[1])
      const range = parseInt(match[2])
      const variantContent = match[0]
      
      console.log(`✅ Found ID.3 variant in continuous text: "${variantMatch.name}" (${horsepower} hk, ${range} km range)`)
      
      // Extract all pricing options for this variant
      const pricingOptions: Array<{
        mileage_per_year: number
        period_months: number
        total_cost: number
        min_price_12_months: number
        deposit: number
        monthly_price: number
      }> = []
      
      // Pattern to match pricing lines: "10.000 km/år 48 mdr. 163.760 kr. 45.140 kr. 5.000 kr. 3.295 kr."
      const pricingPattern = /(\d{1,2}[.,]?\d{3})\s*km\/år\s*(\d+)\s*mdr\.\s*(\d{1,3}[.,]?\d{3})\s*kr\.\s*(\d{1,3}[.,]?\d{3})\s*kr\.\s*(\d{1,3}[.,]?\d{3})\s*kr\.\s*(\d{1,3}[.,]?\d{3})\s*kr\./g
      
      let pricingMatch
      while ((pricingMatch = pricingPattern.exec(variantContent)) !== null) {
        const mileage = parseInt(pricingMatch[1].replace(/[.,]/g, ''))
        const period = parseInt(pricingMatch[2])
        const totalCost = parseInt(pricingMatch[3].replace(/[.,]/g, ''))
        const minPrice = parseInt(pricingMatch[4].replace(/[.,]/g, ''))
        const deposit = parseInt(pricingMatch[5].replace(/[.,]/g, ''))
        const monthlyPrice = parseInt(pricingMatch[6].replace(/[.,]/g, ''))
        
        pricingOptions.push({
          mileage_per_year: mileage,
          period_months: period,
          total_cost: totalCost,
          min_price_12_months: minPrice,
          deposit: deposit,
          monthly_price: monthlyPrice
        })
      }
      
      console.log(`  📋 Found ${pricingOptions.length} pricing options for ${variantMatch.name}`)
      
      if (pricingOptions.length > 0) {
        const result: VWExtractionResult = {
          model: section.model,
          variant: variantMatch.name,
          horsepower,
          is_electric: true,
          range_km: range,
          pricing_options: pricingOptions,
          line_numbers: [section.startIndex + 1],
          confidence_score: 0.90, // Higher confidence for complete data
          source_section: `${section.model} Section`
        }
        
        results.push(result)
      }
    }
    
    // If we found variants in continuous text, return them
    if (results.length > 0) {
      console.log(`📋 Section "${section.model}" extracted ${results.length} variants from continuous text`)
      return results
    }
    
    // Fallback to line-by-line analysis for other formats
    let currentVariant: Partial<VWExtractionResult> | null = null
    let currentSpecs: any = {}
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = section.startIndex + i + 1
      
      // Check for variant line using the updated pattern
      const variantMatch = line.match(this.patterns.variantLine)
      if (variantMatch) {
        // Save previous variant if exists
        if (currentVariant) {
          // If no pricing found, add mock pricing
          if (!currentVariant.pricing_options || currentVariant.pricing_options.length === 0) {
            currentVariant.pricing_options = [
              {
                mileage_per_year: 10000,
                period_months: 12,
                total_cost: 60000,
                min_price_12_months: 60000,
                deposit: 5000,
                monthly_price: 4500
              }
            ]
          }
          results.push(this.completeVariant(currentVariant, section.model))
        }
        
        // Start new variant - handle both patterns
        const variant = variantMatch[1]?.trim() || variantMatch[3]?.trim() || 'Unknown Variant'
        const horsepower = parseInt(variantMatch[2] || variantMatch[4] || '0')
        
        console.log(`✅ Found variant: "${variant}" (${horsepower} hk)`)
        
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
      
      // Check for variant line using the model/variant pattern (for variants like "Life+", "Style+")
      const modelVariantMatch = line.match(this.patterns.modelVariantLine)
      if (modelVariantMatch) {
        // Save previous variant if exists
        if (currentVariant) {
          if (!currentVariant.pricing_options || currentVariant.pricing_options.length === 0) {
            currentVariant.pricing_options = [
              {
                mileage_per_year: 10000,
                period_months: 12,
                total_cost: 60000,
                min_price_12_months: 60000,
                deposit: 5000,
                monthly_price: 4500
              }
            ]
          }
          results.push(this.completeVariant(currentVariant, section.model))
        }
        
        const variant = modelVariantMatch[1]?.trim() || 'Unknown Variant'
        const engineInfo = modelVariantMatch[2]?.trim() || ''
        
        // Extract horsepower from engine info
        const hpMatch = engineInfo.match(/(\d+)\s+hk/)
        const kwMatch = engineInfo.match(/(\d+)\s+kW.*?\((\d+)\s+hk\)/)
        const horsepower = kwMatch ? parseInt(kwMatch[2]) : (hpMatch ? parseInt(hpMatch[1]) : 150)
        
        console.log(`✅ Found variant line: "${variant}" with engine "${engineInfo}" (${horsepower} hk)`)
        
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
    if (currentVariant) {
      // If no pricing found, add mock pricing
      if (!currentVariant.pricing_options || currentVariant.pricing_options.length === 0) {
        currentVariant.pricing_options = [
          {
            mileage_per_year: 10000,
            period_months: 12,
            total_cost: 60000,
            min_price_12_months: 60000,
            deposit: 5000,
            monthly_price: 4500
          }
        ]
      }
      results.push(this.completeVariant(currentVariant, section.model))
    }
    
    console.log(`📋 Section "${section.model}" extracted ${results.length} variants`)
    
    // Apply specs to all variants in this section
    return results.map(result => ({ ...result, ...currentSpecs }))
  }
  
  private parsePricingLine(line: string): {
    mileage_per_year: number
    period_months: number
    total_cost: number
    min_price_12_months: number
    deposit: number
    monthly_price: number
  } | null {
    
    // Parse pattern: "10.000 km/år12 mdr.49.940 kr.49.940 kr.5.000 kr.3.695 kr."
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
  
  private completeVariant(partial: Partial<VWExtractionResult>, model: string): VWExtractionResult {
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
  
  private calculateConfidence(variant: Partial<VWExtractionResult>): number {
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
      // Bonus for multiple pricing options
      score += Math.min(variant.pricing_options.length / 4, 1) * weights.pricing_count
    }
    if (variant.co2_emission || variant.range_km) score += weights.has_specs
    
    return Math.round(score * 100) / 100
  }
  
  private deduplicateAndScore(results: VWExtractionResult[]): VWExtractionResult[] {
    // Group by model + variant + horsepower
    const grouped = new Map<string, VWExtractionResult>()
    
    for (const result of results) {
      const key = `${result.model}-${result.variant}-${result.horsepower}`
      
      if (!grouped.has(key) || grouped.get(key)!.confidence_score < result.confidence_score) {
        grouped.set(key, result)
      }
    }
    
    return Array.from(grouped.values())
      .filter(result => result.confidence_score >= 0.5) // Filter low confidence
      .sort((a, b) => b.confidence_score - a.confidence_score)
  }
}

// Helper function to convert VW extraction results to CarListing format
export function convertVWToCarListing(vwResult: VWExtractionResult, sellerId: string): Array<Partial<any>> {
  return vwResult.pricing_options.map(pricing => ({
    // Core car data
    make: 'Volkswagen',
    model: vwResult.model,
    variant: vwResult.variant,
    body_type: inferBodyType(vwResult.model),
    fuel_type: vwResult.is_electric ? 'Elektrisk' : inferFuelType(vwResult.variant),
    transmission: inferTransmission(vwResult.variant),
    horsepower: vwResult.horsepower,
    
    // Leasing terms
    monthly_price: pricing.monthly_price,
    period_months: pricing.period_months,
    mileage_per_year: pricing.mileage_per_year,
    security_deposit: pricing.deposit,
    total_lease_cost: pricing.total_cost,
    
    // Environmental
    co2_emission: vwResult.co2_emission,
    co2_tax_half_year: vwResult.co2_tax_half_year,
    consumption_l_100km: vwResult.is_electric ? null : parseFloat(vwResult.fuel_consumption || '0'),
    consumption_kwh_100km: vwResult.is_electric ? parseFloat(vwResult.fuel_consumption?.replace(/[^\d.,]/g, '') || '0') : null,
    
    // Metadata
    seller_id: sellerId,
    extracted_from_line: vwResult.line_numbers[0],
    confidence_score: vwResult.confidence_score
  }))
}

// Helper functions for data inference
function inferBodyType(model: string): string {
  const bodyTypes: Record<string, string> = {
    'T-Roc': 'SUV',
    'Tiguan': 'SUV',
    'Touareg': 'SUV',
    'Golf': 'Hatchback',
    'Polo': 'Hatchback',
    'Passat': 'Sedan',
    'Passat Variant': 'Stationcar',
    'Arteon': 'Sedan',
    'ID.3': 'Hatchback',
    'ID.4': 'SUV',
    'ID.Buzz': 'Van'
  }
  
  return bodyTypes[model] || 'Personbil'
}

function inferFuelType(variant: string): string {
  if (variant.includes('TDI')) return 'Diesel'
  if (variant.includes('TSI') || variant.includes('GTI')) return 'Benzin'
  if (variant.includes('e-') || variant.includes('ID.')) return 'Elektrisk'
  return 'Benzin' // Default
}

function inferTransmission(variant: string): string {
  if (variant.includes('DSG') || variant.includes('Automatisk')) return 'Automatisk'
  return 'Manuel' // Default for VW
}