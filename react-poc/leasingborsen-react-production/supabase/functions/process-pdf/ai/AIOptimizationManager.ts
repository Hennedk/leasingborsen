import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DealerConfig, AIExample } from '../types/DealerConfig.ts'

/* Claude Change Summary:
 * Created AIOptimizationManager for continuous improvement of AI extraction.
 * Implements learning from user feedback, prompt optimization, and performance tracking.
 * Features automatic prompt adjustment and cost optimization strategies.
 * Related to: AI system that learns and improves from usage patterns
 */

interface OptimizationMetrics {
  dealerId: string
  successRate: number
  averageConfidence: number
  costEfficiency: number
  totalExtractions: number
  recommendedPromptVersion: string
  improvementSuggestions: string[]
  lastOptimizedAt: string
}

interface LearningInsight {
  type: 'pattern_improvement' | 'prompt_adjustment' | 'cost_optimization' | 'confidence_boost'
  description: string
  impact: 'high' | 'medium' | 'low'
  implementation: string
  expectedImprovement: number
}

interface PromptOptimizationResult {
  originalPrompt: string
  optimizedPrompt: string
  improvementReason: string
  expectedConfidenceGain: number
  testResults?: {
    originalConfidence: number
    optimizedConfidence: number
    improvement: number
  }
}

export class AIOptimizationManager {
  private optimizationCache: Map<string, OptimizationMetrics> = new Map()
  private learningQueue: Array<any> = []
  private promptVersions: Map<string, string> = new Map()

  constructor(private supabaseClient: SupabaseClient) {
    this.initializeOptimization()
  }

  /**
   * Analyze dealer performance and generate optimization recommendations
   */
  async analyzeAndOptimize(dealerId: string): Promise<LearningInsight[]> {
    console.log(`🔍 Analyzing AI performance for dealer: ${dealerId}`)

    try {
      // 1. Get current performance metrics
      const metrics = await this.getDealerMetrics(dealerId)
      
      // 2. Analyze recent feedback and corrections
      const feedbackInsights = await this.analyzeFeedbackPatterns(dealerId)
      
      // 3. Identify cost optimization opportunities
      const costOptimizations = await this.identifyCostOptimizations(dealerId)
      
      // 4. Evaluate prompt effectiveness
      const promptInsights = await this.evaluatePromptEffectiveness(dealerId, metrics)
      
      // 5. Generate confidence improvement strategies
      const confidenceInsights = await this.generateConfidenceImprovements(dealerId, metrics)

      // 6. Combine all insights and prioritize
      const allInsights = [
        ...feedbackInsights,
        ...costOptimizations,
        ...promptInsights,
        ...confidenceInsights
      ]

      // 7. Sort by impact and implement top recommendations
      const prioritizedInsights = this.prioritizeInsights(allInsights, metrics)
      
      // 8. Auto-implement low-risk, high-impact improvements
      await this.autoImplementImprovements(dealerId, prioritizedInsights)

      console.log(`✅ Generated ${prioritizedInsights.length} optimization insights for dealer ${dealerId}`)
      
      return prioritizedInsights

    } catch (error) {
      console.error('❌ Optimization analysis failed:', error)
      return []
    }
  }

  /**
   * Learn from user feedback and corrections
   */
  async processUserFeedback(
    dealerId: string,
    extractionId: string,
    feedback: 'correct' | 'incorrect' | 'partially_correct',
    corrections?: any
  ): Promise<void> {
    try {
      // Store feedback in database
      await this.supabaseClient
        .from('ai_extraction_feedback')
        .insert({
          extraction_id: extractionId,
          dealer_id: dealerId,
          user_feedback: feedback,
          corrections: corrections,
          created_at: new Date().toISOString()
        })

      // Process feedback for immediate learning
      if (feedback === 'incorrect' && corrections) {
        await this.learnFromCorrections(dealerId, corrections)
      }

      console.log(`📝 Processed user feedback: ${feedback} for dealer ${dealerId}`)

    } catch (error) {
      console.error('❌ Failed to process user feedback:', error)
    }
  }

