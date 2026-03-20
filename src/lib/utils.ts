import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value?: string | Date | null) {
  if (!value) return 'Sin dato'

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: typeof value === 'string' && value.includes('T') ? 'short' : undefined,
  }).format(new Date(value))
}
