import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock3, DoorOpen, UserRoundPlus } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const visitorSchema = z.object({
  name: z.string().min(2),
  lastName: z.string().min(2),
  document: z.string().max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

const accessSchema = z.object({
  visitorId: z.string().uuid().optional().or(z.literal('')),
  residentId: z.string().uuid().optional().or(z.literal('')),
  apartmentId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export function AccessPage() {
  const queryClient = useQueryClient()
  const visitorsQuery = useQuery({
    queryKey: ['visitors'],
    queryFn: api.getVisitors,
  })
  const residentsQuery = useQuery({
    queryKey: ['residents'],
    queryFn: api.getResidents,
  })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments'],
    queryFn: () => api.getApartments(),
  })
  const accessQuery = useQuery({
    queryKey: ['access-audit'],
    queryFn: api.getAccessAudit,
  })
  const accessAudit = accessQuery.data ?? []

  const visitorForm = useForm<z.infer<typeof visitorSchema>>({
    resolver: zodResolver(visitorSchema),
    defaultValues: { name: '', lastName: '', document: '', phone: '' },
  })

  const accessForm = useForm<z.infer<typeof accessSchema>>({
    resolver: zodResolver(accessSchema),
    defaultValues: { visitorId: '', residentId: '', apartmentId: '', notes: '' },
  })
  const selectedVisitorId = useWatch({ control: accessForm.control, name: 'visitorId' })
  const selectedResidentId = useWatch({ control: accessForm.control, name: 'residentId' })
  const selectedApartmentId = useWatch({ control: accessForm.control, name: 'apartmentId' })

  const visitorMutation = useMutation({
    mutationFn: api.createVisitor,
    onSuccess: () => {
      toast.success('Visitante creado')
      visitorForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['visitors'] })
    },
    onError: () => toast.error('No fue posible crear el visitante'),
  })

  const accessMutation = useMutation({
    mutationFn: api.createAccessAudit,
    onSuccess: () => {
      toast.success('Ingreso registrado')
      accessForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['access-audit'] })
    },
    onError: () => toast.error('No fue posible registrar el acceso'),
  })

  const exitMutation = useMutation({
    mutationFn: api.registerExit,
    onSuccess: () => {
      toast.success('Salida registrada')
      void queryClient.invalidateQueries({ queryKey: ['access-audit'] })
    },
    onError: () => toast.error('No fue posible registrar la salida'),
  })

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Porteria"
        title="Accesos y visitantes"
        description="Registro de visitantes, entradas y salidas con respaldo en la auditoria del backend."
        action={
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Nuevo visitante</Button>
              </DialogTrigger>
              <DialogContent className="w-[min(96vw,760px)]">
                <DialogHeader>
                  <DialogTitle>Crear visitante</DialogTitle>
                  <DialogDescription>Datos basicos de identificacion.</DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={visitorForm.handleSubmit((values) => visitorMutation.mutate(values))}
                >
                  <Field label="Nombre" error={visitorForm.formState.errors.name?.message}>
                    <Input {...visitorForm.register('name')} placeholder="Laura" />
                  </Field>
                  <Field label="Apellido" error={visitorForm.formState.errors.lastName?.message}>
                    <Input {...visitorForm.register('lastName')} placeholder="Sanchez" />
                  </Field>
                  <Field label="Documento" error={visitorForm.formState.errors.document?.message}>
                    <Input {...visitorForm.register('document')} placeholder="CC o pasaporte" />
                  </Field>
                  <Field label="Telefono" error={visitorForm.formState.errors.phone?.message}>
                    <Input {...visitorForm.register('phone')} placeholder="3001234567" />
                  </Field>
                  <Button className="md:col-span-2" type="submit" disabled={visitorMutation.isPending}>
                    Guardar visitante
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button>Registrar ingreso</Button>
              </DialogTrigger>
              <DialogContent className="w-[min(96vw,760px)]">
                <DialogHeader>
                  <DialogTitle>Registro de ingreso</DialogTitle>
                  <DialogDescription>Vincula visitante o residente con el apartamento.</DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-4"
                  onSubmit={accessForm.handleSubmit((values) => accessMutation.mutate(values))}
                >
                  <Field label="Visitante">
                    <Select
                      onValueChange={(value) => accessForm.setValue('visitorId', value)}
                      value={selectedVisitorId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {(visitorsQuery.data ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} {item.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Residente">
                    <Select
                      onValueChange={(value) => accessForm.setValue('residentId', value)}
                      value={selectedResidentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {(residentsQuery.data ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} {item.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Apartamento">
                    <Select
                      onValueChange={(value) => accessForm.setValue('apartmentId', value)}
                      value={selectedApartmentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {(apartmentsQuery.data ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            Torre {item.tower ?? '-'} · {item.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Notas">
                    <Textarea {...accessForm.register('notes')} placeholder="Ej. visita autorizada por llamada, entrega rápida, ingreso con vehículo." />
                  </Field>
                  <Button type="submit" disabled={accessMutation.isPending}>
                    Guardar ingreso
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Ingresos"
            value={accessAudit.length}
            detail="Movimientos auditados."
            icon={<DoorOpen className="size-5" />}
          />
          <KpiCard
            label="Activos"
            value={accessAudit.filter((item) => !item.exitTime).length}
            detail="Personas aún dentro del conjunto."
            icon={<Clock3 className="size-5" />}
          />
          <KpiCard
            label="Visitantes"
            value={accessAudit.filter((item) => Boolean(item.visitor)).length}
            detail="Entradas ligadas a visitantes."
            icon={<UserRoundPlus className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {accessAudit.map((item) => (
            <Card key={item.id} className="bg-white">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>
                    {item.visitor
                      ? `${item.visitor.name} ${item.visitor.lastName}`
                      : item.resident
                        ? `${item.resident.name} ${item.resident.lastName}`
                        : 'Ingreso registrado'}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Entrada {formatDate(item.entryTime)}</p>
                </div>
                <Badge>{item.exitTime ? 'Cerrado' : 'Dentro'}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p>Salida: {item.exitTime ? formatDate(item.exitTime) : 'Aún dentro'}</p>
                  <p className="mt-1">
                    Apartamento:{' '}
                    {item.apartment ? `Torre ${item.apartment.tower ?? '-'} · ${item.apartment.number}` : 'Sin apartamento'}
                  </p>
                  <p className="mt-1">Notas: {item.notes ?? 'Sin notas'}</p>
                </div>
                {!item.exitTime ? (
                  <Button size="sm" onClick={() => exitMutation.mutate(item.id)}>
                    Registrar salida
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
