import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { CommunitySpace } from '@/types/api'

const schema = z.object({
  name: z.string().min(1, 'Requerido').max(100),
  phase: z.string().min(1, 'Requerido').max(50),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ─── Create dialog ─────────────────────────────────────────────────────────────

function CreateSpaceDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.createCommunitySpace(data),
    onSuccess: () => {
      toast.success('Zona creada')
      setOpen(false)
      reset()
      void queryClient.invalidateQueries({ queryKey: ['community-spaces'] })
    },
    onError: () => toast.error('No fue posible crear la zona'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 size-3.5" />Nueva zona</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,480px)]">
        <DialogHeader>
          <DialogTitle>Nueva zona común</DialogTitle>
          <DialogDescription>Agrega un espacio de uso libre para los residentes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <Field label="Nombre" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Ej: Parque fase de arriba" />
          </Field>
          <Field label="Fase / Ubicación" error={errors.phase?.message}>
            <Input {...register('phase')} placeholder="Ej: Fase de arriba" />
          </Field>
          <Field label="Descripción (opcional)">
            <Input {...register('description')} placeholder="Descripción corta..." />
          </Field>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando...' : 'Crear zona'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function CommunitySpacesPage() {
  const queryClient = useQueryClient()
  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['community-spaces'],
    queryFn: api.getCommunitySpaces,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCommunitySpace(id),
    onSuccess: () => {
      toast.success('Zona eliminada')
      void queryClient.invalidateQueries({ queryKey: ['community-spaces'] })
    },
    onError: () => toast.error('No fue posible eliminar la zona'),
  })

  const columns: ColumnDef<CommunitySpace>[] = [
    {
      header: 'Nombre',
      accessorKey: 'name',
      cell: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      header: 'Fase',
      accessorKey: 'phase',
    },
    {
      header: 'Descripción',
      accessorKey: 'description',
      cell: (row) => row.description ?? '—',
    },
    {
      header: 'Estado',
      accessorKey: 'isActive',
      cell: (row) => <StatusBadge active={row.isActive} />,
    },
    {
      header: 'Creado',
      accessorKey: 'createdAt',
      cell: (row) => formatDate(row.createdAt),
    },
    {
      header: '',
      accessorKey: 'id',
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
          onClick={() => {
            if (confirm(`¿Eliminar "${row.name}"?`)) deleteMutation.mutate(row.id)
          }}
        >
          Eliminar
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <SectionHeader
        icon={MapPin}
        title="Zonas Comunes"
        description="Espacios de uso libre para todos los residentes del conjunto."
        action={<CreateSpaceDialog />}
      />
      <DataTable
        columns={columns}
        data={spaces}
        loading={isLoading}
        searchKey="name"
        searchPlaceholder="Buscar zona..."
      />
    </div>
  )
}
