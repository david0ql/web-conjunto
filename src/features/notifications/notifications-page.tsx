import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, CheckCircle2, MessageSquare } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const notificationSchema = z.object({
  residentId: z.string().uuid(),
  notificationTypeId: z.string().uuid(),
  message: z.string().min(4),
})

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getAllNotifications,
  })
  const residentsQuery = useQuery({
    queryKey: ['residents'],
    queryFn: api.getResidents,
    enabled: true,
  })
  const typesQuery = useQuery({
    queryKey: ['notification-types'],
    queryFn: api.getNotificationTypes,
    enabled: true,
  })
  const notifications = notificationsQuery.data ?? []

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      residentId: '',
      notificationTypeId: '',
      message: '',
    },
  })
  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })
  const selectedNotificationTypeId = useWatch({
    control: form.control,
    name: 'notificationTypeId',
  })

  const createMutation = useMutation({
    mutationFn: api.createNotification,
    onSuccess: () => {
      toast.success('Notificacion enviada')
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('No fue posible crear la notificacion'),
  })

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Comunicaciones"
        title="Notificaciones"
        description="Los empleados pueden crear notificaciones para residentes desde este panel."
        action={
          <Dialog>
            <DialogTrigger asChild>
              <Button>Nueva notificacion</Button>
            </DialogTrigger>
            <DialogContent className="w-[min(96vw,720px)]">
              <DialogHeader>
                <DialogTitle>Enviar notificacion</DialogTitle>
                <DialogDescription>Mensaje puntual con tipo y destinatario.</DialogDescription>
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
                <Field label="Tipo" error={form.formState.errors.notificationTypeId?.message}>
                  <Select
                    onValueChange={(value) =>
                      form.setValue('notificationTypeId', value, { shouldValidate: true })
                    }
                    value={selectedNotificationTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(typesQuery.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Mensaje" error={form.formState.errors.message?.message}>
                  <Textarea
                    {...form.register('message')}
                    placeholder="Escribe el contenido que recibirá el residente."
                  />
                </Field>
                <Button type="submit" disabled={createMutation.isPending}>
                  Enviar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Mensajes"
            value={notifications.length}
            detail="Notificaciones administrativas emitidas."
            icon={<Bell className="size-5" />}
          />
          <KpiCard
            label="Pendientes"
            value={notifications.filter((item) => !item.isRead).length}
            detail="Aún sin marcar como leídas."
            icon={<MessageSquare className="size-5" />}
          />
          <KpiCard
            label="Leídas"
            value={notifications.filter((item) => item.isRead).length}
            detail="Mensajes ya revisados por residentes."
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {notifications.map((item) => (
            <Card key={item.id} className="bg-white">
              <CardHeader className="flex flex-col items-start justify-between gap-4 space-y-0 sm:flex-row">
                <div className="min-w-0">
                  <CardTitle>{item.notificationType?.name ?? 'Notificacion'}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Creada {formatDate(item.createdAt)}</p>
                </div>
                <Badge>{item.isRead ? 'Leída' : 'Pendiente'}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="break-words rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3 leading-6">
                  {item.message}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
