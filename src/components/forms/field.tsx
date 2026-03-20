import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      {children}
      {error ? (
        <p className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
