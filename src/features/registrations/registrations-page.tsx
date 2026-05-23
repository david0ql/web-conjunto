import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, ExternalLink, Loader2, User, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { UPLOADS_URL } from '@/lib/constants'
import type { RegistrationRequest } from '@/types/api'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
}

function PhotoPreview({ path }: { path?: string | null }) {
  if (!path) return <span className="text-xs text-muted-foreground italic">Sin foto</span>
  const src = `${UPLOADS_URL}/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 underline">
      <ExternalLink className="size-3" /> Ver foto
    </a>
  )
}

function RequestDetail({ request, onClose }: { request: RegistrationRequest; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [approvedPasswords, setApprovedPasswords] = useState<Array<{ name: string; document: string; password: string }> | null>(null)

  const approveMut = useMutation({
    mutationFn: () => api.approveRegistrationRequest(request.id),
    onSuccess: (data) => {
      setApprovedPasswords(data.residents)
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] })
      toast.success('Solicitud aprobada')
    },
    onError: () => toast.error('Error al aprobar'),
  })

  const rejectMut = useMutation({
    mutationFn: () => api.rejectRegistrationRequest(request.id, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] })
      toast.success('Solicitud rechazada')
      onClose()
    },
    onError: () => toast.error('Error al rechazar'),
  })

  const tower = request.tower as any
  const apartment = request.apartment as any
  const location = [tower?.code, tower?.name, apartment?.number].filter(Boolean).join(' · ')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Badge className={STATUS_CLASSES[request.status]}>{STATUS_LABELS[request.status]}</Badge>
        <span className="text-sm text-muted-foreground">{location}</span>
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(request.submittedAt)}</span>
      </div>

      {request.submittedLat && request.submittedLng && (
        <p className="text-xs text-muted-foreground">
          Coordenadas: {request.submittedLat.toFixed(6)}, {request.submittedLng.toFixed(6)}
        </p>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recibo de administración</p>
        <PhotoPreview path={request.receiptPhotoPath} />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Personas ({request.persons.length})
        </p>
        <div className="space-y-3">
          {request.persons.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-slate-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{p.name} {p.lastName}</span>
                </div>
                <Badge className={p.isOwner ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
                  {p.isOwner ? 'Propietario' : 'Arrendatario'}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Cédula: {p.document}</span>
                {p.birthDate && <span>Nacimiento: {p.birthDate}</span>}
                {p.phone && <span>Tel: {p.phone}</span>}
                {p.email && <span>Email: {p.email}</span>}
              </div>
              {p.photoPath && (
                <div className="mt-1.5">
                  <PhotoPreview path={p.photoPath} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {request.vehicles.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vehículos ({request.vehicles.length})
          </p>
          <div className="space-y-2">
            {request.vehicles.map((v) => (
              <div key={v.id} className="rounded-lg border border-border bg-slate-50 p-3 text-sm">
                <span className="font-medium">{v.plate}</span>
                <span className="ml-2 text-muted-foreground">{v.brandName} {v.model} · {v.color} · {v.vehicleType}</span>
                {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedPasswords && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-2 text-sm font-semibold text-emerald-800">Contraseñas generadas</p>
          <p className="mb-3 text-xs text-emerald-700">Entrega estas contraseñas a los residentes. No se mostrarán de nuevo.</p>
          <div className="space-y-1.5">
            {approvedPasswords.map((r) => (
              <div key={r.document} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                <span className="text-muted-foreground">{r.name} ({r.document})</span>
                <span className="font-mono font-semibold tracking-wider text-emerald-700">{r.password}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {request.status === 'rejected' && request.rejectionReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-medium">Motivo de rechazo</p>
          <p className="mt-1 text-xs">{request.rejectionReason}</p>
        </div>
      )}

      {request.status === 'pending' && !approvedPasswords && (
        <div className="flex flex-col gap-2">
          {showReject ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Motivo del rechazo..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowReject(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={!rejectReason.trim() || rejectMut.isPending}
                  onClick={() => rejectMut.mutate()}
                >
                  {rejectMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                  Confirmar rechazo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => setShowReject(true)}
              >
                <XCircle className="size-4" />
                Rechazar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={approveMut.isPending}
                onClick={() => approveMut.mutate()}
              >
                {approveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                Aprobar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RegistrationsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['registration-requests', statusFilter],
    queryFn: () => api.getRegistrationRequests(statusFilter ? { status: statusFilter } : undefined),
  })

  const { data: detail } = useQuery({
    queryKey: ['registration-request', selectedId],
    queryFn: () => api.getRegistrationRequest(selectedId!),
    enabled: !!selectedId,
  })

  const columns: ColumnDef<RegistrationRequest>[] = [
    {
      header: 'Apartamento',
      cell: (row) => {
        const tower = row.tower as any
        const apt = row.apartment as any
        return (
          <div>
            <p className="font-medium">{apt?.number ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{tower?.code} {tower?.name}</p>
          </div>
        )
      },
    },
    {
      header: 'Personas',
      cell: (row) => <span className="text-sm">{row.persons.length}</span>,
    },
    {
      header: 'Vehículos',
      cell: (row) => <span className="text-sm">{row.vehicles.length}</span>,
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge className={STATUS_CLASSES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      header: 'Enviada',
      cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.submittedAt)}</span>,
    },
    {
      header: '',
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>
          Ver detalle
        </Button>
      ),
    },
  ]

  const STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'rejected', label: 'Rechazados' },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <SectionHeader
        eyebrow="Administración"
        title="Solicitudes de Registro"
        description="Revisión de solicitudes enviadas por futuros residentes"
      />

      <div className="flex gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              statusFilter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={requests} isLoading={isLoading} />

      <Dialog open={!!selectedId} onOpenChange={(o) => { if (!o) setSelectedId(null) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de solicitud</DialogTitle>
          </DialogHeader>
          {detail ? (
            <RequestDetail request={detail} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
