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
  Plus, Edit, Trash, Settings, ChevronDown, ChevronRight, PlusCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  useListingComparison, 
  useSessionChanges,
  type ListingChange 
} from '@/hooks/useListingComparison'
import { toast } from 'sonner'
import { QuickExtractionCheck } from './QuickExtractionCheck'
import { useCreateModel } from '@/hooks/mutations/useModelMutations'
import { useMakes } from '@/hooks/useReferenceData'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
  const [sessionData, setSessionData] = useState<any>(null)

  const {
    applySelectedChanges,
    isApplyingSelectedChanges
  } = useListingComparison()

  const { data: changes = [], isLoading } = useSessionChanges(sessionId)
  const createModel = useCreateModel()
  const { data: makes = [] } = useMakes()
  const queryClient = useQueryClient()

  // Fetch session details
  React.useEffect(() => {
    const fetchSessionData = async () => {
      const { data, error } = await supabase
        .from('extraction_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (error) {
        console.error('Error fetching session:', error)
      } else {
        setSessionData(data)
      }
    }
    
    if (sessionId) {
      fetchSessionData()
    }
  }, [sessionId])

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

  const handleCreateModel = async (change: ListingChange) => {
    const extractedData = change.extracted_data || {}
    const makeName = extractedData.make
    const modelName = extractedData.model

    if (!makeName || !modelName) {
      toast.error('Mangler mærke eller model information')
      return
    }

    // Find the make ID
    const make = makes.find(m => m.name.toLowerCase() === makeName.toLowerCase())
    if (!make) {
      toast.error(`Mærket "${makeName}" findes ikke i systemet`)
      return
    }

    try {
      // Create the model
      await createModel.mutateAsync({
        name: modelName,
        make_id: make.id
      })
      
      // Find all changes in this session with the same missing model
      const affectedChanges = changes.filter(c => 
        c.change_type === 'missing_model' && 
        c.extracted_data?.make?.toLowerCase() === makeName.toLowerCase() &&
        c.extracted_data?.model?.toLowerCase() === modelName.toLowerCase()
      )
      
      console.log(`Found ${affectedChanges.length} changes with the same missing model`)
      
      // Update ALL extraction changes with this missing model from 'missing_model' to 'create'
      const updatePromises = affectedChanges.map(async (affectedChange) => {
        const { error } = await supabase
          .from('extraction_listing_changes')
          .update({
            change_type: 'create',
            change_summary: `Ny bil: ${affectedChange.extracted_data.make} ${affectedChange.extracted_data.model} ${affectedChange.extracted_data.variant || ''}`.trim(),
            match_method: 'exact'
          })
          .eq('id', affectedChange.id)
        
        return { id: affectedChange.id, error }
      })
      
      const updateResults = await Promise.all(updatePromises)
      const failedUpdates = updateResults.filter(r => r.error)
      
      if (failedUpdates.length > 0) {
        console.error('Some updates failed:', failedUpdates)
        toast.error(`Model blev tilføjet, men ${failedUpdates.length} ændringer kunne ikke opdateres`)
      } else {
        // Invalidate the queries to refresh the changes and session data
        // The extraction_session_summary view will automatically recalculate stats
        queryClient.invalidateQueries({ queryKey: ['session-changes', sessionId] })
        queryClient.invalidateQueries({ queryKey: ['extraction-sessions'] })
        
        const message = affectedChanges.length > 1 
          ? `Model "${modelName}" blev tilføjet og ${affectedChanges.length} ændringer er nu klar til anvendelse`
          : `Model "${modelName}" blev tilføjet og ændringen er nu klar til anvendelse`
        
        toast.success(message)
      }
    } catch (error) {
      console.error('Error creating model:', error)
    }
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
      .filter(change => change.change_status === status && change.change_type !== 'missing_model')
      .map(change => change.id)
    setSelectedChanges(new Set(statusChanges))
  }

  const selectAllByType = (type: 'create' | 'update' | 'delete') => {
    const typeChanges = changes
      .filter(change => change.change_type === type && change.change_status === 'pending')
      .map(change => change.id)
    setSelectedChanges(new Set([...selectedChanges, ...typeChanges]))
  }

  // Streamlined workflow: Apply selected changes directly

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
    
    // Special handling for missing model items
    if (change.change_type === 'missing_model') {
      return (
        <div className="space-y-3">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Bil:</span>{' '}
              {extractedData.make} {extractedData.model} {extractedData.variant}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className="text-orange-600 font-medium">Model findes ikke i systemet</span>
            </div>
          </div>

          {/* Missing Model Explanation */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-orange-800 mb-2">Model mangler i databasen</h5>
                <p className="text-sm text-orange-700 mb-3">
                  Denne bil kunne ikke oprettes fordi modellen "{extractedData.model}" ikke findes i systemets modeltabel for mærket "{extractedData.make}".
                </p>
                <div className="space-y-3">
                  <div className="text-xs text-orange-600">
                    <strong>Løsning:</strong> Tilføj den manglende model til databasen for at kunne oprette denne bil.
                  </div>
                  {(() => {
                    const sameModelCount = changes.filter(c => 
                      c.change_type === 'missing_model' && 
                      c.extracted_data?.make?.toLowerCase() === extractedData.make?.toLowerCase() &&
                      c.extracted_data?.model?.toLowerCase() === extractedData.model?.toLowerCase()
                    ).length
                    
                    return sameModelCount > 1 && (
                      <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        <strong>Note:</strong> Der er {sameModelCount} biler i denne session med samme manglende model. Alle vil blive opdateret når modellen tilføjes.
                      </div>
                    )
                  })()}
                  <Button
                    size="sm"
                    onClick={() => handleCreateModel(change)}
                    disabled={createModel.isPending}
                    className="w-full sm:w-auto"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {createModel.isPending ? 'Tilføjer model...' : (() => {
                      const sameModelCount = changes.filter(c => 
                        c.change_type === 'missing_model' && 
                        c.extracted_data?.make?.toLowerCase() === extractedData.make?.toLowerCase() &&
                        c.extracted_data?.model?.toLowerCase() === extractedData.model?.toLowerCase()
                      ).length
                      
                      return sameModelCount > 1 
                        ? `Tilføj "${extractedData.model}" til ${extractedData.make} (${sameModelCount} biler)`
                        : `Tilføj "${extractedData.model}" til ${extractedData.make}`
                    })()}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Vehicle Details (for reference) */}
          <div>
            <h5 className="font-medium text-sm mb-2">Ekstraherede biloplysninger (til reference):</h5>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              {extractedData.variant && (
                <div><span className="font-medium">Variant:</span> {extractedData.variant}</div>
              )}
              {extractedData.horsepower && (
                <div><span className="font-medium">Hestekræfter:</span> {extractedData.horsepower} HK</div>
              )}
              {extractedData.fuel_type && (
                <div><span className="font-medium">Brændstof:</span> {extractedData.fuel_type}</div>
              )}
              {extractedData.transmission && (
                <div><span className="font-medium">Transmission:</span> {extractedData.transmission}</div>
              )}
              {extractedData.monthly_price && (
                <div><span className="font-medium">Månedspris:</span> {formatPrice(extractedData.monthly_price)}/md</div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded">
            📝 <strong>Bemærk:</strong> Denne bil kan ikke vælges til anvendelse. Løs først problemet med den manglende model.
          </div>
        </div>
      )
    }
    
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

        {/* Selection Note */}
        <div className="text-sm text-muted-foreground italic">
          💡 Brug checkboxen øverst for at vælge denne ændring til anvendelse
        </div>
      </div>
    )
  }

  const filterChangesByTab = (tabValue: string) => {
    switch (tabValue) {
      case 'pending':
        // Exclude missing_model from pending tab - they have their own tab
        return changes.filter(c => c.change_status === 'pending' && c.change_type !== 'missing_model')
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
      case 'missing_model':
        return changes.filter(c => c.change_type === 'missing_model')
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

  // Count pending items excluding missing_model (which can't be selected)
  const pendingCount = changes.filter(c => c.change_status === 'pending' && c.change_type !== 'missing_model').length
  const approvedCount = changes.filter(c => c.change_status === 'approved').length
  const rejectedCount = changes.filter(c => c.change_status === 'rejected').length
  const appliedCount = changes.filter(c => c.change_status === 'applied').length
  const discardedCount = changes.filter(c => c.change_status === 'discarded').length

  // Count by type
  const createCount = changes.filter(c => c.change_type === 'create').length
  const updateCount = changes.filter(c => c.change_type === 'update').length
  const deleteCount = changes.filter(c => c.change_type === 'delete').length
  const missingModelCount = changes.filter(c => c.change_type === 'missing_model').length

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
            {sessionData && (
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Session ID:</span>{' '}
                  <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                    {sessionId}
                  </code>
                </p>
                {sessionData.session_name && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{sessionData.session_name}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Streamlined workflow: Select and apply directly */}
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-orange-600" />
              Missing Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{missingModelCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Actions */}
      {pendingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vælg ændringer</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vælg de ændringer du vil anvende. Ikke-valgte ændringer bliver forkastet.
            </p>
            {missingModelCount > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ {missingModelCount} biler med manglende modeller kan ikke vælges - se "Missing Models" fanen
              </p>
            )}
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changes List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
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
          <TabsTrigger value="missing_model" className="text-orange-600">
            Missing Models ({missingModelCount})
          </TabsTrigger>
        </TabsList>

        {(['pending', 'approved', 'rejected', 'applied', 'discarded', 'create', 'update', 'delete', 'missing_model'] as const).map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-4">
            {/* Special message for missing_model tab */}
            {tabValue === 'missing_model' && missingModelCount > 0 && (
              <Card className="mb-4 border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Manglende modeller kræver manuel handling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-orange-700 mb-3">
                    Disse biler kunne ikke oprettes fordi deres modeller ikke findes i systemets modeltabel. 
                    For at løse dette skal du:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-orange-700 space-y-1">
                    <li>Tilføje de manglende modeller til databasen</li>
                    <li>Køre ekstraktionen igen for disse biler</li>
                  </ol>
                  <p className="text-xs text-orange-600 mt-3">
                    <strong>Bemærk:</strong> Disse elementer kan ikke vælges eller anvendes før modellerne er oprettet.
                  </p>
                </CardContent>
              </Card>
            )}
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
                                change.change_type === 'missing_model' ? 'outline' :
                                'outline'
                              } className={
                                change.change_type === 'missing_model' ? 'border-orange-600 text-orange-600' : ''
                              }>
                                {change.change_type === 'create' && <Plus className="h-3 w-3 mr-1" />}
                                {change.change_type === 'update' && <Edit className="h-3 w-3 mr-1" />}
                                {change.change_type === 'delete' && <Trash className="h-3 w-3 mr-1" />}
                                {change.change_type === 'missing_model' && <XCircle className="h-3 w-3 mr-1" />}
                                {change.change_type === 'missing_model' ? 'Missing Model' : change.change_type}
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
                              {change.change_type === 'missing_model' 
                                ? `Model "${extractedData.model}" findes ikke i systemet` 
                                : (change.change_summary || `${change.change_type} operation`)
                              }
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