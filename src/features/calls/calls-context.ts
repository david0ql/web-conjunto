import { createContext } from 'react'
import type { Apartment } from '@/types/api'
import type { CallSessionPayload } from '@/features/calls/types'

export interface RealtimeCallState {
  session: CallSessionPayload | null
  phase: 'requesting-media' | 'ringing' | 'connecting' | 'active' | 'ending' | 'error'
  apartment: Apartment | null
  muted: boolean
  error: string | null
  rejectedCount: number
}

export interface CallsContextValue {
  connection: 'disconnected' | 'connecting' | 'connected'
  call: RealtimeCallState | null
  minimized: boolean
  setMinimized: (value: boolean) => void
  startApartmentCall: (apartment: Apartment) => Promise<void>
  endCall: (reason?: string) => void
  toggleMute: () => void
}

export const CallsContext = createContext<CallsContextValue | null>(null)
