import React from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminListingFormComponent from '@/components/admin/AdminListingFormNew'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useAdminListing } from '@/hooks/useAdminListings'

const AdminListingFormPage: React.FC = () => {
  const { id } = useParams()
  const isEditing = Boolean(id)
  
  const { data: listingData, isLoading } = useAdminListing(id || '')

  return (
    <AdminLayout title={isEditing ? 'Rediger Annonce' : 'Opret Annonce'}>
      <div className="space-y-6">
        {/* Breadcrumb and Header */}
        <div className="space-y-4">
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Annoncer', href: '/admin/listings' },
              { label: isEditing ? 'Rediger' : 'Opret' }
            ]}
          />
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Rediger Annonce' : 'Opret Ny Annonce'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing 
                ? 'Opdater annoncens information og gem ændringerne' 
                : 'Udfyld formularen for at oprette en ny bil annonce på platformen'
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
          <AdminListingFormComponent 
            listing={listingData?.data || undefined} 
            isEditing={isEditing}
          />
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminListingFormPage