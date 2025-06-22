import React from 'react'
import { TableCell, TableRow, Table, TableHeader, TableHead, TableBody } from '@/components/ui/table'
import { Loader2 } from 'lucide-react'

interface PricingOption {
  monthly_price: number
  first_payment?: number
  period_months: number
  mileage_per_year: number
}

interface ListingExpandedRowProps {
  listingId: string
  pricingOptions: PricingOption[]
  isLoading: boolean
  formatPrice: (price?: number) => string
}

/**
 * ListingExpandedRow - Displays pricing options when a listing row is expanded
 * Extracted from ListingsTable for better organization
 */
export const ListingExpandedRow = React.memo<ListingExpandedRowProps>(({
  listingId,
  pricingOptions,
  isLoading,
  formatPrice
}) => {
  return (
    <TableRow>
      <TableCell colSpan={11} className="bg-muted/30 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Indlæser prisindstillinger...</span>
          </div>
        ) : pricingOptions.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Prisindstillinger ({pricingOptions.length})
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-xs w-1/4">Månedlig pris</TableHead>
                  <TableHead className="h-8 text-xs w-1/4">Kørsel per år</TableHead>
                  <TableHead className="h-8 text-xs w-1/4">Periode</TableHead>
                  <TableHead className="h-8 text-xs w-1/4">Førsteudgift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingOptions.map((option, index) => (
                  <TableRow key={`${listingId}-option-${index}`} className="h-8">
                    <TableCell className="py-1 font-medium text-sm w-1/4">
                      {formatPrice(option.monthly_price)}
                    </TableCell>
                    <TableCell className="py-1 text-sm w-1/4">
                      {option.mileage_per_year?.toLocaleString('da-DK')} km/år
                    </TableCell>
                    <TableCell className="py-1 text-sm w-1/4">
                      {option.period_months} mdr
                    </TableCell>
                    <TableCell className="py-1 text-sm w-1/4">
                      {option.first_payment ? formatPrice(option.first_payment) : '–'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Ingen prisindstillinger fundet</p>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
})

ListingExpandedRow.displayName = 'ListingExpandedRow'