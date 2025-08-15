import React from 'react'
import { 
  FuelIcon, 
  Settings2, 
  Gauge, 
  Car, 
  Users, 
  Battery, 
  TrendingUp 
} from 'lucide-react'
import type { CarListing } from '@/types'
import { useFilterTranslationFunctions } from '@/hooks/useFilterTranslations'

interface KeySpecsProps {
  car: CarListing
  className?: string
}

interface SpecItem {
  icon: React.ReactNode
  label: string
  value: string | null
  show: boolean
}

const KeySpecs: React.FC<KeySpecsProps> = ({ car, className = "" }) => {
  const { translateFuelType, translateTransmission, translateBodyType } = useFilterTranslationFunctions()
  
  const isEV = car.fuel_type?.toLowerCase().includes('el') || 
               car.fuel_type?.toLowerCase().includes('electric') ||
               car.fuel_type?.toLowerCase().includes('batteri')

  const specs: SpecItem[] = [
    {
      icon: <FuelIcon className="w-4 h-4" />,
      label: 'Drivmiddel',
      value: car.fuel_type ? (translateFuelType(car.fuel_type) || car.fuel_type) : null,
      show: !!car.fuel_type
    },
    {
      icon: <Settings2 className="w-4 h-4" />,
      label: 'Gearkasse', 
      value: car.transmission ? (translateTransmission(car.transmission) || car.transmission) : null,
      show: !!car.transmission
    },
    {
      icon: <Gauge className="w-4 h-4" />,
      label: 'Hestekræfter',
      value: car.horsepower && car.horsepower > 0 ? `${car.horsepower} hk` : null,
      show: !!(car.horsepower && car.horsepower > 0)
    },
    {
      icon: <Car className="w-4 h-4" />,
      label: 'Karrosseri',
      value: car.body_type ? (translateBodyType(car.body_type) || car.body_type) : null,
      show: !!car.body_type
    },
    {
      icon: isEV ? <Battery className="w-4 h-4" /> : <Users className="w-4 h-4" />,
      label: isEV ? 'WLTP' : 'Sæder',
      value: isEV 
        ? (car.wltp && car.wltp > 0 ? `${car.wltp} km` : null)
        : (car.seats && car.seats > 0 ? `${car.seats}` : null),
      show: isEV 
        ? !!(car.wltp && car.wltp > 0)
        : !!(car.seats && car.seats > 0)
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: isEV ? 'Km/kWh' : 'L/100km',
      value: isEV 
        ? (car.consumption_kwh_100km && car.consumption_kwh_100km > 0 
          ? `${(100 / car.consumption_kwh_100km).toFixed(1)}` 
          : null)
        : (car.consumption_l_100km && car.consumption_l_100km > 0 
          ? `${car.consumption_l_100km.toFixed(1)}` 
          : null),
      show: isEV 
        ? !!(car.consumption_kwh_100km && car.consumption_kwh_100km > 0)
        : !!(car.consumption_l_100km && car.consumption_l_100km > 0)
    }
  ]

  const visibleSpecs = specs.filter(spec => spec.show)

  if (visibleSpecs.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="h-px bg-border/50 mb-6"></div>
      
      <div className="py-2">
        {/* Mobile: 3x2 Grid */}
        <div className="md:hidden">
          <div className="grid grid-cols-2 gap-4">
            {visibleSpecs.map((spec, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="text-muted-foreground flex-shrink-0">
                  {React.cloneElement(spec.icon as React.ReactElement, { className: "w-5 h-5" } as any)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground font-medium leading-tight">
                    {spec.label}
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {spec.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: 2x3 Grid layout */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 gap-6">
            {visibleSpecs.map((spec, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {spec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground font-medium mb-0.5">
                    {spec.label}
                  </div>
                  <div className="text-base font-bold text-foreground truncate">
                    {spec.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50 mt-6"></div>
    </div>
  )
}

export default KeySpecs