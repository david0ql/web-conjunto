export const STORAGE_KEY = 'conjunto.session'

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000/api/v1'

export const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrador',
  porter: 'Portero',
  pool_attendant: 'Piscina',
  gardener: 'Jardineria',
  cleaning_staff: 'Aseo',
  maintenance: 'Mantenimiento',
  resident: 'Residente',
}
