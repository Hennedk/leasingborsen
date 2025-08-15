/**
 * Filter Translation System
 * 
 * Centralized translation system for filter values to ensure consistent Danish UI labels
 * while maintaining English database values for compatibility.
 * 
 * This system handles:
 * - Body types, fuel types, and transmission translations
 * - Case-insensitive matching with aliases
 * - Bidirectional translation (Database ↔ UI)
 * - Fallback to original value if no translation found
 */

export interface FilterTranslation {
  /** Database value (as stored in database) */
  databaseValue: string
  /** Danish display label for UI */
  displayLabel: string
  /** Alternative database values that map to same display label */
  aliases?: string[]
}

export interface FilterTranslationMap {
  bodyTypes: FilterTranslation[]
  fuelTypes: FilterTranslation[]
  transmissions: FilterTranslation[]
}

/**
 * Comprehensive translation mappings based on actual database values
 * Updated from real database query results and existing configuration
 */
export const FILTER_TRANSLATIONS: FilterTranslationMap = {
  bodyTypes: [
    { databaseValue: 'SUV', displayLabel: 'SUV' },
    { databaseValue: 'Sedan', displayLabel: 'Sedan' },
    { databaseValue: 'Stationcar', displayLabel: 'Stationcar' },
    { databaseValue: 'Station Wagon', displayLabel: 'Stationcar', aliases: ['station wagon'] },
    { databaseValue: 'Hatchback', displayLabel: 'Hatchback' },
    { databaseValue: 'Mikro', displayLabel: 'Mikrobil' },
    { databaseValue: 'Coupe', displayLabel: 'Coupé' },
    { databaseValue: 'Cabriolet', displayLabel: 'Cabriolet' },
    { databaseValue: 'Convertible', displayLabel: 'Cabriolet', aliases: ['convertible'] },
    { databaseValue: 'Crossover (CUV)', displayLabel: 'Crossover' },
    { databaseValue: 'Minibus (MPV)', displayLabel: 'Familiebil (MPV)' }
  ],
  
  fuelTypes: [
    { databaseValue: 'Electric', displayLabel: 'Elektrisk' },
    { databaseValue: 'Elektrisk', displayLabel: 'Elektrisk' }, // Handle existing Danish values
    { databaseValue: 'Benzin', displayLabel: 'Benzin' },
    { databaseValue: 'Petrol', displayLabel: 'Benzin', aliases: ['petrol'] },
    { databaseValue: 'Diesel', displayLabel: 'Diesel' },
    { databaseValue: 'Hybrid', displayLabel: 'Hybrid' },
    { databaseValue: 'Plugin Hybrid', displayLabel: 'Plugin Hybrid' },
    { databaseValue: 'Hybrid - Diesel', displayLabel: 'Hybrid Diesel' },
    { databaseValue: 'Hybrid - Petrol', displayLabel: 'Hybrid Benzin' },
    { databaseValue: 'Plug-in - Diesel', displayLabel: 'Plugin Hybrid Diesel' },
    { databaseValue: 'Plug-in - Petrol', displayLabel: 'Plugin Hybrid Benzin' }
  ],
  
  transmissions: [
    { databaseValue: 'Automatic', displayLabel: 'Automatisk' },
    { databaseValue: 'Automatisk', displayLabel: 'Automatisk' }, // Handle existing Danish values
    { databaseValue: 'Manual', displayLabel: 'Manuel' }
  ]
}

/**
 * Translation cache for performance optimization
 */
const translationCache = new Map<string, string>()

/**
 * Core translation functions with case-insensitive matching and caching
 */