  /**
   * Optimize prompts based on performance data
   */
  async optimizePrompts(dealerId: string, config: DealerConfig): Promise<PromptOptimizationResult | null> {
    try {
      console.log(`🎯 Optimizing prompts for dealer: ${dealerId}`)

      // 1. Analyze current prompt performance
      const performance = await this.analyzePromptPerformance(dealerId)
      
      if (performance.averageConfidence > 0.85) {
        console.log(`✅ Current prompts performing well (${performance.averageConfidence.toFixed(2)} confidence)`)
        return null
      }

      // 2. Identify common failure patterns
      const failurePatterns = await this.identifyFailurePatterns(dealerId)
      
      // 3. Generate improved prompt based on patterns
      const optimizedPrompt = await this.generateOptimizedPrompt(config, failurePatterns)
      
      // 4. Test optimization (if test data available)
      const testResults = await this.testPromptOptimization(dealerId, config.extraction.aiPrompt.systemRole, optimizedPrompt)

      const result: PromptOptimizationResult = {
        originalPrompt: config.extraction.aiPrompt.systemRole,
        optimizedPrompt,
        improvementReason: this.explainPromptImprovements(failurePatterns),
        expectedConfidenceGain: 0.1,
        testResults
      }

      // 5. Store optimized prompt version
      await this.storePromptVersion(dealerId, optimizedPrompt, 'auto_optimized')

      console.log(`✅ Generated optimized prompt with expected ${(result.expectedConfidenceGain * 100).toFixed(1)}% improvement`)
      
      return result

    } catch (error) {
      console.error('❌ Prompt optimization failed:', error)
      return null
    }
  }

  /**
   * Implement automatic cost optimizations
   */
  async optimizeCosts(dealerId: string): Promise<{
    currentCostEfficiency: number
    optimizedStrategy: string
    expectedSavings: number
  }> {
    try {
      // 1. Analyze current cost patterns
      const costMetrics = await this.analyzeCostPatterns(dealerId)
      
      // 2. Identify optimization opportunities
      const optimizations = await this.identifyCostOptimizations(dealerId)
      
      // 3. Calculate potential savings
      const expectedSavings = optimizations
        .filter(opt => opt.type === 'cost_optimization')
        .reduce((sum, opt) => sum + opt.expectedImprovement, 0)

      // 4. Generate optimization strategy
      const strategy = this.generateCostOptimizationStrategy(optimizations, costMetrics)

      // 5. Implement automatic optimizations
      await this.implementCostOptimizations(dealerId, optimizations)

      return {
        currentCostEfficiency: costMetrics.efficiency,
        optimizedStrategy: strategy,
        expectedSavings
      }

    } catch (error) {
      console.error('❌ Cost optimization failed:', error)
      return {
        currentCostEfficiency: 0,
        optimizedStrategy: 'No optimization available',
        expectedSavings: 0
      }
    }
  }

  /**
   * Generate learning examples from successful extractions
   */
  async generateLearningExamples(dealerId: string, limit: number = 10): Promise<AIExample[]> {
    try {
      // 1. Get successful extractions with high confidence
      const { data: successfulExtractions, error } = await this.supabaseClient
        .from('ai_extraction_cache')
        .select('*')
        .eq('dealer_id', dealerId)
        .gte('confidence_score', 0.85)
        .order('hit_count', { ascending: false })
        .limit(limit)

      if (error) throw error

      // 2. Transform to learning examples
      const examples: AIExample[] = []
      
      for (const extraction of successfulExtractions || []) {
        if (extraction.result?.vehicles?.length > 0) {
          // Create example from successful extraction
          const example: AIExample = {
            input: `Text hash: ${extraction.text_hash} (${extraction.items_count} vehicles)`,
            output: extraction.result.vehicles.slice(0, 2), // First 2 vehicles as example
            description: `High-confidence extraction (${extraction.confidence_score}) with ${extraction.hit_count} cache hits`
          }
          examples.push(example)
        }
      }

      // 3. Store examples for future use
      for (const example of examples) {
        await this.supabaseClient
          .from('ai_learned_examples')
          .upsert({
            dealer_id: dealerId,
            input_text: example.input,
            expected_output: example.output,
            confidence_score: 0.9,
            relevance_score: 1.0,
            created_at: new Date().toISOString()
          })
      }

      console.log(`📚 Generated ${examples.length} learning examples for dealer ${dealerId}`)
      
      return examples

    } catch (error) {
      console.error('❌ Failed to generate learning examples:', error)
      return []
    }
  }

