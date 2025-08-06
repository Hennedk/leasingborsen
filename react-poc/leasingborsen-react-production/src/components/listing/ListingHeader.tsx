import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CarListing } from '@/types'

interface ListingHeaderProps {
  car: CarListing
}

const ListingHeader: React.FC<ListingHeaderProps> = ({ car }) => {
  return (
    <>
      {/* Back Navigation */}
      <div className="mb-3">
        <Link to="/listings">
          <Button variant="link" size="sm" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />
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