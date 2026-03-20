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
    <div className="border-b border-border bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Badge>{eyebrow}</Badge>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl lg:text-[2rem]">{title}</h1>
            <p className="max-w-3xl text-[13px] leading-5 text-muted-foreground lg:text-sm">{description}</p>
          </div>
        </div>
        {action ? <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">{action}</div> : null}
      </div>
    </div>
  )
}
