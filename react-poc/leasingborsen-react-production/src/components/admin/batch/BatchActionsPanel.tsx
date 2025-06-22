import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle 
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { BatchItem, BulkAction } from '@/types/admin'

interface BatchActionsPanelProps {
  selectedItems: BatchItem[]
  hasSelection: boolean
  isProcessing: boolean
  onExecuteBulkAction: (action: BulkAction) => Promise<void>
  onClearSelection: () => void
}

/**
 * Bulk actions panel for batch review operations
 */
export const BatchActionsPanel: React.FC<BatchActionsPanelProps> = ({
  selectedItems,
  hasSelection,
  isProcessing,
  onExecuteBulkAction,
  onClearSelection
}) => {
  if (!hasSelection) {
    return null
  }

  const selectedCount = selectedItems.length
  const actionCounts = {
    new: selectedItems.filter(item => item.action === 'new').length,
    update: selectedItems.filter(item => item.action === 'update').length,
    delete: selectedItems.filter(item => item.action === 'delete').length
  }

  const hasLowConfidence = selectedItems.some(item => item.confidence_score < 0.7)

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedCount} valgt
              </Badge>
              
              {actionCounts.new > 0 && (
                <Badge variant="outline" className="border-green-300 text-green-700">
                  {actionCounts.new} nye
                </Badge>
              )}
              
              {actionCounts.update > 0 && (
                <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                  {actionCounts.update} opdateringer
                </Badge>
              )}
              
              {actionCounts.delete > 0 && (
                <Badge variant="outline" className="border-red-300 text-red-700">
                  {actionCounts.delete} sletninger
                </Badge>
              )}
            </div>

            {hasLowConfidence && (
              <div className="flex items-center gap-1 text-yellow-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Lav konfidens i markeringen</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={isProcessing}
            >
              Ryd markering
            </Button>

            {/* Approve Action */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Behandler...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Godkend ({selectedCount})
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Godkend valgte annoncer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Er du sikker på, at du vil godkende {selectedCount} annoncer?
                    {hasLowConfidence && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Advarsel:</span>
                        </div>
                        <span>Nogle af de valgte annoncer har lav konfidens. Gennemgå dem grundigt før godkendelse.</span>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onExecuteBulkAction('approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Godkend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Reject Action */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isProcessing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Afvis ({selectedCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Afvis valgte annoncer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Er du sikker på, at du vil afvise {selectedCount} annoncer?
                    Denne handling kan ikke fortrydes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onExecuteBulkAction('reject')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Afvis
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}