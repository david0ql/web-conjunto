import { Suspense, lazy, type ComponentType } from 'react'
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { AccessControlledRoute, ProtectedRoute } from '@/app/route-guards'

const AppIndexPage = lazy(() => import('@/app/app-index-page').then((module) => ({ default: module.AppIndexPage })))
const AuthPage = lazy(() => import('@/features/auth/auth-page').then((module) => ({ default: module.AuthPage })))
const OverviewPage = lazy(() =>
  import('@/features/dashboard/overview-page').then((module) => ({ default: module.OverviewPage })),
)
const ResidentsPage = lazy(() =>
  import('@/features/residents/residents-page').then((module) => ({ default: module.ResidentsPage })),
)
const EmployeesPage = lazy(() =>
  import('@/features/employees/employees-page').then((module) => ({ default: module.EmployeesPage })),
)
const ApartmentsPage = lazy(() =>
  import('@/features/apartments/apartments-page').then((module) => ({ default: module.ApartmentsPage })),
)
const ReservationsPage = lazy(() =>
  import('@/features/reservations/reservations-page').then((module) => ({ default: module.ReservationsPage })),
)
const PackagesPage = lazy(() =>
  import('@/features/packages/packages-page').then((module) => ({ default: module.PackagesPage })),
)
const NotificationsPage = lazy(() =>
  import('@/features/notifications/notifications-page').then((module) => ({ default: module.NotificationsPage })),
)
const AccessPage = lazy(() => import('@/features/access/access-page').then((module) => ({ default: module.AccessPage })))
const PoolPage = lazy(() => import('@/features/pool/pool-page').then((module) => ({ default: module.PoolPage })))
const PoolDashboardPage = lazy(() =>
  import('@/features/pool/pool-dashboard-page').then((module) => ({ default: module.PoolDashboardPage })),
)
const PoolControlPage = lazy(() =>
  import('@/features/pool/pool-control-page').then((module) => ({ default: module.PoolControlPage })),
)
const PoolReportsPage = lazy(() =>
  import('@/features/pool/pool-reports-page').then((module) => ({ default: module.PoolReportsPage })),
)
const BuildingMapPage = lazy(() =>
  import('@/features/building/building-map-page').then((module) => ({ default: module.BuildingMapPage })),
)
const NewsPage = lazy(() => import('@/features/news/news-page').then((module) => ({ default: module.NewsPage })))
const CallHistoryPage = lazy(() =>
  import('@/features/calls/call-history-page').then((module) => ({ default: module.CallHistoryPage })),
)
const CommunitySpacesPage = lazy(() =>
  import('@/features/community-spaces/community-spaces-page').then((module) => ({ default: module.CommunitySpacesPage })),
)
const FinesPage = lazy(() => import('@/features/fines/fines-page').then((module) => ({ default: module.FinesPage })))
const AssembliesPage = lazy(() =>
  import('@/features/assemblies/assemblies-page').then((module) => ({ default: module.AssembliesPage })),
)
const AssemblyDetailPage = lazy(() =>
  import('@/features/assemblies/assembly-detail-page').then((module) => ({ default: module.AssemblyDetailPage })),
)
const AssemblyPublicStatsPage = lazy(() =>
  import('@/features/assemblies/public/assembly-public-stats-page').then((module) => ({
    default: module.AssemblyPublicStatsPage,
  })),
)
const AssemblyVerifyPage = lazy(() =>
  import('@/features/assemblies/public/assembly-verify-page').then((module) => ({ default: module.AssemblyVerifyPage })),
)
const PorterLinesPage = lazy(() =>
  import('@/features/porters/porter-lines-page').then((module) => ({ default: module.PorterLinesPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="size-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
    </div>
  )
}

function lazyElement(Component: ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: lazyElement(AuthPage),
  },
  {
    path: '/public/assembly/:publicId',
    element: lazyElement(AssemblyPublicStatsPage),
  },
  {
    path: '/public/assembly/:publicId/verify',
    element: lazyElement(AssemblyVerifyPage),
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
            element: lazyElement(AppIndexPage),
          },
          {
            element: <AccessControlledRoute />,
            children: [
              { path: 'overview', element: lazyElement(OverviewPage) },
              { path: 'residents', element: lazyElement(ResidentsPage) },
              { path: 'employees', element: lazyElement(EmployeesPage) },
              { path: 'apartments', element: lazyElement(ApartmentsPage) },
              { path: 'reservations', element: lazyElement(ReservationsPage) },
              { path: 'packages', element: lazyElement(PackagesPage) },
              { path: 'notifications', element: lazyElement(NotificationsPage) },
              { path: 'calls/history', element: lazyElement(CallHistoryPage) },
              { path: 'news', element: lazyElement(NewsPage) },
              { path: 'fines', element: lazyElement(FinesPage) },
              { path: 'building', element: lazyElement(BuildingMapPage) },
              { path: 'access', element: lazyElement(AccessPage) },
              { path: 'pool', element: lazyElement(PoolPage) },
              { path: 'porter-lines', element: lazyElement(PorterLinesPage) },
              { path: 'pool/dashboard', element: lazyElement(PoolDashboardPage) },
              { path: 'pool/control', element: lazyElement(PoolControlPage) },
              { path: 'pool/reports', element: lazyElement(PoolReportsPage) },
              { path: 'community-spaces', element: lazyElement(CommunitySpacesPage) },
              { path: 'assemblies', element: lazyElement(AssembliesPage) },
              { path: 'assemblies/:id', element: lazyElement(AssemblyDetailPage) },
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
