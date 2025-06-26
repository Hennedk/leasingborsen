import React from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { VWBatchReviewDashboard } from '@/components/admin/batch/VWBatchReviewDashboard'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import CacheInvalidator from '@/components/dev/CacheInvalidator'

const BatchReviewPage: React.FC = () => {
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

        {/* Development Cache Invalidator */}
        <CacheInvalidator />

        {/* Batch Review Dashboard */}
        <VWBatchReviewDashboard />
      </div>
    </AdminLayout>
  )
}

export default BatchReviewPage