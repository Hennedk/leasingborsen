import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, CheckCircle, AlertCircle, Info, Settings, ExternalLink, Link } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useJobProgress } from '@/hooks/useJobProgress'
import { toast } from 'sonner'
import type { Seller } from '@/hooks/useSellers'
import { useUpdateSeller } from '@/hooks/useSellerMutations'
import { supabase } from '@/lib/supabase'

interface ExtractionResult {
  batchId: string
  jobId: string
  itemsCreated: number
  stats: {
    new: number
    updated: number
    removed: number
    missing_models: number
    total_processed: number
  }
  dealerDetection?: {
    detectedType: string
    confidence: number
    method: string
  }
  extractionSessionId?: string
}

interface SellerPDFUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seller: Seller
  onUploadComplete?: (result: ExtractionResult) => void
}

interface UploadState {
  // Input mode
  inputMode: 'file' | 'url'
  fileUrl: string
  
  // Upload states
  isDragOver: boolean
  file: File | null
  
  // Processing states
  isProcessing: boolean
  currentStep: 'idle' | 'downloading' | 'railway' | 'ai' | 'complete' | 'error'
  progress: number
  progressMessage: string
  
  // Results
  railwayResult: any | null
  aiResult: any | null
  extractionResult: ExtractionResult | null
  error: string | null
  
  // Job tracking
  jobId: string | null
}

