import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock3, DoorOpen, Search, UserRoundPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { AccessAudit, Visitor } from '@/types/api'

// ─── Schemas ────────────────────────────────────────────────────────────────

const createVisitorSchema = z.object({
  name: z.string().min(2),
  lastName: z.string().min(2),
  document: z.string().max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

const entrySchema = z.object({
  towerId: z.string().uuid({ message: 'Selecciona una torre' }),
  apartmentId: z.string().uuid({ message: 'Selecciona un apartamento' }),
  notes: z.string().max(500).optional().or(z.literal('')),
})

// ─── Search phase state ──────────────────────────────────────────────────────

type SearchPhase =
  | { kind: 'idle' }
  | { kind: 'found'; visitor: Visitor }
  | { kind: 'not_found'; document: string }
  | { kind: 'ready'; visitor: Visitor } // visitor confirmed, now pick apartment

// ─── Visitor card ────────────────────────────────────────────────────────────

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

// ─── Entry registration dialog ───────────────────────────────────────────────

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

  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
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
    defaultValues: { towerId: '', apartmentId: '', notes: '' },
  })

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
    mutationFn: api.createAccessAudit,
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
    entryForm.reset()
    setSelectedTowerId('')
    setTowerOpen(false)
    setAptOpen(false)
  }

  const handleReset = () => {
    setSearchDoc('')
    setPhase({ kind: 'idle' })
    setSelectedTowerId('')
    setTowerOpen(false)
    setAptOpen(false)
    createVisitorForm.reset()
    entryForm.reset()
    setOpen(false)
  }

  const activeVisitor =
    phase.kind === 'found' || phase.kind === 'ready' ? phase.visitor : null

  const filteredApartments = apartmentsQuery.data ?? []

  const handleEntrySubmit = entryForm.handleSubmit((values) => {
    if (!activeVisitor) return
    accessMutation.mutate({
      visitorId: activeVisitor.id,
      apartmentId: values.apartmentId,
      notes: values.notes || undefined,
    })
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); setOpen(v) }}>
      <DialogTrigger asChild>
        <Button>Registrar ingreso</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,560px)]">
        <DialogHeader>
          <DialogTitle>Registrar ingreso</DialogTitle>
          <DialogDescription>
            Busca al visitante por cédula para registrar su entrada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 – document search (always visible when no visitor confirmed) */}
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

              {/* Found */}
              {phase.kind === 'found' && (
                <div className="space-y-3 pt-1">
                  <VisitorCard visitor={phase.visitor} onClear={() => setPhase({ kind: 'idle' })} />
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => handleConfirmVisitor(phase.visitor)}
                  >
                    Continuar con este visitante
                  </Button>
                </div>
              )}

              {/* Not found – create form */}
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
                    onSubmit={createVisitorForm.handleSubmit((values) =>
                      createVisitorMutation.mutate(values),
                    )}
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
                    <Button
                      type="submit"
                      className="sm:col-span-2"
                      disabled={createVisitorMutation.isPending}
                    >
                      <UserRoundPlus className="mr-2 size-4" />
                      Crear visitante y continuar
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Step 2 – apartment selection (shown only when visitor is confirmed) */}
          {phase.kind === 'ready' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Paso 2 · Destino del ingreso
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
                      value={entryForm.watch('apartmentId')}
                      displayValue={
                        filteredApartments.find((a) => a.id === entryForm.watch('apartmentId'))
                          ? `Apt. ${filteredApartments.find((a) => a.id === entryForm.watch('apartmentId'))!.number}`
                          : ''
                      }
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

                <Field label="Notas (opcional)">
                  <Textarea
                    {...entryForm.register('notes')}
                    placeholder="Ej. visita autorizada, entrega rápida, ingreso con vehículo."
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

// ─── Main page ───────────────────────────────────────────────────────────────

function getPersonName(item: AccessAudit): string {
  if (item.visitor) return `${item.visitor.name} ${item.visitor.lastName}`
  if (item.resident) return `${item.resident.name} ${item.resident.lastName}`
  return 'Ingreso registrado'
}

export function AccessPage() {
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

  const columns: ColumnDef<AccessAudit>[] = [
    {
      header: 'Visitante',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{getPersonName(row)}</p>
          {row.visitor?.document && (
            <p className="text-xs text-slate-400 mt-0.5">CC {row.visitor.document}</p>
          )}
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
        eyebrow="Porteria"
        title="Accesos"
        description="Registro de ingresos al conjunto. Busca al visitante por cédula para registrar su entrada."
        action={
          <RegisterEntryDialog
            visitors={visitorsQuery.data ?? []}
            isLoadingVisitors={visitorsQuery.isLoading}
          />
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
          searchPlaceholder="Buscar visitante, documento o apartamento..."
          getSearchText={(row) =>
            [
              row.visitor ? `${row.visitor.name} ${row.visitor.lastName} ${row.visitor.document ?? ''}` : null,
              row.resident ? `${row.resident.name} ${row.resident.lastName}` : null,
              row.apartment ? `${row.apartment.tower} ${row.apartment.number}` : null,
              row.notes,
            ]
              .filter(Boolean)
              .join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            type: row.visitor ? 'visitor' : 'resident',
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
