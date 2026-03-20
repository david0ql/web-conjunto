import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

interface SectionHeaderProps {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="border-b border-border bg-white px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge>{eyebrow}</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 lg:text-[2rem]">{title}</h1>
            <p className="max-w-3xl text-[13px] leading-5 text-muted-foreground lg:text-sm">{description}</p>
          </div>
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
