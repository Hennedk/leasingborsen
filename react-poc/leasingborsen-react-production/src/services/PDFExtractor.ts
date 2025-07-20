/**
 * Consolidated PDF Extraction Service
 * 
 * Single unified service for PDF text extraction combining:
 * - Client-side PDF.js extraction (primary)
 * - Railway service fallback (secondary)
 * - Proper error handling and validation
 */

import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export interface PDFExtractionResult {
  text: string
  pageCount: number
  metadata?: {
    title?: string
    author?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
  extractionMethod: 'client' | 'railway' | 'fallback'
  success: boolean
  error?: string
}

export interface PDFExtractionOptions {
  useRailwayFallback?: boolean
  cleanText?: boolean
  timeout?: number
}

export class PDFExtractor {
  private railwayServiceUrl: string
  private defaultTimeout: number = 30000

  constructor(railwayUrl?: string) {
    this.railwayServiceUrl = railwayUrl || 
      import.meta.env.VITE_PDF_SERVICE_URL ||
      'https://leasingborsen-production.up.railway.app'
  }

  /**
   * Calculate timeout based on file size to prevent large PDF timeouts
   */
  private calculateTimeout(fileSize: number): number {
    const SIZE_MB = fileSize / (1024 * 1024)
    
    if (SIZE_MB < 5) {
      return 30000 // 30 seconds for small files
    } else if (SIZE_MB < 15) {
      return 60000 // 1 minute for medium files
    } else if (SIZE_MB < 30) {
      return 120000 // 2 minutes for large files
    } else {
      return 180000 // 3 minutes for very large files
    }
  }

  /**
   * Extract text from PDF with automatic fallback
   */
  public async extractText(
    file: File, 
    options: PDFExtractionOptions = {}
  ): Promise<PDFExtractionResult> {
    
    // Validate file first
    const validation = this.validateFile(file)
    if (!validation.valid) {
      return {
        text: '',
        pageCount: 0,
        extractionMethod: 'fallback',
        success: false,
        error: validation.error
      }
    }

    // Calculate appropriate timeout based on file size
    const dynamicTimeout = options.timeout || this.calculateTimeout(file.size)
    const fileSize = (file.size / (1024 * 1024)).toFixed(1)
    
    console.log(`📄 Processing ${file.name} (${fileSize}MB) with ${dynamicTimeout/1000}s timeout`)

    // Try client-side extraction first
    try {
      console.log(`📄 Attempting client-side PDF extraction: ${file.name}`)
      const result = await this.extractClientSide(file)
      
      if (result.success && result.text.length > 100) {
        console.log(`✅ Client-side extraction successful: ${result.text.length} characters`)
        return result
      }
    } catch (error) {
      console.warn('⚠️ Client-side extraction failed:', error)
    }

    // Fallback to Railway service if enabled
    if (options.useRailwayFallback) {
      try {
        console.log(`🚂 Attempting Railway service extraction: ${file.name}`)
        const result = await this.extractRailwayService(file, dynamicTimeout)
        
        if (result.success) {
          console.log(`✅ Railway extraction successful: ${result.text.length} characters`)
          return result
        }
      } catch (error) {
        console.warn('⚠️ Railway service extraction failed:', error)
      }
    }

    // Final fallback - return error
    return {
      text: '',
      pageCount: 0,
      extractionMethod: 'fallback',
      success: false,
      error: 'All extraction methods failed'
    }
  }

  /**
   * Client-side PDF extraction using PDF.js
   */
  private async extractClientSide(file: File): Promise<PDFExtractionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        verbosity: 0
      })
      
      const pdfDocument = await loadingTask.promise
      const metadata = await this.extractMetadata(pdfDocument)
      
      // Extract text from all pages
      const textPromises: Promise<string>[] = []
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        textPromises.push(this.extractPageText(pdfDocument, pageNum))
      }
      
      const pageTexts = await Promise.all(textPromises)
      const fullText = pageTexts.join('\n\n')
      
      // Clean up
      await pdfDocument.destroy()
      
      return {
        text: fullText,
        pageCount: pdfDocument.numPages,
        metadata,
        extractionMethod: 'client',
        success: true
      }
      
    } catch (error) {
      throw new Error(`Client-side extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Railway service extraction fallback
   */
  private async extractRailwayService(file: File, timeout?: number): Promise<PDFExtractionResult> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('profile', 'automotive')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout || this.defaultTimeout)
      
      const response = await fetch(`${this.railwayServiceUrl}/extract/structured`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Railway service HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data?.text) {
        return {
          text: result.data.text,
          pageCount: result.data.metadata?.page_count || 0,
          extractionMethod: 'railway',
          success: true
        }
      } else {
        throw new Error(result.error || 'Railway service returned no text')
      }
      
    } catch (error) {
      throw new Error(`Railway service extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract text from a specific page
   */
  private async extractPageText(pdfDocument: any, pageNumber: number): Promise<string> {
    try {
      const page = await pdfDocument.getPage(pageNumber)
      const textContent = await page.getTextContent()
      
      const textItems = textContent.items
        .filter((item: any) => item.str?.trim())
        .map((item: any) => {
          const text = item.str.trim()
          return text + (item.hasEOL ? '\n' : ' ')
        })
      
      const pageText = textItems.join('').replace(/\s+/g, ' ').trim()
      
      page.cleanup()
      return pageText
      
    } catch (error) {
      console.error(`Failed to extract text from page ${pageNumber}:`, error)
      return ''
    }
  }

  /**
   * Extract PDF metadata
   */
  private async extractMetadata(pdfDocument: any): Promise<PDFExtractionResult['metadata']> {
    try {
      const metadata = await pdfDocument.getMetadata()
      const info = metadata.info
      
      return {
        title: info?.Title,
        author: info?.Author,
        creator: info?.Creator,
        producer: info?.Producer,
        creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
        modificationDate: info?.ModDate ? new Date(info.ModDate) : undefined
      }
    } catch (error) {
      console.warn('Failed to extract PDF metadata:', error)
      return {}
    }
  }

  /**
   * Validate PDF file
   */
  public validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return {
        valid: false,
        error: 'File must be a PDF document'
      }
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'PDF file too large. Maximum size is 50MB.'
      }
    }

    // Check file size (min 1KB)
    if (file.size < 1024) {
      return {
        valid: false,
        error: 'PDF file too small. Minimum size is 1KB.'
      }
    }

    return { valid: true }
  }

  /**
   * Health check for Railway service
   */
  public async healthCheck(): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.railwayServiceUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return { available: true }
    } catch (error) {
      return {
        available: false,
        error: `Railway service unavailable: ${error}`
      }
    }
  }
}

// Export singleton instance
export const pdfExtractor = new PDFExtractor()

// Export utility functions
export const validatePDFFile = (file: File) => pdfExtractor.validateFile(file)