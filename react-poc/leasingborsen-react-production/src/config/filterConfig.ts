// Filter configuration constants
// Centralized configuration for filter options and constants
import { filterTranslations } from '@/lib/translations/filterTranslations'

export const FILTER_CONFIG = {
  // Popular car makes for priority display
  POPULAR_MAKES: [
    'Volkswagen', 
    'Skoda', 
    'Toyota', 
    'Audi', 
    'Mercedes-Benz', 
    'BMW', 
    'Cupra', 
    'Hyundai', 
    'Kia', 
    'Renault'
  ] as const,

  // Consolidated fuel type options
  FUEL_TYPES: [
    { name: 'Electric', label: 'Elektrisk' },
    { name: 'Benzin', label: 'Benzin' },
    { name: 'Diesel', label: 'Diesel' },
    { name: 'Hybrid', label: 'Hybrid' }
  ],

  // Consolidated body type options
  BODY_TYPES: [
    { name: 'Mikro', label: 'Mikro' },
    { name: 'Stationcar', label: 'Stationcar' },
    { name: 'SUV', label: 'SUV' },
    { name: 'Crossover (CUV)', label: 'Crossover (CUV)' },
    { name: 'Minibus (MPV)', label: 'Minibus (MPV)' },
    { name: 'Sedan', label: 'Sedan' },
    { name: 'Hatchback', label: 'Hatchback' },
    { name: 'Cabriolet', label: 'Cabriolet' },
    { name: 'Coupe', label: 'Coupe' }
  ],

  // Popular body types for progressive disclosure (Danish market preferences)
  POPULAR_BODY_TYPES: [
    'SUV',          // 40%+ market share in Denmark
    'Stationcar',   // Traditional family favorite
    'Hatchback',    // Urban/compact choice
    'Sedan'         // Classic preference
  ] as const,

  // Transmission options with Danish labels
  TRANSMISSION_TYPES: [
    { value: 'Automatic', label: 'Automatisk' },
    { value: 'Manual', label: 'Manuelt' }
  ],

  // Price range configuration
  PRICE: {
    // Price steps for selection (in DKK)
    STEPS: Array.from({ length: 10 }, (_, i) => (i + 1) * 1000),
    // Maximum value for "unlimited" selection
    MAX_VALUE: 9999999,
    // Display label for maximum
    MAX_LABEL: '10.000+ kr'
  },

  // Horsepower range configuration
  HORSEPOWER: {
    // Horsepower steps for selection
    STEPS: [100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800, 1000],
    // Maximum value for "unlimited" selection
    MAX_VALUE: 9999999,
    // Display label for maximum
    MAX_LABEL: '1.000+ hk'
  },

  // Seat number range configuration
  SEATS: {
    // Available seat numbers (1-9)
    RANGE: Array.from({ length: 9 }, (_, i) => i + 1),
    // Default minimum
    DEFAULT_MIN: 1,
    // Default maximum
    DEFAULT_MAX: 9
  }
} as const

// Note: Transmission labels now handled by centralized translation system

// Helper functions for working with filter constants
export const filterHelpers = {
  /**
   * Check if a make is in the popular makes list
   */
  isPopularMake: (makeName: string): boolean => 
    (FILTER_CONFIG.POPULAR_MAKES as readonly string[]).includes(makeName),

  /**
   * Get fuel type label by name
   * @deprecated Use filterTranslations.getFuelTypeLabel instead
   */
  getFuelTypeLabel: (name: string): string => 
    filterTranslations.getFuelTypeLabel(name),

  /**
   * Get body type label by name
   * @deprecated Use filterTranslations.getBodyTypeLabel instead
   */
  getBodyTypeLabel: (name: string): string => 
    filterTranslations.getBodyTypeLabel(name),

  /**
   * Get transmission label
   * @deprecated Use filterTranslations.getTransmissionLabel instead
   */
  getTransmissionLabel: (value: string): string =>
    filterTranslations.getTransmissionLabel(value),

  /**
   * Check if a body type is in the popular list
   */
  isPopularBodyType: (bodyTypeName: string): boolean => 
    (FILTER_CONFIG.POPULAR_BODY_TYPES as readonly string[]).includes(bodyTypeName),

  /**
   * Get popular and remaining body types
   */
  getBodyTypesByPopularity: () => {
    const popular = FILTER_CONFIG.BODY_TYPES.filter(type => 
      (FILTER_CONFIG.POPULAR_BODY_TYPES as readonly string[]).includes(type.name)
    )
    const remaining = FILTER_CONFIG.BODY_TYPES.filter(type => 
      !(FILTER_CONFIG.POPULAR_BODY_TYPES as readonly string[]).includes(type.name)
    )
    return { popular, remaining }
  }
}