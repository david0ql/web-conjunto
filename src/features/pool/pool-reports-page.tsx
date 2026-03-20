import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CalendarRange, Download, FileText } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export function PoolReportsPage() {
  const [selectedRange, setSelectedRange] = useState(() => {
    const today = new Date()
    const prior = new Date(today)
    prior.setDate(today.getDate() - 7)

    return {
      dateFrom: prior.toISOString().slice(0, 10),
      dateTo: today.toISOString().slice(0, 10),
    }
  })

  const pdfMutation = useMutation({
    mutationFn: () => api.downloadPoolReportPdf(selectedRange.dateFrom, selectedRange.dateTo),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pool-report-${selectedRange.dateFrom}-${selectedRange.dateTo}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: () => toast.error('No fue posible generar el PDF'),
  })

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Piscina"
        title="Reportes"
        description="Configura el rango del reporte y exporta un PDF formal con encabezado, resumen del período y tabla detallada de ingresos."
      />

      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.9fr)]">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge className="w-fit">Exportación</Badge>
                  <CardTitle className="mt-2">Generar reporte PDF</CardTitle>
                  <CardDescription>
                    Descarga un reporte ordenado con encabezado, rango de fechas, resumen numérico y tabla de ingresos.
                  </CardDescription>
                </div>
                <div className="flex size-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                  <CalendarRange className="size-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Desde">
                  <Input
                    type="date"
                    value={selectedRange.dateFrom}
                    onChange={(event) =>
                      setSelectedRange((current) => ({ ...current, dateFrom: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Hasta">
                  <Input
                    type="date"
                    value={selectedRange.dateTo}
                    onChange={(event) =>
                      setSelectedRange((current) => ({ ...current, dateTo: event.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-950">Qué se exporta</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  El reporte sale con encabezado formal, rango visible, resumen del período y tabla detallada de ingresos por residente.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950 px-4 py-4 text-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Descarga oficial</p>
                  <p className="mt-1 text-sm text-white/80">Archivo PDF listo para compartir o imprimir.</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => pdfMutation.mutate()}>
                  <Download className="size-4" />
                  Descargar PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Qué contiene el reporte</CardTitle>
                <CardDescription>El archivo queda maquetado para impresión o envío administrativo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <ReportLine label="Encabezado" value="Marca del conjunto y fecha de emisión" />
                <ReportLine label="Rango" value="Desde y hasta claramente visibles" />
                <ReportLine label="Resumen" value="Entradas, invitados y residentes únicos" />
                <ReportLine label="Tabla" value="Residente, apartamento, fecha, invitados y notas" />
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Diseño del documento</CardTitle>
                <CardDescription>Se rehízo para que no salga como texto corrido sino como reporte formal.</CardDescription>
              </CardHeader>
              <CardContent className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-950">
                    <FileText className="size-4" />
                    <span className="text-sm font-medium">PDF monocromático, ordenado y legible</span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    El reporte usa bloques de resumen y una tabla con columnas fijas para que administración pueda leerlo sin perder contexto ni formato.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  )
}
