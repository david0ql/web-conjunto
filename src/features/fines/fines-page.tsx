import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Download, FileText, PlusCircle, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Navigate, NavLink } from 'react-router-dom'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Field } from '@/components/forms/field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Apartment, Employee, Fine, FineType, Resident, Tower } from '@/types/api'

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const createFineSchema = z.object({
  towerId: z.string().uuid('Selecciona una torre'),
  apartmentId: z.string().uuid('Selecciona un apartamento'),
  residentId: z.string().optional().or(z.literal('')),
  fineTypeId: z.string().uuid('Selecciona un tipo de multa'),
  amount: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

const createFineTypeSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  value: z.string().min(1, 'Ingresa un valor'),
})

interface FineFilters {
  towerId?: string
  apartmentId?: string
  residentId?: string
  fineTypeId?: string
  createdByEmployeeId?: string
  dateFrom?: string
  dateTo?: string
}

const tabs = [
  { to: '/app/fines/assign', label: 'Asignar', icon: PlusCircle },
  { to: '/app/fines/history', label: 'Histórico', icon: FileText },
  { to: '/app/fines/types', label: 'Tipos', icon: Settings2 },
]

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toIsoDate(date)
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function fineTypeName(fine: Fine) {
  return fine.fineTypeNameSnapshot ?? fine.fineType?.name ?? 'Multa'
}

function apartmentLabel(fine: Fine) {
  const apartment = fine.apartment ?? fine.resident?.apartment
  return `${apartment?.towerData?.name ?? 'Torre'} · Apt. ${apartment?.number ?? 'N/A'}`
}

function residentLabel(resident?: Resident | null) {
  return resident ? `${resident.name} ${resident.lastName}` : 'Apartamento'
}

function employeeLabel(employee?: Employee | null) {
  return employee ? `${employee.name} ${employee.lastName}` : '—'
}

function finePeriodLabel(fine: Fine) {
  const year = fine.createdYear ?? fine.createdAt.slice(0, 4)
  const month = fine.createdMonth ? String(fine.createdMonth).padStart(2, '0') : fine.createdAt.slice(5, 7)
  return `${year}-${month}`
}

function FinesLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  )
                }
              >
                <Icon className="size-4" />
                {tab.label}
              </NavLink>
            )
          })}
        </div>
        {children}
      </div>
    </div>
  )
}

export function FinesPage() {
  return <Navigate to="/app/fines/assign" replace />
}

export function FinesTypesPage() {
  const queryClient = useQueryClient()
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const fineTypesQuery = useQuery({ queryKey: ['fine-types'], queryFn: api.getFineTypes })
  const fineTypes = fineTypesQuery.data ?? []

  const createTypeForm = useForm<z.infer<typeof createFineTypeSchema>>({
    resolver: zodResolver(createFineTypeSchema),
    defaultValues: { name: '', value: '' },
  })

  const createTypeMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: number }) => api.createFineType({ name, value }),
    onSuccess: () => {
      toast.success('Tipo de multa creado')
      createTypeForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['fine-types'] })
    },
    onError: () => toast.error('No fue posible crear el tipo de multa'),
    onSettled: () => setCreateSubmitting(false),
  })

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => api.updateFineTypeValue(id, { value }),
    onSuccess: () => {
      toast.success('Valor actualizado')
      void queryClient.invalidateQueries({ queryKey: ['fine-types'] })
    },
    onError: () => toast.error('No fue posible actualizar el valor'),
  })

  return (
    <FinesLayout
      eyebrow="Multas"
      title="Tipos de multa"
      description="Parametrización administrativa. Los cambios aplican hacia adelante; el histórico conserva el snapshot usado al asignar."
    >
      <Card>
        <CardHeader>
          <CardTitle>Crear tipo</CardTitle>
          <CardDescription>Define el nombre y valor vigente para nuevas multas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_180px_140px]"
            onSubmit={createTypeForm.handleSubmit((values) => {
              if (createSubmitting) return
              const value = Number(values.value)
              if (!Number.isFinite(value) || value < 0) {
                createTypeForm.setError('value', { message: 'Ingresa un valor válido' })
                return
              }
              setCreateSubmitting(true)
              createTypeMutation.mutate({ name: values.name.trim(), value })
            })}
          >
            <Field label="Nombre" error={createTypeForm.formState.errors.name?.message}>
              <Input {...createTypeForm.register('name')} placeholder="Ej. Ruido excesivo" />
            </Field>
            <Field label="Valor" error={createTypeForm.formState.errors.value?.message}>
              <Input {...createTypeForm.register('value')} placeholder="90000" inputMode="numeric" />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={createSubmitting || createTypeMutation.isPending}>
                Crear tipo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores vigentes</CardTitle>
          <CardDescription>Actualizar un valor no reescribe multas antiguas ni reportes pasados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {fineTypes.length === 0 ? (
            <p className="text-sm text-slate-400">No hay tipos de multa registrados.</p>
          ) : (
            fineTypes.map((fineType) => (
              <FineTypeValueRow
                key={fineType.id}
                fineType={fineType}
                isSaving={updateTypeMutation.isPending}
                onSave={(value) => updateTypeMutation.mutate({ id: fineType.id, value })}
              />
            ))
          )}
        </CardContent>
      </Card>
    </FinesLayout>
  )
}

