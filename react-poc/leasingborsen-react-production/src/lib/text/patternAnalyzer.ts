// Analyze text structure to choose optimal extraction strategy
export interface TextAnalysis {
  isStructured: boolean
  hasTableFormat: boolean
  hasListFormat: boolean
  textLength: number
  lineCount: number
  vehicleCount: number
  complexityScore: number
  recommendedStrategy: 'pattern' | 'ai' | 'hybrid'
  confidence: number
}

export class TextPatternAnalyzer {
  analyzeText(text: string): TextAnalysis {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    // Basic metrics
    const textLength = text.length
    const lineCount = lines.length
    
    // Structure analysis
    const isStructured = this.detectStructuredFormat(text, lines)
    const hasTableFormat = this.detectTableFormat(lines)
    const hasListFormat = this.detectListFormat(lines)
    
    // Vehicle content analysis
    const vehicleCount = this.estimateVehicleCount(text, lines)
    
    // Complexity scoring
    const complexityScore = this.calculateComplexityScore(text, lines, isStructured)
    
    // Strategy recommendation
    const { strategy, confidence } = this.recommendStrategy(
      complexityScore,
      isStructured,
      hasTableFormat,
      vehicleCount,
      textLength
    )
    
    const analysis: TextAnalysis = {
      isStructured,
      hasTableFormat,
      hasListFormat,
      textLength,
      lineCount,
      vehicleCount,
      complexityScore,
      recommendedStrategy: strategy,
      confidence
    }
    
    console.log('📊 Text analysis results:', analysis)
    
    return analysis
  }
  
  private detectStructuredFormat(text: string, lines: string[]): boolean {
    // Check for consistent indentation, tabs, or spacing
    const hasConsistentIndentation = lines.some(line => /^\s{2,}/.test(line))
    const hasTabs = text.includes('\t')
    const hasColumnSpacing = lines.some(line => /\s{3,}/.test(line))
    
    return hasConsistentIndentation || hasTabs || hasColumnSpacing
  }
  
  private detectTableFormat(lines: string[]): boolean {
    // Look for table-like patterns with consistent columns
    const tableIndicators = [
      // Header patterns
      /kørselsbehov.*leasingperiode.*pris/i,
      /km\/år.*mdr.*kr/i,
      
      // Data row patterns
      /\d{1,2}[.,]?\d{3}\s*km\/år.*\d+\s*mdr.*\d{1,3}[.,]?\d{3}\s*kr/i,
      
      // Pipe separated
      /\|.*\|.*\|/,
      
      // Multiple price columns
      /\d+\s*kr.*\d+\s*kr.*\d+\s*kr/
    ]
    
    return tableIndicators.some(pattern => 
      lines.some(line => pattern.test(line))
    )
  }
  
  private detectListFormat(lines: string[]): boolean {
    // Look for list-like patterns
    const listIndicators = [
      // Bullet points or dashes
      /^\s*[-•*]\s+/,
      
      // Numbered lists
      /^\s*\d+\.\s+/,
      
      // Model names followed by specs
      /^[A-Z][\w\s]+\d+\s+hk/i,
      
      // Common car listing patterns
      /^(volkswagen|toyota|bmw|audi|mercedes)\s+/i
    ]
    
    const listLines = lines.filter(line => 
      listIndicators.some(pattern => pattern.test(line))
    )
    
    return listLines.length > 2 // At least 3 list items
  }
  
