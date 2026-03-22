import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Clock3 } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge, type StatusVariant } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Reservation } from '@/types/api'

function reservationStatusVariant(code?: string): StatusVariant {
  if (code === 'approved') return 'green'
  if (code === 'rejected') return 'red'
  if (code === 'pending') return 'amber'
  return 'slate'
}

function ReservationActions({ reservation, statuses }: { reservation: Reservation; statuses: { id: string; code?: string; name: string }[] }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (statusId: string) => api.updateReservationStatus(reservation.id, { statusId }),
    onSuccess: () => {
      toast.success('Estado actualizado')
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
    onError: () => toast.error('No fue posible actualizar la reserva'),
  })

  const getStatusId = (code: string) => statuses.find((s) => s.code === code)?.id
  const code = reservation.status?.code

  const actions: { label: string; code: string; variant?: 'secondary' | 'outline' }[] = []
  if (code === 'pending') {
    actions.push({ label: 'Aprobar', code: 'approved' })
    actions.push({ label: 'Rechazar', code: 'rejected', variant: 'secondary' })
  } else if (code === 'approved') {
    actions.push({ label: 'Rechazar', code: 'rejected', variant: 'secondary' })
    actions.push({ label: 'Cancelar', code: 'cancelled', variant: 'outline' })
  } else if (code === 'rejected') {
    actions.push({ label: 'Aprobar', code: 'approved' })
    actions.push({ label: 'Cancelar', code: 'cancelled', variant: 'outline' })
  } else if (code === 'cancelled') {
    actions.push({ label: 'Reabrir', code: 'pending' })
    actions.push({ label: 'Aprobar', code: 'approved' })
  }

  if (actions.length === 0) return null

  return (
    <div className="flex justify-end gap-1.5">
      {actions.map((action) => (
        <Button
          key={action.code}
          size="sm"
          variant={action.variant ?? 'default'}
          className="h-7 text-xs"
          onClick={() => {
            const statusId = getStatusId(action.code)
            if (statusId) mutation.mutate(statusId)
          }}
          disabled={mutation.isPending || !getStatusId(action.code)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

export function ReservationsPage() {
  const { user } = useAuth()

  const reservationsQuery = useQuery({
    queryKey: ['reservations', user?.role],
    queryFn: () => api.getReservations(),
  })
  const statusesQuery = useQuery({
    queryKey: ['reservation-statuses'],
    queryFn: api.getReservationStatuses,
    enabled: Boolean(user),
  })

  const statuses = statusesQuery.data ?? []
  const reservations = useMemo(
    () => [...(reservationsQuery.data ?? [])].sort((a, b) => a.reservationDate.localeCompare(b.reservationDate)),
    [reservationsQuery.data],
  )
  const isAdmin = user?.role === 'administrator'

  const statusFilterOptions = statuses.map((s) => ({ value: s.code ?? s.id, label: s.name }))

  const filters: FilterDef[] = [
    {
      key: 'status',
      placeholder: 'Estado',
      options: statusFilterOptions,
    },
    {
      key: 'reservationDate',
      type: 'period',
      placeholder: 'Período',
      options: [
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Última semana' },
        { value: 'month', label: 'Último mes' },
        { value: 'quarter', label: 'Últimos 3 meses' },
      ],
    },
  ]

  const columns: ColumnDef<Reservation>[] = [
    {
      header: 'Área',
      cell: (row) => <span className="font-medium text-slate-900">{row.area?.name ?? 'Área común'}</span>,
    },
    {
      header: 'Residente',
      cell: (row) =>
        row.resident ? (
          <span className="text-slate-600">
            {row.resident.name} {row.resident.lastName}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: 'Fecha',
      cell: (row) => <span className="whitespace-nowrap text-slate-600">{formatDate(row.reservationDate)}</span>,
    },
    {
      header: 'Horario',
      cell: (row) => (
        <span className="whitespace-nowrap text-slate-500 text-xs">
          {row.startTime} – {row.endTime}
        </span>
      ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.status?.name ?? 'Sin estado'}
          variant={reservationStatusVariant(row.status?.code)}
        />
      ),
    },
    ...(isAdmin
      ? [
          {
            header: 'Acciones',
            className: 'text-right',
            cell: (row: Reservation) => <ReservationActions reservation={row} statuses={statuses} />,
          } satisfies ColumnDef<Reservation>,
        ]
      : []),
  ]

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Operacion"
        title="Reservas"
        description="Revisa, aprueba o rechaza reservas desde el panel operativo."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Reservas"
            value={reservations.length}
            detail="Solicitudes registradas."
            icon={<ClipboardList className="size-5" />}
          />
          <KpiCard
            label="Pendientes"
            value={reservations.filter((r) => r.status?.code === 'pending').length}
            detail="Esperando decisión administrativa."
            icon={<Clock3 className="size-5" />}
          />
          <KpiCard
            label="Aprobadas"
            value={reservations.filter((r) => r.status?.code === 'approved').length}
            detail="Listas para ejecutarse."
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>

        <DataTable
          data={reservations}
          columns={columns}
          searchPlaceholder="Buscar área o residente..."
          getSearchText={(row) =>
            [row.area?.name, row.resident?.name, row.resident?.lastName, row.notesByResident]
              .filter(Boolean)
              .join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            status: row.status?.code ?? '',
            reservationDate: row.reservationDate,
          })}
          isLoading={reservationsQuery.isLoading}
          emptyMessage="Sin reservas registradas."
        />
      </div>
    </div>
  )
}
