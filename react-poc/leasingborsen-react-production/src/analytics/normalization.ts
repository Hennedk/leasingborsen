/**
 * Shared Normalization Utilities for Analytics
 * 
 * Provides consistent data normalization across all analytics modules
 * to ensure stable comparisons, deduplication, and fingerprinting.
 */

/**
 * Core value normalization - the foundation for all other normalizations
 * Converts any value to a stable, comparable form
 */
export function normalizeValue(value: any): string | number | boolean | null {
  if (value == null) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Math.round(value)
  
  if (typeof value === 'string') {
    const trimmedValue = value.toLowerCase().trim()
    
    // Try to convert numeric strings to numbers for consistent comparison
    const asNum = Number(trimmedValue)
    if (Number.isFinite(asNum) && trimmedValue !== '') {
      return asNum
    }
    return trimmedValue
  }
  
  if (Array.isArray(value)) {
    // Normalize array: filter nulls, normalize elements, sort for consistency
    const normalized = value
      .filter(v => v != null)
      .map(v => String(v).toLowerCase().trim())
      .sort()
    return normalized.length > 0 ? normalized.join(',') : null
  }
  
  if (typeof value === 'object') {
    // For complex objects, create stable string representation
    return JSON.stringify(value)
  }
  
  // Convert other types to normalized string
  const asStr = String(value).toLowerCase().trim()
  const asNum = Number(asStr)
  return Number.isFinite(asNum) && asStr !== '' ? asNum : asStr
}

/**
 * Normalize a record of values, filtering out null/undefined results
 * Returns undefined if no valid values remain
 */
export function normalizeRecord(
  record: Record<string, any>, 
  allowedKeys?: string[]
): Record<string, string | number | boolean> | undefined {
  const normalized: Record<string, string | number | boolean> = {}
  
  const keysToProcess = allowedKeys || Object.keys(record)
  
  keysToProcess.forEach(key => {
    if (key in record) {
      const normalizedValue = normalizeValue(record[key])
      if (normalizedValue !== null) {
        normalized[key] = normalizedValue
      }
    }
  })
  
  return Object.keys(normalized).length > 0 ? normalized : undefined
}

/**
 * Create a stable fingerprint from a record of values
 * Useful for session management and deduplication
 */
export function createFingerprint(
  record?: Record<string, any>, 
  allowedKeys?: string[]
): string {
  if (!record || Object.keys(record).length === 0) {
    return ''
  }
  
  const normalized = normalizeRecord(record, allowedKeys)
  if (!normalized) {
    return ''
  }
  
  return Object.keys(normalized)
    .sort()
    .map(key => `${key}:${normalized[key]}`)
    .join('|')
}

/**
 * Create a stable query string representation for URL deduplication
 * Similar to fingerprint but formatted for URL comparison
 */
export function canonicalizeQuery(query?: Record<string, any>): string | undefined {
  if (!query || Object.keys(query).length === 0) {
    return undefined
  }
  
  const normalized = normalizeRecord(query)
  if (!normalized) {
    return undefined
  }
  
  return Object.keys(normalized)
    .sort()
    .map(key => `${key}:${normalized[key]}`)
    .join('|')
}

/**
 * Normalize path for consistent comparison
 */
export function normalizePath(pathname: string): string {
  return pathname
    .toLowerCase()
    .replace(/\/+$/, '') // Remove trailing slashes
    .replace(/^\/+/, '/') // Ensure single leading slash
}

/**
 * Specific normalization for fuel type values
 * Converts various fuel type representations to standard enum values
 */
export function normalizeFuelType(fuelType: string): 'ev' | 'phev' | 'ice' | null {
  const normalized = fuelType.toLowerCase().trim()
  
  if (normalized === 'ev' || normalized === 'bev' || normalized === 'el' || 
      normalized === 'elbil' || normalized.includes('electric')) return 'ev'
  if (normalized.includes('hybrid') || normalized.includes('phev')) return 'phev'
  if (normalized.includes('benzin') || normalized.includes('diesel') || 
      normalized.includes('gasoline') || normalized.includes('petrol')) return 'ice'
  
  return null
}

/**
 * Convert lease score to band
 */
export function normalizeLeaseScoreBand(score: number): 'excellent' | 'good' | 'fair' | 'weak' {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'  
  if (score >= 40) return 'fair'
  return 'weak'
}

/**
 * Sanitize query parameters for analytics tracking
 * Ensures only simple types are included
 */
export function sanitizeQuery(query: Record<string, any>): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {}
  
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (value != null) {
      sanitized[key] = String(value)
    }
  })
  
  return sanitized
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use normalizeValue instead
 */
export const sanitizeFilterValue = normalizeValue