import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Building2, Mail, Plus, Trash2, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Resident } from '@/types/api'

// ─── Manage apartments dialog (multi-apartment) ───────────────────────────────

const quickNotifySchema = z.object({
  notificationTypeId: z.string().uuid('Selecciona un tipo'),
  message: z.string().min(4, 'Mínimo 4 caracteres'),
})

function NotifyResidentDialog({ resident }: { resident: Resident }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const residentApartmentId = resident.apartment?.id ?? resident.apartmentId ?? null
  const canNotify = Boolean(residentApartmentId)

  const typesQuery = useQuery({
    queryKey: ['notification-types'],
    queryFn: api.getNotificationTypes,
    enabled: open,
  })

  const form = useForm<z.infer<typeof quickNotifySchema>>({
    resolver: zodResolver(quickNotifySchema),
    defaultValues: { notificationTypeId: '', message: '' },
  })

  const selectedTypeId = useWatch({ control: form.control, name: 'notificationTypeId' })

  const createMutation = useMutation({
    mutationFn: (values: z.infer<typeof quickNotifySchema>) =>
      api.createNotification({
        apartmentId: residentApartmentId,
        residentId: resident.id,
        notificationTypeId: values.notificationTypeId,
        message: values.message,
      }),
    onSuccess: () => {
      toast.success('Notificación enviada')
      form.reset()
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: () => toast.error('No fue posible enviar la notificación'),
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={!canNotify}
          title={!canNotify ? 'El residente debe tener apartamento asignado' : undefined}
        >
          <Bell className="size-3" />
          Notificar
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,520px)]">
        <DialogHeader>
          <DialogTitle>
            Notificar a {resident.name} {resident.lastName}
          </DialogTitle>
          <DialogDescription>
            {resident.apartment
              ? `${resident.apartment.towerData?.name ?? 'Torre'} · Apt. ${resident.apartment.number}`
              : 'Apartamento no disponible'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <Field label="Tipo" error={form.formState.errors.notificationTypeId?.message}>
            <Select
              onValueChange={(v) => form.setValue('notificationTypeId', v, { shouldValidate: true })}
              value={selectedTypeId}
            >
              <SelectTrigger>
                <SelectValue placeholder={typesQuery.isLoading ? 'Cargando...' : 'Selecciona tipo'} />
              </SelectTrigger>
              <SelectContent>
                {(typesQuery.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Mensaje" error={form.formState.errors.message?.message}>
            <Input {...form.register('message')} placeholder="Escribe el mensaje para el residente" />
          </Field>

          <Button type="submit" className="w-full" disabled={createMutation.isPending || !canNotify}>
            Enviar notificación
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManageApartmentsDialog({ resident }: { resident: Resident }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedTowerId, setSelectedTowerId] = useState('')
  const [selectedApartmentId, setSelectedApartmentId] = useState('')
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')

  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments(selectedTowerId || undefined),
    enabled: Boolean(selectedTowerId),
  })
  const myApartmentsQuery = useQuery({
    queryKey: ['resident-apartments', resident.id],
    queryFn: () => api.getResidentApartments(resident.id),
    enabled: open,
  })

  const towers = towersQuery.data ?? []
  const apartments = (apartmentsQuery.data ?? []).filter((a) => a.towerId === selectedTowerId)
  const myApartments = myApartmentsQuery.data ?? []
  const selectedTower = towers.find((t) => t.id === selectedTowerId)
  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId)

  const addMutation = useMutation({
    mutationFn: () => api.addResidentApartment(resident.id, selectedApartmentId),
    onSuccess: () => {
      toast.success('Apartamento agregado')
      setSelectedTowerId('')
      setSelectedApartmentId('')
      void queryClient.invalidateQueries({ queryKey: ['resident-apartments', resident.id] })
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: () => toast.error('No fue posible agregar el apartamento'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.removeResidentApartment(id),
    onSuccess: () => {
      toast.success('Apartamento removido')
      void queryClient.invalidateQueries({ queryKey: ['resident-apartments', resident.id] })
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: () => toast.error('No fue posible remover el apartamento'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
          <Building2 className="size-3" />
          Apartamentos
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,520px)]">
        <DialogHeader>
          <DialogTitle>{resident.name} {resident.lastName} — Apartamentos</DialogTitle>
          <DialogDescription>Gestiona los apartamentos asignados a este residente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current apartments */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asignados actualmente</p>
            {myApartmentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : myApartments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin apartamentos asignados.</p>
            ) : (
              <div className="divide-y rounded-md border">
                {myApartments.map((ra) => (
                  <div key={ra.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">
                        {ra.apartment?.towerData?.name ?? `Torre`} · Apt. {ra.apartment?.number}
                      </p>
                      <p className="text-xs text-muted-foreground">Piso {ra.apartment?.floor ?? '—'}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => removeMutation.mutate(ra.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new apartment */}
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Plus className="size-3" /> Agregar apartamento
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Torre">
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
                    setSelectedTowerId(t.id)
                    setSelectedApartmentId('')
                    setTowerOpen(false)
                    setAptOpen(true)
                  }}
                  searchValue={towerSearch}
                  onSearchValueChange={setTowerSearch}
                />
              </Field>
              <Field label="Apartamento">
                <FilterableSelect
                  open={aptOpen}
                  onOpenChange={setAptOpen}
                  value={selectedApartmentId}
                  displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
                  placeholder={!selectedTowerId ? 'Primero torre' : 'Selecciona apt.'}
                  searchPlaceholder="Filtrar..."
                  disabled={!selectedTowerId}
                  items={apartments}
                  getKey={(a) => a.id}
                  getLabel={(a) => `Apt. ${a.number}${a.floor != null ? ` · Piso ${a.floor}` : ''}`}
                  onSelect={(a) => {
                    setSelectedApartmentId(a.id)
                    setAptOpen(false)
                  }}
                  searchValue={aptSearch}
                  onSearchValueChange={setAptSearch}
                />
              </Field>
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!selectedApartmentId || addMutation.isPending}
            >
              <Plus className="mr-1.5 size-3.5" /> Agregar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create resident dialog ───────────────────────────────────────────────────

const residentSchema = z.object({
  name: z.string().min(2),
  lastName: z.string().min(2),
  document: z.string().min(4).max(50),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
  residentTypeId: z.string().uuid(),
  towerId: z.string().optional().or(z.literal('')),
  apartmentId: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof residentSchema>

function CreateResidentDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')

  const residentTypesQuery = useQuery({ queryKey: ['resident-types'], queryFn: api.getResidentTypes })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })

  const form = useForm<FormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      name: '', lastName: '', document: '', phone: '', email: '',
      password: '', residentTypeId: '', towerId: '', apartmentId: '',
    },
  })

  const selectedResidentTypeId = useWatch({ control: form.control, name: 'residentTypeId' })
  const selectedTowerId = useWatch({ control: form.control, name: 'towerId' })
  const selectedApartmentId = useWatch({ control: form.control, name: 'apartmentId' })

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments(selectedTowerId || undefined),
    enabled: Boolean(selectedTowerId),
  })

  const towers = towersQuery.data ?? []
  const apartments = (apartmentsQuery.data ?? []).filter((a) => a.towerId === selectedTowerId)
  const selectedTower = towers.find((t) => t.id === selectedTowerId)
  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId)

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { towerId: _t, apartmentId, ...residentPayload } = values
      const resident = await api.createResident(residentPayload)
      if (apartmentId) {
        await api.assignResidentApartment(resident.id, apartmentId)
      }
      return resident
    },
    onSuccess: () => {
      toast.success('Residente creado')
      form.reset()
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (typeof msg === 'string' && msg.toLowerCase().includes('already')) {
        toast.error('Ya existe un residente con ese documento o correo')
      } else {
        toast.error('No fue posible crear el residente')
      }
    },
  })

  function handleClose(v: boolean) {
    setOpen(v)
    if (!v) {
      form.reset()
      setTowerOpen(false)
      setAptOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>Nuevo residente</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,760px)]">
        <DialogHeader>
          <DialogTitle>Crear residente</DialogTitle>
          <DialogDescription>Nombre, documento, tipo y credenciales. El apartamento es opcional.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} placeholder="Ana" />
          </Field>
          <Field label="Apellido" error={form.formState.errors.lastName?.message}>
            <Input {...form.register('lastName')} placeholder="García" />
          </Field>
          <Field label="Documento" error={form.formState.errors.document?.message}>
            <Input {...form.register('document')} placeholder="10203040" />
          </Field>
          <Field label="Teléfono" error={form.formState.errors.phone?.message}>
            <Input {...form.register('phone')} placeholder="3001234567" />
          </Field>
          <Field label="Correo" error={form.formState.errors.email?.message}>
            <Input {...form.register('email')} type="email" placeholder="ana@email.com" />
          </Field>
          <Field label="Contraseña" error={form.formState.errors.password?.message}>
            <Input {...form.register('password')} type="password" placeholder="Mínimo 6 caracteres" />
          </Field>
          <Field
            label="Tipo de residente"
            error={form.formState.errors.residentTypeId?.message}
            className="md:col-span-2"
          >
            <Select
              onValueChange={(v) => form.setValue('residentTypeId', v, { shouldValidate: true })}
              value={selectedResidentTypeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {(residentTypesQuery.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Apartment — optional */}
          <div className="md:col-span-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Apartamento (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Torre">
                <FilterableSelect
                  open={towerOpen}
                  onOpenChange={setTowerOpen}
                  value={selectedTowerId ?? ''}
                  displayValue={selectedTower?.name ?? ''}
                  placeholder="Selecciona torre"
                  searchPlaceholder="Filtrar torre..."
                  items={towers}
                  getKey={(t) => t.id}
                  getLabel={(t) => `${t.name} (${t.code})`}
                  onSelect={(t) => {
                    form.setValue('towerId', t.id)
                    form.setValue('apartmentId', '')
                    setTowerOpen(false)
                    setAptOpen(true)
                  }}
                  searchValue={towerSearch}
                  onSearchValueChange={setTowerSearch}
                />
              </Field>
              <Field label="Apartamento">
                <FilterableSelect
                  open={aptOpen}
                  onOpenChange={setAptOpen}
                  value={selectedApartmentId ?? ''}
                  displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
                  placeholder={!selectedTowerId ? 'Primero elige torre' : 'Selecciona apt.'}
                  searchPlaceholder="Filtrar por número o piso..."
                  disabled={!selectedTowerId}
                  items={apartments}
                  getKey={(a) => a.id}
                  getLabel={(a) => `Apt. ${a.number}${a.floor != null ? ` · Piso ${a.floor}` : ''}`}
                  onSelect={(a) => {
                    form.setValue('apartmentId', a.id)
                    setAptOpen(false)
                  }}
                  searchValue={aptSearch}
                  onSearchValueChange={setAptSearch}
                />
              </Field>
            </div>
          </div>

          <Button className="md:col-span-2" type="submit" disabled={createMutation.isPending}>
            Guardar residente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResidentsPage() {
  const queryClient = useQueryClient()

  const residentsQuery = useQuery({ queryKey: ['residents'], queryFn: () => api.getResidents() })
  const residentTypesQuery = useQuery({ queryKey: ['resident-types'], queryFn: api.getResidentTypes })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const residents = residentsQuery.data ?? []

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? api.deactivateResident(id) : api.activateResident(id),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'Residente inactivado' : 'Residente activado')
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: () => toast.error('No fue posible cambiar el estado'),
  })


  const typeFilterOptions = (residentTypesQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))
  const towerFilterOptions = (towersQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))

  const filters: FilterDef[] = [
    ...(typeFilterOptions.length > 0 ? [{ key: 'typeId', placeholder: 'Tipo', options: typeFilterOptions }] : []),
    {
      key: 'isActive',
      placeholder: 'Estado',
      options: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Inactivo' },
      ],
    },
    {
      key: 'hasApartment',
      placeholder: 'Apartamento',
      options: [
        { value: 'yes', label: 'Con apartamento' },
        { value: 'no', label: 'Sin apartamento' },
      ],
    },
    ...(towerFilterOptions.length > 0 ? [{ key: 'towerId', placeholder: 'Torre', options: towerFilterOptions }] : []),
  ]

  const columns: ColumnDef<Resident>[] = [
    {
      header: 'Residente',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.name} {row.lastName}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">CC {row.document}</p>
        </div>
      ),
    },
    {
      header: 'Tipo',
      cell: (row) => <span className="text-slate-600">{row.residentType?.name ?? '—'}</span>,
    },
    {
      header: 'Apartamento',
      cell: (row) =>
        row.apartment ? (
          <div className="text-sm">
            <p className="text-slate-700">{row.apartment.towerData?.name ?? `Torre ${row.apartment.tower}`}</p>
            <p className="text-xs text-slate-400">Apt. {row.apartment.number}</p>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Sin asignar</span>
        ),
    },
    {
      header: 'Contacto',
      cell: (row) => (
        <div className="text-xs">
          <p className="text-slate-600">{row.email ?? '—'}</p>
          <p className="text-slate-400 mt-0.5">{row.phone ?? '—'}</p>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.isActive ? 'Activo' : 'Inactivo'}
          variant={row.isActive ? 'green' : 'slate'}
        />
      ),
    },
    {
      header: 'Desde',
      cell: (row) => <span className="whitespace-nowrap text-xs text-slate-400">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          <NotifyResidentDialog resident={row} />
          <ManageApartmentsDialog resident={row} />
          <Button
            size="sm"
            variant={row.isActive ? 'secondary' : 'outline'}
            className="h-7 text-xs"
            onClick={() => toggleActiveMutation.mutate({ id: row.id, isActive: row.isActive })}
            disabled={toggleActiveMutation.isPending}
          >
            {row.isActive ? 'Inactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Administración"
        title="Residentes"
        description="Alta de residentes con validación por documento y asignación directa de apartamento."
        action={<CreateResidentDialog />}
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Total"
            value={residents.length}
            detail="Residentes registrados en el sistema."
            icon={<Users className="size-5" />}
          />
          <KpiCard
            label="Activos"
            value={residents.filter((r) => r.isActive).length}
            detail="Residentes con estado activo."
            icon={<UserCheck className="size-5" />}
          />
          <KpiCard
            label="Sin apartamento"
            value={residents.filter((r) => !r.apartmentId).length}
            detail="Sin unidad habitacional asignada."
            icon={<Mail className="size-5" />}
          />
        </div>

        <DataTable
          data={residents}
          columns={columns}
          searchPlaceholder="Buscar nombre, documento o correo..."
          getSearchText={(row) =>
            [row.name, row.lastName, row.document, row.email, row.phone].filter(Boolean).join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            typeId: row.residentTypeId,
            isActive: String(row.isActive),
            hasApartment: row.apartmentId ? 'yes' : 'no',
            towerId: row.apartment?.towerId ?? '',
          })}
          isLoading={residentsQuery.isLoading}
          emptyMessage="Sin residentes registrados."
        />
      </div>
    </div>
  )
}
