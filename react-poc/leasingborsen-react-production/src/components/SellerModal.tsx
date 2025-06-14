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
import { ExternalLink, Phone, Mail, Globe } from 'lucide-react'
import type { Seller, CarListing } from '@/types'

interface SellerModalProps {
  isOpen: boolean
  onClose: () => void
  seller: Seller
  car: CarListing
}

const SellerModal: React.FC<SellerModalProps> = ({
  isOpen,
  onClose,
  seller,
  car
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Kontakt forhandler
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            For at se tilbuddet på {car.make} {car.model}{car.variant ? ` ${car.variant}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seller Information */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-foreground text-lg">{seller.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{seller.description}</p>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`tel:${seller.phone}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {seller.phone}
                </a>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`mailto:${seller.email}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {seller.email}
                </a>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={seller.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Besøg hjemmeside
                </a>
              </div>
            </div>
          </div>

          <Separator />

          {/* CTA Button */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Annuller
            </Button>
            <Button 
              onClick={() => window.open(seller.website, '_blank')}
              className="flex-1 gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Se tilbud
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SellerModal