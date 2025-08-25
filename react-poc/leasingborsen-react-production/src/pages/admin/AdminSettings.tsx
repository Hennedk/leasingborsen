import React from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

const AdminSettings: React.FC = () => {
  return (
    <AdminLayout title="Settings">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Settings page is under construction. This will contain system configuration options.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings