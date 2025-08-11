import { FILTER_CONFIG } from './filterConfig'

interface RangeFilterSchema {
  type: 'range'
  steps: readonly number[]
  formatter?: (value: number) => string
  validation?: {
    min?: number
    max?: number
  }
  labels?: {
    min?: string
    max?: string
    unlimited?: string
  }
}

interface MultiselectFilterSchema {
  type: 'multiselect'
  options: Array<{ name: string; label: string }>
}

type FilterSchemaItem = RangeFilterSchema | MultiselectFilterSchema

/**
 * Configuration-driven filter schema for consistent behavior
 * across desktop and mobile implementations
 */
export const FILTER_SCHEMA = {
  price: {
    type: 'range',
    steps: FILTER_CONFIG.PRICE.STEPS,
    formatter: (value: number) => `${value.toLocaleString('da-DK')} kr`,
    validation: { 
      min: 0, 
      max: FILTER_CONFIG.PRICE.MAX_VALUE 
    },
    labels: {
      min: 'Min',
      max: 'Max', 
      unlimited: FILTER_CONFIG.PRICE.MAX_LABEL
    }
  },
  
  seats: {
    type: 'range',
    steps: FILTER_CONFIG.SEATS.RANGE,
    formatter: (value: number) => `${value} sæder`,
    validation: { 
      min: FILTER_CONFIG.SEATS.DEFAULT_MIN, 
      max: FILTER_CONFIG.SEATS.DEFAULT_MAX 
    },
    labels: {
      min: 'Min',
      max: 'Max',
      unlimited: undefined
    }
  },

  horsepower: {
    type: 'range', 
    steps: FILTER_CONFIG.HORSEPOWER.STEPS as readonly number[],
    formatter: (value: number) => `${value} hk`,
    validation: {
      min: 0,
      max: FILTER_CONFIG.HORSEPOWER.MAX_VALUE
    },
    labels: {
      min: 'Min',
      max: 'Max',
      unlimited: FILTER_CONFIG.HORSEPOWER.MAX_LABEL
    }
  },

  fuel_type: {
    type: 'multiselect',
    options: [...FILTER_CONFIG.FUEL_TYPES]
  },

  body_type: {
    type: 'multiselect', 
    options: [...FILTER_CONFIG.BODY_TYPES]
  },

  transmission: {
    type: 'multiselect',
    options: FILTER_CONFIG.TRANSMISSION_TYPES.map(t => ({ 
      name: t.value, 
      label: t.label 
    }))
  }
} as const satisfies Record<string, FilterSchemaItem>

/**
 * Helper function to get filter schema by key
 */
export const getFilterSchema = <T extends keyof typeof FILTER_SCHEMA>(
  key: T
): typeof FILTER_SCHEMA[T] => {
  return FILTER_SCHEMA[key]
}

/**
 * Type-safe filter keys
 */
export type FilterSchemaKey = keyof typeof FILTER_SCHEMA