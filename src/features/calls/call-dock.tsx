import { Minimize2, Mic, MicOff, PhoneCall, PhoneOff, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCalls } from '@/features/calls/use-calls'
import { useAuth } from '@/hooks/use-auth-context'
import { cn } from '@/lib/utils'

function phaseLabel(call: NonNullable<ReturnType<typeof useCalls>['call']>) {
  switch (call.phase) {
    case 'requesting-media':
      return 'Solicitando microfono'
    case 'ringing':
      return call.session?.direction === 'internal' ? 'Llamando a portería' : 'Llamando al apartamento'
    case 'connecting':
      return 'Conectando audio'
    case 'active':
      return 'Llamada activa'
    case 'ending':
      return 'Finalizando'
    case 'error':
      return 'Error en la llamada'
    default:
      return 'Llamada'
  }
}

export function CallDock() {
  const { user } = useAuth()
  const {
    call,
    incomingCall,
    minimized,
    setMinimized,
    endCall,
    toggleMute,
    connection,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useCalls()

  if (!call && !incomingCall) {
    return null
  }

  if (!call && incomingCall) {
    const session = incomingCall.session
    const callerName =
      session.direction === 'internal'
        ? session.initiatedByEmployee
          ? `${session.initiatedByEmployee.name} ${session.initiatedByEmployee.lastName}`
          : 'Portería'
        : session.initiatedByResident
          ? `${session.initiatedByResident.name} ${session.initiatedByResident.lastName}`
          : 'Residente'
    const subtitle =
      session.direction === 'internal'
        ? 'Llamada interna de portería'
        : session.apartment
          ? `${session.apartment.tower?.name ?? 'Torre'} · Apt. ${session.apartment.number}`
          : 'Llamada desde la app móvil'

    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2">
        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-amber-200 bg-white/95 shadow-2xl backdrop-blur">
          <div className="space-y-4 p-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-500">
                Llamada entrante
              </p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">{callerName}</p>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <Radio className={cn('size-3.5', connection === 'connected' ? 'text-emerald-500' : 'text-amber-500')} />
              Canal tiempo real {connection === 'connected' ? 'conectado' : 'reconectando'}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={rejectIncomingCall}
              >
                <PhoneOff className="size-4" />
                Rechazar
              </Button>

              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  void acceptIncomingCall().catch((error) => {
                    toast.error(error instanceof Error ? error.message : 'No fue posible contestar la llamada')
                  })
                }}
              >
                <PhoneCall className="size-4" />
                Contestar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!call) {
    return null
  }

  const session = call.session
  const towerName = session?.apartment?.tower?.name ?? call.apartment?.towerData?.name ?? 'Intercom'
  const apartmentNumber = session?.apartment?.number ?? call.apartment?.number ?? '—'
  const internalPeerName =
    session && session.direction === 'internal'
      ? session.initiatedByEmployeeId === user?.id
        ? session.acceptedByEmployee
          ? `${session.acceptedByEmployee.name} ${session.acceptedByEmployee.lastName}`
          : null
        : session.initiatedByEmployee
          ? `${session.initiatedByEmployee.name} ${session.initiatedByEmployee.lastName}`
          : null
      : null
  const residentPeerName =
    session && session.direction === 'inbound'
      ? session.initiatedByResident
        ? `${session.initiatedByResident.name} ${session.initiatedByResident.lastName}`
        : 'Residente'
      : session?.acceptedByResident
        ? `${session.acceptedByResident.name} ${session.acceptedByResident.lastName}`
        : null

  const title = session && session.direction === 'internal' ? 'Línea interna' : `${towerName} · Apt. ${apartmentNumber}`
  const peerLabel =
    session && session.direction === 'internal'
      ? internalPeerName
        ? `Con ${internalPeerName}`
        : 'Esperando que otro portero conteste'
      : session && session.direction === 'inbound'
        ? 'Llamada desde la app móvil'
        : residentPeerName
          ? `Atiende ${residentPeerName}`
          : null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2">
      <div
        className={cn(
          'pointer-events-auto overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur',
          minimized && 'w-auto self-end',
        )}
      >
        {minimized ? (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="flex items-center gap-2 px-4 py-3 text-left"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <PhoneCall className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{phaseLabel(call)}</p>
            </div>
          </button>
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {session?.direction === 'internal' ? 'Portería' : 'Intercom'}
                </p>
                <p className="mt-1 truncate text-lg font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{phaseLabel(call)}</p>
                {peerLabel ? (
                  <p className="mt-1 text-xs font-medium text-emerald-600">{peerLabel}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="Minimizar llamada"
              >
                <Minimize2 className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <Radio className={cn('size-3.5', connection === 'connected' ? 'text-emerald-500' : 'text-amber-500')} />
              Canal tiempo real {connection === 'connected' ? 'conectado' : 'reconectando'}
              {call.rejectedCount > 0 ? (
                <span className="ml-auto text-slate-400">
                  {call.rejectedCount} rechazo{call.rejectedCount !== 1 ? 's' : ''}
                </span>
              ) : null}
            </div>

            {call.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {call.error}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={call.phase === 'requesting-media' || call.phase === 'ending'}
                onClick={toggleMute}
              >
                {call.muted ? (
                  <>
                    <MicOff className="size-4" />
                    Activar microfono
                  </>
                ) : (
                  <>
                    <Mic className="size-4" />
                    Silenciar
                  </>
                )}
              </Button>

              <Button
                type="button"
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                disabled={call.phase === 'ending'}
                onClick={() => endCall()}
              >
                <PhoneOff className="size-4" />
                Colgar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
