import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock3, PhoneCall, PhoneOff, Radio } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { useCalls } from '@/features/calls/use-calls'
import type { CallSessionPayload } from '@/features/calls/types'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

function getStatusMeta(status: CallSessionPayload['status']) {
  switch (status) {
    case 'active':
      return { label: 'Activa', variant: 'red' as const }
    case 'ringing':
      return { label: 'Timbrando', variant: 'amber' as const }
    case 'ended':
      return { label: 'Finalizada', variant: 'green' as const }
    case 'missed':
      return { label: 'Perdida', variant: 'slate' as const }
    case 'rejected':
      return { label: 'Rechazada', variant: 'red' as const }
    default:
      return { label: status, variant: 'slate' as const }
  }
}

function getDirectionLabel(call: CallSessionPayload) {
  switch (call.direction) {
    case 'outbound':
      return 'Portería -> residente'
    case 'inbound':
      return 'Residente -> portería'
    case 'internal':
      return 'Portería interna'
    default:
      return 'Llamada'
  }
}

function getInitiatorLabel(call: CallSessionPayload) {
  if (call.initiatedByEmployee) {
    return `${call.initiatedByEmployee.name} ${call.initiatedByEmployee.lastName}`
  }
  if (call.initiatedByResident) {
    return `${call.initiatedByResident.name} ${call.initiatedByResident.lastName}`
  }
  return 'Sin dato'
}

function getAnsweredByLabel(call: CallSessionPayload) {
  if (call.acceptedByEmployee) {
    return `${call.acceptedByEmployee.name} ${call.acceptedByEmployee.lastName}`
  }
  if (call.acceptedByResident) {
    return `${call.acceptedByResident.name} ${call.acceptedByResident.lastName}`
  }
  return 'Sin respuesta'
}

function getCallDetail(call: CallSessionPayload) {
  if (call.direction === 'internal') {
    return call.acceptedByEmployee
      ? `Con ${call.acceptedByEmployee.name} ${call.acceptedByEmployee.lastName}`
      : 'Llamada interna entre porteros'
  }

  if (call.direction === 'inbound') {
    const resident = call.initiatedByResident
      ? `${call.initiatedByResident.name} ${call.initiatedByResident.lastName}`
      : 'Residente'
    const apartment = call.apartment
      ? `${call.apartment.tower?.name ?? 'Torre'} · Apt. ${call.apartment.number}`
      : 'Sin apartamento asociado'
    return `${resident} · ${apartment}`
  }

  const apartment = call.apartment
    ? `${call.apartment.tower?.name ?? 'Torre'} · Apt. ${call.apartment.number}`
    : 'Sin apartamento asociado'
  const resident = call.acceptedByResident
    ? ` · ${call.acceptedByResident.name} ${call.acceptedByResident.lastName}`
    : ''
  return `${apartment}${resident}`
}

function getEndedReasonLabel(reason: string | null) {
  switch (reason) {
    case 'completed':
      return 'Completada'
    case 'cancelled':
      return 'Cancelada'
    case 'timeout':
      return 'Sin respuesta'
    case 'rejected':
      return 'Rechazada'
    default:
      return reason ?? 'Sin motivo'
  }
}

