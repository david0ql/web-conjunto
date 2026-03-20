import { STORAGE_KEY } from '@/lib/constants'
import type { SessionUser } from '@/types/api'

export interface StoredSession {
  accessToken: string
  user: SessionUser
}

let currentSession: StoredSession | null = readSession()

function readSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function getSession() {
  return currentSession
}

export function setSession(session: StoredSession | null) {
  currentSession = session

  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function getToken() {
  return currentSession?.accessToken ?? null
}
