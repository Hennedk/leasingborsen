import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, RotateCcw, Loader2 } from 'lucide-react'

interface AdminFormHeaderProps {
  isEditing: boolean
  isLoading: boolean
  hasUnsavedChanges: boolean
  currentListingId?: string
  onCancel: () => void
  onReset: () => void
  onSubmit: () => void
}

/**
 * AdminFormHeader - Handles form navigation, title, and action buttons
 * Extracted from AdminListingFormNew for better component separation
 */
export const AdminFormHeader = React.memo<AdminFormHeaderProps>(({
  isEditing,
  isLoading,
  hasUnsavedChanges,
  currentListingId,
  onCancel,
  onReset,
  onSubmit
}) => {
  return (
    <>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="flex items-center gap-2"
          aria-label="Tilbage til annonceoversigt"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbage til annoncer
        </Button>
      </div>

      {/* Header with Save Actions */}
      <div className="flex items-center justify-between py-2">
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Rediger annonce' : 'Opret ny annonce'}
        </h1>
        
        <div className="admin-button-group gap-3">
          {/* Save shortcut hint */}
          {(hasUnsavedChanges || !currentListingId) && (
            <span 
              className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md"
              aria-label="Genvej til at gemme"
            >
              Ctrl+S for at gemme
            </span>
          )}
          
          {/* Submit button */}
          <Button 
            type="submit" 
            onClick={onSubmit}
            disabled={isLoading || (!hasUnsavedChanges && !!currentListingId)} 
            className="flex items-center gap-2 px-4"
            aria-label={isLoading ? 'Gemmer annonce' : (isEditing ? 'Gem ændringer' : 'Opret annonce')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? 'Gemmer...' : (isEditing ? 'Gem biloplysninger' : 'Opret bil')}
          </Button>
          
          {/* Reset button - only show when editing */}
          {isEditing && (
            <Button 
              type="button" 
              variant="outline"
              onClick={onReset}
              disabled={isLoading || !hasUnsavedChanges}
              className="flex items-center gap-2 px-4"
              aria-label="Nulstil formular til original værdier"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Nulstil
            </Button>
          )}
        </div>
      </div>
    </>
  )
})

AdminFormHeader.displayName = 'AdminFormHeader'