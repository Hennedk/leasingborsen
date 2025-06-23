import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Search, 
  RefreshCw,
  DollarSign,
  Activity,
  // Brain,
  // Settings
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { JobProgressMonitor } from '@/components/admin/processing/JobProgressMonitor'
// import { IntelligenceDashboard } from '@/components/admin/processing/IntelligenceDashboard'
// import { PatternLearningManager } from '@/components/admin/processing/PatternLearningManager'

interface ProcessingJob {
  id: string
  batch_id: string
  dealer_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  current_step: string | null
  extraction_method: string | null
  items_processed: number
  confidence_score: number | null
  ai_cost: number
  ai_tokens_used: number | null
  error_message: string | null
  processing_start_time: string | null
  processing_end_time: string | null
  created_at: string
  // Intelligence fields
  patterns_discovered?: number
  learning_enabled?: boolean
  format_changes_detected?: boolean
}

export const ProcessingJobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('jobs')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [aiSpending, setAiSpending] = useState<number>(0)

  // Fetch jobs from database
  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('processing_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch jobs: ${fetchError.message}`)
      }

      setJobs(data || [])
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
    } finally {
      setLoading(false)
    }
  }

  // Fetch AI spending
  const fetchAiSpending = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_month_ai_spending')
      if (error) throw error
      setAiSpending(data || 0)
    } catch (error) {
      console.error('Failed to fetch AI spending:', error)
    }
  }

  // Load data on mount and set up auto-refresh
  useEffect(() => {
    fetchJobs()
    fetchAiSpending()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchJobs()
      fetchAiSpending()
    }, 30000)

    return () => clearInterval(interval)
  }, [statusFilter])

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(job => 
    job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.dealer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.current_step && job.current_step.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate statistics
  const stats = {
    total: jobs.length,
    queued: jobs.filter(j => j.status === 'queued').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    totalCost: jobs.reduce((sum, j) => sum + (j.ai_cost || 0), 0),
    totalTokens: jobs.reduce((sum, j) => sum + (j.ai_tokens_used || 0), 0)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'processing': return <Zap className="w-4 h-4 text-blue-600" />
      case 'queued': return <Clock className="w-4 h-4 text-yellow-600" />
      default: return <Activity className="w-4 h-4 text-gray-600" />
    }
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

  const formatDuration = (startTime?: string | null, endTime?: string | null) => {
    if (!startTime) return '–'
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.round(duration / 60)}m`
    return `${Math.round(duration / 3600)}h`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Processing Jobs</h1>
          <p className="text-muted-foreground">
            Monitor server-side PDF processing jobs and performance
          </p>
        </div>
        <Button onClick={fetchJobs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Queued</p>
                <p className="text-2xl font-bold">{stats.queued}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">AI Cost</p>
                <p className="text-lg font-bold">${aiSpending.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Details Monitor */}
      {selectedJobId && (
        <JobProgressMonitor 
          jobId={selectedJobId} 
          className="border rounded-lg p-4 bg-muted/30"
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Processing Jobs</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence Dashboard</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Management</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search jobs by ID, batch, dealer, or step..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Jobs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>AI Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading jobs...
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map(job => (
                    <TableRow 
                      key={job.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedJobId === job.id ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                    >
                      <TableCell>
                        <code className="text-xs">{job.id.substring(0, 8)}</code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(job.status)}>
                          {getStatusIcon(job.status)}
                          <span className="ml-1">{job.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{job.progress}%</span>
                          {job.status === 'processing' && (
                            <div className="w-12 h-2 bg-muted rounded-full">
                              <div 
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{job.dealer_id}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {job.current_step || '–'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatDuration(job.processing_start_time, job.processing_end_time)}
                      </TableCell>
                      <TableCell>{job.items_processed || 0}</TableCell>
                      <TableCell>
                        {job.ai_cost > 0 ? `$${job.ai_cost.toFixed(4)}` : '–'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedJobId(selectedJobId === job.id ? null : job.id)
                          }}
                        >
                          {selectedJobId === job.id ? 'Hide' : 'Monitor'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="intelligence">
      <div className="text-center py-8 text-muted-foreground">
        Intelligence Dashboard temporarily disabled for testing
      </div>
    </TabsContent>

    <TabsContent value="patterns">
      <div className="text-center py-8 text-muted-foreground">
        Pattern Learning Manager temporarily disabled for testing
      </div>
    </TabsContent>
  </Tabs>
    </div>
  )
}