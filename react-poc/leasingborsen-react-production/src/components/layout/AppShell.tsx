import React from 'react'
import { cn } from '@/lib/utils'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

interface AppShellProps {
  children: React.ReactNode
  className?: string
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children, 
  className 
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar 
        open={sidebarOpen} 
        onOpenChange={setSidebarOpen}
      />
      
      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <AppHeader 
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        {/* Page Content */}
        <main className={cn("p-4 lg:p-6", className)}>
          {children}
        </main>
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}