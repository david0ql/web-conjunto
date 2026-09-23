/** Mensaje de error que devuelve la API (string o primer elemento de la lista), o el texto por defecto. */
export function getApiErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0]
  return fallback
}
