import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Clock, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaseScoreBreakdown {
  totalScore: number
  monthlyRateScore: number
  monthlyRatePercent: number
  mileageScore: number
  mileageNormalized: number
  flexibilityScore: number
  pricing_id?: string
  calculation_version?: string
}

interface LeaseScoreBadgeProps {
  score?: number
  breakdown?: LeaseScoreBreakdown
  calculatedAt?: string
  retailPrice?: number
  showTooltip?: boolean
  size?: 'sm' | 'default'
  className?: string
}

export const LeaseScoreBadge: React.FC<LeaseScoreBadgeProps> = ({
  score,
  breakdown,
  calculatedAt,
  retailPrice,
  showTooltip = true,
  size = 'default',
  className
}) => {
  // If no retail price, can't calculate score
  if (!retailPrice) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        Mangler detailpris
      </Badge>
    )
  }

  // If no score calculated yet
  if (score === undefined || score === null) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Calculator className="h-3 w-3 mr-1" />
        Ikke beregnet
      </Badge>
    )
  }

  // Determine badge variant and color based on score
  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'default' // Green for high scores
    if (score >= 60) return 'secondary' // Yellow for medium scores
    return 'destructive' // Red for low scores
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700 bg-green-50 border-green-200'
    if (score >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  // Check if score is stale (older than 7 days)
  const isStale = calculatedAt ? 
    (Date.now() - new Date(calculatedAt).getTime()) > (7 * 24 * 60 * 60 * 1000) : 
    true

  const badgeContent = (
    <Badge 
      variant={getScoreVariant(score)}
      className={cn(
        "text-xs font-medium",
        getScoreColor(score),
        isStale && "opacity-75",
        size === 'sm' && "text-xs px-1.5 py-0.5",
        className
      )}
    >
      {score}
      {isStale && <Clock className="h-3 w-3 ml-1 opacity-60" />}
    </Badge>
  )

  if (!showTooltip || !breakdown) {
    return badgeContent
  }

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleString('da-DK')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Leasing Score: {score}</span>
              {isStale && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Forældet
                </span>
              )}
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Månedlig rate score:</span>
                <span className="font-medium">{breakdown.monthlyRateScore}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="pl-2">Rate: {breakdown.monthlyRatePercent}% af detailpris</span>
              </div>
              
              <div className="flex justify-between">
                <span>Kørsel score:</span>
                <span className="font-medium">{breakdown.mileageScore}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="pl-2">Normaliseret: {breakdown.mileageNormalized}x</span>
              </div>
              
              <div className="flex justify-between">
                <span>Fleksibilitet score:</span>
                <span className="font-medium">{breakdown.flexibilityScore}</span>
              </div>
            </div>
            
            {calculatedAt && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Beregnet: {formatDate(calculatedAt)}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}