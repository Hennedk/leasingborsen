import React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Plus,
  X,
  FileText
} from 'lucide-react'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Annoncer',
      href: '/admin/listings',
      icon: Car,
      children: [
        {
          name: 'Alle annoncer',
          href: '/admin/listings',
        },
        {
          name: 'Opret annonce',
          href: '/admin/listings/create',
          icon: Plus,
        },
      ],
    },
    {
      name: 'Sælgere',
      href: '/admin/sellers',
      icon: Users,
      children: [
        {
          name: 'Alle sælgere',
          href: '/admin/sellers',
        },
        {
          name: 'Opret sælger',
          href: '/admin/sellers/create',
          icon: Plus,
        },
      ],
    },
    {
      name: 'Toyota PDF',
      href: '/admin/toyota-pdf',
      icon: FileText,
    },
  ]

  const isActiveLink = (href: string) => {
    if (href === '/admin/dashboard') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg text-foreground">
                Admin
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <div key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActiveLink(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onClose()
                    }
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>

                {/* Sub-navigation */}
                {item.children && isActiveLink(item.href) && (
                  <div className="ml-4 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        to={child.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                          location.pathname === child.href
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onClose()
                          }
                        }}
                      >
                        {child.icon && <child.icon className="h-3 w-3" />}
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Leasingborsen Admin
            </div>
            <Separator className="my-2" />
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/">Tilbage til hjemmeside</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminSidebar