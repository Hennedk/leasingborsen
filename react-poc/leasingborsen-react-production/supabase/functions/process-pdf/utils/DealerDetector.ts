import { DealerType } from '../types/DealerConfig.ts'

interface DetectionPattern {
  keywords: string[]
  models?: string[]
  formats?: RegExp[]
  weight: number
}

interface DetectionResult {
  dealerType: DealerType
  confidence: number
  matches: {
    keywords: string[]
    models: string[]
    formats: string[]
  }
}

/**
 * Multi-Dealer Detection System
 * 
 * Analyzes PDF content to automatically determine which dealer configuration to use.
 * Uses a confidence scoring system based on multiple detection strategies:
 * 
 * Detection Strategies:
 * 1. Brand keyword detection - Searches for dealer-specific terms
 * 2. Model name detection - Identifies car models specific to brands
 * 3. PDF format fingerprinting - Recognizes document structure patterns
 * 4. Dealer-specific terminology - Detects business terms and phrases
 * 
 * Confidence Scoring:
 * - Keywords: 10 points each
 * - Model names: 15 points each (stronger indicator)
 * - Format patterns: 5 points each
 * - Final confidence: (points / max_possible) * 100
 * 
 * Extensibility:
 * To add a new dealer, simply:
 * 1. Add the dealer type to DealerType union in DealerConfig.ts
 * 2. Add detection patterns to the patterns object below
 * 3. Add dealer mapping in main index.ts dealerTypeToId object
 * 4. Create the corresponding dealer configuration
 * 
 * Example new dealer pattern:
 * bmw: {
 *   keywords: ['bmw', 'mini', 'rolls-royce', 'bmw group'],
 *   models: ['x1', 'x3', 'x5', 'i3', 'i4', 'ix', 'mini cooper'],
 *   formats: [/bmw\\s*financial\\s*services/i],
 *   weight: 1.0
 * }
 */
export class DealerDetector {
  private static patterns: Record<DealerType, DetectionPattern> = {
    vw_group: {
      keywords: [
        'volkswagen', 'vw', 'audi', 'skoda', 'škoda', 'seat', 'cupra',
        'das auto', 'vorsprung durch technik', 'simply clever',
        'vw erhvervscenter', 'volkswagen erhverv', 'audi business',
        'semler', 'skandinavisk motor co', 'vag', 'vw group'
      ],
      models: [
        // Volkswagen models
        'id.3', 'id.4', 'id.5', 'id.7', 'id.buzz', 'golf', 'passat', 'tiguan', 
        'touareg', 'arteon', 'polo', 't-roc', 't-cross', 'taigo', 'up!',
        'caddy', 'transporter', 'crafter', 'amarok', 'multivan',
        // Audi models
        'a1', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'q2', 'q3', 'q4', 'q5', 'q7', 'q8',
        'e-tron', 'rs3', 'rs4', 'rs5', 'rs6', 'rs7', 'tt', 'r8',
        // SKODA models
        'octavia', 'superb', 'kodiaq', 'karoq', 'kamiq', 'enyaq', 'fabia', 'scala',
        // SEAT models
        'leon', 'ibiza', 'arona', 'ateca', 'tarraco', 'mii',
        // CUPRA models
        'formentor', 'born', 'ateca', 'leon'
      ],
      formats: [
        /erhvervsleasing\s*tilbud/i,
        /\bvw\s*erhverv/i,
        /finansiel\s*leasing/i,
        /operationel\s*leasing/i
      ],
      weight: 1.0
    },
    toyota: {
      keywords: [
        'toyota', 'lexus', 'hybrid', 'toyota danmark', 'toyota erhverv',
        'toyota financial services', 'tfs', 'toyota leasing', 'lexus leasing',
        'bilia', 'delaney', 'carl pedersen', 'toyota material handling'
      ],
      models: [
        // Toyota models
        'yaris', 'corolla', 'camry', 'rav4', 'c-hr', 'highlander', 'land cruiser',
        'prius', 'mirai', 'aygo', 'proace', 'hilux', 'supra', 'gr86', 'bz4x',
        // Lexus models
        'is', 'es', 'gs', 'ls', 'ct', 'ux', 'nx', 'rx', 'gx', 'lx', 'lc', 'rc'
      ],
      formats: [
        /toyota\s*financial\s*services/i,
        /toyota\s*leasing/i,
        /hybrid\s*technology/i
      ],
      weight: 1.0
    }
  }

