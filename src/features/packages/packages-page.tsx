import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Package, Truck } from 'lucide-react'
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
import { useAuth } from '@/hooks/use-auth-context'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { PackageItem } from '@/types/api'

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

  const towerFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const pkg of packages) {
      const id = pkg.resident?.apartment?.towerId
      if (id && !seen.has(id)) {
        seen.add(id)
        const apt = pkg.resident?.apartment
        const label = apt?.towerData?.name ?? (apt?.tower ? `Torre ${apt.tower}` : id)
        opts.push({ value: id, label })
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [packages])

  const filters: FilterDef[] = [
    {
      key: 'delivered',
      placeholder: 'Estado',
      options: [
        { value: 'false', label: 'Pendiente' },
        { value: 'true', label: 'Entregado' },
      ],
    },
    {
      key: 'arrivalTime',
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

  const columns: ColumnDef<PackageItem>[] = [
    {
      header: 'Residente',
      cell: (row) =>
        row.resident ? (
          <div>
            <p className="font-medium text-slate-900">
              {row.resident.name} {row.resident.lastName}
            </p>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      header: 'Descripción',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[280px] text-slate-600">
          {row.description ?? 'Sin descripción'}
        </span>
      ),
    },
    {
      header: 'Llegada',
      cell: (row) => (
        <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.arrivalTime)}</span>
      ),
    },
    {
      header: 'Entregado',
      cell: (row) =>
        row.deliveredTime ? (
          <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.deliveredTime)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.delivered ? 'Entregado' : 'Pendiente'}
          variant={row.delivered ? 'green' : 'amber'}
        />
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (row) =>
        !row.delivered ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() =>
              deliverMutation.mutate({ id: row.id, receivedByResidentId: row.residentId })
            }
            disabled={deliverMutation.isPending}
          >
            Marcar entrega
          </Button>
        ) : null,
    },
  ]

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
                    <Textarea
                      {...form.register('description')}
                      placeholder="Ej. caja mediana, sobre de mensajería, pedido de farmacia."
                    />
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

      <div className="space-y-4 p-4 sm:p-6">
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

        <DataTable
          data={packages}
          columns={columns}
          searchPlaceholder="Buscar residente o descripción..."
          getSearchText={(row) =>
            [
              row.resident ? `${row.resident.name} ${row.resident.lastName}` : null,
              row.description,
            ]
              .filter(Boolean)
              .join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            delivered: String(row.delivered),
            arrivalTime: row.arrivalTime,
            towerId: row.resident?.apartment?.towerId ?? '',
          })}
          isLoading={packagesQuery.isLoading}
          emptyMessage="Sin paquetes registrados."
        />
      </div>
    </div>
  )
}
