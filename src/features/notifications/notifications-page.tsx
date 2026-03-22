import { useState } from 'react'
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
import { FilterableSelect } from '@/components/ui/filterable-select'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { NotificationItem } from '@/types/api'

const notificationSchema = z.object({
  towerId: z.string().min(1, 'Selecciona una torre'),
  apartmentId: z.string().uuid('Selecciona un apartamento'),
  residentId: z.string().uuid().optional().or(z.literal('')),
  notificationTypeId: z.string().uuid('Selecciona un tipo'),
  message: z.string().min(4, 'Mínimo 4 caracteres'),
})

type FormValues = z.infer<typeof notificationSchema>

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  // Dropdown open states
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')
  const [residentOpen, setResidentOpen] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')

  const notificationsQuery = useQuery({ queryKey: ['notifications'], queryFn: api.getAllNotifications })
  const typesQuery = useQuery({ queryKey: ['notification-types'], queryFn: api.getNotificationTypes })
  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers })
  const notifications = notificationsQuery.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { towerId: '', apartmentId: '', residentId: '', notificationTypeId: '', message: '' },
  })

  const selectedTowerId = useWatch({ control: form.control, name: 'towerId' })
  const selectedApartmentId = useWatch({ control: form.control, name: 'apartmentId' })
  const selectedResidentId = useWatch({ control: form.control, name: 'residentId' })
  const selectedTypeId = useWatch({ control: form.control, name: 'notificationTypeId' })

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', selectedTowerId],
    queryFn: () => api.getApartments(selectedTowerId),
    enabled: Boolean(selectedTowerId),
  })
  const residentsQuery = useQuery({
    queryKey: ['residents', { apartmentId: selectedApartmentId }],
    queryFn: () => api.getResidents({ apartmentId: selectedApartmentId }),
    enabled: Boolean(selectedApartmentId),
  })

  const towers = towersQuery.data ?? []
  const apartments = (apartmentsQuery.data ?? []).filter((a) => a.towerId === selectedTowerId)
  const residents = residentsQuery.data ?? []

  const selectedTower = towers.find((t) => t.id === selectedTowerId)
  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId)
  const selectedResident = residents.find((r) => r.id === selectedResidentId)

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.createNotification({
        apartmentId: values.apartmentId,
        ...(values.residentId ? { residentId: values.residentId } : {}),
        notificationTypeId: values.notificationTypeId,
        message: values.message,
      }),
    onSuccess: () => {
      toast.success('Notificación enviada')
      form.reset()
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('No fue posible crear la notificación'),
  })

  function handleDialogClose(v: boolean) {
    setOpen(v)
    if (!v) {
      form.reset()
      setTowerOpen(false)
      setAptOpen(false)
      setResidentOpen(false)
    }
  }

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
      type: 'period' as const,
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
      header: 'Destino',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.apartment?.towerData?.name ?? (row.apartment?.tower ? `Torre ${row.apartment.tower}` : '—')}
            {' · '}Apt. {row.apartment?.number ?? '—'}
          </p>
          {row.resident && (
            <p className="text-xs text-slate-400 mt-0.5">
              {row.resident.name} {row.resident.lastName}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Tipo',
      cell: (row) => (
        <span className="font-medium text-slate-700">{row.notificationType?.name ?? 'Notificación'}</span>
      ),
    },
    {
      header: 'Mensaje',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[300px] text-slate-600 leading-relaxed">{row.message}</span>
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
        description="Los empleados pueden crear notificaciones para apartamentos y residentes desde este panel."
        action={
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>Nueva notificación</Button>
            </DialogTrigger>
            <DialogContent className="w-[min(96vw,620px)]">
              <DialogHeader>
                <DialogTitle>Enviar notificación</DialogTitle>
                <DialogDescription>Selecciona torre y apartamento. El residente es opcional.</DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Torre" error={form.formState.errors.towerId?.message}>
                    <FilterableSelect
                      open={towerOpen}
                      onOpenChange={setTowerOpen}
                      value={selectedTowerId}
                      displayValue={selectedTower?.name ?? ''}
                      placeholder="Selecciona torre"
                      searchPlaceholder="Filtrar torre..."
                      items={towers}
                      getKey={(t) => t.id}
                      getLabel={(t) => `${t.name} (${t.code})`}
                      onSelect={(t) => {
                        form.setValue('towerId', t.id, { shouldValidate: true })
                        form.setValue('apartmentId', '')
                        form.setValue('residentId', '')
                        setTowerOpen(false)
                        setAptOpen(true)
                      }}
                      searchValue={towerSearch}
                      onSearchValueChange={setTowerSearch}
                    />
                  </Field>
                  <Field label="Apartamento" error={form.formState.errors.apartmentId?.message}>
                    <FilterableSelect
                      open={aptOpen}
                      onOpenChange={setAptOpen}
                      value={selectedApartmentId}
                      displayValue={selectedApartment ? `Apt. ${selectedApartment.number}` : ''}
                      placeholder={!selectedTowerId ? 'Primero elige torre' : 'Selecciona apt.'}
                      searchPlaceholder="Filtrar apartamento..."
                      disabled={!selectedTowerId}
                      items={apartments}
                      getKey={(a) => a.id}
                      getLabel={(a) => `Apt. ${a.number}${a.floor != null ? ` · Piso ${a.floor}` : ''}`}
                      onSelect={(a) => {
                        form.setValue('apartmentId', a.id, { shouldValidate: true })
                        form.setValue('residentId', '')
                        setAptOpen(false)
                      }}
                      searchValue={aptSearch}
                      onSearchValueChange={setAptSearch}
                    />
                  </Field>
                </div>

                <Field label="Residente (opcional)">
                  <FilterableSelect
                    open={residentOpen}
                    onOpenChange={setResidentOpen}
                    value={selectedResidentId ?? ''}
                    displayValue={
                      selectedResident
                        ? `${selectedResident.name} ${selectedResident.lastName}`
                        : ''
                    }
                    placeholder={!selectedApartmentId ? 'Primero elige apartamento' : 'Todos los residentes del apt.'}
                    searchPlaceholder="Filtrar residente..."
                    disabled={!selectedApartmentId}
                    items={[{ id: '', name: 'Todos', lastName: '' } as any, ...residents]}
                    getKey={(r: any) => r.id}
                    getLabel={(r: any) => r.id ? `${r.name} ${r.lastName}` : 'Todos los residentes'}
                    onSelect={(r: any) => {
                      form.setValue('residentId', r.id || '')
                      setResidentOpen(false)
                    }}
                    searchValue={residentSearch}
                    onSearchValueChange={setResidentSearch}
                  />
                </Field>

                <Field label="Tipo" error={form.formState.errors.notificationTypeId?.message}>
                  <Select
                    onValueChange={(v) => form.setValue('notificationTypeId', v, { shouldValidate: true })}
                    value={selectedTypeId}
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
                    placeholder="Escribe el contenido de la notificación."
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
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
          searchPlaceholder="Buscar por mensaje, tipo o apartamento..."
          getSearchText={(row) =>
            [
              row.message,
              row.notificationType?.name,
              row.apartment?.number,
              row.resident ? `${row.resident.name} ${row.resident.lastName}` : null,
            ]
              .filter(Boolean)
              .join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            isRead: String(row.isRead),
            typeId: row.notificationTypeId ?? '',
            createdAt: row.createdAt,
          })}
          isLoading={notificationsQuery.isLoading}
          emptyMessage="Sin notificaciones registradas."
        />
      </div>
    </div>
  )
}
