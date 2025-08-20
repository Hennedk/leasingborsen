import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UseFormReturn } from 'react-hook-form'
import type { OfferFormData } from '@/lib/validations'

interface OfferFormDialogProps {
  isOpen: boolean
  isEditing: boolean
  isPending: boolean
  form: UseFormReturn<OfferFormData>
  onClose: () => void
  onSubmit: (data: OfferFormData) => Promise<void>
}

/**
 * OfferFormDialog - Form handling for offer creation and editing
 * 
 * Handles both add and edit modes with form validation
 */
export const OfferFormDialog = React.memo<OfferFormDialogProps>(({
  isOpen,
  isEditing,
  isPending,
  form,
  onClose,
  onSubmit
}) => {
  const handleSubmit = async (data: OfferFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
            form.handleSubmit(handleSubmit)(e)
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
                  placeholder="kr./md."
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
              onClick={onClose}
              disabled={isPending}
            >
              Annuller
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? 'Gem ændringer' : 'Tilføj tilbud'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})

OfferFormDialog.displayName = 'OfferFormDialog'