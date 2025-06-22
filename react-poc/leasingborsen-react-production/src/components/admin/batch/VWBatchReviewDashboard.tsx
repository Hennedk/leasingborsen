import React from 'react'
import { useParams } from 'react-router-dom'
import { useBatchReviewState } from '@/hooks/useBatchReviewState'
import { BatchReviewHeader } from './BatchReviewHeader'
import { BatchActionsPanel } from './BatchActionsPanel'
import { BatchItemsTable } from './BatchItemsTable'
import { DataErrorBoundary } from '@/components/ErrorBoundaries'
import { toast } from 'sonner'

/**
 * VW Batch Review Dashboard - Refactored with component decomposition
 * 
 * Reduced from 659 lines to ~40 lines by extracting:
 * - useBatchReviewState: State management hook (200 lines)
 * - BatchReviewHeader: Header with navigation and statistics (120 lines)
 * - BatchActionsPanel: Bulk operations panel (100 lines)
 * - BatchItemsTable: Tabbed table with item rows (80 lines)
 * - BatchItemRow: Individual item with expansion (120 lines)
 * 
 * Benefits:
 * - Single responsibility principle
 * - Improved testability
 * - Better performance with React.memo
 * - Enhanced error boundary isolation
 * - Easier maintenance and debugging
 */
export const VWBatchReviewDashboard: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>()
  
  if (!batchId) {
    toast.error('Batch ID mangler')
    return null
  }

  // All state management is now handled by the custom hook
  const batchState = useBatchReviewState(batchId)

  // Error state
  if (batchState.error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg">
          <h2 className="font-bold mb-2">Fejl ved indlæsning</h2>
          <p>{batchState.error}</p>
          <button 
            onClick={batchState.loadBatchDetails}
            className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
          >
            Prøv igen
          </button>
        </div>
      </div>
    )
  }

  return (
    <DataErrorBoundary onRetry={batchState.loadBatchDetails}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with navigation and statistics */}
        <BatchReviewHeader
          batchDetails={batchState.batchDetails}
          statistics={batchState.statistics}
          loading={batchState.loading}
          onGoBack={batchState.handleGoBack}
          onRefresh={batchState.loadBatchDetails}
        />

        {/* Bulk actions panel (shown when items are selected) */}
        <BatchActionsPanel
          selectedItems={batchState.selectedItemObjects}
          hasSelection={batchState.hasSelection}
          isProcessing={batchState.isProcessing}
          onExecuteBulkAction={batchState.executeBulkAction}
          onClearSelection={batchState.clearSelection}
        />

        {/* Main items table with tabs and expansion */}
        {batchState.batchDetails && (
          <BatchItemsTable
            items={batchState.batchDetails.items}
            selectedItems={batchState.selectedItems}
            expandedItems={batchState.expandedItems}
            processingItems={batchState.processingItems}
            isAllSelected={batchState.isAllSelected}
            onToggleSelectAll={batchState.toggleSelectAll}
            onToggleItemSelection={batchState.toggleItemSelection}
            onToggleItemExpansion={batchState.toggleItemExpansion}
            formatPrice={batchState.formatPrice}
            getConfidenceColor={batchState.getConfidenceColor}
            getConfidenceLabel={batchState.getConfidenceLabel}
          />
        )}
      </div>
    </DataErrorBoundary>
  )
}