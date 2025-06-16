import React from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

const AdminSellers: React.FC = () => {
  return (
    <AdminLayout title="Sælgere">
      <div className="space-y-6">
        {/* Header with action */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Sælgere</h2>
            <p className="text-muted-foreground">
              Administrer alle registrerede sælgere
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/sellers/create">
              <Plus className="h-4 w-4 mr-2" />
              Tilføj Sælger
            </Link>
          </Button>
        </div>

        {/* Placeholder for data table */}
        <Card>
          <CardHeader>
            <CardTitle>Alle Sælgere</CardTitle>
            <CardDescription>
              En liste over alle registrerede sælgere
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Sælger data tabel kommer her i fase 2
              </p>
              <p className="text-sm text-muted-foreground">
                Vi implementerer database schema og CRUD operationer næste
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminSellers