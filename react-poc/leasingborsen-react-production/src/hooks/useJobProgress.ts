import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface JobProgress {
  id: string
  batchId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep: string | null
  extractionMethod?: string | null
  itemsProcessed?: number
  confidenceScore?: number
  aiCost?: number
  aiTokensUsed?: number
  errorMessage?: string | null
  processingStartTime?: string | null
  processingEndTime?: string | null
  estimatedCompletion?: string | null
}

export interface UseJobProgressOptions {
  autoStart?: boolean
  pollInterval?: number
  maxPollingTime?: number
  onCompleted?: (job: JobProgress) => void
  onFailed?: (job: JobProgress) => void
  onProgress?: (job: JobProgress) => void
}

export interface UseJobProgressReturn {
  job: JobProgress | null
  isPolling: boolean
  error: string | null
  startPolling: (jobId: string) => void
  stopPolling: () => void
  refreshJob: () => Promise<void>
}

/**
 * Custom hook for tracking server-side PDF processing job progress
 * 
 * Features:
 * - Real-time polling of processing_jobs table
 * - Automatic progress tracking with configurable intervals
 * - Event callbacks for job state changes
 * - Error handling and timeout management
 * - Manual polling control for advanced use cases
 */
export const useJobProgress = (
  jobId?: string,
  options: UseJobProgressOptions = {}
): UseJobProgressReturn => {
  const {
    autoStart = true,
    pollInterval = 2000, // Poll every 2 seconds
    maxPollingTime = 300000, // Maximum 5 minutes
    onCompleted,
    onFailed,
    onProgress
  } = options

  const [job, setJob] = useState<JobProgress | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollTimeoutId, setPollTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null)

  // Fetch job data from database
  const fetchJob = useCallback(async (targetJobId: string): Promise<JobProgress | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('processing_jobs')
        .select(`
          id,
          batch_id,
          status,
          progress,
          current_step,
          extraction_method,
          processed_items,
          ai_cost,
          ai_tokens_used,
          error_message,
          started_at,
          completed_at
        `)
        .eq('id', targetJobId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch job: ${fetchError.message}`)
      }

      if (!data) {
        throw new Error('Job not found')
      }

      return {
        id: data.id,
        batchId: data.batch_id,
        status: data.status,
        progress: data.progress || 0,
        currentStep: data.current_step,
        extractionMethod: data.extraction_method,
        itemsProcessed: data.processed_items,
        confidenceScore: undefined, // Not available in current table
        aiCost: data.ai_cost,
        aiTokensUsed: data.ai_tokens_used,
        errorMessage: data.error_message,
        processingStartTime: data.started_at,
        processingEndTime: data.completed_at,
        estimatedCompletion: undefined // Not available in current table
      }
    } catch (err) {
      console.error('Error fetching job:', err)
      throw err
    }
  }, [])

  // Refresh job data manually
  const refreshJob = useCallback(async () => {
    if (!job?.id) return
    
    try {
      setError(null)
      const updatedJob = await fetchJob(job.id)
      if (updatedJob) {
        setJob(updatedJob)
        onProgress?.(updatedJob)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh job'
      setError(errorMessage)
    }
  }, [job?.id, fetchJob, onProgress])

  // Start polling for job updates
  const startPolling = useCallback((targetJobId: string) => {
    // Clear any existing polling
    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId)
      setPollTimeoutId(null)
    }

    setIsPolling(true)
    setError(null)
    setPollingStartTime(Date.now())

    const poll = async () => {
      try {
        const updatedJob = await fetchJob(targetJobId)
        
        if (!updatedJob) {
          throw new Error('Job not found during polling')
        }

        setJob(updatedJob)
        onProgress?.(updatedJob)

        // Check if job is complete
        if (updatedJob.status === 'completed') {
          console.log('✅ Job completed successfully:', updatedJob.id)
          setIsPolling(false)
          onCompleted?.(updatedJob)
          return // Stop polling
        }

        if (updatedJob.status === 'failed') {
          console.error('❌ Job failed:', updatedJob.errorMessage)
          setIsPolling(false)
          const errorMessage = updatedJob.errorMessage || 'Job processing failed'
          setError(errorMessage)
          onFailed?.(updatedJob)
          return // Stop polling
        }

        // Check for timeout
        if (pollingStartTime && Date.now() - pollingStartTime > maxPollingTime) {
          console.warn('⏰ Job polling timeout reached')
          setIsPolling(false)
          setError('Job processing timeout - took too long to complete')
          return // Stop polling
        }

        // Continue polling if still processing
        if (updatedJob.status === 'processing' || updatedJob.status === 'queued') {
          const timeoutId = setTimeout(poll, pollInterval)
          setPollTimeoutId(timeoutId)
        } else {
          // Unknown status, stop polling
          setIsPolling(false)
          setError(`Unknown job status: ${updatedJob.status}`)
        }

      } catch (err) {
        console.error('Error during job polling:', err)
        setIsPolling(false)
        const errorMessage = err instanceof Error ? err.message : 'Failed to poll job status'
        setError(errorMessage)
      }
    }

    // Start polling immediately
    poll()
  }, [fetchJob, pollInterval, maxPollingTime, pollingStartTime, pollTimeoutId, onProgress, onCompleted, onFailed])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId)
      setPollTimeoutId(null)
    }
    setIsPolling(false)
    setPollingStartTime(null)
  }, [pollTimeoutId])

  // Auto-start polling when jobId is provided
  useEffect(() => {
    if (jobId && autoStart) {
      startPolling(jobId)
    }

    return () => {
      stopPolling()
    }
  }, [jobId, autoStart, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    job,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refreshJob
  }
}

/**
 * Hook for tracking batch-level progress (aggregates multiple jobs)
 * Useful for monitoring overall batch processing status
 */
export const useBatchProgress = (batchId?: string) => {
  const [jobs, setJobs] = useState<JobProgress[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBatchJobs = useCallback(async (targetBatchId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('processing_jobs')
        .select(`
          id,
          batch_id,
          status,
          progress,
          current_step,
          extraction_method,
          processed_items,
          ai_cost,
          ai_tokens_used,
          error_message,
          started_at,
          completed_at
        `)
        .eq('batch_id', targetBatchId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        throw new Error(`Failed to fetch batch jobs: ${fetchError.message}`)
      }

      const jobsData: JobProgress[] = (data || []).map(job => ({
        id: job.id,
        batchId: job.batch_id,
        status: job.status,
        progress: job.progress || 0,
        currentStep: job.current_step,
        extractionMethod: job.extraction_method,
        itemsProcessed: job.processed_items,
        confidenceScore: undefined, // Not available in current table
        aiCost: job.ai_cost,
        aiTokensUsed: job.ai_tokens_used,
        errorMessage: job.error_message,
        processingStartTime: job.started_at,
        processingEndTime: job.completed_at,
        estimatedCompletion: undefined // Not available in current table
      }))

      setJobs(jobsData)
    } catch (err) {
      console.error('Error fetching batch jobs:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch jobs'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (batchId) {
      fetchBatchJobs(batchId)
    }
  }, [batchId, fetchBatchJobs])

  // Calculate aggregate progress
  const aggregateProgress = jobs.length > 0 
    ? Math.round(jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length)
    : 0

  // Determine overall status
  const overallStatus = jobs.length === 0 
    ? 'queued' 
    : jobs.every(job => job.status === 'completed') 
      ? 'completed'
      : jobs.some(job => job.status === 'failed')
        ? 'failed'
        : 'processing'

  return {
    jobs,
    isLoading,
    error,
    aggregateProgress,
    overallStatus,
    refreshJobs: () => batchId && fetchBatchJobs(batchId)
  }
}