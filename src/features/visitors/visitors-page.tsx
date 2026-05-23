import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Car, Check, ImageIcon, Pencil, User } from 'lucide-react'
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

type PhotoMode = 'select' | 'camera' | 'preview'

function UpdatePhotoDialog({ visitor }: { visitor: Visitor }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<PhotoMode>('select')
  const [preview, setPreview] = useState<string | null>(resolvePhoto(visitor.photoPath))
  const [file, setFile] = useState<File | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (mode === 'camera') {
      setCameraError(null)
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((stream) => {
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
          }
        })
        .catch(() => {
          setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
          setMode('select')
        })
    } else {
      stopStream()
    }
    return () => { stopStream() }
  }, [mode])

  const mutation = useMutation({
    mutationFn: () => api.uploadVisitorPhoto(visitor.id, file!),
    onSuccess: () => {
      toast.success('Foto actualizada')
      void queryClient.invalidateQueries({ queryKey: ['visitors'] })
      handleClose()
    },
    onError: () => toast.error('No fue posible actualizar la foto'),
  })

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setMode('preview')
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const f = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })
      handleFile(f)
    }, 'image/jpeg', 0.92)
  }

  const openGallery = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => { const f = input.files?.[0]; if (f) handleFile(f) }
    input.click()
  }

  const handleClose = () => {
    stopStream()
    setMode('select')
    setFile(null)
    setPreview(resolvePhoto(visitor.photoPath))
    setCameraError(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
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

        {/* Camera live view */}
        {mode === 'camera' && (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                onClick={capturePhoto}
              >
                <Camera className="size-4" />
                Tomar foto
              </Button>
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setMode('select')}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Preview after capture/selection */}
        {mode === 'preview' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-40 w-40 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50">
              {preview && <img src={preview} alt="preview" className="h-full w-full object-cover" />}
            </div>
            <div className="flex w-full flex-col gap-2">
              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Guardando…' : 'Guardar foto'}
              </Button>
              <Button
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => { setFile(null); setPreview(resolvePhoto(visitor.photoPath)); setMode('select') }}
                disabled={mutation.isPending}
              >
                Cambiar
              </Button>
            </div>
          </div>
        )}

        {/* Source selection */}
        {mode === 'select' && (
          <div className="flex flex-col gap-3">
            {/* Current photo preview */}
            <div className="flex justify-center">
              <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50">
                {preview ? (
                  <img src={preview} alt="foto actual" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <User className="size-12" />
                  </div>
                )}
              </div>
            </div>
            {cameraError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">{cameraError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-slate-300 text-slate-800 hover:bg-slate-900 hover:text-white"
                onClick={openGallery}
              >
                <ImageIcon className="size-4" />
                Galería
              </Button>
              <Button
                className="flex-1 gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setMode('camera')}
              >
                <Camera className="size-4" />
                Cámara
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Plates dialog ───────────────────────────────────────────────────────────

function PlatesDialog({ visitor }: { visitor: Visitor }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const platesQuery = useQuery({
    queryKey: ['visitor-plates', visitor.id],
    queryFn: () => api.getVisitorPlates(visitor.id),
    enabled: open,
  })

  const updateMutation = useMutation({
    mutationFn: ({ accessId, vehiclePlate }: { accessId: string; vehiclePlate: string }) =>
      api.updateAccessPlate(accessId, vehiclePlate),
    onSuccess: () => {
      toast.success('Placa actualizada')
      setEditingId(null)
      void queryClient.invalidateQueries({ queryKey: ['visitor-plates', visitor.id] })
      void queryClient.invalidateQueries({ queryKey: ['access-audit'] })
    },
    onError: () => toast.error('No fue posible actualizar la placa'),
  })

  const plates = platesQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ver placas">
          <Car className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,480px)]">
        <DialogHeader>
          <DialogTitle>Placas del visitante</DialogTitle>
          <DialogDescription>{formatName(visitor.name, visitor.lastName)}</DialogDescription>
        </DialogHeader>

        {platesQuery.isLoading ? (
          <p className="py-4 text-center text-sm text-slate-400">Cargando placas...</p>
        ) : plates.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Sin placas registradas para este visitante.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
            {plates.map((entry) => (
              <div key={entry.lastAccessId} className="flex items-center gap-3 px-3 py-2.5">
                {editingId === entry.lastAccessId ? (
                  <>
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value.toUpperCase())}
                      className="flex-1 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Ej. ABC 123"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateMutation.mutate({ accessId: entry.lastAccessId, vehiclePlate: editingValue })
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ accessId: entry.lastAccessId, vehiclePlate: editingValue })}
                      className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                      title="Guardar"
                    >
                      <Check className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 font-mono text-sm font-bold text-slate-800">{entry.vehiclePlate}</p>
                    <p className="text-xs text-slate-400">{entry.times}x</p>
                    <button
                      type="button"
                      onClick={() => { setEditingId(entry.lastAccessId); setEditingValue(entry.vehiclePlate) }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Editar placa"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
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
          <PlatesDialog visitor={row} />
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
