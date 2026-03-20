import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download } from 'lucide-react'
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
        description="Configura el rango del reporte y exporta el consolidado oficial de ingresos a piscina."
      />

      <div className="p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)]">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <Badge className="w-fit">Exportación</Badge>
              <CardTitle>Generar reporte PDF</CardTitle>
              <CardDescription>
                Define el rango y descarga el reporte formal con encabezado, resumen y tabla detallada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-1 px-1 py-1">
                <p className="text-sm font-medium text-slate-950">Salida del reporte</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  El archivo incluye residentes, apartamento, fecha y hora, invitados y observaciones registradas en el período.
                </p>
              </div>

              <Button type="button" className="w-full" onClick={() => pdfMutation.mutate()}>
                <Download className="size-4" />
                Descargar PDF
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle>Incluye</CardTitle>
                <CardDescription>Resumen rápido del contenido exportado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                <ReportLine label="Encabezado" value="Marca del conjunto y fecha de emisión" />
                <ReportLine label="Rango" value="Desde y hasta claramente visibles" />
                <ReportLine label="Resumen" value="Entradas, invitados y residentes únicos" />
                <ReportLine label="Tabla" value="Residentes, apartamento, fecha, invitados y notas" />
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
    <div className="space-y-1 border-l border-slate-200 pl-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="text-sm leading-5 text-slate-900">{value}</p>
    </div>
  )
}
