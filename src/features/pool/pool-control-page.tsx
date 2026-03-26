import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Users, Waves, CalendarDays } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PoolEntry } from '@/types/api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const poolSchema = z.object({
  towerId: z.string().uuid('Selecciona una torre'),
  apartmentId: z.string().uuid('Selecciona un apartamento'),
  residentIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un residente'),
  notes: z.string().max(500).optional().or(z.literal('')),
  guestNames: z
    .array(z.object({ name: z.string().min(2, 'Mínimo 2 caracteres').max(80) }))
    .max(10, 'Máximo 10 invitados'),
})

// ─── Entry dialog ─────────────────────────────────────────────────────────────

function NewEntryDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [guestDraft, setGuestDraft] = useState('')
  const [towerOpen, setTowerOpen] = useState(false)
  const [apartmentOpen, setApartmentOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [apartmentSearch, setApartmentSearch] = useState('')

  const form = useForm<z.infer<typeof poolSchema>>({
    resolver: zodResolver(poolSchema),
    defaultValues: { towerId: '', apartmentId: '', residentIds: [], notes: '', guestNames: [] },
  })
  const guestFields = useFieldArray({ control: form.control, name: 'guestNames' })

  const selectedTowerId = useWatch({ control: form.control, name: 'towerId' })
  const selectedApartmentId = useWatch({ control: form.control, name: 'apartmentId' })
  const selectedResidentIds = useWatch({ control: form.control, name: 'residentIds' }) ?? []
  const selectedGuestNames = useWatch({ control: form.control, name: 'guestNames' }) ?? []
  const shouldShowResidentError =
    form.formState.submitCount > 0 && Boolean(form.formState.errors.residentIds?.message)

  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments(selectedTowerId),
    enabled: Boolean(selectedTowerId),
  })
  const residentsQuery = useQuery({
    queryKey: ['pool-resident-search', selectedApartmentId],
    queryFn: () => api.searchPoolResidents(selectedApartmentId),
    enabled: Boolean(selectedApartmentId),
  })

  const apartmentResidents = residentsQuery.data?.residents ?? []
  const visibleApartments = useMemo(
    () => (apartmentsQuery.data ?? []).filter((a) => a.towerId === selectedTowerId),
    [apartmentsQuery.data, selectedTowerId],
  )
  const selectedTower = (towersQuery.data ?? []).find((t) => t.id === selectedTowerId)
  const selectedApartment = visibleApartments.find((a) => a.id === selectedApartmentId)
  const apartmentLabel = residentsQuery.data
    ? `Torre ${residentsQuery.data.apartment.tower ?? '-'} · ${residentsQuery.data.apartment.number}`
    : ''

  const createMutation = useMutation({
    mutationFn: api.createPoolEntry,
    onSuccess: () => {
      toast.success('Ingreso a piscina registrado')
      form.reset()
      setGuestDraft('')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['pool-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['pool-summary'] })
    },
    onError: () => toast.error('No fue posible registrar el ingreso'),
  })

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      form.reset()
      setGuestDraft('')
      setTowerSearch('')
      setApartmentSearch('')
    }
  }

  function addGuestName(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (selectedGuestNames.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      setGuestDraft('')
      return
    }
    guestFields.append({ name: trimmed })
    setGuestDraft('')
  }

  function toggleResident(id: string) {
    const current = form.getValues('residentIds')
    form.setValue(
      'residentIds',
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      { shouldValidate: true },
    )
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Nuevo ingreso</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,600px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar ingreso a piscina</DialogTitle>
          <DialogDescription>
            Selecciona torre, apartamento y marca los residentes que ingresan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Torre" error={form.formState.errors.towerId?.message}>
              <FilterableSelect
                open={towerOpen}
                onOpenChange={setTowerOpen}
                value={selectedTowerId}
                displayValue={selectedTower?.name ?? ''}
                placeholder="Selecciona torre"
                searchPlaceholder="Filtrar torre..."
                emptyMessage="Sin resultados."
                items={towersQuery.data ?? []}
                getKey={(t) => t.id}
                getLabel={(t) => t.name}
                onSelect={(t) => {
                  form.setValue('towerId', t.id, { shouldValidate: false })
                  form.setValue('apartmentId', '', { shouldValidate: false })
                  form.setValue('residentIds', [], { shouldValidate: false })
                  setTowerOpen(false)
                  setApartmentOpen(true)
                }}
                searchValue={towerSearch}
                onSearchValueChange={setTowerSearch}
              />
            </Field>
            <Field label="Apartamento" error={form.formState.errors.apartmentId?.message}>
              <FilterableSelect
                open={apartmentOpen}
                onOpenChange={setApartmentOpen}
                value={selectedApartmentId}
                displayValue={
                  selectedApartment
                    ? `${selectedApartment.number} · Piso ${selectedApartment.floor ?? '-'}`
                    : ''
                }
                placeholder={selectedTowerId ? 'Selecciona apartamento' : 'Primero selecciona torre'}
                searchPlaceholder="Filtrar por número o piso..."
                emptyMessage="Sin resultados."
                items={visibleApartments}
                disabled={!selectedTowerId}
                getKey={(a) => a.id}
                getLabel={(a) => `${a.number} · Piso ${a.floor ?? '-'}`}
                onSelect={(a) => {
                  form.setValue('apartmentId', a.id, { shouldValidate: false })
                  form.setValue('residentIds', [], { shouldValidate: false })
                }}
                searchValue={apartmentSearch}
                onSearchValueChange={setApartmentSearch}
              />
            </Field>
          </div>

          {apartmentLabel && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{apartmentLabel}</p>
                <span className="text-xs text-slate-400">{apartmentResidents.length} residente(s)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {apartmentResidents.map((r) => {
                  const selected = selectedResidentIds.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleResident(r.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
                        selected
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100',
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full', selected ? 'bg-white' : 'bg-slate-300')} />
                      {r.name} {r.lastName}
                    </button>
                  )
                })}
              </div>
              {shouldShowResidentError && (
                <p className="text-xs text-red-500">{form.formState.errors.residentIds?.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invitados</p>
            <div className="flex gap-2">
              <Input
                value={guestDraft}
                onChange={(e) => setGuestDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGuestName(guestDraft))}
                placeholder="Nombre del invitado"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={() => addGuestName(guestDraft)}>
                Agregar
              </Button>
            </div>
            {guestFields.fields.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {guestFields.fields.map((field, i) => (
                  <span
                    key={field.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
                  >
                    {form.getValues(`guestNames.${i}.name`) || `Invitado ${i + 1}`}
                    <button
                      type="button"
                      onClick={() => guestFields.remove(i)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Field label="Notas (opcional)" error={form.formState.errors.notes?.message}>
            <Textarea
              {...form.register('notes')}
              placeholder="Observación del turno, brazalete, menores..."
              rows={2}
            />
          </Field>

          <Button
            className="w-full"
            disabled={createMutation.isPending}
            onClick={form.handleSubmit((values) =>
              createMutation.mutate({
                apartmentId: values.apartmentId,
                residentIds: values.residentIds,
                notes: values.notes,
                guestNames: values.guestNames.map((g) => g.name),
              }),
            )}
          >
            Confirmar ingreso
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PoolControlPage() {
  const entriesQuery = useQuery({ queryKey: ['pool-entries'], queryFn: api.getPoolEntries })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const entries = entriesQuery.data ?? []
  const towers = towersQuery.data ?? []

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = entries.filter((e) => e.entryTime.slice(0, 10) === today).length
  const totalGuests = entries.reduce((sum, e) => sum + (e.guestCount ?? 0), 0)

  const towerFilterOptions = towers.map((t) => ({ value: t.id, label: t.name }))

  const filters: FilterDef[] = [
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
    ...(towerFilterOptions.length > 0
      ? [{ key: 'towerId', placeholder: 'Torre', options: towerFilterOptions }]
      : []),
  ]

  const columns: ColumnDef<PoolEntry>[] = [
    {
      header: 'Apartamento',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.apartment?.towerData?.name ?? `Torre ${row.apartment?.tower ?? '?'}`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Apt. {row.apartment?.number ?? '—'}</p>
        </div>
      ),
    },
    {
      header: 'Residentes',
      cell: (row) => {
        const residents = row.residentLinks?.map((l) => l.resident).filter(Boolean) ?? []
        if (residents.length === 0) return <span className="text-slate-400 text-xs">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {residents.map((r) => (
              <StatusBadge key={r!.id} label={`${r!.name} ${r!.lastName}`} variant="blue" />
            ))}
          </div>
        )
      },
    },
    {
      header: 'Invitados',
      cell: (row) => (
        <div className="text-center">
          {(row.guestCount ?? 0) > 0 ? (
            <StatusBadge label={`${row.guestCount} invitado${row.guestCount === 1 ? '' : 's'}`} variant="violet" />
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Entrada',
      cell: (row) => (
        <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.entryTime)}</span>
      ),
    },
    {
      header: 'Notas',
      cell: (row) => (
        <span className="line-clamp-1 max-w-[200px] text-xs text-slate-500">{row.notes ?? '—'}</span>
      ),
    },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Piscina"
        title="Control de ingresos"
        description="Registro y seguimiento de ingresos al área de piscina."
        action={<NewEntryDialog />}
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Ingresos"
            value={entries.length}
            detail="Registros totales de piscina."
            icon={<Waves className="size-5" />}
          />
          <KpiCard
            label="Hoy"
            value={todayCount}
            detail="Ingresos registrados hoy."
            icon={<CalendarDays className="size-5" />}
          />
          <KpiCard
            label="Invitados"
            value={totalGuests}
            detail="Acompañantes registrados en total."
            icon={<Users className="size-5" />}
          />
        </div>

        <DataTable
          data={entries}
          columns={columns}
          searchPlaceholder="Buscar apartamento, residente o notas..."
          getSearchText={(row) =>
            [
              row.apartment?.number,
              row.apartment?.tower,
              row.apartment?.towerData?.name,
              ...(row.residentLinks?.map((l) => `${l.resident?.name ?? ''} ${l.resident?.lastName ?? ''}`) ?? []),
              row.notes,
            ]
              .filter(Boolean)
              .join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            entryTime: row.entryTime,
            towerId: row.apartment?.towerId ?? '',
          })}
          isLoading={entriesQuery.isLoading}
          emptyMessage="Sin ingresos registrados."
        />
      </div>
    </div>
  )
}

