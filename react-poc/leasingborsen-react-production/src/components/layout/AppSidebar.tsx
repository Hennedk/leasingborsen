import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  LayoutDashboard,
  Car,
  Users,
  Settings,
  LogOut,
  X,
  FileText
} from 'lucide-react'

interface AppSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Annoncer',
    href: '/admin/listings',
    icon: Car,
  },
  {
    title: 'Sælgere',
    href: '/admin/sellers',
    icon: Users,
  },
  {
    title: 'PDF Extraction',
    href: '/admin/pdf-extraction',
    icon: FileText,
  },
  {
    title: 'Indstillinger',
    href: '/admin/settings',
    icon: Settings,
  },
]

export const AppSidebar: React.FC<AppSidebarProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const location = useLocation()

  const NavLink: React.FC<{ item: NavItem }> = ({ item }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== '/admin' && location.pathname.startsWith(item.href))
    
    return (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive 
            ? "bg-accent text-accent-foreground" 
            : "text-muted-foreground"
        )}
        onClick={() => onOpenChange(false)}
      >
        <item.icon className="h-4 w-4" />
        {item.title}
        {item.badge && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/admin" className="flex items-center gap-2">
              <Car className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Leasingbørsen</span>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.title}>
                      <NavLink item={item} />
                    </li>
                  ))}
                </ul>
              </li>
              
              {/* Bottom section */}
              <li className="mt-auto">
                <Separator className="mb-4" />
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-muted-foreground"
                  asChild
                >
                  <Link to="/">
                    <LogOut className="h-4 w-4" />
                    Tilbage til hjemmeside
                  </Link>
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-in-out lg:hidden",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 pb-4 shadow-xl">
          {/* Mobile Header */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2">
              <Car className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Leasingbørsen</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Mobile Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.title}>
                      <NavLink item={item} />
                    </li>
                  ))}
                </ul>
              </li>
              
              {/* Bottom section */}
              <li className="mt-auto">
                <Separator className="mb-4" />
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-muted-foreground"
                  asChild
                >
                  <Link to="/">
                    <LogOut className="h-4 w-4" />
                    Tilbage til hjemmeside
                  </Link>
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}