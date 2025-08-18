import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface LeaseScoreInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const LeaseScoreInfoModal: React.FC<LeaseScoreInfoModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hidden lg:block max-w-md">
        <DialogHeader>
          <DialogTitle>Om LeaseScore</DialogTitle>
          <DialogDescription>
            Forstå vores scoring system for leasingtilbud
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            LeaseScore information will be displayed here.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}