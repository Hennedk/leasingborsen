import React from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminListingFormComponent from '@/components/admin/AdminListingForm'
import { useListing } from '@/hooks/useListings'

const AdminListingFormPage: React.FC = () => {
  const { id } = useParams()
  const isEditing = Boolean(id)
  
  const { data: listingData, isLoading } = useListing(id || '')

  return (
    <AdminLayout title={isEditing ? 'Rediger Annonce' : 'Opret Annonce'}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Rediger Annonce' : 'Opret Ny Annonce'}
          </h2>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Opdater annoncens information' 
              : 'Udfyld formularen for at oprette en ny bil annonce'
            }
          </p>
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