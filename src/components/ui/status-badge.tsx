import { cn } from '@/lib/utils'

export type StatusVariant = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet'

const styles: Record<StatusVariant, { badge: string; dot: string }> = {
  green: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  amber: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  red: { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  blue: { badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  slate: { badge: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  violet: { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
}

interface StatusBadgeProps {
  label: string
  variant: StatusVariant
  className?: string
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  const s = styles[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
        s.badge,
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', s.dot)} />
      {label}
    </span>
  )
}
