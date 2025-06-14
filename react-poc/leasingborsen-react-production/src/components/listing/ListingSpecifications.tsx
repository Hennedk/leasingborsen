import React from 'react'
import type { CarListing } from '@/types'

interface ListingSpecificationsProps {
  car: CarListing
}

const ListingSpecifications = React.memo<ListingSpecificationsProps>(({ car }) => {
  return (
    <div className="space-y-8">
      {/* Description Section */}
      {car.description && (
        <div>
          <div className="space-y-0 mb-4">
            <h2 className="text-xl font-bold text-foreground leading-tight">
              Beskrivelse
            </h2>
          </div>
          <div className="prose prose-sm max-w-none text-foreground">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {car.description}
            </p>
          </div>
        </div>
      )}

      {/* Specifications Section */}
      <div>
        <div className="space-y-0 mb-4">
          <h2 className="text-xl font-bold text-foreground leading-tight">
            Specifikationer
          </h2>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
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
          {car.body_type && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Karrosseri</span>
              <span className="font-semibold text-foreground">{car.body_type}</span>
            </div>
          )}
          {car.fuel_type && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Drivmiddel</span>
              <span className="font-semibold text-foreground">{car.fuel_type}</span>
            </div>
          )}
        </div>
        <div className="divide-y divide-border">
          {car.transmission && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Gearkasse</span>
              <span className="font-semibold text-foreground">{car.transmission}</span>
            </div>
          )}
          {car.horsepower && car.horsepower > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Hestekræfter</span>
              <span className="font-semibold text-foreground">{car.horsepower} hk</span>
            </div>
          )}
          {car.drive_type && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Drivtype</span>
              <span className="font-semibold text-foreground">{car.drive_type}</span>
            </div>
          )}
          {car.seats && car.seats > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">Sæder</span>
              <span className="font-semibold text-foreground">{car.seats}</span>
            </div>
          )}
          {car.co2_emission && car.co2_emission > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">CO₂ udslip</span>
              <span className="font-semibold text-foreground">{car.co2_emission} g/km</span>
            </div>
          )}
          {car.co2_tax_half_year && car.co2_tax_half_year > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">CO₂-afgift (halvår)</span>
              <span className="font-semibold text-foreground">{car.co2_tax_half_year.toLocaleString('da-DK')} kr</span>
            </div>
          )}
          {car.wltp && car.wltp > 0 && (
            <div className="flex justify-between py-2">
              <span className="font-medium text-muted-foreground">WLTP</span>
              <span className="font-semibold text-foreground">{car.wltp} km</span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
})

export default ListingSpecifications