import React, { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Info, Edit3 } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useLeaseConfigUrlSync } from '@/hooks/useLeaseConfigUrlSync'
import type { CarListing, LeaseOption } from '@/types'

type PriceState = 'compact' | 'expanded'

interface MobilePriceBarProps {
  car: CarListing
  selectedLease: LeaseOption | null
  onShowSeller: () => void
}

const MobilePriceBarComponent: React.FC<MobilePriceBarProps> = ({ 
  car: _car, 
  selectedLease,
  onShowSeller 
}) => {
  const [state, setState] = useState<PriceState>('compact')
  const [config, updateConfig] = useLeaseConfigUrlSync()
  
  // Lock body scroll when sheet is expanded (CRITICAL)
  useBodyScrollLock(state === 'expanded')
  
  const handleOpenSheet = () => {
    setState('expanded')
  }
  
  const handleCloseSheet = () => {
    setState('compact')
  }
  
  // Single component for both states
  return (
    <>
      {/* Compact footer (always visible) */}
      <footer 
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 lg:hidden",
          "bg-background border-t",
          "transform transition-all duration-150"
        )}
        style={{ 
          paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className="p-4 space-y-6">
          {/* Price configuration area (tappable) */}
          <button 
            onClick={handleOpenSheet}
            className="w-full text-left group p-3 -m-3 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Konfigurer pris"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <p className="text-xl font-bold text-foreground leading-none">
                  {selectedLease?.monthly_price?.toLocaleString('da-DK')} kr/måned
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground leading-relaxed mb-4">
                  <span className="font-medium">{config.km.toLocaleString('da-DK')} km/år</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="font-medium">{config.mdr} mdr</span>
                  {selectedLease?.first_payment && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="font-medium">Udb: {selectedLease.first_payment.toLocaleString('da-DK')} kr</span>
                    </>
                  )}
                </div>
              </div>
              <Edit3 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
          </button>
          
          {/* CTA Button */}
          <Button 
            size="lg"
            onClick={onShowSeller}
            className="w-full min-h-[44px]"
          >
            Gå til tilbud
          </Button>
        </div>
      </footer>
      
      {/* Expanded sheet (same component) */}
      <Sheet 
        open={state === 'expanded'} 
        onOpenChange={handleCloseSheet}
      >
        <SheetContent 
          side="bottom" 
          className="h-[80vh] rounded-t-2xl"
          style={{ 
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))'
          }}
        >
          <SheetHeader>
            <SheetTitle>Tilpas leasingaftale</SheetTitle>
          </SheetHeader>
          
          {/* Price configuration UI */}
          <div className="space-y-6 py-6">
            {/* Current price display */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">
                {selectedLease?.monthly_price?.toLocaleString('da-DK')} kr/md
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Baseret på din konfiguration
              </div>
            </div>
            
            {/* Configuration options */}
            <div className="space-y-6">
              {/* Mileage selector */}
              <div>
                <label className="text-sm font-medium block mb-3">
                  Kilometer pr. år
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[10000, 15000, 20000].map((km) => (
                    <Button
                      key={km}
                      variant={config.km === km ? 'default' : 'outline'}
                      onClick={() => updateConfig('km', km)}
                      className="h-12"
                    >
                      {km.toLocaleString('da-DK')} km
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Period selector */}
              <div>
                <label className="text-sm font-medium block mb-3">
                  Leasingperiode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[12, 24, 36].map((mdr) => (
                    <Button
                      key={mdr}
                      variant={config.mdr === mdr ? 'default' : 'outline'}
                      onClick={() => updateConfig('mdr', mdr)}
                      className="h-12"
                    >
                      {mdr} måneder
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Upfront payment */}
              <div>
                <label className="text-sm font-medium block mb-3">
                  Udbetaling
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 15000, 30000].map((udb) => (
                    <Button
                      key={udb}
                      variant={config.udb === udb ? 'default' : 'outline'}
                      onClick={() => updateConfig('udb', udb)}
                      className="h-12"
                    >
                      {udb === 0 ? 'Ingen' : `${(udb/1000).toFixed(0)}k kr`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Price disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong>Prisoplysning:</strong> Prisen er vejledende og inkluderer moms. 
                Grøn ejerafgift og forsikring er ikke inkluderet. 
                Overskridelse af kilometer koster typisk 0,50-1,50 kr/km. 
                Kontakt forhandleren for det endelige tilbud.
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

const MobilePriceBar = React.memo(MobilePriceBarComponent)
export default MobilePriceBar