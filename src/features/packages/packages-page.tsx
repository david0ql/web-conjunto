import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, CheckCircle2, ImageOff, Package, Truck } from 'lucide-react'
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
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate } from '@/lib/utils'
import { UPLOADS_URL } from '@/lib/constants'
import { toast } from 'sonner'
import type { PackageItem } from '@/types/api'

// ─── Package photos dialog ────────────────────────────────────────────────────

function PackagePhotosDialog({ pkg }: { pkg: PackageItem }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const photosQuery = useQuery({
    queryKey: ['package-photos', pkg.id],
    queryFn: () => api.getPackagePhotos(pkg.id),
    enabled: open,
  })
  const photos = photosQuery.data ?? []

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadPackagePhoto(pkg.id, file),
    onSuccess: () => {
      toast.success('Foto guardada')
      void queryClient.invalidateQueries({ queryKey: ['package-photos', pkg.id] })
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: () => toast.error('No fue posible guardar la foto'),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
      e.target.value = ''
    }
  }

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

        {/* Camera capture — hidden input, camera only */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
          {uploadMutation.isPending ? 'Guardando...' : 'Tomar foto'}
        </Button>

        {photosQuery.isLoading ? (
          <p className="py-4 text-center text-sm text-slate-400">Cargando fotos...</p>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10">
            <ImageOff className="size-8 text-slate-300" />
            <p className="text-sm text-slate-400">Sin fotos registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={`${UPLOADS_URL}/${photo.filePath}`}
                target="_blank"
                rel="noreferrer"
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
              </a>
            ))}
          </div>
        )}
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

  // Dropdown open states
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')
  const [residentOpen, setResidentOpen] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')

  const packagesQuery = useQuery({ queryKey: ['packages', user?.role], queryFn: () => api.getPackages() })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const packages = packagesQuery.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: { towerId: '', apartmentId: '', residentId: '', description: '' },
  })

  const selectedTowerId = useWatch({ control: form.control, name: 'towerId' })
  const selectedApartmentId = useWatch({ control: form.control, name: 'apartmentId' })
  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments(selectedTowerId),
    enabled: Boolean(selectedTowerId),
  })
  const residentsQuery = useQuery({
    queryKey: ['residents', { apartmentId: selectedApartmentId }],
    queryFn: () => api.getResidents({ apartmentId: selectedApartmentId }),
    enabled: Boolean(selectedApartmentId),
  })

  const towers = towersQuery.data ?? []
  const apartments = (apartmentsQuery.data ?? []).filter((a) => a.towerId === selectedTowerId)
  const residents = residentsQuery.data ?? []

  const selectedTower = towers.find((t) => t.id === selectedTowerId)
  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId)
  const selectedResident = residents.find((r) => r.id === selectedResidentId)

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.createPackage({
        apartmentId: values.apartmentId,
        ...(values.residentId ? { residentId: values.residentId } : {}),
        ...(values.description ? { description: values.description } : {}),
      }),
    onSuccess: () => {
      toast.success('Paquete registrado')
      form.reset()
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: () => toast.error('No fue posible registrar el paquete'),
  })

  const deliverMutation = useMutation({
    mutationFn: ({ id, receivedByResidentId }: { id: string; receivedByResidentId?: string }) =>
      api.markPackageDelivered(id, receivedByResidentId ? { receivedByResidentId } : {}),
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
      setTowerOpen(false)
      setAptOpen(false)
      setResidentOpen(false)
    }
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
                {row.resident.name} {row.resident.lastName}
              </p>
            )}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
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
          <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.deliveredTime)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
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
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() =>
              deliverMutation.mutate({
                id: row.id,
                receivedByResidentId: row.residentId ?? undefined,
              })
            }
            disabled={deliverMutation.isPending}
          >
            Marcar entrega
          </Button>
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
                  onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
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

                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
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
            value={packages.length}
            detail="Recepciones totales registradas."
            icon={<Package className="size-5" />}
          />
          <KpiCard
            label="Pendientes"
            value={packages.filter((item) => !item.delivered).length}
            detail="Aún por entregar a residentes."
            icon={<Truck className="size-5" />}
          />
          <KpiCard
            label="Entregados"
            value={packages.filter((item) => item.delivered).length}
            detail="Procesados correctamente."
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>

        <DataTable
          data={packages}
          columns={columns}
          searchPlaceholder="Buscar apartamento, residente o descripción..."
          getSearchText={(row) => {
            const apt = row.apartment ?? row.resident?.apartment
            return [
              apt ? `${apt.towerData?.name ?? ''} ${apt.number}` : null,
              row.resident ? `${row.resident.name} ${row.resident.lastName}` : null,
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
        />
      </div>
    </div>
  )
}
