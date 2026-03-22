import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, CheckCircle2, MessageSquare } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { NotificationItem } from '@/types/api'

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
  })
  const typesQuery = useQuery({
    queryKey: ['notification-types'],
    queryFn: api.getNotificationTypes,
  })
  const notifications = notificationsQuery.data ?? []

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { residentId: '', notificationTypeId: '', message: '' },
  })
  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })
  const selectedNotificationTypeId = useWatch({ control: form.control, name: 'notificationTypeId' })

  const createMutation = useMutation({
    mutationFn: api.createNotification,
    onSuccess: () => {
      toast.success('Notificacion enviada')
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('No fue posible crear la notificacion'),
  })

  const typeFilterOptions = (typesQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))

  const filters: FilterDef[] = [
    {
      key: 'isRead',
      placeholder: 'Estado',
      options: [
        { value: 'false', label: 'Pendiente' },
        { value: 'true', label: 'Leída' },
      ],
    },
    ...(typeFilterOptions.length > 0
      ? [{ key: 'typeId', placeholder: 'Tipo', options: typeFilterOptions }]
      : []),
    {
      key: 'createdAt',
      type: 'period',
      placeholder: 'Período',
      options: [
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Última semana' },
        { value: 'month', label: 'Último mes' },
        { value: 'quarter', label: 'Últimos 3 meses' },
      ],
    },
  ]

  const columns: ColumnDef<NotificationItem>[] = [
    {
      header: 'Tipo',
      cell: (row) => (
        <span className="font-medium text-slate-900">{row.notificationType?.name ?? 'Notificacion'}</span>
      ),
    },
    {
      header: 'Mensaje',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[340px] text-slate-600 leading-relaxed">{row.message}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.isRead ? 'Leída' : 'Pendiente'}
          variant={row.isRead ? 'green' : 'amber'}
        />
      ),
    },
    {
      header: 'Fecha',
      cell: (row) => <span className="whitespace-nowrap text-slate-500 text-xs">{formatDate(row.createdAt)}</span>,
    },
  ]

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

      <div className="space-y-4 p-4 sm:p-6">
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

        <DataTable
          data={notifications}
          columns={columns}
          searchPlaceholder="Buscar por mensaje o tipo..."
          getSearchText={(row) =>
            [row.message, row.notificationType?.name].filter(Boolean).join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            isRead: String(row.isRead),
            typeId: row.notificationTypeId,
            createdAt: row.createdAt,
          })}
          isLoading={notificationsQuery.isLoading}
          emptyMessage="Sin notificaciones registradas."
        />
      </div>
    </div>
  )
}
