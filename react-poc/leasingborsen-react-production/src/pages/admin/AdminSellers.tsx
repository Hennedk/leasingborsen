import React, { useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import SellersTable from '@/components/admin/SellersTable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSellers } from '@/hooks/useSellers'
import { useDeleteSeller, useBulkDeleteSellers } from '@/hooks/useSellerMutations'
import { Plus, RefreshCw } from 'lucide-react'
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
import type { Seller } from '@/hooks/useSellers'

const AdminSellers: React.FC = () => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    seller?: Seller
    isBulk?: boolean
    selectedSellers?: Seller[]
  }>({
    open: false
  })

  // Data fetching
  const { data: sellers = [], isLoading: sellersLoading, refetch } = useSellers()
  
  // Mutations
  const deleteMutation = useDeleteSeller()
  const bulkDeleteMutation = useBulkDeleteSellers()

  // Handlers
  const handleDelete = (seller: Seller) => {
    setDeleteConfirmation({
      open: true,
      seller,
      isBulk: false
    })
  }

  const handleBulkAction = (selectedSellers: Seller[], action: string) => {
    if (action === 'delete') {
      setDeleteConfirmation({
        open: true,
        isBulk: true,
        selectedSellers
      })
    } else if (action === 'export') {
      toast.info('Export funktionalitet kommer snart')
    }
  }

  const executeDelete = () => {
    if (deleteConfirmation.isBulk && deleteConfirmation.selectedSellers) {
      const sellerIds = deleteConfirmation.selectedSellers.map(s => s.id)
      bulkDeleteMutation.mutate(sellerIds, {
        onSuccess: () => {
          toast.success(`${deleteConfirmation.selectedSellers?.length} sælgere slettet`)
        },
        onError: () => {
          toast.error('Kunne ikke slette sælgere')
        }
      })
    } else if (deleteConfirmation.seller?.id) {
      deleteMutation.mutate(deleteConfirmation.seller.id, {
        onSuccess: () => {
          toast.success('Sælger slettet')
        },
        onError: () => {
          toast.error('Kunne ikke slette sælger')
        }
      })
    }
    
    setDeleteConfirmation({ open: false })
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmation.open}
          onOpenChange={(open) => setDeleteConfirmation({ open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteConfirmation.isBulk ? 'Slet sælgere' : 'Slet sælger'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirmation.isBulk ? (
                  <>
                    Er du sikker på, du vil slette{' '}
                    <strong>{deleteConfirmation.selectedSellers?.length} sælgere</strong>?
                    <br />
                    Denne handling kan ikke fortrydes.
                  </>
                ) : (
                  <>
                    Er du sikker på, du vil slette sælgeren{' '}
                    <strong>"{deleteConfirmation.seller?.name}"</strong>?
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
                {deleteConfirmation.isBulk ? 'Slet sælgere' : 'Slet sælger'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}

export default AdminSellers