export const filterTranslations = {
  /**
   * Get Danish display label for body type
   */
  getBodyTypeLabel: (databaseValue: string): string => {
    if (!databaseValue) return '–'
    
    const cacheKey = `body:${databaseValue.toLowerCase()}`
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!
    }
    
    const normalizedValue = databaseValue.toLowerCase().trim()
    const translation = FILTER_TRANSLATIONS.bodyTypes.find(t => {
      if (t.databaseValue.toLowerCase() === normalizedValue) return true
      return t.aliases?.some(alias => alias.toLowerCase() === normalizedValue)
    })
    
    const result = translation?.displayLabel ?? databaseValue
    translationCache.set(cacheKey, result)
    return result
  },

  /**
   * Get Danish display label for fuel type
   */
  getFuelTypeLabel: (databaseValue: string): string => {
    if (!databaseValue) return '–'
    
    const cacheKey = `fuel:${databaseValue.toLowerCase()}`
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!
    }
    
    const normalizedValue = databaseValue.toLowerCase().trim()
    const translation = FILTER_TRANSLATIONS.fuelTypes.find(t => {
      if (t.databaseValue.toLowerCase() === normalizedValue) return true
      return t.aliases?.some(alias => alias.toLowerCase() === normalizedValue)
    })
    
    const result = translation?.displayLabel ?? databaseValue
    translationCache.set(cacheKey, result)
    return result
  },

  /**
   * Get Danish display label for transmission
   */
  getTransmissionLabel: (databaseValue: string): string => {
    if (!databaseValue) return '–'
    
    const cacheKey = `transmission:${databaseValue.toLowerCase()}`
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!
    }
    
    const normalizedValue = databaseValue.toLowerCase().trim()
    const translation = FILTER_TRANSLATIONS.transmissions.find(t => {
      if (t.databaseValue.toLowerCase() === normalizedValue) return true
      return t.aliases?.some(alias => alias.toLowerCase() === normalizedValue)
    })
    
    const result = translation?.displayLabel ?? databaseValue
    translationCache.set(cacheKey, result)
    return result
  },

  /**
   * Reverse lookup: Get database value from Danish display label
   */
  getDatabaseValue: (
    category: keyof FilterTranslationMap, 
    displayLabel: string
  ): string => {
    if (!displayLabel) return ''
    
    const normalizedLabel = displayLabel.toLowerCase().trim()
    const translation = FILTER_TRANSLATIONS[category].find(
      t => t.displayLabel.toLowerCase() === normalizedLabel
    )
    
    return translation?.databaseValue ?? displayLabel
  },

  /**
   * Get all body type options for dropdowns/filters
   */
  getAllBodyTypeOptions: () => {
    return FILTER_TRANSLATIONS.bodyTypes
      .filter((t, index, arr) => 
        // Remove duplicates by display label
        arr.findIndex(item => item.displayLabel === t.displayLabel) === index
      )
      .map(t => ({
        value: t.databaseValue,
        label: t.displayLabel,
        name: t.databaseValue // For compatibility with existing interface
      }))
  },

  /**
   * Get all fuel type options for dropdowns/filters
   */
  getAllFuelTypeOptions: () => {
    return FILTER_TRANSLATIONS.fuelTypes
      .filter((t, index, arr) => 
        // Remove duplicates by display label
        arr.findIndex(item => item.displayLabel === t.displayLabel) === index
      )
      .map(t => ({
        value: t.databaseValue,
        label: t.displayLabel,
        name: t.databaseValue // For compatibility with existing interface
      }))
  },

  /**
   * Get all transmission options for dropdowns/filters
   */
  getAllTransmissionOptions: () => {
    return FILTER_TRANSLATIONS.transmissions
      .filter((t, index, arr) => 
        // Remove duplicates by display label
        arr.findIndex(item => item.displayLabel === t.displayLabel) === index
      )
      .map(t => ({
        value: t.databaseValue,
        label: t.displayLabel,
        name: t.databaseValue // For compatibility with existing interface
      }))
  },

  /**
   * Get simplified fuel type options for filters (4 main categories)
   * This groups all hybrid variants under a single "Hybrid" option
   */
  getSimplifiedFuelTypeOptions: () => {
    return [
      { value: 'Electric', label: 'Elektrisk', name: 'Electric' },
      { value: 'Benzin', label: 'Benzin', name: 'Benzin' },
      { value: 'Diesel', label: 'Diesel', name: 'Diesel' },
      { value: 'Hybrid', label: 'Hybrid', name: 'Hybrid' }
    ]
  },

  /**
   * Map database fuel type value to simplified category for filtering
   */
  mapToSimplifiedFuelType: (databaseValue: string): string => {
    if (!databaseValue) return ''
    
    const normalizedValue = databaseValue.toLowerCase().trim()
    
    // Group all hybrid variants under "Hybrid"
    if (normalizedValue.includes('hybrid') || 
        normalizedValue.includes('plugin') || 
        normalizedValue.includes('plug-in')) {
      return 'Hybrid'
    }
    
    // Map electric variants
    if (normalizedValue.includes('electric') || 
        normalizedValue.includes('elektrisk')) {
      return 'Electric'
    }
    
    // Map petrol variants to Benzin
    if (normalizedValue.includes('petrol') || 
        normalizedValue.includes('benzin')) {
      return 'Benzin'
    }
    
    // Keep diesel as is
    if (normalizedValue.includes('diesel')) {
      return 'Diesel'
    }
    
    // Return original value if no match
    return databaseValue
  },

  /**
   * Get all database fuel type values that map to a simplified category
   */
  getDatabaseValuesForSimplifiedFuelType: (simplifiedType: string): string[] => {
    if (simplifiedType === 'Hybrid') {
      return FILTER_TRANSLATIONS.fuelTypes
        .filter(t => {
          const normalized = t.databaseValue.toLowerCase()
          return normalized.includes('hybrid') || 
                 normalized.includes('plugin') || 
                 normalized.includes('plug-in')
        })
        .map(t => t.databaseValue)
    }
    
    if (simplifiedType === 'Electric') {
      return FILTER_TRANSLATIONS.fuelTypes
        .filter(t => {
          const normalized = t.databaseValue.toLowerCase()
          return normalized.includes('electric') || 
                 normalized.includes('elektrisk')
        })
        .map(t => t.databaseValue)
    }
    
    if (simplifiedType === 'Benzin') {
      return FILTER_TRANSLATIONS.fuelTypes
        .filter(t => {
          const normalized = t.databaseValue.toLowerCase()
          return (normalized.includes('petrol') || 
                  normalized.includes('benzin')) &&
                 !normalized.includes('hybrid') &&
                 !normalized.includes('plugin')
        })
        .map(t => t.databaseValue)
    }
    
    if (simplifiedType === 'Diesel') {
      return FILTER_TRANSLATIONS.fuelTypes
        .filter(t => {
          const normalized = t.databaseValue.toLowerCase()
          return normalized.includes('diesel') &&
                 !normalized.includes('hybrid') &&
                 !normalized.includes('plugin')
        })
        .map(t => t.databaseValue)
    }
    
    // Return exact match if not a simplified category
    return [simplifiedType]
  },

  /**
   * Batch translate multiple values for performance
   */
  batchTranslate: (
    category: keyof FilterTranslationMap,
    values: string[]
  ): Array<{ value: string; label: string }> => {
    const translateFn = {
      bodyTypes: filterTranslations.getBodyTypeLabel,
      fuelTypes: filterTranslations.getFuelTypeLabel,
      transmissions: filterTranslations.getTransmissionLabel
    }[category]

    return values.map(value => ({
      value,
      label: translateFn(value)
    }))
  },

  /**
   * Clear translation cache (useful for testing)
   */
  clearCache: () => {
    translationCache.clear()
  },

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats: () => ({
    size: translationCache.size,
    keys: Array.from(translationCache.keys())
  })
}

/**
 * Type definitions for filter options
 */
export interface FilterOption {
  readonly value: string
  readonly label: string
  readonly name: string
}

/**
 * Helper to validate if a value exists in translations
 */
export const isValidFilterValue = (
  category: keyof FilterTranslationMap,
  value: string
): boolean => {
  if (!value) return false
  
  const normalizedValue = value.toLowerCase().trim()
  return FILTER_TRANSLATIONS[category].some(t => {
    if (t.databaseValue.toLowerCase() === normalizedValue) return true
    return t.aliases?.some(alias => alias.toLowerCase() === normalizedValue)
  })
}

/**
 * Get all unmapped values for debugging
 */
export const getUnmappedValues = (
  category: keyof FilterTranslationMap,
  values: string[]
): string[] => {
  return values.filter(value => !isValidFilterValue(category, value))
}