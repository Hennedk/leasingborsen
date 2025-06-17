import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Trash2, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useOffers, useCreateOffer, useUpdateOffer, useDeleteOffer } from '@/hooks/useOffers'

interface OffersTableManagerProps {
  listingId?: string
  className?: string
}

interface EditableOffer {
  id?: string
  monthly_price: string
  first_payment: string
  period_months: string
  mileage_per_year: string
  isNew?: boolean
  isEditing?: boolean
  errors?: Record<string, string>
}

export const OffersTableManager = React.memo<OffersTableManagerProps>(({
  listingId,
  className
}) => {
  const { data: offers = [], isLoading: offersLoading, error: offersError } = useOffers(listingId || '')
  const createOfferMutation = useCreateOffer()
  const updateOfferMutation = useUpdateOffer()
  const deleteOfferMutation = useDeleteOffer()

  const [editableOffers, setEditableOffers] = useState<EditableOffer[]>([])
  const [lastOffer, setLastOffer] = useState<Partial<EditableOffer> | null>(null)
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

    // Add empty row for new offers - use simple string values to avoid dependency issues
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
    // Only depend on offers array length and structure, not the lastOffer object
  }, [offers.length, offers.map(o => o.id).join(',')])

  // Validation function
  const validateField = (field: string, value: string): string | null => {
    if (!value.trim()) {
      if (field === 'monthly_price') return 'Månedspris er påkrævet'
      return null // Other fields are optional
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

  // Track which offers are currently being saved to prevent duplicate submissions
  const [savingOffers, setSavingOffers] = useState<Set<number>>(new Set())

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

  const formatPrice = (price?: string) => 
    price ? `${parseFloat(price).toLocaleString('da-DK')} kr` : '–'

  // Show message when no listing ID
  if (!listingId) {
    return (
      <Card className={className}>
        <CardHeader className="pt-6 pb-3">
          <CardTitle>Tilbud</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-muted-foreground">
              <p className="text-sm">Gem først biloplysningerne for at tilføje tilbud</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show loading state
  if (offersLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pt-6 pb-3">
          <CardTitle>Tilbud</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (offersError) {
    return (
      <Card className={className}>
        <CardHeader className="pt-6 pb-3">
          <CardTitle>Tilbud</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="text-destructive p-4 border border-destructive rounded-lg">
            Fejl ved indlæsning af tilbud: {offersError.message}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pt-6 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Tilbud ({offers.length})</span>
          <div className="text-xs text-muted-foreground">
            Klik for at redigere • Enter for at gemme • Esc for at annullere
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Månedspris *</th>
                <th className="text-left p-2 font-medium">Udbetaling</th>
                <th className="text-left p-2 font-medium">Periode (mdr)</th>
                <th className="text-left p-2 font-medium">Km/år</th>
                <th className="text-left p-2 font-medium w-20">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {editableOffers.map((offer, index) => (
                <tr 
                  key={offer.id || `new-${index}`} 
                  className={`border-b hover:bg-muted/30 ${offer.isNew ? 'bg-muted/10' : ''}`}
                >
                  {/* Monthly Price */}
                  <td className="p-2">
                    <div className="space-y-1">
                      <Input
                        ref={el => { if (el) inputRefs.current[`${index}-monthly_price`] = el; return undefined }}
                        name={`monthly_price_${index}`}
                        type="number"
                        min="1"
                        max="50000"
                        placeholder="f.eks. 5000"
                        value={offer.monthly_price}
                        onChange={(e) => updateField(index, 'monthly_price', e.target.value)}
                        onFocus={() => updateField(index, 'isEditing', 'true')}
                        onBlur={() => {
                          // Remove auto-save on blur - require explicit confirmation
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={offer.errors?.monthly_price ? 'border-destructive' : ''}
                      />
                      {offer.errors?.monthly_price && (
                        <div className="text-xs text-destructive">{offer.errors.monthly_price}</div>
                      )}
                    </div>
                  </td>

                  {/* First Payment */}
                  <td className="p-2">
                    <div className="space-y-1">
                      <Input
                        ref={el => { if (el) inputRefs.current[`${index}-first_payment`] = el; return undefined }}
                        name={`first_payment_${index}`}
                        type="number"
                        min="0"
                        max="500000"
                        placeholder="f.eks. 25000"
                        value={offer.first_payment}
                        onChange={(e) => updateField(index, 'first_payment', e.target.value)}
                        onFocus={() => updateField(index, 'isEditing', 'true')}
                        onBlur={() => {
                          // Remove auto-save on blur - require explicit confirmation
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={offer.errors?.first_payment ? 'border-destructive' : ''}
                      />
                      {offer.errors?.first_payment && (
                        <div className="text-xs text-destructive">{offer.errors.first_payment}</div>
                      )}
                    </div>
                  </td>

                  {/* Period Months */}
                  <td className="p-2">
                    <div className="space-y-1">
                      <Input
                        ref={el => { if (el) inputRefs.current[`${index}-period_months`] = el; return undefined }}
                        name={`period_months_${index}`}
                        type="number"
                        min="1"
                        max="120"
                        placeholder="f.eks. 36"
                        value={offer.period_months}
                        onChange={(e) => updateField(index, 'period_months', e.target.value)}
                        onFocus={() => updateField(index, 'isEditing', 'true')}
                        onBlur={() => {
                          // Remove auto-save on blur - require explicit confirmation
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={offer.errors?.period_months ? 'border-destructive' : ''}
                      />
                      {offer.errors?.period_months && (
                        <div className="text-xs text-destructive">{offer.errors.period_months}</div>
                      )}
                    </div>
                  </td>

                  {/* Mileage Per Year */}
                  <td className="p-2">
                    <div className="space-y-1">
                      <Input
                        ref={el => { if (el) inputRefs.current[`${index}-mileage_per_year`] = el; return undefined }}
                        name={`mileage_per_year_${index}`}
                        type="number"
                        min="5000"
                        max="50000"
                        placeholder="f.eks. 20000"
                        value={offer.mileage_per_year}
                        onChange={(e) => updateField(index, 'mileage_per_year', e.target.value)}
                        onFocus={() => updateField(index, 'isEditing', 'true')}
                        onBlur={() => {
                          // Remove auto-save on blur - require explicit confirmation
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={offer.errors?.mileage_per_year ? 'border-destructive' : ''}
                      />
                      {offer.errors?.mileage_per_year && (
                        <div className="text-xs text-destructive">{offer.errors.mileage_per_year}</div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-2">
                    <div className="flex gap-1">
                      {!offer.isNew && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateOffer(index)}
                            className="h-6 w-6"
                            title="Dupliker tilbud"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                title="Slet tilbud"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Slet tilbud</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Er du sikker på, at du vil slette dette tilbud med månedspris på {formatPrice(offer.monthly_price)}/md?
                                  <br />
                                  Denne handling kan ikke fortrydes.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuller</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteOffer(index, offer.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Slet tilbud
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {offer.isNew && offer.monthly_price.trim() && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => saveOffer(index)}
                          disabled={savingOffers.has(index)}
                          className="h-6 w-6 text-green-600"
                          title={savingOffers.has(index) ? "Gemmer..." : "Gem nyt tilbud"}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editableOffers.length === 1 && editableOffers[0].isNew && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Plus className="h-4 w-4 mx-auto mb-2" />
            Tilføj det første tilbud ved at udfylde tabellen ovenfor
          </div>
        )}
      </CardContent>
    </Card>
  )
})

OffersTableManager.displayName = 'OffersTableManager'