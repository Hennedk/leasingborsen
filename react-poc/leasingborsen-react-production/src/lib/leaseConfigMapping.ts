/**
 * Centralized lease configuration parameter mapping and utilities
 * 
 * This module provides a single source of truth for:
 * - Parameter name mapping between legacy (km/mdr/udb) and new (selectedX) formats
 * - Default values for lease configuration
 * - Normalization functions for consistent parameter handling
 */

import type { LeaseConfigSearchParams } from '@/types'

/**
 * Parameter mapping configuration with defaults
 */
export const LEASE_PARAM_MAP = {
  mileage: { 
    new: 'selectedMileage' as const, 
    legacy: 'km' as const, 
    default: 15000 
  },
  term: { 
    new: 'selectedTerm' as const, 
    legacy: 'mdr' as const, 
    default: 36 
  },
  deposit: { 
    new: 'selectedDeposit' as const, 
    legacy: 'udb' as const, 
    default: 0 
  }
} as const

/**
 * Centralized default values for lease configuration
 */
export const LEASE_DEFAULTS = {
  mileage: LEASE_PARAM_MAP.mileage.default,
  term: LEASE_PARAM_MAP.term.default,
  deposit: LEASE_PARAM_MAP.deposit.default
} as const

/**
 * Lease configuration limits for validation
 */
export const LEASE_LIMITS = {
  mileage: { min: 10000, max: 50000 },
  term: { min: 12, max: 60, allowed: [12, 24, 36, 48, 60] },
  deposit: { min: 0, max: 100000 }
} as const

/**
 * Normalizes lease parameters from URL search params or other sources
 * Supports both legacy (km/mdr/udb) and new (selectedX) parameter formats
 * 
 * @param params - Raw parameters object (URLSearchParams, search params, etc.)
 * @param useDefaults - Whether to apply defaults for missing values (default: true)
 * @returns Normalized lease configuration with selectedX format
 */
export function normalizeLeaseParams(
  params: Record<string, unknown> | URLSearchParams, 
  useDefaults: boolean = true
): LeaseConfigSearchParams {
  // Handle URLSearchParams
  const paramObj = params instanceof URLSearchParams 
    ? Object.fromEntries(params.entries())
    : params

  const parseNum = (value: unknown): number | undefined => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'number') return value
    const num = Number.parseInt(String(value), 10)
    return Number.isNaN(num) ? undefined : num
  }

  const result: LeaseConfigSearchParams = {
    selectedMileage: parseNum(paramObj.selectedMileage) ?? parseNum(paramObj.km),
    selectedTerm: parseNum(paramObj.selectedTerm) ?? parseNum(paramObj.mdr),
    selectedDeposit: parseNum(paramObj.selectedDeposit) ?? parseNum(paramObj.udb),
  }

  // Apply defaults if requested and values are missing
  if (useDefaults) {
    result.selectedMileage = result.selectedMileage ?? LEASE_DEFAULTS.mileage
    result.selectedTerm = result.selectedTerm ?? LEASE_DEFAULTS.term
    result.selectedDeposit = result.selectedDeposit ?? LEASE_DEFAULTS.deposit
  }

  return result
}

/**
 * Converts internal lease config to legacy URL parameter format
 * Used for backward compatibility and URL generation
 * 
 * @param config - Internal lease configuration
 * @returns Legacy parameter format (km/mdr/udb)
 */
export function mapToLegacyParams(config: LeaseConfigSearchParams): Record<string, number | undefined> {
  return {
    [LEASE_PARAM_MAP.mileage.legacy]: config.selectedMileage,
    [LEASE_PARAM_MAP.term.legacy]: config.selectedTerm,
    [LEASE_PARAM_MAP.deposit.legacy]: config.selectedDeposit
  }
}

/**
 * Converts legacy parameters to internal lease config format
 * 
 * @param params - Legacy parameters (km/mdr/udb)
 * @returns Internal lease configuration format
 */
export function mapFromLegacyParams(params: Record<string, unknown>): LeaseConfigSearchParams {
  return {
    selectedMileage: params[LEASE_PARAM_MAP.mileage.legacy] as number | undefined,
    selectedTerm: params[LEASE_PARAM_MAP.term.legacy] as number | undefined,
    selectedDeposit: params[LEASE_PARAM_MAP.deposit.legacy] as number | undefined,
  }
}

/**
 * Validates a lease configuration value against defined limits
 * 
 * @param key - Configuration key (mileage/term/deposit)
 * @param value - Value to validate
 * @returns Whether the value is valid
 */
export function isValidLeaseValue(key: keyof typeof LEASE_LIMITS, value: number): boolean {
  const limits = LEASE_LIMITS[key]
  
  if (key === 'term') {
    const termLimits = limits as typeof LEASE_LIMITS.term
    return termLimits.allowed.includes(value as any)
  }
  
  return value >= limits.min && value <= limits.max
}

/**
 * Clamps a lease configuration value to valid range
 * 
 * @param key - Configuration key (mileage/term/deposit)
 * @param value - Value to clamp
 * @returns Clamped value within valid range
 */
export function clampLeaseValue(key: keyof typeof LEASE_LIMITS, value: number): number {
  const limits = LEASE_LIMITS[key]
  
  if (key === 'term') {
    // Find closest allowed term value
    const termLimits = limits as typeof LEASE_LIMITS.term
    return termLimits.allowed.reduce((closest, current) => 
      Math.abs(current - value) < Math.abs(closest - value) ? current : closest
    ) as number
  }
  
  return Math.max(limits.min, Math.min(limits.max, value))
}

/**
 * Validates and sanitizes a complete lease configuration
 * 
 * @param config - Lease configuration to validate
 * @param strict - Whether to throw on invalid values or clamp them
 * @returns Validated and potentially corrected configuration
 */
export function validateLeaseConfig(
  config: LeaseConfigSearchParams, 
  strict: boolean = false
): LeaseConfigSearchParams {
  const result: LeaseConfigSearchParams = {}
  
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null) continue
    
    const limitKey = key.replace('selected', '').toLowerCase() as keyof typeof LEASE_LIMITS
    
    if (strict && !isValidLeaseValue(limitKey, value)) {
      throw new Error(`Invalid ${limitKey} value: ${value}`)
    }
    
    result[key as keyof LeaseConfigSearchParams] = clampLeaseValue(limitKey, value)
  }
  
  return result
}