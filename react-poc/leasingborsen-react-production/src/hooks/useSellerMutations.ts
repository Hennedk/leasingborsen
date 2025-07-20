// Re-export admin Edge Function-based hooks for backward compatibility
export { 
  useCreateSeller, 
  useUpdateSeller, 
  useDeleteSeller, 
  useBulkDeleteSellers,
  useAdminSellerOperations
} from './useAdminSellerOperations'

import type { SellerPDFUrl } from './useSellers'

export interface CreateSellerData {
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  country?: string
  logo_url?: string
  pdf_url?: string
  pdf_urls?: SellerPDFUrl[]
  make_id?: string
}

export interface UpdateSellerData extends Partial<CreateSellerData> {
  id: string
}

// Legacy interfaces maintained for compatibility
export type { Seller } from './useSellers'