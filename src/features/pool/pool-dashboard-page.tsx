import { useQuery } from '@tanstack/react-query'
import { FileText, Sparkles, UserRoundCheck, Waves } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export function PoolDashboardPage() {
  const today = new Date().toISOString().slice(0, 10)

  const entriesQuery = useQuery({
    queryKey: ['pool-entries'],
    queryFn: api.getPoolEntries,
  })
  const summaryQuery = useQuery({
    queryKey: ['pool-summary', today, today],
    queryFn: () => api.getPoolSummary(today, today),
  })

  const filteredEntries = (entriesQuery.data ?? []).filter((entry) => {
    const date = new Date(entry.entryTime)
    const start = new Date(`${today}T00:00:00`)
    const end = new Date(`${today}T23:59:59`)
    return date >= start && date <= end
  })

  const topResidents = getTopResidents(filteredEntries)

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Piscina"
        title="Dashboard de piscina"
        description="Resumen operativo del período activo: volumen de entradas, invitados recurrentes y ranking de residentes."
      />

      <div className="space-y-6 p-6">
        <Card className="bg-white">
          <CardHeader>
            <Badge className="w-fit">Hoy</Badge>
            <CardTitle>Resumen del día</CardTitle>
            <CardDescription>El dashboard muestra solo la operación de hoy. La exportación por rango vive dentro de Reportes.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-900">{today}</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            label="Entradas"
            value={summaryQuery.data?.entriesInRange ?? 0}
            detail="Registros dentro del rango activo."
            icon={<Waves className="size-5" />}
          />
          <KpiCard
            label="Invitados"
            value={summaryQuery.data?.guestsInRange ?? 0}
            detail="Acompañantes vinculados al reporte."
            icon={<UserRoundCheck className="size-5" />}
          />
          <KpiCard
            label="Residentes únicos"
            value={summaryQuery.data?.uniqueResidents ?? 0}
            detail="Residentes distintos presentes en el período."
            icon={<Sparkles className="size-5" />}
          />
          <KpiCard
            label="PDF"
            value={filteredEntries.length}
            detail="Registros que saldrán en el exportable."
            icon={<FileText className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Top invitados recurrentes</CardTitle>
              <CardDescription>Los nombres que más se repiten en el rango activo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(summaryQuery.data?.topGuests ?? []).slice(0, 8).map((guest) => (
                <div
                  key={guest.name}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <span className="font-medium text-slate-900">{guest.name}</span>
                  <Badge>{guest.uses}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Ranking de residentes</CardTitle>
              <CardDescription>Quiénes más han usado piscina en el período seleccionado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topResidents.map((resident, index) => (
                <div
                  key={resident.name}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 items-center justify-center rounded-sm bg-slate-950 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{resident.name}</p>
                      <p className="text-sm text-muted-foreground">{resident.count} ingresos</p>
                    </div>
                  </div>
                  <Badge>{resident.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function getTopResidents(
  entries: Array<{
    resident?: { name: string; lastName: string }
  }>,
) {
  const counter = entries.reduce<Record<string, number>>((accumulator, entry) => {
    const residentName = entry.resident ? `${entry.resident.name} ${entry.resident.lastName}` : 'Sin residente'
    accumulator[residentName] = (accumulator[residentName] ?? 0) + 1
    return accumulator
  }, {})

  return Object.entries(counter)
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5)
}
