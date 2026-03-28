import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'react-qr-code'
import { api } from '@/lib/api'
import type { AssemblyQuestion } from '../types'

function QuestionStats({ q }: { q: AssemblyQuestion }) {
  const total = q.stats.totalVoted + q.stats.totalPending
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-sm">{q.text}</p>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${
            q.status === 'active'
              ? 'bg-green-50 text-green-700 border-green-200'
              : q.status === 'closed'
                ? 'bg-gray-100 text-gray-500 border-gray-200'
                : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}
        >
          {q.status === 'active' ? 'Votando' : q.status === 'closed' ? 'Cerrada' : 'Pendiente'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-2xl font-bold text-green-600">{q.stats.yesCount}</p>
          <p className="text-xs text-green-700">Sí</p>
          <p className="text-xs text-green-500">{pct(q.stats.yesCount)}%</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-2xl font-bold text-red-500">{q.stats.noCount}</p>
          <p className="text-xs text-red-600">No</p>
          <p className="text-xs text-red-400">{pct(q.stats.noCount)}%</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3">
          <p className="text-2xl font-bold text-yellow-600">{q.stats.blankCount}</p>
          <p className="text-xs text-yellow-700">Blanco</p>
          <p className="text-xs text-yellow-500">{pct(q.stats.blankCount)}%</p>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 border-t pt-3">
        <span>Votaron: <strong>{q.stats.totalVoted}</strong></span>
        <span>Pendientes: <strong>{q.stats.totalPending}</strong></span>
      </div>
    </div>
  )
}

export function AssemblyPublicStatsPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const webBase =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:5173'

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['public-assembly', publicId],
    queryFn: () => api.getPublicAssemblyStats(publicId!),
    refetchInterval: 5000,
    enabled: !!publicId,
  })

  const verifyUrl = `${webBase}/public/assembly/${publicId}/verify`

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Cargando estadísticas...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">No se encontró la asamblea.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{data.title}</h1>
          {data.description && <p className="text-gray-500 text-sm">{data.description}</p>}
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span
              className={`text-xs px-3 py-1 rounded-full border font-medium ${
                data.status === 'active'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : data.status === 'finished'
                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                    : 'bg-amber-100 text-amber-700 border-amber-300'
              }`}
            >
              {data.status === 'active' ? 'En curso' : data.status === 'finished' ? 'Finalizada' : 'Por iniciar'}
            </span>
            <span className="text-xs text-gray-400">Fecha: {data.scheduledDate}</span>
            {data.status === 'active' && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${isFetching ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-400 border-gray-200'}`}>
                {isFetching ? '● actualizando' : '○ en espera'}
              </span>
            )}
          </div>
        </div>

        {data.questions.length === 0 && (
          <p className="text-center text-gray-400 py-12">Sin preguntas aún.</p>
        )}

        {data.questions.map((q) => (
          <QuestionStats key={q.id} q={q} />
        ))}

        <div className="rounded-xl border bg-white p-6 flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-center">Verifica tu voto</p>
          <p className="text-xs text-gray-500 text-center">
            Escanea el QR o ingresa a la URL de verificación para comprobar que tu voto fue registrado correctamente.
          </p>
          <QRCode value={verifyUrl} size={160} />
          <Link
            to={`/public/assembly/${publicId}/verify`}
            className="text-xs text-blue-600 underline"
          >
            {verifyUrl}
          </Link>
        </div>
      </div>
    </div>
  )
}
