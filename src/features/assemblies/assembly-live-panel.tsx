import type { AssemblyQuestion, VoteStatsPayload } from './types'

interface Props {
  question: AssemblyQuestion | null
  stats: VoteStatsPayload | null
}

function StatBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function AssemblyLivePanel({ question, stats }: Props) {
  if (!question) {
    return (
      <div className="rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        Ninguna pregunta activa en este momento.
      </div>
    )
  }

  const totalParticipants = stats ? stats.totalVoted + stats.totalPending : 0

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
          Pregunta activa
        </p>
        <p className="text-base font-semibold">{question.text}</p>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-muted p-3">
              <p className="text-2xl font-bold text-green-600">{stats.yesCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sí</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-2xl font-bold text-red-500">{stats.noCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">No</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-2xl font-bold text-yellow-500">{stats.blankCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Blanco</p>
            </div>
          </div>

          <div className="space-y-2">
            <StatBar label="Sí" count={stats.yesCount} total={totalParticipants} color="bg-green-500" />
            <StatBar label="No" count={stats.noCount} total={totalParticipants} color="bg-red-500" />
            <StatBar label="Blanco" count={stats.blankCount} total={totalParticipants} color="bg-yellow-400" />
          </div>

          <div className="flex items-center justify-between text-sm pt-1 border-t">
            <span className="text-muted-foreground">
              Votaron: <strong>{stats.totalVoted}</strong>
            </span>
            <span className="text-muted-foreground">
              Pendientes: <strong>{stats.totalPending}</strong>
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Esperando votos...</p>
      )}
    </div>
  )
}
