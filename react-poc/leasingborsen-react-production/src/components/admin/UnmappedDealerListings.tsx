import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  AlertTriangle, 
  Car, 
  Calendar,
  Info,
  XCircle,
  Trash2
} from 'lucide-react'
import { useUnmappedDealerListings, useDeleteChanges } from '@/hooks/useUnmappedDealerListings'
import { useCreateDeleteChanges } from '@/hooks/useCreateDeleteChanges'
import { cn } from '@/lib/utils'

interface UnmappedDealerListingsProps {
  sessionId: string
  sellerId: string
}

export const UnmappedDealerListings: React.FC<UnmappedDealerListingsProps> = ({
  sessionId,
  sellerId
}) => {
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())
  const [deletionReason, setDeletionReason] = useState<string>('')
  
  const { data: unmappedListings = [], isLoading: isLoadingUnmapped } = useUnmappedDealerListings(sessionId, sellerId)
  const { data: deleteChanges = [], isLoading: isLoadingDeletes } = useDeleteChanges(sessionId)
  const createDeleteChanges = useCreateDeleteChanges()

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price?: number): string => {
    if (!price) return '–'
    return `${price.toLocaleString('da-DK')} kr./md.`
  }

  const getDaysSince = (dateString: string): number => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleSelectionChange = (listingId: string, checked: boolean) => {
    const newSelected = new Set(selectedListings)
    if (checked) {
      newSelected.add(listingId)
    } else {
      newSelected.delete(listingId)
    }
    setSelectedListings(newSelected)
  }

  if (isLoadingUnmapped || isLoadingDeletes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Ikke-inkluderede forhandlerbiler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Separate delete changes from unmapped listings
  const deleteChangeListingIds = new Set(deleteChanges.map(change => change.existing_listing_id).filter(Boolean))
  const trulyUnmapped = unmappedListings.filter(listing => !deleteChangeListingIds.has(listing.listing_id))

  const totalUnmapped = trulyUnmapped.length + deleteChanges.length

  const selectAll = () => {
    const allIds = trulyUnmapped.map(listing => listing.listing_id)
    setSelectedListings(new Set(allIds))
  }

  const deselectAll = () => {
    setSelectedListings(new Set())
  }

  const handleMarkForDeletion = async () => {
    if (selectedListings.size === 0 || !deletionReason.trim()) return

    const selectedListingData = trulyUnmapped.filter(listing => 
      selectedListings.has(listing.listing_id)
    )

    await createDeleteChanges.mutateAsync({
      sessionId,
      listings: selectedListingData.map(listing => ({
        listing_id: listing.listing_id,
        make: listing.make,
        model: listing.model,
        variant: listing.variant
      })),
      reason: deletionReason
    })

    // Reset selection and reason after success
    setSelectedListings(new Set())
    setDeletionReason('')
  }

  if (totalUnmapped === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            Alle forhandlerbiler blev inkluderet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Godt gået! Alle aktive forhandlerbiler blev identificeret og inkluderet i ekstraktionen.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Ikke-inkluderede forhandlerbiler ({totalUnmapped})
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Disse biler blev ikke fundet i PDF'en. De kan være udgået eller overset af AI'en.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Delete changes - listings identified as removed */}
          {deleteChanges.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Identificeret som udgået ({deleteChanges.length})
              </h4>
              {deleteChanges.map(change => {
                // For delete changes, the existing listing data is stored in extracted_data
                const existing = change.extracted_data
                if (!existing) return null
                
                return (
                  <div
                    key={change.id}
                    className="border rounded-lg p-4 bg-red-50 border-red-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Car className="h-4 w-4 text-red-600" />
                          <span className="font-medium">
                            {existing.make} {existing.model} {existing.variant}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          {existing.horsepower && (
                            <div>Hestekræfter: {existing.horsepower} HK</div>
                          )}
                          {existing.fuel_type && (
                            <div>Brændstof: {existing.fuel_type}</div>
                          )}
                          {existing.monthly_price && (
                            <div>Pris: {formatPrice(existing.monthly_price)}</div>
                          )}
                          {existing.wltp && (
                            <div>WLTP: {existing.wltp} km</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        Udgået
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Truly unmapped listings - not identified in extraction at all */}
          {trulyUnmapped.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Ikke identificeret i PDF ({trulyUnmapped.length})
              </h4>
              {trulyUnmapped.map(listing => {
                const daysSinceUpdate = getDaysSince(listing.updated_at)
                const isLikelyDiscontinued = daysSinceUpdate > 30
                
                return (
                  <div
                    key={listing.listing_id}
                    className={cn(
                      "border rounded-lg p-4",
                      isLikelyDiscontinued 
                        ? "bg-orange-50 border-orange-200" 
                        : "bg-yellow-50 border-yellow-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedListings.has(listing.listing_id)}
                        onCheckedChange={(checked) => handleSelectionChange(listing.listing_id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Car className="h-4 w-4 text-orange-600" />
                              <span className="font-medium">
                                {listing.make} {listing.model} {listing.variant}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              {listing.horsepower && (
                                <div>Hestekræfter: {listing.horsepower} HK</div>
                              )}
                              {listing.fuel_type && (
                                <div>Brændstof: {listing.fuel_type}</div>
                              )}
                              {listing.monthly_price && (
                                <div>Pris: {formatPrice(listing.monthly_price)}</div>
                              )}
                              {listing.wltp && (
                                <div>WLTP: {listing.wltp} km</div>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Opdateret: {formatDate(listing.updated_at)}
                              </span>
                              {isLikelyDiscontinued && (
                                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                  Muligvis udgået ({daysSinceUpdate} dage siden)
                                </Badge>
                              )}
                            </div>
                          </div>
                          {listing.image && (
                            <div className="w-20 h-20 rounded overflow-hidden shrink-0">
                              <img
                                src={listing.image}
                                alt={`${listing.make} ${listing.model}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Action section for marking deletions */}
          {trulyUnmapped.length > 0 && (
            <div className="mt-6 space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedListings.size} bil(er) valgt
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    Vælg alle
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAll}>
                    Fravælg alle
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deletion-reason">Årsag til sletning (påkrævet)</Label>
                <Textarea
                  id="deletion-reason"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="F.eks. Biler ikke længere tilgængelige hos forhandler, udgået fra sortiment..."
                  rows={2}
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={handleMarkForDeletion}
                disabled={selectedListings.size === 0 || !deletionReason.trim() || createDeleteChanges.isPending}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {createDeleteChanges.isPending 
                  ? 'Markerer til sletning...' 
                  : `Markér ${selectedListings.size} bil(er) til sletning`
                }
              </Button>
            </div>
          )}

          {/* Help text */}
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Mulige årsager:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Bilen er udgået fra forhandlerens sortiment</li>
                <li>PDF'en indeholder ikke alle aktive biler</li>
                <li>AI'en kunne ikke genkende bilens information i PDF'en</li>
                <li>Formatering eller navngivning i PDF'en afviger fra databasen</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}