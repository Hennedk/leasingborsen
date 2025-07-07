import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface AdminFormHeaderProps {
  isEditing: boolean
  isLoading: boolean
  hasUnsavedChanges: boolean
  currentListingId?: string
  isAutoSaving?: boolean
  autoSaveError?: string | null
  lastSaved?: Date | null
  onCancel: () => void
  onReset: () => void
  onSubmit: () => void | Promise<void>
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
  isAutoSaving = false,
  autoSaveError = null,
  lastSaved = null,
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
          {/* Auto-save status indicators */}
          {isAutoSaving && (
            <span 
              className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-md flex items-center gap-2"
              aria-label="Gemmer automatisk"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Gemmer billeder...
            </span>
          )}
          
          {!isAutoSaving && lastSaved && !autoSaveError && isEditing && (
            <span 
              className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-md flex items-center gap-2"
              aria-label="Automatisk gemt"
            >
              <CheckCircle2 className="h-3 w-3" />
              Billeder gemt {new Date(lastSaved).toLocaleTimeString('da-DK', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
          
          {autoSaveError && (
            <span 
              className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md flex items-center gap-2"
              aria-label="Auto-gemning fejlede"
            >
              <AlertCircle className="h-3 w-3" />
              Auto-gemning fejlede
            </span>
          )}

          {/* Save shortcut hint */}
          {(hasUnsavedChanges || !currentListingId) && !isAutoSaving && (
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