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

/** Normaliza placa colombiana: trim, mayúsculas, espacio en posición 3 para placas de 6 chars. */
export function normalizePlate(value?: string | null): string {
  if (!value) return ''
  const cleaned = value.replace(/\s+/g, '').toUpperCase().trim()
  if (cleaned.length === 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
  return cleaned
}

/** Formatea un documento con puntos de miles: 1005108571 → 1.005.108.571 */
export function formatDocument(doc?: string | null): string {
  if (!doc) return '—'
  const digits = doc.replace(/\D/g, '')
  if (!digits || digits.length <= 3) return doc
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
