import React, { useState, useMemo, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { ListingsTable } from '@/components/admin/listings/tables'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  useAdminListings, 
  useBulkDeleteListings,
  useAdminDuplicateListing
} from '@/hooks/useAdminListings'
import { useDeleteListing } from '@/hooks/useAdminOperations'
import { useBulkLeaseScoreCalculation } from '@/hooks/useBulkLeaseScoreCalculation'
import { useSellers } from '@/hooks/useSellers'
import { 
  DataErrorBoundary, 
  ComponentErrorBoundary 
} from '@/components/ErrorBoundaries'
import { Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { AdminListing, AdminFilters } from '@/types/admin'

const AdminListings: React.FC = () => {
  const [filters, setFilters] = useState<AdminFilters>({
    status: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    listing?: AdminListing
    isBulk?: boolean
    selectedListings?: AdminListing[]
  }>({
    open: false
  })
  
  // Data fetching 
  const { data: listingsData, isLoading: listingsLoading } = useAdminListings({})
  
  // Mutations
  const bulkDeleteMutation = useBulkDeleteListings()
  const deleteMutation = useDeleteListing()
  const duplicateMutation = useAdminDuplicateListing()
  const bulkCalculateMutation = useBulkLeaseScoreCalculation()

  // Fetch all available sellers dynamically from database
  const { data: sellers = [], isLoading: sellersLoading, error: sellersError } = useSellers()

  // Filter listings based on selected filters
  const filteredListings = useMemo(() => {
    const allListings = listingsData?.data || []
    
    return allListings.filter((listing) => {
      // Filter by seller
      if (filters.seller_id && listing.seller_id !== filters.seller_id) {
        return false
      }
      
      // Filter by status
      if (filters.status === 'draft' && !listing.is_draft) {
        return false
      }
      if (filters.status === 'active' && listing.is_draft) {
        return false
      }
      
      return true
    })
  }, [listingsData?.data, filters])

  // Pagination calculations
  const totalItems = filteredListings.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedListings = filteredListings.slice(startIndex, endIndex)

  // Filter handlers with useCallback
  const handleSellerChange = useCallback((sellerId: string) => {
    setFilters(prev => ({
      ...prev,
      seller_id: sellerId === 'all' ? undefined : sellerId
    }))
    setCurrentPage(1) // Reset to first page when changing filters
  }, [])

  const handleStatusChange = useCallback((status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status as 'draft' | 'active' | 'all'
    }))
    setCurrentPage(1) // Reset to first page when changing filters
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ status: 'all' })
    setCurrentPage(1) // Reset to first page when clearing filters
  }, [])

  // Pagination handlers - memoized to prevent unnecessary re-renders
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handlePrevious = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }, [currentPage])

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }, [currentPage, totalPages])

  // Memoize pagination array to prevent recreation on every render
  const paginationPages = useMemo(() => 
    Array.from({ length: totalPages }, (_, i) => i + 1), 
    [totalPages]
  )

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.seller_id) count++
    if (filters.status !== 'all') count++
    return count
  }, [filters])

  // Handlers

  const handleDelete = (listing: AdminListing) => {
    setDeleteConfirmation({
      open: true,
      listing,
      isBulk: false
    })
  }

  const handleView = (listing: AdminListing) => {
    window.open(`/listing/${listing.listing_id}`, '_blank')
  }

  const handleDuplicate = (listing: AdminListing) => {
    if (!listing.listing_id) {
      toast.error('Kan ikke duplikere annonce uden ID')
      return
    }
    
    duplicateMutation.mutate(listing.listing_id, {
      onSuccess: () => {
        toast.success(`Annonce "${listing.make} ${listing.model}" duplikeret`)
      },
      onError: () => {
        toast.error('Kunne ikke duplikere annonce')
      }
    })
  }

  const handleBulkAction = (selectedListings: AdminListing[], action: string) => {
    if (action === 'delete') {
      setDeleteConfirmation({
        open: true,
        isBulk: true,
        selectedListings
      })
    } else if (action === 'export') {
      toast.info('Export funktionalitet kommer snart')
    } else if (action === 'calculate-scores') {
      bulkCalculateMutation.mutate(selectedListings)
    }
  }

  const executeDelete = async () => {
    if (deleteConfirmation.isBulk && deleteConfirmation.selectedListings) {
      const listingIds = deleteConfirmation.selectedListings
        .map(l => l.listing_id)
        .filter(Boolean) as string[]
      
      bulkDeleteMutation.mutate(listingIds, {
        onSuccess: () => {
          toast.success(`${deleteConfirmation.selectedListings?.length} annoncer slettet`)
        },
        onError: () => {
          toast.error('Kunne ikke slette annoncer')
        }
      })
    } else if (deleteConfirmation.listing?.listing_id) {
      try {
        await deleteMutation.mutateAsync({ listingId: deleteConfirmation.listing.listing_id })
        toast.success('Annonce slettet')
      } catch (error) {
        toast.error('Kunne ikke slette annonce')
      }
    }
    
    setDeleteConfirmation({ open: false })
  }


  return (
    <AdminLayout title="Annoncer">
      <div className="space-y-6">
        {/* Breadcrumb and Header */}
        <div className="space-y-4">
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Annoncer' }
            ]}
          />
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Annoncer</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Batch Oprettelse button removed */}
              <Button asChild>
                <Link to="/admin/listings/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Opret Annonce
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Listing count and pagination info */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {filteredListings.length} af {listingsData?.data?.length || 0} annoncer
            {totalPages > 1 && (
              <span className="ml-2">
                (Side {currentPage} af {totalPages})
              </span>
            )}
          </span>
          {totalPages > 1 && (
            <div className="text-sm text-muted-foreground">
              Viser {startIndex + 1}-{Math.min(endIndex, totalItems)} af {totalItems}
            </div>
          )}
        </div>

        {/* Filters */}
        <ComponentErrorBoundary componentName="Admin Filters">
          <div className="flex flex-wrap items-center gap-3">
            {/* Seller filter */}
            <div className="min-w-[200px]">
              <Select
                value={filters.seller_id || 'all'}
                onValueChange={handleSellerChange}
                disabled={sellersLoading}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={sellersLoading ? "Indlæser sælgere..." : "Vælg sælger"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle sælgere</SelectItem>
                  {sellersError ? (
                    <SelectItem value="error" disabled>
                      Fejl ved indlæsning af sælgere
                    </SelectItem>
                  ) : (
                    sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="min-w-[150px]">
              <Select
                value={filters.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Vælg listing status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="active">Aktive</SelectItem>
                  <SelectItem value="draft">Kladder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset filters button */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-3 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Ryd filtre
              </Button>
            )}
          </div>
        </ComponentErrorBoundary>

        {/* Listings table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <DataErrorBoundary>
              <ListingsTable
                listings={paginatedListings}
                loading={listingsLoading}
                onDelete={handleDelete}
                onView={handleView}
                onDuplicate={handleDuplicate}
                onBulkAction={handleBulkAction}
              />
            </DataErrorBoundary>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentPage === 1}
            >
              Forrige
            </Button>
            
            <div className="flex items-center gap-1">
              {paginationPages.map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentPage === totalPages}
            >
              Næste
            </Button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmation.open}
          onOpenChange={(open) => setDeleteConfirmation({ open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteConfirmation.isBulk ? 'Slet annoncer' : 'Slet annonce'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirmation.isBulk ? (
                  <>
                    Er du sikker på, du vil slette{' '}
                    <strong>{deleteConfirmation.selectedListings?.length} annoncer</strong>?
                    <br />
                    Denne handling kan ikke fortrydes.
                  </>
                ) : (
                  <>
                    Er du sikker på, du vil slette{' '}
                    <strong>
                      "{deleteConfirmation.listing?.make} {deleteConfirmation.listing?.model}"
                    </strong>?
                    <br />
                    Denne handling kan ikke fortrydes.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuller</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteConfirmation.isBulk ? 'Slet annoncer' : 'Slet annonce'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}

export default AdminListings