export const SellerPDFUploadModal: React.FC<SellerPDFUploadModalProps> = ({
  open,
  onOpenChange,
  seller,
  onUploadComplete: _onUploadComplete
}) => {
  const navigate = useNavigate()
  const updateSeller = useUpdateSeller()
  const [state, setState] = useState<UploadState>({
    inputMode: 'file',
    fileUrl: '',
    isDragOver: false,
    file: null,
    isProcessing: false,
    currentStep: 'idle',
    progress: 0,
    progressMessage: '',
    railwayResult: null,
    aiResult: null,
    extractionResult: null,
    error: null,
    jobId: null
  })

  // Reset state when modal opens to ensure fresh start
  React.useEffect(() => {
    if (open) {
      // Check if seller has any PDF URLs
      const hasPdfUrls = seller?.pdf_urls && seller.pdf_urls.length > 0
      const hasLegacyUrl = seller?.pdf_url
      
      setState({
        inputMode: hasPdfUrls || hasLegacyUrl ? 'url' : 'file',
        fileUrl: hasPdfUrls ? '' : (seller?.pdf_url || ''), // Don't auto-populate if multiple URLs
        isDragOver: false,
        file: null,
        isProcessing: false,
        currentStep: 'idle',
        progress: 0,
        progressMessage: '',
        railwayResult: null,
        aiResult: null,
        extractionResult: null,
        error: null,
        jobId: null
      })
    }
  }, [open, seller?.pdf_url, seller?.pdf_urls])

  // Monitor job progress for AI extraction
  const { startPolling } = useJobProgress(state.jobId || '', {
    autoStart: false,
    onCompleted: (job) => {
      setState(prev => ({
        ...prev,
        currentStep: 'complete',
        progress: 100,
        progressMessage: 'AI extraction completed successfully!',
        extractionResult: {
          batchId: job.batchId,
          jobId: job.id,
          itemsCreated: (job as any).result?.summary?.totalExtracted || job.itemsProcessed || 0,
          stats: { 
            new: (job as any).result?.summary?.totalNew || 0, 
            updated: (job as any).result?.summary?.totalUpdated || 0, 
            removed: (job as any).result?.summary?.totalDeleted || 0,
            missing_models: (job as any).result?.summary?.missing_models || 0,
            total_processed: (job as any).result?.summary?.totalExtracted || job.itemsProcessed || 0 
          },
          extractionSessionId: (job as any).extractionSessionId || (job as any).extraction_session_id || (job as any).stats?.extraction_session?.session_id
        }
      }))
      
      toast.success(`Successfully extracted ${(job as any).result?.summary?.totalExtracted || job.itemsProcessed || 0} vehicle listings and staged for review`)
    },
    onFailed: (job) => {
      setState(prev => ({
        ...prev,
        currentStep: 'error',
        error: job.errorMessage || 'AI extraction failed',
        progress: 0,
        isProcessing: false
      }))
      
      toast.error('PDF extraction failed')
    },
    onProgress: (job) => {
      setState(prev => ({
        ...prev,
        progress: Math.max(prev.progress, job.progress),
        progressMessage: job.currentStep || 'Processing with AI...'
      }))
    }
  })

  // Get extraction config directly from seller make data
  const getExtractionConfig = useCallback(() => {
    return {
      makeId: (seller as any).make_id || null,
      makeName: (seller as any).make_name || null,
      sellerId: seller.id,
      sellerName: seller.name
    }
  }, [seller])

  // Recent URLs management
  const [recentUrls, setRecentUrls] = useState<string[]>(() => {
    const stored = localStorage.getItem('recentPDFUrls')
    return stored ? JSON.parse(stored) : []
  })

  const addRecentUrl = useCallback((url: string) => {
    const updated = [url, ...recentUrls.filter(u => u !== url)].slice(0, 5)
    setRecentUrls(updated)
    localStorage.setItem('recentPDFUrls', JSON.stringify(updated))
  }, [recentUrls])

  // URL validation
  const validatePDFUrl = useCallback((url: string): boolean => {
    try {
      const urlObj = new URL(url)
      
      // Basic checks
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false
      }
      
      // Check file extension (not foolproof but helpful)
      if (urlObj.pathname.endsWith('.pdf')) {
        return true
      }
      
      // Check for common PDF URL patterns
      if (urlObj.pathname.includes('/download/') ||
          urlObj.pathname.includes('/pdf/') ||
          urlObj.searchParams.has('format=pdf')) {
        return true
      }
      
      return true // Let server validate content-type
    } catch {
      return false
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: true }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: false }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: false }))
    
    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find(file => file.type === 'application/pdf')
    
    if (pdfFile) {
      handleFile(pdfFile)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      handleFile(file)
    }
  }, [])

  const handleFile = useCallback((file: File) => {
    setState(prev => ({
      ...prev,
      file,
      error: null,
      extractionResult: null,
      railwayResult: null,
      aiResult: null,
      currentStep: 'idle'
    }))
  }, [])

  // Helper function to check if URL is already saved
  const isUrlAlreadySaved = useCallback((url: string): boolean => {
    if (!seller) return false
    
    // Check legacy single URL
    if (seller.pdf_url === url) return true
    
    // Check multiple URLs
    if (seller.pdf_urls) {
      return seller.pdf_urls.some(pdfUrl => pdfUrl.url === url)
    }
    
    return false
  }, [seller])
  
  // Helper function to prompt and save URL
  const promptToSaveUrl = useCallback((url: string) => {
    if (!seller || isUrlAlreadySaved(url)) return
    
    setTimeout(() => {
      const name = window.prompt('Giv denne PDF URL et navn (f.eks. "VW Personbiler", "Erhverv 2024"):', 'Standard prisliste')
      
      if (name) {
        const currentPdfUrls = seller.pdf_urls || []
        const updatedPdfUrls = [...currentPdfUrls, { name, url }]
        
        updateSeller.mutate({
          id: seller.id,
          pdf_urls: updatedPdfUrls
        })
        
        toast.success('PDF URL gemt til fremtidig brug')
      }
    }, 500)
  }, [seller, isUrlAlreadySaved, updateSeller])

  const processWithRailwayAndAI = useCallback(async (fileToProcess?: File) => {
    // Use provided file or fall back to state.file
    const file = fileToProcess || state.file
    if (!file) return

    const config = getExtractionConfig()
    
    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: 'railway',
      progress: 10,
      progressMessage: 'Starting PDF extraction with Railway service...',
      error: null
    }))

    try {
      // Step 1: Extract text using Railway service
      setState(prev => ({
        ...prev,
        progress: 20,
        progressMessage: 'Extracting text with Railway service...'
      }))

      // Use Railway service for text extraction
      let extractedText = ''
      let railwayDebugInfo = null
      
      try {
        const railwayUrl = 'https://leasingborsen-production.up.railway.app'
        const formData = new FormData()
        formData.append('file', file)
        formData.append('profile', 'automotive')

        console.log('🚂 Railway: Starting PDF extraction...', {
          file: file.name,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          url: `${railwayUrl}/extract/structured`
        })

        const railwayResponse = await fetch(`${railwayUrl}/extract/structured`, {
          method: 'POST',
          body: formData
        })

        console.log('🚂 Railway: Response received', {
          status: railwayResponse.status,
          statusText: railwayResponse.statusText,
          ok: railwayResponse.ok
        })

        if (!railwayResponse.ok) {
          const errorText = await railwayResponse.text()
          console.error('🚂 Railway: Error response', { errorText })
          throw new Error(`Railway extraction failed: ${railwayResponse.status} ${errorText}`)
        }

        const railwayResult = await railwayResponse.json()
        
        // Try multiple possible locations for the extracted text
        extractedText = railwayResult.extracted_text || 
                       railwayResult.text || 
                       railwayResult.data?.extracted_text ||
                       railwayResult.data?.text ||
                       railwayResult.data ||
                       ''
        
        railwayDebugInfo = {
          responseKeys: Object.keys(railwayResult),
          dataKeys: railwayResult.data ? Object.keys(railwayResult.data) : null,
          textLength: extractedText.length,
          hasExtractedText: !!railwayResult.extracted_text,
          hasText: !!railwayResult.text,
          hasDataExtractedText: !!(railwayResult.data?.extracted_text),
          hasDataText: !!(railwayResult.data?.text),
          dataType: typeof railwayResult.data,
          preview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : '')
        }

        console.log('🚂 Railway: Extraction successful', railwayDebugInfo)
        console.log('🚂 Railway: Full response structure', {
          fullResponse: railwayResult,
          dataContent: railwayResult.data,
          extractedTextSources: {
            'railwayResult.extracted_text': railwayResult.extracted_text,
            'railwayResult.text': railwayResult.text,
            'railwayResult.data?.extracted_text': railwayResult.data?.extracted_text,
            'railwayResult.data?.text': railwayResult.data?.text,
            'railwayResult.data (direct)': typeof railwayResult.data === 'string' ? railwayResult.data?.substring(0, 100) + '...' : railwayResult.data
          }
        })

        // Final fallback - if still no text, try to stringify the data
        if (!extractedText || extractedText.length < 10) {
          if (railwayResult.data && typeof railwayResult.data === 'object') {
            // If data is an object, try to extract any string values
            const dataString = JSON.stringify(railwayResult.data, null, 2)
            console.log('🚂 Railway: Trying data object as string:', dataString.substring(0, 200))
            extractedText = dataString
          }
          
          if (!extractedText || extractedText.length < 10) {
            throw new Error(`Railway extraction produced insufficient text: ${extractedText.length} characters. Response structure: ${JSON.stringify(Object.keys(railwayResult))}`)
          }
        }

      } catch (railwayError) {
        console.error('🚂 Railway: Extraction failed', railwayError)
        // Fallback to basic text extraction
        const errorMessage = railwayError instanceof Error ? railwayError.message : String(railwayError)
        extractedText = `PDF file: ${file.name}\nFallback extraction - content not available\nError: ${errorMessage}`
        
        // Show error in UI
        setState(prev => ({
          ...prev,
          progress: 25,
          progressMessage: `Railway extraction failed: ${errorMessage}. Using fallback...`
        }))
      }

      setState(prev => ({
        ...prev,
        railwayResult: { extracted_text: extractedText },
        progress: 50,
        progressMessage: 'Railway extraction successful, starting AI processing...',
        currentStep: 'ai'
      }))

      // Step 2: Process with AI using the extracted text
      const batchId = `batch-${Date.now()}-${seller.id}`
      
      setState(prev => ({
        ...prev,
        progress: 60,
        progressMessage: 'Processing with AI extraction engine...'
      }))

      // Fetch reference data for AI context
      setState(prev => ({
        ...prev,
        progress: 65,
        progressMessage: 'Fetching database reference data for AI context...'
      }))

      let referenceData = null
      try {
        const { data: refData, error: refError } = await supabase
          .rpc('get_extraction_reference_data', {
            seller_make_id: config.makeId
          })
        
        if (refError) {
          console.warn('Could not fetch reference data:', refError.message)
        } else {
          referenceData = refData
          console.log('📚 Reference data fetched:', {
            makesCount: Object.keys(refData.makes_models || {}).length,
            fuelTypesCount: refData.fuel_types?.length || 0,
            transmissionsCount: refData.transmissions?.length || 0,
            bodyTypesCount: refData.body_types?.length || 0
          })
        }
      } catch (refError) {
        console.warn('Error fetching reference data:', refError)
      }

      // Fetch existing dealer listings for AI context
      setState(prev => ({
        ...prev,
        progress: 67,
        progressMessage: 'Fetching dealer\'s existing listings for AI context...'
      }))

      // let existingListings = null
      try {
        const { data: existingData, error: existingError } = await supabase
          .rpc('get_dealer_existing_listings', {
            seller_id_param: seller.id
          })
        
        if (existingError) {
          console.warn('Could not fetch existing listings:', existingError.message)
        } else {
          // existingListings = existingData
          console.log('🚗 Existing listings fetched:', {
            listingsCount: existingData?.existing_listings?.length || 0,
            sampleVariants: existingData?.existing_listings?.slice(0, 3).map((l: any) => l.variant) || []
          })
        }
      } catch (existingError) {
        console.warn('Error fetching existing listings:', existingError)
      }

      setState(prev => ({
        ...prev,
        progress: 70,
        progressMessage: 'Starting AI extraction with reference context...'
      }))

      // Use the extracted text from Railway for AI processing with reference data
      const aiRequestPayload = {
        text: extractedText,  // Changed from textContent to text
        dealerHint: seller.name,  // Changed from dealerName to dealerHint
        fileName: file.name,
        sellerId: seller.id,
        sellerName: seller.name,
        batchId,
        makeId: config.makeId,
        makeName: config.makeName,
        // Enhanced: Add reference data for better AI accuracy
        referenceData: referenceData,  // Pass complete reference data to edge function
        // Enhanced: Add existing dealer listings for consistent variant naming
        includeExistingListings: true,
        // Add PDF URL (can be a placeholder since we're not storing the actual PDF)
        pdfUrl: state.fileUrl || `local://${file.name}`
      }

      console.log('🤖 AI: Starting extraction with payload', {
        textContentLength: extractedText.length,
        textPreview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''),
        dealerName: seller.name,
        fileName: file.name,
        makeId: config.makeId,
        makeName: config.makeName,
        batchId
      })

      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-extract-vehicles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiRequestPayload)
      })

      console.log('🤖 AI: Response received', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        ok: aiResponse.ok
      })

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text()
        console.error('🤖 AI: Error response', { errorText })
        throw new Error(`AI extraction failed: ${aiResponse.status} ${errorText}`)
      }

      const aiResult = await aiResponse.json()
      
      console.log('🤖 AI: Result received', {
        success: aiResult.success,
        jobId: aiResult.jobId,
        itemsProcessed: aiResult.itemsProcessed,
        extractionSessionId: aiResult.extractionSessionId,
        error: aiResult.error,
        resultKeys: Object.keys(aiResult)
      })
      
      setState(prev => ({
        ...prev,
        aiResult,
        jobId: aiResult.jobId,
        progress: 70,
        progressMessage: 'AI processing started, monitoring progress...'
      }))
      
      console.log('🔄 AI result includes extractionSessionId:', aiResult.extractionSessionId)

      // Step 3: Check if extraction completed immediately or needs monitoring
      if (aiResult.extractionSessionId) {
        // New workflow: extraction session created, fetch actual summary from database
        console.log('🔍 Fetching extraction session summary from database...')
        
        try {
          // Add a small delay to ensure database has processed the extraction
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Fetch the actual extraction session summary from the database
          const { error: sessionError } = await supabase
            .from('extraction_sessions')
            .select('*')
            .eq('id', aiResult.extractionSessionId)
            .single()

          if (sessionError) {
            console.warn('Could not fetch session summary:', sessionError.message)
            // Fallback to original behavior if database fetch fails
          }

          // Get the extraction changes summary
          const { data: changesData, error: changesError } = await supabase
            .from('extraction_listing_changes')
            .select('change_type, change_status')
            .eq('session_id', aiResult.extractionSessionId)

          let actualStats = {
            new: 0,
            updated: 0,
            removed: 0,
            missing_models: 0,
            total_processed: aiResult.itemsProcessed || 0
          }

          if (!changesError && changesData) {
            // Calculate actual stats from the changes data
            const pendingCreates = changesData.filter(c => c.change_type === 'create').length
            const pendingUpdates = changesData.filter(c => c.change_type === 'update').length
            const pendingDeletes = changesData.filter(c => c.change_type === 'delete').length
            const unchangedChanges = changesData.filter(c => c.change_type === 'unchanged').length
            const missingModels = changesData.filter(c => c.change_type === 'missing_model').length
            
            // If we have explicit "unchanged" changes, use them, otherwise calculate
            const unchanged = unchangedChanges > 0 ? unchangedChanges : 
                             changesData.length - pendingCreates - pendingUpdates - pendingDeletes - missingModels

            actualStats = {
              new: pendingCreates,
              updated: pendingUpdates,
              removed: unchanged, // Use unchanged for "No Change Identified"
              missing_models: missingModels,
              total_processed: changesData.length
            }

            console.log('📊 Actual extraction stats:', actualStats)
            console.log('📊 Extraction changes breakdown:', {
              creates: pendingCreates,
              updates: pendingUpdates,
              deletes: pendingDeletes,
              unchanged: unchangedChanges,
              missingModels: missingModels,
              total: changesData.length
            })
          } else {
            console.warn('Could not fetch changes data:', changesError?.message)
          }

          setState(prev => ({
            ...prev,
            currentStep: 'complete',
            progress: 100,
            progressMessage: 'Extraction completed and staged for review!',
            isProcessing: false,
            extractionResult: {
              batchId,
              jobId: aiResult.jobId || 'immediate',
              itemsCreated: actualStats.total_processed,
              extractionSessionId: aiResult.extractionSessionId,
              stats: actualStats
            }
          }))
          
          // Prompt to save PDF URL if it's not already saved and was entered via URL
          if (state.inputMode === 'url' && state.fileUrl) {
            promptToSaveUrl(state.fileUrl)
          }
        } catch (dbError) {
          console.error('Error fetching extraction session data:', dbError)
          // Fallback to original behavior
          setState(prev => ({
            ...prev,
            currentStep: 'complete',
            progress: 100,
            progressMessage: 'Extraction completed and staged for review!',
            isProcessing: false,
            extractionResult: {
              batchId,
              jobId: aiResult.jobId || 'immediate',
              itemsCreated: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0,
              extractionSessionId: aiResult.extractionSessionId,
              stats: {
                new: aiResult.summary?.totalNew || 0,
                updated: aiResult.summary?.totalUpdated || 0,
                removed: aiResult.summary?.totalDeleted || 0,
                missing_models: aiResult.summary?.missing_models || 0,
                total_processed: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0
              }
            }
          }))
          
          // Prompt to save PDF URL if it's not already saved and was entered via URL
          if (state.inputMode === 'url' && state.fileUrl) {
            promptToSaveUrl(state.fileUrl)
          }
        }
      } else if (aiResult.jobId) {
        // Legacy workflow: monitor job progress
        startPolling(aiResult.jobId)
      } else {
        // Fallback: assume immediate completion with limited data
        console.log('⚠️ No extractionSessionId or jobId, using fallback stats')
        setState(prev => ({
          ...prev,
          currentStep: 'complete',
          progress: 100,
          progressMessage: 'Extraction completed successfully!',
          isProcessing: false,
          extractionResult: {
            batchId,
            jobId: 'immediate',
            itemsCreated: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0,
            extractionSessionId: aiResult.extractionSessionId,
            stats: {
              new: aiResult.summary?.totalNew || 0,
              updated: aiResult.summary?.totalUpdated || 0,
              removed: aiResult.summary?.totalDeleted || 0,
              missing_models: aiResult.summary?.missing_models || 0,
              total_processed: aiResult.summary?.totalExtracted || aiResult.itemsProcessed || 0
            }
          }
        }))
        
        // Prompt to save PDF URL if it's not already saved and was entered via URL
        if (state.inputMode === 'url' && state.fileUrl) {
          promptToSaveUrl(state.fileUrl)
        }
      }

    } catch (error) {
      console.error('Error in Railway + AI processing:', error)
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Failed to process PDF',
        progress: 0
      }))
      
      toast.error('PDF processing failed')
    }
  }, [seller, getExtractionConfig, startPolling, state.fileUrl, state.inputMode, promptToSaveUrl])

  // Handle URL submit
  const handleURLSubmit = useCallback(async () => {
    if (!state.fileUrl) {
      setState(prev => ({ ...prev, error: 'Please enter a PDF URL' }))
      return
    }

    if (!validatePDFUrl(state.fileUrl)) {
      setState(prev => ({ ...prev, error: 'Invalid PDF URL format' }))
      return
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: 'downloading',
      progress: 5,
      progressMessage: 'Downloading PDF from URL...',
      error: null
    }))

    try {
      // Download PDF from URL
      let response: Response
      
      // Check if we need to use the proxy (for external URLs)
      const isLocalUrl = state.fileUrl.startsWith(window.location.origin) || 
                        state.fileUrl.startsWith('/')
      
      if (isLocalUrl) {
        // Direct fetch for local URLs
        response = await fetch(state.fileUrl)
      } else {
        // Use proxy for external URLs to avoid CORS issues
        console.log('Using PDF proxy for external URL:', state.fileUrl)
        
        const proxyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-proxy`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: state.fileUrl })
        })
        
        response = proxyResponse
      }
      
      if (!response.ok) {
        // Try to get error details from proxy response
        if (!isLocalUrl && response.headers.get('content-type')?.includes('json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to download PDF: ${response.status}`)
        }
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
      }

      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('pdf')) {
        throw new Error('URL does not point to a PDF file')
      }

      // Convert to File object
      const blob = await response.blob()
      const fileName = state.fileUrl.split('/').pop()?.split('?')[0] || 'downloaded.pdf'
      const file = new File([blob], fileName, { type: 'application/pdf' })

      // Update state with file
      setState(prev => ({
        ...prev,
        file,
        progress: 10,
        progressMessage: 'PDF downloaded successfully, starting extraction...'
      }))

      // Add to recent URLs
      addRecentUrl(state.fileUrl)

      // Continue with existing processing pipeline
      // Pass the file directly to avoid state timing issues
      await processWithRailwayAndAI(file)

    } catch (error) {
      console.error('Error downloading PDF:', error)
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Failed to download PDF',
        progress: 0
      }))
      
      toast.error('Failed to download PDF from URL')
    }
  }, [state.fileUrl, validatePDFUrl, addRecentUrl, processWithRailwayAndAI])
  
  const handleReset = useCallback(() => {
    setState({
      inputMode: 'file',
      fileUrl: '',
      isDragOver: false,
      file: null,
      isProcessing: false,
      currentStep: 'idle',
      progress: 0,
      progressMessage: '',
      railwayResult: null,
      aiResult: null,
      extractionResult: null,
      error: null,
      jobId: null
    })
  }, [])

  const handleViewResults = useCallback(() => {
    console.log('🔗 Navigation - handleViewResults called with:', {
      extractionSessionId: state.extractionResult?.extractionSessionId,
      jobId: state.extractionResult?.jobId,
      batchId: state.extractionResult?.batchId,
      fullResult: state.extractionResult
    })
    
    if (state.extractionResult?.extractionSessionId) {
      const targetUrl = `/admin/extraction-sessions/${state.extractionResult.extractionSessionId}`
      console.log('🔗 Navigation - going to extraction session:', targetUrl)
      navigate(targetUrl)
      onOpenChange(false)
    } else if (state.extractionResult?.jobId) {
      console.log('🔗 Navigation - fallback to admin listings')
      navigate('/admin/listings')
      onOpenChange(false)
    } else if (state.extractionResult?.batchId) {
      console.log('🔗 Navigation - fallback to batch review')
      navigate(`/admin/batches/${state.extractionResult.batchId}/review`)
      onOpenChange(false)
    } else {
      console.log('🔗 Navigation - no valid navigation option found!')
    }
  }, [state.extractionResult, navigate, onOpenChange])

  const config = getExtractionConfig()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PDF - {seller.name}
          </DialogTitle>
          <DialogDescription>
            Upload a PDF price list for automatic extraction and processing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-detected Configuration */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              Auto-Detected Configuration
            </div>
            
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="text-center">
                <span className="text-muted-foreground block mb-1">Dealer Make:</span>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {config.makeName || 'Multi-Brand'}
                </Badge>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              AI processing will be optimized for this dealer's make
            </div>
          </div>

          {/* File Upload / URL Input Area */}
          {!state.file && !state.isProcessing && (
            <Tabs 
              value={state.inputMode} 
              onValueChange={(value) => setState(prev => ({ ...prev, inputMode: value as 'file' | 'url' }))}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload PDF</TabsTrigger>
                <TabsTrigger value="url">PDF URL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="mt-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${state.isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => document.getElementById('pdf-upload-input')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    Drag and drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports dealer price lists in PDF format
                  </p>
                  <input
                    id="pdf-upload-input"
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="url" className="mt-4 space-y-4">
                {/* Saved PDF URLs Dropdown */}
                {seller?.pdf_urls && seller.pdf_urls.length > 0 && (
                  <div className="space-y-2">
                    <Label>Gemte PDF URLs</Label>
                    <div className="space-y-1">
                      {seller.pdf_urls.map((pdfUrl, index) => (
                        <Button
                          key={index}
                          variant={state.fileUrl === pdfUrl.url ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-sm h-10"
                          onClick={() => setState(prev => ({ ...prev, fileUrl: pdfUrl.url }))}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="truncate font-medium">{pdfUrl.name}</span>
                        </Button>
                      ))}
                    </div>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">eller indtast ny URL</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="pdf-url">PDF URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pdf-url"
                      type="url"
                      placeholder="https://example.com/prisliste.pdf"
                      value={state.fileUrl}
                      onChange={(e) => setState(prev => ({ ...prev, fileUrl: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleURLSubmit()}
                      disabled={state.isProcessing}
                    />
                    <Button 
                      onClick={handleURLSubmit}
                      disabled={!state.fileUrl || state.isProcessing}
                      className="gap-2"
                    >
                      <Link className="h-4 w-4" />
                      Fetch PDF
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a direct link to a PDF file from supported dealers (VW, Audi, BMW, Mercedes, etc.)
                  </p>
                </div>

                {/* Recent URLs */}
                {recentUrls.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Recent URLs</Label>
                    <div className="space-y-1">
                      {recentUrls.map((url, index) => {
                        try {
                          const urlObj = new URL(url)
                          const displayName = url.split('/').pop()?.split('?')[0] || 'PDF'
                          return (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-8"
                              onClick={() => setState(prev => ({ ...prev, fileUrl: url }))}
                            >
                              <FileText className="h-3 w-3 mr-2" />
                              <span className="truncate">
                                {urlObj.hostname} - {displayName}
                              </span>
                            </Button>
                          )
                        } catch {
                          return null
                        }
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Selected File */}
          {state.file && !state.isProcessing && !state.extractionResult && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{state.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(state.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  Change File
                </Button>
                <Button
                  size="sm"
                  onClick={() => processWithRailwayAndAI()}
                >
                  Extract with AI
                </Button>
              </div>
            </div>
          )}

          {/* Processing Progress */}
          {state.isProcessing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{state.progressMessage}</span>
                  <span>{Math.round(state.progress)}%</span>
                </div>
                <Progress value={state.progress} className="h-2" />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {state.inputMode === 'url' && (
                  <>
                    <div className={`h-2 w-2 rounded-full ${
                      state.currentStep === 'downloading' ? 'bg-blue-500 animate-pulse' : 
                      state.progress > 10 ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <span>Download PDF</span>
                  </>
                )}
                
                <div className={`h-2 w-2 rounded-full ${state.inputMode === 'url' ? 'ml-4' : ''} ${
                  state.currentStep === 'railway' ? 'bg-blue-500 animate-pulse' : 
                  state.progress > 30 ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span>Railway Text Extraction</span>
                
                <div className={`h-2 w-2 rounded-full ml-4 ${
                  state.currentStep === 'ai' ? 'bg-blue-500 animate-pulse' : 
                  state.progress > 60 ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span>AI Processing</span>
                
                <div className={`h-2 w-2 rounded-full ml-4 ${
                  state.currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span>Complete</span>
              </div>

              {/* Debug Info */}
              {state.railwayResult && (
                <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
                  <div className="font-medium">Railway Extraction Debug:</div>
                  <div>Text Length: {state.railwayResult.extracted_text?.length || 0} characters</div>
                  {state.railwayResult.extracted_text && state.railwayResult.extracted_text.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        Preview extracted text
                      </summary>
                      <div className="mt-1 p-2 bg-white rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border">
                        {state.railwayResult.extracted_text.substring(0, 500)}
                        {state.railwayResult.extracted_text.length > 500 && '...'}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {state.jobId && (
                <div className="text-xs text-muted-foreground">
                  Job ID: {state.jobId}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {state.extractionResult && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully extracted {state.extractionResult.stats?.total_processed || 0} vehicle listings from PDF and staged for review
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {state.extractionResult.stats?.new || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">New Listings</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {state.extractionResult.stats?.updated || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Updates to Existing</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">
                    {state.extractionResult.stats?.removed || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">No Change Identified</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {state.extractionResult.stats?.missing_models || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Missing Models</p>
                </div>
              </div>

              {state.extractionResult.dealerDetection && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Processed as: <strong>{state.extractionResult.dealerDetection.detectedType}</strong> 
                    ({state.extractionResult.dealerDetection.confidence}% confidence)
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  Extract Another PDF
                </Button>
                <Button onClick={handleViewResults} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Review & Approve Extraction
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}