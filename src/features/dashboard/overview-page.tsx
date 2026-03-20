import { useQueries } from '@tanstack/react-query'
import { Bell, Building2, ClipboardList, Package, Users, Waves } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate } from '@/lib/utils'

export function OverviewPage() {
  const { user } = useAuth()

  const results = useQueries({
    queries: [
      {
        queryKey: ['overview', 'reservations', user?.role],
        queryFn: () => api.getReservations(),
        enabled: Boolean(user),
      },
      {
        queryKey: ['overview', 'packages', user?.role],
        queryFn: () => api.getPackages(),
        enabled: Boolean(user),
      },
      {
        queryKey: ['overview', 'notifications', user?.role],
        queryFn: () => api.getAllNotifications(),
        enabled: user?.role === 'administrator',
      },
      {
        queryKey: ['overview', 'residents'],
        queryFn: () => api.getResidents(),
        enabled: user?.role === 'administrator' || user?.role === 'pool_attendant',
      },
      {
        queryKey: ['overview', 'apartments'],
        queryFn: () => api.getApartments(),
        enabled: user?.role === 'administrator',
      },
      {
        queryKey: ['overview', 'pool'],
        queryFn: () => api.getPoolEntries(),
        enabled: user?.role === 'administrator' || user?.role === 'pool_attendant',
      },
    ],
  })

  const reservations = results[0].data ?? []
  const packages = results[1].data ?? []
  const notifications = results[2].data ?? []
  const residents = results[3].data ?? []
  const apartments = results[4].data ?? []
  const poolEntries = results[5].data ?? []
  const recentActivity = [
    ...reservations.slice(0, 2).map((item) => ({
      title: `${item.area?.name ?? 'Area comun'} · ${item.status?.name ?? 'Pendiente'}`,
      detail: `${item.resident?.name ?? 'Residente'} · ${item.reservationDate} ${item.startTime}`,
    })),
    ...packages.slice(0, 2).map((item) => ({
      title: item.description ?? 'Paquete sin descripcion',
      detail: `${item.resident?.name ?? 'Residente'} · ${formatDate(item.arrivalTime)}`,
    })),
    ...notifications.slice(0, 2).map((item) => ({
      title: item.notificationType?.name ?? 'Notificacion',
      detail: item.message,
    })),
  ].slice(0, 6)

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Centro de control"
        title={`${user?.roleLabel ?? 'Operacion'} bajo control.`}
        description="Indicadores operativos en tiempo real para gestionar el conjunto segun tu rol."
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            label="Reservas"
            value={reservations.length}
            detail="Solicitudes registradas"
            icon={<ClipboardList className="size-5" />}
          />
          <KpiCard
            label="Paquetes"
            value={packages.filter((item) => !item.delivered).length}
            detail="Pendientes por entregar"
            icon={<Package className="size-5" />}
          />
          <KpiCard
            label="Alertas"
            value={notifications.filter((item) => !item.isRead).length}
            detail="Notificaciones sin leer"
            icon={<Bell className="size-5" />}
          />
          <KpiCard
            label="Operacion"
            value={user?.roleLabel ?? 'Equipo'}
            detail="Contexto actual del usuario"
            icon={user?.role === 'pool_attendant' ? <Waves className="size-5" /> : <Users className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>Eventos que merecen atencion hoy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={`${activity.title}-${activity.detail}`}
                  className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <p className="font-medium text-slate-950">{activity.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{activity.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {user?.role === 'administrator' ? (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Capacidad operativa</CardTitle>
                  <CardDescription>Panorama consolidado del conjunto.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Users className="size-4" />
                      Residentes
                    </span>
                    <strong className="text-foreground">{residents.length}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4" />
                      Apartamentos
                    </span>
                    <strong className="text-foreground">{apartments.length}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Waves className="size-4" />
                      Entradas piscina
                    </span>
                    <strong className="text-foreground">{poolEntries.length}</strong>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Sesion</CardTitle>
                <CardDescription>Resumen de identidad activa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="font-medium text-foreground">
                    {user?.name} {user?.lastName}
                  </p>
                  <p>{user?.username}</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="font-medium text-foreground">Permisos cargados</p>
                  <p>{user?.permissions.length ?? 0} reglas disponibles en esta sesion.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
