import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { REALTIME_URL } from '@/lib/constants'
import type { AssemblyQuestion, VoteStatsPayload } from '../types'

interface AssemblySocketState {
  currentQuestion: AssemblyQuestion | null
  stats: VoteStatsPayload | null
  assemblyStatus: 'draft' | 'active' | 'finished' | null
  connected: boolean
}

export function useAssemblySocket(
  assemblyId: string | undefined,
  token: string | null,
  onReconnect?: () => void,
) {
  const socketRef = useRef<Socket | null>(null)
  const isFirstConnect = useRef(true)
  const [state, setState] = useState<AssemblySocketState>({
    currentQuestion: null,
    stats: null,
    assemblyStatus: null,
    connected: false,
  })

  useEffect(() => {
    if (!assemblyId || !token) return

    isFirstConnect.current = true

    const socket = io(REALTIME_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setState((s) => ({ ...s, connected: true }))
      socket.emit('assembly:join', { assemblyId })
      // En reconexiones, notifica para que la página refresque datos via REST
      if (!isFirstConnect.current) {
        onReconnect?.()
      }
      isFirstConnect.current = false
    })

    socket.on('disconnect', () => {
      setState((s) => ({ ...s, connected: false }))
    })

    socket.on('connect_error', () => {
      setState((s) => ({ ...s, connected: false }))
    })

    socket.on('assembly:started', (payload: { status: 'active' }) => {
      setState((s) => ({ ...s, assemblyStatus: payload.status }))
    })

    socket.on(
      'assembly:question_opened',
      (event: { assemblyId: string; question: AssemblyQuestion }) => {
        setState((s) => ({
          ...s,
          currentQuestion: event.question,
          stats: null,
        }))
      },
    )

    socket.on(
      'assembly:question_closed',
      (event: { assemblyId: string; question: AssemblyQuestion }) => {
        setState((s) => ({
          ...s,
          currentQuestion: s.currentQuestion?.id === event.question.id ? event.question : s.currentQuestion,
        }))
      },
    )

    socket.on('assembly:vote_received', (stats: VoteStatsPayload) => {
      setState((s) => ({ ...s, stats }))
    })

    socket.on('assembly:finished', () => {
      setState((s) => ({ ...s, assemblyStatus: 'finished' }))
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [assemblyId, token])

  return state
}
