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
        
        <div className="space-y-4 py-6 overflow-y-auto">
          <div>
            <h4 className="font-semibold text-sm mb-2">Hvad er LeaseScore?</h4>
            <p className="text-sm text-muted-foreground">
              LeaseScore beregner den samlede værdi af et leasingtilbud baseret på 
              den effektive månedlige omkostning, kilometerramme og fleksibilitet.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Effektiv månedlig omkostning</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Vi beregner den reelle månedlige pris ved at fordele engangsbetalinger 
              over to scenarier:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              <li>• <strong>12 måneder</strong>: Danmark tillader opsigelse efter 12 måneder (70% vægt)</li>
              <li>• <strong>Fuld løbetid</strong>: Hele kontraktperioden (30% vægt)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Scorekomponenter</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Månedlig pris (45%)</span>
                <span>Effektiv månedlig omkostning</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Kilometerramme (35%)</span>
                <span>Mere er bedre</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fleksibilitet (20%)</span>
                <span>Lavere depositum = højere score</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>v2.1</strong>: Ekskluderer etablerings- og ophørsgebyrer (kommer i næste version)
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}