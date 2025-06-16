import React, { useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import ListingsTable from '@/components/admin/ListingsTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  useAdminListings, 
  useBulkDeleteListings,
  useAdminDeleteListing 
} from '@/hooks/useAdminListings'
import { Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CarListing } from '@/lib/supabase'

const AdminListings: React.FC = () => {
  const [filters] = useState({})
  
  // Data fetching
  const { data: listingsData, isLoading: listingsLoading, refetch } = useAdminListings(filters)
  
  // Mutations
  const bulkDeleteMutation = useBulkDeleteListings()
  const deleteMutation = useAdminDeleteListing()

  const listings = listingsData?.data || []

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

  const handleRefresh = () => {
    refetch()
  }

  return (
    <AdminLayout title="Annoncer">
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Annoncer</h2>
            <p className="text-muted-foreground">
              Administrer alle bil annoncer på platformen
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={listingsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${listingsLoading ? 'animate-spin' : ''}`} />
              Opdater
            </Button>
            <Button asChild>
              <Link to="/admin/listings/create">
                <Plus className="h-4 w-4 mr-2" />
                Opret Annonce
              </Link>
            </Button>
          </div>
        </div>


        {/* Listings table */}
        <Card>
          <CardHeader>
            <CardTitle>Alle Annoncer</CardTitle>
            <CardDescription>
              Komplet oversigt over annoncer med mulighed for redigering og sletning
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6">
              <ListingsTable
                listings={listings}
                loading={listingsLoading}
                onDelete={handleDelete}
                onView={handleView}
                onBulkAction={handleBulkAction}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminListings