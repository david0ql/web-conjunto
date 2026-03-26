import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, UserCheck, Users } from 'lucide-react'
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

// ─── Assign apartment dialog ──────────────────────────────────────────────────

function AssignApartmentDialog({ resident }: { resident: Resident }) {
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

  const towers = towersQuery.data ?? []
  const apartments = (apartmentsQuery.data ?? []).filter((a) => a.towerId === selectedTowerId)
  const selectedTower = towers.find((t) => t.id === selectedTowerId)
  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId)

  const assignMutation = useMutation({
    mutationFn: () => api.assignResidentApartment(resident.id, selectedApartmentId),
    onSuccess: () => {
      toast.success('Apartamento asignado')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: () => toast.error('No fue posible asignar el apartamento'),
  })

  function handleClose(v: boolean) {
    setOpen(v)
    if (!v) {
      setSelectedTowerId('')
      setSelectedApartmentId('')
      setTowerOpen(false)
      setAptOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          Asignar apt.
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,480px)]">
        <DialogHeader>
          <DialogTitle>
            Asignar apartamento a {resident.name} {resident.lastName}
          </DialogTitle>
          <DialogDescription>
            Selecciona la torre y el apartamento donde vive el residente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
              placeholder={!selectedTowerId ? 'Primero selecciona torre' : 'Selecciona apartamento'}
              searchPlaceholder="Filtrar por número o piso..."
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

          <Button
            className="w-full"
            onClick={() => assignMutation.mutate()}
            disabled={!selectedApartmentId || assignMutation.isPending}
          >
            Confirmar asignación
          </Button>
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

  const unassignMutation = useMutation({
    mutationFn: (id: string) => api.unassignResidentApartment(id),
    onSuccess: () => {
      toast.success('Residente desvinculado del apartamento')
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: () => toast.error('No fue posible desvincular el residente'),
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
          {row.apartmentId ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
              onClick={() => unassignMutation.mutate(row.id)}
              disabled={unassignMutation.isPending}
            >
              Desvincular
            </Button>
          ) : (
            <AssignApartmentDialog resident={row} />
          )}
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
