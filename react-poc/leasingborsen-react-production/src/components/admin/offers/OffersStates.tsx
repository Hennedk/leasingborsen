import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OffersStatesProps {
  className?: string
}

export const OffersNoListingState: React.FC<OffersStatesProps> = ({ className }) => (
  <Card className={className}>
    <CardHeader className="pt-6 pb-3">
      <CardTitle>Tilbud</CardTitle>
    </CardHeader>
    <CardContent className="px-6 pb-6">
      <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <div className="text-muted-foreground">
          <p className="text-sm">Gem først biloplysningerne for at tilføje tilbud</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

export const OffersLoadingState: React.FC<OffersStatesProps> = ({ className }) => (
  <Card className={className}>
    <CardHeader className="pt-6 pb-3">
      <CardTitle>Tilbud</CardTitle>
    </CardHeader>
    <CardContent className="px-6 pb-6">
      <div className="animate-pulse space-y-2">
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
    </CardContent>
  </Card>
)

interface OffersErrorStateProps extends OffersStatesProps {
  error: { message: string }
}

export const OffersErrorState: React.FC<OffersErrorStateProps> = ({ className, error }) => (
  <Card className={className}>
    <CardHeader className="pt-6 pb-3">
      <CardTitle>Tilbud</CardTitle>
    </CardHeader>
    <CardContent className="px-6 pb-6">
      <div className="text-destructive p-4 border border-destructive rounded-lg">
        Fejl ved indlæsning af tilbud: {error.message}
      </div>
    </CardContent>
  </Card>
)