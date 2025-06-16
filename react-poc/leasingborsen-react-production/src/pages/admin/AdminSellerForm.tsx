import React from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const AdminSellerForm: React.FC = () => {
  const { id } = useParams()
  const isEditing = Boolean(id)

  return (
    <AdminLayout title={isEditing ? 'Rediger Sælger' : 'Tilføj Sælger'}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Rediger Sælger' : 'Tilføj Ny Sælger'}
          </h2>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Opdater sælgerens information' 
              : 'Udfyld formularen for at registrere en ny sælger'
            }
          </p>
        </div>

        {/* Form placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Sælger Information</CardTitle>
            <CardDescription>
              Kontakt og virksomhedsoplysninger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Sælger formular kommer her i fase 2
              </p>
              <p className="text-sm text-muted-foreground">
                Vi opretter database schema og form komponenter næste
              </p>
              {isEditing && (
                <p className="text-sm text-muted-foreground mt-2">
                  Redigerer sælger ID: {id}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminSellerForm