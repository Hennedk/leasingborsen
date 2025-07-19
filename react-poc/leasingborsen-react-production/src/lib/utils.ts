import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Danish number formatting utility
export function formatPrice(price: number | null | undefined): string {
  if (!price) return '–'
  return `${price.toLocaleString('da-DK')} kr/måned`
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