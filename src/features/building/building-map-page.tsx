import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Package, DoorOpen, ArrowLeft, ChevronRight, Search, Upload, X, PhoneCall } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { z } from 'zod'
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
import { Input } from '@/components/ui/input'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useCalls } from '@/features/calls/use-calls'
import type { Apartment, Tower, Visitor } from '@/types/api'

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

const createVisitorSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  document: z.string().max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type AccessPhase =
  | { kind: 'idle' }
  | { kind: 'found'; visitor: Visitor }
  | { kind: 'not_found'; document: string }
  | { kind: 'ready'; visitor: Visitor }

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
        'h-full min-h-0 w-full cursor-pointer select-none transition-all duration-100',
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

type DialogView = 'info' | 'notify' | 'package' | 'access'

function AptDetailDialog({
  open,
  onClose,
  apartment,
  tower,
  towerIdx,
  pendingPkgs,
  unreadNotifs,
  canManageAccess,
  canManagePackages,
  canNotify,
  canCall,
}: {
  open: boolean
  onClose: () => void
  apartment: Apartment
  tower: Tower
  towerIdx: number
  pendingPkgs: number
  unreadNotifs: number
  canManageAccess: boolean
  canManagePackages: boolean
  canNotify: boolean
  canCall: boolean
}) {
  const queryClient = useQueryClient()
  const { call, startApartmentCall } = useCalls()
  const [view, setView] = useState<DialogView>('info')
  const color = palette(towerIdx)

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
    enabled: canNotify && open && view === 'notify',
    staleTime: STALE_5MIN,
  })
  const notifTypes = notifTypesQuery.data ?? []

  // ── Access state ──
  const [accessPhase, setAccessPhase] = useState<AccessPhase>({ kind: 'idle' })
  const [accessSearchDoc, setAccessSearchDoc] = useState('')
  const [accessNotes, setAccessNotes] = useState('')

  const visitorsQuery = useQuery({
    queryKey: ['visitors'],
    queryFn: api.getVisitors,
    enabled: canManageAccess && open && view === 'access',
    staleTime: STALE_1MIN,
  })

  const createVisitorForm = useForm<z.infer<typeof createVisitorSchema>>({
    resolver: zodResolver(createVisitorSchema),
    defaultValues: { name: '', lastName: '', document: '', phone: '' },
  })

  const createVisitorMutation = useMutation({
    mutationFn: api.createVisitor,
    onSuccess: (visitor) => {
      toast.success('Visitante registrado')
      createVisitorForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['visitors'] })
      setAccessPhase({ kind: 'ready', visitor: visitor as Visitor })
    },
    onError: () => toast.error('No fue posible crear el visitante'),
  })

  const accessMutation = useMutation({
    mutationFn: (visitorId: string) =>
      api.createAccessAudit({
        visitorId,
        apartmentId: apartment.id,
        ...(accessNotes.trim() ? { notes: accessNotes.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success('Ingreso registrado')
      setAccessPhase({ kind: 'idle' })
      setAccessSearchDoc('')
      setAccessNotes('')
      void queryClient.invalidateQueries({ queryKey: ['access-audit'] })
      onClose()
    },
    onError: () => toast.error('No fue posible registrar el ingreso'),
  })

  function handleAccessSearch() {
    const q = accessSearchDoc.trim().toLowerCase()
    if (!q) return
    const visitors = visitorsQuery.data ?? []
    const found = visitors.find((v) => v.document?.toLowerCase() === q)
    if (found) {
      setAccessPhase({ kind: 'found', visitor: found })
    } else {
      setAccessPhase({ kind: 'not_found', document: accessSearchDoc.trim() })
      createVisitorForm.setValue('document', accessSearchDoc.trim())
    }
  }

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
  const selectedResident = residents.find((r) => r.id === selectedResidentId)
  const [packagePhotos, setPackagePhotos] = useState<File[]>([])
  const [packageResidentOpen, setPackageResidentOpen] = useState(false)
  const [packageResidentSearch, setPackageResidentSearch] = useState('')

  const pkgMutation = useMutation({
    mutationFn: () => {
      const residentId = pkgForm.getValues('residentId')
      const description = pkgForm.getValues('description')
      return api.createPackage({
        apartmentId: apartment.id,
        ...(residentId ? { residentId } : {}),
        ...(description ? { description } : {}),
      }, packagePhotos)
    },
    onSuccess: () => {
      toast.success('Paquete registrado')
      pkgForm.reset()
      setPackagePhotos([])
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
      onClose()
    },
    onError: () => toast.error('No fue posible registrar el paquete'),
  })

  function handlePackagePhotoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    if (selectedFiles.length > 0) {
      setPackagePhotos((current) => [...current, ...selectedFiles].slice(0, 10))
    }
    event.target.value = ''
  }

  function removePackagePhoto(index: number) {
    setPackagePhotos((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function resetDialogState() {
    setView('info')
    setAccessPhase({ kind: 'idle' })
    setAccessSearchDoc('')
    setAccessNotes('')
    pkgForm.reset()
    setPackagePhotos([])
    setPackageResidentOpen(false)
    setPackageResidentSearch('')
  }

  const occupied = residents.length > 0
  const hasAvailableActions =
    canManageAccess ||
    canManagePackages ||
    canNotify ||
    (canCall && occupied)

  async function handleStartCall() {
    try {
      await startApartmentCall(apartment)
      toast.success('Llamada iniciada')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible iniciar la llamada')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetDialogState()
          onClose()
        }
      }}
    >
      <DialogContent className="w-[min(96vw,480px)] p-0 overflow-hidden gap-0">
        {/* Colored header */}
        <div className={cn('px-5 py-4', color.header)}>
          {view !== 'info' && (
            <button
              type="button"
              onClick={() => {
                setView('info')
                setAccessPhase({ kind: 'idle' })
                setAccessSearchDoc('')
                setAccessNotes('')
              }}
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
                  {canManageAccess && (
                    <button
                      type="button"
                      onClick={() => setView('access')}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                        <DoorOpen className="size-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">Registrar visitante</p>
                        <p className="text-xs text-slate-400 mt-0.5">Marcar ingreso de visita</p>
                      </div>
                      <ChevronRight className="size-4 text-slate-300 shrink-0" />
                    </button>
                  )}

                  {canManagePackages && (
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
                  )}

                  {canNotify && (
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

                  {canCall && occupied && (
                    <button
                      type="button"
                      onClick={() => void handleStartCall()}
                      disabled={Boolean(call)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                        call
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-70'
                          : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
                      )}
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg border border-emerald-200 bg-white">
                        <PhoneCall className="size-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-900">Llamar</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Audio en tiempo real con el movil
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-emerald-300 shrink-0" />
                    </button>
                  )}

                  {!hasAvailableActions && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Tu rol solo puede llamar a apartamentos con residentes activos.
                    </div>
                  )}

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
                  <FilterableSelect
                    open={packageResidentOpen}
                    onOpenChange={setPackageResidentOpen}
                    value={selectedResidentId ?? ''}
                    displayValue={selectedResident ? `${selectedResident.name} ${selectedResident.lastName}` : ''}
                    placeholder="Sin residente específico"
                    searchPlaceholder="Filtrar residente..."
                    items={[{ id: '', name: 'Sin residente específico', lastName: '' } as any, ...residents]}
                    getKey={(r: any) => r.id}
                    getLabel={(r: any) => r.id ? `${r.name} ${r.lastName}` : 'Sin residente específico'}
                    onSelect={(r: any) => {
                      pkgForm.setValue('residentId', r.id || '')
                      setPackageResidentOpen(false)
                    }}
                    searchValue={packageResidentSearch}
                    onSearchValueChange={setPackageResidentSearch}
                  />
                </Field>
              )}
              <Field label="Descripción (opcional)" error={pkgForm.formState.errors.description?.message}>
                <Textarea
                  {...pkgForm.register('description')}
                  placeholder="Caja mediana, sobre, pedido de farmacia..."
                  rows={2}
                />
              </Field>
              <Field label="Fotos (opcional)">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100">
                  <Upload className="size-4" />
                  <span>Seleccionar fotos</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handlePackagePhotoSelection}
                  />
                </label>
                <p className="mt-2 text-xs text-slate-400">Puedes adjuntar hasta 10 imágenes antes de guardar.</p>
                {packagePhotos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {packagePhotos.map((photo, index) => (
                      <div key={`${photo.name}-${photo.lastModified}-${photo.size}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">{photo.name}</p>
                          <p className="text-xs text-slate-400">{Math.round(photo.size / 1024)} KB</p>
                        </div>
                        <button
                          type="button"
                          className="text-slate-400 transition hover:text-slate-700"
                          onClick={() => removePackagePhoto(index)}
                          aria-label={`Eliminar ${photo.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
              <Button type="submit" className="w-full" disabled={pkgMutation.isPending}>
                Guardar paquete
              </Button>
            </form>
          )}

          {/* ── Access view ── */}
          {view === 'access' && (
            <div className="space-y-4">
              {/* Step 1: search visitor */}
              {accessPhase.kind !== 'ready' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Paso 1 · Buscar visitante
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Número de cédula o documento"
                      value={accessSearchDoc}
                      onChange={(e) => {
                        setAccessSearchDoc(e.target.value)
                        if (accessPhase.kind !== 'idle') setAccessPhase({ kind: 'idle' })
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAccessSearch()}
                      disabled={visitorsQuery.isLoading}
                    />
                    <Button type="button" variant="outline" onClick={handleAccessSearch} disabled={visitorsQuery.isLoading}>
                      <Search className="size-4" />
                    </Button>
                  </div>

                  {/* Found */}
                  {accessPhase.kind === 'found' && (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Visitante encontrado</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {accessPhase.visitor.name} {accessPhase.visitor.lastName}
                          </p>
                          {accessPhase.visitor.document && (
                            <p className="text-sm text-slate-500">CC {accessPhase.visitor.document}</p>
                          )}
                        </div>
                        <button type="button" onClick={() => setAccessPhase({ kind: 'idle' })} className="text-slate-400 hover:text-slate-600">
                          <X className="size-4" />
                        </button>
                      </div>
                      <Button className="w-full" onClick={() => setAccessPhase({ kind: 'ready', visitor: accessPhase.visitor })}>
                        Confirmar visitante
                      </Button>
                    </div>
                  )}

                  {/* Not found → create */}
                  {accessPhase.kind === 'not_found' && (
                    <div className="space-y-3">
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Visitante no encontrado. Completa los datos para crearlo.
                      </p>
                      <form
                        className="grid gap-3 sm:grid-cols-2"
                        onSubmit={createVisitorForm.handleSubmit((values) =>
                          createVisitorMutation.mutate(values)
                        )}
                      >
                        <Field label="Nombre" error={createVisitorForm.formState.errors.name?.message}>
                          <Input {...createVisitorForm.register('name')} placeholder="Juan" />
                        </Field>
                        <Field label="Apellido" error={createVisitorForm.formState.errors.lastName?.message}>
                          <Input {...createVisitorForm.register('lastName')} placeholder="Pérez" />
                        </Field>
                        <Field label="Cédula">
                          <Input {...createVisitorForm.register('document')} placeholder="12345678" />
                        </Field>
                        <Field label="Teléfono (opcional)">
                          <Input {...createVisitorForm.register('phone')} placeholder="3001234567" />
                        </Field>
                        <Button
                          type="submit"
                          className="sm:col-span-2"
                          disabled={createVisitorMutation.isPending}
                        >
                          Crear y continuar
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: confirm and register */}
              {accessPhase.kind === 'ready' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Paso 2 · Confirmar ingreso
                  </p>
                  <div className="flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Visitante</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {accessPhase.visitor.name} {accessPhase.visitor.lastName}
                      </p>
                      {accessPhase.visitor.document && (
                        <p className="text-sm text-slate-500">CC {accessPhase.visitor.document}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAccessPhase({ kind: 'idle' }); setAccessSearchDoc('') }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <Field label="Notas (opcional)">
                    <Textarea
                      value={accessNotes}
                      onChange={(e) => setAccessNotes(e.target.value)}
                      placeholder="Motivo de la visita, observaciones..."
                      rows={2}
                    />
                  </Field>
                  <Button
                    className="w-full"
                    disabled={accessMutation.isPending}
                    onClick={() => accessMutation.mutate(accessPhase.visitor.id)}
                  >
                    Registrar ingreso
                  </Button>
                </div>
              )}
            </div>
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
                  onValueChange={(v: string) =>
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

const STORAGE_KEY = 'building_map_selected_tower'

export function BuildingMapPage() {
  const { user } = useAuth()
  const canManageAccess = user?.role === 'administrator' || user?.role === 'porter'
  const canManagePackages = user?.role === 'administrator' || user?.role === 'porter'
  const canNotify = user?.role === 'administrator'
  const canCall =
    user?.role === 'administrator' ||
    user?.role === 'porter' ||
    user?.role === 'pool_attendant'

  const [selectedApt, setSelectedApt] = useState<{
    apt: Apartment
    tower: Tower
    towerIdx: number
  } | null>(null)

  // Persist selected tower in localStorage
  const [selectedTowerId, setSelectedTowerId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  )

  function selectTower(id: string) {
    setSelectedTowerId(id)
    localStorage.setItem(STORAGE_KEY, id)
    setSelectedApt(null)
  }

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
    enabled: canManagePackages,
    staleTime: STALE_1MIN,
  })
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getAllNotifications,
    enabled: canNotify,
    staleTime: STALE_1MIN,
  })

  const towers = towersQuery.data ?? []
  const allApts = apartmentsQuery.data ?? []
  const packages = canManagePackages ? packagesQuery.data ?? [] : []
  const notifs = canNotify ? notificationsQuery.data ?? [] : []

  // Once towers load, set default tower if none persisted or persisted one no longer exists
  useEffect(() => {
    if (towers.length === 0) return
    const valid = towers.some((t) => t.id === selectedTowerId)
    if (!valid) selectTower(towers[0].id)
  }, [towers]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeTower = towers.find((t) => t.id === selectedTowerId) ?? towers[0]
  const activeTowerIdx = towers.findIndex((t) => t.id === activeTower?.id)
  const activeColor = activeTower ? palette(activeTowerIdx) : PALETTE[0]

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

  // Apartments for the active tower, grouped by floor
  const floorMap = useMemo(() => {
    const map = new Map<number, Apartment[]>()
    if (!activeTower) return map
    for (const apt of allApts) {
      if (apt.towerId !== activeTower.id) continue
      const floor = apt.floor ?? 1
      if (!map.has(floor)) map.set(floor, [])
      map.get(floor)!.push(apt)
    }
    map.forEach((apts) => apts.sort((a, b) => a.number.localeCompare(b.number)))
    return map
  }, [allApts, activeTower])

  const maxFloor = useMemo(() => {
    let max = 0
    floorMap.forEach((_, floor) => { if (floor > max) max = floor })
    return max
  }, [floorMap])

  // Ascending: P1 first, P2, P3...
  const floors = useMemo(
    () => Array.from({ length: maxFloor }, (_, i) => i + 1),
    [maxFloor],
  )

  // Per-tower stats for the selector tabs
  const towerStats = useMemo(
    () =>
      towers.map((t, i) => {
        const tApts = allApts.filter((a) => a.towerId === t.id)
        const occupied = tApts.filter((a) => (a.residentCount ?? 0) > 0).length
        return { tower: t, occupied, total: tApts.length, color: palette(i) }
      }),
    [towers, allApts],
  )

  const isLoading =
    towersQuery.isLoading ||
    apartmentsQuery.isLoading ||
    (canManagePackages && packagesQuery.isLoading) ||
    (canNotify && notificationsQuery.isLoading)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <SectionHeader
        eyebrow="Operacion"
        title="Plano del conjunto"
        description="Selecciona una torre y haz clic en cualquier unidad para ver detalles y registrar acciones."
      />

      {/* Tower selector tabs */}
      {!isLoading && towers.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-100 px-4 pb-3 pt-1 sm:px-6">
          {towerStats.map(({ tower, occupied, total, color }) => {
            const isActive = tower.id === selectedTowerId
            return (
              <button
                key={tower.id}
                type="button"
                onClick={() => selectTower(tower.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold whitespace-nowrap transition shrink-0',
                  isActive
                    ? `${color.header} text-white border-transparent shadow-sm`
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {!isActive && (
                  <span className={cn('size-2 rounded-full shrink-0', color.legend)} />
                )}
                {tower.name}
                <span
                  className={cn(
                    'text-xs font-normal',
                    isActive ? 'text-white/70' : 'text-slate-400',
                  )}
                >
                  {occupied}/{total}
                </span>
              </button>
            )
          })}

          {(canManagePackages || canNotify) && (
            <div className="ml-auto flex items-center gap-3 shrink-0 pl-2">
              {canManagePackages && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">
                    1
                  </span>
                  Paquete
                </div>
              )}
              {canNotify && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="flex size-4 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">
                    1
                  </span>
                  Notif.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid area */}
      <div className="min-w-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
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
        ) : !activeTower ? null : (
          <div className="h-full w-full min-w-0">
            <div
              className="grid h-full gap-2"
              style={{
                gridTemplateRows: `repeat(${Math.max(floors.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {floors.map((floor) => {
                const floorApts = floorMap.get(floor) ?? []
                return (
                  <div key={floor} className="flex min-h-0 min-w-0 items-stretch gap-4">
                    {/* Floor label */}
                    <div className="flex w-10 shrink-0 items-center justify-end text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        P{floor}
                      </span>
                    </div>

                    {/* Apartments */}
                    <div
                      className="grid min-w-0 flex-1 gap-3"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(activeTower.apartmentsPerFloor, 1)}, minmax(0, 1fr))`,
                      }}
                    >
                      {floorApts.length > 0 ? (
                        floorApts.map((apt) => (
                          <AptCell
                            key={apt.id}
                            apt={apt}
                            color={activeColor}
                            isSelected={selectedApt?.apt.id === apt.id}
                            pendingPkgs={pkgByApt.get(apt.id) ?? 0}
                            unreadNotifs={notifByApt.get(apt.id) ?? 0}
                            onClick={() =>
                              setSelectedApt(
                                selectedApt?.apt.id === apt.id
                                  ? null
                                  : { apt, tower: activeTower, towerIdx: activeTowerIdx },
                              )
                            }
                          />
                        ))
                      ) : (
                        <div className="h-full min-h-0 w-full rounded-lg border border-dashed border-slate-100 bg-slate-50/50" />
                      )}
                    </div>
                  </div>
                )
              })}
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
          canManageAccess={canManageAccess}
          canManagePackages={canManagePackages}
          canNotify={canNotify}
          canCall={canCall}
        />
      )}
    </div>
  )
}
