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
        isAutoSaving={formState.isAutoSaving}
        autoSaveError={formState.autoSaveError}
        lastSaved={formState.lastSaved}
        onCancel={formState.handleCancel}
        onReset={formState.handleReset}
        onSubmit={() => formState.form.handleSubmit(formState.handleSubmit)()}
      />

      {/* Metadata display for existing listings */}
      {isEditing && listing?.updated_at && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <strong>Oprettet:</strong> {listing.created_at ? new Date(listing.created_at).toLocaleDateString('da-DK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'}
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>Sidst opdateret:</strong> {listing.updated_at ? new Date(listing.updated_at).toLocaleDateString('da-DK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'}
            </span>
          </div>
        </div>
      )}

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
        onProcessedImagesChange={formState.handleProcessedImagesChange}
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