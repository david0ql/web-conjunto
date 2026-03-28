import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { REALTIME_URL } from '@/lib/constants'
import type { AssemblyQuestion, VoteStatsPayload } from '../types'

interface AssemblySocketState {
  currentQuestion: AssemblyQuestion | null
  stats: VoteStatsPayload | null
  assemblyStatus: 'draft' | 'active' | 'finished' | null
  connected: boolean
  networkOnline: boolean
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'
}

function getBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
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
    networkOnline: getBrowserOnline(),
    connectionState: 'idle',
  })

  useEffect(() => {
    if (!assemblyId || !token) {
      setState((s) => ({
        ...s,
        connected: false,
        networkOnline: getBrowserOnline(),
        connectionState: getBrowserOnline() ? 'idle' : 'offline',
      }))
      return
    }

    isFirstConnect.current = true
    setState((s) => ({
      ...s,
      connected: false,
      networkOnline: getBrowserOnline(),
      connectionState: getBrowserOnline() ? 'connecting' : 'offline',
    }))

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

    const handleBrowserOnline = () => {
      setState((s) => ({
        ...s,
        networkOnline: true,
        connectionState: s.connected ? 'connected' : 'reconnecting',
      }))
    }

    const handleBrowserOffline = () => {
      setState((s) => ({
        ...s,
        networkOnline: false,
        connectionState: 'offline',
      }))
    }

    window.addEventListener('online', handleBrowserOnline)
    window.addEventListener('offline', handleBrowserOffline)

    socket.on('connect', () => {
      setState((s) => ({
        ...s,
        connected: true,
        networkOnline: getBrowserOnline(),
        connectionState: 'connected',
      }))
      socket.emit('assembly:join', { assemblyId })
      // En reconexiones, notifica para que la página refresque datos via REST
      if (!isFirstConnect.current) {
        onReconnect?.()
      }
      isFirstConnect.current = false
    })

    socket.on('disconnect', () => {
      setState((s) => ({
        ...s,
        connected: false,
        networkOnline: getBrowserOnline(),
        connectionState: getBrowserOnline() ? 'reconnecting' : 'offline',
      }))
    })

    socket.on('connect_error', () => {
      setState((s) => ({
        ...s,
        connected: false,
        networkOnline: getBrowserOnline(),
        connectionState: getBrowserOnline() ? 'reconnecting' : 'offline',
      }))
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
      window.removeEventListener('online', handleBrowserOnline)
      window.removeEventListener('offline', handleBrowserOffline)
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [assemblyId, token])

  return state
}
