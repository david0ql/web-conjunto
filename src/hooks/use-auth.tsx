import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api } from '@/lib/api'
import { getSession, setSession, type StoredSession } from '@/lib/auth-store'
import { AuthContext, type AuthContextValue } from '@/hooks/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSession = getSession()
  const [session, setSessionState] = useState<StoredSession | null>(initialSession)
  const [loading, setLoading] = useState(Boolean(initialSession?.accessToken))

  const syncSession = (nextSession: StoredSession | null) => {
    setSession(nextSession)
    setSessionState(nextSession)
  }

  useEffect(() => {
    let cancelled = false

    if (!session?.accessToken) {
      return
    }

    void api
      .getSession()
      .then((user) => {
        if (!cancelled) {
          syncSession({ accessToken: session.accessToken, user })
        }
      })
      .catch(() => {
        if (!cancelled) {
          syncSession(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [session?.accessToken])

  const value: AuthContextValue = {
    user: session?.user ?? null,
    token: session?.accessToken ?? null,
    loading,
    login: (response) => syncSession(response),
    refresh: async () => {
      if (!session?.accessToken) return
      const user = await api.getSession()
      syncSession({ accessToken: session.accessToken, user })
    },
    logout: () => syncSession(null),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
