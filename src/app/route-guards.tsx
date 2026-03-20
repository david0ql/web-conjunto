import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { canAccessItem, getDefaultRoute } from '@/app/permissions'
import { useAuth } from '@/hooks/use-auth-context'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando sesion...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.type !== 'employee') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function AccessControlledRoute() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />

  const defaultRoute = getDefaultRoute(user)

  if (location.pathname === '/app' || location.pathname === '/app/') {
    return <Navigate to={defaultRoute} replace />
  }

  if (!canAccessItem(user, location.pathname)) {
    return <Navigate to={defaultRoute} replace />
  }

  return <Outlet />
}
