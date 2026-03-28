import { PhoneCall, Radio, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { useCalls } from '@/features/calls/use-calls'
import { useAuth } from '@/hooks/use-auth-context'
import { cn } from '@/lib/utils'

export function PorterLinesPage() {
  const { user } = useAuth()
  const { connection, call, incomingCall, porters, startPorterCall } = useCalls()

  const peers = porters.filter((porter) => porter.id !== user?.id)
  const availablePeers = peers.filter((porter) => porter.available).length
  const hasActiveCall = Boolean(call || incomingCall)

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Operación"
        title="Portería Interna"
        description="Llama a otro portero disponible. Cada portero solo puede atender una llamada al tiempo."
      />

      <div className="grid gap-4 px-4 sm:px-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Canal en tiempo real</CardTitle>
            <CardDescription>Estado actual de la conexión para llamadas internas.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex size-3 rounded-full',
                connection === 'connected' ? 'bg-emerald-500' : 'bg-rose-500',
              )}
            />
            <div>
              <p className="text-sm font-medium text-slate-900">
                {connection === 'connected' ? 'Conectado' : 'Desconectado'}
              </p>
              <p className="text-xs text-slate-500">
                {connection === 'connected'
                  ? 'La línea interna está lista para llamar'
                  : 'No se pueden iniciar llamadas ahora mismo'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Porteros disponibles</CardTitle>
            <CardDescription>Solo se muestran otros porteros distintos de tu usuario.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-950">{availablePeers}</p>
            <p className="mt-1 text-sm text-slate-500">
              de {peers.length} línea{peers.length !== 1 ? 's' : ''} interna{peers.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tu estado</CardTitle>
            <CardDescription>Mientras estés ocupado no podrás iniciar ni recibir otra llamada.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <ShieldCheck className={cn('size-8', hasActiveCall ? 'text-amber-500' : 'text-emerald-500')} />
            <div>
              <p className="text-sm font-medium text-slate-900">{hasActiveCall ? 'En llamada' : 'Disponible'}</p>
              <p className="text-xs text-slate-500">
                {hasActiveCall ? 'Termina la llamada actual para usar otra línea' : 'Puedes llamar o contestar'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 pb-6 sm:px-6 xl:grid-cols-2">
        {peers.length === 0 ? (
          <Card className="xl:col-span-2">
            <CardContent className="py-8 text-center">
              <p className="text-sm font-medium text-slate-900">No hay otros porteros configurados.</p>
              <p className="mt-1 text-sm text-slate-500">
                Crea otro usuario con rol portero para habilitar llamadas internas.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {peers.map((porter) => {
          const disabled =
            !porter.available ||
            hasActiveCall ||
            connection !== 'connected'

          return (
            <Card key={porter.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      {porter.name} {porter.lastName}
                    </CardTitle>
                    <CardDescription>@{porter.username}</CardDescription>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    <span
                      className={cn(
                        'inline-flex size-2.5 rounded-full',
                        porter.available ? 'bg-emerald-500' : 'bg-rose-500',
                      )}
                    />
                    {porter.available ? 'Disponible' : 'Ocupado'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Radio className={cn('size-3.5', porter.available ? 'text-emerald-500' : 'text-rose-500')} />
                    {porter.available
                      ? 'Puede recibir una llamada interna ahora'
                      : 'Está atendiendo otra llamada'}
                  </div>
                </div>

                {porter.currentCall ? (
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Estado actual
                      </p>
                      <StatusBadge
                        label={porter.currentCall.status === 'active' ? 'En llamada' : 'Timbrando'}
                        variant={porter.currentCall.status === 'active' ? 'red' : 'amber'}
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {porter.currentCall.withType === 'resident'
                        ? `Con ${porter.currentCall.withLabel}`
                        : porter.currentCall.withType === 'employee'
                          ? `Con ${porter.currentCall.withLabel}`
                          : porter.currentCall.withLabel}
                    </p>
                    <p className="text-xs text-slate-500">
                      {porter.currentCall.direction === 'internal'
                        ? 'Llamada interna entre porteros'
                        : porter.currentCall.direction === 'inbound'
                          ? 'Atendiendo llamada desde la app móvil'
                          : 'Llamada saliente a residente'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="text-sm font-medium text-emerald-800">Sin llamadas activas</p>
                    <p className="mt-1 text-xs text-emerald-700">
                      La línea está libre para recibir o iniciar una llamada.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  className="w-full"
                  disabled={disabled}
                  onClick={() => {
                    void startPorterCall(porter.id).catch((error) => {
                      toast.error(error instanceof Error ? error.message : 'No fue posible iniciar la llamada')
                    })
                  }}
                >
                  <PhoneCall className="size-4" />
                  Llamar
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
