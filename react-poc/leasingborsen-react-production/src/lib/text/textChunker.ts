// Smart text chunking for large PDFs that exceed AI token limits
export interface TextChunk {
  text: string
  index: number
  token_estimate: number
  has_vehicle_data: boolean
}

export class SmartTextChunker {
  private readonly maxChunkSize: number
  private readonly overlapSize: number
  
  constructor(maxChunkSize = 3000, overlapSize = 200) {
    this.maxChunkSize = maxChunkSize
    this.overlapSize = overlapSize
  }
  
  chunkText(text: string): TextChunk[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const chunks: TextChunk[] = []
    
    let currentChunk = ''
    let chunkIndex = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if adding this line would exceed the limit
      if (currentChunk.length + line.length > this.maxChunkSize) {
        // Finalize current chunk if it has content
        if (currentChunk.trim()) {
          chunks.push(this.createChunk(currentChunk, chunkIndex))
          chunkIndex++
        }
        
        // Start new chunk with overlap from previous chunk
        currentChunk = this.getOverlapText(currentChunk) + '\n' + line
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }
    
    // Add final chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, chunkIndex))
    }
    
    console.log(`📄 Split text into ${chunks.length} chunks`)
    chunks.forEach((chunk, i) => {
      console.log(`  Chunk ${i}: ${chunk.text.length} chars, vehicles: ${chunk.has_vehicle_data}`)
    })
    
    return chunks
  }
  
  private createChunk(text: string, index: number): TextChunk {
    return {
      text: text.trim(),
      index,
      token_estimate: Math.ceil(text.length / 4), // Rough token estimation
      has_vehicle_data: this.containsVehicleData(text)
    }
  }
  
  private getOverlapText(text: string): string {
    const words = text.split(' ')
    const overlapWords = words.slice(-Math.ceil(this.overlapSize / 5)) // Rough word count
    return overlapWords.join(' ')
  }
  
  private containsVehicleData(text: string): boolean {
    // Check for common vehicle indicators
    const vehicleIndicators = [
      // Car makes
      /\b(volkswagen|vw|toyota|bmw|audi|mercedes|ford|opel|peugeot|citroen|hyundai|kia|nissan|honda|mazda|volvo|skoda|seat)\b/i,
      
      // Common car terms
      /\b(hk|kw|horsepower|hestekræfter)\b/i, // Power units
      /\b(\d+)\s*(km\/år|km per år)\b/i, // Annual mileage
      /\b(\d+)\s*(mdr|måneder|months)\b/i, // Lease duration
      /\b(\d{1,3}[.,]?\d{3})\s*kr\b/i, // Danish prices
      
      // Electric vehicle terms
      /\b(elektrisk|electric|kwh|rækkevidde|range|opladning|charging)\b/i,
      
      // Common car model patterns
      /\b([A-Z][a-z]+\s*[0-9])\b/, // Model with number (Golf 8, X3, etc.)
      /\bID\.[0-9]/i, // VW ID series
      /\b(life\+|style\+|gtx\+|r-line|elegance|comfortline)\b/i // VW variants
    ]
    
    return vehicleIndicators.some(pattern => pattern.test(text))
  }
  
  // Process chunks intelligently - skip chunks without vehicle data
  filterRelevantChunks(chunks: TextChunk[]): TextChunk[] {
    const relevantChunks = chunks.filter(chunk => chunk.has_vehicle_data)
    
    if (relevantChunks.length === 0) {
      console.warn('No chunks contain vehicle data - processing all chunks as fallback')
      return chunks
    }
    
    console.log(`📋 Filtered to ${relevantChunks.length} relevant chunks (from ${chunks.length} total)`)
    return relevantChunks
  }
  
  // Merge results from multiple chunks, removing duplicates
  mergeChunkResults<T extends { make: string; model: string; variant: string }>(
    chunkResults: T[][]
  ): T[] {
    const allVehicles = chunkResults.flat()
    const uniqueVehicles = new Map<string, T>()
    
    for (const vehicle of allVehicles) {
      const key = `${vehicle.make}-${vehicle.model}-${vehicle.variant}`.toLowerCase()
      
      // Keep the vehicle with more offers or higher confidence
      const existing = uniqueVehicles.get(key)
      if (!existing || this.isVehicleBetter(vehicle, existing)) {
        uniqueVehicles.set(key, vehicle)
      }
    }
    
    const result = Array.from(uniqueVehicles.values())
    console.log(`🔄 Merged ${allVehicles.length} vehicles from chunks into ${result.length} unique vehicles`)
    
    return result
  }
  
  private isVehicleBetter(
    vehicle: any,
    existing: any
  ): boolean {
    // Prefer vehicle with more offers
    const vehicleOffers = vehicle.offers?.length || 0
    const existingOffers = existing.offers?.length || 0
    
    if (vehicleOffers !== existingOffers) {
      return vehicleOffers > existingOffers
    }
    
    // Prefer vehicle with higher confidence
    const vehicleConfidence = vehicle.confidence || 0
    const existingConfidence = existing.confidence || 0
    
    return vehicleConfidence > existingConfidence
  }
}

export const smartTextChunker = new SmartTextChunker()