function FineTypeValueRow({
  fineType,
  isSaving,
  onSave,
}: {
  fineType: FineType
  isSaving: boolean
  onSave: (value: number) => void
}) {
  const [value, setValue] = useState(() => String(fineType.value))
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_180px_120px] sm:items-end">
      <div>
        <p className="text-sm font-semibold text-slate-900">{fineType.name}</p>
        <p className="text-xs text-slate-500">
          Creado {formatDate(fineType.createdAt)} por {employeeLabel(fineType.createdByEmployee)}
        </p>
      </div>
      <Field label="Valor vigente">
        <Input value={value} inputMode="numeric" onChange={(event) => setValue(event.target.value)} />
      </Field>
      <Button
        type="button"
        disabled={submitting || isSaving}
        onClick={() => {
          if (submitting || isSaving) return
          const nextValue = Number(value)
          if (!Number.isFinite(nextValue) || nextValue < 0) {
            toast.error('Ingresa un valor válido')
            return
          }
          setSubmitting(true)
          onSave(nextValue)
          window.setTimeout(() => setSubmitting(false), 1000)
        }}
      >
        Guardar
      </Button>
    </div>
  )
}

export function FinesAssignPage() {
  const queryClient = useQueryClient()
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [apartmentOpen, setApartmentOpen] = useState(false)
  const [apartmentSearch, setApartmentSearch] = useState('')
  const [residentOpen, setResidentOpen] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')
  const [fineTypeOpen, setFineTypeOpen] = useState(false)
  const [fineTypeSearch, setFineTypeSearch] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const fineTypesQuery = useQuery({ queryKey: ['fine-types'], queryFn: api.getFineTypes })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })

  const form = useForm<z.infer<typeof createFineSchema>>({
    resolver: zodResolver(createFineSchema),
    defaultValues: { towerId: '', apartmentId: '', residentId: '', fineTypeId: '', amount: '', notes: '' },
  })

  const selectedTowerId = useWatch({ control: form.control, name: 'towerId' })
  const selectedApartmentId = useWatch({ control: form.control, name: 'apartmentId' })
  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })
  const selectedFineTypeId = useWatch({ control: form.control, name: 'fineTypeId' })

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', 'fines', selectedTowerId],
    queryFn: () => api.getApartments({ towerId: selectedTowerId, limit: 200 }),
    enabled: Boolean(selectedTowerId),
  })

  const residentsQuery = useQuery({
    queryKey: ['residents', 'fines', selectedApartmentId],
    queryFn: () => api.getResidents({ apartmentId: selectedApartmentId, limit: 200 }),
    enabled: Boolean(selectedApartmentId),
  })

  const fineTypes = fineTypesQuery.data ?? []
  const towers = towersQuery.data ?? []
  const apartments = apartmentsQuery.data?.data ?? []
  const residents = residentsQuery.data?.data ?? []
  const selectedTower = towers.find((tower) => tower.id === selectedTowerId) ?? null
  const selectedApartment = apartments.find((apartment) => apartment.id === selectedApartmentId) ?? null
  const selectedResident = residents.find((resident) => resident.id === selectedResidentId) ?? null
  const selectedFineType = fineTypes.find((fineType) => fineType.id === selectedFineTypeId) ?? null

  useEffect(() => {
    if (selectedFineType) {
      form.setValue('amount', String(selectedFineType.value))
    }
  }, [selectedFineType, form])

  const createFineMutation = useMutation({
    mutationFn: api.createFine,
    onSuccess: () => {
      toast.success('Multa asignada')
      form.reset({ towerId: '', apartmentId: '', residentId: '', fineTypeId: '', amount: '', notes: '' })
      void queryClient.invalidateQueries({ queryKey: ['fines'] })
    },
    onError: () => toast.error('No fue posible asignar la multa'),
    onSettled: () => setCreateSubmitting(false),
  })

  return (
    <FinesLayout
      eyebrow="Multas"
      title="Asignar multa"
      description="Registra multas por apartamento y, si aplica, por residente. El valor usado queda congelado en el histórico."
    >
      <Card>
        <CardHeader>
          <CardTitle>Nueva multa</CardTitle>
          <CardDescription>Portería, piscina y administración pueden registrar multas operativas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={form.handleSubmit((values) => {
              if (createSubmitting) return
              const amount = values.amount?.trim() ? Number(values.amount) : undefined
              if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
                form.setError('amount', { message: 'Ingresa un valor válido' })
                return
              }

              setCreateSubmitting(true)
              createFineMutation.mutate({
                apartmentId: values.apartmentId,
                residentId: values.residentId || undefined,
                fineTypeId: values.fineTypeId,
                amount,
                notes: values.notes?.trim() || undefined,
              })
            })}
          >
            <Field label="Torre" error={form.formState.errors.towerId?.message}>
              <TowerSelect
                open={towerOpen}
                onOpenChange={setTowerOpen}
                value={selectedTowerId}
                displayValue={selectedTower?.name ?? ''}
                towers={towers}
                isLoading={towersQuery.isLoading}
                searchValue={towerSearch}
                onSearchValueChange={setTowerSearch}
                onSelect={(tower) => {
                  form.setValue('towerId', tower.id, { shouldValidate: true })
                  form.setValue('apartmentId', '')
                  form.setValue('residentId', '')
                  setTowerOpen(false)
                  setApartmentOpen(true)
                }}
              />
            </Field>

            <Field label="Apartamento" error={form.formState.errors.apartmentId?.message}>
              <ApartmentSelect
                open={apartmentOpen}
                onOpenChange={setApartmentOpen}
                value={selectedApartmentId}
                displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
                apartments={apartments}
                disabled={!selectedTowerId}
                isLoading={apartmentsQuery.isLoading}
                searchValue={apartmentSearch}
                onSearchValueChange={setApartmentSearch}
                onSelect={(apartment) => {
                  form.setValue('apartmentId', apartment.id, { shouldValidate: true })
                  form.setValue('residentId', '')
                  setApartmentOpen(false)
                  setResidentOpen(true)
                }}
              />
            </Field>

            <Field label="Residente (opcional)">
              <ResidentSelect
                open={residentOpen}
                onOpenChange={setResidentOpen}
                value={selectedResidentId ?? ''}
                displayValue={selectedResident ? residentLabel(selectedResident) : ''}
                residents={residents}
                disabled={!selectedApartmentId}
                isLoading={residentsQuery.isLoading}
                searchValue={residentSearch}
                onSearchValueChange={setResidentSearch}
                onSelect={(resident) => {
                  form.setValue('residentId', resident.id)
                  setResidentOpen(false)
                }}
              />
            </Field>

            <Field label="Tipo de multa" error={form.formState.errors.fineTypeId?.message}>
              <FineTypeSelect
                open={fineTypeOpen}
                onOpenChange={setFineTypeOpen}
                value={selectedFineTypeId}
                displayValue={selectedFineType?.name ?? ''}
                fineTypes={fineTypes}
                isLoading={fineTypesQuery.isLoading}
                searchValue={fineTypeSearch}
                onSearchValueChange={setFineTypeSearch}
                onSelect={(fineType) => {
                  form.setValue('fineTypeId', fineType.id, { shouldValidate: true })
                  form.setValue('amount', String(fineType.value))
                  setFineTypeOpen(false)
                }}
              />
            </Field>

            <Field label="Valor" error={form.formState.errors.amount?.message}>
              <Input {...form.register('amount')} placeholder="Ej. 90000" inputMode="numeric" />
            </Field>

            <Field label="Notas (opcional)" error={form.formState.errors.notes?.message}>
              <Textarea {...form.register('notes')} placeholder="Detalle de la infracción" rows={2} />
            </Field>

            <Button type="submit" className="sm:col-span-2" disabled={createSubmitting || createFineMutation.isPending}>
              Asignar multa
            </Button>
          </form>
        </CardContent>
      </Card>
    </FinesLayout>
  )
}

