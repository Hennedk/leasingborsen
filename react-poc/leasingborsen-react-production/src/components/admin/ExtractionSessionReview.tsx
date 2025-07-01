import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, XCircle, Clock, GitCommit,
  Plus, Edit, Trash, Settings, ChevronDown, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  useListingComparison, 
  useSessionChanges,
  type ListingChange 
} from '@/hooks/useListingComparison'
import { toast } from 'sonner'
import { QuickExtractionCheck } from './QuickExtractionCheck'

interface ExtractionSessionReviewProps {
  sessionId: string
  onBack?: () => void
}

export const ExtractionSessionReview: React.FC<ExtractionSessionReviewProps> = ({
  sessionId,
  onBack
}) => {
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set())
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('pending')

  const {
    updateChangeStatus,
    bulkUpdateChanges,
    applyChanges,
    applySelectedChanges,
    isApplyingChanges,
    isApplyingSelectedChanges
  } = useListingComparison()

  const { data: changes = [], isLoading } = useSessionChanges(sessionId)

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

  const formatPrice = (price?: number): string => {
    if (!price) return '–'
    return `${price.toLocaleString('da-DK')} kr`
  }

  const toggleChangeSelection = (changeId: string) => {
    const newSelected = new Set(selectedChanges)
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId)
    } else {
      newSelected.add(changeId)
    }
    setSelectedChanges(newSelected)
  }

  const toggleChangeExpansion = (changeId: string) => {
    const newExpanded = new Set(expandedChanges)
    if (newExpanded.has(changeId)) {
      newExpanded.delete(changeId)
    } else {
      newExpanded.add(changeId)
    }
    setExpandedChanges(newExpanded)
  }

  const selectAllByStatus = (status: 'pending') => {
    const statusChanges = changes
      .filter(change => change.change_status === status)
      .map(change => change.id)
    setSelectedChanges(new Set(statusChanges))
  }

  const selectAllByType = (type: 'create' | 'update' | 'delete') => {
    const typeChanges = changes
      .filter(change => change.change_type === type && change.change_status === 'pending')
      .map(change => change.id)
    setSelectedChanges(new Set([...selectedChanges, ...typeChanges]))
  }

  const handleBulkApprove = () => {
    if (selectedChanges.size === 0) {
      toast.error('Vælg venligst mindst én ændring')
      return
    }

    bulkUpdateChanges({
      changeIds: Array.from(selectedChanges),
      status: 'approved'
    })
    setSelectedChanges(new Set())
  }

  const handleBulkReject = () => {
    if (selectedChanges.size === 0) {
      toast.error('Vælg venligst mindst én ændring')
      return
    }

    bulkUpdateChanges({
      changeIds: Array.from(selectedChanges),
      status: 'rejected'
    })
    setSelectedChanges(new Set())
  }

  const handleApplyApprovedChanges = () => {
    const approvedCount = changes.filter(c => c.change_status === 'approved').length
    
    if (approvedCount === 0) {
      toast.error('Ingen godkendte ændringer at anvende')
      return
    }

    if (confirm(`Er du sikker på at du vil anvende ${approvedCount} godkendte ændringer? Dette kan ikke fortrydes.`)) {
      applyChanges(sessionId)
    }
  }

  // MVP streamlined workflow: Apply selected changes and discard non-selected
  const handleApplySelected = () => {
    if (selectedChanges.size === 0) {
      toast.error('Vælg mindst én ændring at anvende')
      return
    }
    
    const nonSelectedCount = changes.filter(c => 
      c.change_status === 'pending' && !selectedChanges.has(c.id)
    ).length
    
    const message = nonSelectedCount > 0 
      ? `Anvend ${selectedChanges.size} valgte ændringer og forkast ${nonSelectedCount} ikke-valgte? Dette kan ikke fortrydes.`
      : `Anvend ${selectedChanges.size} valgte ændringer? Dette kan ikke fortrydes.`
    
    if (confirm(message)) {
      applySelectedChanges({
        sessionId,
        selectedChangeIds: Array.from(selectedChanges)
      })
      setSelectedChanges(new Set()) // Clear selection after applying
    }
  }

  const renderChangeDetails = (change: ListingChange) => {
    const extractedData = change.extracted_data || {}
    
    return (
      <div className="space-y-3">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Bil:</span>{' '}
            {extractedData.make} {extractedData.model} {extractedData.variant}
          </div>
          <div>
            <span className="font-medium">Confidence:</span>{' '}
            {change.confidence_score ? `${Math.round(change.confidence_score * 100)}%` : '–'}
          </div>
        </div>

        {/* Field Changes */}
        {change.field_changes && Object.keys(change.field_changes).length > 0 && (
          <div>
            <h5 className="font-medium text-sm mb-2">Ændringer:</h5>
            <div className="space-y-2">
              {Object.entries(change.field_changes).map(([field, fieldChange]) => {
                // Special handling for offers_replacement
                if (field === 'offers_replacement') {
                  return (
                    <div key={field} className="border-l-4 border-orange-400 pl-3 py-2 bg-orange-50 rounded-r">
                      <div className="font-medium text-sm text-orange-800 mb-1">
                        🔄 Alle tilbud erstattes
                      </div>
                      <div className="text-xs text-orange-700">
                        <div className="mb-1">
                          <span className="font-medium">Før:</span> {String(fieldChange.old)}
                        </div>
                        <div>
                          <span className="font-medium">Efter:</span> {String(fieldChange.new)}
                        </div>
                      </div>
                    </div>
                  )
                }

                // Special handling for offers_summary
                if (field === 'offers_summary') {
                  return (
                    <div key={field} className="text-xs text-muted-foreground italic">
                      {String(fieldChange.old)} → {String(fieldChange.new)}
                    </div>
                  )
                }

                // Default field change display
                return (
                  <div key={field} className="flex items-center gap-2 text-sm">
                    <span className="font-medium min-w-[100px]">{field}:</span>
                    <span className="text-red-600 line-through">
                      {String(fieldChange.old) || '–'}
                    </span>
                    <span>→</span>
                    <span className="text-green-600">
                      {String(fieldChange.new) || '–'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Offers */}
        {extractedData.offers && Array.isArray(extractedData.offers) && (
          <div>
            <h5 className="font-medium text-sm mb-2">Tilbud ({extractedData.offers.length}):</h5>
            <div className="space-y-1">
              {extractedData.offers.slice(0, 3).map((offer: any, idx: number) => (
                <div key={idx} className="text-sm flex items-center gap-4">
                  <span className="font-medium">{formatPrice(offer.monthly_price)}/md</span>
                  {offer.period_months && <span>{offer.period_months} mdr</span>}
                  {offer.mileage_per_year && <span>{offer.mileage_per_year.toLocaleString('da-DK')} km/år</span>}
                </div>
              ))}
              {extractedData.offers.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{extractedData.offers.length - 3} flere tilbud
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Notes */}
        <div>
          <label className="font-medium text-sm">Review Notes:</label>
          <Textarea
            value={reviewNotes[change.id] || change.review_notes || ''}
            onChange={(e) => setReviewNotes({ ...reviewNotes, [change.id]: e.target.value })}
            placeholder="Tilføj noter til denne ændring..."
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Individual Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => updateChangeStatus({ 
              changeId: change.id, 
              status: 'approved',
              reviewNotes: reviewNotes[change.id]
            })}
            disabled={change.change_status !== 'pending'}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Godkend
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => updateChangeStatus({ 
              changeId: change.id, 
              status: 'rejected',
              reviewNotes: reviewNotes[change.id]
            })}
            disabled={change.change_status !== 'pending'}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Afvis
          </Button>
        </div>
      </div>
    )
  }

  const filterChangesByTab = (tabValue: string) => {
    switch (tabValue) {
      case 'pending':
        return changes.filter(c => c.change_status === 'pending')
      case 'approved':
        return changes.filter(c => c.change_status === 'approved')
      case 'rejected':
        return changes.filter(c => c.change_status === 'rejected')
      case 'applied':
        return changes.filter(c => c.change_status === 'applied')
      case 'discarded':
        return changes.filter(c => c.change_status === 'discarded')
      case 'create':
        return changes.filter(c => c.change_type === 'create')
      case 'update':
        return changes.filter(c => c.change_type === 'update')
      case 'delete':
        return changes.filter(c => c.change_type === 'delete')
      default:
        return changes
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Indlæser session...</p>
        </div>
      </div>
    )
  }

  const pendingCount = changes.filter(c => c.change_status === 'pending').length
  const approvedCount = changes.filter(c => c.change_status === 'approved').length
  const rejectedCount = changes.filter(c => c.change_status === 'rejected').length
  const appliedCount = changes.filter(c => c.change_status === 'applied').length
  const discardedCount = changes.filter(c => c.change_status === 'discarded').length

  const createCount = changes.filter(c => c.change_type === 'create').length
  const updateCount = changes.filter(c => c.change_type === 'update').length
  const deleteCount = changes.filter(c => c.change_type === 'delete').length

  return (
    <div className="space-y-6">
      {/* Quick Check Component */}
      <QuickExtractionCheck sessionId={sessionId} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              ← Tilbage
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Extraction Session Review</h1>
            <p className="text-muted-foreground">
              Gennemgå og godkend ændringer før de anvendes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* MVP Streamlined workflow button */}
          <Button
            onClick={handleApplySelected}
            disabled={selectedChanges.size === 0 || isApplyingSelectedChanges}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isApplyingSelectedChanges ? (
              <>
                <Settings className="h-4 w-4 animate-spin mr-2" />
                Anvender...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Anvend valgte ({selectedChanges.size})
              </>
            )}
          </Button>
          
          {/* Legacy workflow button (for comparison) */}
          <Button
            onClick={handleApplyApprovedChanges}
            disabled={approvedCount === 0 || isApplyingChanges}
            className="bg-green-600 hover:bg-green-700"
          >
            {isApplyingChanges ? (
              <>
                <Settings className="h-4 w-4 animate-spin mr-2" />
                Anvender...
              </>
            ) : (
              <>
                <GitCommit className="h-4 w-4 mr-2" />
                Anvend godkendte ({approvedCount})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
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
            <div className="text-2xl font-bold">{appliedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {pendingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllByStatus('pending')}
              >
                Vælg alle pending
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllByType('create')}
              >
                Vælg alle nye ({createCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllByType('update')}
              >
                Vælg alle opdateringer ({updateCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChanges(new Set())}
              >
                Fravælg alle
              </Button>
              
              <div className="ml-auto flex gap-2">
                <Button
                  onClick={handleBulkApprove}
                  disabled={selectedChanges.size === 0}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Godkend valgte ({selectedChanges.size})
                </Button>
                <Button
                  onClick={handleBulkReject}
                  disabled={selectedChanges.size === 0}
                  variant="destructive"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Afvis valgte ({selectedChanges.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changes List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="pending" className="text-yellow-600">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-green-600">
            Approved ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-red-600">
            Rejected ({rejectedCount})
          </TabsTrigger>
          <TabsTrigger value="applied" className="text-blue-600">
            Applied ({appliedCount})
          </TabsTrigger>
          <TabsTrigger value="discarded" className="text-gray-600">
            Discarded ({discardedCount})
          </TabsTrigger>
          <TabsTrigger value="create">
            Creates ({createCount})
          </TabsTrigger>
          <TabsTrigger value="update">
            Updates ({updateCount})
          </TabsTrigger>
          <TabsTrigger value="delete">
            Deletes ({deleteCount})
          </TabsTrigger>
        </TabsList>

        {(['pending', 'approved', 'rejected', 'applied', 'discarded', 'create', 'update', 'delete'] as const).map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tabValue === 'pending' && <TableHead className="w-12"></TableHead>}
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Bil</TableHead>
                      <TableHead>Ændringer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterChangesByTab(tabValue).map((change) => {
                      const isSelected = selectedChanges.has(change.id)
                      const isExpanded = expandedChanges.has(change.id)
                      const extractedData = change.extracted_data || {}
                      
                      return (
                        <React.Fragment key={change.id}>
                          <TableRow 
                            className={cn(
                              "hover:bg-muted/50 cursor-pointer",
                              isSelected && "bg-muted/30"
                            )}
                            onClick={() => toggleChangeExpansion(change.id)}
                          >
                            {tabValue === 'pending' && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleChangeSelection(change.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                change.change_type === 'create' ? 'default' :
                                change.change_type === 'update' ? 'secondary' :
                                change.change_type === 'delete' ? 'destructive' :
                                'outline'
                              }>
                                {change.change_type === 'create' && <Plus className="h-3 w-3 mr-1" />}
                                {change.change_type === 'update' && <Edit className="h-3 w-3 mr-1" />}
                                {change.change_type === 'delete' && <Trash className="h-3 w-3 mr-1" />}
                                {change.change_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {extractedData.make} {extractedData.model} {extractedData.variant}
                                </div>
                                {extractedData.engine_info && (
                                  <div className="text-sm text-muted-foreground">
                                    {extractedData.engine_info}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {change.change_summary || `${change.change_type} operation`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                change.change_status === 'pending' ? 'outline' :
                                change.change_status === 'approved' ? 'default' :
                                change.change_status === 'rejected' ? 'destructive' :
                                'secondary'
                              }>
                                {change.change_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(change.reviewed_at)}
                            </TableCell>
                          </TableRow>
                          
                          {isExpanded && (
                            <TableRow>
                              <TableCell 
                                colSpan={tabValue === 'pending' ? 7 : 6} 
                                className="bg-muted/30 p-6"
                              >
                                {renderChangeDetails(change)}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}