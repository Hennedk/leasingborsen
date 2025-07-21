/**
 * Admin-specific TypeScript interfaces for enhanced type safety
 */

import type { CarListing } from '@/lib/supabase'

// Enhanced listing interface with admin metadata
export interface AdminListing extends CarListing {
  is_draft: boolean
  offer_count: number
  seller_name: string
  missing_fields?: string[]
  created_at: string
  updated_at?: string
  
  // Lease score fields
  retail_price?: number
  lease_score?: number
  lease_score_calculated_at?: string
  lease_score_breakdown?: {
    totalScore: number
    monthlyRateScore: number
    monthlyRatePercent: number
    mileageScore: number
    mileageNormalized: number
    flexibilityScore: number
    pricing_id?: string
    calculation_version?: string
  }
}

// Batch processing interfaces
export interface BatchItem {
  id: string
  action: 'new' | 'update' | 'delete'
  confidence_score: number
  parsed_data: {
    model: string
    variant: string
    horsepower: number
    is_electric?: boolean
    pricing_options?: Array<{
      monthly_price: number
      mileage_per_year: number
      period_months: number
      deposit?: number
    }>
    // Fallback fields for compatibility
    monthly_price?: number
    mileage_per_year?: number
    period_months?: number
  }
  existing_data?: Partial<CarListing>
  changes?: Record<string, { old: any; new: any }>
}

export interface BatchDetails {
  batch: {
    id: string
    status: string
    created_at: string
    seller: { name: string }
  }
  items: BatchItem[]
}

// Admin filter types
export interface AdminFilters {
  seller_id?: string
  status?: 'draft' | 'active' | 'all'
  make_id?: string
  model_id?: string
  created_after?: string
  created_before?: string
}

// Seller reference data
export interface SellerReference {
  id: string
  name: string
  active: boolean
}

// Admin statistics
export interface AdminStats {
  total_listings: number
  draft_listings: number
  active_listings: number
  pending_batches: number
  failed_batches: number
}

// Batch processing state
export interface BatchReviewState {
  selectedItems: string[]
  expandedItems: Set<string>
  batchDetails: BatchDetails | null
  loading: boolean
  error: string | null
  processingItems: Set<string>
}

// Bulk operation types
export type BulkAction = 'approve' | 'reject' | 'delete' | 'retry'

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors?: string[]
}