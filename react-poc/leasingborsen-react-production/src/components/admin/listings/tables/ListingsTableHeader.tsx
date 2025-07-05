import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CarListing } from '@/lib/supabase'

interface ListingsTableHeaderProps {
  listings: CarListing[]
  selectedListings: CarListing[]
  onToggleSelectAll: () => void
}

/**
 * ListingsTableHeader - Table header with column titles and bulk actions
 * Extracted from ListingsTable for better organization
 */
export const ListingsTableHeader = React.memo<ListingsTableHeaderProps>(({
  listings,
  selectedListings,
  onToggleSelectAll
}) => {
  const allSelected = selectedListings.length === listings.length && listings.length > 0

  return (
    <TableHeader>
        <TableRow>
          <TableHead className="w-12" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleSelectAll}
              onClick={(e) => e.stopPropagation()}
              aria-label={allSelected ? "Fravælg alle annoncer" : "Vælg alle annoncer"}
            />
          </TableHead>
          <TableHead className="w-12" aria-label="Udvid række"></TableHead>
          <TableHead>Bil</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Brændstof</TableHead>
          <TableHead>Sælger</TableHead>
          <TableHead>År</TableHead>
          <TableHead>Laveste pris</TableHead>
          <TableHead className="w-20">Tilbud</TableHead>
          <TableHead>Oprettet</TableHead>
          <TableHead className="w-32">Handlinger</TableHead>
        </TableRow>
      </TableHeader>
  )
})

ListingsTableHeader.displayName = 'ListingsTableHeader'