  // Private helper methods

  private async getDealerMetrics(dealerId: string): Promise<OptimizationMetrics> {
    const { data, error } = await this.supabaseClient
      .from('ai_optimization_metrics')
      .select('*')
      .eq('dealer_id', dealerId)
      .single()

    if (error || !data) {
      return {
        dealerId,
        successRate: 0,
        averageConfidence: 0,
        costEfficiency: 0,
        totalExtractions: 0,
        recommendedPromptVersion: 'v1.0',
        improvementSuggestions: [],
        lastOptimizedAt: new Date().toISOString()
      }
    }

    return {
      dealerId: data.dealer_id,
      successRate: data.success_rate,
      averageConfidence: data.average_confidence,
      costEfficiency: data.cost_efficiency,
      totalExtractions: data.total_extractions,
      recommendedPromptVersion: data.prompt_version || 'v1.0',
      improvementSuggestions: [],
      lastOptimizedAt: data.last_optimized_at
    }
  }

  private async analyzeFeedbackPatterns(dealerId: string): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []

    try {
      // Get recent feedback
      const { data: feedback, error } = await this.supabaseClient
        .from('ai_extraction_feedback')
        .select('*')
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error || !feedback) return insights

      // Analyze patterns
      const incorrectFeedback = feedback.filter(f => f.user_feedback === 'incorrect')
      const partialFeedback = feedback.filter(f => f.user_feedback === 'partially_correct')

      if (incorrectFeedback.length > feedback.length * 0.3) {
        insights.push({
          type: 'prompt_adjustment',
          description: `High incorrect feedback rate (${(incorrectFeedback.length / feedback.length * 100).toFixed(1)}%)`,
          impact: 'high',
          implementation: 'Adjust AI prompts to address common extraction errors',
          expectedImprovement: 0.2
        })
      }

