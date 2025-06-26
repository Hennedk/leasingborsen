/**
 * PDF Extraction Service
 * 
 * TypeScript service for interacting with the Railway PDF extraction API.
 * Provides methods for extracting text from PDFs with different profiles
 * and configurable cleaning options.
 */

// TypeScript interfaces for PDF extraction
export interface PDFExtractionOptions {
  cleanText?: boolean;
  extractTables?: boolean;
  removeHeadersFooters?: boolean;
  normalizeWhitespace?: boolean;
  customPatterns?: string[];
}

export interface PDFPageData {
  page_number: number;
  text?: string;
  tables?: any[];
}

export interface PDFMetadata {
  page_count: number;
  has_tables: boolean;
  extraction_method: string;
}

export interface DocumentStructure {
  document_type: string;
  has_tables: boolean;
  has_prices: boolean;
  has_dates: boolean;
  sections: Array<{
    title: string;
    line_number: number;
  }>;
}

export interface PDFExtractionData {
  text: string;
  pages: PDFPageData[];
  tables: any[];
  metadata: PDFMetadata;
  structure?: DocumentStructure;
}

export interface PDFExtractionResult {
  success: boolean;
  data?: PDFExtractionData;
  profile?: string;
  filename?: string;
  error?: string;
}

export type ExtractionProfile = 'generic' | 'automotive' | 'invoice';

/**
 * PDF Extractor Service Class
 * 
 * Handles communication with the Railway PDF extraction service
 */
export class PDFExtractorService {
  private baseUrl: string;
  private timeout: number;

  constructor(
    baseUrl?: string, 
    timeout: number = 30000
  ) {
    // Use environment variable or fallback URL (Vite environment variables)
    this.baseUrl = baseUrl || 
      import.meta.env.VITE_PDF_SERVICE_URL ||
      'https://leasingborsen-production.up.railway.app';
    
    this.timeout = timeout;
  }

  /**
   * Basic text extraction with configurable options
   */
  async extractText(
    file: File, 
    options: PDFExtractionOptions = {}
  ): Promise<PDFExtractionResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add options to form data
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'customPatterns' && Array.isArray(value)) {
          formData.append('custom_patterns', JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    return this._makeRequest('/extract/text', formData);
  }

  /**
   * Structured extraction with profile-based processing
   */
  async extractStructured(
    file: File,
    profile: ExtractionProfile = 'generic',
    customPatterns?: string[]
  ): Promise<PDFExtractionResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('profile', profile);
    
    if (customPatterns && customPatterns.length > 0) {
      formData.append('custom_patterns', JSON.stringify(customPatterns));
    }

    return this._makeRequest('/extract/structured', formData);
  }

  /**
   * Extract with automotive profile for car pricing documents
   */
  async extractAutomotive(file: File): Promise<PDFExtractionResult> {
    return this.extractStructured(file, 'automotive');
  }

  /**
   * Extract with generic profile for basic text extraction
   */
  async extractGeneric(
    file: File, 
    options: PDFExtractionOptions = {}
  ): Promise<PDFExtractionResult> {
    return this.extractStructured(file, 'generic', options.customPatterns);
  }

  /**
   * Health check for the PDF extraction service
   */
  async healthCheck(): Promise<{status: string; service: string}> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`PDF service unavailable: ${error}`);
    }
  }

  /**
   * Internal method to make requests to the Railway service
   */
  private async _makeRequest(
    endpoint: string, 
    formData: FormData
  ): Promise<PDFExtractionResult> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();
      
      // Validate response structure
      if (typeof result.success !== 'boolean') {
        return {
          success: false,
          error: 'Invalid response format from PDF service'
        };
      }

      return result;

    } catch (error) {
      // Handle different error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `PDF extraction timeout after ${this.timeout / 1000} seconds`
          };
        }
        
        if (error.message.includes('NetworkError') || 
            error.message.includes('Failed to fetch')) {
          return {
            success: false,
            error: 'PDF extraction service unavailable. Please try manual input.'
          };
        }
      }

      return {
        success: false,
        error: `PDF extraction failed: ${error}`
      };
    }
  }

  /**
   * Validate file before extraction
   */
  static validateFile(file: File): {valid: boolean; error?: string} {
    // Check file type
    if (file.type !== 'application/pdf') {
      return {
        valid: false,
        error: 'File must be a PDF document'
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'PDF file too large. Maximum size is 10MB.'
      };
    }

    // Check file size (min 1KB)
    if (file.size < 1024) {
      return {
        valid: false,
        error: 'PDF file too small. Minimum size is 1KB.'
      };
    }

    return {valid: true};
  }

  /**
   * Create instance with Danish car-specific patterns
   */
  static createDanishCarExtractor(): PDFExtractorService {
    return new PDFExtractorService();
  }

  /**
   * Get Danish car-specific cleaning patterns
   */
  static getDanishCarPatterns(): string[] {
    return [
      'TOYOTA PRISLISTE.*?PRIVATLEASING.*?\\d+',
      'Forbrugstal er beregnet efter WLTP-metode.*?KLIK HER',
      'Ønsker du flere kilometer.*?Toyota-forhandler',
      'SE UDSTYRSVARIANTER HER',
      'Alle ydelser er inkl\\. levering.*?ekskl\\. moms',
      'Positiv kreditgodk\\..*?Financial Services'
    ];
  }
}

// Export singleton instance for convenience
export const pdfExtractor = new PDFExtractorService();

// Export utility functions
export const validatePDFFile = PDFExtractorService.validateFile;
export const getDanishCarPatterns = PDFExtractorService.getDanishCarPatterns;