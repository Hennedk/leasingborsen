import React from 'react'
import type { CarListing } from '@/types'

interface ListingTitleProps {
  car: CarListing
  className?: string
}

const ListingTitle: React.FC<ListingTitleProps> = ({ car, className = "" }) => {
  return (
    <div className={`space-y-0 ${className}`}>
      <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
        {car.make} {car.model}
      </h1>
      {car.variant && (
        <p className="text-base lg:text-lg text-muted-foreground font-normal leading-relaxed">{car.variant}</p>
      )}
    </div>
  )
}

export default ListingTitle