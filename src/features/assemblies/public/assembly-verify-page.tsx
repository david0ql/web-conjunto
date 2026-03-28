import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'

const VOTE_LABELS: Record<string, string> = {
  yes: '✅ Sí',
  no: '❌ No',
  blank: '⬜ Blanco',
}

export function AssemblyVerifyPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<
    { questionText: string; vote: string; isValid: boolean; rejectedReason: string | null }[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!token.trim() || !publicId) return
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const normalized = token.replace(/-/g, '').trim()
      const data = await api.verifyAssemblyToken(publicId, normalized)
      setResults(data)
    } catch {
      setError('Token no encontrado. Verifica que lo hayas ingresado correctamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Verificar mi voto</h1>
          <p className="text-gray-500 text-sm mt-1">
            Ingresa tu código de verificación para comprobar que tu voto fue registrado.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium mb-1">
              Código de verificación
            </label>
            <input
              id="token"
              type="text"
              placeholder="XXX-XXX-XXX"
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              className="w-full border rounded-md px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-black"
              maxLength={11}
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !token.trim()}
            className="w-full bg-black text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
                <p className="text-sm font-medium">{r.questionText}</p>
                <p className="text-lg font-bold">{VOTE_LABELS[r.vote] ?? r.vote}</p>
                {!r.isValid && (
                  <p className="text-xs text-red-500">
                    Voto no válido:{' '}
                    {r.rejectedReason === 'voted_after_question_closed'
                      ? 'Votaste después de que la pregunta fue cerrada.'
                      : r.rejectedReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
