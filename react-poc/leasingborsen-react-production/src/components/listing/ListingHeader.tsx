import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { CarListing } from '@/types'

interface ListingHeaderProps {
  car: CarListing
}

const ListingHeader: React.FC<ListingHeaderProps> = ({ car }) => {
  return (
    <>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link to="/listings">
          <Button variant="link" size="sm" className="p-0 h-auto">
            Tilbage til søgning
          </Button>
        </Link>
      </div>

      {/* Car Header */}
      <div className="space-y-0 mb-4">
        <h1 className="text-3xl font-bold text-foreground leading-tight">
          {car.make} {car.model}
        </h1>
        {car.variant && (
          <p className="text-lg text-muted-foreground font-normal leading-relaxed">{car.variant}</p>
        )}
      </div>
    </>
  )
}

export default ListingHeader