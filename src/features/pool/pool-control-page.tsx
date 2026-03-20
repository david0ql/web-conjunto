import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const poolSchema = z.object({
  towerId: z.string().uuid('Selecciona una torre'),
  apartmentId: z.string().uuid('Selecciona un apartamento'),
  residentIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un residente'),
  notes: z.string().max(500).optional().or(z.literal('')),
  guestNames: z
    .array(
      z.object({
        name: z.string().min(2, 'Minimo 2 caracteres').max(80),
      }),
    )
    .max(10, 'Maximo 10 invitados'),
})

export function PoolControlPage() {
  const queryClient = useQueryClient()
  const [guestDraft, setGuestDraft] = useState('')
  const [towerOpen, setTowerOpen] = useState(false)
  const [apartmentOpen, setApartmentOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [apartmentSearch, setApartmentSearch] = useState('')
  const towerSearchRef = useRef<HTMLInputElement | null>(null)
  const apartmentSearchRef = useRef<HTMLInputElement | null>(null)
  const towerListRef = useRef<HTMLDivElement | null>(null)
  const apartmentListRef = useRef<HTMLDivElement | null>(null)

  const form = useForm<z.infer<typeof poolSchema>>({
    resolver: zodResolver(poolSchema),
    defaultValues: {
      towerId: '',
      apartmentId: '',
      residentIds: [],
      notes: '',
      guestNames: [],
    },
  })

  const guestFields = useFieldArray({
    control: form.control,
    name: 'guestNames',
  })

  const selectedTowerId = useWatch({ control: form.control, name: 'towerId' })
  const selectedApartmentId = useWatch({ control: form.control, name: 'apartmentId' })
  const selectedResidentIds = useWatch({ control: form.control, name: 'residentIds' }) ?? []
  const selectedGuestNames = useWatch({ control: form.control, name: 'guestNames' }) ?? []
  const shouldShowResidentError =
    form.formState.submitCount > 0 && Boolean(form.formState.errors.residentIds?.message)

  const towersQuery = useQuery({
    queryKey: ['towers'],
    queryFn: api.getTowers,
  })
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
    () => (apartmentsQuery.data ?? []).filter((apartment) => apartment.towerId === selectedTowerId),
    [apartmentsQuery.data, selectedTowerId],
  )
  const apartmentLabel = residentsQuery.data
    ? `Torre ${residentsQuery.data.apartment.tower ?? '-'} · ${residentsQuery.data.apartment.number}`
    : ''
  const selectedResidents = apartmentResidents.filter((resident) => selectedResidentIds.includes(resident.id))
  const selectedTower = (towersQuery.data ?? []).find((tower) => tower.id === selectedTowerId)
  const selectedApartment = visibleApartments.find((apartment) => apartment.id === selectedApartmentId)

  const createMutation = useMutation({
    mutationFn: api.createPoolEntry,
    onSuccess: () => {
      toast.success('Ingreso a piscina registrado')
      form.reset()
      setGuestDraft('')
      void queryClient.invalidateQueries({ queryKey: ['pool-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['pool-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['pool-resident-search'] })
    },
    onError: () => toast.error('No fue posible registrar el ingreso'),
  })

  function addGuestName(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return

    const exists = selectedGuestNames.some((guest) => guest.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setGuestDraft('')
      return
    }

    guestFields.append({ name: trimmed })
    setGuestDraft('')
  }

  function toggleResidentSelection(residentId: string) {
    const currentResidentIds = form.getValues('residentIds')
    const nextResidentIds = currentResidentIds.includes(residentId)
      ? currentResidentIds.filter((id) => id !== residentId)
      : [...currentResidentIds, residentId]

    form.setValue('residentIds', nextResidentIds, { shouldValidate: true })
  }

  useEffect(() => {
    if (!towerOpen) return

    const timeoutId = window.setTimeout(() => {
      towerSearchRef.current?.focus()
      towerListRef.current?.scrollTo({ top: 0 })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [towerOpen])

  useEffect(() => {
    if (!apartmentOpen) return

    const timeoutId = window.setTimeout(() => {
      apartmentSearchRef.current?.focus()
      apartmentListRef.current?.scrollTo({ top: 0 })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [apartmentOpen])

  useEffect(() => {
    towerListRef.current?.scrollTo({ top: 0 })
  }, [towerSearch])

  useEffect(() => {
    apartmentListRef.current?.scrollTo({ top: 0 })
  }, [apartmentSearch])

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Piscina"
        title="Control de ingresos"
        description="Selecciona torre, apartamento y luego marca a todos los residentes que realmente ingresan al área."
      />

      <div className="p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)]">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <Badge className="w-fit">Flujo operativo</Badge>
              <CardTitle>Nuevo ingreso</CardTitle>
              <CardDescription>
                El flujo ahora parte de la estructura real del conjunto: torre, apartamento, residentes del apartamento e invitados nominales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Torre" error={form.formState.errors.towerId?.message}>
                  <FilterableSelect
                    open={towerOpen}
                    onOpenChange={setTowerOpen}
                    value={selectedTowerId}
                    displayValue={selectedTower ? selectedTower.name : ''}
                    placeholder="Selecciona torre"
                    searchPlaceholder="Filtrar torre..."
                    emptyMessage="No hay torres para esa busqueda."
                    items={towersQuery.data ?? []}
                    getKey={(tower) => tower.id}
                    getLabel={(tower) => tower.name}
                    onSelect={(tower) => {
                      form.setValue('towerId', tower.id, { shouldValidate: false })
                      form.setValue('apartmentId', '', { shouldValidate: false })
                      form.setValue('residentIds', [], { shouldValidate: false })
                      setTowerOpen(false)
                      setTowerSearch('')
                      setApartmentSearch('')
                      setApartmentOpen(true)
                    }}
                    inputRef={towerSearchRef}
                    listRef={towerListRef}
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
                        ? `Torre ${selectedApartment.tower ?? '-'} · ${selectedApartment.number} · Piso ${selectedApartment.floor ?? '-'}`
                        : ''
                    }
                    placeholder={selectedTowerId ? 'Selecciona apartamento' : 'Primero selecciona torre'}
                    searchPlaceholder="Filtrar apartamento o piso..."
                    emptyMessage="No hay apartamentos para esa busqueda."
                    items={visibleApartments}
                    disabled={!selectedTowerId}
                    getKey={(apartment) => apartment.id}
                    getLabel={(apartment) =>
                      `Torre ${apartment.tower ?? '-'} · ${apartment.number} · Piso ${apartment.floor ?? '-'}`
                    }
                    onSelect={(apartment) => {
                      form.setValue('apartmentId', apartment.id, { shouldValidate: false })
                      form.setValue('residentIds', [], { shouldValidate: false })
                      setApartmentSearch('')
                    }}
                    inputRef={apartmentSearchRef}
                    listRef={apartmentListRef}
                    searchValue={apartmentSearch}
                    onSearchValueChange={setApartmentSearch}
                  />
                </Field>
              </div>

              {selectedTowerId ? (
                <p className="text-xs text-muted-foreground">
                  Mostrando {visibleApartments.length} apartamentos de la torre seleccionada.
                </p>
              ) : null}

              {apartmentLabel ? (
                <div className="py-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{apartmentLabel}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Se cargaron automáticamente los residentes vinculados a este apartamento.
                      </p>
                    </div>
                    <Badge>{apartmentResidents.length} residentes</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {apartmentResidents.map((resident) => (
                      <button
                        key={resident.id}
                        type="button"
                        onClick={() => toggleResidentSelection(resident.id)}
                        className={
                          selectedResidentIds.includes(resident.id)
                            ? 'inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-sm font-medium text-white'
                            : 'inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200'
                        }
                      >
                        <span
                          className={
                            selectedResidentIds.includes(resident.id)
                              ? 'size-1.5 rounded-full bg-white'
                              : 'size-1.5 rounded-full bg-slate-400'
                          }
                        />
                        {resident.name} {resident.lastName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <form
                className="space-y-5"
                onSubmit={form.handleSubmit((values) =>
                  createMutation.mutate({
                    apartmentId: values.apartmentId,
                    residentIds: values.residentIds,
                    notes: values.notes,
                    guestNames: values.guestNames.map((guest) => guest.name),
                  }),
                )}
              >
                <Field
                  label="Residentes seleccionados"
                  error={shouldShowResidentError ? form.formState.errors.residentIds?.message : undefined}
                  hint={
                    selectedResidents.length > 0
                      ? `${selectedResidents.length} residente(s) asociado(s) a este ingreso.`
                      : 'Selecciona un apartamento para cargar y elegir sus residentes.'
                  }
                >
                  <div
                    className={
                      selectedApartmentId && selectedResidents.length === 0
                        ? 'flex min-h-10 flex-wrap gap-2 border-l-2 border-slate-300 bg-slate-50/60 px-3 py-2 transition'
                        : 'flex min-h-10 flex-wrap gap-2 rounded-md bg-white py-1'
                    }
                  >
                    {selectedResidents.length > 0 ? (
                      selectedResidents.map((resident) => (
                        <button
                          key={resident.id}
                          type="button"
                          onClick={() => toggleResidentSelection(resident.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-sm font-medium text-white"
                        >
                          <span className="size-1.5 rounded-full bg-white" />
                          {resident.name} {resident.lastName}
                        </button>
                      ))
                    ) : (
                      <span className="py-1 text-sm text-slate-600">
                        {selectedApartmentId
                          ? 'Ahora selecciona uno o más residentes para continuar.'
                          : 'Sin residentes seleccionados.'}
                      </span>
                    )}
                  </div>
                </Field>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end">
                    <Field label="Invitado" className="flex-1">
                      <Input
                        value={guestDraft}
                        onChange={(event) => setGuestDraft(event.target.value)}
                        placeholder="Nombre completo del invitado"
                      />
                    </Field>
                    <Button type="button" onClick={() => addGuestName(guestDraft)}>
                      Agregar invitado
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {guestFields.fields.length === 0 ? (
                      <div className="px-1 py-1 text-sm text-muted-foreground">
                        Sin invitados agregados. Si entran cuatro acompañantes, debes registrar los cuatro nombres.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {guestFields.fields.map((field, index) => {
                          const guestName = form.getValues(`guestNames.${index}.name`)

                          return (
                            <div
                              key={field.id}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-800"
                            >
                              <span>{guestName || `Invitado ${index + 1}`}</span>
                              <button
                                type="button"
                                onClick={() => guestFields.remove(index)}
                                className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
                              >
                                Quitar
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <Field label="Notas operativas" error={form.formState.errors.notes?.message}>
                  <Textarea
                    {...form.register('notes')}
                    placeholder="Ej. ingreso validado con brazalete, residente con menores, observación del turno."
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Registrar ingreso
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle>Guía rápida</CardTitle>
                <CardDescription>Checklist mínimo para registrar un ingreso sin errores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <AsideLine label="1" value="Selecciona la torre real del conjunto." />
                <AsideLine label="2" value="Elige el apartamento dentro de esa torre." />
                <AsideLine label="3" value="Marca a todos los residentes que ingresan." />
                <AsideLine label="4" value="Si entran invitados, escribe todos los nombres." />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function AsideLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 bg-slate-50 px-3 py-2.5">
      <div className="flex size-6 shrink-0 items-center justify-center bg-slate-950 text-[11px] font-semibold text-white">
        {label}
      </div>
      <p className="text-sm leading-5 text-slate-800">{value}</p>
    </div>
  )
}

type FilterableSelectProps<T> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayValue: string
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  items: T[]
  disabled?: boolean
  getKey: (item: T) => string
  getLabel: (item: T) => string
  onSelect: (item: T) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  listRef?: React.RefObject<HTMLDivElement | null>
  searchValue: string
  onSearchValueChange: (value: string) => void
}

function FilterableSelect<T>({
  open,
  onOpenChange,
  value,
  displayValue,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  items,
  disabled,
  getKey,
  getLabel,
  onSelect,
  inputRef,
  listRef,
  searchValue,
  onSearchValueChange,
}: FilterableSelectProps<T>) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition outline-none',
          'focus:ring-2 focus:ring-slate-950/8 disabled:cursor-not-allowed disabled:opacity-50',
          !displayValue && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-md border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)]">
          <Command
            value={searchValue}
            onValueChange={onSearchValueChange}
            className={cn(
              'w-full bg-transparent',
              '[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-slate-200',
              '[&_[cmdk-item]]:rounded-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5',
              '[&_[cmdk-item][data-selected=true]]:bg-slate-100',
            )}
          >
            <CommandInput ref={inputRef} placeholder={searchPlaceholder} className="h-9 rounded-none" />
            <CommandList ref={listRef} className="max-h-56 overflow-y-auto p-1">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              {items.map((item) => {
                const key = getKey(item)
                const label = getLabel(item)
                const isSelected = value === key

                return (
                  <CommandItem
                    key={key}
                    value={label}
                    onSelect={() => {
                      onSelect(item)
                      onOpenChange(false)
                    }}
                    className="flex w-full items-center justify-between"
                  >
                    <span className="truncate">{label}</span>
                    <Check className={cn('size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                )
              })}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  )
}
