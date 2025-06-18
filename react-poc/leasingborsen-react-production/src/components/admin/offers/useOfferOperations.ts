import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useOffers, useCreateOffer, useUpdateOffer, useDeleteOffer } from '@/hooks/useOffers'

export interface EditableOffer {
  id?: string
  monthly_price: string
  first_payment: string
  period_months: string
  mileage_per_year: string
  isNew?: boolean
  isEditing?: boolean
  errors?: Record<string, string>
}

export interface UseOfferOperationsProps {
  listingId?: string
}

export const useOfferOperations = ({ listingId }: UseOfferOperationsProps) => {
  const { data: offers = [], isLoading: offersLoading, error: offersError } = useOffers(listingId || '')
  const createOfferMutation = useCreateOffer()
  const updateOfferMutation = useUpdateOffer()
  const deleteOfferMutation = useDeleteOffer()

  const [editableOffers, setEditableOffers] = useState<EditableOffer[]>([])
  const [lastOffer, setLastOffer] = useState<Partial<EditableOffer> | null>(null)
  const [savingOffers, setSavingOffers] = useState<Set<number>>(new Set())
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Convert database offers to editable format
  useEffect(() => {
    const formattedOffers = offers.map(offer => ({
      id: offer.id,
      monthly_price: offer.monthly_price?.toString() || '',
      first_payment: offer.first_payment?.toString() || '',
      period_months: offer.period_months?.toString() || '',
      mileage_per_year: offer.mileage_per_year?.toString() || '',
      isNew: false,
      isEditing: false,
      errors: {}
    }))

    // Add empty row for new offers
    const newRow: EditableOffer = {
      monthly_price: lastOffer?.monthly_price || '',
      first_payment: lastOffer?.first_payment || '',
      period_months: lastOffer?.period_months || '',
      mileage_per_year: lastOffer?.mileage_per_year || '',
      isNew: true,
      isEditing: false,
      errors: {}
    }

    setEditableOffers([...formattedOffers, newRow])
  }, [offers.length, offers.map(o => o.id).join(',')])

  // Validation function
  const validateField = (field: string, value: string): string | null => {
    if (!value.trim()) {
      if (field === 'monthly_price') return 'Månedspris er påkrævet'
      return null
    }

    const numValue = parseFloat(value)
    if (isNaN(numValue)) return 'Skal være et tal'

    switch (field) {
      case 'monthly_price':
        if (numValue <= 0) return 'Skal være større end 0'
        if (numValue > 50000) return 'Må ikke overstige 50.000'
        break
      case 'first_payment':
        if (numValue < 0) return 'Kan ikke være negativ'
        if (numValue > 500000) return 'Må ikke overstige 500.000'
        break
      case 'period_months':
        if (numValue <= 0) return 'Skal være større end 0'
        if (numValue > 120) return 'Må ikke overstige 120 måneder'
        break
      case 'mileage_per_year':
        if (numValue < 5000) return 'Skal være mindst 5.000'
        if (numValue > 50000) return 'Må ikke overstige 50.000'
        break
    }
    return null
  }

  // Update field value and validate
  const updateField = useCallback((index: number, field: keyof EditableOffer, value: string) => {
    setEditableOffers(prev => prev.map((offer, i) => {
      if (i !== index) return offer
      
      const error = validateField(field, value)
      const updatedErrors = { ...offer.errors }
      
      if (error) {
        updatedErrors[field] = error
      } else {
        delete updatedErrors[field]
      }

      return {
        ...offer,
        [field]: value,
        errors: updatedErrors
      }
    }))
  }, [])

  // Save offer (create or update)
  const saveOffer = useCallback(async (index: number) => {
    const offer = editableOffers[index]
    if (!listingId || !offer) return

    // Prevent duplicate submissions
    if (savingOffers.has(index)) {
      return
    }

    // Validate all fields
    const errors: Record<string, string> = {}
    const fields: (keyof EditableOffer)[] = ['monthly_price', 'first_payment', 'period_months', 'mileage_per_year']
    
    fields.forEach(field => {
      const error = validateField(field, offer[field] as string)
      if (error) errors[field] = error
    })

    // Check required field
    if (!offer.monthly_price.trim()) {
      errors.monthly_price = 'Månedspris er påkrævet'
    }

    if (Object.keys(errors).length > 0) {
      setEditableOffers(prev => prev.map((o, i) => 
        i === index ? { ...o, errors } : o
      ))
      return
    }

    // Mark this offer as being saved
    setSavingOffers(prev => new Set(prev).add(index))

    try {
      const offerData = {
        monthly_price: parseFloat(offer.monthly_price),
        first_payment: offer.first_payment ? parseFloat(offer.first_payment) : undefined,
        period_months: offer.period_months ? parseInt(offer.period_months) : undefined,
        mileage_per_year: offer.mileage_per_year ? parseInt(offer.mileage_per_year) : undefined,
      }

      if (offer.isNew) {
        // Create new offer
        await createOfferMutation.mutateAsync({ listingId, offer: offerData })
        
        // Save as template for next offer
        setLastOffer({
          monthly_price: offer.monthly_price,
          first_payment: offer.first_payment,
          period_months: offer.period_months,
          mileage_per_year: offer.mileage_per_year,
        })
      } else if (offer.id) {
        // Update existing offer
        await updateOfferMutation.mutateAsync({ 
          offerId: offer.id, 
          updates: offerData 
        })
      }

      // Mark as not editing
      setEditableOffers(prev => prev.map((o, i) => 
        i === index ? { ...o, isEditing: false, errors: {} } : o
      ))

      toast.success('Tilbud blev gemt')

    } catch (error) {
      console.error('Failed to save offer:', error)
      toast.error('Kunne ikke gemme tilbud. Prøv igen.')
    } finally {
      // Remove from saving set
      setSavingOffers(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }, [editableOffers, listingId, createOfferMutation, updateOfferMutation, savingOffers])

  // Delete offer
  const deleteOffer = useCallback(async (_: number, offerId?: string) => {
    if (offerId) {
      try {
        await deleteOfferMutation.mutateAsync(offerId)
        toast.success('Tilbud blev slettet')
      } catch (error) {
        console.error('Failed to delete offer:', error)
        toast.error('Kunne ikke slette tilbud. Prøv igen.')
      }
    }
  }, [deleteOfferMutation])

  // Duplicate offer
  const duplicateOffer = useCallback((index: number) => {
    const offer = editableOffers[index]
    if (!offer) return

    const duplicatedOffer: EditableOffer = {
      monthly_price: offer.monthly_price,
      first_payment: offer.first_payment,
      period_months: offer.period_months,
      mileage_per_year: offer.mileage_per_year,
      isNew: true,
      isEditing: true,
      errors: {}
    }

    // Insert after current offer
    setEditableOffers(prev => {
      const newOffers = [...prev]
      newOffers.splice(index + 1, 0, duplicatedOffer)
      return newOffers
    })
  }, [editableOffers])

  // Handle key press (Enter to save, Escape to cancel)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Prevent duplicate saves
      if (!savingOffers.has(index)) {
        saveOffer(index)
      }
    } else if (e.key === 'Escape') {
      setEditableOffers(prev => prev.map((o, i) => 
        i === index ? { ...o, isEditing: false, errors: {} } : o
      ))
    }
  }

  return {
    // Data
    offers,
    editableOffers,
    offersLoading,
    offersError,
    savingOffers,
    inputRefs,
    
    // Actions
    updateField,
    saveOffer,
    deleteOffer,
    duplicateOffer,
    handleKeyDown,
    
    // Validation
    validateField
  }
}