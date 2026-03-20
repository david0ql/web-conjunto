import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Package, Truck } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const packageSchema = z.object({
  residentId: z.string().uuid(),
  description: z.string().max(300).optional().or(z.literal('')),
})

export function PackagesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const packagesQuery = useQuery({
    queryKey: ['packages', user?.role],
    queryFn: () => api.getPackages(),
  })
  const residentsQuery = useQuery({
    queryKey: ['residents'],
    queryFn: api.getResidents,
    enabled: true,
  })
  const packages = packagesQuery.data ?? []

  const form = useForm<z.infer<typeof packageSchema>>({
    resolver: zodResolver(packageSchema),
    defaultValues: { residentId: '', description: '' },
  })
  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })

  const createMutation = useMutation({
    mutationFn: api.createPackage,
    onSuccess: () => {
      toast.success('Paquete registrado')
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: () => toast.error('No fue posible registrar el paquete'),
  })

  const deliverMutation = useMutation({
    mutationFn: ({ id, receivedByResidentId }: { id: string; receivedByResidentId: string }) =>
      api.markPackageDelivered(id, { receivedByResidentId }),
    onSuccess: () => {
      toast.success('Paquete entregado')
      void queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: () => toast.error('No fue posible entregar el paquete'),
  })

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Porteria"
        title="Paqueteria"
        description="Registra recepciones y marca entregas con trazabilidad."
        action={
          user ? (
            <Dialog>
            <DialogTrigger asChild>
              <Button>Registrar paquete</Button>
            </DialogTrigger>
              <DialogContent className="w-[min(96vw,720px)]">
                <DialogHeader>
                  <DialogTitle>Nuevo paquete</DialogTitle>
                  <DialogDescription>Asocia el paquete al residente correcto.</DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-4"
                  onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
                >
                  <Field label="Residente" error={form.formState.errors.residentId?.message}>
                    <Select
                      onValueChange={(value) => form.setValue('residentId', value, { shouldValidate: true })}
                      value={selectedResidentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona residente" />
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
                  <Field label="Descripcion" error={form.formState.errors.description?.message}>
                    <Textarea {...form.register('description')} placeholder="Ej. caja mediana, sobre de mensajería, pedido de farmacia." />
                  </Field>
                  <Button type="submit" disabled={createMutation.isPending}>
                    Guardar paquete
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Paquetes"
            value={packages.length}
            detail="Recepciones totales registradas."
            icon={<Package className="size-5" />}
          />
          <KpiCard
            label="Pendientes"
            value={packages.filter((item) => !item.delivered).length}
            detail="Aún por entregar a residentes."
            icon={<Truck className="size-5" />}
          />
          <KpiCard
            label="Entregados"
            value={packages.filter((item) => item.delivered).length}
            detail="Procesados correctamente."
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {packages.map((item) => (
            <Card key={item.id} className="bg-white">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>{item.description ?? 'Paquete sin descripcion'}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Residente: {item.resident?.name ?? 'Residente'}</p>
                </div>
                <Badge>{item.delivered ? 'Entregado' : 'Pendiente'}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p>Llegó: {formatDate(item.arrivalTime)}</p>
                  {item.deliveredTime ? <p className="mt-1">Entregado: {formatDate(item.deliveredTime)}</p> : null}
                </div>

                {!item.delivered ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      deliverMutation.mutate({
                        id: item.id,
                        receivedByResidentId: item.residentId,
                      })
                    }
                  >
                    Marcar entrega
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
