import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowRight, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog'
import { StatusBadge, type StatusVariant } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { UPLOADS_URL } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { ChangeHistoryEntityType, ChangeLogEntry, ChangeLogField } from '@/types/api'

const ACTIONS: Record<ChangeLogEntry['action'], { label: string; variant: StatusVariant }> = {
  created: { label: 'Creado', variant: 'green' },
  updated: { label: 'Editado', variant: 'blue' },
  deleted: { label: 'Eliminado', variant: 'red' },
}

function actorLabel(entry: ChangeLogEntry) {
  if (entry.actorType === 'system') return 'Sistema'
  const name = entry.actorName ?? 'Usuario eliminado'
  return entry.actorType === 'resident' ? `${name} (residente, app)` : name
}

function ChangeValue({ field, value }: { field: ChangeLogField; value: string | null }) {
  if (value === null) return <span className="italic text-slate-400">vacío</span>
  if (field.kind === 'photo') {
    const src = `${UPLOADS_URL}/${value.replace(/^\/+/, '')}`
    return (
      <ImagePreviewDialog src={src} alt={field.label} title={field.label} className="size-10 rounded-md border border-slate-200">
        <img src={src} alt={field.label} className="h-full w-full object-cover" />
      </ImagePreviewDialog>
    )
  }
  return <span className="font-medium text-slate-800">{field.kind === 'date' ? formatDate(value) : value}</span>
}

function ChangeList({ entry }: { entry: ChangeLogEntry }) {
  const isCreate = entry.action === 'created'
  const isDelete = entry.action === 'deleted'
  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        {entry.changes.map((change) => (
          <li key={change.field} className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-500">{change.label}:</span>
            {isCreate ? (
              <ChangeValue field={change} value={change.to} />
            ) : isDelete ? (
              <ChangeValue field={change} value={change.from} />
            ) : (
              <>
                <span className="line-through decoration-slate-300">
                  <ChangeValue field={change} value={change.from} />
                </span>
                <ArrowRight className="size-3 shrink-0 text-slate-400" />
                <ChangeValue field={change} value={change.to} />
              </>
            )}
          </li>
        ))}
      </ul>
      {entry.reason && <p className="text-xs text-slate-500">Motivo: {entry.reason}</p>}
    </div>
  )
}

/** Pestaña "Historial de cambios": todos los cambios de un tipo de registro, con búsqueda. */
export function ChangeHistoryPanel({
  entityType,
  searchPlaceholder = 'Buscar por registro, usuario o valor...',
}: {
  entityType: ChangeHistoryEntityType
  searchPlaceholder?: string
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const historyQuery = useQuery({
    queryKey: ['change-history', entityType, page, search],
    queryFn: () => api.getChangeHistory({ entityType, page, limit: 15, search: search || undefined }),
    placeholderData: keepPreviousData,
  })

  const columns: ColumnDef<ChangeLogEntry>[] = [
    {
      header: 'Fecha',
      cell: (row) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Registro',
      cell: (row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">{row.entityLabel ?? '—'}</p>
          <StatusBadge label={ACTIONS[row.action].label} variant={ACTIONS[row.action].variant} />
        </div>
      ),
    },
    { header: 'Cambios', cell: (row) => <ChangeList entry={row} /> },
    {
      header: 'Quién',
      cell: (row) => <span className="text-xs text-slate-600">{actorLabel(row)}</span>,
    },
  ]

  return (
    <DataTable
      data={historyQuery.data?.data ?? []}
      columns={columns}
      searchPlaceholder={searchPlaceholder}
      isLoading={historyQuery.isLoading}
      emptyMessage="Sin cambios registrados."
      serverSide
      totalItems={historyQuery.data?.meta.total}
      currentPage={page}
      onPageChange={setPage}
      onSearchChange={(v) => { setSearch(v); setPage(1) }}
    />
  )
}

function ChangeTimeline({ entityType, entityId }: { entityType: ChangeHistoryEntityType; entityId: string }) {
  const historyQuery = useQuery({
    queryKey: ['change-history', entityType, 'entity', entityId],
    queryFn: () => api.getChangeHistory({ entityType, entityId, limit: 100 }),
  })
  const entries = historyQuery.data?.data ?? []

  if (historyQuery.isLoading) return <p className="py-6 text-center text-sm text-slate-400">Cargando...</p>
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Sin cambios registrados todavía.</p>
  }
  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <StatusBadge label={ACTIONS[entry.action].label} variant={ACTIONS[entry.action].variant} />
            <span className="text-xs text-slate-500">
              {formatDate(entry.createdAt)} · {actorLabel(entry)}
            </span>
          </div>
          <ChangeList entry={entry} />
        </li>
      ))}
    </ol>
  )
}

/** Botón "Historial" de una fila: línea de tiempo de los cambios de ese registro. */
export function ChangeHistoryDialog({
  entityType,
  entityId,
  title,
}: {
  entityType: ChangeHistoryEntityType
  entityId: string
  title: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
          <History className="mr-1 size-3" /> Historial
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,620px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de cambios</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        {/* Solo se consulta al abrir. */}
        {open && <ChangeTimeline entityType={entityType} entityId={entityId} />}
      </DialogContent>
    </Dialog>
  )
}
