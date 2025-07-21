import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Calendar,
  Car,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Calculator
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminListing } from '@/types/admin'
import { useListingsTableState } from '@/hooks/useListingsTableState'
import { LeaseScoreBadge } from '@/components/ui/LeaseScoreBadge'
import { 
  ListingsTableHeader,
  ListingExpandedRow,
  ListingRowActions
} from './'


interface ListingsTableProps {
  listings: AdminListing[]
  loading?: boolean
  onDelete?: (listing: AdminListing) => void
  onView?: (listing: AdminListing) => void
  onDuplicate?: (listing: AdminListing) => void
  onBulkAction?: (selectedListings: AdminListing[], action: string) => void
}

/**
 * ListingsTable - Refactored with component decomposition
 * 
 * This component has been broken down into focused, reusable components:
 * - useListingsTableState: Centralized state management
 * - ListingsTableHeader: Header with bulk actions
 * - ListingExpandedRow: Pricing details when expanded
 * - ListingRowActions: Action buttons (edit, delete, view)
 * - Optimized ListingRow: Memoized row component
 */
const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  loading = false,
  onDelete,
  onView,
  onDuplicate,
  onBulkAction
}) => {
  // All table state management is now handled by the custom hook
  const tableState = useListingsTableState({ onBulkAction })


  // Optimized ListingRow component with better performance
  const ListingRow = React.memo<{
    listing: AdminListing
    isSelected: boolean
    isExpanded: boolean
    onToggleSelection: () => void
    onToggleExpansion: () => void
    onDelete: () => void
    onView: () => void
    onDuplicate?: () => void
  }>(({ 
    listing, 
    isSelected, 
    isExpanded, 
    onToggleSelection, 
    onToggleExpansion, 
    onDelete, 
    onView,
    onDuplicate
  }) => (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-muted/50",
        isSelected && "bg-blue-50",
        listing.is_draft && "opacity-75"
      )}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Vælg ${listing.make} ${listing.model}`}
        />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpansion}
          className="h-6 w-6 p-0"
          disabled={listing.offer_count === 0}
          aria-label={isExpanded ? "Skjul prisindstillinger" : "Vis prisindstillinger"}
        >
          {listing.offer_count > 0 ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )
          ) : null}
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {listing.make} {listing.model}
                {listing.variant ? ` ${listing.variant}` : ''}
              </span>
              {listing.is_draft && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="admin-draft-badge">
                      <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                      Kladde
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium mb-1">Manglende data:</p>
                    <ul className="text-xs space-y-1">
                      {(listing.missing_fields || []).map((field: string) => (
                        <li key={field}>• {field}</li>
                      ))}
                    </ul>
                    <p className="text-xs mt-2 opacity-75">Vises ikke til forbrugere</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {listing.body_type ? (
          <Badge variant="outline">{listing.body_type}</Badge>
        ) : (
          <Badge variant="outline" className="admin-badge-missing">
            Ikke angivet
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {listing.fuel_type ? (
          <Badge variant="secondary">{listing.fuel_type}</Badge>
        ) : (
          <Badge variant="outline" className="admin-badge-missing">
            Ikke angivet
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium text-sm">
          {listing.seller_name || "–"}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {listing.year}
        </div>
      </TableCell>
      <TableCell>
        {listing.monthly_price ? (
          <div className="font-medium">
            {tableState.formatPrice(listing.monthly_price)}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm italic">
            {listing.offer_count > 0 ? 'Ingen hovedpris' : 'Ingen tilbud'}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {listing.offer_count || 0}
        </Badge>
      </TableCell>
      <TableCell>
        <LeaseScoreBadge
          score={listing.lease_score}
          breakdown={listing.lease_score_breakdown}
          calculatedAt={listing.lease_score_calculated_at}
          retailPrice={listing.retail_price}
          size="sm"
        />
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">
          {listing.created_at ? new Date(listing.created_at).toLocaleDateString('da-DK') : '–'}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">
          {listing.updated_at ? new Date(listing.updated_at).toLocaleDateString('da-DK') : '–'}
        </div>
      </TableCell>
      <TableCell>
        <ListingRowActions
          listing={listing}
          onView={onView}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      </TableCell>
    </TableRow>
  ), (prevProps, nextProps) => {
    // Optimized memoization comparison
    return (
      prevProps.listing.listing_id === nextProps.listing.listing_id &&
      prevProps.listing.monthly_price === nextProps.listing.monthly_price &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isExpanded === nextProps.isExpanded
    )
  })

  // Early return for loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <span className="sr-only">Indlæser annoncer...</span>
      </div>
    )
  }

  const hasSelectedItems = tableState.selectedListings.length > 0

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Bulk actions bar - Outside table to prevent layout shift */}
        {hasSelectedItems && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {tableState.selectedListings.length} annonce(r) valgt:
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => tableState.handleBulkAction('delete')}
              className="flex items-center gap-2"
              aria-label={`Slet ${tableState.selectedListings.length} valgte annoncer`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Slet valgte
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => tableState.handleBulkAction('export')}
              aria-label={`Eksporter ${tableState.selectedListings.length} valgte annoncer`}
            >
              Eksporter valgte
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => tableState.handleBulkAction('calculate-scores')}
              className="flex items-center gap-2"
              aria-label={`Beregn scores for ${tableState.selectedListings.length} valgte annoncer`}
            >
              <Calculator className="h-4 w-4" aria-hidden="true" />
              Beregn scores
            </Button>
          </div>
        )}

        {/* Table with header */}
        <div className="border rounded-lg">
          <Table>
            <ListingsTableHeader
              listings={listings}
              selectedListings={tableState.selectedListings}
              onToggleSelectAll={() => tableState.toggleSelectAll(listings)}
            />
            <TableBody>
              {listings.map((listing) => (
                <React.Fragment key={listing.listing_id}>
                  {/* Main row */}
                  <ListingRow
                    listing={listing}
                    isSelected={tableState.isListingSelected(listing)}
                    isExpanded={tableState.isRowExpanded(listing.listing_id!)}
                    onToggleSelection={() => tableState.toggleListingSelection(listing)}
                    onToggleExpansion={() => tableState.toggleRowExpansion(listing.listing_id!)}
                    onDelete={() => onDelete?.(listing)}
                    onView={() => onView?.(listing)}
                    onDuplicate={() => onDuplicate?.(listing)}
                  />

                  {/* Expanded row content */}
                  {tableState.isRowExpanded(listing.listing_id!) && (
                    <ListingExpandedRow
                      listingId={listing.listing_id!}
                      pricingOptions={tableState.getListingPricing(listing.listing_id!)}
                      isLoading={tableState.isPricingLoading(listing.listing_id!)}
                      formatPrice={tableState.formatPrice}
                    />
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default ListingsTable