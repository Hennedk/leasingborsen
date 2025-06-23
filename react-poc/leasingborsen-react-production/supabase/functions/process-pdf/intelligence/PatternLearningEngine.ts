import { Database } from '../../../types/supabase'
import { createClient } from '@supabase/supabase-js'
import { ExtractedData } from '../types'

interface PatternMatch {
  pattern: string
  value: string
  confidence: number
  position?: { start: number; end: number }
}

interface LearnedPattern {
  id: string
  pattern: string
  field: string
  success_rate: number
  usage_count: number
  confidence_threshold: number
  examples: string[]
  created_at: string
  updated_at: string
  status: 'active' | 'testing' | 'retired'
}

interface PatternPerformance {
  pattern_id: string
  success_count: number
  failure_count: number
  avg_confidence: number
  last_used: string
}

interface ExtractionFeedback {
  extraction_id: string
  field: string
  extracted_value: string
  corrected_value?: string
  is_correct: boolean
  pattern_used?: string
  confidence: number
}

export class PatternLearningEngine {
  private supabase: any
  private patterns: Map<string, LearnedPattern> = new Map()
  private performanceMetrics: Map<string, PatternPerformance> = new Map()
  private learningThreshold = 0.85 // 85% success rate to promote pattern
  private minimumSamples = 10
  private adaptiveConfidenceWindow = 100 // Last 100 extractions for confidence adjustment

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey)
    this.loadPatterns()
  }

  /**
   * Load existing patterns from the database
   */
  private async loadPatterns(): Promise<void> {
    try {
      const { data: patterns, error } = await this.supabase
        .from('pattern_learning')
        .select('*')
        .eq('status', 'active')

      if (error) throw error

      patterns?.forEach((pattern: LearnedPattern) => {
        this.patterns.set(pattern.id, pattern)
      })

      // Load performance metrics
      const { data: metrics } = await this.supabase
        .from('pattern_performance')
        .select('*')

      metrics?.forEach((metric: PatternPerformance) => {
        this.performanceMetrics.set(metric.pattern_id, metric)
      })
    } catch (error) {
      console.error('Error loading patterns:', error)
    }
  }

  /**
   * Discover new patterns from successful extractions
   */
  async discoverPatterns(text: string, extractedData: ExtractedData): Promise<void> {
    const discoveries: Array<{ field: string; pattern: string; example: string }> = []

    // Analyze each extracted field for pattern discovery
    for (const [field, value] of Object.entries(extractedData)) {
      if (!value || typeof value !== 'string') continue

      // Find the context around the extracted value
      const valueIndex = text.indexOf(value)
      if (valueIndex === -1) continue

      const contextStart = Math.max(0, valueIndex - 50)
      const contextEnd = Math.min(text.length, valueIndex + value.length + 50)
      const context = text.substring(contextStart, contextEnd)

      // Generate potential patterns
      const patterns = this.generatePatternsFromContext(context, value, field)
      
      for (const pattern of patterns) {
        discoveries.push({ field, pattern, example: value })
      }
    }

    // Store discovered patterns for analysis
    await this.storeDiscoveries(discoveries)
  }

  /**
   * Generate potential patterns from context
   */
  private generatePatternsFromContext(context: string, value: string, field: string): string[] {
    const patterns: string[] = []
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Pattern 1: Label followed by value
    const labelMatch = context.match(new RegExp(`([\w\s]+):\s*${escapedValue}`))
    if (labelMatch) {
      const label = labelMatch[1].trim()
      patterns.push(`${label}:\\s*([\\w\\s,.]+)`))
    }

    // Pattern 2: Value in specific format based on field type
    if (field === 'price' || field === 'monthly_payment') {
      // Price patterns
      patterns.push('([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]+)?)')
      patterns.push('kr\\.?\\s*([0-9]{1,3}(?:\\.[0-9]{3})*)')
    } else if (field === 'registration_date' || field === 'first_registration') {
      // Date patterns
      patterns.push('([0-9]{2}[-/.][0-9]{2}[-/.][0-9]{4})')
      patterns.push('([0-9]{4}[-/.][0-9]{2}[-/.][0-9]{2})')
    } else if (field === 'mileage') {
      // Mileage patterns
      patterns.push('([0-9]{1,3}(?:\\.[0-9]{3})*|[0-9]+)\\s*km')
    }

    // Pattern 3: Contextual patterns based on surrounding text
    const words = context.split(/\s+/)
    const valueIndex = words.indexOf(value)
    if (valueIndex > 0) {
      const precedingWord = words[valueIndex - 1]
      if (precedingWord && !precedingWord.match(/^[0-9]+$/)) {
        patterns.push(`${precedingWord}\\s+([\\w\\s]+)`))
      }
    }

    return patterns
  }

  /**
   * Store discovered patterns for analysis
   */
  private async storeDiscoveries(discoveries: Array<{ field: string; pattern: string; example: string }>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('pattern_discoveries')
        .insert(
          discoveries.map(d => ({
            field: d.field,
            pattern: d.pattern,
            example: d.example,
            discovered_at: new Date().toISOString()
          }))
        )

      if (error) throw error

      // Analyze discoveries for promotion
      await this.analyzeDiscoveries()
    } catch (error) {
      console.error('Error storing discoveries:', error)
    }
  }

  /**
   * Analyze discovered patterns for promotion to active use
   */
  private async analyzeDiscoveries(): Promise<void> {
    try {
      // Get pattern frequency analysis
      const { data: frequencies, error } = await this.supabase
        .rpc('analyze_pattern_frequency', {
          min_occurrences: this.minimumSamples
        })

      if (error) throw error

      for (const freq of frequencies || []) {
        if (freq.occurrence_count >= this.minimumSamples && freq.success_rate >= this.learningThreshold) {
          await this.promotePattern(freq)
        }
      }
    } catch (error) {
      console.error('Error analyzing discoveries:', error)
    }
  }

  /**
   * Promote a discovered pattern to active use
   */
  private async promotePattern(patternData: any): Promise<void> {
    try {
      const newPattern: Partial<LearnedPattern> = {
        pattern: patternData.pattern,
        field: patternData.field,
        success_rate: patternData.success_rate,
        usage_count: 0,
        confidence_threshold: 0.7, // Start with moderate confidence
        examples: patternData.examples || [],
        status: 'testing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('pattern_learning')
        .insert(newPattern)
        .select()
        .single()

      if (error) throw error

      if (data) {
        this.patterns.set(data.id, data)
        console.log(`Promoted new pattern for field ${data.field}: ${data.pattern}`)
      }
    } catch (error) {
      console.error('Error promoting pattern:', error)
    }
  }

  /**
   * Apply learned patterns to extract data
   */
  async applyLearnedPatterns(text: string, field: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = []
    const fieldPatterns = Array.from(this.patterns.values()).filter(p => p.field === field)

    for (const pattern of fieldPatterns) {
      try {
        const regex = new RegExp(pattern.pattern, 'gi')
        const regexMatches = text.matchAll(regex)

        for (const match of regexMatches) {
          const value = match[1] || match[0]
          const confidence = this.calculateConfidence(pattern, value)

          if (confidence >= pattern.confidence_threshold) {
            matches.push({
              pattern: pattern.pattern,
              value: value.trim(),
              confidence,
              position: match.index ? { start: match.index, end: match.index + match[0].length } : undefined
            })
          }
        }
      } catch (error) {
        console.error(`Error applying pattern ${pattern.pattern}:`, error)
      }
    }

    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculate confidence for a pattern match
   */
  private calculateConfidence(pattern: LearnedPattern, value: string): number {
    let confidence = pattern.success_rate

    // Adjust based on pattern performance
    const performance = this.performanceMetrics.get(pattern.id)
    if (performance) {
      const totalUses = performance.success_count + performance.failure_count
      if (totalUses > 0) {
        const recentSuccessRate = performance.success_count / totalUses
        confidence = (confidence + recentSuccessRate) / 2
      }
    }

    // Adjust based on value characteristics
    if (pattern.examples.some(ex => ex === value)) {
      confidence += 0.1 // Boost for exact match with previous examples
    }

    // Field-specific adjustments
    if (pattern.field === 'price' && !value.match(/^[0-9.,]+$/)) {
      confidence -= 0.2 // Penalty for non-numeric price
    }

    return Math.min(1, Math.max(0, confidence))
  }

  /**
   * Update pattern performance based on feedback
   */
  async updatePatternPerformance(feedback: ExtractionFeedback): Promise<void> {
    if (!feedback.pattern_used) return

    try {
      // Find the pattern
      const pattern = Array.from(this.patterns.values()).find(p => p.pattern === feedback.pattern_used)
      if (!pattern) return

      // Update performance metrics
      const performance = this.performanceMetrics.get(pattern.id) || {
        pattern_id: pattern.id,
        success_count: 0,
        failure_count: 0,
        avg_confidence: 0,
        last_used: new Date().toISOString()
      }

      if (feedback.is_correct) {
        performance.success_count++
      } else {
        performance.failure_count++
      }

      // Update average confidence
      const totalCount = performance.success_count + performance.failure_count
      performance.avg_confidence = 
        (performance.avg_confidence * (totalCount - 1) + feedback.confidence) / totalCount
      performance.last_used = new Date().toISOString()

      this.performanceMetrics.set(pattern.id, performance)

      // Store feedback
      await this.supabase
        .from('extraction_feedback')
        .insert(feedback)

      // Update pattern if needed
      await this.adaptPattern(pattern, performance)
    } catch (error) {
      console.error('Error updating pattern performance:', error)
    }
  }

  /**
   * Adapt pattern based on performance
   */
  private async adaptPattern(pattern: LearnedPattern, performance: PatternPerformance): Promise<void> {
    const totalUses = performance.success_count + performance.failure_count
    if (totalUses < this.adaptiveConfidenceWindow) return

    const currentSuccessRate = performance.success_count / totalUses
    
    // Update confidence threshold
    if (currentSuccessRate > 0.9) {
      // Lower threshold for highly successful patterns
      pattern.confidence_threshold = Math.max(0.5, pattern.confidence_threshold - 0.05)
    } else if (currentSuccessRate < 0.7) {
      // Raise threshold for underperforming patterns
      pattern.confidence_threshold = Math.min(0.95, pattern.confidence_threshold + 0.05)
    }

    // Update pattern status
    if (currentSuccessRate < 0.5 && totalUses > this.adaptiveConfidenceWindow * 2) {
      pattern.status = 'retired'
    } else if (pattern.status === 'testing' && currentSuccessRate > 0.85 && totalUses > this.adaptiveConfidenceWindow) {
      pattern.status = 'active'
    }

    // Update success rate
    pattern.success_rate = currentSuccessRate
    pattern.updated_at = new Date().toISOString()

    // Save updates
    await this.supabase
      .from('pattern_learning')
      .update(pattern)
      .eq('id', pattern.id)

    this.patterns.set(pattern.id, pattern)
  }

  /**
   * Detect format changes in PDFs
   */
  async detectFormatChanges(dealerId: string, currentExtraction: ExtractedData): Promise<boolean> {
    try {
      // Get recent extractions for this dealer
      const { data: recentExtractions, error } = await this.supabase
        .from('pdf_extractions')
        .select('extracted_data, created_at')
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error || !recentExtractions || recentExtractions.length < 5) {
        return false
      }

      // Calculate field presence consistency
      const fieldPresence: Map<string, number> = new Map()
      for (const extraction of recentExtractions) {
        for (const field of Object.keys(extraction.extracted_data)) {
          fieldPresence.set(field, (fieldPresence.get(field) || 0) + 1)
        }
      }

      // Check for significant changes
      let changesDetected = false
      for (const [field, count] of fieldPresence.entries()) {
        const presenceRate = count / recentExtractions.length
        const currentHasField = field in currentExtraction

        // Detect if a commonly present field is missing
        if (presenceRate > 0.8 && !currentHasField) {
          changesDetected = true
          await this.logFormatChange(dealerId, field, 'missing_field')
        }
        // Detect if a new field appears
        else if (presenceRate < 0.2 && currentHasField) {
          changesDetected = true
          await this.logFormatChange(dealerId, field, 'new_field')
        }
      }

      return changesDetected
    } catch (error) {
      console.error('Error detecting format changes:', error)
      return false
    }
  }

  /**
   * Log format changes for monitoring
   */
  private async logFormatChange(dealerId: string, field: string, changeType: string): Promise<void> {
    try {
      await this.supabase
        .from('format_change_logs')
        .insert({
          dealer_id: dealerId,
          field,
          change_type: changeType,
          detected_at: new Date().toISOString()
        })

      console.log(`Format change detected for dealer ${dealerId}: ${changeType} - ${field}`)
    } catch (error) {
      console.error('Error logging format change:', error)
    }
  }

  /**
   * Get learning suggestions for manual review
   */
  async getLearningSuggestions(): Promise<any[]> {
    try {
      const { data: suggestions, error } = await this.supabase
        .rpc('get_learning_suggestions', {
          min_confidence: 0.6,
          min_occurrences: 5
        })

      if (error) throw error

      return suggestions || []
    } catch (error) {
      console.error('Error getting learning suggestions:', error)
      return []
    }
  }

  /**
   * Get pattern performance metrics for dashboard
   */
  async getPerformanceMetrics(): Promise<any> {
    try {
      const metrics = {
        totalPatterns: this.patterns.size,
        activePatterns: Array.from(this.patterns.values()).filter(p => p.status === 'active').length,
        testingPatterns: Array.from(this.patterns.values()).filter(p => p.status === 'testing').length,
        averageSuccessRate: 0,
        topPerformingPatterns: [] as any[],
        underperformingPatterns: [] as any[],
        recentFormatChanges: [] as any[]
      }

      // Calculate average success rate
      const activePatterns = Array.from(this.patterns.values()).filter(p => p.status === 'active')
      if (activePatterns.length > 0) {
        metrics.averageSuccessRate = 
          activePatterns.reduce((sum, p) => sum + p.success_rate, 0) / activePatterns.length
      }

      // Get top performing patterns
      metrics.topPerformingPatterns = activePatterns
        .sort((a, b) => b.success_rate - a.success_rate)
        .slice(0, 5)
        .map(p => ({
          field: p.field,
          pattern: p.pattern,
          success_rate: p.success_rate,
          usage_count: p.usage_count
        }))

      // Get underperforming patterns
      metrics.underperformingPatterns = activePatterns
        .filter(p => p.success_rate < 0.7)
        .sort((a, b) => a.success_rate - b.success_rate)
        .slice(0, 5)
        .map(p => ({
          field: p.field,
          pattern: p.pattern,
          success_rate: p.success_rate,
          usage_count: p.usage_count
        }))

      // Get recent format changes
      const { data: formatChanges } = await this.supabase
        .from('format_change_logs')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(10)

      metrics.recentFormatChanges = formatChanges || []

      return metrics
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      return null
    }
  }

  /**
   * A/B test new patterns against existing ones
   */
  async runPatternABTest(field: string, newPattern: string, testSize: number = 100): Promise<any> {
    try {
      // Get test samples
      const { data: samples, error } = await this.supabase
        .from('pdf_extractions')
        .select('id, text_content, extracted_data')
        .order('created_at', { ascending: false })
        .limit(testSize)

      if (error || !samples) throw error

      const results = {
        newPattern: { success: 0, total: 0 },
        existingPatterns: { success: 0, total: 0 }
      }

      for (const sample of samples) {
        // Test new pattern
        const newMatches = await this.testPattern(sample.text_content, newPattern, field)
        const actualValue = sample.extracted_data[field]
        
        if (newMatches.length > 0 && this.isMatchCorrect(newMatches[0].value, actualValue)) {
          results.newPattern.success++
        }
        results.newPattern.total++

        // Test existing patterns
        const existingMatches = await this.applyLearnedPatterns(sample.text_content, field)
        if (existingMatches.length > 0 && this.isMatchCorrect(existingMatches[0].value, actualValue)) {
          results.existingPatterns.success++
        }
        results.existingPatterns.total++
      }

      // Calculate success rates
      const newSuccessRate = results.newPattern.success / results.newPattern.total
      const existingSuccessRate = results.existingPatterns.success / results.existingPatterns.total

      return {
        newPattern: {
          pattern: newPattern,
          successRate: newSuccessRate,
          improvement: newSuccessRate - existingSuccessRate
        },
        existingSuccessRate,
        recommendation: newSuccessRate > existingSuccessRate * 1.1 ? 'adopt' : 'reject',
        testSize
      }
    } catch (error) {
      console.error('Error running A/B test:', error)
      return null
    }
  }

  /**
   * Test a single pattern
   */
  private async testPattern(text: string, pattern: string, field: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = []
    try {
      const regex = new RegExp(pattern, 'gi')
      const regexMatches = text.matchAll(regex)

      for (const match of regexMatches) {
        const value = match[1] || match[0]
        matches.push({
          pattern,
          value: value.trim(),
          confidence: 0.5, // Default confidence for testing
          position: match.index ? { start: match.index, end: match.index + match[0].length } : undefined
        })
      }
    } catch (error) {
      console.error(`Error testing pattern ${pattern}:`, error)
    }
    return matches
  }

  /**
   * Check if extracted value matches actual value
   */
  private isMatchCorrect(extracted: string, actual: string): boolean {
    if (!extracted || !actual) return false
    
    // Normalize values for comparison
    const normalizedExtracted = extracted.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizedActual = actual.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    return normalizedExtracted === normalizedActual
  }
}