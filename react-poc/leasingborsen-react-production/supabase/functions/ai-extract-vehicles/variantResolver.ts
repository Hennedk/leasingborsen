// Variant resolver for matching extracted vehicles to existing inventory

import type { 
  CompactExtractedVehicle, 
  VariantResolution,
  ExtractionContext 
} from './types.ts'

export class VariantResolver {
  private existingListings: Map<string, any[]> = new Map()
  
  constructor(private context: ExtractionContext) {
    // Index existing listings by make-model for faster lookup
    if (context.existingListings?.existing_listings) {
      for (const listing of context.existingListings.existing_listings) {
        const key = `${listing.make}-${listing.model}`.toLowerCase()
        if (!this.existingListings.has(key)) {
          this.existingListings.set(key, [])
        }
        this.existingListings.get(key)!.push(listing)
      }
    }
  }
  
  async resolveVariant(vehicle: CompactExtractedVehicle): Promise<VariantResolution> {
    // Try to match against existing inventory first
    const existingMatch = this.findExistingMatch(vehicle)
    if (existingMatch) {
      return existingMatch
    }
    
    // Try to match against reference data
    const referenceMatch = this.findReferenceMatch(vehicle)
    if (referenceMatch) {
      return referenceMatch
    }
    
    // No match found - this is an inferred variant
    return {
      source: 'inferred',
      confidence: 0.5,
      reason: 'No matching variant found in existing inventory or reference data',
      suggestedVariant: vehicle.variant
    }
  }
  
  private findExistingMatch(vehicle: CompactExtractedVehicle): VariantResolution | null {
    const key = `${vehicle.make}-${vehicle.model}`.toLowerCase()
    const candidates = this.existingListings.get(key) || []
    
    if (candidates.length === 0) {
      return null
    }
    
    // Find best match based on multiple criteria
    let bestMatch: any = null
    let bestScore = 0
    const matchCriteria: string[] = []
    
    for (const candidate of candidates) {
      let score = 0
      const criteria: string[] = []
      
      // Exact variant name match (highest priority)
      if (candidate.variant.toLowerCase() === vehicle.variant.toLowerCase()) {
        score += 1.0
        criteria.push('exact_variant_match')
      }
      
      // Horsepower match (critical for variant identification - Step 1: ±5 HP rule)
      if (vehicle.hp && candidate.horsepower) {
        const hpDiff = Math.abs(vehicle.hp - candidate.horsepower)
        if (hpDiff === 0) {
          score += 0.4  // Increased weight for exact HP match
          criteria.push('exact_hp_match')
        } else if (hpDiff <= 5) {
          score += 0.35  // High weight for ±5 HP match (Step 1 rule)
          criteria.push('close_hp_match_within_5')
        } else if (hpDiff <= 10) {
          score += 0.1  // Lower weight for 6-10 HP difference
          criteria.push('moderate_hp_match')
        }
        // >10 HP difference gets no score (Step 2 rule)
      }
      
      // Variant similarity check
      const variantSimilarity = this.calculateVariantSimilarity(
        vehicle.variant.toLowerCase(),
        candidate.variant.toLowerCase()
      )
      if (variantSimilarity > 0.8) {
        score += variantSimilarity * 0.3
        criteria.push('high_variant_similarity')
      }
      
      // Transmission match
      const vehicleTransmission = vehicle.tr === 1 ? 'Automatic' : 'Manual'
      if (candidate.transmission === vehicleTransmission) {
        score += 0.1
        criteria.push('transmission_match')
      }
      
      // Fuel type match
      const fuelTypeMap: Record<number, string> = {
        1: 'Electric',
        2: 'Hybrid - Petrol',
        3: 'Petrol',
        4: 'Diesel',
        5: 'Hybrid - Diesel',
        6: 'Plug-in - Petrol',
        7: 'Plug-in - Diesel'
      }
      if (candidate.fuel_type === fuelTypeMap[vehicle.ft]) {
        score += 0.1
        criteria.push('fuel_type_match')
      }
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = candidate
        matchCriteria.length = 0
        matchCriteria.push(...criteria)
      }
    }
    
    // Only consider it a match if confidence is high enough
    // Lower threshold to 0.7 to catch more matches per Step 1 rules
    if (bestScore >= 0.7 && matchCriteria.includes('close_hp_match_within_5')) {
      return {
        source: 'existing',
        confidence: Math.min(bestScore, 1.0),
        matchDetails: {
          matchedId: bestMatch.id || bestMatch.listing_id,
          matchScore: bestScore,
          matchCriteria
        },
        suggestedVariant: bestMatch.variant,
        reason: `Matched to existing listing with ${matchCriteria.join(', ')}`
      }
    } else if (bestScore >= 0.8) {
      // Keep original threshold for other matches
      return {
        source: 'existing',
        confidence: Math.min(bestScore, 1.0),
        matchDetails: {
          matchedId: bestMatch.id || bestMatch.listing_id,
          matchScore: bestScore,
          matchCriteria
        },
        suggestedVariant: bestMatch.variant,
        reason: `Matched to existing listing with ${matchCriteria.join(', ')}`
      }
    }
    
