import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-muted-foreground focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-950/8',
        className,
      )}
      {...props}
    />
  )
}
