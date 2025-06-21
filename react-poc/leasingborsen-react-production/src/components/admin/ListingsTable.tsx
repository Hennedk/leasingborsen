import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Car,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { CarListing } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

interface PricingOption {
  monthly_price: number
  first_payment?: number
  period_months: number
  mileage_per_year: number
}

interface ListingsTableProps {
  listings: CarListing[]
  loading?: boolean
  onDelete?: (listing: CarListing) => void
  onView?: (listing: CarListing) => void
  onBulkAction?: (selectedListings: CarListing[], action: string) => void
}

const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  loading = false,
  onDelete,
  onView,
  onBulkAction
}) => {
  const [selectedListings, setSelectedListings] = useState<CarListing[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [pricingData, setPricingData] = useState<Record<string, PricingOption[]>>({})
  const [loadingPricing, setLoadingPricing] = useState<Set<string>>(new Set())

  const toggleRowExpansion = async (listingId: string) => {
    const newExpanded = new Set(expandedRows)
    
    if (newExpanded.has(listingId)) {
      newExpanded.delete(listingId)
      setExpandedRows(newExpanded)
    } else {
      newExpanded.add(listingId)
      setExpandedRows(newExpanded)
      
      // Load pricing data if not already loaded
      if (!pricingData[listingId]) {
        await loadPricingOptions(listingId)
      }
    }
  }

  const loadPricingOptions = async (listingId: string) => {
    setLoadingPricing(prev => new Set(prev).add(listingId))
    
    try {
      const { data, error } = await supabase
        .from('lease_pricing')
        .select('monthly_price, first_payment, period_months, mileage_per_year')
        .eq('listing_id', listingId)
        .order('monthly_price', { ascending: true })

      if (error) throw error

      setPricingData(prev => ({
        ...prev,
        [listingId]: data || []
      }))
    } catch (error) {
      console.error('Error loading pricing options:', error)
    } finally {
      setLoadingPricing(prev => {
        const newSet = new Set(prev)
        newSet.delete(listingId)
        return newSet
      })
    }
  }

  const toggleListingSelection = (listing: CarListing) => {
    const isSelected = selectedListings.some(l => l.listing_id === listing.listing_id)
    if (isSelected) {
      setSelectedListings(prev => prev.filter(l => l.listing_id !== listing.listing_id))
    } else {
      setSelectedListings(prev => [...prev, listing])
    }
  }

  const toggleSelectAll = () => {
    if (selectedListings.length === listings.length) {
      setSelectedListings([])
    } else {
      setSelectedListings(listings)
    }
  }

  const formatPrice = (price?: number) => price ? `${price.toLocaleString('da-DK')} kr/md` : '–'

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedListings.length > 0 && onBulkAction) {
      onBulkAction(selectedListings, action)
    }
  }


  // Memoized ListingRow component for performance
  const ListingRow = React.memo<{
    listing: CarListing
    isSelected: boolean
    isExpanded: boolean
    onToggleSelection: () => void
    onToggleExpansion: () => void
    onDelete: () => void
    onView: () => void
  }>(({ 
    listing, 
    isSelected, 
    isExpanded, 
    onToggleSelection, 
    onToggleExpansion, 
    onDelete, 
    onView 
  }) => (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-muted/50",
        isSelected && "bg-blue-50",
        (listing as any).is_draft && "opacity-75"
      )}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          aria-label={`Vælg ${listing.make} ${listing.model}`}
        />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpansion}
          className="h-6 w-6 p-0"
          disabled={(listing as any).offer_count === 0}
          aria-label={isExpanded ? "Skjul prisindstillinger" : "Vis prisindstillinger"}
        >
          {(listing as any).offer_count > 0 ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : null}
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {listing.make} {listing.model}
                {(listing as any).variant ? ` ${(listing as any).variant}` : ''}
              </span>
              {(listing as any).is_draft && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Kladde
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium mb-1">Manglende data:</p>
                    <ul className="text-xs space-y-1">
                      {((listing as any).missing_fields || []).map((field: string) => (
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
          <Badge variant="outline" className="text-muted-foreground border-dashed">
            Ikke angivet
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {listing.fuel_type ? (
          <Badge variant="secondary">{listing.fuel_type}</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-dashed">
            Ikke angivet
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium text-sm">
          {(listing as any).seller_name || "–"}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {listing.year}
        </div>
      </TableCell>
      <TableCell>
        {listing.monthly_price ? (
          <div className="font-medium">
            {formatPrice(listing.monthly_price)}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm italic">
            {(listing as any).offer_count > 0 ? 'Ingen hovedpris' : 'Ingen tilbud'}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {(listing as any).offer_count || 0}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">
          {(listing as any).created_at ? new Date((listing as any).created_at).toLocaleDateString('da-DK') : '–'}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onView}
            aria-label="Se på hjemmeside"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            asChild
            aria-label="Rediger annonce"
          >
            <Link to={`/admin/listings/edit/${listing.listing_id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="Slet annonce"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Denne handling kan ikke fortrydes. Dette vil permanent slette annoncen for 
                  <strong> {listing.make} {listing.model} ({listing.year})</strong> fra databasen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuller</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onDelete}
                >
                  Slet annonce
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  ), (prevProps, nextProps) => {
    // Memoization comparison - only re-render if these values change
    return (
      prevProps.listing.listing_id === nextProps.listing.listing_id &&
      prevProps.listing.monthly_price === nextProps.listing.monthly_price &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isExpanded === nextProps.isExpanded
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Bulk actions */}
        {selectedListings.length > 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedListings.length} annonce(r) valgt:
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Slet valgte
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('export')}
            >
              Eksporter valgte
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedListings.length === listings.length && listings.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Vælg alle"
                  />
                </TableHead>
                <TableHead className="w-12"></TableHead>
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
            <TableBody>
              {listings.map((listing) => (
                <React.Fragment key={listing.listing_id}>
                  {/* Main row */}
                  <ListingRow
                    listing={listing}
                    isSelected={selectedListings.some(l => l.listing_id === listing.listing_id)}
                    isExpanded={expandedRows.has(listing.listing_id!)}
                    onToggleSelection={() => toggleListingSelection(listing)}
                    onToggleExpansion={() => toggleRowExpansion(listing.listing_id!)}
                    onDelete={() => onDelete?.(listing)}
                    onView={() => onView?.(listing)}
                  />

                  {/* Expanded row content */}
                  {expandedRows.has(listing.listing_id!) && (
                    <TableRow>
                      <TableCell colSpan={11} className="bg-muted/30 p-4">
                        {loadingPricing.has(listing.listing_id!) ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Indlæser prisindstillinger...</span>
                          </div>
                        ) : pricingData[listing.listing_id!] && pricingData[listing.listing_id!].length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium mb-3">Prisindstillinger ({pricingData[listing.listing_id!].length})</h4>
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
                                {pricingData[listing.listing_id!].map((option, index) => (
                                  <TableRow key={index} className="h-8">
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