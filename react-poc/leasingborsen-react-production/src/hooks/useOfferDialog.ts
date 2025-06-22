import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { offerSchema, type OfferFormData } from '@/lib/validations'
import { useOffers, useCreateOffer, useDeleteOffer } from '@/hooks/useOffers'

/**
 * useOfferDialog - Business logic for dialog-based offer management
 * 
 * Centralizes offer CRUD operations, form handling, and state management for dialog forms
 */
export const useOfferDialog = (listingId?: string) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Data fetching
  const { data: offers = [], isLoading: offersLoading, error: offersError } = useOffers(listingId || '')
  
  // Mutations
  const createOfferMutation = useCreateOffer()
  const deleteOfferMutation = useDeleteOffer()

  // Form management
  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      monthly_price: undefined,
      first_payment: undefined,
      period_months: 36,
      mileage_per_year: 20000,
    }
  })

  // Helper functions
  const formatPrice = useCallback((price?: number) => 
    price ? `${price.toLocaleString('da-DK')} kr` : '–', [])

  const resetForm = useCallback(() => {
    form.reset()
    setEditingIndex(null)
    setIsAddDialogOpen(false)
  }, [form])

  // CRUD operations
  const handleAddOffer = useCallback(async (data: OfferFormData) => {
    if (!listingId) return
    
    try {
      await createOfferMutation.mutateAsync({ listingId, offer: data })
      resetForm()
    } catch (error) {
      console.error('Failed to create offer:', error)
      throw error
    }
  }, [listingId, createOfferMutation, resetForm])

  const handleEditOffer = useCallback(async (index: number, data: OfferFormData) => {
    const offer = offers[index]
    if (!offer?.id) return
    
    try {
      // Note: Need to implement updateOffer mutation
      console.log('Edit offer:', offer.id, data)
      resetForm()
    } catch (error) {
      console.error('Failed to update offer:', error)
      throw error
    }
  }, [offers, resetForm])

  const handleDeleteOffer = useCallback(async (index: number) => {
    const offer = offers[index]
    if (!offer?.id) return
    
    try {
      await deleteOfferMutation.mutateAsync(offer.id)
    } catch (error) {
      console.error('Failed to delete offer:', error)
      throw error
    }
  }, [offers, deleteOfferMutation])

  const openEditDialog = useCallback((index: number) => {
    const offer = offers[index]
    // Convert database format to form format
    const formData: OfferFormData = {
      monthly_price: offer.monthly_price,
      first_payment: offer.first_payment || undefined,
      period_months: offer.period_months || 36,
      mileage_per_year: offer.mileage_per_year || 20000,
    }
    form.reset(formData)
    setEditingIndex(index)
  }, [offers, form])

  const openAddDialog = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    resetForm()
  }, [resetForm])

  // Computed values
  const isEditing = editingIndex !== null
  const isDialogOpen = isAddDialogOpen || isEditing
  const hasOffers = offers.length > 0
  const isPending = createOfferMutation.isPending || deleteOfferMutation.isPending

  return {
    // Data
    offers,
    offersLoading,
    offersError,
    hasOffers,
    
    // Form
    form,
    
    // State
    isEditing,
    editingIndex,
    isDialogOpen,
    isPending,
    
    // Operations
    handleAddOffer,
    handleEditOffer,
    handleDeleteOffer,
    openEditDialog,
    openAddDialog,
    closeDialog,
    
    // Utilities
    formatPrice
  }
}