function getDurationLabel(call: CallSessionPayload) {
  if (!call.acceptedAt || !call.endedAt) {
    return 'Sin duración'
  }

  const seconds = Math.max(
    0,
    Math.round((new Date(call.endedAt).getTime() - new Date(call.acceptedAt).getTime()) / 1000),
  )
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`
}

function getTraceLevelMeta(level: 'info' | 'warn' | 'error') {
  if (level === 'error') {
    return { label: 'Error', className: 'bg-rose-50 text-rose-700 border-rose-200' }
  }
  if (level === 'warn') {
    return { label: 'Warning', className: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
  return { label: 'Info', className: 'bg-slate-50 text-slate-700 border-slate-200' }
}

function getSourceLabel(source: 'api' | 'web' | 'mobile') {
  if (source === 'api') return 'API'
  if (source === 'mobile') return 'Móvil'
  return 'Web'
}

function CallTraceDialog({ call }: { call: CallSessionPayload }) {
  const timeline = call.timeline ?? []
  const last = timeline[timeline.length - 1]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          {timeline.length > 0 ? `Ver traza (${timeline.length})` : 'Sin traza'}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,760px)]">
        <DialogHeader>
          <DialogTitle>Traza técnica de llamada</DialogTitle>
          <DialogDescription>
            {getDirectionLabel(call)} · {formatDate(call.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {timeline.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay eventos de depuración para esta llamada.</p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {timeline.map((event) => {
              const level = getTraceLevelMeta(event.level)
              return (
                <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', level.className)}>
                      {level.label}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                      {getSourceLabel(event.source)}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDate(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{event.message}</p>
                  <p className="mt-1 text-xs text-slate-500">Etapa: {event.stage}</p>
                </div>
              )
            })}
          </div>
        )}

        {last ? (
          <p className="text-xs text-slate-500">
            Último evento: {last.message}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function CallHistoryPage() {
  const { porters } = useCalls()

  const historyQuery = useQuery({
    queryKey: ['call-history'],
    queryFn: api.getCallHistory,
    refetchInterval: 15_000,
  })

  const calls = historyQuery.data ?? []
  const activeCalls = calls.filter((call) => call.status === 'active' || call.status === 'ringing')
  const missedCalls = calls.filter((call) => call.status === 'missed').length
  const internalCalls = calls.filter((call) => call.direction === 'internal').length
  const callsToday = calls.filter((call) => {
    const created = new Date(call.createdAt)
    const now = new Date()
    return created.toDateString() === now.toDateString()
  }).length

  const filters: FilterDef[] = [
    {
      key: 'status',
      placeholder: 'Estado',
      options: [
        { value: 'ringing', label: 'Timbrando' },
        { value: 'active', label: 'Activa' },
        { value: 'ended', label: 'Finalizada' },
        { value: 'missed', label: 'Perdida' },
        { value: 'rejected', label: 'Rechazada' },
      ],
    },
    {
      key: 'direction',
      placeholder: 'Tipo',
      options: [
        { value: 'outbound', label: 'Portería -> residente' },
        { value: 'inbound', label: 'Residente -> portería' },
        { value: 'internal', label: 'Portería interna' },
      ],
    },
    {
      key: 'createdAt',
      placeholder: 'Período',
      type: 'period',
      options: [
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Última semana' },
        { value: 'month', label: 'Último mes' },
        { value: 'quarter', label: 'Últimos 3 meses' },
      ],
    },
  ]

  const columns: ColumnDef<CallSessionPayload>[] = useMemo(() => [
    {
      header: 'Fecha',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{formatDate(row.createdAt)}</p>
          <p className="mt-0.5 text-xs text-slate-400">Fin: {formatDate(row.endedAt ?? row.acceptedAt ?? row.createdAt)}</p>
        </div>
      ),
    },
    {
      header: 'Tipo',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{getDirectionLabel(row)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{getCallDetail(row)}</p>
        </div>
      ),
    },
    {
      header: 'Iniciada por',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{getInitiatorLabel(row)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{row.initiatedByEmployee ? 'Empleado' : 'Residente'}</p>
        </div>
      ),
    },
    {
      header: 'Atendida por',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{getAnsweredByLabel(row)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{getDurationLabel(row)}</p>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (row) => {
        const meta = getStatusMeta(row.status)
        return (
          <div className="space-y-1.5">
            <StatusBadge label={meta.label} variant={meta.variant} />
            <p className="text-xs text-slate-400">{getEndedReasonLabel(row.endedReason)}</p>
          </div>
        )
      },
      className: 'w-[150px]',
    },
    {
      header: 'Traza',
      cell: (row) => <CallTraceDialog call={row} />,
      className: 'w-[160px]',
    },
  ], [])

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Administración"
        title="Historial de Llamadas"
        description="Seguimiento de llamadas entre portería y residentes, además de la línea interna entre porteros."
      />

      <div className="grid gap-4 px-4 sm:px-6 xl:grid-cols-4">
        <KpiCard
          label="Hoy"
          value={callsToday}
          detail="Llamadas creadas hoy."
          icon={<Clock3 className="size-4" />}
        />
        <KpiCard
          label="En curso"
          value={activeCalls.length}
          detail="Llamadas activas o timbrando."
          icon={<Radio className="size-4" />}
        />
        <KpiCard
          label="Internas"
          value={internalCalls}
          detail="Histórico de llamadas entre porteros."
          icon={<PhoneCall className="size-4" />}
        />
        <KpiCard
          label="Perdidas"
          value={missedCalls}
          detail="Llamadas que no fueron contestadas."
          icon={<PhoneOff className="size-4" />}
        />
      </div>

      <div className="px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Estado en vivo de portería</CardTitle>
            <CardDescription>Disponibilidad actual de cada portero conectada al canal de llamadas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {porters.length === 0 ? (
              <p className="text-sm text-slate-400">Sin porteros configurados.</p>
            ) : (
              porters.map((porter) => (
                <div
                  key={porter.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {porter.name} {porter.lastName}
                      </p>
                      <p className="text-xs text-slate-400">@{porter.username}</p>
                    </div>
                    <StatusBadge
                      label={porter.available ? 'Disponible' : 'Ocupado'}
                      variant={porter.available ? 'green' : 'red'}
                    />
                  </div>
                  <p className={cn('mt-3 text-sm', porter.available ? 'text-emerald-700' : 'text-slate-600')}>
                    {porter.currentCall
                      ? porter.currentCall.withType === 'apartment'
                        ? porter.currentCall.withLabel
                        : `Con ${porter.currentCall.withLabel}`
                      : 'Sin llamadas activas'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {porter.currentCall
                      ? porter.currentCall.direction === 'internal'
                        ? 'Llamada interna'
                        : porter.currentCall.direction === 'inbound'
                          ? 'Atendiendo a un residente'
                          : 'Llamando a un residente'
                      : 'Listo para recibir llamadas'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <DataTable
          data={calls}
          columns={columns}
          searchPlaceholder="Buscar por portero, residente o apartamento..."
          getSearchText={(row) => [
            getInitiatorLabel(row),
            getAnsweredByLabel(row),
            getCallDetail(row),
            getDirectionLabel(row),
            row.endedReason ?? '',
            ...(row.timeline ?? []).flatMap((event) => [event.stage, event.message]),
          ].join(' ')}
          filters={filters}
          getFilterValues={(row) => ({
            status: row.status,
            direction: row.direction,
            createdAt: row.createdAt,
          })}
          emptyMessage="Sin llamadas registradas."
          isLoading={historyQuery.isLoading}
        />
      </div>
    </div>
  )
}