  private estimateVehicleCount(text: string, lines: string[]): number {
    // Count potential vehicle mentions
    const vehiclePatterns = [
      // Specific model patterns
      /\b(golf|polo|passat|tiguan|touran|arteon)\b/gi,
      /\bID\.[0-9]/gi,
      /\bT-R(oc|oq)\b/gi,
      
      // General car patterns
      /\b\w+\s+\d+(\.\d+)?\s+(TSI|TDI|eTSI|hk|kW)/gi,
      /\b(life\+|style\+|gtx\+|elegance|comfortline|r-line)\b/gi,
      
      // Power ratings (often 1 per vehicle)
      /\b\d{2,3}\s+hk\b/gi,
      /\b\d{2,3}\s+kW\b/gi
    ]
    
    const matches = new Set<string>()
    
    for (const pattern of vehiclePatterns) {
      const patternMatches = text.match(pattern) || []
      patternMatches.forEach(match => matches.add(match.toLowerCase()))
    }
    
    // Also count lines that look like vehicle specifications
    const vehicleLines = lines.filter(line => {
      const hasModel = /\b[A-Z][\w\s]+\d*\b/.test(line)
      const hasPower = /\b\d{2,3}\s+(hk|kW)\b/.test(line)
      const hasPrice = /\d{1,3}[.,]?\d{3}\s*kr/.test(line)
      
      return (hasModel && hasPower) || (hasModel && hasPrice)
    })
    
    const estimate = Math.max(matches.size, Math.ceil(vehicleLines.length / 2))
    console.log(`🚗 Estimated ${estimate} vehicles from patterns and structure`)
    
    return estimate
  }
  
  private calculateComplexityScore(text: string, lines: string[], isStructured: boolean): number {
    let score = 0
    
    // Text length factor (0-0.3)
    const lengthFactor = Math.min(text.length / 50000, 1) * 0.3
    score += lengthFactor
    
    // Line density factor (0-0.2)
    const avgLineLength = text.length / lines.length
    const densityFactor = Math.min(avgLineLength / 200, 1) * 0.2
    score += densityFactor
    
    // Structure factor (0-0.3)
    if (!isStructured) {
      score += 0.3 // Unstructured text is more complex
    }
    
    // Concatenation factor (0-0.2)
    const longLines = lines.filter(line => line.length > 500).length
    const concatenationFactor = Math.min(longLines / lines.length, 1) * 0.2
    score += concatenationFactor
    
    return Math.min(score, 1) // Cap at 1.0
  }
  
  private recommendStrategy(
    complexityScore: number,
    isStructured: boolean,
    hasTableFormat: boolean,
    vehicleCount: number,
    textLength: number
  ): { strategy: 'pattern' | 'ai' | 'hybrid'; confidence: number } {
    
    // Simple, structured text with clear patterns
    if (complexityScore < 0.3 && isStructured && hasTableFormat) {
      return { strategy: 'pattern', confidence: 0.9 }
    }
    
    // Very complex or long text
    if (complexityScore > 0.7 || textLength > 20000) {
      return { strategy: 'ai', confidence: 0.8 }
    }
    
    // Medium complexity - try patterns first, fallback to AI
    if (complexityScore < 0.5 && vehicleCount < 10) {
      return { strategy: 'hybrid', confidence: 0.7 }
    }
    
    // Default to AI for uncertain cases
    return { strategy: 'ai', confidence: 0.6 }
  }
  
  // Quick check to see if patterns might work
  quickPatternViabilityCheck(text: string): number {
    const indicators = [
      // Clear model names
      /\b(volkswagen|vw)\s+[A-Z][\w\s]+/gi,
      
      // Consistent pricing format
      /\d{1,3}[.,]?\d{3}\s*kr/g,
      
      // Power specifications
      /\d{2,3}\s+(hk|kW)/g,
      
      // Mileage patterns
      /\d{1,2}[.,]?\d{3}\s*km\/år/g,
      
      // Duration patterns
      /\d{1,2}\s*mdr/g
    ]
    
    const matches = indicators.map(pattern => (text.match(pattern) || []).length)
    const totalMatches = matches.reduce((sum, count) => sum + count, 0)
    
    // Confidence based on match density
    const confidence = Math.min(totalMatches / (text.length / 1000), 1)
    
    console.log(`🔍 Pattern viability: ${confidence.toFixed(2)} (${totalMatches} matches)`)
    return confidence
  }
}

export const textPatternAnalyzer = new TextPatternAnalyzer()