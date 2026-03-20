import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Clock3 } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function ReservationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const reservationsQuery = useQuery({
    queryKey: ['reservations', user?.role],
    queryFn: () => api.getReservations(),
  })
  const statusesQuery = useQuery({
    queryKey: ['reservation-statuses'],
    queryFn: api.getReservationStatuses,
    enabled: Boolean(user),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      api.updateReservationStatus(id, { statusId }),
    onSuccess: () => {
      toast.success('Estado actualizado')
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
    onError: () => toast.error('No fue posible actualizar la reserva'),
  })

  const approvedStatus = statusesQuery.data?.find((item) => item.code === 'approved')
  const rejectedStatus = statusesQuery.data?.find((item) => item.code === 'rejected')
  const reservations = reservationsQuery.data ?? []

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Operacion"
        title="Reservas"
        description="Revisa, aprueba o rechaza reservas desde el panel operativo."
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Reservas"
            value={reservations.length}
            detail="Solicitudes registradas."
            icon={<ClipboardList className="size-5" />}
          />
          <KpiCard
            label="Pendientes"
            value={reservations.filter((reservation) => reservation.status?.code === 'pending').length}
            detail="Esperando decisión administrativa."
            icon={<Clock3 className="size-5" />}
          />
          <KpiCard
            label="Aprobadas"
            value={reservations.filter((reservation) => reservation.status?.code === 'approved').length}
            detail="Listas para ejecutarse."
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {reservations.map((reservation) => (
            <Card key={reservation.id} className="bg-white">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>{reservation.area?.name ?? 'Area comun'}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDate(reservation.reservationDate)} · {reservation.startTime} a {reservation.endTime}
                  </p>
                </div>
                <Badge>{reservation.status?.name ?? 'Sin estado'}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {reservation.resident?.name ?? `${user?.name} ${user?.lastName}`}
                  </p>
                  <p className="mt-1">{reservation.notesByResident ?? 'Sin comentario del residente'}</p>
                  {reservation.notesByAdministrator ? (
                    <p className="mt-2 text-slate-500">Nota admin: {reservation.notesByAdministrator}</p>
                  ) : null}
                </div>

                {user?.role === 'administrator' && reservation.status?.code === 'pending' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {approvedStatus ? (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate({ id: reservation.id, statusId: approvedStatus.id })}
                      >
                        Aprobar
                      </Button>
                    ) : null}
                    {rejectedStatus ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => approveMutation.mutate({ id: reservation.id, statusId: rejectedStatus.id })}
                      >
                        Rechazar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
