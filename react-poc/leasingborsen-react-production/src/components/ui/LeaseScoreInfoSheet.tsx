import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface LeaseScoreInfoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const LeaseScoreInfoSheet: React.FC<LeaseScoreInfoSheetProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="lg:hidden h-[60vh] rounded-t-2xl"
        style={{ 
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' 
        }}
      >
        <SheetHeader>
          <SheetTitle>Om LeaseScore</SheetTitle>
          <SheetDescription>
            Forstå vores scoring system for leasingtilbud
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 py-6">
          <p className="text-sm text-muted-foreground">
            LeaseScore information will be displayed here.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}