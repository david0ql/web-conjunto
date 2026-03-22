import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Package, DoorOpen, Users, ArrowLeft, ChevronRight } from 'lucide-react'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Apartment, Tower } from '@/types/api'

// ─── Cache config ─────────────────────────────────────────────────────────────

const STALE_5MIN = 5 * 60 * 1000
const STALE_1MIN = 60 * 1000

// ─── Tower palette ────────────────────────────────────────────────────────────

const PALETTE = [
  {
    header: 'bg-indigo-600',
    cell: 'bg-white border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200',
    occupied: 'bg-indigo-100 border-indigo-300 hover:bg-indigo-150',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-500',
    legend: 'bg-indigo-500',
    actionBg: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    actionText: 'text-indigo-700',
    actionIcon: 'text-indigo-400',
  },
  {
    header: 'bg-emerald-600',
    cell: 'bg-white border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200',
    occupied: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-150',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500',
    legend: 'bg-emerald-500',
    actionBg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    actionText: 'text-emerald-700',
    actionIcon: 'text-emerald-400',
  },
  {
    header: 'bg-amber-500',
    cell: 'bg-white border-amber-100 hover:bg-amber-50 hover:border-amber-200',
    occupied: 'bg-amber-100 border-amber-300 hover:bg-amber-150',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500',
    legend: 'bg-amber-500',
    actionBg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    actionText: 'text-amber-700',
    actionIcon: 'text-amber-400',
  },
  {
    header: 'bg-rose-600',
    cell: 'bg-white border-rose-100 hover:bg-rose-50 hover:border-rose-200',
    occupied: 'bg-rose-100 border-rose-300 hover:bg-rose-150',
    dot: 'bg-rose-500',
    ring: 'ring-rose-500',
    legend: 'bg-rose-500',
    actionBg: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
    actionText: 'text-rose-700',
    actionIcon: 'text-rose-400',
  },
  {
    header: 'bg-cyan-600',
    cell: 'bg-white border-cyan-100 hover:bg-cyan-50 hover:border-cyan-200',
    occupied: 'bg-cyan-100 border-cyan-300 hover:bg-cyan-150',
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-500',
    legend: 'bg-cyan-500',
    actionBg: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100',
    actionText: 'text-cyan-700',
    actionIcon: 'text-cyan-400',
  },
  {
    header: 'bg-violet-600',
    cell: 'bg-white border-violet-100 hover:bg-violet-50 hover:border-violet-200',
    occupied: 'bg-violet-100 border-violet-300 hover:bg-violet-150',
    dot: 'bg-violet-500',
    ring: 'ring-violet-500',
    legend: 'bg-violet-500',
    actionBg: 'bg-violet-50 border-violet-200 hover:bg-violet-100',
    actionText: 'text-violet-700',
    actionIcon: 'text-violet-400',
  },
]

