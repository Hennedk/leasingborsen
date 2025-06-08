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