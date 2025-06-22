import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'
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

interface Offer {
  id?: string
  monthly_price: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
}

interface OffersDisplayProps {
  offers: Offer[]
  hasOffers: boolean
  listingId?: string
  isPending: boolean
  formatPrice: (price?: number) => string
  onEdit: (index: number) => void
  onDelete: (index: number) => Promise<void>
  onAdd: () => void
}

/**
 * OffersDisplay - Pure presentation component for offers list
 * 
 * Displays offers in cards with edit/delete actions
 */
export const OffersDisplay = React.memo<OffersDisplayProps>(({
  offers,
  hasOffers,
  listingId,
  isPending,
  formatPrice,
  onEdit,
  onDelete,
  onAdd
}) => {
  if (!hasOffers) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <div className="text-muted-foreground">
          <Plus className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm mb-3">Ingen tilbud tilføjet endnu</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            disabled={!listingId || isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isPending ? 'Tilføjer...' : 'Tilføj første tilbud'}
          </Button>
        </div>
      </div>
    )
  }

  return (
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
                  onClick={() => onEdit(index)}
                  disabled={isPending}
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
                      disabled={isPending}
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
                      <AlertDialogCancel disabled={isPending}>
                        Annuller
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(index)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isPending}
                      >
                        {isPending && (
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
  )
})

OffersDisplay.displayName = 'OffersDisplay'