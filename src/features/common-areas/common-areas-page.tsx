import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { CommonArea } from '@/types/api'

const areaSchema = z.object({
  name: z.string().min(1, 'Requerido').max(50, 'Máximo 50 caracteres'),
  description: z.string().optional(),
  maxCapacity: z.number().int('Debe ser un número entero').min(1, 'Mínimo 1').optional(),
})

type AreaFormValues = z.infer<typeof areaSchema>

function normalizePayload(data: AreaFormValues) {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    maxCapacity: data.maxCapacity,
  }
}

function AreaFormFields({
  register,
  errors,
}: {
  register: UseFormRegister<AreaFormValues>
  errors: FieldErrors<AreaFormValues>
}) {
  return (
    <div className="space-y-4">
      <Field label="Nombre" error={errors.name?.message}>
        <Input {...register('name')} placeholder="Ej: Salón social" />
      </Field>
      <Field label="Capacidad máxima" error={errors.maxCapacity?.message}>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          {...register('maxCapacity', {
            setValueAs: (value) => (value === '' ? undefined : Number(value)),
          })}
          placeholder="Ej: 80"
        />
      </Field>
      <Field label="Descripción (opcional)" error={errors.description?.message}>
        <Input {...register('description')} placeholder="Descripción corta para residentes..." />
      </Field>
    </div>
  )
}

function CreateAreaDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: { name: '', description: '', maxCapacity: undefined },
  })

  const mutation = useMutation({
    mutationFn: (data: AreaFormValues) => api.createCommonArea(normalizePayload(data)),
    onSuccess: () => {
      toast.success('Área reservable creada')
      setOpen(false)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['common-areas'] })
    },
    onError: () => toast.error('No fue posible crear el área reservable'),
  })

  function onOpenChange(value: boolean) {
    setOpen(value)
    if (!value) form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 size-3.5" />Nueva área</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,560px)]">
        <DialogHeader>
          <DialogTitle>Nueva área reservable</DialogTitle>
          <DialogDescription>Configura los espacios que los residentes pueden solicitar en reserva.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <AreaFormFields register={form.register} errors={form.formState.errors} />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando...' : 'Crear área'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditAreaDialog({ area }: { area: CommonArea }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: area.name,
      description: area.description ?? '',
      maxCapacity: area.maxCapacity ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: AreaFormValues) => api.updateCommonArea(area.id, normalizePayload(data)),
    onSuccess: () => {
      toast.success('Área reservable actualizada')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['common-areas'] })
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
    onError: () => toast.error('No fue posible actualizar el área reservable'),
  })

  function onOpenChange(value: boolean) {
    setOpen(value)
    if (value) {
      form.reset({
        name: area.name,
        description: area.description ?? '',
        maxCapacity: area.maxCapacity ?? undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
          <Pencil className="mr-1 size-3" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,560px)]">
        <DialogHeader>
          <DialogTitle>{area.name}</DialogTitle>
          <DialogDescription>Actualiza la información visible para reservas de residentes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <AreaFormFields register={form.register} errors={form.formState.errors} />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CommonAreasPage() {
  const queryClient = useQueryClient()
  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['common-areas'],
    queryFn: api.getCommonAreas,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCommonArea(id),
    onSuccess: () => {
      toast.success('Área reservable eliminada')
      void queryClient.invalidateQueries({ queryKey: ['common-areas'] })
    },
    onError: () => toast.error('No fue posible eliminar el área reservable'),
  })

  const columns = useMemo<ColumnDef<CommonArea>[]>(() => [
    {
      header: 'Nombre',
      cell: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      header: 'Capacidad',
      cell: (row) => (
        <span className="text-sm text-slate-600">
          {row.maxCapacity ? `${row.maxCapacity} personas` : 'Sin definir'}
        </span>
      ),
    },
    {
      header: 'Descripción',
      cell: (row) => <span className="text-sm text-slate-600">{row.description || 'Sin descripción'}</span>,
    },
    {
      header: 'Creada',
      cell: (row) => formatDate(row.createdAt),
    },
    {
      header: '',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <EditAreaDialog area={row} />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm(`¿Eliminar "${row.name}"?`)) deleteMutation.mutate(row.id)
            }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ], [deleteMutation])

  return (
    <div className="flex flex-col gap-6 p-6">
      <SectionHeader
        eyebrow="Reservas"
        title="Áreas Reservables"
        description="Espacios que los residentes pueden solicitar y que requieren aprobación administrativa."
        action={<CreateAreaDialog />}
      />
      <DataTable
        columns={columns}
        data={areas}
        isLoading={isLoading}
        getSearchText={(row) => [row.name, row.description, row.maxCapacity].filter(Boolean).join(' ')}
        searchPlaceholder="Buscar área..."
        emptyMessage="Sin áreas reservables registradas."
      />
    </div>
  )
}
