import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
}

export function KpiCard({ label, value, detail, icon }: KpiCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="break-words text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
          <p className="text-[13px] leading-5 text-muted-foreground">{detail}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
