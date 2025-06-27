import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  GitCompare, Eye, Trash, Plus, Edit, 
  Clock, CheckCircle, XCircle, GitCommit, AlertTriangle
} from 'lucide-react'
import { useExtractionSessions } from '@/hooks/useListingComparison'
import { useNavigate } from 'react-router-dom'
import { ExtractionSessionReview } from '@/components/admin/ExtractionSessionReview'

export const AdminExtractionSessions: React.FC = () => {
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const navigate = useNavigate()

  const { data: sessions = [], isLoading, error } = useExtractionSessions(
    selectedSellerId === 'all' ? undefined : selectedSellerId
  )

  // Debug logging
  useEffect(() => {
    console.log('AdminExtractionSessions mounted')
    console.log('Sessions data:', sessions)
    console.log('Loading:', isLoading)
    console.log('Error:', error)
  }, [sessions, isLoading, error])

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '–'
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '–'
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    const diffSecs = Math.round(diffMs / 1000)
    
    if (diffSecs < 60) return `${diffSecs}s`
    if (diffSecs < 3600) return `${Math.round(diffSecs / 60)}m`
    return `${Math.round(diffSecs / 3600)}h`
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchQuery || 
      session.session_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'processing': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'create': return 'default'
      case 'update': return 'secondary'
      default: return 'outline'
    }
  }

  // If a session is selected, show the review component
  if (selectedSessionId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <ExtractionSessionReview 
            sessionId={selectedSessionId}
            onBack={() => setSelectedSessionId(null)}
          />
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span>Loading extraction sessions...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show error if there's an issue loading sessions
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-semibold">Fejl ved indlæsning af extraction sessions</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Der opstod en uventet fejl'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Prøv igen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Extraction Sessions</h1>
            <p className="text-muted-foreground">
              Manage PDF extraction sessions and review changes
            </p>
          </div>
          
          <Button onClick={() => navigate('/admin/pdf-extraction')}>
            <GitCompare className="h-4 w-4 mr-2" />
            New Extraction
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All sellers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sellers</SelectItem>
                  {/* TODO: Add seller options from useReferenceData */}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.filter(s => s.status === 'completed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.filter(s => s.status === 'processing').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.filter(s => s.status === 'failed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitCommit className="h-4 w-4 text-blue-600" />
                Applied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.filter(s => s.applied_at).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Extraction Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => {
                    const hasUnappliedChanges = (session.total_new + session.total_updated + session.total_deleted) > 0 && !session.applied_at
                    
                    return (
                      <TableRow key={session.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{session.session_name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {session.id.slice(0, 8)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeColor(session.extraction_type)}>
                            {session.extraction_type === 'create' && <Plus className="h-3 w-3 mr-1" />}
                            {session.extraction_type === 'update' && <Edit className="h-3 w-3 mr-1" />}
                            {session.extraction_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(session.status)}>
                            {session.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {session.status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                            {session.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {session.total_new > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <Plus className="h-3 w-3 text-green-600" />
                                <span>{session.total_new} new</span>
                              </div>
                            )}
                            {session.total_updated > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <Edit className="h-3 w-3 text-blue-600" />
                                <span>{session.total_updated} updated</span>
                              </div>
                            )}
                            {session.total_deleted > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <Trash className="h-3 w-3 text-red-600" />
                                <span>{session.total_deleted} deleted</span>
                              </div>
                            )}
                            {session.total_unchanged > 0 && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <CheckCircle className="h-3 w-3" />
                                <span>{session.total_unchanged} unchanged</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(session.created_at)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDuration(session.created_at, session.created_at)}
                        </TableCell>
                        <TableCell>
                          {session.applied_at ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span>{formatDate(session.applied_at)}</span>
                            </div>
                          ) : hasUnappliedChanges ? (
                            <div className="flex items-center gap-1 text-sm text-yellow-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Pending</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">–</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSessionId(session.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this session?')) {
                                  // TODO: Implement delete session
                                  console.log('Delete session', session.id)
                                }
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {filteredSessions.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <GitCompare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No extraction sessions found</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating a new PDF extraction session.
              </p>
              <Button onClick={() => navigate('/admin/pdf-extraction')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Session
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default AdminExtractionSessions