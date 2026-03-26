import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Layers3, Hash, Users } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Apartment, Tower, Resident } from '@/types/api'

const towerSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(2).max(100),
  totalFloors: z.coerce.number().int().min(1),
  apartmentsPerFloor: z.coerce.number().int().min(1),
})

const apartmentSchema = z.object({
  number: z.string().min(1).max(10),
  towerId: z.string().uuid(),
  floor: z.string().optional().or(z.literal('')),
  area: z.string().optional().or(z.literal('')),
})

// ─── Apartment residents dialog ───────────────────────────────────────────────

function ApartmentResidentsDialog({ apartment }: { apartment: Apartment }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const residentsQuery = useQuery({
    queryKey: ['residents', { apartmentId: apartment.id }],
    queryFn: () => api.getResidents({ apartmentId: apartment.id }),
    enabled: open,
  })
  const residents = residentsQuery.data ?? []

  const unassignMutation = useMutation({
    mutationFn: (id: string) => api.unassignResidentApartment(id),
    onSuccess: () => {
      toast.success('Residente desvinculado')
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
      void queryClient.invalidateQueries({ queryKey: ['residents', { apartmentId: apartment.id }] })
    },
    onError: () => toast.error('No fue posible desvincular el residente'),
  })

  const towerLabel = apartment.towerData?.name ?? `Torre ${apartment.tower}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          <Users className="mr-1 size-3" />
          Residentes
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,560px)]">
        <DialogHeader>
          <DialogTitle>
            {towerLabel} · Apt. {apartment.number}
          </DialogTitle>
          <DialogDescription>
            Residentes asignados a esta unidad. Puedes desasignarlos desde aquí.
          </DialogDescription>
        </DialogHeader>

        {residentsQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">Cargando...</p>
        ) : residents.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 py-8 text-center">
            <p className="text-sm text-slate-400">Sin residentes asignados a este apartamento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {residents.map((resident) => (
              <ResidentRow
                key={resident.id}
                resident={resident}
                onUnassign={() => unassignMutation.mutate(resident.id)}
                isPending={unassignMutation.isPending}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ResidentRow({
  resident,
  onUnassign,
  isPending,
}: {
  resident: Resident
  onUnassign: () => void
  isPending: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">
          {resident.name} {resident.lastName}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">CC {resident.document}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge
          label={resident.isActive ? 'Activo' : 'Inactivo'}
          variant={resident.isActive ? 'green' : 'slate'}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
          onClick={onUnassign}
          disabled={isPending}
        >
          Desasignar
        </Button>
      </div>
    </div>
  )
}

type ActiveTab = 'apartments' | 'towers'

export function ApartmentsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('apartments')

  const apartmentsQuery = useQuery({ queryKey: ['apartments'], queryFn: () => api.getApartments() })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const apartments = apartmentsQuery.data ?? []
  const towers = towersQuery.data ?? []

  // Tower form
  const towerForm = useForm<z.infer<typeof towerSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(towerSchema) as any,
    defaultValues: { code: '', name: '', totalFloors: 1, apartmentsPerFloor: 1 },
  })
  const createTowerMutation = useMutation({
    mutationFn: api.createTower,
    onSuccess: () => {
      toast.success('Torre creada')
      towerForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['towers'] })
    },
    onError: () => toast.error('No fue posible crear la torre'),
  })

  // Apartment form
  const aptForm = useForm<z.infer<typeof apartmentSchema>>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: { number: '', towerId: '' },
  })
  const selectedTowerId = useWatch({ control: aptForm.control, name: 'towerId' })
  const createApartmentMutation = useMutation({
    mutationFn: api.createApartment,
    onSuccess: () => {
      toast.success('Apartamento creado')
      aptForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['apartments'] })
    },
    onError: () => toast.error('No fue posible crear el apartamento'),
  })

  const towerFilterOptions = towers.map((t) => ({ value: t.id, label: t.name }))

  const aptFilters: FilterDef[] = [
    ...(towerFilterOptions.length > 0 ? [{ key: 'towerId', placeholder: 'Torre', options: towerFilterOptions }] : []),
    {
      key: 'occupancy',
      placeholder: 'Ocupación',
      options: [
        { value: 'occupied', label: 'Con residentes' },
        { value: 'vacant', label: 'Sin residentes' },
      ],
    },
  ]

  const aptColumns: ColumnDef<Apartment>[] = [
    {
      header: 'Torre',
      cell: (row) => (
        <span className="font-medium text-slate-900">
          {row.towerData?.name ?? row.tower ?? '—'}
        </span>
      ),
    },
    {
      header: 'Número',
      cell: (row) => <span className="font-mono text-slate-700">{row.number}</span>,
    },
    {
      header: 'Piso',
      cell: (row) => <span className="text-slate-600">{row.floor != null ? `Piso ${row.floor}` : '—'}</span>,
    },
    {
      header: 'Área',
      cell: (row) => <span className="text-slate-600">{row.area != null ? `${row.area} m²` : '—'}</span>,
    },
    {
      header: 'Ocupación',
      cell: (row) => (
        <StatusBadge
          label={(row.residentCount ?? 0) > 0 ? 'Con residentes' : 'Disponible'}
          variant={(row.residentCount ?? 0) > 0 ? 'blue' : 'green'}
        />
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (row) => <ApartmentResidentsDialog apartment={row} />,
    },
  ]

  const towerColumns: ColumnDef<Tower>[] = [
    {
      header: 'Código',
      cell: (row) => <span className="font-mono font-semibold text-slate-900">{row.code}</span>,
    },
    {
      header: 'Nombre',
      cell: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      header: 'Pisos',
      cell: (row) => <span className="text-slate-600">{row.totalFloors}</span>,
    },
    {
      header: 'Apts / piso',
      cell: (row) => <span className="text-slate-600">{row.apartmentsPerFloor}</span>,
    },
    {
      header: 'Capacidad',
      cell: (row) => (
        <span className="text-slate-500 text-xs">
          {row.totalFloors * row.apartmentsPerFloor} unidades
        </span>
      ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <StatusBadge label={row.isActive ? 'Activa' : 'Inactiva'} variant={row.isActive ? 'green' : 'slate'} />
      ),
    },
    {
      header: 'Creada',
      cell: (row) => <span className="text-xs text-slate-400">{formatDate(row.createdAt)}</span>,
    },
  ]

  const aptCount = apartments.length
  const towerCount = towers.length
  const occupiedCount = apartments.filter((a) => (a.residentCount ?? 0) > 0).length

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Administracion"
        title="Torres y apartamentos"
        description="Gestión de torres residenciales y unidades habitacionales."
        action={
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Nueva torre</Button>
              </DialogTrigger>
              <DialogContent className="w-[min(96vw,560px)]">
                <DialogHeader>
                  <DialogTitle>Crear torre</DialogTitle>
                  <DialogDescription>Alta de bloque residencial con su configuración base.</DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={towerForm.handleSubmit((values) => createTowerMutation.mutate(values))}
                >
                  <Field label="Código" error={towerForm.formState.errors.code?.message}>
                    <Input {...towerForm.register('code')} placeholder="A" />
                  </Field>
                  <Field label="Nombre" error={towerForm.formState.errors.name?.message}>
                    <Input {...towerForm.register('name')} placeholder="Torre A" />
                  </Field>
                  <Field label="Total de pisos" error={towerForm.formState.errors.totalFloors?.message}>
                    <Input {...towerForm.register('totalFloors')} type="number" min={1} placeholder="10" />
                  </Field>
                  <Field label="Aptos por piso" error={towerForm.formState.errors.apartmentsPerFloor?.message}>
                    <Input {...towerForm.register('apartmentsPerFloor')} type="number" min={1} placeholder="4" />
                  </Field>
                  <Button className="md:col-span-2" type="submit" disabled={createTowerMutation.isPending}>
                    Guardar torre
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button>Nuevo apartamento</Button>
              </DialogTrigger>
              <DialogContent className="w-[min(96vw,760px)]">
                <DialogHeader>
                  <DialogTitle>Crear apartamento</DialogTitle>
                  <DialogDescription>Alta de unidad habitacional vinculada a una torre.</DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={aptForm.handleSubmit((values) =>
                    createApartmentMutation.mutate({
                      ...values,
                      floor: values.floor ? Number(values.floor) : undefined,
                      area: values.area ? Number(values.area) : undefined,
                    }),
                  )}
                >
                  <Field label="Torre" error={aptForm.formState.errors.towerId?.message} className="md:col-span-2">
                    <Select
                      onValueChange={(value) => aptForm.setValue('towerId', value, { shouldValidate: true })}
                      value={selectedTowerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona torre" />
                      </SelectTrigger>
                      <SelectContent>
                        {towers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Número" error={aptForm.formState.errors.number?.message}>
                    <Input {...aptForm.register('number')} placeholder="101" />
                  </Field>
                  <Field label="Piso" error={aptForm.formState.errors.floor?.message}>
                    <Input {...aptForm.register('floor')} type="number" placeholder="1" />
                  </Field>
                  <Field label="Área m²" error={aptForm.formState.errors.area?.message}>
                    <Input {...aptForm.register('area')} type="number" step="0.01" placeholder="87.5" />
                  </Field>
                  <Button className="md:col-span-2" type="submit" disabled={createApartmentMutation.isPending}>
                    Guardar apartamento
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Torres"
            value={towerCount}
            detail="Bloques residenciales registrados."
            icon={<Layers3 className="size-5" />}
          />
          <KpiCard
            label="Unidades"
            value={aptCount}
            detail="Apartamentos creados en el sistema."
            icon={<Building2 className="size-5" />}
          />
          <KpiCard
            label="Ocupados"
            value={occupiedCount}
            detail="Unidades con estado ocupado."
            icon={<Hash className="size-5" />}
          />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('apartments')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'apartments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Apartamentos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('towers')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'towers'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Torres
          </button>
        </div>

        {activeTab === 'apartments' ? (
          <DataTable
            data={apartments}
            columns={aptColumns}
            searchPlaceholder="Buscar por número o torre..."
            getSearchText={(row) =>
              [row.number, row.tower, row.towerData?.name, row.towerData?.code].filter(Boolean).join(' ')
            }
            filters={aptFilters}
            getFilterValues={(row) => ({
            towerId: row.towerId,
            occupancy: (row.residentCount ?? 0) > 0 ? 'occupied' : 'vacant',
          })}
            isLoading={apartmentsQuery.isLoading}
            emptyMessage="Sin apartamentos registrados."
          />
        ) : (
          <DataTable
            data={towers}
            columns={towerColumns}
            searchPlaceholder="Buscar por código o nombre..."
            getSearchText={(row) => [row.code, row.name].join(' ')}
            isLoading={towersQuery.isLoading}
            emptyMessage="Sin torres registradas."
          />
        )}
      </div>
    </div>
  )
}
