import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ImageIcon, Pencil, User } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { UPLOADS_URL } from '@/lib/constants'
import { formatDate, formatDocument, formatName } from '@/lib/utils'
import { toast } from 'sonner'
import type { Visitor } from '@/types/api'

function resolvePhoto(path?: string | null): string | null {
  if (!path) return null
  return `${UPLOADS_URL}/${path.replace(/^\/+/, '')}`
}

// ─── Edit dialog ─────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, 'Requerido').max(50),
  lastName: z.string().min(1, 'Requerido').max(50),
  document: z.string().max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})
type EditValues = z.infer<typeof editSchema>

function EditVisitorDialog({ visitor }: { visitor: Visitor }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: visitor.name,
      lastName: visitor.lastName,
      document: visitor.document ?? '',
      phone: visitor.phone ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditValues) =>
      api.updateVisitor(visitor.id, {
        name: data.name.trim(),
        lastName: data.lastName.trim(),
        document: data.document?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Visitante actualizado')
      void queryClient.invalidateQueries({ queryKey: ['visitors'] })
      setOpen(false)
    },
    onError: () => toast.error('No fue posible actualizar el visitante'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar visitante</DialogTitle>
          <DialogDescription>{formatName(visitor.name, visitor.lastName)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} placeholder="Ana" />
            </Field>
            <Field label="Apellido" error={form.formState.errors.lastName?.message}>
              <Input {...form.register('lastName')} placeholder="García" />
            </Field>
          </div>
          <Field label="Documento" error={form.formState.errors.document?.message}>
            <Input {...form.register('document')} placeholder="10203040" />
          </Field>
          <Field label="Teléfono" error={form.formState.errors.phone?.message}>
            <Input {...form.register('phone')} placeholder="3001234567" />
          </Field>
          <Button type="submit" disabled={mutation.isPending} className="self-end">
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Photo dialog ─────────────────────────────────────────────────────────────

function UpdatePhotoDialog({ visitor }: { visitor: Visitor }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(resolvePhoto(visitor.photoPath))
  const [file, setFile] = useState<File | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () => api.uploadVisitorPhoto(visitor.id, file!),
    onSuccess: () => {
      toast.success('Foto actualizada')
      void queryClient.invalidateQueries({ queryKey: ['visitors'] })
      setOpen(false)
      setFile(null)
    },
    onError: () => toast.error('No fue posible actualizar la foto'),
  })

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const reset = () => {
    setFile(null)
    setPreview(resolvePhoto(visitor.photoPath))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Camera className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Foto del visitante</DialogTitle>
          <DialogDescription>{formatName(visitor.name, visitor.lastName)}</DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center py-2">
          <div className="h-36 w-36 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50">
            {preview ? (
              <img src={preview} alt="foto" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                <User className="size-12" />
              </div>
            )}
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {/* Source selection or save */}
        {file ? (
          <div className="flex flex-col gap-2">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Subiendo…' : 'Guardar foto'}
            </Button>
            <Button variant="outline" onClick={reset} disabled={mutation.isPending}>
              Cambiar
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => galleryRef.current?.click()}>
              <ImageIcon className="size-4" />
              Galería
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-4" />
              Cámara
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function VisitorsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const visitorsQuery = useQuery({
    queryKey: ['visitors', page, search],
    queryFn: () => api.getVisitors({ page, limit: 15, search: search || undefined }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnDef<Visitor>[] = [
    {
      header: 'Foto',
      cell: (row) => {
        const src = resolvePhoto(row.photoPath)
        return src ? (
          <img src={src} alt="foto" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <User className="size-5 text-slate-400" />
          </div>
        )
      },
    },
    {
      header: 'Visitante',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{formatName(row.name, row.lastName)}</p>
          {row.document && <p className="text-xs text-slate-400 mt-0.5">CC {formatDocument(row.document)}</p>}
        </div>
      ),
    },
    {
      header: 'Teléfono',
      cell: (row) => <span className="text-sm text-slate-600">{row.phone ?? '—'}</span>,
    },
    {
      header: 'Registrado',
      cell: (row) => <span className="whitespace-nowrap text-xs text-slate-400">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <EditVisitorDialog visitor={row} />
          <UpdatePhotoDialog visitor={row} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <SectionHeader
        eyebrow="Portería"
        title="Visitantes"
        description="Directorio de visitantes registrados en el conjunto."
      />
      <DataTable
        data={visitorsQuery.data?.data ?? []}
        columns={columns}
        searchPlaceholder="Buscar nombre, documento o teléfono..."
        isLoading={visitorsQuery.isLoading}
        emptyMessage="Sin visitantes registrados."
        serverSide
        totalItems={visitorsQuery.data?.meta.total}
        currentPage={page}
        onPageChange={setPage}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
      />
    </div>
  )
}
