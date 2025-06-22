import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { BatchDetails } from '@/types/admin'

interface BatchReviewHeaderProps {
  batchDetails: BatchDetails | null
  statistics: {
    total: number
    new: number
    updates: number
    deletes: number
    highConfidence: number
    lowConfidence: number
  } | null
  loading: boolean
  onGoBack: () => void
  onRefresh: () => void
}

/**
 * Header component for batch review with navigation, statistics, and actions
 */
export const BatchReviewHeader: React.FC<BatchReviewHeaderProps> = ({
  batchDetails,
  statistics,
  loading,
  onGoBack,
  onRefresh
}) => {
  if (!batchDetails || !statistics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til annoncer
          </Button>
        </div>
        
        {loading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Indlæser batch detaljer...</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onGoBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbage til annoncer
        </Button>
        
        <Button 
          variant="outline" 
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Opdater
        </Button>
      </div>

      {/* Batch Information */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Batch Review</h1>
          <p className="text-muted-foreground">
            Sælger: {batchDetails.batch.seller.name} • 
            Oprettet: {new Date(batchDetails.batch.created_at).toLocaleDateString('da-DK')}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{statistics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nye</p>
                  <p className="text-xl font-bold">{statistics.new}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opdateringer</p>
                  <p className="text-xl font-bold">{statistics.updates}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sletninger</p>
                  <p className="text-xl font-bold">{statistics.deletes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confidence Level Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Konfidensniveau</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Høj ({statistics.highConfidence})
                  </Badge>
                  <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                    Mellem ({statistics.total - statistics.highConfidence - statistics.lowConfidence})
                  </Badge>
                  <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                    Lav ({statistics.lowConfidence})
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}