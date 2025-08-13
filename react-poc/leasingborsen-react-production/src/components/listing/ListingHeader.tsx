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
    <div className="mb-3">
      <Link to="/listings">
        <Button variant="link" size="sm" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground -mx-2.5">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tilbage til søgning
        </Button>
      </Link>
    </div>
  )
}

export default ListingHeader