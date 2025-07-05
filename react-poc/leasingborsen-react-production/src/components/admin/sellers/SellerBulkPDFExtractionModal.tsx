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
  const [mergeMode, setMergeMode] = useState(false)

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
  // Process multiple PDFs by merging their text content
  const processMergedPdfs = async (pdfUrls: SellerPDFUrl[]): Promise<PDFExtractionStatus> => {
    const mergedStatus: PDFExtractionStatus = {
      url: 'merged',
      name: `Merged ${pdfUrls.length} PDFs`,
      status: 'downloading',
      progress: 0
    }

    try {
      console.log(`Starting merged extraction for ${pdfUrls.length} PDFs`)
      
      // Step 1: Download and extract text from all PDFs
      const extractedTexts: { name: string; text: string }[] = []
      
      for (let i = 0; i < pdfUrls.length; i++) {
        const pdfUrl = pdfUrls[i]
        const progress = Math.round((i / pdfUrls.length) * 30) // 0-30% for downloading
        
        updatePdfStatus('merged', { 
          status: 'downloading', 
          progress, 
          message: `Downloading PDF ${i + 1} of ${pdfUrls.length}: ${pdfUrl.name}` 
        })

        try {
          // Download PDF
          const proxyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-proxy`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: pdfUrl.url })
          })

          if (!proxyResponse.ok) {
            throw new Error(`Failed to download ${pdfUrl.name}`)
          }

          const blob = await proxyResponse.blob()
          
          // Validate PDF
          const arrayBuffer = await blob.slice(0, 5).arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const pdfHeader = String.fromCharCode(...bytes)
          
          if (!pdfHeader.startsWith('%PDF')) {
            throw new Error(`${pdfUrl.name} is not a valid PDF`)
          }

          const fileName = pdfUrl.url.split('/').pop()?.split('?')[0] || 'downloaded.pdf'
          const file = new File([blob], fileName, { type: 'application/pdf' })

          // Extract text using Railway
          const formData = new FormData()
          formData.append('file', file)
          formData.append('profile', 'automotive')

          const railwayResponse = await fetch(`https://leasingborsen-production.up.railway.app/extract/structured`, {
            method: 'POST',
            body: formData
          })

          if (!railwayResponse.ok) {
            throw new Error(`Railway extraction failed for ${pdfUrl.name}`)
          }

          const railwayData = await railwayResponse.json()
          const extractedText = railwayData.text || railwayData.content || ''

          if (extractedText) {
            extractedTexts.push({
              name: pdfUrl.name,
              text: extractedText
            })
            console.log(`Extracted ${extractedText.length} chars from ${pdfUrl.name}`)
          }

        } catch (error) {
          console.error(`Failed to process ${pdfUrl.name}:`, error)
          // Continue with other PDFs even if one fails
        }
      }

      if (extractedTexts.length === 0) {
        throw new Error('No text could be extracted from any PDF')
      }

      // Step 2: Combine all extracted texts
      updatePdfStatus('merged', { 
        status: 'processing', 
        progress: 40, 
        message: `Combining text from ${extractedTexts.length} PDFs...` 
      })

      const combinedText = extractedTexts
        .map(({ name, text }) => `\n=== PDF: ${name} ===\n${text}`)
        .join('\n\n')

      console.log(`Combined text length: ${combinedText.length} characters from ${extractedTexts.length} PDFs`)

      // Step 3: Process with AI
      updatePdfStatus('merged', { 
        status: 'processing', 
        progress: 60, 
        message: 'Processing combined PDFs with AI...' 
      })

      const batchId = `batch_merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const config = {
        makeId: seller.make_id || null,
        makeName: seller.make_name || 'Unknown'
      }

      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-extract-vehicles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: combinedText,
          dealerHint: seller.name,
          fileName: `Merged ${pdfUrls.length} PDFs`,
          sellerId: seller.id,
          sellerName: seller.name,
          batchId,
          makeId: config.makeId,
          makeName: config.makeName,
          includeExistingListings: true,
          pdfUrl: pdfUrls.map(p => p.url).join(', ')
        })
      })

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json()
        throw new Error(errorData.error || 'AI extraction failed')
      }

      const aiResult = await aiResponse.json()

      updatePdfStatus('merged', { 
        status: 'complete', 
        progress: 100, 
        message: 'Merged extraction complete!',
        extractionSessionId: aiResult.extractionSessionId,
        itemsExtracted: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0
      })

      return {
        url: 'merged',
        name: `Merged ${pdfUrls.length} PDFs`,
        status: 'complete',
        progress: 100,
        extractionSessionId: aiResult.extractionSessionId,
        itemsExtracted: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0
      }

    } catch (error) {
      console.error('Error in merged PDF processing:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      updatePdfStatus('merged', { 
        status: 'error', 
        progress: 0, 
        error: errorMessage,
        message: `Failed: ${errorMessage}`
      })

      return {
        url: 'merged',
        name: `Merged ${pdfUrls.length} PDFs`,
        status: 'error',
        progress: 0,
        error: errorMessage
      }
    }
  }

  const processSinglePdf = async (pdfUrl: SellerPDFUrl): Promise<PDFExtractionStatus> => {
    const status: PDFExtractionStatus = {
      url: pdfUrl.url,
      name: pdfUrl.name,
      status: 'downloading',
      progress: 0
    }

    try {
      console.log(`Starting extraction for ${pdfUrl.name} (${pdfUrl.url})`)
      
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
        const errorData = await proxyResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error(`PDF proxy error for ${pdfUrl.name}:`, errorData)
        throw new Error(`Failed to download PDF: ${proxyResponse.status} - ${errorData.error || 'Unknown error'}`)
      }

      const contentType = proxyResponse.headers.get('content-type')
      console.log(`PDF proxy response for ${pdfUrl.name}:`, {
        contentType,
        contentLength: proxyResponse.headers.get('content-length'),
        status: proxyResponse.status
      })

      const blob = await proxyResponse.blob()
      
      // Validate that we got actual content
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty')
      }
      
      // Check if it's actually a PDF by looking at the first few bytes
      const arrayBuffer = await blob.slice(0, 5).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const pdfHeader = String.fromCharCode(...bytes)
      
      if (!pdfHeader.startsWith('%PDF')) {
        console.warn(`Not a PDF for ${pdfUrl.name}, checking if it's an HTML page...`)
        
        // It might be an HTML page displaying the PDF
        // Try to extract the actual PDF URL from the HTML
        const text = await blob.text()
        
        // Common patterns for PDF URLs in HTML
        const patterns = [
          // iframe src
          /<iframe[^>]+src=["']([^"']+\.pdf[^"']*)/i,
          // embed src
          /<embed[^>]+src=["']([^"']+\.pdf[^"']*)/i,
          // object data
          /<object[^>]+data=["']([^"']+\.pdf[^"']*)/i,
          // Direct PDF links
          /href=["']([^"']+\.pdf[^"']*)/i,
          // PDF viewer URLs
          /pdfUrl=["']?([^"'&\s]+\.pdf[^"'&\s]*)/i,
          // Common PDF viewer patterns
          /viewer.*[?&]file=([^&\s]+\.pdf[^&\s]*)/i,
          // Hyundai specific pattern
          /window\.open\(['"]([^'"]+\.pdf[^'"]*)/i,
          // Download button patterns
          /download.*href=["']([^"']+\.pdf[^"']*)/i,
          // Data attributes
          /data-pdf-url=["']([^"']+\.pdf[^"']*)/i,
          // JavaScript variable assignments
          /(?:var|let|const)\s+\w*[Pp]df\w*\s*=\s*["']([^"']+\.pdf[^"']*)/i,
        ]
        
        let actualPdfUrl: string | null = null
        
        for (const pattern of patterns) {
          const match = text.match(pattern)
          if (match) {
            actualPdfUrl = match[1]
            
            // URL decode in case it's encoded
            try {
              actualPdfUrl = decodeURIComponent(actualPdfUrl)
            } catch (e) {
              // If decoding fails, use the original
            }
            
            // Make it absolute if it's relative
            if (actualPdfUrl.startsWith('/')) {
              const baseUrl = new URL(pdfUrl.url)
              actualPdfUrl = `${baseUrl.protocol}//${baseUrl.host}${actualPdfUrl}`
            } else if (!actualPdfUrl.startsWith('http')) {
              const baseUrl = new URL(pdfUrl.url)
              actualPdfUrl = new URL(actualPdfUrl, baseUrl.href).href
            }
            console.log(`Found PDF URL in HTML for ${pdfUrl.name}: ${actualPdfUrl}`)
            break
          }
        }
        
        if (!actualPdfUrl) {
          // Log first 500 chars of HTML to help debug
          console.error(`Could not find PDF URL in HTML for ${pdfUrl.name}. HTML preview:`, text.substring(0, 500))
          
          // Check if this might be a specific known pattern
          if (text.includes('katalog.hyundai.dk')) {
            throw new Error('This is a Hyundai catalog viewer page. Please right-click the download button and copy the direct PDF link instead.')
          } else if (text.includes('viewer') || text.includes('pdf-viewer')) {
            throw new Error('This is a PDF viewer page. Please find the download button and copy the direct PDF link.')
          } else {
            throw new Error('This appears to be a web page, not a direct PDF link. Please use the direct PDF download URL (usually found by right-clicking the download button and copying the link).')
          }
        }
        
        // Try downloading the actual PDF
        console.log(`Attempting to download actual PDF from: ${actualPdfUrl}`)
        updatePdfStatus(pdfUrl.url, { status: 'downloading', progress: 15, message: 'Found PDF link, downloading actual PDF...' })
        
        const actualPdfResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-proxy`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: actualPdfUrl })
        })
        
        if (!actualPdfResponse.ok) {
          throw new Error(`Failed to download actual PDF: ${actualPdfResponse.status}`)
        }
        
        const actualPdfBlob = await actualPdfResponse.blob()
        
        // Verify this is actually a PDF
        const actualArrayBuffer = await actualPdfBlob.slice(0, 5).arrayBuffer()
        const actualBytes = new Uint8Array(actualArrayBuffer)
        const actualPdfHeader = String.fromCharCode(...actualBytes)
        
        if (!actualPdfHeader.startsWith('%PDF')) {
          throw new Error('Downloaded file from extracted URL is still not a valid PDF')
        }
        
        // Use the actual PDF blob
        blob = actualPdfBlob
      }

      const fileName = pdfUrl.url.split('/').pop()?.split('?')[0] || 'downloaded.pdf'
      const file = new File([blob], fileName, { type: 'application/pdf' })
      
      console.log(`Successfully downloaded PDF ${pdfUrl.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

      // Update status to extracting
      updatePdfStatus(pdfUrl.url, { status: 'extracting', progress: 30, message: 'Extracting text from PDF...' })

      // Extract text using Railway
      const railwayUrl = 'https://leasingborsen-production.up.railway.app'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('profile', 'automotive')

      // Add timeout to Railway request with retry logic
      let railwayResponse
      let retries = 2 // Allow 2 retries
      let lastError: Error | null = null

      while (retries >= 0) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        try {
          console.log(`Attempting Railway extraction for ${pdfUrl.name} (${2 - retries} attempt)`)
          
          railwayResponse = await fetch(`${railwayUrl}/extract/structured`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          // If we got a response (even if not ok), break the retry loop
          if (railwayResponse) {
            break
          }
        } catch (fetchError) {
          clearTimeout(timeoutId)
          lastError = fetchError instanceof Error ? fetchError : new Error('Unknown error')
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            lastError = new Error('Railway extraction timed out after 30 seconds')
          } else {
            lastError = new Error(`Railway connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
          }
          
          console.error(`Railway attempt ${2 - retries} failed:`, lastError.message)
          
          retries--
          if (retries >= 0) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }

      if (!railwayResponse) {
        throw lastError || new Error('Railway extraction failed after all retries')
      }

      if (!railwayResponse.ok) {
        let errorMessage = `Railway extraction failed with status ${railwayResponse.status}`
        
        // Common error status explanations
        if (railwayResponse.status === 500) {
          errorMessage += ' (Internal Server Error - Railway service may be experiencing issues)'
        } else if (railwayResponse.status === 502) {
          errorMessage += ' (Bad Gateway - Railway service may be down)'
        } else if (railwayResponse.status === 503) {
          errorMessage += ' (Service Unavailable - Railway service may be overloaded)'
        } else if (railwayResponse.status === 504) {
          errorMessage += ' (Gateway Timeout - Railway service took too long to respond)'
        }
        
        try {
          const errorData = await railwayResponse.text()
          if (errorData) {
            errorMessage += `: ${errorData.substring(0, 200)}` // Limit error message length
          }
        } catch (e) {
          // Ignore error parsing
        }
        throw new Error(errorMessage)
      }

      const railwayData = await railwayResponse.json()
      const extractedText = railwayData.text || railwayData.content || ''

      if (!extractedText) {
        throw new Error('No text extracted from PDF')
      }

      console.log(`Railway extraction successful for ${pdfUrl.name}, extracted ${extractedText.length} characters`)

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

    // Quick health check for Railway service
    try {
      const healthResponse = await fetch('https://leasingborsen-production.up.railway.app/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (!healthResponse.ok) {
        console.warn('Railway health check failed, but continuing anyway')
      }
    } catch (error) {
      console.warn('Could not reach Railway service for health check:', error)
      toast.warning('Railway service may be experiencing issues. Extraction may be slower.')
    }

    const selectedPdfs = seller.pdf_urls?.filter(pdf => selectedUrls.includes(pdf.url)) || []
    
    if (mergeMode && selectedPdfs.length > 1) {
      // Merge mode: Process all PDFs together
      console.log(`Starting merged extraction for ${selectedPdfs.length} PDFs`)
      
      // Initialize status for merged extraction
      setExtractionStatuses([{
        url: 'merged',
        name: `Merged ${selectedPdfs.length} PDFs`,
        status: 'pending',
        progress: 0
      }])
      
      const result = await processMergedPdfs(selectedPdfs)
      
      // Update the status with the result
      setExtractionStatuses([result])
      
      setOverallProgress(100)
      setIsProcessing(false)
      
      // Show summary
      if (result.status === 'complete') {
        toast.success(`Successfully extracted ${result.itemsExtracted || 0} vehicles from ${selectedPdfs.length} merged PDFs`)
      } else {
        toast.error(`Failed to extract from merged PDFs: ${result.error}`)
      }
      
    } else {
      // Sequential mode: Process PDFs one by one
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
                  
                  {/* Merge Mode Toggle */}
                  {selectedUrls.length > 1 && (
                    <div className="mt-4 p-4 bg-accent/20 rounded-lg border border-accent">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="merge-mode"
                          checked={mergeMode}
                          onCheckedChange={(checked) => setMergeMode(checked as boolean)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor="merge-mode" 
                            className="text-sm font-medium cursor-pointer"
                          >
                            Merge PDFs before extraction
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Combine all selected PDFs into one extraction session. 
                            Perfect for dealers like Kia with separate PDFs per pricing option.
                            This will merge identical vehicles and keep all pricing offers.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>
                    {mergeMode 
                      ? `Merging ${selectedUrls.length} PDFs` 
                      : `${currentPdfIndex + 1} of {selectedUrls.length} PDFs`
                    }
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2" />
                {mergeMode && (
                  <p className="text-xs text-muted-foreground text-center">
                    Combining PDFs into single extraction session...
                  </p>
                )}
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
                {mergeMode && selectedUrls.length > 1
                  ? `Merge & Extract (${selectedUrls.length} PDFs)`
                  : `Start Extraction (${selectedUrls.length})`
                }
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}