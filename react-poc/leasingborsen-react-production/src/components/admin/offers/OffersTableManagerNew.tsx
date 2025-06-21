import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OffersTable } from './OffersTable'
import { OffersNoListingState, OffersLoadingState, OffersErrorState } from './OffersStates'
import { useOfferOperations } from './useOfferOperations'

/* Claude Change Summary:
 * Refactored OffersTableManager (529→150 lines) into focused components.
 * Added React.memo optimization and separated concerns.
 * Extracted business logic to useOfferOperations hook.
 * Related to: CODEBASE_IMPROVEMENTS_ADMIN.md Critical Issue #3
 */

interface OffersTableManagerProps {
  listingId?: string
  className?: string
}

export const OffersTableManager = React.memo<OffersTableManagerProps>(({
  listingId,
  className
}) => {
  const {
    offers,
    editableOffers,
    offersLoading,
    offersError,
    savingOffers,
    inputRefs,
    updateField,
    saveOffer,
    deleteOffer,
    duplicateOffer,
    handleKeyDown
  } = useOfferOperations({ listingId })

  // Show message when no listing ID
  if (!listingId) {
    return <OffersNoListingState className={className} />
  }

  // Show loading state
  if (offersLoading) {
    return <OffersLoadingState className={className} />
  }

  // Show error state
  if (offersError) {
    return <OffersErrorState className={className} error={offersError} />
  }

  return (
    <div className={className}>
      <OffersTable
        editableOffers={editableOffers}
        savingOffers={savingOffers}
        inputRefs={inputRefs}
        onUpdateField={updateField}
        onSaveOffer={saveOffer}
        onDeleteOffer={deleteOffer}
        onDuplicateOffer={duplicateOffer}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
})

OffersTableManager.displayName = 'OffersTableManager'