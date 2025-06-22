import React from 'react'
import { Button } from '@/components/ui/button'
import { FormItem, FormLabel } from '@/components/ui/form'
import { Plus, Loader2 } from 'lucide-react'
import { DialogTrigger } from '@/components/ui/dialog'
import { useOfferDialog } from '@/hooks/useOfferDialog'
import { OfferFormDialog } from '@/components/admin/offers/OfferFormDialog'
import { OffersDisplay } from '@/components/admin/offers/OffersDisplay'
import type { OfferFormData } from '@/lib/validations'

/* Claude Change Summary:
 * Refactored OffersManager (416→85 lines) into focused components.
 * Extracted form dialog and display logic to separate components.
 * Added useOfferOperations hook for business logic.
 * Related to: CODEBASE_IMPROVEMENTS_ADMIN.md Critical Issue #2
 */

interface OffersManagerProps {
  listingId?: string
  className?: string
}

/**
 * OffersManager - Simplified orchestrator for offer management
 * 
 * Refactored from 416 lines to focused component orchestration
 * Uses OfferFormDialog and OffersDisplay for separation of concerns
 */
export const OffersManager: React.FC<OffersManagerProps> = ({
  listingId,
  className
}) => {
  const {
    offers,
    offersLoading,
    offersError,
    hasOffers,
    form,
    isEditing,
    editingIndex,
    isDialogOpen,
    isPending,
    handleAddOffer,
    handleEditOffer,
    handleDeleteOffer,
    openEditDialog,
    openAddDialog,
    closeDialog,
    formatPrice
  } = useOfferDialog(listingId)

  // Handle form submission for both add and edit modes
  const handleFormSubmit = async (data: OfferFormData) => {
    if (isEditing && editingIndex !== null) {
      await handleEditOffer(editingIndex, data)
    } else {
      await handleAddOffer(data)
    }
  }

  // Show message when no listing ID
  if (!listingId) {
    return (
      <FormItem className={className}>
        <FormLabel>Tilbud</FormLabel>
        <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-muted-foreground">
            <p className="text-sm">Gem først biloplysningerne for at tilføje tilbud</p>
          </div>
        </div>
      </FormItem>
    )
  }

  // Show loading state
  if (offersLoading) {
    return (
      <FormItem className={className}>
        <FormLabel>Tilbud</FormLabel>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Indlæser tilbud...</span>
        </div>
      </FormItem>
    )
  }

  // Show error state
  if (offersError) {
    return (
      <FormItem className={className}>
        <FormLabel>Tilbud</FormLabel>
        <div className="text-destructive p-4 border border-destructive rounded-lg">
          Fejl ved indlæsning af tilbud: {offersError.message}
        </div>
      </FormItem>
    )
  }

  return (
    <FormItem className={className}>
      <div className="flex items-center justify-between">
        <FormLabel>
          Tilbud ({offers.length})
        </FormLabel>
        
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAddDialog}
            disabled={!listingId || isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isPending ? 'Tilføjer...' : 'Tilføj tilbud'}
          </Button>
        </DialogTrigger>
      </div>

      {/* Offer Form Dialog */}
      <OfferFormDialog
        isOpen={isDialogOpen}
        isEditing={isEditing}
        isPending={isPending}
        form={form}
        onClose={closeDialog}
        onSubmit={handleFormSubmit}
      />

      {/* Offers Display */}
      <OffersDisplay
        offers={offers}
        hasOffers={hasOffers}
        listingId={listingId}
        isPending={isPending}
        formatPrice={formatPrice}
        onEdit={openEditDialog}
        onDelete={handleDeleteOffer}
        onAdd={openAddDialog}
      />
    </FormItem>
  )
}