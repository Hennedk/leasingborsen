import React from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight } from 'lucide-react'

const BatchReviewPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <AdminLayout title="Batch Review">
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="space-y-4">
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Sælgere', href: '/admin/sellers' },
              { label: 'Batch Review' }
            ]}
          />
        </div>

        {/* Deprecation Notice */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Batch Review System Afviklet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-amber-700">
              Det legacy batch review system er blevet afviklet og erstattet af det moderne AI-baserede ekstraktionssystem.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800">Nye funktioner:</p>
              <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                <li>AI-baseret PDF ekstraktion med høj nøjagtighed</li>
                <li>Realtids sammenligning og review workflow</li>
                <li>Automatisk reference data opløsning</li>
                <li>Forbedret fejlhåndtering og audit spor</li>
              </ul>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => navigate('/admin/extraction')}
                className="flex items-center gap-2"
              >
                Gå til AI Ekstraktion <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/admin/sellers')}
              >
                Tilbage til Sælgere
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default BatchReviewPage