import { useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Play,
  Square,
  CheckSquare,
  ChevronRight,
  ExternalLink,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth-context'
import {
  useAssembly,
  useStartAssembly,
  useFinishAssembly,
  useOpenQuestion,
  useCloseQuestion,
} from './hooks/use-assemblies'
import { useAssemblySocket } from './hooks/use-assembly-socket'
import { AssemblyLivePanel } from './assembly-live-panel'
import type { AssemblyQuestion } from './types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  finished: 'Finalizada',
  pending: 'Pendiente',
  closed: 'Cerrada',
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  finished: 'bg-gray-100 text-gray-500 border-gray-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
}

export function AssemblyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const qc = useQueryClient()
  const { data: assembly, isLoading } = useAssembly(id!)

  const handleReconnect = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['assemblies', id] })
  }, [qc, id])

  const wsState = useAssemblySocket(
    assembly?.status === 'active' ? id : undefined,
    assembly?.status === 'active' ? token : null,
    handleReconnect,
  )

  const startAssembly = useStartAssembly()
  const finishAssembly = useFinishAssembly()
  const openQuestion = useOpenQuestion()
  const closeQuestion = useCloseQuestion()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!assembly) return null

  const today = new Date().toISOString().slice(0, 10)
  const canStart = assembly.scheduledDate <= today && assembly.status === 'draft'
  const webBase =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:5173'
  const publicUrl = `${webBase}/public/assembly/${assembly.publicId}`

  const activeQuestion =
    wsState.currentQuestion ?? assembly.questions.find((q) => q.status === 'active') ?? null

  const handleStart = async () => {
    try {
      await startAssembly.mutateAsync(assembly.id)
      toast.success('Asamblea iniciada')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al iniciar'
      toast.error(message)
    }
  }

  const handleFinish = async () => {
    try {
      await finishAssembly.mutateAsync(assembly.id)
      toast.success('Asamblea finalizada')
    } catch {
      toast.error('Error al finalizar')
    }
  }

  const handleOpen = async (q: AssemblyQuestion) => {
    try {
      await openQuestion.mutateAsync({ assemblyId: assembly.id, questionId: q.id })
      toast.success('Pregunta abierta')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error'
      toast.error(message)
    }
  }

  const handleClose = async (q: AssemblyQuestion) => {
    try {
      await closeQuestion.mutateAsync({ assemblyId: assembly.id, questionId: q.id })
      toast.success('Pregunta cerrada')
    } catch {
      toast.error('Error al cerrar')
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Asamblea"
        title={assembly.title}
        description={assembly.description ?? 'Sin descripción'}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/assemblies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>

            {assembly.status === 'draft' && (
              <Button
                size="sm"
                disabled={!canStart || startAssembly.isPending}
                onClick={handleStart}
                title={
                  !canStart
                    ? `La asamblea está programada para ${assembly.scheduledDate}. Reprogramar para iniciarla hoy.`
                    : undefined
                }
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar asamblea
              </Button>
            )}

            {assembly.status === 'active' && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    URL pública
                  </a>
                </Button>
                <Button variant="destructive" size="sm" onClick={handleFinish} disabled={finishAssembly.isPending}>
                  <Square className="mr-2 h-4 w-4" />
                  Finalizar
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={STATUS_CLASSES[assembly.status]}>
          {STATUS_LABELS[assembly.status]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Fecha programada: <strong>{assembly.scheduledDate}</strong>
        </span>
        {assembly.status === 'active' && (
          <span
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${
              wsState.connected
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}
          >
            {wsState.connected ? (
              <><Wifi className="h-3 w-3" /> En vivo</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Reconectando...</>
            )}
          </span>
        )}
        {!canStart && assembly.status === 'draft' && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            La fecha es futura — reprograma para iniciar hoy
          </span>
        )}
      </div>

      {assembly.status === 'active' && (
        <AssemblyLivePanel
          question={activeQuestion}
          stats={wsState.stats}
        />
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Preguntas
        </h2>

        {assembly.questions
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((q, idx) => (
            <div
              key={q.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-xs font-semibold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{q.text}</p>
                  {q.status !== 'pending' && (
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>✅ {q.stats.yesCount}</span>
                      <span>❌ {q.stats.noCount}</span>
                      <span>⬜ {q.stats.blankCount}</span>
                      <span>Pendientes: {q.stats.totalPending}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge className={STATUS_CLASSES[q.status]}>
                  {STATUS_LABELS[q.status]}
                </Badge>

                {assembly.status === 'active' && q.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpen(q)}
                    disabled={openQuestion.isPending}
                  >
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Abrir
                  </Button>
                )}

                {assembly.status === 'active' && q.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClose(q)}
                    disabled={closeQuestion.isPending}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Cerrar
                  </Button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
