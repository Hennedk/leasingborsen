import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle, XCircle, Car, RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight } from 'lucide-react'
import { VWPDFProcessor } from '@/lib/processors/vwPDFProcessor'
import { cn } from '@/lib/utils'

interface BatchItem {
  id: string
  action: 'new' | 'update' | 'delete'
  confidence_score: number
  parsed_data: {
    model: string
    variant: string
    horsepower: number
    is_electric?: boolean
    // Pricing information is stored in pricing_options array
    pricing_options?: Array<{
      monthly_price: number
      mileage_per_year: number
      period_months: number
      deposit?: number
    }>
    // Fallback fields for mock data compatibility
    monthly_price?: number
    mileage_per_year?: number
    period_months?: number
  }
  existing_data?: any
  changes?: Record<string, { old: any; new: any }>
}

interface BatchDetails {
  batch: {
    id: string
    status: string
    created_at: string
    seller: { name: string }
  }
  items: BatchItem[]
}

export const VWBatchReviewDashboard: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [rejectedItems, setRejectedItems] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const processor = new VWPDFProcessor()

  useEffect(() => {
    if (batchId) {
      loadBatchDetails()
    }
  }, [batchId])

  const loadBatchDetails = async () => {
    try {
      setLoading(true)
      const details = await processor.getBatchDetails(batchId!)
      setBatchDetails(details)
      
      // Auto-select all high-confidence new items
      const autoSelectIds = details.items
        .filter(item => item.action === 'new' && item.confidence_score >= 0.9)
        .map(item => item.id)
      setSelectedItems(new Set(autoSelectIds))
    } catch (error) {
      console.error('Error loading batch details:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  const toggleRowExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedRows(newExpanded)
  }

  const getLowestPrice = (item: BatchItem): number | null => {
    if (item.parsed_data.pricing_options && item.parsed_data.pricing_options.length > 0) {
      return Math.min(...item.parsed_data.pricing_options.map(option => option.monthly_price))
    }
    return item.parsed_data.monthly_price || null
  }

  const getOfferCount = (item: BatchItem): number => {
    if (item.parsed_data.pricing_options) {
      return item.parsed_data.pricing_options.length
    }
    return item.parsed_data.monthly_price ? 1 : 0
  }

  const selectAllInTab = () => {
    const tabItems = getFilteredItems()
    const newSelection = new Set(selectedItems)
    const newRejected = new Set(rejectedItems)
    
    tabItems.forEach(item => {
      if (!newRejected.has(item.id)) {
        newSelection.add(item.id)
      }
    })
    setSelectedItems(newSelection)
  }

  const deselectAllInTab = () => {
    const tabItems = getFilteredItems()
    const newSelection = new Set(selectedItems)
    tabItems.forEach(item => newSelection.delete(item.id))
    setSelectedItems(newSelection)
  }

  const selectHighConfidenceItems = () => {
    const tabItems = getFilteredItems()
    const newSelection = new Set(selectedItems)
    const newRejected = new Set(rejectedItems)
    
    tabItems.forEach(item => {
      if (item.confidence_score >= 0.9 && !newRejected.has(item.id)) {
        newSelection.add(item.id)
      }
    })
    setSelectedItems(newSelection)
  }

  const rejectItem = (itemId: string) => {
    const newRejected = new Set(rejectedItems)
    const newSelected = new Set(selectedItems)
    
    newRejected.add(itemId)
    newSelected.delete(itemId)
    
    setRejectedItems(newRejected)
    setSelectedItems(newSelected)
  }

  const approveItem = (itemId: string) => {
    const newRejected = new Set(rejectedItems)
    const newSelected = new Set(selectedItems)
    
    newRejected.delete(itemId)
    newSelected.add(itemId)
    
    setRejectedItems(newRejected)
    setSelectedItems(newSelected)
  }

  const getFilteredItems = (): BatchItem[] => {
    if (!batchDetails) return []
    
    switch (activeTab) {
      case 'new':
        return batchDetails.items.filter(item => item.action === 'new')
      case 'update':
        return batchDetails.items.filter(item => item.action === 'update')
      case 'delete':
        return batchDetails.items.filter(item => item.action === 'delete')
      default:
        return batchDetails.items
    }
  }

  const applySelectedChanges = async () => {
    if (selectedItems.size === 0) return
    
    try {
      setApplying(true)
      const selectedIds = Array.from(selectedItems)
      const results = await processor.applyApprovedChanges(batchId!, selectedIds)
      
      console.log('🎉 Approval results:', results)
      
      // Show success message with detailed results
      if (results.errors.length === 0) {
        alert(`✅ Alle ændringer er anvendt succesfuldt!\n\n` +
              `📊 Resultat:\n` +
              `• Oprettet: ${results.created} nye annoncer\n` +
              `• Opdateret: ${results.updated} annoncer\n` +
              `• Slettet: ${results.deleted} annoncer\n` +
              `• Total: ${results.applied} af ${selectedIds.length}`)
      } else {
        alert(`⚠️ Ændringer anvendt med ${results.errors.length} fejl\n\n` +
              `📊 Resultat:\n` +
              `• Anvendt: ${results.applied} af ${selectedIds.length}\n` +
              `• Fejl: ${results.errors.length}\n\n` +
              `Fejl detaljer:\n${results.errors.map(e => `• ${e.itemId}: ${e.error}`).join('\n')}`)
      }
      
      // Refresh batch details to reflect changes
      await loadBatchDetails()
      setSelectedItems(new Set())
      
      // Optional: Navigate back to sellers page after successful application
      if (results.errors.length === 0) {
        setTimeout(() => {
          navigate('/admin/sellers')
        }, 2000)
      }
      
    } catch (error) {
      console.error('Error applying changes:', error)
      alert(`❌ Der opstod en fejl ved anvendelse af ændringer:\n\n${error instanceof Error ? error.message : 'Ukendt fejl'}`)
    } finally {
      setApplying(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'new':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'update':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'delete':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionBadge = (action: string) => {
    const variants = {
      new: 'default',
      update: 'secondary',
      delete: 'destructive'
    } as const
    
    return (
      <Badge variant={variants[action as keyof typeof variants] || 'outline'}>
        {action.toUpperCase()}
      </Badge>
    )
  }

  const formatPrice = (price?: number) => price ? `${price.toLocaleString('da-DK')} kr/md` : '–'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Indlæser batch detaljer...</p>
        </div>
      </div>
    )
  }

  if (!batchDetails) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Batch ikke fundet</h3>
            <p className="text-muted-foreground mb-4">
              Batch med ID {batchId} kunne ikke findes.
            </p>
            <Button onClick={() => navigate('/admin/batches')}>
              Tilbage til batch oversigt
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = {
    total: batchDetails.items.length,
    new: batchDetails.items.filter(i => i.action === 'new').length,
    update: batchDetails.items.filter(i => i.action === 'update').length,
    delete: batchDetails.items.filter(i => i.action === 'delete').length,
    selected: selectedItems.size,
    rejected: rejectedItems.size
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Batch Review</h1>
          <p className="text-muted-foreground">
            {batchDetails.batch.seller.name} • {batchDetails.batch.id}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/batches')}
          >
            Tilbage
          </Button>
          <Button
            onClick={applySelectedChanges}
            disabled={selectedItems.size === 0 || applying}
            className="min-w-[120px]"
          >
            {applying && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Godkend ({stats.selected})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Nye</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.new}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Opdater</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.update}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Slet</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.delete}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Checkbox checked className="h-4 w-4" />
              <span className="text-sm font-medium">Valgt</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.selected}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Afvist</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">Alle ({stats.total})</TabsTrigger>
            <TabsTrigger value="new">Nye ({stats.new})</TabsTrigger>
            <TabsTrigger value="update">Opdater ({stats.update})</TabsTrigger>
            <TabsTrigger value="delete">Slet ({stats.delete})</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllInTab}>
              Vælg alle
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllInTab}>
              Fravælg alle
            </Button>
            <Button variant="outline" size="sm" onClick={selectHighConfidenceItems}>
              Høj sikkerhed (≥90%)
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {getFilteredItems().length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ingen items fundet</h3>
                <p className="text-muted-foreground">
                  Der er ingen items i denne kategori.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={getFilteredItems().length > 0 && getFilteredItems().every(item => selectedItems.has(item.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllInTab()
                          } else {
                            setSelectedItems(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Mærke & Model</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Laveste pris</TableHead>
                    <TableHead className="w-24">Tilbud</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sikkerhed</TableHead>
                    <TableHead className="w-32">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredItems().map((item) => (
                    <React.Fragment key={item.id}>
                      {/* Main row */}
                      <TableRow 
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          selectedItems.has(item.id) && "bg-blue-50",
                          rejectedItems.has(item.id) && "bg-red-50 opacity-60"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(item.id)}
                            className="h-6 w-6 p-0"
                          >
                            {expandedRows.has(item.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(item.action)}
                            <span className="font-medium">Volkswagen {item.parsed_data.model}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{item.parsed_data.variant}</span>
                            {item.parsed_data.is_electric && (
                              <Badge variant="outline" className="text-xs">Elektrisk</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.parsed_data.horsepower} hk
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">
                            {formatPrice(getLowestPrice(item) || 0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getOfferCount(item)} tilbud
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getActionBadge(item.action)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.confidence_score >= 0.9 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {Math.round(item.confidence_score * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {rejectedItems.has(item.id) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveItem(item.id)}
                                className="h-7 px-2"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            ) : (
                              <>
                                {!selectedItems.has(item.id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => approveItem(item.id)}
                                    className="h-7 px-2"
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectItem(item.id)}
                                  className="h-7 px-2 text-red-600 hover:text-red-700"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded row content */}
                      {expandedRows.has(item.id) && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-2">
                            {/* Pricing options table */}
                            {item.parsed_data.pricing_options && item.parsed_data.pricing_options.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="h-8 text-xs">Månedlig pris</TableHead>
                                    <TableHead className="h-8 text-xs">Kørsel per år</TableHead>
                                    <TableHead className="h-8 text-xs">Periode</TableHead>
                                    <TableHead className="h-8 text-xs">Udbetaling</TableHead>
                                    <TableHead className="h-8 text-xs">Total omkostning</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.parsed_data.pricing_options.map((option: any, index: number) => (
                                    <TableRow key={index} className="h-8">
                                      <TableCell className="py-1 font-medium text-sm">
                                        {formatPrice(option.monthly_price)}
                                      </TableCell>
                                      <TableCell className="py-1 text-sm">
                                        {option.mileage_per_year?.toLocaleString('da-DK')} km/år
                                      </TableCell>
                                      <TableCell className="py-1 text-sm">
                                        {option.period_months} mdr
                                      </TableCell>
                                      <TableCell className="py-1 text-sm">
                                        {option.deposit ? formatPrice(option.deposit) : '–'}
                                      </TableCell>
                                      <TableCell className="py-1 text-sm">
                                        {option.total_cost ? formatPrice(option.total_cost) : '–'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              /* Fallback for single pricing */
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="h-8 text-xs">Månedlig pris</TableHead>
                                    <TableHead className="h-8 text-xs">Kørsel per år</TableHead>
                                    <TableHead className="h-8 text-xs">Periode</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow className="h-8">
                                    <TableCell className="py-1 font-medium text-sm">
                                      {formatPrice(item.parsed_data.monthly_price)}
                                    </TableCell>
                                    <TableCell className="py-1 text-sm">
                                      {item.parsed_data.mileage_per_year?.toLocaleString('da-DK') || '–'} km/år
                                    </TableCell>
                                    <TableCell className="py-1 text-sm">
                                      {item.parsed_data.period_months} mdr
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            )}

                            {/* Show changes for update items */}
                            {item.action === 'update' && item.changes && Object.keys(item.changes).length > 0 && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <h4 className="font-medium mb-2">Ændringer:</h4>
                                <div className="space-y-2">
                                  {Object.entries(item.changes).map(([field, change]) => (
                                    <div key={field} className="flex justify-between text-sm">
                                      <span className="font-medium">{field}:</span>
                                      <span>
                                        <span className="text-red-600 line-through">
                                          {typeof change.old === 'object' ? JSON.stringify(change.old) : String(change.old)}
                                        </span>
                                        {' → '}
                                        <span className="text-green-600">
                                          {typeof change.new === 'object' ? JSON.stringify(change.new) : String(change.new)}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}