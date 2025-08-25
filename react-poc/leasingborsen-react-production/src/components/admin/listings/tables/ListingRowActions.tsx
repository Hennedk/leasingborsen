import React from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Eye, Copy } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { CarListing } from '@/lib/supabase'

interface ListingRowActionsProps {
  listing: CarListing
  onView: () => void
  onDelete: () => void
  onDuplicate?: () => void
}

/**
 * ListingRowActions - Action buttons for each listing row (view, edit, delete)
 * Extracted from ListingsTable for better organization and reusability
 */
export const ListingRowActions = React.memo<ListingRowActionsProps>(({
  listing,
  onView,
  onDelete,
  onDuplicate
}) => {
  return (
    <div className="admin-table-actions">
      {/* View button */}
      <Button 
        variant="ghost" 
        size="sm"
        className="admin-icon-button"
        onClick={onView}
        aria-label={`Se ${listing.make} ${listing.model} på hjemmeside`}
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Button>
      
      {/* Edit button */}
      <Button 
        variant="ghost" 
        size="sm"
        className="admin-icon-button"
        asChild
        aria-label={`Rediger ${listing.make} ${listing.model} annonce`}
      >
        <Link to="/admin/listings/edit/$id" params={{ id: listing.listing_id }}>
          <Edit className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
      
      {/* Duplicate button */}
      {onDuplicate && (
        <Button 
          variant="ghost" 
          size="sm"
          className="admin-icon-button"
          onClick={onDuplicate}
          aria-label={`Dupliker ${listing.make} ${listing.model} annonce`}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      
      {/* Delete button - confirmation handled by parent component */}
      <Button 
        variant="ghost" 
        size="sm"
        className="admin-icon-button text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
        aria-label={`Slet ${listing.make} ${listing.model} annonce`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
})

ListingRowActions.displayName = 'ListingRowActions'