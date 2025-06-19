import React from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import SellersTable from '@/components/admin/SellersTable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSellers } from '@/hooks/useSellers'
import { useDeleteSeller, useBulkDeleteSellers } from '@/hooks/useSellerMutations'
import { Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Seller } from '@/hooks/useSellers'

const AdminSellers: React.FC = () => {
  // Data fetching
  const { data: sellers = [], isLoading: sellersLoading, refetch } = useSellers()
  
  // Mutations
  const deleteMutation = useDeleteSeller()
  const bulkDeleteMutation = useBulkDeleteSellers()

  // Handlers
  const handleDelete = async (seller: Seller) => {
    if (confirm(`Er du sikker på, du vil slette sælgeren "${seller.name}"?`)) {
      deleteMutation.mutate(seller.id)
    }
  }

  const handleBulkAction = async (selectedSellers: Seller[], action: string) => {
    if (action === 'delete') {
      if (confirm(`Er du sikker på, du vil slette ${selectedSellers.length} sælger(e)?`)) {
        const sellerIds = selectedSellers.map(s => s.id)
        bulkDeleteMutation.mutate(sellerIds)
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
    <AdminLayout title="Sælgere">
      <div className="space-y-6">
        {/* Breadcrumb and Header */}
        <div className="space-y-4">
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Sælgere' }
            ]}
          />
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Sælgere</h1>
              <p className="text-muted-foreground">
                Administrer alle registrerede sælgere på platformen
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={sellersLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${sellersLoading ? 'animate-spin' : ''}`} />
                Opdater
              </Button>
              <Button asChild>
                <Link to="/admin/sellers/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Tilføj Sælger
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Sellers table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <SellersTable
              sellers={sellers}
              loading={sellersLoading}
              onDelete={handleDelete}
              onBulkAction={handleBulkAction}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminSellers