import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AdminErrorBoundary } from '@/components/ErrorBoundaries'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

function AdminLayout() {
  const { isAdminAuthenticated, loading } = useAuth()

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verificerer adgang...</p>
        </div>
      </div>
    )
  }

  // This should not happen due to beforeLoad, but just in case
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-destructive mb-2">Adgang nægtet</p>
          <p className="text-sm text-muted-foreground">Du har ikke tilladelse til at få adgang til dette område</p>
        </div>
      </div>
    )
  }

  return (
    <AdminErrorBoundary>
      <Outlet />
    </AdminErrorBoundary>
  )
}

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // Check authentication before loading admin routes
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      throw redirect({
        to: '/login',
        search: {
          redirectTo: location.href
        }
      })
    }

    // Check if user has admin role
    const roles = session.user.app_metadata?.roles || []
    const isAdmin = roles.includes('admin')

    if (!isAdmin) {
      // Sign out non-admin users and redirect to login
      await supabase.auth.signOut()
      throw redirect({
        to: '/login',
        search: {
          redirectTo: location.href
        }
      })
    }

    return { session }
  },
  component: AdminLayout,
})