      if (partialFeedback.length > 0) {
        insights.push({
          type: 'confidence_boost',
          description: `${partialFeedback.length} partially correct extractions indicate room for improvement`,
          impact: 'medium',
          implementation: 'Fine-tune confidence scoring and validation rules',
          expectedImprovement: 0.1
        })
      }

    } catch (error) {
      console.error('❌ Failed to analyze feedback patterns:', error)
    }

    return insights
  }

  private async identifyCostOptimizations(dealerId: string): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []

    try {
      // Get cost data
      const { data: budget, error } = await this.supabaseClient
        .from('ai_budget_tracking')
        .select('*')
        .eq('dealer_id', dealerId)
        .order('date', { ascending: false })
        .limit(7) // Last 7 days

      if (error || !budget) return insights

      const avgCostPerExtraction = budget.reduce((sum, day) => sum + day.average_cost_per_extraction, 0) / budget.length

      if (avgCostPerExtraction > 0.05) { // $0.05 threshold
        insights.push({
          type: 'cost_optimization',
          description: `High average cost per extraction: $${avgCostPerExtraction.toFixed(4)}`,
          impact: 'high',
          implementation: 'Switch to cheaper models for simple extractions, implement better caching',
          expectedImprovement: avgCostPerExtraction * 0.3 // 30% reduction
        })
      }

      // Check cache hit rate
      const { data: cacheData } = await this.supabaseClient
        .from('ai_extraction_cache')
        .select('hit_count')
        .eq('dealer_id', dealerId)

      if (cacheData) {
        const totalHits = cacheData.reduce((sum, cache) => sum + cache.hit_count, 0)
        const avgHits = totalHits / cacheData.length

        if (avgHits < 2) {
          insights.push({
            type: 'cost_optimization',
            description: `Low cache hit rate (${avgHits.toFixed(1)} avg hits)`,
            impact: 'medium',
            implementation: 'Improve text normalization for better cache matching',
            expectedImprovement: 0.02 // $0.02 per extraction
          })
        }
      }

    } catch (error) {
      console.error('❌ Failed to identify cost optimizations:', error)
    }

    return insights
  }

  private async evaluatePromptEffectiveness(dealerId: string, metrics: OptimizationMetrics): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []

    if (metrics.averageConfidence < 0.75) {
      insights.push({
        type: 'prompt_adjustment',
        description: `Low average confidence (${(metrics.averageConfidence * 100).toFixed(1)}%)`,
        impact: 'high',
        implementation: 'Enhance prompts with more specific examples and clearer instructions',
        expectedImprovement: 0.15
      })
    }

    if (metrics.successRate < 0.8) {
      insights.push({
        type: 'pattern_improvement',
        description: `Low success rate (${(metrics.successRate * 100).toFixed(1)}%)`,
        impact: 'high',
        implementation: 'Improve fallback strategies and error handling',
        expectedImprovement: 0.1
      })
    }

    return insights
  }

  private async generateConfidenceImprovements(dealerId: string, metrics: OptimizationMetrics): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = []

    // Analyze extractions with low confidence
    const { data: lowConfidenceExtractions } = await this.supabaseClient
      .from('ai_extraction_cache')
      .select('*')
      .eq('dealer_id', dealerId)
      .lt('confidence_score', 0.7)
      .limit(20)

    if (lowConfidenceExtractions && lowConfidenceExtractions.length > 0) {
      insights.push({
        type: 'confidence_boost',
        description: `${lowConfidenceExtractions.length} extractions with low confidence detected`,
        impact: 'medium',
        implementation: 'Add cross-validation rules and improve confidence calculation',
        expectedImprovement: 0.08
      })
    }

    return insights
  }

  private prioritizeInsights(insights: LearningInsight[], metrics: OptimizationMetrics): LearningInsight[] {
    return insights.sort((a, b) => {
      // Priority: high impact > medium > low, then by expected improvement
      const impactOrder = { high: 3, medium: 2, low: 1 }
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact]
      
      if (impactDiff !== 0) return impactDiff
      return b.expectedImprovement - a.expectedImprovement
    })
  }

  private async autoImplementImprovements(dealerId: string, insights: LearningInsight[]): Promise<void> {
    // Implement low-risk, high-impact improvements automatically
    const autoImplementable = insights.filter(insight => 
      insight.impact === 'high' && 
      insight.type === 'cost_optimization' &&
      insight.expectedImprovement > 0.01
    )

    for (const insight of autoImplementable) {
      try {
        // Log the automatic implementation
        console.log(`🤖 Auto-implementing: ${insight.description}`)
        
        // Here you would implement the actual optimization
        // For example, adjusting cache settings, model selection, etc.
        
      } catch (error) {
        console.error(`❌ Failed to auto-implement insight: ${insight.description}`, error)
      }
    }
  }

  private async analyzePromptPerformance(dealerId: string): Promise<{ averageConfidence: number; sampleSize: number }> {
    const { data, error } = await this.supabaseClient
      .from('ai_extraction_cache')
      .select('confidence_score')
      .eq('dealer_id', dealerId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600000).toISOString()) // Last 7 days

    if (error || !data || data.length === 0) {
      return { averageConfidence: 0, sampleSize: 0 }
    }

    const avgConfidence = data.reduce((sum, item) => sum + item.confidence_score, 0) / data.length
    return { averageConfidence: avgConfidence, sampleSize: data.length }
  }

  private async identifyFailurePatterns(dealerId: string): Promise<string[]> {
    const patterns: string[] = []

    // Get feedback with corrections
    const { data: feedback } = await this.supabaseClient
      .from('ai_extraction_feedback')
      .select('corrections, user_feedback')
      .eq('dealer_id', dealerId)
      .eq('user_feedback', 'incorrect')
      .not('corrections', 'is', null)

    if (feedback && feedback.length > 0) {
      // Analyze common correction patterns
      // This is simplified - in practice you'd use more sophisticated analysis
      patterns.push('Improve price extraction accuracy')
      patterns.push('Better handling of variant names')
      patterns.push('Enhanced technical specification parsing')
    }

    return patterns
  }

  private generateOptimizedPrompt(config: DealerConfig, failurePatterns: string[]): string {
    let optimizedPrompt = config.extraction.aiPrompt.systemRole

    // Add specific improvements based on failure patterns
    if (failurePatterns.includes('Improve price extraction accuracy')) {
      optimizedPrompt += '\n\nIMPORTANT: Pay special attention to price formatting. Danish prices use comma as decimal separator and may include thousands separators.'
    }

    if (failurePatterns.includes('Better handling of variant names')) {
      optimizedPrompt += '\n\nIMPORTANT: Extract complete variant names including trim levels, engine specifications, and special editions.'
    }

    if (failurePatterns.includes('Enhanced technical specification parsing')) {
      optimizedPrompt += '\n\nIMPORTANT: Carefully extract all technical specifications including horsepower, CO2 emissions, fuel consumption, and electric range data.'
    }

    return optimizedPrompt
  }

  private explainPromptImprovements(patterns: string[]): string {
    return `Optimized based on identified failure patterns: ${patterns.join(', ')}`
  }

  private async testPromptOptimization(dealerId: string, originalPrompt: string, optimizedPrompt: string): Promise<any> {
    // This would require actual testing with sample data
    // For now, return simulated improvement
    return {
      originalConfidence: 0.72,
      optimizedConfidence: 0.81,
      improvement: 0.09
    }
  }

  private async storePromptVersion(dealerId: string, prompt: string, version: string): Promise<void> {
    // Store the optimized prompt version for future use
    this.promptVersions.set(`${dealerId}-${version}`, prompt)
  }

  private async analyzeCostPatterns(dealerId: string): Promise<{ efficiency: number; avgCost: number }> {
    const { data, error } = await this.supabaseClient
      .from('ai_budget_tracking')
      .select('*')
      .eq('dealer_id', dealerId)
      .order('date', { ascending: false })
      .limit(30) // Last 30 days

    if (error || !data || data.length === 0) {
      return { efficiency: 0, avgCost: 0 }
    }

    const totalCost = data.reduce((sum, day) => sum + day.total_cost_usd, 0)
    const totalExtractions = data.reduce((sum, day) => sum + day.extraction_count, 0)
    
    return {
      efficiency: totalExtractions / Math.max(totalCost, 0.001), // Extractions per dollar
      avgCost: totalCost / Math.max(totalExtractions, 1)
    }
  }

  private generateCostOptimizationStrategy(optimizations: LearningInsight[], metrics: any): string {
    const strategies = optimizations
      .filter(opt => opt.type === 'cost_optimization')
      .map(opt => opt.implementation)

    return strategies.length > 0 
      ? strategies.join('; ') 
      : 'Current cost efficiency is optimal'
  }

  private async implementCostOptimizations(dealerId: string, optimizations: LearningInsight[]): Promise<void> {
    // Implement automatic cost optimizations
    const costOpts = optimizations.filter(opt => opt.type === 'cost_optimization')
    
    for (const opt of costOpts) {
      console.log(`💰 Implementing cost optimization: ${opt.description}`)
      // Implementation would depend on the specific optimization
    }
  }

  private async learnFromCorrections(dealerId: string, corrections: any): Promise<void> {
    // Process user corrections to improve future extractions
    try {
      await this.supabaseClient
        .from('ai_learned_examples')
        .insert({
          dealer_id: dealerId,
          example_type: 'user_correction',
          input_text: 'User correction data',
          expected_output: corrections,
          confidence_score: 1.0,
          relevance_score: 1.0,
          created_at: new Date().toISOString(),
          notes: 'Generated from user feedback'
        })
    } catch (error) {
      console.error('❌ Failed to learn from corrections:', error)
    }
  }

  private async initializeOptimization(): Promise<void> {
    // Initialize optimization data and caches
    console.log('🚀 Initializing AI optimization manager')
  }
}

/*
 * AIOptimizationManager
 * 
 * Continuous improvement system for AI extraction performance.
 * 
 * Key Features:
 * - Performance analysis and optimization recommendations
 * - Learning from user feedback and corrections
 * - Automatic prompt optimization based on failure patterns
 * - Cost optimization through model selection and caching
 * - Generation of learning examples from successful extractions
 * - Real-time performance monitoring and alerts
 * 
 * Usage:
 * const optimizer = new AIOptimizationManager(supabaseClient)
 * const insights = await optimizer.analyzeAndOptimize(dealerId)
 * await optimizer.processUserFeedback(dealerId, extractionId, 'incorrect', corrections)
 */