import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { offerSchema, type OfferFormData } from '@/lib/validations'
import { useOffers, useCreateOffer, useDeleteOffer } from '@/hooks/useOffers'

interface OffersManagerProps {
  listingId?: string
  className?: string
}

export const OffersManager: React.FC<OffersManagerProps> = ({
  listingId,
  className
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Fetch existing offers
  const { data: offers = [], isLoading: offersLoading, error: offersError } = useOffers(listingId || '')
  
  // Mutations for offer operations
  const createOfferMutation = useCreateOffer()
  const deleteOfferMutation = useDeleteOffer()

  // Form for adding/editing offers
  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      monthly_price: undefined,
      first_payment: undefined,
      period_months: 36,
      mileage_per_year: 20000,
    }
  })

  const handleAddOffer = async (data: OfferFormData) => {
    if (!listingId) return
    
    try {
      await createOfferMutation.mutateAsync({ listingId, offer: data })
      setIsAddDialogOpen(false)
      form.reset()
    } catch (error) {
      console.error('Failed to create offer:', error)
    }
  }

  const handleEditOffer = async (index: number, data: OfferFormData) => {
    const offer = offers[index]
    if (!offer?.id) return
    
    try {
      // Note: Need to implement updateOffer mutation
      console.log('Edit offer:', offer.id, data)
      setEditingIndex(null)
      form.reset()
    } catch (error) {
      console.error('Failed to update offer:', error)
    }
  }

  const handleDeleteOffer = async (index: number) => {
    const offer = offers[index]
    if (!offer?.id) return
    
    try {
      await deleteOfferMutation.mutateAsync(offer.id)
    } catch (error) {
      console.error('Failed to delete offer:', error)
    }
  }

  const openEditDialog = (index: number) => {
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
  }

  const formatPrice = (price?: number) => 
    price ? `${price.toLocaleString('da-DK')} kr` : '–'

  const isEditing = editingIndex !== null

  // Show message when no listing ID
  if (!listingId) {
    return (
      <FormItem className={className}>
        <FormLabel>Tilbud</FormLabel>
        <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-muted-foreground">
            <p className="text-sm">Gem først biloplysningerne for at tilføje tilbud</p>
          </div>
        </div>
      </FormItem>
    )
  }

  // Show loading state
  if (offersLoading) {
    return (
      <FormItem className={className}>
        <FormLabel>Tilbud</FormLabel>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Indlæser tilbud...</span>
        </div>
      </FormItem>
    )
  }

  // Show error state
  if (offersError) {
    return (
      <FormItem className={className}>
        <FormLabel>Tilbud</FormLabel>
        <div className="text-destructive p-4 border border-destructive rounded-lg">
          Fejl ved indlæsning af tilbud: {offersError.message}
        </div>
      </FormItem>
    )
  }

  return (
    <FormItem className={className}>
      <div className="flex items-center justify-between">
        <FormLabel>
          Tilbud ({offers.length})
        </FormLabel>
        
        <Dialog open={isAddDialogOpen || isEditing} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingIndex(null)
            form.reset()
          }
        }}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!listingId || createOfferMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createOfferMutation.isPending ? 'Tilføjer...' : 'Tilføj tilbud'}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Rediger tilbud' : 'Tilføj nyt tilbud'}
              </DialogTitle>
              <DialogDescription>
                Udfyld tilbudsinformationen nedenfor.
              </DialogDescription>
            </DialogHeader>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation() // Prevent bubbling to parent form
                form.handleSubmit(isEditing 
                  ? (data) => handleEditOffer(editingIndex!, data)
                  : handleAddOffer
                )(e)
              }} 
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Månedspris *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="50000"
                      placeholder="kr/måned"
                      {...form.register('monthly_price', { 
                        valueAsNumber: true 
                      })}
                    />
                  </FormControl>
                  {form.formState.errors.monthly_price && (
                    <FormMessage>
                      {form.formState.errors.monthly_price.message}
                    </FormMessage>
                  )}
                </FormItem>

                <FormItem>
                  <FormLabel>Udbetaling</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="500000"
                      placeholder="kr"
                      {...form.register('first_payment', { 
                        valueAsNumber: true 
                      })}
                    />
                  </FormControl>
                  {form.formState.errors.first_payment && (
                    <FormMessage>
                      {form.formState.errors.first_payment.message}
                    </FormMessage>
                  )}
                </FormItem>

                <FormItem>
                  <FormLabel>Periode (måneder)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="måneder"
                      {...form.register('period_months', { 
                        valueAsNumber: true 
                      })}
                    />
                  </FormControl>
                  {form.formState.errors.period_months && (
                    <FormMessage>
                      {form.formState.errors.period_months.message}
                    </FormMessage>
                  )}
                </FormItem>

                <FormItem>
                  <FormLabel>Km/år</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="5000"
                      max="50000"
                      placeholder="km/år"
                      {...form.register('mileage_per_year', { 
                        valueAsNumber: true 
                      })}
                    />
                  </FormControl>
                  {form.formState.errors.mileage_per_year && (
                    <FormMessage>
                      {form.formState.errors.mileage_per_year.message}
                    </FormMessage>
                  )}
                </FormItem>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setEditingIndex(null)
                    form.reset()
                  }}
                >
                  Annuller
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOfferMutation.isPending || deleteOfferMutation.isPending}
                >
                  {(createOfferMutation.isPending || deleteOfferMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? 'Gem ændringer' : 'Tilføj tilbud'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Offers */}
      {offers.length > 0 ? (
        <div className="space-y-3">
          {offers.map((offer, index) => (
            <Card key={offer.id || `offer-${index}`} className="relative">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-semibold text-lg">
                        {formatPrice(offer.monthly_price)}/md
                      </div>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        {offer.first_payment && (
                          <Badge variant="outline">
                            Udbetaling: {formatPrice(offer.first_payment)}
                          </Badge>
                        )}
                        {offer.period_months && (
                          <Badge variant="outline">
                            {offer.period_months} mdr
                          </Badge>
                        )}
                        {offer.mileage_per_year && (
                          <Badge variant="outline">
                            {offer.mileage_per_year.toLocaleString('da-DK')} km/år
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slet tilbud</AlertDialogTitle>
                          <AlertDialogDescription>
                            Er du sikker på, at du vil slette dette tilbud? 
                            Denne handling kan ikke fortrydes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuller</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOffer(index)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteOfferMutation.isPending}
                          >
                            {deleteOfferMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Slet tilbud
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-muted-foreground">
            <Plus className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm mb-3">Ingen tilbud tilføjet endnu</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!listingId || createOfferMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createOfferMutation.isPending ? 'Tilføjer...' : 'Tilføj første tilbud'}
            </Button>
          </div>
        </div>
      )}

    </FormItem>
  )
}