import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker using local import
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
}

export class PDFTextExtractor {
  /**
   * Extract text from a PDF file
   * @param file - PDF file to extract text from
   * @returns Promise with extracted text and metadata
   */
  public async extractText(file: File): Promise<PDFExtractionResult> {
    try {
      console.log(`📄 Starting PDF text extraction for: ${file.name} (${file.size} bytes)`)
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Load PDF document
      console.log('📄 Loading PDF document...')
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        verbosity: 0 // Reduce console output
      })
      
      const pdfDocument = await loadingTask.promise
      console.log(`📄 PDF loaded successfully - ${pdfDocument.numPages} pages`)
      
      // Extract metadata
      const metadata = await this.extractMetadata(pdfDocument) || {}
      
      // Extract text from all pages
      const textPromises: Promise<string>[] = []
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        textPromises.push(this.extractPageText(pdfDocument, pageNum))
      }
      
      console.log(`📄 Extracting text from ${pdfDocument.numPages} pages...`)
      const pageTexts = await Promise.all(textPromises)
      
      // Combine all page text
      const fullText = pageTexts.join('\n\n')
      
      console.log(`📄 Text extraction complete:`)
      console.log(`  - Pages: ${pdfDocument.numPages}`)
      console.log(`  - Characters: ${fullText.length}`)
      console.log(`  - Title: ${metadata.title || 'Unknown'}`)
      console.log(`  - First 200 chars: "${fullText.substring(0, 200).replace(/\n/g, ' ')}..."`)
      
      // Clean up
      await pdfDocument.destroy()
      
      return {
        text: fullText,
        pageCount: pdfDocument.numPages,
        metadata
      }
      
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error)
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Extract text from a specific page
   */
  private async extractPageText(pdfDocument: any, pageNumber: number): Promise<string> {
    try {
      const page = await pdfDocument.getPage(pageNumber)
      const textContent = await page.getTextContent()
      
      // Combine text items with proper spacing
      const textItems = textContent.items
        .filter((item: any) => item.str?.trim()) // Filter out empty strings
        .map((item: any) => {
          // Add space after text item if it doesn't end with whitespace
          const text = item.str.trim()
          return text + (item.hasEOL ? '\n' : ' ')
        })
      
      const pageText = textItems.join('').replace(/\s+/g, ' ').trim()
      
      // Clean up
      page.cleanup()
      
      return pageText
      
    } catch (error) {
      console.error(`❌ Failed to extract text from page ${pageNumber}:`, error)
      return '' // Return empty string for failed pages
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
      console.warn('⚠️ Failed to extract PDF metadata:', error)
      return {}
    }
  }
  
  /**
   * Validate if file is a PDF
   */
  public static isValidPDF(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  }
  
  /**
   * Get recommended file size limits
   */
  public static getFileSizeLimits() {
    return {
      maxSize: 50 * 1024 * 1024, // 50MB
      recommendedSize: 10 * 1024 * 1024, // 10MB
      warningSize: 25 * 1024 * 1024 // 25MB
    }
  }
}

// Export singleton instance
export const pdfTextExtractor = new PDFTextExtractor()