export function FinesHistoryPage() {
  const [filters, setFilters] = useState<FineFilters>(() => ({ dateFrom: daysAgo(30), dateTo: toIsoDate(new Date()) }))
  const [draftFilters, setDraftFilters] = useState<FineFilters>(() => ({ dateFrom: daysAgo(30), dateTo: toIsoDate(new Date()) }))
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [apartmentOpen, setApartmentOpen] = useState(false)
  const [apartmentSearch, setApartmentSearch] = useState('')
  const [residentOpen, setResidentOpen] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')
  const [fineTypeOpen, setFineTypeOpen] = useState(false)
  const [fineTypeSearch, setFineTypeSearch] = useState('')
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')

  const [page, setPage] = useState(1)
  const finesQuery = useQuery({
    queryKey: ['fines', filters, page],
    queryFn: () => api.getFines({ ...filters, page, limit: 15 }),
    placeholderData: keepPreviousData,
  })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const fineTypesQuery = useQuery({ queryKey: ['fine-types'], queryFn: api.getFineTypes })
  const employeesQuery = useQuery({
    queryKey: ['employees', 'fines'],
    queryFn: () => api.getEmployees({ limit: 200 }),
  })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments', 'fines-history', draftFilters.towerId],
    queryFn: () => api.getApartments({ towerId: draftFilters.towerId, limit: 200 }),
    enabled: Boolean(draftFilters.towerId),
  })
  const residentsQuery = useQuery({
    queryKey: ['residents', 'fines-history', draftFilters.apartmentId],
    queryFn: () => api.getResidents({ apartmentId: draftFilters.apartmentId, limit: 200 }),
    enabled: Boolean(draftFilters.apartmentId),
  })

  const fines = finesQuery.data?.data ?? []
  const towers = towersQuery.data ?? []
  const apartments = apartmentsQuery.data?.data ?? []
  const residents = residentsQuery.data?.data ?? []
  const fineTypes = fineTypesQuery.data ?? []
  const employees = employeesQuery.data?.data ?? []
  const totalAmount = fines.reduce((total, fine) => total + fine.amount, 0)

  const pdfMutation = useMutation({
    mutationFn: () => api.downloadFinesReportPdf(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-multas-${filters.dateFrom ?? 'inicio'}-${filters.dateTo ?? 'hoy'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte descargado')
    },
    onError: () => toast.error('No fue posible generar el PDF'),
  })

  const columns: ColumnDef<Fine>[] = [
    {
      header: 'Apartamento',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{apartmentLabel(row)}</p>
          <p className="text-xs text-slate-400">Residente: {residentLabel(row.resident)}</p>
        </div>
      ),
    },
    {
      header: 'Tipo',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{fineTypeName(row)}</p>
          <p className="text-xs text-slate-400">Vigencia {finePeriodLabel(row)}</p>
        </div>
      ),
    },
    {
      header: 'Valor',
      cell: (row) => <span className="font-semibold text-slate-800">{formatCurrency(row.amount)}</span>,
    },
    {
      header: 'Asignada por',
      cell: (row) => <span className="text-xs text-slate-600">{employeeLabel(row.createdByEmployee)}</span>,
    },
    {
      header: 'Fecha',
      cell: (row) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Notas',
      cell: (row) => <span className="line-clamp-1 max-w-[260px] text-xs text-slate-500">{row.notes ?? '—'}</span>,
    },
  ]

  const selectedTower = towers.find((tower) => tower.id === draftFilters.towerId) ?? null
  const selectedApartment = apartments.find((apartment) => apartment.id === draftFilters.apartmentId) ?? null
  const selectedResident = residents.find((resident) => resident.id === draftFilters.residentId) ?? null
  const selectedFineType = fineTypes.find((fineType) => fineType.id === draftFilters.fineTypeId) ?? null
  const selectedEmployee = employees.find((employee) => employee.id === draftFilters.createdByEmployeeId) ?? null

  function updateDraft(next: Partial<FineFilters>) {
    setDraftFilters((current) => ({ ...current, ...next }))
  }

  function clearFilters() {
    const next = { dateFrom: daysAgo(30), dateTo: toIsoDate(new Date()) }
    setDraftFilters(next)
    setFilters(next)
  }

  return (
    <FinesLayout
      eyebrow="Multas"
      title="Histórico de multas"
      description="Consulta por torre, apartamento, residente, tipo, responsable y rango de fechas. Exporta el mismo resultado a PDF."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Multas</CardTitle>
            <CardDescription>Resultado filtrado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{fines.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor total</CardTitle>
            <CardDescription>Suma del histórico filtrado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>PDF</CardTitle>
            <CardDescription>Exportación oficial</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              className="w-full"
              disabled={pdfMutation.isPending}
              onClick={() => pdfMutation.mutate()}
            >
              <Download className="size-4" />
              {pdfMutation.isPending ? 'Generando...' : 'Descargar PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Aplica los filtros para consultar y exportar el mismo conjunto de datos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Desde">
            <Input type="date" value={draftFilters.dateFrom ?? ''} onChange={(e) => updateDraft({ dateFrom: e.target.value || undefined })} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={draftFilters.dateTo ?? ''} onChange={(e) => updateDraft({ dateTo: e.target.value || undefined })} />
          </Field>
          <Field label="Torre">
            <TowerSelect
              open={towerOpen}
              onOpenChange={setTowerOpen}
              value={draftFilters.towerId ?? ''}
              displayValue={selectedTower?.name ?? ''}
              towers={towers}
              isLoading={towersQuery.isLoading}
              searchValue={towerSearch}
              onSearchValueChange={setTowerSearch}
              onSelect={(tower) => {
                updateDraft({ towerId: tower.id, apartmentId: undefined, residentId: undefined })
                setTowerOpen(false)
              }}
            />
          </Field>
          <Field label="Apartamento">
            <ApartmentSelect
              open={apartmentOpen}
              onOpenChange={setApartmentOpen}
              value={draftFilters.apartmentId ?? ''}
              displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
              apartments={apartments}
              disabled={!draftFilters.towerId}
              isLoading={apartmentsQuery.isLoading}
              searchValue={apartmentSearch}
              onSearchValueChange={setApartmentSearch}
              onSelect={(apartment) => {
                updateDraft({ apartmentId: apartment.id, residentId: undefined })
                setApartmentOpen(false)
              }}
            />
          </Field>
          <Field label="Residente">
            <ResidentSelect
              open={residentOpen}
              onOpenChange={setResidentOpen}
              value={draftFilters.residentId ?? ''}
              displayValue={selectedResident ? residentLabel(selectedResident) : ''}
              residents={residents}
              disabled={!draftFilters.apartmentId}
              isLoading={residentsQuery.isLoading}
              searchValue={residentSearch}
              onSearchValueChange={setResidentSearch}
              onSelect={(resident) => {
                updateDraft({ residentId: resident.id })
                setResidentOpen(false)
              }}
            />
          </Field>
          <Field label="Tipo">
            <FineTypeSelect
              open={fineTypeOpen}
              onOpenChange={setFineTypeOpen}
              value={draftFilters.fineTypeId ?? ''}
              displayValue={selectedFineType?.name ?? ''}
              fineTypes={fineTypes}
              isLoading={fineTypesQuery.isLoading}
              searchValue={fineTypeSearch}
              onSearchValueChange={setFineTypeSearch}
              onSelect={(fineType) => {
                updateDraft({ fineTypeId: fineType.id })
                setFineTypeOpen(false)
              }}
            />
          </Field>
          <Field label="Asignado por">
            <EmployeeSelect
              open={employeeOpen}
              onOpenChange={setEmployeeOpen}
              value={draftFilters.createdByEmployeeId ?? ''}
              displayValue={selectedEmployee ? employeeLabel(selectedEmployee) : ''}
              employees={employees}
              isLoading={employeesQuery.isLoading}
              searchValue={employeeSearch}
              onSearchValueChange={setEmployeeSearch}
              onSelect={(employee) => {
                updateDraft({ createdByEmployeeId: employee.id })
                setEmployeeOpen(false)
              }}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="button" className="flex-1" onClick={() => setFilters({ ...draftFilters })}>
              Aplicar
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>El tipo y valor mostrado corresponde al snapshot guardado al asignar la multa.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={fines}
            columns={columns}
            searchPlaceholder="Buscar por apartamento, residente, tipo, responsable o notas..."
            getSearchText={(row) =>
              [
                apartmentLabel(row),
                residentLabel(row.resident),
                fineTypeName(row),
                employeeLabel(row.createdByEmployee),
                row.notes,
              ]
                .filter(Boolean)
                .join(' ')
            }
            isLoading={finesQuery.isLoading}
            emptyMessage="No hay multas para los filtros seleccionados."
            serverSide
            totalItems={finesQuery.data?.meta.total}
            currentPage={page}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </FinesLayout>
  )
}

function TowerSelect({
  open,
  onOpenChange,
  value,
  displayValue,
  towers,
  isLoading,
  searchValue,
  onSearchValueChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayValue: string
  towers: Tower[]
  isLoading?: boolean
  searchValue: string
  onSearchValueChange: (value: string) => void
  onSelect: (tower: Tower) => void
}) {
  return (
    <FilterableSelect
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      displayValue={displayValue}
      placeholder={isLoading ? 'Cargando torres...' : 'Selecciona torre'}
      searchPlaceholder="Buscar torre..."
      items={towers}
      getKey={(tower) => tower.id}
      getLabel={(tower) => `${tower.name} (${tower.code})`}
      onSelect={onSelect}
      searchValue={searchValue}
      onSearchValueChange={onSearchValueChange}
    />
  )
}

function ApartmentSelect({
  open,
  onOpenChange,
  value,
  displayValue,
  apartments,
  disabled,
  isLoading,
  searchValue,
  onSearchValueChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayValue: string
  apartments: Apartment[]
  disabled?: boolean
  isLoading?: boolean
  searchValue: string
  onSearchValueChange: (value: string) => void
  onSelect: (apartment: Apartment) => void
}) {
  return (
    <FilterableSelect
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      displayValue={displayValue}
      placeholder={disabled ? 'Primero selecciona torre' : isLoading ? 'Cargando apartamentos...' : 'Selecciona apartamento'}
      searchPlaceholder="Buscar apartamento..."
      disabled={disabled}
      items={apartments}
      getKey={(apartment) => apartment.id}
      getLabel={(apartment) => `Apt. ${apartment.number}${apartment.floor != null ? ` · Piso ${apartment.floor}` : ''}`}
      onSelect={onSelect}
      searchValue={searchValue}
      onSearchValueChange={onSearchValueChange}
    />
  )
}

function ResidentSelect({
  open,
  onOpenChange,
  value,
  displayValue,
  residents,
  disabled,
  isLoading,
  searchValue,
  onSearchValueChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayValue: string
  residents: Resident[]
  disabled?: boolean
  isLoading?: boolean
  searchValue: string
  onSearchValueChange: (value: string) => void
  onSelect: (resident: Resident) => void
}) {
  return (
    <FilterableSelect
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      displayValue={displayValue}
      placeholder={disabled ? 'Primero selecciona apartamento' : isLoading ? 'Cargando residentes...' : 'Selecciona residente'}
      searchPlaceholder="Buscar residente..."
      disabled={disabled}
      items={residents}
      getKey={(resident) => resident.id}
      getLabel={(resident) => `${resident.name} ${resident.lastName} · ${resident.document}`}
      onSelect={onSelect}
      searchValue={searchValue}
      onSearchValueChange={onSearchValueChange}
    />
  )
}

function FineTypeSelect({
  open,
  onOpenChange,
  value,
  displayValue,
  fineTypes,
  isLoading,
  searchValue,
  onSearchValueChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayValue: string
  fineTypes: FineType[]
  isLoading?: boolean
  searchValue: string
  onSearchValueChange: (value: string) => void
  onSelect: (fineType: FineType) => void
}) {
  return (
    <FilterableSelect
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      displayValue={displayValue}
      placeholder={isLoading ? 'Cargando tipos...' : 'Selecciona tipo'}
      searchPlaceholder="Buscar tipo de multa..."
      items={fineTypes}
      getKey={(fineType) => fineType.id}
      getLabel={(fineType) => `${fineType.name} · ${formatCurrency(fineType.value)}`}
      onSelect={onSelect}
      searchValue={searchValue}
      onSearchValueChange={onSearchValueChange}
    />
  )
}

function EmployeeSelect({
  open,
  onOpenChange,
  value,
  displayValue,
  employees,
  isLoading,
  searchValue,
  onSearchValueChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayValue: string
  employees: Employee[]
  isLoading?: boolean
  searchValue: string
  onSearchValueChange: (value: string) => void
  onSelect: (employee: Employee) => void
}) {
  return (
    <FilterableSelect
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      displayValue={displayValue}
      placeholder={isLoading ? 'Cargando equipo...' : 'Selecciona responsable'}
      searchPlaceholder="Buscar empleado..."
      items={employees}
      getKey={(employee) => employee.id}
      getLabel={(employee) => `${employee.name} ${employee.lastName} · ${employee.username}`}
      onSelect={onSelect}
      searchValue={searchValue}
      onSearchValueChange={onSearchValueChange}
    />
  )
}
