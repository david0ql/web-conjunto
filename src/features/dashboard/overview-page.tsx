import { useQueries, useQuery } from '@tanstack/react-query'
import {
  Bell,
  Building2,
  ClipboardList,
  Clock3,
  DoorOpen,
  FileText,
  Package,
  Sparkles,
  UserRoundCheck,
  Users,
  Waves,
} from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate } from '@/lib/utils'

export function OverviewPage() {
  const { user } = useAuth()

  if (user?.role === 'administrator') return <AdminOverview />
  if (user?.role === 'porter') return <PorterOverview />
  if (user?.role === 'pool_attendant') return <PoolOverview />

  return null
}

// ─── Admin ────────────────────────────────────────────────────────────────────

function AdminOverview() {
  const { user } = useAuth()

  const results = useQueries({
    queries: [
      { queryKey: ['overview', 'reservations'], queryFn: api.getReservations },
      { queryKey: ['overview', 'packages'], queryFn: api.getPackages },
      { queryKey: ['overview', 'notifications'], queryFn: api.getAllNotifications },
      { queryKey: ['overview', 'residents'], queryFn: api.getResidents },
      { queryKey: ['overview', 'apartments'], queryFn: api.getApartments },
      { queryKey: ['overview', 'pool'], queryFn: api.getPoolEntries },
    ],
  })

  const reservations = results[0].data ?? []
  const packages = results[1].data ?? []
  const notifications = results[2].data ?? []
  const residents = results[3].data ?? []
  const apartments = results[4].data ?? []
  const poolEntries = results[5].data ?? []

  const pendingReservations = reservations.filter((r) => r.status?.code === 'pending')
  const pendingPackages = packages.filter((p) => !p.delivered)
  const unreadNotifications = notifications.filter((n) => !n.isRead)
  const occupiedApartments = apartments.filter((a) => a.status?.code === 'occupied')

  const today = new Date().toISOString().slice(0, 10)
  const poolToday = poolEntries.filter((e) => e.entryTime?.slice(0, 10) === today)

  const recentActivity = [
    ...pendingReservations.slice(0, 2).map((r) => ({
      label: 'Reserva pendiente',
      title: `${r.area?.name ?? 'Área común'} · ${r.reservationDate}`,
      detail: `${r.resident?.name ?? 'Residente'} · ${r.startTime}–${r.endTime}`,
    })),
    ...pendingPackages.slice(0, 2).map((p) => ({
      label: 'Paquete sin entregar',
      title: p.description ?? 'Paquete sin descripción',
      detail: `${p.resident?.name ?? 'Residente'} · ${formatDate(p.arrivalTime)}`,
    })),
    ...unreadNotifications.slice(0, 2).map((n) => ({
      label: 'Sin leer',
      title: n.notificationType?.name ?? 'Notificación',
      detail: n.message,
    })),
  ].slice(0, 5)

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Centro de control"
        title={`${user?.name ?? 'Administrador'}, todo bajo control.`}
        description="Indicadores de gestión del conjunto en tiempo real."
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            label="Reservas pendientes"
            value={pendingReservations.length}
            detail={`${reservations.length} solicitudes en total`}
            icon={<ClipboardList className="size-5" />}
          />
          <KpiCard
            label="Paquetes por entregar"
            value={pendingPackages.length}
            detail={`${packages.length} paquetes registrados`}
            icon={<Package className="size-5" />}
          />
          <KpiCard
            label="Notificaciones sin leer"
            value={unreadNotifications.length}
            detail={`${notifications.length} notificaciones totales`}
            icon={<Bell className="size-5" />}
          />
          <KpiCard
            label="Residentes activos"
            value={residents.filter((r) => r.isActive).length}
            detail={`${residents.length} registrados en sistema`}
            icon={<Users className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Atención requerida</CardTitle>
              <CardDescription>Reservas, paquetes y notificaciones que esperan acción.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todo al día. Sin pendientes.</p>
              ) : (
                recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <Badge variant="outline" className="mb-2 text-xs">
                      {item.label}
                    </Badge>
                    <p className="break-words font-medium text-slate-950">{item.title}</p>
                    <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Capacidad operativa</CardTitle>
                <CardDescription>Panorama consolidado del conjunto.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <StatRow icon={<Building2 className="size-4" />} label="Apartamentos ocupados" value={`${occupiedApartments.length} / ${apartments.length}`} />
                <StatRow icon={<Users className="size-4" />} label="Residentes activos" value={residents.filter((r) => r.isActive).length} />
                <StatRow icon={<Waves className="size-4" />} label="Piscina hoy" value={`${poolToday.length} entradas`} />
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Sesión</CardTitle>
                <CardDescription>Identidad activa en este dispositivo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="font-medium text-foreground">
                    {user?.name} {user?.lastName}
                  </p>
                  <p>{user?.username} · {user?.roleLabel}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Porter ───────────────────────────────────────────────────────────────────

function PorterOverview() {
  const { user } = useAuth()

  const results = useQueries({
    queries: [
      { queryKey: ['overview', 'packages'], queryFn: api.getPackages },
      { queryKey: ['overview', 'access'], queryFn: api.getAccessAudit },
      { queryKey: ['overview', 'visitors'], queryFn: api.getVisitors },
    ],
  })

  const packages = results[0].data ?? []
  const accessEntries = results[1].data ?? []
  const visitors = results[2].data ?? []

  const today = new Date().toISOString().slice(0, 10)
  const pendingPackages = packages.filter((p) => !p.delivered)
  const deliveredToday = packages.filter(
    (p) => p.delivered && p.deliveredTime?.slice(0, 10) === today,
  )
  const activeAccesses = accessEntries.filter((a) => !a.exitTime)
  const todayEntries = accessEntries.filter((a) => a.entryTime?.slice(0, 10) === today)
  const visitorsToday = visitors.filter((v) => v.createdAt?.slice(0, 10) === today)

  const recentAccesses = [...accessEntries]
    .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
    .slice(0, 5)

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Centro de control"
        title={`${user?.name ?? 'Portero'}, turno activo.`}
        description="Visión operativa de portería: accesos, paquetes y visitantes de hoy."
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            label="Accesos activos"
            value={activeAccesses.length}
            detail="Personas dentro del conjunto"
            icon={<DoorOpen className="size-5" />}
          />
          <KpiCard
            label="Entradas hoy"
            value={todayEntries.length}
            detail={`${visitorsToday.length} visitantes nuevos registrados`}
            icon={<Clock3 className="size-5" />}
          />
          <KpiCard
            label="Paquetes pendientes"
            value={pendingPackages.length}
            detail={`${deliveredToday.length} entregados hoy`}
            icon={<Package className="size-5" />}
          />
          <KpiCard
            label="Turno"
            value={user?.roleLabel ?? 'Portero'}
            detail={new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            icon={<UserRoundCheck className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Últimos accesos</CardTitle>
              <CardDescription>Los movimientos más recientes registrados en portería.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAccesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin registros de acceso aún.</p>
              ) : (
                recentAccesses.map((entry) => {
                  const who = entry.visitor
                    ? `${entry.visitor.name} ${entry.visitor.lastName} (visitante)`
                    : entry.resident
                      ? `${entry.resident.name} ${entry.resident.lastName} (residente)`
                      : 'Persona no identificada'
                  return (
                    <div
                      key={entry.id}
                      className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="break-words font-medium text-slate-950">{who}</p>
                        <Badge variant={entry.exitTime ? 'outline' : 'default'} className="shrink-0 text-xs">
                          {entry.exitTime ? 'Salió' : 'Adentro'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Entrada: {formatDate(entry.entryTime)}
                        {entry.exitTime ? ` · Salida: ${formatDate(entry.exitTime)}` : ''}
                      </p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Paquetes recientes</CardTitle>
                <CardDescription>Últimos paquetes recibidos sin entregar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {pendingPackages.length === 0 ? (
                  <p className="text-muted-foreground">Sin paquetes pendientes.</p>
                ) : (
                  pendingPackages.slice(0, 4).map((pkg) => (
                    <div
                      key={pkg.id}
                      className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3"
                    >
                      <p className="font-medium text-foreground">
                        {pkg.resident?.name} {pkg.resident?.lastName}
                      </p>
                      <p className="text-muted-foreground">
                        {pkg.description ?? 'Sin descripción'} · {formatDate(pkg.arrivalTime)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Sesión</CardTitle>
                <CardDescription>Identidad activa en este dispositivo.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="font-medium text-foreground">
                    {user?.name} {user?.lastName}
                  </p>
                  <p>{user?.username} · {user?.roleLabel}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pool attendant ───────────────────────────────────────────────────────────

function PoolOverview() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  const entriesQuery = useQuery({
    queryKey: ['overview', 'pool-entries'],
    queryFn: api.getPoolEntries,
  })
  const summaryQuery = useQuery({
    queryKey: ['overview', 'pool-summary', today],
    queryFn: () => api.getPoolSummary(today, today),
  })

  const allEntries = entriesQuery.data ?? []
  const todayEntries = allEntries.filter((e) => e.entryTime?.slice(0, 10) === today)
  const topResidents = getTopResidents(todayEntries)

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Centro de control"
        title={`${user?.name ?? 'Piscinero'}, área húmeda activa.`}
        description="Resumen operativo de hoy: entradas, invitados y residentes en piscina."
      />

      <div className="space-y-6 p-4 sm:p-6">
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <Badge className="w-fit">Hoy</Badge>
            <CardTitle>Resumen del día</CardTitle>
            <CardDescription>
              Actividad de piscina registrada el {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            label="Entradas"
            value={summaryQuery.data?.entriesInRange ?? 0}
            detail="Ingresos registrados hoy"
            icon={<Waves className="size-5" />}
          />
          <KpiCard
            label="Invitados"
            value={summaryQuery.data?.guestsInRange ?? 0}
            detail="Acompañantes contabilizados"
            icon={<UserRoundCheck className="size-5" />}
          />
          <KpiCard
            label="Residentes únicos"
            value={summaryQuery.data?.uniqueResidents ?? 0}
            detail="Residentes distintos hoy"
            icon={<Sparkles className="size-5" />}
          />
          <KpiCard
            label="Total histórico"
            value={allEntries.length}
            detail="Entradas desde el inicio"
            icon={<FileText className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Ranking de residentes hoy</CardTitle>
              <CardDescription>Quiénes más han usado la piscina en el día.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topResidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin entradas registradas hoy.</p>
              ) : (
                topResidents.map((resident, index) => (
                  <div
                    key={resident.name}
                    className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-950">
                        #{index + 1} · {resident.name}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {resident.count} {resident.count === 1 ? 'ingreso' : 'ingresos'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Últimas entradas</CardTitle>
                <CardDescription>Los registros más recientes del turno.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {todayEntries.length === 0 ? (
                  <p className="text-muted-foreground">Sin entradas hoy.</p>
                ) : (
                  [...todayEntries]
                    .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
                    .slice(0, 4)
                    .map((entry) => {
                      const names =
                        entry.residents && entry.residents.length > 0
                          ? entry.residents.map((r) => r.name).join(', ')
                          : 'Sin residente asignado'
                      return (
                        <div
                          key={entry.id}
                          className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3"
                        >
                          <p className="font-medium text-foreground">{names}</p>
                          <p className="text-muted-foreground">
                            {formatDate(entry.entryTime)} · {entry.guestCount} invitado{entry.guestCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )
                    })
                )}
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Sesión</CardTitle>
                <CardDescription>Identidad activa en este dispositivo.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="font-medium text-foreground">
                    {user?.name} {user?.lastName}
                  </p>
                  <p>{user?.username} · {user?.roleLabel}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        {label}
      </span>
      <strong className="text-foreground">{value}</strong>
    </div>
  )
}

function getTopResidents(
  entries: Array<{ residents?: Array<{ id: string; name: string; lastName: string }> }>,
) {
  const counter = entries.reduce<Record<string, number>>((acc, entry) => {
    const residents = entry.residents ?? []
    if (residents.length === 0) {
      acc['Sin residente'] = (acc['Sin residente'] ?? 0) + 1
      return acc
    }
    residents.forEach((r) => {
      const name = `${r.name} ${r.lastName}`
      acc[name] = (acc[name] ?? 0) + 1
    })
    return acc
  }, {})

  return Object.entries(counter)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
