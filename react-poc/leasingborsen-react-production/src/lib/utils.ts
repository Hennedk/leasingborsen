import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CarListing } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Car ID normalization helper for handling both id and listing_id fields
export function getCarId(car: CarListing): string {
  return car.id || car.listing_id || ''
}

/**
 * Maps URL search params (km/mdr/udb) to internal lease config names
 * and vice versa for consistent lease configuration handling
 */
export const leaseConfigMapping = {
  // URL param -> internal name
  urlToInternal: {
    km: 'selectedMileage',
    mdr: 'selectedTerm', 
    udb: 'selectedDeposit'
  } as const,
  
  // Internal name -> URL param
  internalToUrl: {
    selectedMileage: 'km',
    selectedTerm: 'mdr',
    selectedDeposit: 'udb'
  } as const
}

/**
 * Converts URL search params to internal lease config format
 * Handles the km/mdr/udb -> selectedMileage/selectedTerm/selectedDeposit mapping
 */
export function mapUrlParamsToLeaseConfig(searchParams: Record<string, any>) {
  return {
    selectedMileage: searchParams.km as number | undefined,
    selectedTerm: searchParams.mdr as number | undefined,
    selectedDeposit: searchParams.udb as number | undefined
  }
}

/**
 * Converts internal lease config to URL search params format
 * Handles the selectedMileage/selectedTerm/selectedDeposit -> km/mdr/udb mapping
 */
export function mapLeaseConfigToUrlParams(config: {
  selectedMileage?: number
  selectedTerm?: number
  selectedDeposit?: number
}) {
  return {
    km: config.selectedMileage,
    mdr: config.selectedTerm,
    udb: config.selectedDeposit
  }
}

// Danish number formatting utility
export function formatPrice(price: number | null | undefined): string {
  if (!price) return '–'
  return `${price.toLocaleString('da-DK')} kr./md.`
}

// Danish date formatting utility
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('da-DK')
}

// Generic loading state utility
export function createLoadingArray(length: number) {
  return Array.from({ length }, (_, i) => i)
}

// Danish error messages for consistency
export const errorMessages = {
  fetchError: 'Der opstod en fejl ved hentning af data',
  saveError: 'Kunne ikke gemme ændringerne',
  notFound: 'Ressourcen blev ikke fundet',
  networkError: 'Netværksfejl - prøv igen senere',
  validationError: 'Ugyldige data - kontroller indtastning',
  deleteError: 'Der opstod en fejl ved sletning',
  updateError: 'Der opstod en fejl ved opdatering',
  createError: 'Der opstod en fejl ved oprettelse',
  uploadError: 'Der opstod en fejl ved upload',
  unauthorizedError: 'Du har ikke tilladelse til denne handling',
  generalError: 'Der opstod en fejl ved behandling af anmodningen'
} as const