  /**
   * Detect dealer type from PDF text content
   */
  static async detect(text: string, filename?: string): Promise<DetectionResult> {
    const normalizedText = text.toLowerCase()
    const normalizedFilename = filename?.toLowerCase() || ''
    
    const results: DetectionResult[] = []

    // Check each dealer pattern
    for (const [dealerType, pattern] of Object.entries(this.patterns)) {
      const matches = {
        keywords: [] as string[],
        models: [] as string[],
        formats: [] as string[]
      }
      
      let score = 0

      // Check keywords
      pattern.keywords.forEach(keyword => {
        if (normalizedText.includes(keyword) || normalizedFilename.includes(keyword)) {
          matches.keywords.push(keyword)
          score += pattern.weight * 10
        }
      })

      // Check model names
      pattern.models?.forEach(model => {
        const modelRegex = new RegExp(`\\b${model.replace('.', '\\.')}\\b`, 'i')
        if (modelRegex.test(text) || modelRegex.test(filename || '')) {
          matches.models.push(model)
          score += pattern.weight * 15 // Model names are strong indicators
        }
      })

      // Check format patterns
      pattern.formats?.forEach(format => {
        if (format.test(text)) {
          matches.formats.push(format.source)
          score += pattern.weight * 5
        }
      })

      // Calculate confidence (0-100)
      const maxPossibleScore = (
        pattern.keywords.length * 10 + 
        (pattern.models?.length || 0) * 15 + 
        (pattern.formats?.length || 0) * 5
      ) * pattern.weight
      
      const confidence = Math.min(100, Math.round((score / maxPossibleScore) * 100))

      if (confidence > 0) {
        results.push({
          dealerType: dealerType as DealerType,
          confidence,
          matches
        })
      }
    }

    // Sort by confidence and return highest
    results.sort((a, b) => b.confidence - a.confidence)
    
    if (results.length === 0) {
      // No matches found - return unknown with 0 confidence
      return {
        dealerType: 'unknown' as DealerType,
        confidence: 0,
        matches: { keywords: [], models: [], formats: [] }
      }
    }

    return results[0]
  }

  /**
   * Detect with hints from user input or filename
   */
  static async detectWithHints(
    text: string,
    hints?: {
      filename?: string
      userHint?: string
      brand?: string
    }
  ): Promise<DetectionResult> {
    // First try detection with main text
    let result = await this.detect(text, hints?.filename)

    // If low confidence, check hints
    if (result.confidence < 50 && hints) {
      const hintText = [
        hints.userHint,
        hints.brand,
        hints.filename
      ].filter(Boolean).join(' ')

      if (hintText) {
        const hintResult = await this.detect(hintText)
        if (hintResult.confidence > result.confidence) {
          result = hintResult
        }
      }
    }

    return result
  }

  /**
   * Get confidence threshold for automatic detection
   */
  static getConfidenceThreshold(): number {
    return 30 // Minimum 30% confidence for automatic detection
  }

  /**
   * Check if detection result meets minimum confidence
   */
  static isConfident(result: DetectionResult): boolean {
    return result.confidence >= this.getConfidenceThreshold()
  }

  /**
   * Get human-readable dealer name
   */
  static getDealerName(dealerType: DealerType): string {
    const names: Record<DealerType, string> = {
      vw_group: 'Volkswagen Group',
      toyota: 'Toyota/Lexus',
      unknown: 'Unknown Dealer'
    }
    return names[dealerType] || dealerType
  }

  /**
   * Log detection results for debugging
   */
  static logDetection(result: DetectionResult, context?: string): void {
    console.log(`[DealerDetector] ${context || 'Detection Result'}:`, {
      dealer: this.getDealerName(result.dealerType),
      confidence: `${result.confidence}%`,
      matches: {
        keywords: result.matches.keywords.length,
        models: result.matches.models.length,
        formats: result.matches.formats.length
      },
      details: result.matches
    })
  }
}