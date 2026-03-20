import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const poolSchema = z.object({
  tower: z.string().min(1, 'Ingresa la torre').max(10),
  number: z.string().min(1, 'Ingresa el apartamento').max(10),
  residentId: z.string().uuid('Selecciona un residente'),
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
  const [apartmentResidents, setApartmentResidents] = useState<Array<{ id: string; name: string; lastName: string }>>([])
  const [apartmentLabel, setApartmentLabel] = useState('')
  const [guestDraft, setGuestDraft] = useState('')

  const form = useForm<z.infer<typeof poolSchema>>({
    resolver: zodResolver(poolSchema),
    defaultValues: {
      tower: '',
      number: '',
      residentId: '',
      notes: '',
      guestNames: [],
    },
  })
  const guestFields = useFieldArray({
    control: form.control,
    name: 'guestNames',
  })

  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })
  const selectedGuestNames = useWatch({ control: form.control, name: 'guestNames' }) ?? []
  const selectedResident = apartmentResidents.find((resident) => resident.id === selectedResidentId)

  const searchMutation = useMutation({
    mutationFn: ({ tower, number }: { tower: string; number: string }) => api.searchPoolResidents(tower, number),
    onSuccess: (result) => {
      setApartmentResidents(result.residents)
      setApartmentLabel(`Torre ${result.apartment.tower ?? '-'} · ${result.apartment.number}`)
      form.setValue('residentId', '')
      toast.success('Apartamento encontrado')
    },
    onError: () => {
      setApartmentResidents([])
      setApartmentLabel('')
      toast.error('No se encontró el apartamento')
    },
  })

  const createMutation = useMutation({
    mutationFn: api.createPoolEntry,
    onSuccess: () => {
      toast.success('Ingreso a piscina registrado')
      form.reset()
      setApartmentResidents([])
      setApartmentLabel('')
      setGuestDraft('')
      void queryClient.invalidateQueries({ queryKey: ['pool-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['pool-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['pool-guest-suggestions'] })
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

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Piscina"
        title="Control de ingresos"
        description="Registro por torre y apartamento, selección nominal del residente, invitados por nombre y trazabilidad reciente de la operación."
      />

      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <Card className="bg-white">
            <CardHeader>
              <Badge className="w-fit">Flujo operativo</Badge>
              <CardTitle>Nuevo ingreso</CardTitle>
              <CardDescription>
                Una sola tarea aquí: registrar correctamente el ingreso. Busca el apartamento, selecciona el residente y carga a todos los invitados por nombre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[0.7fr_0.7fr_auto]">
                <Field label="Torre" error={form.formState.errors.tower?.message}>
                  <Input {...form.register('tower')} placeholder="Ej. A" />
                </Field>
                <Field label="Apartamento" error={form.formState.errors.number?.message}>
                  <Input {...form.register('number')} placeholder="Ej. 101" />
                </Field>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    type="button"
                    onClick={() =>
                      searchMutation.mutate({
                        tower: form.getValues('tower'),
                        number: form.getValues('number'),
                      })
                    }
                  >
                    <Search className="size-4" />
                    Buscar
                  </Button>
                </div>
              </div>

              {apartmentLabel ? (
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{apartmentLabel}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Selecciona exactamente al residente que está ingresando al área.
                      </p>
                    </div>
                    <Badge>{apartmentResidents.length} residentes</Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {apartmentResidents.map((resident) => (
                      <button
                        key={resident.id}
                        type="button"
                        onClick={() => form.setValue('residentId', resident.id, { shouldValidate: true })}
                        className={
                          selectedResidentId === resident.id
                            ? 'rounded-full border border-slate-950 bg-slate-950 px-3.5 py-2 text-sm font-medium text-white'
                            : 'rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
                        }
                      >
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
                    residentId: values.residentId,
                    notes: values.notes,
                    guestNames: values.guestNames.map((guest) => guest.name),
                  }),
                )}
              >
                <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
                  <Field
                    label="Residente seleccionado"
                    error={form.formState.errors.residentId?.message}
                    hint={selectedResident ? `${selectedResident.name} ${selectedResident.lastName}` : 'Busca un apartamento y selecciona uno de sus residentes.'}
                  >
                    <Input
                      readOnly
                      value={selectedResident ? `${selectedResident.name} ${selectedResident.lastName}` : ''}
                      placeholder="Sin residente seleccionado"
                    />
                  </Field>
                </div>

                <div className="space-y-4 rounded-[1.4rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <Field label="Invitado" className="flex-1">
                      <Input
                        value={guestDraft}
                        onChange={(event) => setGuestDraft(event.target.value)}
                        placeholder="Nombre completo del invitado"
                      />
                    </Field>
                    <Button type="button" variant="outline" onClick={() => addGuestName(guestDraft)}>
                      Agregar invitado
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sugerencias frecuentes</p>
                    <div className="flex flex-wrap gap-2">
                      {(suggestionsQuery.data ?? []).slice(0, 10).map((suggestion) => (
                        <button
                          key={suggestion.name}
                          type="button"
                          onClick={() => addGuestName(suggestion.name)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          {suggestion.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {guestFields.fields.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-muted-foreground">
                        Sin invitados agregados. Si entran cuatro acompañantes, debes registrar los cuatro nombres.
                      </div>
                    ) : (
                      guestFields.fields.map((field, index) => (
                        <div key={field.id} className="flex flex-col gap-3 md:flex-row md:items-center">
                          <Input
                            {...form.register(`guestNames.${index}.name`)}
                            placeholder={`Invitado ${index + 1}`}
                          />
                          <Button type="button" variant="outline" onClick={() => guestFields.remove(index)}>
                            Quitar
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Field label="Notas operativas" error={form.formState.errors.notes?.message}>
                  <Textarea
                    {...form.register('notes')}
                    placeholder="Ej. ingreso validado con brazalete, residente con menores, observación del turno."
                  />
                </Field>

                <Button type="submit" disabled={createMutation.isPending}>
                  Registrar ingreso
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Guía rápida</CardTitle>
                <CardDescription>Checklist mínimo para registrar un ingreso sin errores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <AsideLine label="1" value="Busca siempre por torre y apartamento." />
                <AsideLine label="2" value="Selecciona al residente correcto." />
                <AsideLine label="3" value="Si entran invitados, escribe todos los nombres." />
                <AsideLine label="4" value="Usa notas solo cuando aporten contexto real." />
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
    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-slate-950 text-[11px] font-semibold text-white">
        {label}
      </div>
      <p className="text-sm leading-5 text-slate-800">{value}</p>
    </div>
  )
}
