import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Field } from '@/components/forms/field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth-context'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Fine, FineType, Resident } from '@/types/api'

const createFineSchema = z.object({
  residentId: z.string().uuid('Selecciona un residente'),
  fineTypeId: z.string().uuid('Selecciona un tipo de multa'),
  amount: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

const createFineTypeSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  value: z.string().min(1, 'Ingresa un valor'),
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function residentLabel(resident: Resident) {
  const aptNumber = resident.apartment?.number
  const towerName = resident.apartment?.towerData?.name
  const apt = aptNumber ? `${towerName ?? 'Torre'} · Apt. ${aptNumber}` : 'Sin apartamento'
  return `${resident.name} ${resident.lastName} · ${apt}`
}

function FineTypeAdminPanel({ fineTypes }: { fineTypes: FineType[] }) {
  const queryClient = useQueryClient()
  const [valueByTypeId, setValueByTypeId] = useState<Record<string, string>>({})

  const createTypeForm = useForm<z.infer<typeof createFineTypeSchema>>({
    resolver: zodResolver(createFineTypeSchema),
    defaultValues: { name: '', value: '' },
  })

  useEffect(() => {
    setValueByTypeId(
      Object.fromEntries(
        fineTypes.map((fineType) => [fineType.id, String(fineType.value)]),
      ),
    )
  }, [fineTypes])

  const createTypeMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: number }) => api.createFineType({ name, value }),
    onSuccess: () => {
      toast.success('Tipo de multa creado')
      createTypeForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['fine-types'] })
    },
    onError: () => toast.error('No fue posible crear el tipo de multa'),
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
    <Card>
      <CardHeader>
        <CardTitle>Parametrización de multas</CardTitle>
        <CardDescription>
          Solo administración puede crear tipos y ajustar valores. El nombre no se modifica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={createTypeForm.handleSubmit((values) => {
            const value = Number(values.value)
            if (!Number.isFinite(value) || value < 0) {
              createTypeForm.setError('value', { message: 'Ingresa un valor válido' })
              return
            }
            createTypeMutation.mutate({ name: values.name.trim(), value })
          })}
        >
          <Field label="Nombre" error={createTypeForm.formState.errors.name?.message}>
            <Input {...createTypeForm.register('name')} placeholder="Ej. Ruido excesivo" />
          </Field>
          <Field label="Valor" error={createTypeForm.formState.errors.value?.message}>
            <Input {...createTypeForm.register('value')} placeholder="90000" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={createTypeMutation.isPending}>
              Crear tipo
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          {fineTypes.length === 0 ? (
            <p className="text-sm text-slate-400">No hay tipos de multa registrados.</p>
          ) : (
            fineTypes.map((fineType) => (
              <div key={fineType.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_180px_120px] sm:items-end">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{fineType.name}</p>
                  <p className="text-xs text-slate-500">Nombre bloqueado</p>
                </div>
                <Field label="Valor">
                  <Input
                    value={valueByTypeId[fineType.id] ?? ''}
                    onChange={(event) =>
                      setValueByTypeId((current) => ({ ...current, [fineType.id]: event.target.value }))
                    }
                  />
                </Field>
                <Button
                  type="button"
                  disabled={updateTypeMutation.isPending}
                  onClick={() => {
                    const value = Number(valueByTypeId[fineType.id])
                    if (!Number.isFinite(value) || value < 0) {
                      toast.error('Ingresa un valor válido')
                      return
                    }
                    updateTypeMutation.mutate({ id: fineType.id, value })
                  }}
                >
                  Guardar
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function FinesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [residentOpen, setResidentOpen] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')
  const [fineTypeOpen, setFineTypeOpen] = useState(false)
  const [fineTypeSearch, setFineTypeSearch] = useState('')

  const fineTypesQuery = useQuery({ queryKey: ['fine-types'], queryFn: api.getFineTypes })
  const finesQuery = useQuery({ queryKey: ['fines'], queryFn: api.getFines })
  const residentsQuery = useQuery({ queryKey: ['residents', 'all-fines'], queryFn: () => api.getResidents() })

  const fineTypes = fineTypesQuery.data ?? []
  const fines = finesQuery.data ?? []
  const residents = residentsQuery.data ?? []

  const createFineForm = useForm<z.infer<typeof createFineSchema>>({
    resolver: zodResolver(createFineSchema),
    defaultValues: { residentId: '', fineTypeId: '', amount: '', notes: '' },
  })

  const selectedFineType = fineTypes.find((fineType) => fineType.id === createFineForm.watch('fineTypeId'))

  useEffect(() => {
    if (selectedFineType && !createFineForm.getValues('amount')) {
      createFineForm.setValue('amount', String(selectedFineType.value))
    }
  }, [selectedFineType, createFineForm])

  const createFineMutation = useMutation({
    mutationFn: api.createFine,
    onSuccess: () => {
      toast.success('Multa asignada')
      createFineForm.reset({ residentId: '', fineTypeId: '', amount: '', notes: '' })
      void queryClient.invalidateQueries({ queryKey: ['fines'] })
    },
    onError: () => toast.error('No fue posible crear la multa'),
  })

  const fineTypeFilterOptions = useMemo(
    () => fineTypes.map((fineType) => ({ value: fineType.id, label: fineType.name })),
    [fineTypes],
  )

  const columns: ColumnDef<Fine>[] = [
    {
      header: 'Residente',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.resident ? `${row.resident.name} ${row.resident.lastName}` : row.residentId}
          </p>
          <p className="text-xs text-slate-400">
            {row.resident?.apartment?.towerData?.name ?? 'Torre'} · Apt. {row.resident?.apartment?.number ?? '—'}
          </p>
        </div>
      ),
    },
    {
      header: 'Tipo de multa',
      cell: (row) => <span className="text-sm text-slate-700">{row.fineType?.name ?? '—'}</span>,
    },
    {
      header: 'Valor',
      cell: (row) => <span className="text-sm font-semibold text-slate-800">{formatCurrency(row.amount)}</span>,
    },
    {
      header: 'Asignada por',
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.createdByEmployee ? `${row.createdByEmployee.name} ${row.createdByEmployee.lastName}` : '—'}
        </span>
      ),
    },
    {
      header: 'Fecha',
      cell: (row) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Notas',
      cell: (row) => <span className="line-clamp-1 max-w-[240px] text-xs text-slate-500">{row.notes ?? '—'}</span>,
    },
  ]

  const filters: FilterDef[] =
    fineTypeFilterOptions.length > 0
      ? [{ key: 'fineTypeId', placeholder: 'Tipo de multa', options: fineTypeFilterOptions }]
      : []

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Operacion"
        title="Multas"
        description="Crea, administra y asigna multas a residentes desde un flujo unificado para administración, portería y piscina."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Asignar multa</CardTitle>
            <CardDescription>
              Selecciona residente y tipo de multa. Portería, piscina y administración pueden registrar multas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={createFineForm.handleSubmit((values) => {
                const amount = values.amount?.trim() ? Number(values.amount) : undefined
                if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
                  createFineForm.setError('amount', { message: 'Ingresa un valor válido' })
                  return
                }

                createFineMutation.mutate({
                  residentId: values.residentId,
                  fineTypeId: values.fineTypeId,
                  amount,
                  notes: values.notes?.trim() || undefined,
                })
              })}
            >
              <Field label="Residente" error={createFineForm.formState.errors.residentId?.message}>
                <FilterableSelect
                  open={residentOpen}
                  onOpenChange={setResidentOpen}
                  value={createFineForm.watch('residentId')}
                  displayValue={
                    residents.find((resident) => resident.id === createFineForm.watch('residentId'))
                      ? residentLabel(residents.find((resident) => resident.id === createFineForm.watch('residentId'))!)
                      : ''
                  }
                  placeholder={residentsQuery.isLoading ? 'Cargando residentes...' : 'Selecciona residente'}
                  searchPlaceholder="Buscar residente..."
                  items={residents}
                  getKey={(resident) => resident.id}
                  getLabel={residentLabel}
                  onSelect={(resident) => {
                    createFineForm.setValue('residentId', resident.id, { shouldValidate: true })
                    setResidentOpen(false)
                  }}
                  searchValue={residentSearch}
                  onSearchValueChange={setResidentSearch}
                />
              </Field>

              <Field label="Tipo de multa" error={createFineForm.formState.errors.fineTypeId?.message}>
                <FilterableSelect
                  open={fineTypeOpen}
                  onOpenChange={setFineTypeOpen}
                  value={createFineForm.watch('fineTypeId')}
                  displayValue={
                    fineTypes.find((fineType) => fineType.id === createFineForm.watch('fineTypeId'))?.name ?? ''
                  }
                  placeholder={fineTypesQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo'}
                  searchPlaceholder="Buscar tipo de multa..."
                  items={fineTypes}
                  getKey={(fineType) => fineType.id}
                  getLabel={(fineType) => `${fineType.name} · ${formatCurrency(fineType.value)}`}
                  onSelect={(fineType) => {
                    createFineForm.setValue('fineTypeId', fineType.id, { shouldValidate: true })
                    if (!createFineForm.getValues('amount')) {
                      createFineForm.setValue('amount', String(fineType.value))
                    }
                    setFineTypeOpen(false)
                  }}
                  searchValue={fineTypeSearch}
                  onSearchValueChange={setFineTypeSearch}
                />
              </Field>

              <Field label="Valor (opcional, por defecto usa el tipo)" error={createFineForm.formState.errors.amount?.message}>
                <Input {...createFineForm.register('amount')} placeholder="Ej. 90000" />
              </Field>

              <Field label="Notas (opcional)" error={createFineForm.formState.errors.notes?.message}>
                <Textarea {...createFineForm.register('notes')} placeholder="Detalle de la infracción" rows={2} />
              </Field>

              <Button type="submit" className="sm:col-span-2" disabled={createFineMutation.isPending}>
                Asignar multa
              </Button>
            </form>
          </CardContent>
        </Card>

        {user?.role === 'administrator' && <FineTypeAdminPanel fineTypes={fineTypes} />}

        <Card>
          <CardHeader>
            <CardTitle>Historial de multas</CardTitle>
            <CardDescription>Seguimiento y administración de multas asignadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={fines}
              columns={columns}
              searchPlaceholder="Buscar residente, tipo de multa o notas..."
              getSearchText={(row) =>
                [
                  row.resident ? `${row.resident.name} ${row.resident.lastName}` : row.residentId,
                  row.fineType?.name,
                  row.createdByEmployee ? `${row.createdByEmployee.name} ${row.createdByEmployee.lastName}` : '',
                  row.notes,
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              filters={filters}
              getFilterValues={(row) => ({ fineTypeId: row.fineTypeId })}
              isLoading={finesQuery.isLoading}
              emptyMessage="No hay multas registradas."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
