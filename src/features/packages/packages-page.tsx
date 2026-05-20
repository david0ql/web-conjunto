import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Camera, CheckCircle2, ImageOff, Package, Truck, X } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Textarea } from '@/components/ui/textarea'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ImageCaptureControl } from '@/components/ui/image-capture-control'
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate, formatName } from '@/lib/utils'
import { UPLOADS_URL } from '@/lib/constants'
import { toast } from 'sonner'
import type { PackageItem } from '@/types/api'

// ─── Package photos dialog ────────────────────────────────────────────────────

function PackagePhotosDialog({ pkg }: { pkg: PackageItem }) {
  const [open, setOpen] = useState(false)

  const photosQuery = useQuery({
    queryKey: ['package-photos', pkg.id],
    queryFn: () => api.getPackagePhotos(pkg.id),
    enabled: open,
  })
  const photos = photosQuery.data ?? []

  const apt = pkg.apartment ?? pkg.resident?.apartment

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Camera className="size-3.5 text-slate-400" />
          {(pkg.photoCount ?? 0) > 0 ? (
            <span className="flex size-4 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
              {pkg.photoCount}
            </span>
          ) : (
            <span className="text-slate-400">0</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,560px)]">
        <DialogHeader>
          <DialogTitle>Fotos del paquete</DialogTitle>
          <DialogDescription>
            {apt
              ? `${apt.towerData?.name ?? `Torre ${apt.tower}`} · Apt. ${apt.number}`
              : 'Paquete'}{' '}
            · {pkg.description ?? 'Sin descripción'}
          </DialogDescription>
        </DialogHeader>

        {photosQuery.isLoading ? (
          <p className="py-4 text-center text-sm text-slate-400">Cargando fotos…</p>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10">
            <ImageOff className="size-8 text-slate-300" />
            <p className="text-sm text-slate-400">Sin fotos registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pkg.deliveryPhotoPath && (
              <ImagePreviewDialog
                src={`${UPLOADS_URL}/${pkg.deliveryPhotoPath}`}
                alt="Foto de entrega"
                title="Foto de entrega"
                description={apt ? `${apt.towerData?.name ?? `Torre ${apt.tower}`} · Apt. ${apt.number}` : undefined}
                className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50"
              >
                <img
                  src={`${UPLOADS_URL}/${pkg.deliveryPhotoPath}`}
                  alt="Foto de entrega"
                  className="aspect-square w-full object-cover transition group-hover:opacity-90"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-950/70 px-2 py-1">
                  <p className="text-[10px] font-medium text-white">Entrega</p>
                </div>
              </ImagePreviewDialog>
            )}
            {photos.map((photo) => (
              <ImagePreviewDialog
                key={photo.id}
                src={`${UPLOADS_URL}/${photo.filePath}`}
                alt="Foto de paquete"
                title="Foto de paquete"
                description={formatDate(photo.createdAt)}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={`${UPLOADS_URL}/${photo.filePath}`}
                  alt="Foto de paquete"
                  className="aspect-square w-full object-cover transition group-hover:opacity-90"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
                  <p className="text-[10px] text-white/80">{formatDate(photo.createdAt)}</p>
                </div>
              </ImagePreviewDialog>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DeliveryDialog({
  pkg,
  isPending,
  onDeliver,
}: {
  pkg: PackageItem
  isPending: boolean
  onDeliver: (payload: { id: string; receivedByResidentId?: string; deliveryPhoto: File }) => void
}) {
  const [open, setOpen] = useState(false)
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const deliveryPreview = useMemo(() => (deliveryPhoto ? URL.createObjectURL(deliveryPhoto) : null), [deliveryPhoto])

  useEffect(
    () => () => {
      if (deliveryPreview) URL.revokeObjectURL(deliveryPreview)
    },
    [deliveryPreview],
  )

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setDeliveryPhoto(null)
      setSubmitting(false)
    }
  }

  function handleSubmit() {
    if (submitting || isPending) return
    if (!deliveryPhoto) {
      toast.error('La foto de entrega es obligatoria')
      return
    }

    setSubmitting(true)
    onDeliver({
      id: pkg.id,
      receivedByResidentId: pkg.residentId ?? undefined,
      deliveryPhoto,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isPending}>
          Marcar entrega
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,520px)]">
        <DialogHeader>
          <DialogTitle>Confirmar entrega</DialogTitle>
          <DialogDescription>
            Toma o selecciona una foto como soporte obligatorio de la entrega.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Foto de entrega (obligatoria)">
            <ImageCaptureControl
              buttonLabel={deliveryPhoto ? 'Cambiar foto' : 'Seleccionar foto'}
              onFiles={(files) => setDeliveryPhoto(files[0] ?? null)}
            />
            {!deliveryPhoto && (
              <p className="mt-2 text-xs text-rose-500">Debes adjuntar una foto para entregar el paquete.</p>
            )}
            {deliveryPreview && (
              <div className="mt-3 relative w-fit">
                <ImagePreviewDialog
                  src={deliveryPreview}
                  alt="Entrega"
                  title="Foto de entrega"
                  className="size-24 rounded-lg border border-slate-200 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setDeliveryPhoto(null)}
                  className="absolute -right-2 -top-2 rounded-full border border-slate-300 bg-white p-1 text-slate-500 hover:text-slate-700"
                  aria-label="Quitar foto"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </Field>
          <Button type="button" className="w-full" disabled={submitting || isPending} onClick={handleSubmit}>
            Confirmar entrega
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const packageSchema = z.object({
  towerId: z.string().min(1, 'Selecciona una torre'),
  apartmentId: z.string().uuid('Selecciona un apartamento'),
  residentId: z.string().uuid().optional().or(z.literal('')),
  description: z.string().max(300).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof packageSchema>

export function PackagesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [createSubmitting, setCreateSubmitting] = useState(false)

  // Dropdown open states
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')
  const [residentOpen, setResidentOpen] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({})
  const [quickTowerId, setQuickTowerId] = useState('')
  const [quickApartmentId, setQuickApartmentId] = useState('')
  const [quickTowerOpen, setQuickTowerOpen] = useState(false)
  const [quickTowerSearch, setQuickTowerSearch] = useState('')
  const [quickAptOpen, setQuickAptOpen] = useState(false)
  const [quickAptSearch, setQuickAptSearch] = useState('')

  const packagesQuery = useQuery({
    queryKey: ['packages', user?.role, page, search, tableFilters, quickApartmentId],
    queryFn: () => api.getPackages({
      page,
      limit: 15,
      search: search || undefined,
      apartmentId: quickApartmentId || undefined,
      ...tableFilters,
    }),
    placeholderData: keepPreviousData,
  })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const packages = packagesQuery.data?.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: { towerId: '', apartmentId: '', residentId: '', description: '' },
  })

  const selectedTowerId = useWatch({ control: form.control, name: 'towerId' })
  const selectedApartmentId = useWatch({ control: form.control, name: 'apartmentId' })
  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments({ towerId: selectedTowerId, limit: 200 }),
    enabled: Boolean(selectedTowerId),
  })
  const quickApartmentsQuery = useQuery({
    queryKey: ['apartments', 'packages-quick', quickTowerId],
    queryFn: () => api.getApartments({ towerId: quickTowerId, limit: 500 }),
    enabled: Boolean(quickTowerId),
  })
  const residentsQuery = useQuery({
    queryKey: ['residents', { apartmentId: selectedApartmentId }],
    queryFn: () => api.getResidents({ apartmentId: selectedApartmentId, limit: 200 }),
    enabled: Boolean(selectedApartmentId),
  })

  const towers = towersQuery.data ?? []
  const apartments = (apartmentsQuery.data?.data ?? []).filter((a) => a.towerId === selectedTowerId)
  const residents = residentsQuery.data?.data ?? []

  const selectedTower = towers.find((t) => t.id === selectedTowerId)
  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId)
  const selectedResident = residents.find((r) => r.id === selectedResidentId)

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.createPackage({
        apartmentId: values.apartmentId,
        ...(values.residentId ? { residentId: values.residentId } : {}),
        ...(values.description ? { description: values.description } : {}),
      }, photos),
    onSuccess: () => {
      toast.success('Paquete registrado')
      form.reset()
      setPhotos([])
      setCreateSubmitting(false)
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: () => toast.error('No fue posible registrar el paquete'),
    onSettled: () => setCreateSubmitting(false),
  })

  const deliverMutation = useMutation({
    mutationFn: ({
      id,
      receivedByResidentId,
      deliveryPhoto,
    }: {
      id: string
      receivedByResidentId?: string
      deliveryPhoto: File
    }) => api.markPackageDelivered(id, receivedByResidentId ? { receivedByResidentId } : {}, deliveryPhoto),
    onSuccess: () => {
      toast.success('Paquete entregado')
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: () => toast.error('No fue posible entregar el paquete'),
  })

  function handleDialogClose(v: boolean) {
    setOpen(v)
    if (!v) {
      form.reset()
      setPhotos([])
      setCreateSubmitting(false)
      setTowerOpen(false)
      setAptOpen(false)
      setResidentOpen(false)
    }
  }

  function handlePhotoSelection(selectedFiles: File[]) {
    if (selectedFiles.length > 0) {
      setPhotos((current) => [...current, ...selectedFiles].slice(0, 10))
    }
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const towerFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const pkg of packages) {
      const id = pkg.apartment?.towerId ?? pkg.resident?.apartment?.towerId
      if (id && !seen.has(id)) {
        seen.add(id)
        const apt = pkg.apartment ?? pkg.resident?.apartment
        const label = apt?.towerData?.name ?? (apt?.tower ? `Torre ${apt.tower}` : id)
        opts.push({ value: id, label })
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [packages])

  const filters: FilterDef[] = [
    {
      key: 'delivered',
      placeholder: 'Estado',
      options: [
        { value: 'false', label: 'Pendiente' },
        { value: 'true', label: 'Entregado' },
      ],
    },
    {
      key: 'arrivalTime',
      type: 'period' as const,
      placeholder: 'Período',
      options: [
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Última semana' },
        { value: 'month', label: 'Último mes' },
        { value: 'quarter', label: 'Últimos 3 meses' },
      ],
    },
    ...(towerFilterOptions.length > 0
      ? [{ key: 'towerId', placeholder: 'Torre', options: towerFilterOptions }]
      : []),
  ]

  const columns: ColumnDef<PackageItem>[] = [
    {
      header: 'Apartamento',
      cell: (row) => {
        const apt = row.apartment ?? row.resident?.apartment
        return apt ? (
          <div>
            <p className="font-medium text-slate-900">
              {apt.towerData?.name ?? (apt.tower ? `Torre ${apt.tower}` : '—')} · Apt. {apt.number}
            </p>
            {row.resident && (
              <p className="text-xs text-slate-400 mt-0.5">
                {formatName(row.resident.name, row.resident.lastName)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-slate-400">Sin apartamento</span>
        )
      },
    },
    {
      header: 'Descripción',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[260px] text-slate-600">
          {row.description ?? 'Sin descripción'}
        </span>
      ),
    },
    {
      header: 'Llegada',
      cell: (row) => (
        <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.arrivalTime)}</span>
      ),
    },
    {
      header: 'Entregado',
      cell: (row) =>
        row.deliveredTime ? (
          <div>
            <p className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.deliveredTime)}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {row.deliveredByEmployee ? `${row.deliveredByEmployee.name} ${row.deliveredByEmployee.lastName}` : 'Sin responsable'}
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Pendiente</span>
        ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.delivered ? 'Entregado' : 'Pendiente'}
          variant={row.delivered ? 'green' : 'amber'}
        />
      ),
    },
    {
      header: 'Fotos',
      cell: (row) => <PackagePhotosDialog pkg={row} />,
    },
    {
      header: '',
      className: 'text-right',
      cell: (row) =>
        !row.delivered ? (
          <DeliveryDialog
            pkg={row}
            isPending={deliverMutation.isPending}
            onDeliver={(payload) => deliverMutation.mutate(payload)}
          />
        ) : null,
    },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Portería"
        title="Paquetería"
        description="Registra recepciones y marca entregas con trazabilidad."
        action={
          user ? (
            <Dialog open={open} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button>Registrar paquete</Button>
              </DialogTrigger>
              <DialogContent className="w-[min(96vw,620px)]">
                <DialogHeader>
                  <DialogTitle>Nuevo paquete</DialogTitle>
                  <DialogDescription>Selecciona torre y apartamento. El residente es opcional.</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit((values) => {
                    if (createSubmitting) return
                    setCreateSubmitting(true)
                    createMutation.mutate(values)
                  })}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Torre" error={form.formState.errors.towerId?.message}>
                      <FilterableSelect
                        open={towerOpen}
                        onOpenChange={setTowerOpen}
                        value={selectedTowerId}
                        displayValue={selectedTower?.name ?? ''}
                        placeholder="Selecciona torre"
                        searchPlaceholder="Filtrar torre..."
                        items={towers}
                        getKey={(t) => t.id}
                        getLabel={(t) => `${t.name} (${t.code})`}
                        onSelect={(t) => {
                          form.setValue('towerId', t.id, { shouldValidate: true })
                          form.setValue('apartmentId', '')
                          form.setValue('residentId', '')
                          setTowerOpen(false)
                          setAptOpen(true)
                        }}
                        searchValue={towerSearch}
                        onSearchValueChange={setTowerSearch}
                      />
                    </Field>
                    <Field label="Apartamento" error={form.formState.errors.apartmentId?.message}>
                      <FilterableSelect
                        open={aptOpen}
                        onOpenChange={setAptOpen}
                        value={selectedApartmentId}
                        displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
                        placeholder={!selectedTowerId ? 'Primero elige torre' : 'Selecciona apt.'}
                        searchPlaceholder="Filtrar por número o piso..."
                        disabled={!selectedTowerId}
                        items={apartments}
                        getKey={(a) => a.id}
                        getLabel={(a) => `Apt. ${a.number}${a.floor != null ? ` · Piso ${a.floor}` : ''}`}
                        onSelect={(a) => {
                          form.setValue('apartmentId', a.id, { shouldValidate: true })
                          form.setValue('residentId', '')
                          setAptOpen(false)
                        }}
                        searchValue={aptSearch}
                        onSearchValueChange={setAptSearch}
                      />
                    </Field>
                  </div>

                  <Field label="Residente (opcional)">
                    <FilterableSelect
                      open={residentOpen}
                      onOpenChange={setResidentOpen}
                      value={selectedResidentId ?? ''}
                      displayValue={
                        selectedResident
                          ? `${selectedResident.name} ${selectedResident.lastName}`
                          : ''
                      }
                      placeholder={!selectedApartmentId ? 'Primero elige apartamento' : 'Sin residente específico'}
                      searchPlaceholder="Filtrar residente..."
                      disabled={!selectedApartmentId}
                      items={[{ id: '', name: 'Sin residente específico', lastName: '' } as any, ...residents]}
                      getKey={(r: any) => r.id}
                      getLabel={(r: any) => r.id ? `${r.name} ${r.lastName}` : 'Sin residente específico'}
                      onSelect={(r: any) => {
                        form.setValue('residentId', r.id || '')
                        setResidentOpen(false)
                      }}
                      searchValue={residentSearch}
                      onSearchValueChange={setResidentSearch}
                    />
                  </Field>

                  <Field label="Descripción" error={form.formState.errors.description?.message}>
                    <Textarea
                      {...form.register('description')}
                      placeholder="Ej. caja mediana, sobre de mensajería, pedido de farmacia."
                    />
                  </Field>

                  <Field label="Fotos (opcional)">
                    <div className="flex items-center gap-3">
                      <ImageCaptureControl
                        multiple
                        buttonLabel="Agregar fotos"
                        onFiles={handlePhotoSelection}
                      />
                      <p className="text-xs text-slate-400">
                        {photos.length === 0
                          ? 'Hasta 10 imágenes'
                          : `${photos.length} / 10 foto${photos.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    {photos.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {[...photos].reverse().map((photo, reversedIndex) => {
                          const originalIndex = photos.length - 1 - reversedIndex
                          const url = URL.createObjectURL(photo)
                          return (
                            <div
                              key={`${photo.name}-${photo.lastModified}-${photo.size}`}
                              className="relative shrink-0"
                            >
                              <img
                                src={url}
                                alt={photo.name}
                                className="h-20 w-20 rounded-lg object-cover border border-slate-200"
                                onLoad={() => URL.revokeObjectURL(url)}
                              />
                              <button
                                type="button"
                                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm hover:bg-red-600 transition-colors"
                                onClick={() => removePhoto(originalIndex)}
                                aria-label="Eliminar foto"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Field>

                  <Button type="submit" className="w-full" disabled={createSubmitting || createMutation.isPending}>
                    Guardar paquete
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Paquetes"
            value={packagesQuery.data?.meta.total ?? 0}
            detail="Recepciones totales registradas."
            icon={<Package className="size-5" />}
          />
          <KpiCard
            label="Pendientes (pág.)"
            value={packages.filter((item) => !item.delivered).length}
            detail="Sin entregar en la página actual."
            icon={<Truck className="size-5" />}
          />
          <KpiCard
            label="Entregados (pág.)"
            value={packages.filter((item) => item.delivered).length}
            detail="Entregados en la página actual."
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <Building2 className="size-4 shrink-0 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Filtro por apartamento:</span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <FilterableSelect
              open={quickTowerOpen}
              onOpenChange={setQuickTowerOpen}
              value={quickTowerId}
              displayValue={(towersQuery.data ?? []).find((t) => t.id === quickTowerId)?.name ?? ''}
              placeholder="Torre"
              searchPlaceholder="Buscar torre..."
              items={towersQuery.data ?? []}
              getKey={(t) => t.id}
              getLabel={(t) => t.name}
              searchValue={quickTowerSearch}
              onSearchValueChange={setQuickTowerSearch}
              onSelect={(t) => {
                setQuickTowerId(t.id)
                setQuickApartmentId('')
                setQuickTowerOpen(false)
                setQuickAptOpen(true)
                setPage(1)
              }}
            />
            <FilterableSelect
              open={quickAptOpen}
              onOpenChange={setQuickAptOpen}
              value={quickApartmentId}
              displayValue={quickApartmentId
                ? `Apt. ${(quickApartmentsQuery.data?.data ?? []).find((a) => a.id === quickApartmentId)?.number ?? ''}`
                : ''}
              placeholder={quickTowerId ? 'Apartamento' : 'Primero selecciona torre'}
              searchPlaceholder="Buscar apartamento..."
              disabled={!quickTowerId}
              items={quickApartmentsQuery.data?.data ?? []}
              getKey={(a) => a.id}
              getLabel={(a) => `Apt. ${a.number}`}
              searchValue={quickAptSearch}
              onSearchValueChange={setQuickAptSearch}
              onSelect={(a) => { setQuickApartmentId(a.id); setQuickAptOpen(false); setPage(1) }}
            />
            {(quickTowerId || quickApartmentId) && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                onClick={() => { setQuickTowerId(''); setQuickApartmentId(''); setPage(1) }}
              >
                <X className="size-3" /> Limpiar
              </button>
            )}
          </div>
        </div>

        <DataTable
          data={packages}
          columns={columns}
          searchPlaceholder="Buscar apartamento, residente o descripción..."
          getSearchText={(row) => {
            const apt = row.apartment ?? row.resident?.apartment
            return [
              apt ? `${apt.towerData?.name ?? ''} ${apt.number}` : null,
              row.resident ? formatName(row.resident.name, row.resident.lastName) : null,
              row.description,
            ]
              .filter(Boolean)
              .join(' ')
          }}
          filters={filters}
          getFilterValues={(row) => ({
            delivered: String(row.delivered),
            arrivalTime: row.arrivalTime,
            towerId: row.apartment?.towerId ?? row.resident?.apartment?.towerId ?? '',
          })}
          isLoading={packagesQuery.isLoading}
          emptyMessage="Sin paquetes registrados."
          serverSide
          totalItems={packagesQuery.data?.meta.total}
          currentPage={page}
          onPageChange={setPage}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          onFiltersChange={(v) => { setTableFilters(v); setPage(1) }}
        />
      </div>
    </div>
  )
}
