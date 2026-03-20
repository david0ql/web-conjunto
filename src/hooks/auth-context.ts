import { createContext } from 'react'
import type { AuthResponse, SessionUser } from '@/types/api'

export interface AuthContextValue {
  user: SessionUser | null
  token: string | null
  loading: boolean
  login: (response: AuthResponse) => void
  refresh: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
