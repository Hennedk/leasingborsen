import React from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, AlertCircle } from 'lucide-react'
import type { CarListing } from '@/types'

interface SellerModalProps {
  isOpen: boolean
  onClose: () => void
  car: CarListing
  externalUrl?: string
}

const SellerModal = React.memo<SellerModalProps>(({
  isOpen,
  onClose,
  car,
  externalUrl
}) => {
  const handleContinue = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer')
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Du forlader Leasingborsen
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Du vil blive videreført til forhandlerens hjemmeside for at se tilbuddet på {car.make} {car.model}{car.variant ? ` ${car.variant}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seller Information (if available) */}
          {car.seller_name && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-foreground">Forhandler: {car.seller_name}</span>
              </div>
              {car.seller_location && (
                <p className="text-sm text-muted-foreground mt-1">{car.seller_location}</p>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Når du klikker "Fortsæt", åbnes forhandlerens hjemmeside i en ny fane. 
              Leasingborsen er ikke ansvarlig for indholdet på eksterne hjemmesider.
            </p>
            <p>
              Du kan altid vende tilbage til Leasingborsen for at sammenligne andre tilbud.
            </p>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Annuller
            </Button>
            <Button 
              onClick={handleContinue}
              className="flex-1 gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Fortsæt til forhandler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

export default SellerModal