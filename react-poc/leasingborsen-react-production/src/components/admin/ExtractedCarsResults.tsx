import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, ChevronDown, ChevronRight, Car, Settings, Save, Clock, Zap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StandaloneSellerSelect } from '@/components/admin/StandaloneSellerSelect'

interface LeaseOffer {
  monthly_price: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  total_price?: number
}

interface ExtractedCar {
  make: string
  model: string
  variant: string
  horsepower?: number
  engine_info?: string
  fuel_type?: string
  transmission?: string
  body_type?: string
  seats?: number
  doors?: number
  year?: number
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  offers: LeaseOffer[]
  // Legacy fields
  monthly_price?: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  total_price?: number
}

interface ExtractionMetadata {
  processingTime?: number
  tokensUsed?: number
  cost?: number
  textSource?: string
  textLength?: number
  originalTextLength?: number
  processedTextLength?: number
  compressionRatio?: number
  extractionType?: string
}

interface ExtractedCarsResultsProps {
  cars: ExtractedCar[]
  totalCars: number
  metadata?: ExtractionMetadata
  onBack: () => void
  onSaveToDatabase: (selectedSellerId: string) => void
  isSaving?: boolean
  className?: string
}

export const ExtractedCarsResults: React.FC<ExtractedCarsResultsProps> = ({
  cars,
  totalCars,
  metadata,
  onBack,
  onSaveToDatabase,
  isSaving = false,
  className
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [selectedSellerId, setSelectedSellerId] = useState<string>('')

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

  const handleSaveToDatabase = () => {
    if (!selectedSellerId) {
      alert('Vælg venligst en sælger først')
      return
    }
    onSaveToDatabase(selectedSellerId)
  }

  const uniqueMakes = useMemo(() => {
    const makes = new Set(cars.map(car => car.make))
    return Array.from(makes)
  }, [cars])

  const totalOffers = useMemo(() => {
    return cars.reduce((total, car) => total + (car.offers?.length || 0), 0)
  }, [cars])

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
              {totalCars} bil{totalCars !== 1 ? 'er' : ''} fundet med {totalOffers} tilbud{totalOffers !== 1 ? '' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StandaloneSellerSelect
            value={selectedSellerId}
            onValueChange={setSelectedSellerId}
            className="w-48"
          />
          <Button
            onClick={handleSaveToDatabase}
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
                Gem til database
              </>
            )}
          </Button>
        </div>
      </div>

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
              <p className="text-xs text-muted-foreground">
                {uniqueMakes.length} mærke{uniqueMakes.length !== 1 ? 'r' : ''}
              </p>
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
              <p className="text-xs text-muted-foreground">
                {metadata.extractionType || 'AI extraction'}
              </p>
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
              <p className="text-xs text-muted-foreground">
                ~{metadata.cost ? `$${metadata.cost.toFixed(4)}` : '–'}
              </p>
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
              <div className="text-2xl font-bold">{totalOffers}</div>
              <p className="text-xs text-muted-foreground">
                {(totalOffers / totalCars).toFixed(1)} per bil
              </p>
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
                    monthly_price: car.monthly_price || 0,
                    first_payment: car.first_payment,
                    period_months: car.period_months,
                    mileage_per_year: car.mileage_per_year,
                    total_price: car.total_price
                  }

                  return (
                    <React.Fragment key={index}>
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
                            {car.fuel_type || '–'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {car.transmission || '–'}
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
                            {car.consumption_l_100km && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Forbrug:</span>
                                <span>{car.consumption_l_100km} l/100km</span>
                              </div>
                            )}
                            {car.consumption_kwh_100km && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Forbrug:</span>
                                <span>{car.consumption_kwh_100km} kWh/100km</span>
                              </div>
                            )}
                            {car.co2_tax_half_year && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Afgift:</span>
                                <span>{formatPrice(car.co2_tax_half_year)}/halvår</span>
                              </div>
                            )}
                            {!car.wltp && !car.co2_emission && !car.consumption_l_100km && !car.consumption_kwh_100km && !car.co2_tax_half_year && (
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
                                    <TableHead className="h-8 text-xs">Totalpris</TableHead>
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
                                      <TableCell className="py-1">
                                        {formatPrice(offer.total_price)}
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
    </div>
  )
}