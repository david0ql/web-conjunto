import type { ResidentConflict } from '@/types/api'

export interface ResidentConflictError {
  code: 'EMAIL_IN_USE' | 'DOCUMENT_IN_USE'
  field: 'email' | 'document'
  message: string
  conflict: ResidentConflict
}

/** El 409 del API cuando el correo o la cédula ya los tiene otro residente. */
export function residentConflictOf(err: unknown): ResidentConflictError | null {
  const data = (err as { response?: { status?: number; data?: Partial<ResidentConflictError> } })?.response
  if (data?.status !== 409 || !data.data?.conflict || !data.data.code) return null
  return data.data as ResidentConflictError
}
