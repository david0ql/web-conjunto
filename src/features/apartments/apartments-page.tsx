import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Hash, Layers3 } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const apartmentSchema = z.object({
  number: z.string().min(1).max(10),
  tower: z.string().max(10).optional().or(z.literal('')),
  floor: z.string().optional().or(z.literal('')),
  area: z.string().optional().or(z.literal('')),
  statusId: z.string().uuid(),
})

export function ApartmentsPage() {
  const queryClient = useQueryClient()
  const apartmentsQuery = useQuery({
    queryKey: ['apartments'],
    queryFn: api.getApartments,
  })
  const statusesQuery = useQuery({
    queryKey: ['apartment-statuses'],
    queryFn: api.getApartmentStatuses,
  })
  const apartments = apartmentsQuery.data ?? []

  const form = useForm<z.infer<typeof apartmentSchema>>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: {
      number: '',
      tower: '',
      statusId: '',
    },
  })
  const selectedStatusId = useWatch({ control: form.control, name: 'statusId' })

  const createMutation = useMutation({
    mutationFn: api.createApartment,
    onSuccess: () => {
      toast.success('Apartamento creado')
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['apartments'] })
    },
    onError: () => toast.error('No fue posible crear el apartamento'),
  })

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Administracion"
        title="Apartamentos"
        description="Control de unidades, torre, piso, area y estado actual."
        action={
          <Dialog>
            <DialogTrigger asChild>
              <Button>Nuevo apartamento</Button>
            </DialogTrigger>
            <DialogContent className="w-[min(96vw,760px)]">
              <DialogHeader>
                <DialogTitle>Crear apartamento</DialogTitle>
                <DialogDescription>Alta de unidad habitacional.</DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={form.handleSubmit((values) =>
                  createMutation.mutate({
                    ...values,
                    floor: values.floor ? Number(values.floor) : undefined,
                    area: values.area ? Number(values.area) : undefined,
                  }),
                )}
              >
                <Field label="Numero" error={form.formState.errors.number?.message}>
                  <Input {...form.register('number')} placeholder="101" />
                </Field>
                <Field label="Torre" error={form.formState.errors.tower?.message}>
                  <Input {...form.register('tower')} placeholder="A" />
                </Field>
                <Field label="Piso" error={form.formState.errors.floor?.message}>
                  <Input {...form.register('floor')} type="number" placeholder="1" />
                </Field>
                <Field label="Area m2" error={form.formState.errors.area?.message}>
                  <Input {...form.register('area')} type="number" step="0.01" placeholder="87.5" />
                </Field>
                <Field label="Estado" error={form.formState.errors.statusId?.message} className="md:col-span-2">
                  <Select
                    onValueChange={(value) => form.setValue('statusId', value, { shouldValidate: true })}
                    value={selectedStatusId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {(statusesQuery.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button className="md:col-span-2" type="submit" disabled={createMutation.isPending}>
                  Guardar apartamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Unidades"
            value={apartments.length}
            detail="Apartamentos registrados."
            icon={<Building2 className="size-5" />}
          />
          <KpiCard
            label="Con torre"
            value={apartments.filter((apartment) => Boolean(apartment.tower)).length}
            detail="Unidades con torre definida."
            icon={<Layers3 className="size-5" />}
          />
          <KpiCard
            label="Con área"
            value={apartments.filter((apartment) => Boolean(apartment.area)).length}
            detail="Inventario con metraje cargado."
            icon={<Hash className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {apartments.map((apartment) => (
            <Card key={apartment.id} className="bg-white">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>
                    Torre {apartment.tower ?? '-'} · {apartment.number}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Unidad habitacional</p>
                </div>
                <Badge>{apartment.status?.name ?? 'Sin estado'}</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Configuración</p>
                  <p className="mt-2 text-slate-700">Piso {apartment.floor ?? 'Sin dato'}</p>
                  <p className="mt-1 text-slate-500">
                    Área {apartment.area ? `${apartment.area} m2` : 'Sin dato'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
