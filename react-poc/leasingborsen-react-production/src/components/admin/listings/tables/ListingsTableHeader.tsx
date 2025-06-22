import React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2 } from 'lucide-react'
import type { CarListing } from '@/lib/supabase'

interface ListingsTableHeaderProps {
  listings: CarListing[]
  selectedListings: CarListing[]
  onToggleSelectAll: () => void
  onBulkAction: (action: string) => void
}

/**
 * ListingsTableHeader - Table header with column titles and bulk actions
 * Extracted from ListingsTable for better organization
 */
export const ListingsTableHeader = React.memo<ListingsTableHeaderProps>(({
  listings,
  selectedListings,
  onToggleSelectAll,
  onBulkAction
}) => {
  const hasSelectedItems = selectedListings.length > 0
  const allSelected = selectedListings.length === listings.length && listings.length > 0

  return (
    <>
      {/* Bulk actions bar */}
      {hasSelectedItems && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg mb-4">
          <span className="text-sm font-medium">
            {selectedListings.length} annonce(r) valgt:
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onBulkAction('delete')}
            className="flex items-center gap-2"
            aria-label={`Slet ${selectedListings.length} valgte annoncer`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Slet valgte
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onBulkAction('export')}
            aria-label={`Eksporter ${selectedListings.length} valgte annoncer`}
          >
            Eksporter valgte
          </Button>
        </div>
      )}

      {/* Table header */}
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleSelectAll}
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
    </>
  )
})

ListingsTableHeader.displayName = 'ListingsTableHeader'