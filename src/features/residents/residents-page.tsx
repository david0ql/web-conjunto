import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, UserCheck, Users } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const residentSchema = z.object({
  name: z.string().min(2),
  lastName: z.string().min(2),
  document: z.string().min(4).max(50),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
  residentTypeId: z.string().uuid(),
})

export function ResidentsPage() {
  const queryClient = useQueryClient()
  const residentsQuery = useQuery({
    queryKey: ['residents'],
    queryFn: api.getResidents,
  })
  const residentTypesQuery = useQuery({
    queryKey: ['resident-types'],
    queryFn: api.getResidentTypes,
  })
  const residents = residentsQuery.data ?? []

  const form = useForm<z.infer<typeof residentSchema>>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      name: '',
      lastName: '',
      document: '',
      phone: '',
      email: '',
      password: '',
      residentTypeId: '',
    },
  })
  const selectedResidentTypeId = useWatch({ control: form.control, name: 'residentTypeId' })

  const createMutation = useMutation({
    mutationFn: api.createResident,
    onSuccess: () => {
      toast.success('Residente creado')
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: () => toast.error('No fue posible crear el residente'),
  })

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Administracion"
        title="Residentes"
        description="Alta de residentes con validacion alineada al backend y visibilidad del estado actual."
        action={
          <Dialog>
            <DialogTrigger asChild>
              <Button>Nuevo residente</Button>
            </DialogTrigger>
            <DialogContent className="w-[min(96vw,760px)]">
              <DialogHeader>
                <DialogTitle>Crear residente</DialogTitle>
                <DialogDescription>
                  Nombre, documento, tipo y credenciales iniciales.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
              >
                <Field label="Nombre" error={form.formState.errors.name?.message}>
                  <Input {...form.register('name')} placeholder="Ana" />
                </Field>
                <Field label="Apellido" error={form.formState.errors.lastName?.message}>
                  <Input {...form.register('lastName')} placeholder="Garcia" />
                </Field>
                <Field label="Documento" error={form.formState.errors.document?.message}>
                  <Input {...form.register('document')} placeholder="10203040" />
                </Field>
                <Field label="Telefono" error={form.formState.errors.phone?.message}>
                  <Input {...form.register('phone')} placeholder="3001234567" />
                </Field>
                <Field label="Correo" error={form.formState.errors.email?.message}>
                  <Input {...form.register('email')} type="email" placeholder="ana@email.com" />
                </Field>
                <Field label="Contrasena" error={form.formState.errors.password?.message}>
                  <Input {...form.register('password')} type="password" placeholder="Minimo 6 caracteres" />
                </Field>
                <Field
                  label="Tipo de residente"
                  error={form.formState.errors.residentTypeId?.message}
                  className="md:col-span-2"
                >
                  <Select
                    onValueChange={(value) => form.setValue('residentTypeId', value, { shouldValidate: true })}
                    value={selectedResidentTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(residentTypesQuery.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button className="md:col-span-2" type="submit" disabled={createMutation.isPending}>
                  Guardar residente
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Total"
            value={residents.length}
            detail="Residentes registrados en el sistema."
            icon={<Users className="size-5" />}
          />
          <KpiCard
            label="Activos"
            value={residents.filter((resident) => resident.isActive).length}
            detail="Residentes con estado activo."
            icon={<UserCheck className="size-5" />}
          />
          <KpiCard
            label="Con correo"
            value={residents.filter((resident) => Boolean(resident.email)).length}
            detail="Contacto digital disponible."
            icon={<Mail className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {residents.map((resident) => (
            <Card key={resident.id} className="bg-white">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>
                    {resident.name} {resident.lastName}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Documento {resident.document}</p>
                </div>
                <Badge>{resident.residentType?.name ?? 'Sin tipo'}</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contacto</p>
                  <p className="mt-2 text-slate-700">{resident.email ?? 'Sin correo'}</p>
                  <p className="mt-1 text-slate-500">{resident.phone ?? 'Sin telefono'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado</p>
                  <p className="mt-2 font-medium text-slate-900">{resident.isActive ? 'Activo' : 'Inactivo'}</p>
                  <p className="mt-1 text-slate-500">Creado {formatDate(resident.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
