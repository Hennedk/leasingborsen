// AI Extraction Service Types

// Document Information
export interface DocumentInfo {
  brand: string
  documentDate: string
  currency: string
  language: string
  documentType: 'private_leasing' | 'business_leasing' | 'price_list'
}

// Vehicle Data
export interface VehicleVariant {
  variantName: string
  engineSpecification: string
  transmission: 'manual' | 'automatic' | 'cvt'
  pricing: {
    monthlyPayment: number
    firstPayment?: number
    totalCost?: number
    annualKilometers?: number
    co2TaxBiannual?: number
  }
  specifications?: {
    fuelConsumptionKmpl?: number
    co2EmissionsGkm?: number
    energyLabel?: string
    electricRangeKm?: number | null
    batteryCapacityKwh?: number | null
    horsePower?: number
    acceleration0to100?: number
  }
}

export interface Vehicle {
  model: string
  category?: string
  leasePeriodMonths: number
  powertrainType: 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'plugin_hybrid'
  variants: VehicleVariant[]
}

// Accessory Data
export interface Accessory {
  packageName: string
  description?: string
  monthlyCost: number
  category: 'wheels' | 'service' | 'insurance' | 'other'
  packageCode?: string
}

// Main Extracted Data Structure
export interface ExtractedCarData {
  documentInfo: DocumentInfo
  vehicles: Vehicle[]
  accessories?: Accessory[]
  metadata?: {
    extractionTimestamp: string
    documentPages?: number
    extractionWarnings?: string[]
  }
}

// Extraction Error Types
export interface ExtractionError {
  type: 'validation' | 'api' | 'parsing' | 'cost_limit' | 'timeout' | 'unknown'
  message: string
  details?: any
  retryable?: boolean
}

// Extraction Metadata
export interface ExtractionMetadata {
  provider: string
  modelVersion?: string
  tokensUsed: number
  costCents: number
  extractionTimeMs: number
  confidence: number
  retryCount?: number
}

// Main Extraction Result
export interface ExtractionResult {
  success: boolean
  data?: ExtractedCarData
  error?: ExtractionError
  metadata: ExtractionMetadata
}

// Extraction Options
export interface ExtractOptions {
  dealer?: string
  documentType?: 'leasing_prices' | 'price_list'
  language?: 'da' | 'en'
  maxRetries?: number
  timeoutMs?: number
  debugMode?: boolean
}

// AI Provider Interface
export interface AIProvider {
  name: string
  modelVersion: string
  
  extract(content: string, options?: ExtractOptions): Promise<ExtractionResult>
  calculateCost(tokens: number): number
  validateApiKey(): Promise<boolean>
  isAvailable(): Promise<boolean>
}

// Cost Tracking
export interface CostSummary {
  totalCents: number
  byProvider: Record<string, number>
  byDealer: Record<string, number>
  dailyTotal: number
  monthlyTotal: number
}

// Extraction Log Entry
export interface ExtractionLog {
  id?: string
  pdfUrl: string
  pdfHash?: string
  dealerName?: string
  dealerId?: string
  extractionStatus: 'success' | 'failed' | 'partial'
  aiProvider: string
  modelVersion?: string
  tokensInput?: number
  tokensOutput?: number
  costCents: number
  extractedCount?: number
  processingTimeMs: number
  errorMessage?: string
  errorType?: string
  retryCount?: number
  parentLogId?: string
  rawResponse?: any
  extractedData?: ExtractedCarData
  validationErrors?: any[]
  createdAt?: Date
  createdBy?: string
}

// Configuration
export interface ExtractionConfig {
  openaiApiKey?: string
  anthropicApiKey?: string
  aiExtractionEnabled: boolean
  primaryProvider: string
  fallbackProvider?: string
  maxTokensPerPdf: number
  maxCostPerPdfCents: number
  dailyCostLimitUsd: number
  extractionTimeoutSeconds: number
  extractionMaxRetries: number
  extractionConfidenceThreshold: number
}

// Validation Result
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  confidence: number
}

export interface ValidationError {
  field: string
  message: string
  value?: any
  rule?: string
}