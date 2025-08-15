import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft, ChevronDown, ChevronRight, Car, Settings, Save, Clock, 
  Zap, Users, GitCompare, Plus, Edit, Trash, CheckCircle, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StandaloneSellerSelect } from '@/components/admin/StandaloneSellerSelect'
import { useListingComparison, type ExtractedCar, type ListingMatch } from '@/hooks/useListingComparison'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useFilterTranslationFunctions } from '@/hooks/useFilterTranslations'

interface ExtractedCarsResultsWithComparisonProps {
  cars: ExtractedCar[]
  totalCars: number
  metadata?: any
  pdfUrl?: string
  onBack: () => void
  onSaveToDatabase: (selectedSellerId: string) => void
  isSaving?: boolean
  className?: string
  initialSellerId?: string
}

export const ExtractedCarsResultsWithComparison: React.FC<ExtractedCarsResultsWithComparisonProps> = ({
  cars,
  totalCars,
  metadata,
  pdfUrl = '',
  onBack,
  onSaveToDatabase,
  isSaving = false,
  className,
  initialSellerId = ''
}) => {
  const { translateFuelType, translateTransmission } = useFilterTranslationFunctions()
  const navigate = useNavigate()
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [selectedSellerId, setSelectedSellerId] = useState<string>(initialSellerId)
  const [mode, setMode] = useState<'create' | 'compare'>('create')
  const [comparisonResult, setComparisonResult] = useState<{
    matches: ListingMatch[]
    summary: any
  } | null>(null)
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [sessionName, setSessionName] = useState('')

  const {
    compareListings,
    createSession,
    isComparing,
    isCreatingSession
  } = useListingComparison()

  const formatPrice = (price?: number): string => {
    if (!price) return '–'
    return `${price.toLocaleString('da-DK')} kr`
  }

  const formatProcessingTime = (ms?: number): string => {
    if (!ms) return '–'
    return ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  }

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  const handleCompareWithExisting = async () => {
    if (!selectedSellerId) {
      toast.error('Vælg venligst en sælger først')
      return
    }

    try {
      const result = await compareListings({
        extractedCars: cars,
        sellerId: selectedSellerId,
        sessionName: `PDF Extraction ${new Date().toLocaleDateString('da-DK')}`
      })

      setComparisonResult(result)
      setMode('compare')
      
      // Auto-select all new and updated items
      const autoSelected = new Set<string>()
      result.matches.forEach((match, idx) => {
        if (match.changeType === 'create' || match.changeType === 'update') {
          autoSelected.add(`${idx}`)
        }
      })
      setSelectedChanges(autoSelected)
      
    } catch (error) {
      console.error('Comparison error:', error)
    }
  }

  const handleSaveComparison = async () => {
    if (!comparisonResult || !selectedSellerId) return

    try {
      await createSession({
        sessionName: sessionName || `PDF Import ${new Date().toLocaleDateString('da-DK')}`,
        pdfUrl,
        sellerId: selectedSellerId,
        extractionType: 'update',
        comparisonResult
      })

      toast.success('Sammenligning gemt', {
        description: 'Du kan nu gennemgå og godkende ændringerne'
      })

      // Navigate to extraction sessions page to review changes
      navigate('/admin/extraction-sessions')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Fejl ved gemning', {
        description: error instanceof Error ? error.message : 'Der opstod en uventet fejl'
      })
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

  const selectAllChanges = (type?: 'create' | 'update' | 'delete') => {
    if (!comparisonResult) return
    
    const newSelected = new Set<string>()
    comparisonResult.matches.forEach((match, idx) => {
      if (!type || match.changeType === type) {
        newSelected.add(`${idx}`)
      }
    })
    setSelectedChanges(newSelected)
  }

  const renderComparisonView = () => {
    if (!comparisonResult) return null

    const { matches, summary } = comparisonResult

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-600" />
                Nye
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalNew}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Edit className="h-4 w-4 text-blue-600" />
                Opdateringer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUpdated}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-gray-600" />
                Uændrede
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUnchanged}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trash className="h-4 w-4 text-red-600" />
                Slettede
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalDeleted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Match Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((summary.totalMatched / summary.totalExtracted) * 100)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Alle ({matches.length})</TabsTrigger>
            <TabsTrigger value="new" className="text-green-600">
              Nye ({summary.totalNew})
            </TabsTrigger>
            <TabsTrigger value="updated" className="text-blue-600">
              Opdateringer ({summary.totalUpdated})
            </TabsTrigger>
            <TabsTrigger value="unchanged" className="text-gray-600">
              Uændrede ({summary.totalUnchanged})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="text-red-600">
              Slettede ({summary.totalDeleted})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {renderChangesList(matches)}
          </TabsContent>
          
          <TabsContent value="new" className="mt-4">
            {renderChangesList(matches.filter(m => m.changeType === 'create'))}
          </TabsContent>
          
          <TabsContent value="updated" className="mt-4">
            {renderChangesList(matches.filter(m => m.changeType === 'update'))}
          </TabsContent>
          
          <TabsContent value="unchanged" className="mt-4">
            {renderChangesList(matches.filter(m => m.changeType === 'unchanged'))}
          </TabsContent>
          
          <TabsContent value="deleted" className="mt-4">
            {renderChangesList(matches.filter(m => m.changeType === 'delete'))}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllChanges('create')}
            >
              Vælg alle nye
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllChanges('update')}
            >
              Vælg alle opdateringer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedChanges(new Set())}
            >
              Fravælg alle
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Input
              placeholder="Session navn..."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-64"
            />
            <Button
              onClick={handleSaveComparison}
              disabled={isCreatingSession || selectedChanges.size === 0}
            >
              {isCreatingSession ? (
                <>
                  <Settings className="h-4 w-4 animate-spin mr-2" />
                  Gemmer...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Gem sammenligning ({selectedChanges.size} valgte)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderChangesList = (filteredMatches: ListingMatch[]) => {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bil</TableHead>
                <TableHead>Ændringer</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Handling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.map((match, idx) => {
                const isSelected = selectedChanges.has(`${idx}`)
                const car = match.extracted || match.existing
                // Create a more unique key using car details
                const uniqueKey = match.existing?.id || `${car?.make}-${car?.model}-${car?.variant}-${idx}`
                
                return (
                  <TableRow key={uniqueKey} className={cn(
                    "hover:bg-muted/50",
                    isSelected && "bg-muted/30"
                  )}>
                    <TableCell>
                      {match.changeType !== 'unchanged' && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleChangeSelection(`${idx}`)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        match.changeType === 'create' ? 'default' :
                        match.changeType === 'update' ? 'secondary' :
                        match.changeType === 'delete' ? 'destructive' :
                        'outline'
                      }>
                        {match.changeType === 'create' && <Plus className="h-3 w-3 mr-1" />}
                        {match.changeType === 'update' && <Edit className="h-3 w-3 mr-1" />}
                        {match.changeType === 'delete' && <Trash className="h-3 w-3 mr-1" />}
                        {match.changeType === 'unchanged' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {match.changeType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {car?.make} {car?.model} {car?.variant}
                        </div>
                        {match.extracted?.engine_info && (
                          <div className="text-sm text-muted-foreground">
                            {match.extracted.engine_info}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {match.changes && Object.keys(match.changes).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(match.changes).slice(0, 3).map(([field, change]) => (
                            <div key={field} className="text-sm">
                              <span className="font-medium">{field}:</span>{' '}
                              <span className="text-red-600 line-through">{change.old || '–'}</span>{' '}
                              →{' '}
                              <span className="text-green-600">{change.new || '–'}</span>
                            </div>
                          ))}
                          {Object.keys(match.changes).length > 3 && (
                            <div className="text-sm text-muted-foreground">
                              +{Object.keys(match.changes).length - 3} flere...
                            </div>
                          )}
                        </div>
                      ) : match.changeType === 'unchanged' ? (
                        <span className="text-sm text-muted-foreground">Ingen ændringer</span>
                      ) : match.changeType === 'create' ? (
                        <span className="text-sm text-green-600">Ny bil</span>
                      ) : match.changeType === 'delete' ? (
                        <span className="text-sm text-red-600">Findes ikke i PDF</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {match.matchType && (
                        <Badge variant="outline" className="text-xs">
                          {match.matchType}
                          {match.confidence < 1 && ` (${Math.round(match.confidence * 100)}%)`}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => console.log('View details', match)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  // Main render
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til extraction
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">AI Extraction Resultat</h1>
            <p className="text-sm text-muted-foreground">
              {totalCars} bil{totalCars !== 1 ? 'er' : ''} fundet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StandaloneSellerSelect
            value={selectedSellerId}
            onValueChange={setSelectedSellerId}
            className="w-48"
          />
          
          {mode === 'create' ? (
            <>
              <Button
                onClick={handleCompareWithExisting}
                disabled={!selectedSellerId || isComparing}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isComparing ? (
                  <>
                    <Settings className="h-4 w-4 animate-spin" />
                    Sammenligner...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4" />
                    Sammenlign med eksisterende
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => onSaveToDatabase(selectedSellerId)}
                disabled={!selectedSellerId || isSaving || cars.length === 0}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Settings className="h-4 w-4 animate-spin" />
                    Gemmer...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Opret alle som nye
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setMode('create')
                setComparisonResult(null)
              }}
              variant="outline"
            >
              Tilbage til simpel visning
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {mode === 'create' ? (
        <>
          {/* Statistics Cards */}
          {metadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Biler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCars}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Behandlingstid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatProcessingTime(metadata.processingTime)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metadata.tokensUsed?.toLocaleString('da-DK') || '–'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tilbud
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cars.reduce((total, car) => total + (car.offers?.length || 0), 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Ekstraherede Biler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Mærke & Model</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Brændstof</TableHead>
                      <TableHead>Transmission</TableHead>
                      <TableHead>HK</TableHead>
                      <TableHead>Tekniske data</TableHead>
                      <TableHead>Månedlig pris</TableHead>
                      <TableHead>Tilbud</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cars.map((car, index) => {
                      const isExpanded = expandedRows.has(index)
                      const primaryOffer = car.offers?.[0] || {
                        monthly_price: 0,
                        first_payment: undefined,
                        period_months: undefined,
                        mileage_per_year: undefined
                      }
                      // Create a unique key for each car
                      const carKey = `${car.make}-${car.model}-${car.variant}-${index}`

                      return (
                        <React.Fragment key={carKey}>
                          {/* Main Row */}
                          <TableRow
                            className={cn(
                              "cursor-pointer hover:bg-muted/50",
                              isExpanded && "bg-muted/30"
                            )}
                            onClick={() => toggleRowExpansion(index)}
                          >
                            <TableCell>
                              {car.offers && car.offers.length > 1 ? (
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{car.make} {car.model}</div>
                                <div className="text-sm text-muted-foreground">
                                  {car.year} • {car.seats ? `${car.seats} sæder` : ''} {car.seats && car.doors ? ' • ' : ''} {car.doors ? `${car.doors} døre` : ''}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{car.variant}</div>
                              {car.engine_info && (
                                <div className="text-sm text-muted-foreground">{car.engine_info}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {car.fuel_type ? (translateFuelType(car.fuel_type) || car.fuel_type) : '–'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {car.transmission ? (translateTransmission(car.transmission) || car.transmission) : '–'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {car.horsepower ? `${car.horsepower} HK` : '–'}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                {car.wltp && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">WLTP:</span>
                                    <span>{car.wltp} km</span>
                                  </div>
                                )}
                                {car.co2_emission && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">CO2:</span>
                                    <span>{car.co2_emission} g/km</span>
                                  </div>
                                )}
                                {!car.wltp && !car.co2_emission && (
                                  <span className="text-muted-foreground">–</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatPrice(primaryOffer.monthly_price)}
                              </div>
                              {primaryOffer.period_months && (
                                <div className="text-sm text-muted-foreground">
                                  {primaryOffer.period_months} mdr
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge>
                                {car.offers?.length || 1} tilbud
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Row - Show all offers */}
                          {isExpanded && car.offers && car.offers.length > 1 && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-4">
                                <div>
                                  <h4 className="text-sm font-medium mb-3">
                                    Alle tilbud ({car.offers.length})
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="h-8 text-xs">Månedlig pris</TableHead>
                                        <TableHead className="h-8 text-xs">Kørsel per år</TableHead>
                                        <TableHead className="h-8 text-xs">Periode</TableHead>
                                        <TableHead className="h-8 text-xs">Førsteudgift</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {car.offers.map((offer, offerIndex) => (
                                        <TableRow key={offerIndex}>
                                          <TableCell className="py-1">
                                            <div className="font-medium">
                                              {formatPrice(offer.monthly_price)}
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-1">
                                            {offer.mileage_per_year ? `${offer.mileage_per_year.toLocaleString('da-DK')} km` : '–'}
                                          </TableCell>
                                          <TableCell className="py-1">
                                            {offer.period_months ? `${offer.period_months} måneder` : '–'}
                                          </TableCell>
                                          <TableCell className="py-1">
                                            {formatPrice(offer.first_payment)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        renderComparisonView()
      )}
    </div>
  )
}

// Import missing Input component
import { Input } from '@/components/ui/input'