    return null
  }
  
  private findReferenceMatch(vehicle: CompactExtractedVehicle): VariantResolution | null {
    // Check against reference data if provided
    if (!this.context.referenceData?.makes_models) {
      return null
    }
    
    const makeModels = this.context.referenceData.makes_models
    const makeData = makeModels[vehicle.make]
    
    if (!makeData || !makeData.models) {
      return null
    }
    
    const modelData = makeData.models[vehicle.model]
    if (!modelData || !modelData.variants) {
      return null
    }
    
    // Look for variant in reference data
    for (const refVariant of modelData.variants) {
      if (this.isVariantMatch(vehicle.variant, refVariant)) {
        return {
          source: 'reference',
          confidence: 0.9,
          matchDetails: {
            matchScore: 0.9,
            matchCriteria: ['reference_data_match']
          },
          suggestedVariant: refVariant,
          reason: 'Matched to reference database variant'
        }
      }
    }
    
    return null
  }
  
  private calculateVariantSimilarity(variant1: string, variant2: string): number {
    // Normalize variants for comparison
    const normalize = (v: string) => v
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/automatik|automatic|aut\./gi, '')
      .replace(/manuel|manual/gi, '')
      .trim()
    
    const v1 = normalize(variant1)
    const v2 = normalize(variant2)
    
    if (v1 === v2) return 1.0
    
    // Check if one contains the other
    if (v1.includes(v2) || v2.includes(v1)) {
      return 0.9
    }
    
    // Token-based similarity
    const tokens1 = v1.split(' ')
    const tokens2 = v2.split(' ')
    const commonTokens = tokens1.filter(t => tokens2.includes(t))
    
    return commonTokens.length / Math.max(tokens1.length, tokens2.length)
  }
  
  private isVariantMatch(extracted: string, reference: string): boolean {
    const similarity = this.calculateVariantSimilarity(extracted, reference)
    return similarity >= 0.8
  }
  
  // Check if a new variant should be created based on Step 2 rules
  shouldCreateNewVariant(vehicle: CompactExtractedVehicle, existingListings: any[]): boolean {
    const key = `${vehicle.make}-${vehicle.model}`.toLowerCase()
    const candidates = this.existingListings.get(key) || []
    
    if (candidates.length === 0) {
      return true // No existing listings for this make/model
    }
    
    // Check each existing listing
    for (const candidate of candidates) {
      // Step 2: Check if this is truly different
      
      // 1. HP difference <= 10 means it's the same variant (use existing)
      if (vehicle.hp && candidate.horsepower) {
        const hpDiff = Math.abs(vehicle.hp - candidate.horsepower)
        if (hpDiff <= 10) {
          // Check if it's just equipment differences
          const hasEquipmentSuffix = vehicle.variant.includes(' – ')
          const existingHasEquipment = candidate.variant.includes(' – ')
          
          if (hasEquipmentSuffix && !existingHasEquipment) {
            // This is base variant with added equipment - create new
            return true
          }
          
          // Otherwise, it's the same variant - don't create new
          return false
        }
      }
      
      // 2. Check fuel type difference
      const fuelTypeMap: Record<number, string> = {
        1: 'Electric',
        2: 'Hybrid - Petrol',
        3: 'Petrol',
        4: 'Diesel',
        5: 'Hybrid - Diesel',
        6: 'Plug-in - Petrol',
        7: 'Plug-in - Diesel'
      }
      
      if (candidate.fuel_type !== fuelTypeMap[vehicle.ft]) {
        return true // Different fuel type
      }
      
      // 3. Check transmission type (if significantly different)
      const vehicleTransmission = vehicle.tr === 1 ? 'Automatic' : 'Manual'
      if (candidate.transmission !== vehicleTransmission) {
        // Only create new if the variant name doesn't already handle this
        const variantHandlesTransmission = 
          candidate.variant.toLowerCase().includes('automatik') ||
          candidate.variant.toLowerCase().includes('aut.') ||
          candidate.variant.toLowerCase().includes('manual')
        
        if (!variantHandlesTransmission) {
          return true // Transmission difference warrants new variant
        }
      }
      
      // 4. Check drivetrain differences (AWD vs RWD vs FWD)
      const hasDrivetrainDiff = 
        (vehicle.variant.includes('AWD') && !candidate.variant.includes('AWD')) ||
        (vehicle.variant.includes('4WD') && !candidate.variant.includes('4WD')) ||
        (vehicle.variant.includes('RWD') && !candidate.variant.includes('RWD'))
      
      if (hasDrivetrainDiff) {
        return true
      }
    }
    
    // If we get here, create new variant
    return true
  }
  
  // Batch resolve for performance
  async resolveVariants(vehicles: CompactExtractedVehicle[]): Promise<Map<number, VariantResolution>> {
    const resolutions = new Map<number, VariantResolution>()
    
    for (let i = 0; i < vehicles.length; i++) {
      const resolution = await this.resolveVariant(vehicles[i])
      resolutions.set(i, resolution)
    }
    
    return resolutions
  }
  
  // Get statistics for monitoring
  getResolutionStats(resolutions: Map<number, VariantResolution>): {
    total: number
    existing: number
    reference: number
    inferred: number
    inferenceRate: number
    avgConfidence: number
  } {
    let existing = 0
    let reference = 0
    let inferred = 0
    let totalConfidence = 0
    
    for (const resolution of resolutions.values()) {
      switch (resolution.source) {
        case 'existing':
          existing++
          break
        case 'reference':
          reference++
          break
        case 'inferred':
          inferred++
          break
      }
      totalConfidence += resolution.confidence
    }
    
    const total = resolutions.size
    
    return {
      total,
      existing,
      reference,
      inferred,
      inferenceRate: total > 0 ? inferred / total : 0,
      avgConfidence: total > 0 ? totalConfidence / total : 0
    }
  }
}