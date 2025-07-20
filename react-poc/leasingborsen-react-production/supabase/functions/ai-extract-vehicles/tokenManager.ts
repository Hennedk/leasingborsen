// Token estimation and management for PDF chunking
// Based on the Intelligent PDF Chunking Plan

export interface TokenEstimate {
  pdfTextTokens: number
  contextTokens: number
  totalTokens: number
  exceedsLimit: boolean
  recommendedChunks: number
}

export interface ChunkingConfig {
  maxCharsPerChunk: number      // e.g., 40,000 chars (~10,000 tokens)
  maxPdfsPerChunk: number       // e.g., 3 PDFs max
  delayBetweenChunks: number    // e.g., 65 seconds (rate limit safety)
  overlapChars: number          // e.g., 500 chars overlap for context
}

export interface PDFChunk {
  id: string
  pdfFiles: Array<{
    name: string
    text: string
    pages: number
  }>
  totalChars: number
  estimatedTokens: number
}

export interface ChunkedExtractionRequest {
  chunkId: string
  chunkIndex: number
  totalChunks: number
  pdfTexts: string[]
  sessionId?: string          // For tracking across chunks
  previousResults?: any[]     // For context continuity
  
  // Original request parameters
  dealerHint?: string
  dealerName?: string
  sellerId?: string
  sellerName?: string
  batchId?: string
  makeId?: string
  makeName?: string
  fileName?: string
  referenceData?: any
  existingListings?: any
  pdfUrl?: string
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxCharsPerChunk: 40000,       // ~10,000 tokens for PDF text
  maxPdfsPerChunk: 3,            // Process max 3 PDFs at once
  delayBetweenChunks: 65000,     // 65 seconds between chunks
  overlapChars: 500              // Small overlap for context continuity
}

// Conservative token limits
const CHARS_PER_TOKEN = 4
const TOKEN_LIMIT = 100000 // Updated for GPT-4-1106-preview which supports 128k context
const CONTEXT_OVERHEAD = 14657 // Estimated tokens for reference data, existing listings, prompt

export function estimateTokens(pdfText: string, contextSize: number = CONTEXT_OVERHEAD): TokenEstimate {
  const pdfTextTokens = Math.ceil(pdfText.length / CHARS_PER_TOKEN)
  const totalTokens = pdfTextTokens + contextSize
  const exceedsLimit = totalTokens > TOKEN_LIMIT
  
  // Calculate how many chunks needed
  const maxPdfTokensPerChunk = TOKEN_LIMIT - contextSize
  const recommendedChunks = Math.ceil(pdfTextTokens / maxPdfTokensPerChunk)
  
  return {
    pdfTextTokens,
    contextTokens: contextSize,
    totalTokens,
    exceedsLimit,
    recommendedChunks
  }
}

export function estimateTokensForMultiplePDFs(pdfTexts: string[], contextSize: number = CONTEXT_OVERHEAD): TokenEstimate {
  const combinedText = pdfTexts.join('\n\n')
  return estimateTokens(combinedText, contextSize)
}

export function createPDFChunks(
  extractedPDFs: Array<{ name: string; text: string; pages?: number }>, 
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): PDFChunk[] {
  const chunks: PDFChunk[] = []
  let currentChunk = createEmptyChunk()
  
  for (const pdf of extractedPDFs) {
    // Check if adding this PDF would exceed limits
    if (shouldStartNewChunk(currentChunk, pdf, config)) {
      if (currentChunk.pdfFiles.length > 0) {
        chunks.push(currentChunk)
      }
      currentChunk = createEmptyChunk()
    }
    
    // Add PDF to current chunk
    currentChunk.pdfFiles.push({
      name: pdf.name,
      text: pdf.text,
      pages: pdf.pages || 1
    })
    currentChunk.totalChars += pdf.text.length
    currentChunk.estimatedTokens = Math.ceil(currentChunk.totalChars / CHARS_PER_TOKEN)
  }
  
  if (currentChunk.pdfFiles.length > 0) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

function createEmptyChunk(): PDFChunk {
  return {
    id: generateChunkId(),
    pdfFiles: [],
    totalChars: 0,
    estimatedTokens: 0
  }
}

function shouldStartNewChunk(
  currentChunk: PDFChunk, 
  pdf: { text: string }, 
  config: ChunkingConfig
): boolean {
  // Check if current chunk is empty
  if (currentChunk.pdfFiles.length === 0) {
    return false
  }
  
  // Check character limit
  const newTotalChars = currentChunk.totalChars + pdf.text.length
  if (newTotalChars > config.maxCharsPerChunk) {
    return true
  }
  
  // Check PDF count limit
  if (currentChunk.pdfFiles.length >= config.maxPdfsPerChunk) {
    return true
  }
  
  // Check token limit with context overhead
  const estimatedTokens = Math.ceil(newTotalChars / CHARS_PER_TOKEN) + CONTEXT_OVERHEAD
  if (estimatedTokens > TOKEN_LIMIT) {
    return true
  }
  
  return false
}

function generateChunkId(): string {
  return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Token bucket for rate limiting
export class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly capacity: number = 100000
  private readonly refillRate: number = 100000 // tokens per minute
  
  constructor() {
    this.tokens = this.capacity
    this.lastRefill = Date.now()
  }
  
  canConsume(requestedTokens: number): boolean {
    this.refill()
    return this.tokens >= requestedTokens
  }
  
  consume(tokens: number): boolean {
    this.refill()
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }
    return false
  }
  
  timeUntilAvailable(requestedTokens: number): number {
    this.refill()
    if (this.tokens >= requestedTokens) return 0
    
    const tokensNeeded = requestedTokens - this.tokens
    const minutesNeeded = tokensNeeded / this.refillRate
    return Math.ceil(minutesNeeded * 60 * 1000) // milliseconds
  }
  
  private refill(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    const tokensToAdd = (timePassed / 60000) * this.refillRate
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }
}

// Validation functions
export function validateChunkSize(chunk: PDFChunk): { valid: boolean; reason?: string } {
  const estimatedTokens = Math.ceil(chunk.totalChars / CHARS_PER_TOKEN) + CONTEXT_OVERHEAD
  
  if (estimatedTokens > TOKEN_LIMIT) {
    return {
      valid: false,
      reason: `Chunk too large: ${estimatedTokens} tokens exceeds limit of ${TOKEN_LIMIT}`
    }
  }
  
  if (chunk.pdfFiles.length === 0) {
    return {
      valid: false,
      reason: 'Chunk contains no PDF files'
    }
  }
  
  return { valid: true }
}

export function isChunkedRequest(requestBody: any): requestBody is ChunkedExtractionRequest {
  return requestBody && typeof requestBody.chunkId === 'string' && 
         typeof requestBody.chunkIndex === 'number' && 
         typeof requestBody.totalChunks === 'number' &&
         Array.isArray(requestBody.pdfTexts)
}