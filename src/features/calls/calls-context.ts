import { createContext } from 'react'
import type { Apartment } from '@/types/api'
import type { CallPorterAvailability } from '@/types/api'
import type { CallSessionPayload } from '@/features/calls/types'

export interface RealtimeCallState {
  session: CallSessionPayload | null
  phase: 'requesting-media' | 'ringing' | 'connecting' | 'active' | 'ending' | 'error'
  apartment: Apartment | null
  muted: boolean
  error: string | null
  rejectedCount: number
}

export interface IncomingCallState {
  session: CallSessionPayload
}

export interface CallsContextValue {
  connection: 'disconnected' | 'connecting' | 'connected'
  call: RealtimeCallState | null
  incomingCall: IncomingCallState | null
  porters: CallPorterAvailability[]
  minimized: boolean
  setMinimized: (value: boolean) => void
  startApartmentCall: (apartment: Apartment) => Promise<void>
  startPorterCall: (employeeId: string) => Promise<void>
  acceptIncomingCall: () => Promise<void>
  rejectIncomingCall: () => void
  endCall: (reason?: string) => void
  toggleMute: () => void
}

export const CallsContext = createContext<CallsContextValue | null>(null)
