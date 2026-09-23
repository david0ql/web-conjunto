/** Minúsculas sin tildes: "Cárdenas" → "cardenas". */
export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Misma regla que la búsqueda de la API: cada palabra de la consulta debe
 * aparecer en el texto, en cualquier orden y sin importar tildes, mayúsculas
 * ni espacios repetidos. "Ana Delia Cardenas" encuentra "ANA  DELIA CÁRDENAS".
 */
export function matchesSearch(text: string, query: string) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizeSearchText(text)
  return terms.every((term) => haystack.includes(term))
}
