import React, { useState, useMemo } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import ListingsTable from '@/components/admin/ListingsTable'
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
import { Badge } from '@/components/ui/badge'
import { 
  useAdminListings, 
  useBulkDeleteListings,
  useAdminDeleteListing 
} from '@/hooks/useAdminListings'
import { Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CarListing } from '@/lib/supabase'

interface AdminFilters {
  seller_id?: string
  status?: 'draft' | 'active' | 'all'
}

const AdminListings: React.FC = () => {
  const [filters, setFilters] = useState<AdminFilters>({
    status: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // Data fetching 
  const { data: listingsData, isLoading: listingsLoading, refetch } = useAdminListings({})
  
  // Mutations
  const bulkDeleteMutation = useBulkDeleteListings()
  const deleteMutation = useAdminDeleteListing()

  // Available sellers for filtering
  const sellers = [
    { id: '2bbeae55-2db6-415b-b00b-5de22889de4e', name: 'Audi Privatleasing Online' },
    { id: '11327fb8-4305-4156-8897-ddedb23e508b', name: 'Škoda Privatleasing' },
    { id: 'f5cdd423-d949-49fa-a68d-937c25c2269a', name: 'Volkswagen Privatleasing' }
  ]

  // Filter listings based on selected filters
  const filteredListings = useMemo(() => {
    const allListings = listingsData?.data || []
    
    return allListings.filter((listing) => {
      // Filter by seller
      if (filters.seller_id && listing.seller_id !== filters.seller_id) {
        return false
      }
      
      // Filter by status
      if (filters.status === 'draft' && !(listing as any).is_draft) {
        return false
      }
      if (filters.status === 'active' && (listing as any).is_draft) {
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

  // Filter handlers
  const handleSellerChange = (sellerId: string) => {
    setFilters(prev => ({
      ...prev,
      seller_id: sellerId === 'all' ? undefined : sellerId
    }))
    setCurrentPage(1) // Reset to first page when changing filters
  }

  const handleStatusChange = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status as 'draft' | 'active' | 'all'
    }))
    setCurrentPage(1) // Reset to first page when changing filters
  }

  const clearFilters = () => {
    setFilters({ status: 'all' })
    setCurrentPage(1) // Reset to first page when clearing filters
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.seller_id) count++
    if (filters.status !== 'all') count++
    return count
  }, [filters])

  // Handlers

  const handleDelete = async (listing: CarListing) => {
    if (listing.listing_id && confirm(`Er du sikker på, du vil slette "${listing.make} ${listing.model}"?`)) {
      deleteMutation.mutate(listing.listing_id)
    }
  }

  const handleView = (listing: CarListing) => {
    window.open(`/listing/${listing.listing_id}`, '_blank')
  }

  const handleBulkAction = async (selectedListings: CarListing[], action: string) => {
    if (action === 'delete') {
      if (confirm(`Er du sikker på, du vil slette ${selectedListings.length} annonce(r)?`)) {
        const listingIds = selectedListings.map(l => l.listing_id).filter(Boolean) as string[]
        bulkDeleteMutation.mutate(listingIds)
      }
    } else if (action === 'export') {
      // Implement export functionality
      console.log('Export functionality not yet implemented')
    }
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Seller filter */}
          <div className="min-w-[200px]">
            <Select
              value={filters.seller_id || 'all'}
              onValueChange={handleSellerChange}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Vælg sælger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle sælgere</SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name}
                  </SelectItem>
                ))}
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

        {/* Listings table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <ListingsTable
              listings={paginatedListings}
              loading={listingsLoading}
              onDelete={handleDelete}
              onView={handleView}
              onBulkAction={handleBulkAction}
            />
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
      </div>
    </AdminLayout>
  )
}

export default AdminListings