import React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import AdminLayout from '@/components/admin/AdminLayout'
import { AdminListingFormNew as AdminListingFormComponent } from '@/components/admin/listings/forms'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useAdminListing } from '@/hooks/useAdminListings'

const editRoute = getRouteApi('/admin/listings/edit/$id')

const AdminListingFormPage: React.FC = () => {
  // Try to get id from edit route, fallback to empty string for create
  let id = ''
  try {
    id = editRoute.useParams().id
  } catch {
    // Not on edit route, this is create mode
    id = ''
  }
  const isEditing = Boolean(id)
  
  const { data: listingData, isLoading } = useAdminListing(id || '')

  return (
    <AdminLayout title={isEditing ? 'Rediger Annonce' : 'Opret Annonce'}>
      <div className="space-y-6">
        {/* Breadcrumb only */}
        <Breadcrumb 
          items={[
            { label: 'Dashboard', href: '/admin' },
            { label: 'Annoncer', href: '/admin/listings' },
            { label: isEditing ? 'Rediger' : 'Opret' }
          ]}
        />

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