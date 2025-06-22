import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { BatchDetails, BatchReviewState, BulkAction } from '@/types/admin'

/**
 * Centralized state management for VW Batch Review Dashboard
 * 
 * Handles:
 * - Batch data loading and management
 * - Item selection and expansion state
 * - Bulk operations with progress tracking
 * - Error handling and notifications
 */
export const useBatchReviewState = (batchId: string) => {
  const navigate = useNavigate()

  // Core state
  const [state, setState] = useState<BatchReviewState>({
    selectedItems: [],
    expandedItems: new Set(),
    batchDetails: null,
    loading: true,
    error: null,
    processingItems: new Set()
  })

  // Mock data loading - replace with actual API call
  const loadBatchDetails = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockBatchDetails: BatchDetails = {
        batch: {
          id: batchId,
          status: 'pending_review',
          created_at: new Date().toISOString(),
          seller: { name: 'Volkswagen Privatleasing' }
        },
        items: [
          {
            id: '1',
            action: 'new',
            confidence_score: 0.95,
            parsed_data: {
              model: 'ID.3',
              variant: 'Pro Performance',
              horsepower: 204,
              is_electric: true,
              pricing_options: [
                {
                  monthly_price: 4299,
                  mileage_per_year: 15000,
                  period_months: 36,
                  deposit: 0
                }
              ]
            }
          },
          {
            id: '2',
            action: 'update',
            confidence_score: 0.87,
            parsed_data: {
              model: 'Golf',
              variant: 'GTI',
              horsepower: 245,
              pricing_options: [
                {
                  monthly_price: 5199,
                  mileage_per_year: 20000,
                  period_months: 36,
                  deposit: 50000
                }
              ]
            },
            changes: {
              horsepower: { old: 230, new: 245 },
              monthly_price: { old: 4999, new: 5199 }
            }
          }
        ]
      }
      
      setState(prev => ({
        ...prev,
        batchDetails: mockBatchDetails,
        loading: false
      }))
      
    } catch (error) {
      console.error('Failed to load batch details:', error)
      setState(prev => ({
        ...prev,
        error: 'Kunne ikke indlæse batch detaljer',
        loading: false
      }))
    }
  }, [batchId])

  // Load data on mount
  useEffect(() => {
    if (batchId) {
      loadBatchDetails()
    }
  }, [batchId, loadBatchDetails])

  // Selection management
  const toggleItemSelection = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter(id => id !== itemId)
        : [...prev.selectedItems, itemId]
    }))
  }, [])

  const toggleSelectAll = useCallback(() => {
    setState(prev => {
      const allItemIds = prev.batchDetails?.items.map(item => item.id) || []
      const allSelected = allItemIds.length > 0 && 
        allItemIds.every(id => prev.selectedItems.includes(id))
      
      return {
        ...prev,
        selectedItems: allSelected ? [] : allItemIds
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedItems: [] }))
  }, [])

  // Expansion management
  const toggleItemExpansion = useCallback((itemId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedItems)
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId)
      } else {
        newExpanded.add(itemId)
      }
      return { ...prev, expandedItems: newExpanded }
    })
  }, [])

  // Bulk operations
  const executeBulkAction = useCallback(async (action: BulkAction) => {
    if (state.selectedItems.length === 0) {
      toast.error('Vælg mindst en annonce')
      return
    }

    try {
      setState(prev => ({
        ...prev,
        processingItems: new Set(prev.selectedItems)
      }))

      // Simulate API call with progress
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast.success(`${state.selectedItems.length} annoncer ${action === 'approve' ? 'godkendt' : 'afvist'}`)
      
      // Clear selection and processing state
      setState(prev => ({
        ...prev,
        selectedItems: [],
        processingItems: new Set()
      }))

      // Refresh data
      await loadBatchDetails()
      
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error)
      toast.error(`Kunne ikke ${action === 'approve' ? 'godkende' : 'afvise'} annoncer`)
      
      setState(prev => ({
        ...prev,
        processingItems: new Set()
      }))
    }
  }, [state.selectedItems, loadBatchDetails])

  // Computed values
  const statistics = useMemo(() => {
    if (!state.batchDetails) return null

    const items = state.batchDetails.items
    return {
      total: items.length,
      new: items.filter(item => item.action === 'new').length,
      updates: items.filter(item => item.action === 'update').length,
      deletes: items.filter(item => item.action === 'delete').length,
      highConfidence: items.filter(item => item.confidence_score >= 0.9).length,
      lowConfidence: items.filter(item => item.confidence_score < 0.7).length
    }
  }, [state.batchDetails])

  const selectedItemObjects = useMemo(() => {
    if (!state.batchDetails) return []
    return state.batchDetails.items.filter(item => 
      state.selectedItems.includes(item.id)
    )
  }, [state.batchDetails, state.selectedItems])

  // Navigation
  const handleGoBack = useCallback(() => {
    navigate('/admin/listings')
  }, [navigate])

  // Utility functions
  const formatPrice = useCallback((price?: number): string => {
    return price ? `${price.toLocaleString('da-DK')} kr` : '–'
  }, [])

  const getConfidenceColor = useCallback((score: number): string => {
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }, [])

  const getConfidenceLabel = useCallback((score: number): string => {
    if (score >= 0.9) return 'Høj'
    if (score >= 0.7) return 'Mellem'
    return 'Lav'
  }, [])

  return {
    // State
    ...state,
    
    // Statistics
    statistics,
    selectedItemObjects,
    
    // Actions
    toggleItemSelection,
    toggleSelectAll,
    clearSelection,
    toggleItemExpansion,
    executeBulkAction,
    loadBatchDetails,
    handleGoBack,
    
    // Utilities
    formatPrice,
    getConfidenceColor,
    getConfidenceLabel,
    
    // Computed
    hasSelection: state.selectedItems.length > 0,
    isAllSelected: (state.batchDetails?.items?.length || 0) > 0 && 
      state.batchDetails?.items?.every(item => state.selectedItems.includes(item.id)) === true,
    isProcessing: state.processingItems.size > 0
  }
}