function palette(idx: number) {
  return PALETTE[idx % PALETTE.length]
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const notifySchema = z.object({
  notificationTypeId: z.string().uuid('Selecciona un tipo'),
  message: z.string().min(4, 'Mínimo 4 caracteres'),
})

const pkgSchema = z.object({
  residentId: z.string().optional().or(z.literal('')),
  description: z.string().max(300).optional().or(z.literal('')),
})

// ─── Apartment cell ───────────────────────────────────────────────────────────

function AptCell({
  apt,
  color,
  isSelected,
  pendingPkgs,
  unreadNotifs,
  onClick,
}: {
  apt: Apartment
  color: (typeof PALETTE)[number]
  isSelected: boolean
  pendingPkgs: number
  unreadNotifs: number
  onClick: () => void
}) {
  const occupied = (apt.residentCount ?? 0) > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border text-center',
        'w-16 h-14 shrink-0 cursor-pointer select-none transition-all duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        occupied ? color.occupied : color.cell,
        isSelected && `ring-2 ring-offset-1 ${color.ring} shadow-md scale-105 z-10`,
        !isSelected && 'hover:scale-[1.04] hover:shadow-sm hover:z-10',
      )}
    >
      <span
        className={cn(
          'text-xs font-bold leading-tight tracking-tight',
          occupied ? 'text-slate-800' : 'text-slate-400',
        )}
      >
        {apt.number}
      </span>

      <span
        className={cn(
          'mt-1 size-1.5 rounded-full',
          occupied ? color.dot : 'bg-slate-200',
        )}
      />

      {(pendingPkgs > 0 || unreadNotifs > 0) && (
        <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
          {pendingPkgs > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white shadow-sm ring-1 ring-white">
              {pendingPkgs > 9 ? '9+' : pendingPkgs}
            </span>
          )}
          {unreadNotifs > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white shadow-sm ring-1 ring-white">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Apt detail dialog ────────────────────────────────────────────────────────

type DialogView = 'info' | 'notify' | 'package'

function AptDetailDialog({
  open,
  onClose,
  apartment,
  tower,
  towerIdx,
  pendingPkgs,
  unreadNotifs,
  isAdmin,
}: {
  open: boolean
  onClose: () => void
  apartment: Apartment
  tower: Tower
  towerIdx: number
  pendingPkgs: number
  unreadNotifs: number
  isAdmin: boolean
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [view, setView] = useState<DialogView>('info')
  const color = palette(towerIdx)

  // Reset view when dialog closes
  useEffect(() => {
    if (!open) setView('info')
  }, [open])

  // Residents in this apartment
  const residentsQuery = useQuery({
    queryKey: ['residents', { apartmentId: apartment.id }],
    queryFn: () => api.getResidents({ apartmentId: apartment.id }),
    enabled: open,
    staleTime: STALE_1MIN,
  })
  const residents = residentsQuery.data ?? []

  // Notification types (only when notify view is active)
  const notifTypesQuery = useQuery({
    queryKey: ['notification-types'],
    queryFn: api.getNotificationTypes,
    enabled: open && view === 'notify',
    staleTime: STALE_5MIN,
  })
  const notifTypes = notifTypesQuery.data ?? []

  // ── Notify form ──
  const notifyForm = useForm<z.infer<typeof notifySchema>>({
    resolver: zodResolver(notifySchema),
    defaultValues: { notificationTypeId: '', message: '' },
  })
  const selectedTypeId = useWatch({ control: notifyForm.control, name: 'notificationTypeId' })

  const notifyMutation = useMutation({
    mutationFn: () =>
      api.createNotification({
        apartmentId: apartment.id,
        notificationTypeId: notifyForm.getValues('notificationTypeId'),
        message: notifyForm.getValues('message'),
      }),
    onSuccess: () => {
      toast.success('Notificación enviada')
      notifyForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      onClose()
    },
    onError: () => toast.error('No fue posible enviar la notificación'),
  })

  // ── Package form ──
  const pkgForm = useForm<z.infer<typeof pkgSchema>>({
    resolver: zodResolver(pkgSchema),
    defaultValues: { residentId: '', description: '' },
  })
  const selectedResidentId = useWatch({ control: pkgForm.control, name: 'residentId' })

  const pkgMutation = useMutation({
    mutationFn: () => {
      const residentId = pkgForm.getValues('residentId')
      const description = pkgForm.getValues('description')
      return api.createPackage({
        apartmentId: apartment.id,
        ...(residentId ? { residentId } : {}),
        ...(description ? { description } : {}),
      })
    },
    onSuccess: () => {
      toast.success('Paquete registrado')
      pkgForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
      onClose()
    },
    onError: () => toast.error('No fue posible registrar el paquete'),
  })

  const occupied = residents.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="w-[min(96vw,480px)] p-0 overflow-hidden gap-0">
        {/* Colored header */}
        <div className={cn('px-5 py-4', color.header)}>
          {view !== 'info' && (
            <button
              type="button"
              onClick={() => setView('info')}
              className="mb-2 flex items-center gap-1 text-xs text-white/70 hover:text-white transition"
            >
              <ArrowLeft className="size-3" />
              Volver
            </button>
          )}
          <DialogHeader>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
              {tower.name}
            </p>
            <DialogTitle className="text-2xl font-bold text-white mt-0.5">
              Apt. {apartment.number}
            </DialogTitle>
            <DialogDescription className="text-white/60 text-xs">
              Piso {apartment.floor ?? '—'} ·{' '}
              {occupied ? `${residents.length} residente${residents.length !== 1 ? 's' : ''}` : 'Sin residentes'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* ── Info view ── */}
          {view === 'info' && (
            <div className="space-y-5">
              {/* Residents */}
              {residentsQuery.isLoading ? (
                <p className="text-sm text-slate-400">Cargando residentes...</p>
              ) : residents.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Residentes
                  </p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                    {residents.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className={cn('size-2 rounded-full shrink-0', color.dot)} />
                        <span className="text-sm text-slate-800 font-medium">
                          {r.name} {r.lastName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-4 text-center">
                  <p className="text-xs text-slate-400">Sin residentes asignados</p>
                </div>
              )}

              {/* Pending indicators */}
              {(pendingPkgs > 0 || unreadNotifs > 0) && (
                <div className="flex gap-2">
                  {pendingPkgs > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                      <Package className="size-3.5 text-amber-500" />
                      {pendingPkgs} sin entregar
                    </div>
                  )}
                  {unreadNotifs > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                      <Bell className="size-3.5 text-blue-500" />
                      {unreadNotifs} sin leer
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Acciones
                </p>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/app/access')}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                      <DoorOpen className="size-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">Registrar visitante</p>
                      <p className="text-xs text-slate-400 mt-0.5">Ir a módulo de accesos</p>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('package')}
                    className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg border border-amber-200 bg-white">
                      <Package className="size-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800">Registrar paquete</p>
                      <p className="text-xs text-amber-500 mt-0.5">Marcar paquete recibido</p>
                    </div>
                    <ChevronRight className="size-4 text-amber-300 shrink-0" />
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setView('notify')}
                      className="flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left transition hover:bg-blue-100"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg border border-blue-200 bg-white">
                        <Bell className="size-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-800">Enviar notificación</p>
                        <p className="text-xs text-blue-400 mt-0.5">Mensaje a los residentes</p>
                      </div>
                      <ChevronRight className="size-4 text-blue-300 shrink-0" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate('/app/residents')}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                      <Users className="size-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">Ver residentes</p>
                      <p className="text-xs text-slate-400 mt-0.5">Ir a módulo de residentes</p>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Package view ── */}
          {view === 'package' && (
            <form
              className="space-y-4"
              onSubmit={pkgForm.handleSubmit(() => pkgMutation.mutate())}
            >
              {residents.length > 0 && (
                <Field label="Residente (opcional)">
                  <Select
                    value={selectedResidentId}
                    onValueChange={(v) =>
                      pkgForm.setValue('residentId', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin residente específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin residente específico</SelectItem>
                      {residents.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Descripción (opcional)" error={pkgForm.formState.errors.description?.message}>
                <Textarea
                  {...pkgForm.register('description')}
                  placeholder="Caja mediana, sobre, pedido de farmacia..."
                  rows={2}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={pkgMutation.isPending}>
                Guardar paquete
              </Button>
            </form>
          )}

          {/* ── Notify view ── */}
          {view === 'notify' && (
            <form
              className="space-y-4"
              onSubmit={notifyForm.handleSubmit(() => notifyMutation.mutate())}
            >
              <Field
                label="Tipo de notificación"
                error={notifyForm.formState.errors.notificationTypeId?.message}
              >
                <Select
                  value={selectedTypeId}
                  onValueChange={(v) =>
                    notifyForm.setValue('notificationTypeId', v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        notifTypesQuery.isLoading ? 'Cargando...' : 'Selecciona tipo'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {notifTypes.map((t: { id: string; name: string }) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mensaje" error={notifyForm.formState.errors.message?.message}>
                <Textarea
                  {...notifyForm.register('message')}
                  placeholder="Escribe el mensaje para los residentes."
                  rows={3}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={notifyMutation.isPending}>
                Enviar notificación
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BuildingMapPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'

  const [selectedApt, setSelectedApt] = useState<{
    apt: Apartment
    tower: Tower
    towerIdx: number
  } | null>(null)

  const towersQuery = useQuery({
    queryKey: ['towers'],
    queryFn: api.getTowers,
    staleTime: STALE_5MIN,
  })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments'],
    queryFn: () => api.getApartments(),
    staleTime: STALE_5MIN,
  })
  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: api.getPackages,
    staleTime: STALE_1MIN,
  })
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getAllNotifications,
    staleTime: STALE_1MIN,
  })

  const towers = towersQuery.data ?? []
  const allApts = apartmentsQuery.data ?? []
  const packages = packagesQuery.data ?? []
  const notifs = notificationsQuery.data ?? []

  // Index: apartmentId → pending packages count
  const pkgByApt = useMemo(() => {
    const map = new Map<string, number>()
    for (const pkg of packages) {
      if (!pkg.delivered && pkg.apartmentId) {
        map.set(pkg.apartmentId, (map.get(pkg.apartmentId) ?? 0) + 1)
      }
    }
    return map
  }, [packages])

  // Index: apartmentId → unread notification count
  const notifByApt = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of notifs) {
      if (!n.isRead && n.apartmentId) {
        map.set(n.apartmentId, (map.get(n.apartmentId) ?? 0) + 1)
      }
    }
    return map
  }, [notifs])

  // Apartments grouped by tower then floor
  const towerMap = useMemo(() => {
    const map = new Map<string, Map<number, Apartment[]>>()
    for (const tower of towers) {
      map.set(tower.id, new Map())
    }
    for (const apt of allApts) {
      if (!apt.towerId) continue
      if (!map.has(apt.towerId)) map.set(apt.towerId, new Map())
      const floorMap = map.get(apt.towerId)!
      const floor = apt.floor ?? 1
      if (!floorMap.has(floor)) floorMap.set(floor, [])
      floorMap.get(floor)!.push(apt)
    }
    // Sort apts per floor by number
    map.forEach((floorMap) => {
      floorMap.forEach((apts) => apts.sort((a, b) => a.number.localeCompare(b.number)))
    })
    return map
  }, [towers, allApts])

  const maxFloor = useMemo(() => {
    let max = 0
    towerMap.forEach((floorMap) => {
      floorMap.forEach((_, floor) => {
        if (floor > max) max = floor
      })
    })
    return max
  }, [towerMap])

  // Ascending: P1 first, P2, P3...
  const floors = useMemo(
    () => Array.from({ length: maxFloor }, (_, i) => i + 1),
    [maxFloor],
  )

  // Per-tower stats for legend
  const towerStats = useMemo(
    () =>
      towers.map((t, i) => {
        const towerApts = allApts.filter((a) => a.towerId === t.id)
        const occupied = towerApts.filter((a) => (a.residentCount ?? 0) > 0).length
        return { tower: t, occupied, total: towerApts.length, color: palette(i) }
      }),
    [towers, allApts],
  )

  const isLoading =
    towersQuery.isLoading ||
    apartmentsQuery.isLoading ||
    packagesQuery.isLoading ||
    notificationsQuery.isLoading

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <SectionHeader
        eyebrow="Operacion"
        title="Plano del conjunto"
        description="Vista de torres y apartamentos. Haz clic en cualquier unidad para ver detalles y registrar acciones."
      />

      {/* Legend bar */}
      {towerStats.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-6 pt-1 border-b border-slate-100">
          {towerStats.map(({ tower, occupied, total, color }) => (
            <div
              key={tower.id}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm"
            >
              <span className={cn('size-2.5 rounded-full', color.legend)} />
              <span className="font-semibold text-slate-700">{tower.name}</span>
              <span className="text-slate-400">
                {occupied}/{total}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">1</span>
              <span>Paquete</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="flex size-4 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">1</span>
              <span>Notificación</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid area */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4 sm:px-6 sm:py-5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <div className="mx-auto size-8 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
              <p className="text-sm text-slate-400">Cargando plano...</p>
            </div>
          </div>
        ) : towers.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Sin torres registradas.
          </div>
        ) : (
          <div className="min-w-max">
            {/* Tower column headers */}
            <div className="flex gap-3 mb-3 ml-12">
              {towers.map((tower, ti) => {
                const firstFloorApts = towerMap.get(tower.id)?.get(1) ?? []
                const sampleSize = firstFloorApts.length || 1
                const colWidth = sampleSize * 68 + 8
                return (
                  <div
                    key={tower.id}
                    className={cn(
                      'flex items-center justify-center rounded-lg py-2 text-sm font-bold text-white tracking-wide shadow-sm',
                      palette(ti).header,
                    )}
                    style={{ minWidth: `${colWidth}px` }}
                  >
                    {tower.name}
                  </div>
                )
              })}
            </div>

            {/* Floor rows */}
            <div className="space-y-2">
              {floors.map((floor) => (
                <div key={floor} className="flex items-center gap-3">
                  {/* Floor label */}
                  <div className="w-10 shrink-0 text-right">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      P{floor}
                    </span>
                  </div>

                  {/* Apartments per tower */}
                  {towers.map((tower, ti) => {
                    const floorApts = towerMap.get(tower.id)?.get(floor) ?? []
                    const color = palette(ti)
                    const firstFloorApts = towerMap.get(tower.id)?.get(1) ?? []
                    const sampleSize = firstFloorApts.length || 1
                    const colWidth = sampleSize * 68 + 8

                    return (
                      <div
                        key={tower.id}
                        className="flex gap-1"
                        style={{ minWidth: `${colWidth}px` }}
                      >
                        {floorApts.length > 0 ? (
                          floorApts.map((apt) => (
                            <AptCell
                              key={apt.id}
                              apt={apt}
                              color={color}
                              isSelected={selectedApt?.apt.id === apt.id}
                              pendingPkgs={pkgByApt.get(apt.id) ?? 0}
                              unreadNotifs={notifByApt.get(apt.id) ?? 0}
                              onClick={() =>
                                setSelectedApt(
                                  selectedApt?.apt.id === apt.id
                                    ? null
                                    : { apt, tower, towerIdx: ti },
                                )
                              }
                            />
                          ))
                        ) : (
                          <div
                            className="h-14 rounded-lg border border-dashed border-slate-100"
                            style={{ width: `${colWidth - 8}px` }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apartment detail dialog */}
      {selectedApt && (
        <AptDetailDialog
          open={!!selectedApt}
          onClose={() => setSelectedApt(null)}
          apartment={selectedApt.apt}
          tower={selectedApt.tower}
          towerIdx={selectedApt.towerIdx}
          pendingPkgs={pkgByApt.get(selectedApt.apt.id) ?? 0}
          unreadNotifs={notifByApt.get(selectedApt.apt.id) ?? 0}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
