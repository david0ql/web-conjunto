import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Car, Pencil, Plus } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth-context'
import type { ResidentVehicle } from '@/types/api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const vehicleSchema = z.object({
  towerId: z.string().uuid({ message: 'Selecciona una torre' }),
  apartmentId: z.string().uuid({ message: 'Selecciona un apartamento' }),
  vehicleBrandId: z.string().uuid({ message: 'Selecciona una marca' }),
  plate: z.string().min(1, 'Requerida').max(15, 'Máx. 15 caracteres'),
  color: z.string().max(40).optional().or(z.literal('')),
  model: z.string().max(60).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

// ─── Form component (shared by create & edit) ─────────────────────────────────

function VehicleForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
  isEdit = false,
}: {
  defaultValues: Partial<VehicleFormValues>
  onSubmit: (data: VehicleFormValues) => void
  isPending: boolean
  submitLabel: string
  isEdit?: boolean
}) {
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')

  const { register, handleSubmit, formState: { errors }, control, setValue } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      towerId: '',
      apartmentId: '',
      vehicleBrandId: '',
      plate: '',
      color: '',
      model: '',
      notes: '',
      ...defaultValues,
    },
  })

  const selectedTowerId = useWatch({ control, name: 'towerId' }) ?? ''
  const selectedApartmentId = useWatch({ control, name: 'apartmentId' }) ?? ''
  const selectedVehicleBrandId = useWatch({ control, name: 'vehicleBrandId' }) ?? ''

  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments({ towerId: selectedTowerId, limit: 500 }),
    enabled: Boolean(selectedTowerId),
  })
  const brandsQuery = useQuery({ queryKey: ['vehicle-brands'], queryFn: api.getVehicleBrands })

  const filteredApartments = (apartmentsQuery.data?.data ?? []).filter(
    (a) => a.towerId === selectedTowerId,
  )
  const selectedApartment = filteredApartments.find((a) => a.id === selectedApartmentId) ?? null
  const selectedTower = (towersQuery.data ?? []).find((t) => t.id === selectedTowerId) ?? null
  const selectedBrand = (brandsQuery.data ?? []).find((b) => b.id === selectedVehicleBrandId) ?? null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!isEdit && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Torre" error={errors.towerId?.message}>
            <FilterableSelect
              open={towerOpen}
              onOpenChange={setTowerOpen}
              value={selectedTowerId}
              displayValue={selectedTower?.name ?? ''}
              placeholder="Selecciona torre"
              searchPlaceholder="Filtrar torre..."
              items={towersQuery.data ?? []}
              getKey={(t) => t.id}
              getLabel={(t) => `${t.name} (${t.code})`}
              onSelect={(t) => {
                setValue('towerId', t.id, { shouldValidate: true })
                setValue('apartmentId', '')
                setTowerOpen(false)
              }}
              searchValue={towerSearch}
              onSearchValueChange={setTowerSearch}
            />
          </Field>

          <Field label="Apartamento" error={errors.apartmentId?.message}>
            <FilterableSelect
              open={aptOpen}
              onOpenChange={setAptOpen}
              value={selectedApartmentId}
              displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
              placeholder={!selectedTowerId ? 'Primero elige torre' : 'Selecciona apt.'}
              searchPlaceholder="Filtrar por número..."
              disabled={!selectedTowerId}
              items={filteredApartments}
              getKey={(a) => a.id}
              getLabel={(a) => `Apt. ${a.number}${a.floor != null ? ` · Piso ${a.floor}` : ''}`}
              onSelect={(a) => {
                setValue('apartmentId', a.id, { shouldValidate: true })
                setAptOpen(false)
              }}
              searchValue={aptSearch}
              onSearchValueChange={setAptSearch}
            />
          </Field>
        </div>
      )}

      <Field label="Marca" error={errors.vehicleBrandId?.message}>
        <FilterableSelect
          open={brandOpen}
          onOpenChange={setBrandOpen}
          value={selectedVehicleBrandId}
          displayValue={selectedBrand?.name ?? ''}
          placeholder="Selecciona marca"
          searchPlaceholder="Filtrar marca..."
          items={brandsQuery.data ?? []}
          getKey={(b) => b.id}
          getLabel={(b) => b.name}
          onSelect={(b) => {
            setValue('vehicleBrandId', b.id, { shouldValidate: true })
            setBrandOpen(false)
          }}
          searchValue={brandSearch}
          onSearchValueChange={setBrandSearch}
        />
      </Field>

      <Field label="Placa" error={errors.plate?.message}>
        <Input
          {...register('plate', { setValueAs: (v: string) => v?.trim().toUpperCase() ?? '' })}
          placeholder="ABC123"
          maxLength={15}
          className="uppercase"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Color (opcional)" error={errors.color?.message}>
          <Input {...register('color')} placeholder="Blanco" />
        </Field>
        <Field label="Modelo (opcional)" error={errors.model?.message}>
          <Input {...register('model')} placeholder="2024" />
        </Field>
      </div>

      <Field label="Notas (opcional)" error={errors.notes?.message}>
        <Input {...register('notes')} placeholder="Observaciones adicionales..." />
      </Field>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateVehicleDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: VehicleFormValues) =>
      api.createResidentVehicle({
        apartmentId: data.apartmentId,
        vehicleBrandId: data.vehicleBrandId,
        plate: data.plate.trim().toUpperCase(),
        color: data.color?.trim() || undefined,
        model: data.model?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Vehículo registrado')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['resident-vehicles'] })
    },
    onError: () => toast.error('No fue posible registrar el vehículo'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 size-3.5" />Nuevo vehículo</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,560px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar vehículo</DialogTitle>
          <DialogDescription>Asocia un vehículo a un apartamento del conjunto.</DialogDescription>
        </DialogHeader>
        <VehicleForm
          defaultValues={{}}
          onSubmit={(data) => mutation.mutate(data)}
          isPending={mutation.isPending}
          submitLabel="Registrar vehículo"
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditVehicleDialog({ vehicle }: { vehicle: ResidentVehicle }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: VehicleFormValues) =>
      api.updateResidentVehicle(vehicle.id, {
        vehicleBrandId: data.vehicleBrandId,
        plate: data.plate.trim().toUpperCase(),
        color: data.color?.trim() || undefined,
        model: data.model?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Vehículo actualizado')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['resident-vehicles'] })
    },
    onError: () => toast.error('No fue posible actualizar el vehículo'),
  })

  // Find towerId from the apartment relation
  const towerId = vehicle.apartment?.towerId ?? ''

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
          <Pencil className="mr-1 size-3" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,560px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar vehículo</DialogTitle>
          <DialogDescription>
            Apartamento: Torre {vehicle.apartment?.towerData?.name ?? '—'} · Apt.{' '}
            {vehicle.apartment?.number ?? '—'}
          </DialogDescription>
        </DialogHeader>
        <VehicleForm
          isEdit
          defaultValues={{
            towerId,
            apartmentId: vehicle.apartmentId,
            vehicleBrandId: vehicle.vehicleBrandId,
            plate: vehicle.plate,
            color: vehicle.color ?? '',
            model: vehicle.model ?? '',
            notes: vehicle.notes ?? '',
          }}
          onSubmit={(data) => mutation.mutate(data)}
          isPending={mutation.isPending}
          submitLabel="Guardar cambios"
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResidentVehiclesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'
  const canManage = isAdmin || user?.role === 'porter'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const vehiclesQuery = useQuery({
    queryKey: ['resident-vehicles', page, search],
    queryFn: () => api.getResidentVehicles({ page, limit: 15, search: search || undefined }),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteResidentVehicle(id),
    onSuccess: () => {
      toast.success('Vehículo eliminado')
      void queryClient.invalidateQueries({ queryKey: ['resident-vehicles'] })
    },
    onError: () => toast.error('No fue posible eliminar el vehículo'),
  })

  const vehicles = vehiclesQuery.data?.data ?? []

  const filters: FilterDef[] = useMemo(() => [], [])

  const columns = useMemo<ColumnDef<ResidentVehicle>[]>(() => [
    {
      header: 'Placa',
      cell: (row) => (
        <span className="font-mono font-bold tracking-widest text-slate-900 text-sm">
          {row.plate}
        </span>
      ),
    },
    {
      header: 'Marca / Modelo',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.vehicleBrand?.name ?? '—'}</p>
          {row.model && <p className="text-xs text-slate-400">{row.model}</p>}
        </div>
      ),
    },
    {
      header: 'Color',
      cell: (row) => <span className="text-slate-600">{row.color ?? '—'}</span>,
    },
    {
      header: 'Apartamento',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-800">
            Apt. {row.apartment?.number ?? '—'}
          </p>
          <p className="text-xs text-slate-400">
            {row.apartment?.towerData?.name ?? 'Torre —'}
          </p>
        </div>
      ),
    },
    ...(canManage
      ? [
          {
            header: '',
            className: 'text-right',
            cell: (row: ResidentVehicle) => (
              <div className="flex justify-end gap-2">
                <EditVehicleDialog vehicle={row} />
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`¿Eliminar vehículo placa ${row.plate}?`)) {
                        deleteMutation.mutate(row.id)
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            ),
          } satisfies ColumnDef<ResidentVehicle>,
        ]
      : []),
  ], [isAdmin, deleteMutation])

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Operación"
        title="Vehículos"
        description="Registro de vehículos por apartamento del conjunto."
        action={canManage ? <CreateVehicleDialog /> : undefined}
      />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Car className="size-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {vehiclesQuery.data?.meta.total ?? 0}
            </span>{' '}
            vehículos registrados
          </span>
        </div>
        <DataTable
          data={vehicles}
          columns={columns}
          filters={filters}
          searchPlaceholder="Buscar por placa, marca o apartamento..."
          getSearchText={(row) =>
            [
              row.plate,
              row.vehicleBrand?.name,
              row.model,
              row.color,
              row.apartment?.number,
              row.apartment?.towerData?.name,
            ]
              .filter(Boolean)
              .join(' ')
          }
          isLoading={vehiclesQuery.isLoading}
          emptyMessage="Sin vehículos registrados."
          serverSide
          totalItems={vehiclesQuery.data?.meta.total}
          currentPage={page}
          onPageChange={setPage}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
        />
      </div>
    </div>
  )
}
