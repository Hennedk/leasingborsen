import React, { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigationContext } from '@/hooks/useNavigationContext'
import type { CarListing } from '@/types'

interface ListingHeaderProps {
  car?: CarListing
}

const ListingHeader: React.FC<ListingHeaderProps> = () => {
  const { getNavigationInfo, smartBack } = useNavigationContext()
  const [showBackButton, setShowBackButton] = useState(true)
  const [isFromListings, setIsFromListings] = useState(false)
  
  useEffect(() => {
    const navInfo = getNavigationInfo()
    setIsFromListings(navInfo.from === 'listings')
    setShowBackButton(navInfo.hasHistory || navInfo.from === 'listings')
  }, [getNavigationInfo])
  
  if (!showBackButton) {
    return null
  }
  
  return (
    <div className="mb-3">
      {isFromListings ? (
        <Button 
          variant="link" 
          size="sm" 
          className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground -mx-2.5"
          onClick={smartBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tilbage til søgning
        </Button>
      ) : (
        <Link to="/listings">
          <Button variant="link" size="sm" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground -mx-2.5">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tilbage til søgning
          </Button>
        </Link>
      )}
    </div>
  )
}

export default ListingHeader