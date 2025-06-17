import React from 'react'
import { AppShell } from '@/components/layout/AppShell'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}

export default AdminLayout