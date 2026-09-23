import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, PhoneCall, UserMinus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { CALL_QUEUE_QUERY_KEY } from '@/features/calls/call-queue'
import type { CallQueueItem } from '@/features/calls/types'
import { useCalls } from '@/features/calls/use-calls'
import { useAuth } from '@/hooks/use-auth-context'
import { api } from '@/lib/api'
import type { Apartment } from '@/types/api'

function waitingLabel(createdAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000))
  if (minutes < 1) return 'Hace menos de 1 min'
  return `Hace ${minutes} min`
}

function apartmentLabel(item: CallQueueItem) {
  if (!item.apartment) return 'Sin apartamento'
  const tower = item.apartment.tower ? `${item.apartment.tower.name} · ` : ''
  return `${tower}Apto ${item.apartment.number}`
}

export function CallQueuePage() {
  const { user } = useAuth()
  const { connection, call, incomingCall, startApartmentCall } = useCalls()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const { data: items = [], isLoading } = useQuery({
    queryKey: CALL_QUEUE_QUERY_KEY,
    // The API pushes every change through the 'calls:queue-updated' socket
    // event, so no polling is needed; refetches (reconnect, cancel) run silently.
    queryFn: () => api.getCallQueue({
      skipGlobalLoader: queryClient.getQueryData(CALL_QUEUE_QUERY_KEY) !== undefined,
    }),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelCallQueueEntry(id),
    onSuccess: () => {
      toast.success('Turno retirado; el residente fue notificado')
      void queryClient.invalidateQueries({ queryKey: CALL_QUEUE_QUERY_KEY })
    },
    onError: () => toast.error('No fue posible retirar el turno'),
  })

  const canCall = connection === 'connected' && !call && !incomingCall
  const groups = Array.from(
    items.reduce((map, item) => {
      const group = map.get(item.employee.id) ?? { employee: item.employee, items: [] as CallQueueItem[] }
      group.items.push(item)
      map.set(item.employee.id, group)
      return map
    }, new Map<string, { employee: CallQueueItem['employee']; items: CallQueueItem[] }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => Number(b.employee.id === user?.id) - Number(a.employee.id === user?.id))

  const callBack = async (item: CallQueueItem) => {
    if (!item.apartment) return
    try {
      await startApartmentCall({
        id: item.apartment.id,
        number: item.apartment.number,
        towerId: item.apartment.tower?.id ?? '',
        tower: item.apartment.tower?.code ?? null,
        createdAt: item.createdAt,
      } as Apartment)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible iniciar la llamada')
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Operación"
        title="Fila de espera"
        description="Residentes que llamaron mientras portería estaba ocupada. Devuélveles la llamada en orden; al conectar, el turno se cierra solo."
      />

      <div className="space-y-4 px-4 sm:px-6">
        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Cargando fila…</CardContent>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No hay residentes esperando</p>
              <p className="text-xs text-muted-foreground">Cuando alguien llame y portería esté ocupada, aparecerá aquí.</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.employee.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>
                    {group.employee.id === user?.id ? 'Mi fila' : `Fila de ${group.employee.name} ${group.employee.lastName}`}
                  </CardTitle>
                  <CardDescription>{group.items.length} en espera</CardDescription>
                </div>
                {group.employee.id === user?.id ? <StatusBadge label="Tú" variant="blue" /> : null}
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold tabular-nums">
                        {item.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{apartmentLabel(item)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.resident.name} {item.resident.lastName}
                          {item.resident.phone ? ` · ${item.resident.phone}` : ''}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {waitingLabel(item.createdAt, now)}
                      </span>
                      <div className="flex gap-2">
                        {group.employee.id === user?.id && item.apartment ? (
                          <Button size="sm" disabled={!canCall} onClick={() => void callBack(item)}>
                            <PhoneCall className="size-3.5" />
                            Llamar
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate(item.id)}
                        >
                          <UserMinus className="size-3.5" />
                          Quitar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
