import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Plus, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { useAssemblies, useCreateAssembly } from './hooks/use-assemblies'
import type { AssemblyItem } from './types'
import { formatDate } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  finished: 'Finalizada',
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  finished: 'bg-gray-100 text-gray-500 border-gray-200',
}

const questionSchema = z.object({
  text: z.string().min(5, 'Mínimo 5 caracteres'),
  order: z.number(),
})

const assemblySchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, 'Selecciona una fecha'),
  questions: z.array(questionSchema).min(1, 'Agrega al menos una pregunta'),
})

type FormValues = z.infer<typeof assemblySchema>

function getColumns(navigate: (to: string) => void): ColumnDef<AssemblyItem>[] {
  return [
    {
      header: 'Asamblea',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Fecha programada',
      cell: (row) => <span className="text-sm">{row.scheduledDate}</span>,
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge className={STATUS_CLASSES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      header: 'Preguntas',
      cell: (row) => <span className="text-sm">{row.questions.length}</span>,
    },
    {
      header: 'Creada',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Acciones',
      className: 'w-[140px]',
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => navigate(`/app/assemblies/${row.id}`)}>
          Abrir
          <ArrowRight className="h-4 w-4" />
        </Button>
      ),
    },
  ]
}

export function AssembliesPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data: assemblies = [], isLoading } = useAssemblies()
  const createAssembly = useCreateAssembly()
  const columns = getColumns(navigate)

  const form = useForm<FormValues>({
    resolver: zodResolver(assemblySchema),
    defaultValues: {
      title: '',
      description: '',
      scheduledDate: '',
      questions: [{ text: '', order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const questions = values.questions.map((q, i) => ({ ...q, order: i }))
      await createAssembly.mutateAsync({ ...values, questions })
      toast.success('Asamblea creada')
      setOpen(false)
      form.reset()
    } catch {
      toast.error('Error al crear la asamblea')
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Administración"
        title="Asambleas"
        description="Convocatorias y votaciones del conjunto. Abre una asamblea para iniciarla, abrir preguntas o finalizarla."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva asamblea
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear asamblea</DialogTitle>
                <DialogDescription>
                  Programa una asamblea y agrega las preguntas de votación (sí / no / blanco).
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <Field label="Título" error={form.formState.errors.title?.message}>
                  <Input placeholder="Ej. Asamblea ordinaria marzo 2026" {...form.register('title')} />
                </Field>

                <Field label="Descripción (opcional)" error={form.formState.errors.description?.message}>
                  <Textarea
                    placeholder="Orden del día, lugar, hora..."
                    rows={3}
                    {...form.register('description')}
                  />
                </Field>

                <Field label="Fecha programada" error={form.formState.errors.scheduledDate?.message}>
                  <Input type="date" {...form.register('scheduledDate')} />
                </Field>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Preguntas de votación</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ text: '', order: fields.length })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Field
                          label={`Pregunta ${index + 1}`}
                          error={form.formState.errors.questions?.[index]?.text?.message}
                        >
                          <Input
                            placeholder="Ej. ¿Aprueba el presupuesto anual?"
                            {...form.register(`questions.${index}.text`)}
                          />
                        </Field>
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 shrink-0 text-muted-foreground"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createAssembly.isPending}>
                    {createAssembly.isPending ? 'Creando...' : 'Crear asamblea'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        columns={columns}
        data={assemblies}
        isLoading={isLoading}
        getSearchText={(row) => `${row.title} ${row.scheduledDate}`}
      />
    </div>
  )
}
