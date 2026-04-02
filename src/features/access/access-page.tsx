import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Clock3, DoorOpen, Search, UserRoundPlus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge, type StatusVariant } from '@/components/ui/status-badge'
import { useAuth } from '@/hooks/use-auth-context'
import { UPLOADS_URL } from '@/lib/constants'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { AccessAudit, Visitor } from '@/types/api'

const ENTRY_TYPE_OPTIONS = [
  { value: 'pedestrian', label: 'A pie' },
  { value: 'car', label: 'Carro' },
  { value: 'motorcycle', label: 'Moto' },
  { value: 'other', label: 'Otros' },
] as const

const ENTRY_TYPE_LABELS: Record<string, string> = {
  pedestrian: 'A pie',
  car: 'Carro',
  motorcycle: 'Moto',
  other: 'Otros',
}

function resolveUploadPath(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${UPLOADS_URL}/${path.replace(/^\/+/, '')}`
}

function getEntryTypeVariant(entryType: AccessAudit['entryType']): StatusVariant {
  if (entryType === 'car') return 'blue'
  if (entryType === 'motorcycle') return 'amber'
  if (entryType === 'other') return 'slate'
  return 'green'
}

const createVisitorSchema = z.object({
  name: z.string().min(2),
  lastName: z.string().min(2),
  document: z.string().max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

const entrySchema = z
  .object({
    towerId: z.string().uuid({ message: 'Selecciona una torre' }),
    apartmentId: z.string().uuid({ message: 'Selecciona un apartamento' }),
    entryType: z.enum(['pedestrian', 'car', 'motorcycle', 'other']),
    vehicleBrandId: z.string().optional().or(z.literal('')),
    vehicleColor: z.string().max(40).optional().or(z.literal('')),
    vehiclePlate: z.string().max(15).optional().or(z.literal('')),
    vehicleModel: z.string().max(60).optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
  })
  .superRefine((values, context) => {
    const requiresVehicleData = values.entryType === 'car' || values.entryType === 'motorcycle'
    if (!requiresVehicleData) return

    if (!values.vehicleBrandId) {
      context.addIssue({
        code: 'custom',
        path: ['vehicleBrandId'],
        message: 'Selecciona una marca',
      })
    }
    if (!values.vehicleColor?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['vehicleColor'],
        message: 'Ingresa el color',
      })
    }
    if (!values.vehiclePlate?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['vehiclePlate'],
        message: 'Ingresa la placa',
      })
    }
    if (!values.vehicleModel?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['vehicleModel'],
        message: 'Ingresa el modelo',
      })
    }
  })

type SearchPhase =
  | { kind: 'idle' }
  | { kind: 'found'; visitor: Visitor }
  | { kind: 'not_found'; document: string }
  | { kind: 'ready'; visitor: Visitor }

function VisitorCard({ visitor, onClear }: { visitor: Visitor; onClear: () => void }) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">Visitante encontrado</p>
        <p className="mt-1 font-semibold text-slate-900">
          {visitor.name} {visitor.lastName}
        </p>
        {visitor.document && <p className="text-sm text-slate-500">CC {visitor.document}</p>}
        {visitor.phone && <p className="text-sm text-slate-400">{visitor.phone}</p>}
      </div>
      <button type="button" onClick={onClear} className="mt-0.5 text-slate-400 hover:text-slate-600">
        <X className="size-4" />
      </button>
    </div>
  )
}

function ManageVehicleBrandsDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const brandSchema = z.object({ name: z.string().min(2, 'Mínimo 2 caracteres').max(60) })

  const brandForm = useForm<z.infer<typeof brandSchema>>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: '' },
  })

  const brandsQuery = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: api.getVehicleBrands,
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: api.createVehicleBrand,
    onSuccess: () => {
      toast.success('Marca creada')
      brandForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['vehicle-brands'] })
    },
    onError: () => toast.error('No fue posible crear la marca'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Marcas de vehículo</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,520px)]">
        <DialogHeader>
          <DialogTitle>Marcas de vehículo</DialogTitle>
          <DialogDescription>
            Crea nuevas marcas disponibles para el registro de ingreso vehicular.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex items-end gap-2"
          onSubmit={brandForm.handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="flex-1">
            <Field label="Nueva marca" error={brandForm.formState.errors.name?.message}>
              <Input {...brandForm.register('name')} placeholder="Ej. Mazda" />
            </Field>
          </div>
          <Button type="submit" disabled={createMutation.isPending}>Agregar</Button>
        </form>

        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {brandsQuery.isLoading ? (
            <p className="px-3 py-4 text-sm text-slate-400">Cargando marcas...</p>
          ) : (brandsQuery.data ?? []).length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-400">Sin marcas registradas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(brandsQuery.data ?? []).map((brand) => (
                <div key={brand.id} className="px-3 py-2 text-sm text-slate-700">
                  {brand.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RegisterEntryDialog({
  visitors,
  isLoadingVisitors,
}: {
  visitors: Visitor[]
  isLoadingVisitors: boolean
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchDoc, setSearchDoc] = useState('')
  const [phase, setPhase] = useState<SearchPhase>({ kind: 'idle' })
  const [selectedTowerId, setSelectedTowerId] = useState('')
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    },
    [photoPreview],
  )

  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const brandsQuery = useQuery({ queryKey: ['vehicle-brands'], queryFn: api.getVehicleBrands })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments(selectedTowerId || undefined),
    enabled: Boolean(selectedTowerId),
  })

  const createVisitorForm = useForm<z.infer<typeof createVisitorSchema>>({
    resolver: zodResolver(createVisitorSchema),
    defaultValues: { name: '', lastName: '', document: '', phone: '' },
  })

  const entryForm = useForm<z.infer<typeof entrySchema>>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      towerId: '',
      apartmentId: '',
      entryType: 'pedestrian',
      vehicleBrandId: '',
      vehicleColor: '',
      vehiclePlate: '',
      vehicleModel: '',
      notes: '',
    },
  })

  const selectedEntryType = useWatch({ control: entryForm.control, name: 'entryType' })
  const selectedVehicleBrandId = useWatch({ control: entryForm.control, name: 'vehicleBrandId' }) ?? ''
  const selectedApartmentId = useWatch({ control: entryForm.control, name: 'apartmentId' }) ?? ''
  const requiresVehicleData = selectedEntryType === 'car' || selectedEntryType === 'motorcycle'

  function handleEntryTypeChange(value: z.infer<typeof entrySchema>['entryType']) {
    entryForm.setValue('entryType', value, { shouldValidate: true })
    if (value === 'car' || value === 'motorcycle') return
    entryForm.setValue('vehicleBrandId', '')
    entryForm.setValue('vehicleColor', '')
    entryForm.setValue('vehiclePlate', '')
    entryForm.setValue('vehicleModel', '')
    setBrandOpen(false)
    setBrandSearch('')
  }

  const createVisitorMutation = useMutation({
    mutationFn: api.createVisitor,
    onSuccess: (visitor) => {
      toast.success('Visitante creado')
      createVisitorForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['visitors'] })
      setPhase({ kind: 'ready', visitor })
    },
    onError: () => toast.error('No fue posible crear el visitante'),
  })

  const accessMutation = useMutation({
    mutationFn: ({ payload, photo }: { payload: Record<string, unknown>; photo: File }) =>
      api.createAccessAudit(payload, photo),
    onSuccess: () => {
      toast.success('Ingreso registrado')
      handleReset()
      void queryClient.invalidateQueries({ queryKey: ['access-audit'] })
    },
    onError: () => toast.error('No fue posible registrar el ingreso'),
  })

  const handleSearch = () => {
    const q = searchDoc.trim().toLowerCase()
    if (!q) return
    const found = visitors.find((v) => v.document?.toLowerCase() === q)
    if (found) {
      setPhase({ kind: 'found', visitor: found })
    } else {
      setPhase({ kind: 'not_found', document: searchDoc.trim() })
      createVisitorForm.setValue('document', searchDoc.trim())
    }
  }

  const handleConfirmVisitor = (visitor: Visitor) => {
    setPhase({ kind: 'ready', visitor })
    entryForm.reset({
      towerId: '',
      apartmentId: '',
      entryType: 'pedestrian',
      vehicleBrandId: '',
      vehicleColor: '',
      vehiclePlate: '',
      vehicleModel: '',
      notes: '',
    })
    setSelectedTowerId('')
    setTowerOpen(false)
    setAptOpen(false)
    setBrandOpen(false)
    setPhotoFile(null)
  }

  const handleReset = () => {
    setSearchDoc('')
    setPhase({ kind: 'idle' })
    setSelectedTowerId('')
    setTowerOpen(false)
    setAptOpen(false)
    setBrandOpen(false)
    createVisitorForm.reset()
    entryForm.reset({
      towerId: '',
      apartmentId: '',
      entryType: 'pedestrian',
      vehicleBrandId: '',
      vehicleColor: '',
      vehiclePlate: '',
      vehicleModel: '',
      notes: '',
    })
    setPhotoFile(null)
    setOpen(false)
  }

  const activeVisitor = phase.kind === 'found' || phase.kind === 'ready' ? phase.visitor : null

  const filteredApartments = apartmentsQuery.data ?? []
  const selectedApartment = filteredApartments.find((apt) => apt.id === selectedApartmentId) ?? null

  const handleEntrySubmit = entryForm.handleSubmit((values) => {
    if (!activeVisitor) return
    if (!photoFile) {
      toast.error('La foto del visitante es obligatoria')
      return
    }

    const payload: Record<string, unknown> = {
      visitorId: activeVisitor.id,
      apartmentId: values.apartmentId,
      entryType: values.entryType,
      notes: values.notes || undefined,
    }

    if (values.entryType === 'car' || values.entryType === 'motorcycle') {
      payload.vehicleBrandId = values.vehicleBrandId || undefined
      payload.vehicleColor = values.vehicleColor?.trim() || undefined
      payload.vehiclePlate = values.vehiclePlate?.trim().toUpperCase() || undefined
      payload.vehicleModel = values.vehicleModel?.trim() || undefined
    }

    accessMutation.mutate({ payload, photo: photoFile })
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleReset()
        setOpen(v)
      }}
    >
      <DialogTrigger asChild>
        <Button>Registrar ingreso</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,620px)]">
        <DialogHeader>
          <DialogTitle>Registrar ingreso</DialogTitle>
          <DialogDescription>
            Busca al visitante por cédula para registrar su entrada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {phase.kind !== 'ready' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Paso 1 · Buscar visitante
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Número de cédula o documento"
                  value={searchDoc}
                  onChange={(e) => {
                    setSearchDoc(e.target.value)
                    if (phase.kind !== 'idle') setPhase({ kind: 'idle' })
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={isLoadingVisitors}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearch}
                  disabled={!searchDoc.trim() || isLoadingVisitors}
                >
                  <Search className="size-4" />
                </Button>
              </div>

              {phase.kind === 'found' && (
                <div className="space-y-3 pt-1">
                  <VisitorCard visitor={phase.visitor} onClear={() => setPhase({ kind: 'idle' })} />
                  <Button type="button" className="w-full" onClick={() => handleConfirmVisitor(phase.visitor)}>
                    Continuar con este visitante
                  </Button>
                </div>
              )}

              {phase.kind === 'not_found' && (
                <div className="space-y-3 pt-1">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">
                      Visitante no encontrado
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      No existe un visitante con cédula <strong>{phase.document}</strong>. Completa los datos para crearlo.
                    </p>
                  </div>
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={createVisitorForm.handleSubmit((values) => createVisitorMutation.mutate(values))}
                  >
                    <Field label="Nombre" error={createVisitorForm.formState.errors.name?.message}>
                      <Input {...createVisitorForm.register('name')} placeholder="Laura" />
                    </Field>
                    <Field label="Apellido" error={createVisitorForm.formState.errors.lastName?.message}>
                      <Input {...createVisitorForm.register('lastName')} placeholder="Sánchez" />
                    </Field>
                    <Field label="Documento" error={createVisitorForm.formState.errors.document?.message}>
                      <Input {...createVisitorForm.register('document')} placeholder="12345678" />
                    </Field>
                    <Field label="Teléfono" error={createVisitorForm.formState.errors.phone?.message}>
                      <Input {...createVisitorForm.register('phone')} placeholder="3001234567" />
                    </Field>
                    <Button type="submit" className="sm:col-span-2" disabled={createVisitorMutation.isPending}>
                      <UserRoundPlus className="mr-2 size-4" />
                      Crear visitante y continuar
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {phase.kind === 'ready' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Paso 2 · Datos del ingreso
              </p>

              <VisitorCard visitor={phase.visitor} onClear={() => setPhase({ kind: 'idle' })} />

              <form className="space-y-3" onSubmit={handleEntrySubmit}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Torre" error={entryForm.formState.errors.towerId?.message}>
                    <FilterableSelect
                      open={towerOpen}
                      onOpenChange={setTowerOpen}
                      value={selectedTowerId}
                      displayValue={(towersQuery.data ?? []).find((t) => t.id === selectedTowerId)?.name ?? ''}
                      placeholder="Selecciona torre"
                      searchPlaceholder="Filtrar torre..."
                      items={towersQuery.data ?? []}
                      getKey={(t) => t.id}
                      getLabel={(t) => `${t.name} (${t.code})`}
                      onSelect={(t) => {
                        setSelectedTowerId(t.id)
                        entryForm.setValue('towerId', t.id, { shouldValidate: true })
                        entryForm.setValue('apartmentId', '')
                        setTowerOpen(false)
                        setAptOpen(true)
                      }}
                      searchValue={towerSearch}
                      onSearchValueChange={setTowerSearch}
                    />
                  </Field>

                  <Field label="Apartamento" error={entryForm.formState.errors.apartmentId?.message}>
                    <FilterableSelect
                      open={aptOpen}
                      onOpenChange={setAptOpen}
                      value={selectedApartmentId}
                      displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
                      placeholder={!selectedTowerId ? 'Primero elige torre' : 'Selecciona apt.'}
                      searchPlaceholder="Filtrar por número o piso..."
                      disabled={!selectedTowerId}
                      items={filteredApartments}
                      getKey={(a) => a.id}
                      getLabel={(a) => `Apt. ${a.number}${a.floor != null ? ` · Piso ${a.floor}` : ''}`}
                      onSelect={(a) => {
                        entryForm.setValue('apartmentId', a.id, { shouldValidate: true })
                        setAptOpen(false)
                      }}
                      searchValue={aptSearch}
                      onSearchValueChange={setAptSearch}
                    />
                  </Field>
                </div>

                <Field label="Tipo de entrada" error={entryForm.formState.errors.entryType?.message}>
                  <Select
                    value={selectedEntryType ?? 'pedestrian'}
                    onValueChange={(value) => handleEntryTypeChange(value as z.infer<typeof entrySchema>['entryType'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPE_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {requiresVehicleData && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Marca" error={entryForm.formState.errors.vehicleBrandId?.message}>
                      <FilterableSelect
                        open={brandOpen}
                        onOpenChange={setBrandOpen}
                        value={selectedVehicleBrandId}
                        displayValue={
                          (brandsQuery.data ?? []).find((brand) => brand.id === selectedVehicleBrandId)
                            ?.name ?? ''
                        }
                        placeholder="Selecciona marca"
                        searchPlaceholder="Filtrar marca..."
                        items={brandsQuery.data ?? []}
                        getKey={(brand) => brand.id}
                        getLabel={(brand) => brand.name}
                        onSelect={(brand) => {
                          entryForm.setValue('vehicleBrandId', brand.id, { shouldValidate: true })
                          setBrandOpen(false)
                        }}
                        searchValue={brandSearch}
                        onSearchValueChange={setBrandSearch}
                      />
                    </Field>

                    <Field label="Color" error={entryForm.formState.errors.vehicleColor?.message}>
                      <Input {...entryForm.register('vehicleColor')} placeholder="Blanco" />
                    </Field>

                    <Field label="Placa" error={entryForm.formState.errors.vehiclePlate?.message}>
                      <Input {...entryForm.register('vehiclePlate')} placeholder="ABC123" maxLength={15} />
                    </Field>

                    <Field label="Modelo" error={entryForm.formState.errors.vehicleModel?.message}>
                      <Input {...entryForm.register('vehicleModel')} placeholder="2024" maxLength={60} />
                    </Field>
                  </div>
                )}

                <Field label="Foto del visitante (obligatoria)">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100">
                    <Camera className="size-4" />
                    <span>{photoFile ? 'Cambiar foto' : 'Tomar o seleccionar foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        setPhotoFile(file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                  {!photoFile && <p className="mt-2 text-xs text-rose-500">Debes adjuntar una foto para continuar.</p>}
                  {photoPreview && (
                    <div className="mt-3 relative w-fit">
                      <img src={photoPreview} alt="Visitante" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoFile(null)}
                        className="absolute -right-2 -top-2 rounded-full border border-slate-300 bg-white p-1 text-slate-500 hover:text-slate-700"
                        aria-label="Quitar foto"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}
                </Field>

                <Field label="Notas (opcional)">
                  <Textarea
                    {...entryForm.register('notes')}
                    placeholder="Ej. visita autorizada, ingreso en vehículo particular."
                    rows={2}
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={accessMutation.isPending}>
                  <DoorOpen className="mr-2 size-4" />
                  Confirmar ingreso
                </Button>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getPersonName(item: AccessAudit): string {
  if (item.visitor) return `${item.visitor.name} ${item.visitor.lastName}`
  if (item.resident) return `${item.resident.name} ${item.resident.lastName}`
  return 'Ingreso registrado'
}

function getVehicleSummary(item: AccessAudit) {
  const hasVehicleData = item.entryType === 'car' || item.entryType === 'motorcycle'
  if (!hasVehicleData) return '—'

  const parts = [item.vehicleBrand?.name, item.vehicleModel, item.vehicleColor, item.vehiclePlate]
    .filter(Boolean)
    .join(' · ')

  return parts || '—'
}

export function AccessPage() {
  const { user } = useAuth()
  const visitorsQuery = useQuery({ queryKey: ['visitors'], queryFn: api.getVisitors })
  const accessQuery = useQuery({ queryKey: ['access-audit'], queryFn: api.getAccessAudit })
  const accessAudit = accessQuery.data ?? []

  const towerFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const row of accessAudit) {
      const id = row.apartment?.towerId
      if (id && !seen.has(id)) {
        seen.add(id)
        const label = row.apartment?.towerData?.name ?? (row.apartment?.tower ? `Torre ${row.apartment.tower}` : id)
        opts.push({ value: id, label })
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [accessAudit])

  const filters: FilterDef[] = [
    {
      key: 'type',
      placeholder: 'Tipo',
      options: [
        { value: 'visitor', label: 'Visitante' },
        { value: 'resident', label: 'Residente' },
      ],
    },
    {
      key: 'entryType',
      placeholder: 'Ingreso',
      options: ENTRY_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    },
    {
      key: 'entryTime',
      type: 'period',
      placeholder: 'Período',
      options: [
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Última semana' },
        { value: 'month', label: 'Último mes' },
        { value: 'quarter', label: 'Últimos 3 meses' },
      ],
    },
    ...(towerFilterOptions.length > 0 ? [{ key: 'towerId', placeholder: 'Torre', options: towerFilterOptions }] : []),
  ]

  const columns: ColumnDef<AccessAudit>[] = [
    {
      header: 'Visitante',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{getPersonName(row)}</p>
          {row.visitor?.document && <p className="text-xs text-slate-400 mt-0.5">CC {row.visitor.document}</p>}
        </div>
      ),
    },
    {
      header: 'Tipo',
      cell: (row) => (
        <StatusBadge
          label={row.visitor ? 'Visitante' : 'Residente'}
          variant={row.visitor ? 'violet' : 'blue'}
        />
      ),
    },
    {
      header: 'Ingreso',
      cell: (row) => (
        <StatusBadge
          label={ENTRY_TYPE_LABELS[row.entryType] ?? 'A pie'}
          variant={getEntryTypeVariant(row.entryType)}
        />
      ),
    },
    {
      header: 'Vehículo',
      cell: (row) => <span className="text-xs text-slate-600">{getVehicleSummary(row)}</span>,
    },
    {
      header: 'Foto',
      cell: (row) => {
        const src = resolveUploadPath(row.visitorPhotoPath)
        if (!src) return <span className="text-slate-400">—</span>

        return <img src={src} alt="Visitante" className="h-10 w-10 rounded-md border border-slate-200 object-cover" />
      },
    },
    {
      header: 'Destino',
      cell: (row) =>
        row.apartment ? (
          <div className="text-sm">
            <p className="text-slate-700">{row.apartment.tower ? `Torre ${row.apartment.tower}` : '—'}</p>
            <p className="text-xs text-slate-400">Apt. {row.apartment.number}</p>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: 'Entrada',
      cell: (row) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.entryTime)}</span>,
    },
    {
      header: 'Notas',
      cell: (row) => <span className="line-clamp-1 max-w-[240px] text-xs text-slate-500">{row.notes ?? '—'}</span>,
    },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Porteria"
        title="Accesos"
        description="Registro de ingresos al conjunto. Incluye tipo de entrada, datos de vehículo y foto del visitante."
        action={
          <div className="flex items-center gap-2">
            {user?.role === 'administrator' && <ManageVehicleBrandsDialog />}
            <RegisterEntryDialog visitors={visitorsQuery.data ?? []} isLoadingVisitors={visitorsQuery.isLoading} />
          </div>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Ingresos"
            value={accessAudit.length}
            detail="Entradas registradas en el sistema."
            icon={<DoorOpen className="size-5" />}
          />
          <KpiCard
            label="Hoy"
            value={
              accessAudit.filter((item) => {
                const today = new Date().toISOString().slice(0, 10)
                return item.entryTime.slice(0, 10) === today
              }).length
            }
            detail="Ingresos registrados hoy."
            icon={<Clock3 className="size-5" />}
          />
          <KpiCard
            label="Visitantes únicos"
            value={new Set(accessAudit.map((item) => item.visitorId).filter(Boolean)).size}
            detail="Visitantes distintos registrados."
            icon={<UserRoundPlus className="size-5" />}
          />
        </div>

        <DataTable
          data={accessAudit}
          columns={columns}
          searchPlaceholder="Buscar visitante, placa, marca o apartamento..."
          getSearchText={(row) =>
            [
              row.visitor ? `${row.visitor.name} ${row.visitor.lastName} ${row.visitor.document ?? ''}` : null,
              row.resident ? `${row.resident.name} ${row.resident.lastName}` : null,
              row.apartment ? `${row.apartment.tower} ${row.apartment.number}` : null,
              row.vehicleBrand?.name,
              row.vehiclePlate,
              row.vehicleModel,
              row.vehicleColor,
              ENTRY_TYPE_LABELS[row.entryType],
              row.notes,
            ]
              .filter(Boolean)
              .join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            type: row.visitor ? 'visitor' : 'resident',
            entryType: row.entryType,
            entryTime: row.entryTime,
            towerId: row.apartment?.towerId ?? '',
          })}
          isLoading={accessQuery.isLoading}
          emptyMessage="Sin ingresos registrados."
        />
      </div>
    </div>
  )
}
