import React from 'react'
import { Car, Fuel, Settings, Gauge, Users } from 'lucide-react'
import type { CarListing } from '@/types'

interface ListingSpecificationsProps {
  car: CarListing
}

const ListingSpecifications: React.FC<ListingSpecificationsProps> = ({ car }) => {
  return (
    <div>
      {/* Key Specs Section */}
      <div className="space-y-0 mb-4">
        <h2 className="text-lg font-bold text-foreground leading-tight">
          Specifikationer
        </h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
        {car.horsepower && (
          <div className="flex items-center gap-3">
            <Gauge className="w-7 h-7 text-muted-foreground/60" />
            <div>
              <div className="text-muted-foreground/60 uppercase text-xs font-medium">Hestekræfter</div>
              <div className="font-bold text-foreground">{car.horsepower} hk</div>
            </div>
          </div>
        )}
        
        {car.transmission && (
          <div className="flex items-center gap-3">
            <Settings className="w-7 h-7 text-muted-foreground/60" />
            <div>
              <div className="text-muted-foreground/60 uppercase text-xs font-medium">Gearkasse</div>
              <div className="font-bold text-foreground">{car.transmission}</div>
            </div>
          </div>
        )}
        
        {car.fuel_type && (
          <div className="flex items-center gap-3">
            <Fuel className="w-7 h-7 text-muted-foreground/60" />
            <div>
              <div className="text-muted-foreground/60 uppercase text-xs font-medium">Drivmiddel</div>
              <div className="font-bold text-foreground">{car.fuel_type}</div>
            </div>
          </div>
        )}
        
        {car.body_type && (
          <div className="flex items-center gap-3">
            <Car className="w-7 h-7 text-muted-foreground/60" />
            <div>
              <div className="text-muted-foreground/60 uppercase text-xs font-medium">Karrosseri</div>
              <div className="font-bold text-foreground">{car.body_type}</div>
            </div>
          </div>
        )}
        
        {car.seats && (
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 text-muted-foreground/60" />
            <div>
              <div className="text-muted-foreground/60 uppercase text-xs font-medium">Sæder</div>
              <div className="font-bold text-foreground">{car.seats}</div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer Divider */}
      <div className="my-8 border-t border-border"></div>

      {/* General Specs Section */}
      <h3 className="text-lg font-bold text-foreground mb-4">Generelle specifikationer</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="divide-y divide-border">
          {car.make && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Mærke</span>
              <span className="font-semibold text-foreground">{car.make}</span>
            </div>
          )}
          {car.model && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Model</span>
              <span className="font-semibold text-foreground">{car.model}</span>
            </div>
          )}
          {car.variant && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Variant</span>
              <span className="font-semibold text-foreground">{car.variant}</span>
            </div>
          )}
          {car.year && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Årgang</span>
              <span className="font-semibold text-foreground">{car.year}</span>
            </div>
          )}
          {car.drive_type && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Drivtype</span>
              <span className="font-semibold text-foreground">{car.drive_type}</span>
            </div>
          )}
          {car.doors && car.doors > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Døre</span>
              <span className="font-semibold text-foreground">{car.doors}</span>
            </div>
          )}
          {car.mileage_per_year && car.mileage_per_year > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Årligt kørsel</span>
              <span className="font-semibold text-foreground">{car.mileage_per_year.toLocaleString('da-DK')} km/år</span>
            </div>
          )}
        </div>
        <div className="divide-y divide-border">
          {car.wltp && car.wltp > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">WLTP</span>
              <span className="font-semibold text-foreground">{car.wltp} km</span>
            </div>
          )}
          {car.co2_emission && car.co2_emission > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">CO₂ udslip</span>
              <span className="font-semibold text-foreground">{car.co2_emission} g/km</span>
            </div>
          )}
          {car.consumption_l_100km && car.consumption_l_100km > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Forbrug (benzin)</span>
              <span className="font-semibold text-foreground">{car.consumption_l_100km} l/100km</span>
            </div>
          )}
          {car.consumption_kwh_100km && car.consumption_kwh_100km > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Forbrug (el)</span>
              <span className="font-semibold text-foreground">{car.consumption_kwh_100km} kWh/100km</span>
            </div>
          )}
          {car.co2_tax_half_year && car.co2_tax_half_year > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">CO₂-afgift (halvår)</span>
              <span className="font-semibold text-foreground">{car.co2_tax_half_year.toLocaleString('da-DK')} kr</span>
            </div>
          )}
          {(car.colour || car.color) && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Farve</span>
              <span className="font-semibold text-foreground">{car.colour || car.color}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ListingSpecifications