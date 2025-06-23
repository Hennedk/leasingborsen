import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ProgressUpdate {
  progress?: number
  current_step?: string
  status?: string
  extraction_method?: string
  items_processed?: number
  confidence_score?: number
  ai_cost?: number
  ai_tokens_used?: number
  error_message?: string
  processing_end_time?: string
  estimated_completion?: string
  // Dealer detection fields
  dealer_type?: string
  detection_confidence?: number
  detection_method?: string
  fallback_used?: boolean
}

export class ProgressTracker {
  constructor(
    private supabaseClient: SupabaseClient,
    private jobId: string
  ) {}

  async updateProgress(
    progress: number, 
    currentStep: string, 
    additionalData?: ProgressUpdate
  ): Promise<void> {
    try {
      const updateData: ProgressUpdate = {
        progress,
        current_step: currentStep,
        ...additionalData
      }

      // Calculate estimated completion based on progress
      if (progress > 0 && progress < 100 && !additionalData?.estimated_completion) {
        const estimatedMinutesRemaining = this.calculateEstimatedTime(progress)
        updateData.estimated_completion = new Date(
          Date.now() + estimatedMinutesRemaining * 60000
        ).toISOString()
      }

      const { error } = await this.supabaseClient
        .from('processing_jobs')
        .update(updateData)
        .eq('id', this.jobId)

      if (error) {
        console.error(`❌ Failed to update progress for job ${this.jobId}:`, error)
        throw new Error(`Progress update failed: ${error.message}`)
      }

      console.log(`📊 Progress updated: ${progress}% - ${currentStep}`)

    } catch (error) {
      console.error('❌ Progress tracking error:', error)
      // Don't throw - continue processing even if progress update fails
    }
  }

  private calculateEstimatedTime(currentProgress: number): number {
    // Simple estimation based on typical processing stages
    const progressRates = {
      10: 0.5,   // Configuration loading - fast
      25: 1.0,   // PDF text extraction - medium
      50: 2.0,   // Pattern matching - medium-slow
      75: 3.0,   // AI processing - slow
      90: 0.5,   // Result storage - fast
      100: 0     // Complete
    }

    // Find next milestone and estimate time
    for (const [milestone, minutesPerPercent] of Object.entries(progressRates)) {
      const milestoneProgress = parseInt(milestone)
      if (currentProgress < milestoneProgress) {
        const remainingProgress = milestoneProgress - currentProgress
        return remainingProgress * minutesPerPercent
      }
    }

    return 0.5 // Default fallback
  }

  async markAsStarted(): Promise<void> {
    await this.updateProgress(5, 'Processing started', {
      status: 'processing',
      processing_start_time: new Date().toISOString()
    })
  }

  async markAsCompleted(
    method: string, 
    itemsProcessed: number, 
    confidence?: number,
    aiCost?: number,
    aiTokens?: number
  ): Promise<void> {
    await this.updateProgress(100, 'Processing completed successfully', {
      status: 'completed',
      extraction_method: method,
      items_processed: itemsProcessed,
      confidence_score: confidence,
      ai_cost: aiCost || 0,
      ai_tokens_used: aiTokens || 0,
      processing_end_time: new Date().toISOString()
    })
  }

  async markAsFailed(errorMessage: string): Promise<void> {
    await this.updateProgress(0, 'Processing failed', {
      status: 'failed',
      error_message: errorMessage,
      processing_end_time: new Date().toISOString()
    })
  }

  async updateExtractionProgress(
    progress: number,
    method: string,
    itemsFound: number = 0
  ): Promise<void> {
    const stepMessages = {
      cache: 'Checking extraction cache...',
      pattern: 'Applying pattern matching...',
      ai: 'Using AI extraction...',
      hybrid: 'Combining pattern and AI results...'
    }

    const message = stepMessages[method as keyof typeof stepMessages] || 'Processing...'
    const fullMessage = itemsFound > 0 
      ? `${message} (${itemsFound} items found)`
      : message

    await this.updateProgress(progress, fullMessage, {
      extraction_method: method,
      items_processed: itemsFound
    })
  }

  async updateAICost(cost: number, tokens: number): Promise<void> {
    await this.updateProgress(undefined, undefined, {
      ai_cost: cost,
      ai_tokens_used: tokens
    })
  }
}

/*
 * ProgressTracker
 * 
 * Manages real-time progress updates for server-side PDF processing jobs.
 * 
 * Features:
 * - Real-time database updates that trigger client notifications
 * - Intelligent estimated completion time calculation
 * - Method-specific progress messages
 * - Error handling that doesn't interrupt processing
 * - AI cost tracking integration
 * 
 * Usage:
 * const tracker = new ProgressTracker(supabaseClient, jobId)
 * await tracker.updateProgress(25, 'Extracting PDF text...')
 * await tracker.updateExtractionProgress(50, 'pattern', 5)
 * await tracker.markAsCompleted('pattern', 10, 0.87)
 */