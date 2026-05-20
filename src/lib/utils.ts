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

/** Capitaliza la primera letra de cada palabra (title case) para nombres de personas. */
export function toNameCase(str: string | null | undefined): string {
  if (!str) return ''
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Formatea nombre completo de una persona en title case. */
export function formatName(name?: string | null, lastName?: string | null): string {
  return toNameCase([name, lastName].filter(Boolean).join(' '))
}

/** Normaliza placa: trim + mayúsculas. */
export function normalizePlate(value: string): string {
  return value.trim().toUpperCase()
}
