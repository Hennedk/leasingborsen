import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, Clock, CheckCircle, Layers } from 'lucide-react'
import { SellerPDFUploadModal } from './SellerPDFUploadModal'
import { SellerBulkPDFExtractionModal } from './SellerBulkPDFExtractionModal'
import { BatchUploadErrorBoundary } from '@/components/ErrorBoundaries'

import type { Seller } from '@/hooks/useSellers'

interface SellerImportButtonProps {
  seller: Seller
  onImportClick: (sellerId: string) => void
  isProcessing?: boolean
}

export const SellerImportButton: React.FC<SellerImportButtonProps> = ({
  seller,
  onImportClick,
  isProcessing = false
}) => {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showBulkExtractionDialog, setShowBulkExtractionDialog] = useState(false)
  
  // Enable import for all dealers - use auto-detection for unknown brands
  const isSupportedDealer = true // Allow all dealers to use auto-detection
  
  const hasListings = (seller.total_listings || 0) > 0
  const hasMultiplePdfUrls = (seller.pdf_urls?.length || 0) > 1
  
  const getImportButtonText = () => {
    if (isProcessing) return 'Processing...'
    if (hasListings) return 'Update Listings'
    return 'Import Listings'
  }
  
  const getImportIcon = () => {
    if (isProcessing) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
    }
    if (hasListings) {
      return <FileText className="w-4 h-4" />
    }
    return <Upload className="w-4 h-4" />
  }
  
  const getLastImportInfo = () => {
    if (!seller.last_import_date) {
      return 'Never imported'
    }
    
    const lastImport = new Date(seller.last_import_date)
    const daysSince = Math.floor((Date.now() - lastImport.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSince === 0) return 'Imported today'
    if (daysSince === 1) return 'Imported yesterday'
    if (daysSince <= 7) return `Imported ${daysSince} days ago`
    if (daysSince <= 30) return `Imported ${Math.floor(daysSince / 7)} weeks ago`
    return `Imported ${Math.floor(daysSince / 30)} months ago`
  }
  
  const getImportStatus = () => {
    if (!isSupportedDealer) {
      return (
        <Badge variant="secondary" className="text-xs">
          Not Configured
        </Badge>
      )
    }
    
    if (hasListings) {
      return (
        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200">
        Ready to Import
      </Badge>
    )
  }
  
  const handleImportClick = () => {
    if (isSupportedDealer) {
      setShowUploadDialog(true)
    } else {
      onImportClick(seller.id)
    }
  }
  

  const handleUploadComplete = (result: any) => {
    console.log('Upload complete:', result)
    // Close dialog and refresh seller data
    setShowUploadDialog(false)
    onImportClick(seller.id) // Trigger refresh
  }

  const handleBulkExtractionComplete = () => {
    console.log('Bulk extraction complete')
    // Close dialog and refresh seller data
    setShowBulkExtractionDialog(false)
    onImportClick(seller.id) // Trigger refresh
  }
  
  return (
    <>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            variant={hasListings ? "outline" : "default"}
            size="sm"
            onClick={handleImportClick}
            disabled={!isSupportedDealer || isProcessing}
            className="flex-1"
          >
            {getImportIcon()}
            <span className="ml-2">{getImportButtonText()}</span>
          </Button>
          
          {hasMultiplePdfUrls && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkExtractionDialog(true)}
              disabled={isProcessing}
              title={`Extract all ${seller.pdf_urls?.length} PDFs`}
            >
              <Layers className="h-4 w-4" />
              <span className="ml-2">{seller.pdf_urls?.length}</span>
            </Button>
          )}
        </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          {getLastImportInfo()}
        </div>
        {getImportStatus()}
      </div>
      
      {hasListings && (
        <div className="text-xs text-muted-foreground">
          {seller.total_listings} listings
        </div>
      )}
      
      {!isSupportedDealer && (
        <div className="text-xs text-orange-600">
          Batch import not yet configured for this dealer
        </div>
      )}
      </div>

      <BatchUploadErrorBoundary
        onRetry={() => setShowUploadDialog(true)}
        onCancel={() => setShowUploadDialog(false)}
      >
        <SellerPDFUploadModal
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          seller={seller}
          onUploadComplete={handleUploadComplete}
        />
      </BatchUploadErrorBoundary>

      {hasMultiplePdfUrls && (
        <BatchUploadErrorBoundary
          onRetry={() => setShowBulkExtractionDialog(true)}
          onCancel={() => setShowBulkExtractionDialog(false)}
        >
          <SellerBulkPDFExtractionModal
            open={showBulkExtractionDialog}
            onOpenChange={setShowBulkExtractionDialog}
            seller={seller}
            onComplete={handleBulkExtractionComplete}
          />
        </BatchUploadErrorBoundary>
      )}
    </>
  )
}