import React from 'react'
import type { CarListing } from '@/types'
import { useAdminFormState } from '@/hooks/useAdminFormState'
import { AdminFormLayout } from './AdminFormLayout'
import { AdminFormHeader } from './AdminFormHeader'
import { AdminFormSections } from './AdminFormSections'

interface AdminListingFormProps {
  listing?: CarListing
  isEditing?: boolean
}


/**
 * AdminListingFormNew - Refactored with component decomposition
 * 
 * This component has been broken down into focused, reusable components:
 * - AdminFormLayout: Handles form structure and submission
 * - AdminFormHeader: Navigation and action buttons
 * - AdminFormSections: Form sections with proper layout
 * - useAdminFormState: Centralized form state management
 */
const AdminListingFormNew: React.FC<AdminListingFormProps> = ({ 
  listing, 
  isEditing = false 
}) => {
  // All form state management is now handled by the custom hook
  const formState = useAdminFormState({ listing, isEditing })
  
  // Early return for loading state
  if (formState.referenceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Indlæser reference data...</p>
        </div>
      </div>
    )
  }
  
  // Early return if reference data is missing
  if (!formState.referenceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive">Kunne ikke indlæse reference data</p>
        </div>
      </div>
    )
  }

  return (
    <AdminFormLayout 
      form={formState.form} 
      onSubmit={formState.handleSubmit}
    >
      {/* Form Header with Navigation and Actions */}
      <AdminFormHeader
        isEditing={formState.isEditing}
        isLoading={formState.isLoading}
        hasUnsavedChanges={formState.hasUnsavedChanges}
        currentListingId={formState.currentListingId}
        onCancel={formState.handleCancel}
        onReset={formState.handleReset}
        onSubmit={() => formState.form.handleSubmit(formState.handleSubmit)()}
      />

      {/* Form Sections */}
      <AdminFormSections
        control={formState.form.control}
        setValue={formState.form.setValue}
        watch={formState.form.watch}
        referenceData={formState.referenceData}
        selectedMakeId={formState.selectedMakeId}
        currentListingId={formState.currentListingId}
        onMakeChange={formState.handleMakeChange}
        onModelChange={formState.handleModelChange}
        onImagesChange={formState.handleImagesChange}
        onJsonDataParsed={(data) => {
          // Store the offers data for later use when listing is created
          console.log('JSON offers data received:', data.offers)
          // TODO: Store offers in form state or handle after listing creation
        }}
      />
    </AdminFormLayout>
  )
}

export default AdminListingFormNew