import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Zap, 
  FileText, 
  RefreshCw,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { useJobProgress, useBatchProgress } from '@/hooks/useJobProgress'
import { formatDistanceToNow } from 'date-fns'
import { da } from 'date-fns/locale'

interface JobProgressMonitorProps {
  jobId?: string
  batchId?: string
  showBatchView?: boolean
  className?: string
}

/**
 * Real-time monitoring component for server-side PDF processing jobs
 * 
 * Features:
 * - Live progress tracking with polling
 * - Job statistics and performance metrics
 * - Error handling and retry functionality
 * - Batch-level progress aggregation
 * - AI cost tracking
 */
export const JobProgressMonitor: React.FC<JobProgressMonitorProps> = ({
  jobId,
  batchId,
  showBatchView = false,
  className = ''
}) => {
  // Single job monitoring
  const { 
    job, 
    isPolling, 
    error: jobError, 
    startPolling, 
    stopPolling, 
    refreshJob 
  } = useJobProgress(jobId, {
    autoStart: !!jobId,
    pollInterval: 1500, // Poll every 1.5 seconds for real-time feel
    maxPollingTime: 600000 // 10 minutes max
  })

  // Batch-level monitoring
  const {
    jobs: batchJobs,
    isLoading: batchLoading,
    error: batchError,
    aggregateProgress,
    overallStatus,
    refreshJobs
  } = useBatchProgress(showBatchView ? batchId : undefined)

  // Determine what to display
  const displayJob = job
  const displayError = jobError || batchError
  const displayProgress = showBatchView ? aggregateProgress : (job?.progress || 0)
  const displayStatus = showBatchView ? overallStatus : (job?.status || 'queued')

  // Format functions
  const formatDuration = (startTime?: string | null, endTime?: string | null) => {
    if (!startTime) return '–'
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.round(duration / 60)}m`
    return `${Math.round(duration / 3600)}h`
  }

  const formatRelativeTime = (timestamp?: string | null) => {
    if (!timestamp) return '–'
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: da 
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'queued': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'failed': return <AlertCircle className="w-4 h-4" />
      case 'processing': return <Zap className="w-4 h-4" />
      case 'queued': return <Clock className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {showBatchView ? 'Batch Processing Status' : 'Job Processing Status'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(displayStatus)}>
                {getStatusIcon(displayStatus)}
                <span className="ml-1 capitalize">{displayStatus}</span>
              </Badge>
              {(isPolling || batchLoading) && (
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{displayProgress}%</span>
            </div>
            <Progress value={displayProgress} className="h-2" />
            {displayJob?.currentStep && (
              <p className="text-sm text-muted-foreground">
                {displayJob.currentStep}
              </p>
            )}
          </div>

          {/* Error Display */}
          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          {/* Job Statistics Grid */}
          {displayJob && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {formatDuration(displayJob.processingStartTime, displayJob.processingEndTime)}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Items Processed</p>
                <p className="font-medium">{displayJob.itemsProcessed || 0}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Confidence Score</p>
                <p className="font-medium">
                  {displayJob.confidenceScore ? `${(displayJob.confidenceScore * 100).toFixed(1)}%` : '–'}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Extraction Method</p>
                <p className="font-medium capitalize">
                  {displayJob.extractionMethod || '–'}
                </p>
              </div>
            </div>
          )}

          {/* AI Cost Information */}
          {displayJob?.aiCost && displayJob.aiCost > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">AI Usage</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-medium">${displayJob.aiCost.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tokens Used</p>
                  <p className="font-medium">{displayJob.aiTokensUsed?.toLocaleString() || '–'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={showBatchView ? refreshJobs : refreshJob}
              disabled={isPolling || batchLoading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            
            {isPolling && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopPolling}
              >
                Stop Polling
              </Button>
            )}
            
            {!isPolling && jobId && displayStatus === 'processing' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => startPolling(jobId)}
              >
                Start Polling
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch Jobs List (when showing batch view) */}
      {showBatchView && batchJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Individual Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batchJobs.map(batchJob => (
                <div 
                  key={batchJob.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(batchJob.status)}
                    <div>
                      <p className="font-medium text-sm">
                        Job {batchJob.id.substring(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batchJob.currentStep || 'Waiting...'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{batchJob.progress}%</p>
                      {batchJob.processingStartTime && (
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(batchJob.processingStartTime)}
                        </p>
                      )}
                    </div>
                    
                    <Badge className={getStatusColor(batchJob.status)}>
                      {batchJob.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {displayJob?.processingEndTime && displayJob.status === 'completed' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {displayJob.itemsProcessed || 0}
                </p>
                <p className="text-sm text-muted-foreground">Items Processed</p>
              </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {formatDuration(displayJob.processingStartTime, displayJob.processingEndTime)}
                </p>
                <p className="text-sm text-muted-foreground">Total Duration</p>
              </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {displayJob.confidenceScore ? `${(displayJob.confidenceScore * 100).toFixed(0)}%` : '–'}
                </p>
                <p className="text-sm text-muted-foreground">Avg. Confidence</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}