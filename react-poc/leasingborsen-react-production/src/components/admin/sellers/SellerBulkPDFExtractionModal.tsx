import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  PlayCircle,
  Loader2,
  Layers
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Seller, SellerPDFUrl } from '@/hooks/useSellers'

interface SellerBulkPDFExtractionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seller: Seller
  onComplete?: () => void
}

interface PDFExtractionStatus {
  url: string
  name: string
  status: 'pending' | 'downloading' | 'extracting' | 'processing' | 'complete' | 'error'
  progress: number
  message?: string
  extractionSessionId?: string
  itemsExtracted?: number
  error?: string
}

export const SellerBulkPDFExtractionModal: React.FC<SellerBulkPDFExtractionModalProps> = ({
  open,
  onOpenChange,
  seller,
  onComplete
}) => {
  const navigate = useNavigate()
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0)
  const [extractionStatuses, setExtractionStatuses] = useState<PDFExtractionStatus[]>([])
  const [overallProgress, setOverallProgress] = useState(0)

  // Initialize selected URLs when modal opens
  React.useEffect(() => {
    if (open && seller.pdf_urls) {
      const allUrls = seller.pdf_urls.map(pdf => pdf.url)
      setSelectedUrls(allUrls)
      setExtractionStatuses(
        seller.pdf_urls.map(pdf => ({
          url: pdf.url,
          name: pdf.name,
          status: 'pending',
          progress: 0
        }))
      )
    }
  }, [open, seller.pdf_urls])

  const toggleUrlSelection = useCallback((url: string) => {
    setSelectedUrls(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url)
        : [...prev, url]
    )
  }, [])

  const updatePdfStatus = useCallback((url: string, update: Partial<PDFExtractionStatus>) => {
    setExtractionStatuses(prev => 
      prev.map(status => 
        status.url === url 
          ? { ...status, ...update }
          : status
      )
    )
  }, [])

  // Process a single PDF URL
  const processSinglePdf = async (pdfUrl: SellerPDFUrl): Promise<PDFExtractionStatus> => {
    const status: PDFExtractionStatus = {
      url: pdfUrl.url,
      name: pdfUrl.name,
      status: 'downloading',
      progress: 0
    }

    try {
      // Update status to downloading
      updatePdfStatus(pdfUrl.url, { status: 'downloading', progress: 10, message: 'Downloading PDF...' })

      // Download PDF using proxy
      const proxyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: pdfUrl.url })
      })

      if (!proxyResponse.ok) {
        throw new Error(`Failed to download PDF: ${proxyResponse.status}`)
      }

      const blob = await proxyResponse.blob()
      const fileName = pdfUrl.url.split('/').pop()?.split('?')[0] || 'downloaded.pdf'
      const file = new File([blob], fileName, { type: 'application/pdf' })

      // Update status to extracting
      updatePdfStatus(pdfUrl.url, { status: 'extracting', progress: 30, message: 'Extracting text from PDF...' })

      // Extract text using Railway
      const railwayUrl = 'https://leasingborsen-production.up.railway.app'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('profile', 'automotive')

      const railwayResponse = await fetch(`${railwayUrl}/extract/structured`, {
        method: 'POST',
        body: formData
      })

      if (!railwayResponse.ok) {
        throw new Error('Railway extraction failed')
      }

      const railwayData = await railwayResponse.json()
      const extractedText = railwayData.text || railwayData.content || ''

      // Update status to processing
      updatePdfStatus(pdfUrl.url, { status: 'processing', progress: 60, message: 'Processing with AI...' })

      // Generate batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Get extraction config
      const config = {
        makeId: seller.make_id || null,
        makeName: seller.make_name || 'Unknown'
      }

      // Process with AI
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-extract-vehicles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: extractedText,
          dealerHint: seller.name,
          fileName: file.name,
          sellerId: seller.id,
          sellerName: seller.name,
          batchId,
          makeId: config.makeId,
          makeName: config.makeName,
          includeExistingListings: true,
          pdfUrl: pdfUrl.url
        })
      })

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json()
        throw new Error(errorData.error || 'AI extraction failed')
      }

      const aiResult = await aiResponse.json()

      // Update status to complete
      updatePdfStatus(pdfUrl.url, { 
        status: 'complete', 
        progress: 100, 
        message: 'Extraction complete!',
        extractionSessionId: aiResult.extractionSessionId,
        itemsExtracted: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0
      })

      return {
        ...status,
        status: 'complete',
        progress: 100,
        extractionSessionId: aiResult.extractionSessionId,
        itemsExtracted: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0
      }

    } catch (error) {
      console.error(`Error processing PDF ${pdfUrl.name}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      updatePdfStatus(pdfUrl.url, { 
        status: 'error', 
        progress: 0, 
        error: errorMessage,
        message: `Failed: ${errorMessage}`
      })

      return {
        ...status,
        status: 'error',
        progress: 0,
        error: errorMessage
      }
    }
  }

  const startBulkExtraction = async () => {
    if (selectedUrls.length === 0) {
      toast.error('Please select at least one PDF to extract')
      return
    }

    setIsProcessing(true)
    setCurrentPdfIndex(0)

    const selectedPdfs = seller.pdf_urls?.filter(pdf => selectedUrls.includes(pdf.url)) || []
    
    // Process PDFs sequentially
    for (let i = 0; i < selectedPdfs.length; i++) {
      setCurrentPdfIndex(i)
      setOverallProgress(Math.round((i / selectedPdfs.length) * 100))
      
      await processSinglePdf(selectedPdfs[i])
      
      // Add a small delay between PDFs to avoid overwhelming the services
      if (i < selectedPdfs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    setOverallProgress(100)
    setIsProcessing(false)

    // Show summary toast
    const completed = extractionStatuses.filter(s => s.status === 'complete').length
    const failed = extractionStatuses.filter(s => s.status === 'error').length
    
    if (completed > 0) {
      toast.success(`Successfully extracted ${completed} PDF${completed > 1 ? 's' : ''}`)
    }
    if (failed > 0) {
      toast.error(`Failed to extract ${failed} PDF${failed > 1 ? 's' : ''}`)
    }
  }

  const handleViewAllResults = () => {
    // Navigate to extraction sessions filtered by seller
    navigate(`/admin/extraction-sessions?seller=${seller.id}`)
    onOpenChange(false)
  }

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false)
      if (onComplete) {
        onComplete()
      }
    }
  }

  const getStatusIcon = (status: PDFExtractionStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'downloading':
      case 'extracting':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getStatusColor = (status: PDFExtractionStatus['status']): string => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700'
      case 'downloading':
      case 'extracting':
      case 'processing':
        return 'bg-blue-100 text-blue-700'
      case 'complete':
        return 'bg-green-100 text-green-700'
      case 'error':
        return 'bg-red-100 text-red-700'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5" />
            Bulk PDF Extraction - {seller.name}
          </DialogTitle>
          <DialogDescription>
            Extract vehicle listings from multiple PDF price lists at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Check if there are any PDF URLs */}
          {!seller.pdf_urls || seller.pdf_urls.length === 0 ? (
            <Alert className="border-destructive/50 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No PDF URLs are configured for this seller. Please add PDF URLs in the seller settings first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* PDF Selection List */}
              {!isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Select PDFs to extract ({selectedUrls.length} of {seller.pdf_urls.length} selected)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedUrls.length === seller.pdf_urls?.length) {
                          setSelectedUrls([])
                        } else {
                          setSelectedUrls(seller.pdf_urls?.map(pdf => pdf.url) || [])
                        }
                      }}
                    >
                      {selectedUrls.length === seller.pdf_urls?.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[200px] w-full border rounded-lg">
                    <div className="p-4 space-y-2">
                      {seller.pdf_urls?.map((pdfUrl) => (
                    <div
                      key={pdfUrl.url}
                      className="flex items-center space-x-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => toggleUrlSelection(pdfUrl.url)}
                    >
                      <Checkbox
                        checked={selectedUrls.includes(pdfUrl.url)}
                        onCheckedChange={() => toggleUrlSelection(pdfUrl.url)}
                        onClick={(e) => e.stopPropagation()}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pdfUrl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{pdfUrl.url}</p>
                      </div>
                    </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{currentPdfIndex + 1} of {selectedUrls.length} PDFs</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              {/* Individual PDF Status */}
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-3">
                  {extractionStatuses.map((status) => (
                    <div key={status.url} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(status.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{status.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {status.message || `Status: ${status.status}`}
                            </p>
                          </div>
                        </div>
                        <Badge className={`ml-2 ${getStatusColor(status.status)}`}>
                          {status.status}
                        </Badge>
                      </div>
                      
                      {status.status !== 'pending' && status.status !== 'error' && (
                        <Progress value={status.progress} className="h-1" />
                      )}
                      
                      {status.itemsExtracted !== undefined && (
                        <p className="text-xs text-green-600">
                          {status.itemsExtracted} vehicles extracted
                        </p>
                      )}
                      
                      {status.error && (
                        <p className="text-xs text-destructive">
                          {status.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Completion Summary */}
          {!isProcessing && extractionStatuses.some(s => s.status === 'complete' || s.status === 'error') && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Extraction Summary:</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {extractionStatuses.filter(s => s.status === 'complete').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Successful</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">
                        {extractionStatuses.filter(s => s.status === 'error').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {extractionStatuses.reduce((sum, s) => sum + (s.itemsExtracted || 0), 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Vehicles</p>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

            </>
          )}
        </div>

        {/* Actions - Outside scrollable area */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Close'}
          </Button>
          
          <div className="flex gap-2">
            {!isProcessing && extractionStatuses.some(s => s.status === 'complete') && (
              <Button
                variant="outline"
                onClick={handleViewAllResults}
              >
                View All Results
              </Button>
            )}
            
            {!isProcessing && !extractionStatuses.some(s => s.status === 'complete' || s.status === 'error') && seller.pdf_urls && seller.pdf_urls.length > 0 && (
              <Button
                onClick={startBulkExtraction}
                disabled={selectedUrls.length === 0}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Start Extraction ({selectedUrls.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}