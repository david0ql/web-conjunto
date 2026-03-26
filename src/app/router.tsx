import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppIndexPage } from '@/app/app-index-page'
import { AppShell } from '@/components/layout/app-shell'
import { AuthPage } from '@/features/auth/auth-page'
import { OverviewPage } from '@/features/dashboard/overview-page'
import { ResidentsPage } from '@/features/residents/residents-page'
import { EmployeesPage } from '@/features/employees/employees-page'
import { ApartmentsPage } from '@/features/apartments/apartments-page'
import { ReservationsPage } from '@/features/reservations/reservations-page'
import { PackagesPage } from '@/features/packages/packages-page'
import { NotificationsPage } from '@/features/notifications/notifications-page'
import { AccessPage } from '@/features/access/access-page'
import { PoolPage } from '@/features/pool/pool-page'
import { PoolDashboardPage } from '@/features/pool/pool-dashboard-page'
import { PoolControlPage } from '@/features/pool/pool-control-page'
import { PoolReportsPage } from '@/features/pool/pool-reports-page'
import { BuildingMapPage } from '@/features/building/building-map-page'
import { NewsPage } from '@/features/news/news-page'
import { CommunitySpacesPage } from '@/features/community-spaces/community-spaces-page'
import { AccessControlledRoute, ProtectedRoute } from '@/app/route-guards'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <AuthPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <AppIndexPage />,
          },
          {
            element: <AccessControlledRoute />,
            children: [
              { path: 'overview', element: <OverviewPage /> },
              { path: 'residents', element: <ResidentsPage /> },
              { path: 'employees', element: <EmployeesPage /> },
              { path: 'apartments', element: <ApartmentsPage /> },
              { path: 'reservations', element: <ReservationsPage /> },
              { path: 'packages', element: <PackagesPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'news', element: <NewsPage /> },
              { path: 'building', element: <BuildingMapPage /> },
              { path: 'access', element: <AccessPage /> },
              { path: 'pool', element: <PoolPage /> },
              { path: 'pool/dashboard', element: <PoolDashboardPage /> },
              { path: 'pool/control', element: <PoolControlPage /> },
              { path: 'pool/reports', element: <PoolReportsPage /> },
              { path: 'community-spaces', element: <CommunitySpacesPage /> },
            ],
          },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
