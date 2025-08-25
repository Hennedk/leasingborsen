import React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import AdminLayout from '@/components/admin/AdminLayout'
import SellerForm from '@/components/admin/SellerForm'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSeller } from '@/hooks/useSellers'

const editRoute = getRouteApi('/admin/sellers/edit/$id')

const AdminSellerForm: React.FC = () => {
  // Try to get id from edit route, fallback to empty string for create
  let id = ''
  try {
    id = editRoute.useParams().id
  } catch {
    // Not on edit route, this is create mode
    id = ''
  }
  const isEditing = Boolean(id)
  
  const { data: sellerData, isLoading } = useSeller(id || '')

  return (
    <AdminLayout title={isEditing ? 'Rediger Sælger' : 'Tilføj Sælger'}>
      <div className="space-y-6">
        {/* Breadcrumb and Header */}
        <div className="space-y-4">
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Sælgere', href: '/admin/sellers' },
              { label: isEditing ? 'Rediger' : 'Tilføj' }
            ]}
          />
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Rediger Sælger' : 'Tilføj Ny Sælger'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing 
                ? 'Opdater sælgerens information og gem ændringerne' 
                : 'Udfyld formularen for at registrere en ny sælger på platformen'
              }
            </p>
          </div>
        </div>

        {/* Form */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Indlæser...</p>
          </div>
        ) : (
          <SellerForm 
            seller={sellerData || undefined} 
            isEditing={isEditing}
          />
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminSellerForm