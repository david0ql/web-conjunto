import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { CallDock } from '@/features/calls/call-dock'
import { CallsContext, type IncomingCallState, type RealtimeCallState } from '@/features/calls/calls-context'
import type {
  CallSessionPayload,
  CallSignalEnvelope,
  IceConfigResponse,
} from '@/features/calls/types'
import { useAuth } from '@/hooks/use-auth-context'
import { api } from '@/lib/api'
import { REALTIME_URL } from '@/lib/constants'
import type { Apartment, CallPorterAvailability } from '@/types/api'

function isEmployeeRealtimeEnabled(role?: string) {
  return role === 'administrator' || role === 'porter'
}

export function CallsProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const realtimeEnabled = Boolean(
    user &&
    user.type === 'employee' &&
    token &&
    isEmployeeRealtimeEnabled(user.role),
  )
  const [socketConnected, setSocketConnected] = useState(false)
  const [call, setCall] = useState<RealtimeCallState | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null)
  const [porters, setPorters] = useState<CallPorterAvailability[]>([])
  const [minimized, setMinimized] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const iceServersRef = useRef<RTCIceServer[] | null>(null)
  const callRef = useRef<RealtimeCallState | null>(null)
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const connection: 'disconnected' | 'connecting' | 'connected' =
    !realtimeEnabled
      ? 'disconnected'
      : socketConnected
        ? 'connected'
        : 'connecting'

  useEffect(() => {
    callRef.current = call
  }, [call])

  async function addRemoteIceCandidate(peer: RTCPeerConnection, candidate: RTCIceCandidateInit) {
    if (peer.signalingState === 'closed' || peer.connectionState === 'closed') {
      return
    }

    if (!peer.remoteDescription) {
      pendingRemoteCandidatesRef.current.push(candidate)
      return
    }

    try {
      await peer.addIceCandidate(candidate)
    } catch (error) {
      if (callRef.current?.phase === 'ending' || callRef.current?.phase === 'error') {
        return
      }
      console.warn('Ignoring stale ICE candidate', error)
    }
  }

  async function flushPendingRemoteCandidates(peer: RTCPeerConnection) {
    if (!peer.remoteDescription || pendingRemoteCandidatesRef.current.length === 0) {
      return
    }

    const candidates = [...pendingRemoteCandidatesRef.current]
    pendingRemoteCandidatesRef.current = []
    for (const candidate of candidates) {
      await addRemoteIceCandidate(peer, candidate)
    }
  }

  function ensureRemoteAudioElement() {
    if (remoteAudioRef.current) {
      return remoteAudioRef.current
    }

    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.setAttribute('playsinline', 'true')
    audio.style.display = 'none'
    document.body.appendChild(audio)
    remoteAudioRef.current = audio
    return audio
  }

  async function ensureIceServers() {
    if (iceServersRef.current) {
      return iceServersRef.current
    }

    const response = (await api.getCallsIceConfig()) as IceConfigResponse
    iceServersRef.current = response.iceServers
    return response.iceServers
  }

  async function createPeerConnection(callId: string) {
    if (peerRef.current) {
      return peerRef.current
    }

    const peer = new RTCPeerConnection({
      iceServers: await ensureIceServers(),
    })

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        return
      }
      socketRef.current?.emit('calls:signal', {
        callId,
        signal: {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        },
      })
    }

    peer.ontrack = (event) => {
      const audio = ensureRemoteAudioElement()
      audio.srcObject = event.streams[0]
      void audio.play().catch(() => undefined)
    }

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setCall((current) => current ? { ...current, phase: 'active', error: null } : current)
      }
      if (peer.connectionState === 'failed') {
        setCall((current) =>
          current
            ? {
                ...current,
                phase: 'error',
                error: 'La conexion WebRTC fallo antes de estabilizarse',
              }
            : current,
        )
      }
    }

    peerRef.current = peer
    return peer
  }

  function releaseRtcResources() {
    pendingRemoteCandidatesRef.current = []

    if (peerRef.current) {
      peerRef.current.onicecandidate = null
      peerRef.current.ontrack = null
      peerRef.current.onconnectionstatechange = null
      peerRef.current.close()
      peerRef.current = null
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause()
      remoteAudioRef.current.srcObject = null
    }
  }

  function teardownCall() {
    callRef.current = null
    releaseRtcResources()
    setCall(null)
    setMinimized(false)
  }

  function getRejectedCount(session: CallSessionPayload) {
    return session.direction === 'outbound'
      ? session.rejectedResidentIds.length
      : session.rejectedEmployeeIds.length
  }

  const startOfferForCall = useEffectEvent(async (session: CallSessionPayload) => {
    if (!localStreamRef.current) {
      return
    }

    const peer = await createPeerConnection(session.id)
    const tracks = localStreamRef.current.getAudioTracks()
    tracks.forEach((track) => {
      if (!localStreamRef.current) return
      peer.addTrack(track, localStreamRef.current)
    })

    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
    })
    await peer.setLocalDescription(offer)

    socketRef.current?.emit('calls:signal', {
      callId: session.id,
      signal: {
        type: 'offer',
        sdp: offer.sdp,
      },
    })
  })

  const handleSignal = useEffectEvent(async (callId: string, signal: CallSignalEnvelope) => {
    const peer = peerRef.current
    const currentCall = callRef.current
    if (
      currentCall?.phase === 'ending' ||
      currentCall?.phase === 'error'
    ) {
      return
    }

    // Answerer flow for incoming resident and internal porter calls.
    if (signal.type === 'offer' && signal.sdp) {
      const peer2 = await createPeerConnection(callId)

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          if (!localStreamRef.current) return
          peer2.addTrack(track, localStreamRef.current)
        })
      }

      await peer2.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
      await flushPendingRemoteCandidates(peer2)

      const answer = await peer2.createAnswer()
      await peer2.setLocalDescription(answer)

      socketRef.current?.emit('calls:signal', {
        callId,
        signal: {
          type: 'answer',
          sdp: answer.sdp,
        },
      })
      return
    }

    if (
      !peer ||
      currentCall?.session?.id !== callId
    ) {
      return
    }

    if (signal.type === 'answer' && signal.sdp) {
      await peer.setRemoteDescription({
        type: 'answer',
        sdp: signal.sdp,
      })
      await flushPendingRemoteCandidates(peer)
      setCall((current) => current ? { ...current, phase: 'active', error: null } : current)
      return
    }

    if (signal.type === 'ice-candidate' && signal.candidate) {
      await addRemoteIceCandidate(peer, signal.candidate)
    }
  })

  const handleTerminalState = useEffectEvent((session: CallSessionPayload) => {
    if (callRef.current?.session?.id && callRef.current.session.id !== session.id) {
      return
    }

    const phaseMessage =
      session.status === 'missed'
        ? 'Nadie contesto la llamada'
        : session.status === 'rejected'
          ? 'La llamada fue rechazada'
          : 'Llamada finalizada'

    toast.message(phaseMessage)
    teardownCall()
  })

  useEffect(() => {
    if (!realtimeEnabled || !token) {
      return
    }

    const socket = io(REALTIME_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))
    socket.on('calls:error', (event: { message?: string }) => {
      const message = event.message ?? 'No fue posible operar el canal de llamada'
      setCall((current) => current ? { ...current, phase: 'error', error: message } : current)
      toast.error(message)
    })
    socket.on('calls:outgoing', (session: CallSessionPayload) => {
      setMinimized(false)
      setCall((current) => ({
        apartment: current?.apartment ?? null,
        muted: current?.muted ?? false,
        error: null,
        phase: 'ringing',
        rejectedCount: getRejectedCount(session),
        session,
      }))
    })
    socket.on('calls:incoming', (session: CallSessionPayload) => {
      if (session.direction === 'inbound' || session.direction === 'internal') {
        setIncomingCall({ session })
        setMinimized(false)
      }
    })
    socket.on('calls:resident-rejected', (event: { rejectedResidentIds?: string[] }) => {
      setCall((current) =>
        current
          ? {
              ...current,
              rejectedCount: event.rejectedResidentIds?.length ?? current.rejectedCount,
            }
          : current,
      )
    })
    socket.on('calls:porter-rejected', (event: { rejectedEmployeeIds?: string[] }) => {
      setCall((current) =>
        current
          ? {
              ...current,
              rejectedCount: event.rejectedEmployeeIds?.length ?? current.rejectedCount,
            }
          : current,
      )
    })
    socket.on('calls:employee-rejected', (event: { rejectedEmployeeIds?: string[] }) => {
      setCall((current) =>
        current
          ? {
              ...current,
              rejectedCount: event.rejectedEmployeeIds?.length ?? current.rejectedCount,
            }
          : current,
      )
    })
    socket.on('calls:porters-updated', (nextPorters: CallPorterAvailability[]) => {
      setPorters(nextPorters)
    })
    socket.on('calls:accepted', (session: CallSessionPayload) => {
      setMinimized(false)
      setIncomingCall(null)

      setCall((current) => ({
        apartment: current?.apartment ?? null,
        muted: current?.muted ?? false,
        error: null,
        phase: 'connecting',
        rejectedCount: getRejectedCount(session),
        session,
      }))

      const shouldStartOffer =
        session.direction === 'outbound' ||
        (session.direction === 'internal' && user?.id === session.initiatedByEmployeeId)

      if (shouldStartOffer) {
        void startOfferForCall(session)
      }
    })
    socket.on('calls:signal', (event: { callId: string; signal: CallSignalEnvelope }) => {
      void handleSignal(event.callId, event.signal)
    })
    socket.on('calls:ended', (session: CallSessionPayload) => {
      setIncomingCall(null)
      handleTerminalState(session)
    })
    socket.on('calls:missed', (session: CallSessionPayload) => {
      setIncomingCall(null)
      handleTerminalState(session)
    })
    socket.on('calls:rejected', (session: CallSessionPayload) => {
      setIncomingCall(null)
      handleTerminalState(session)
    })

    return () => {
      teardownCall()
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setPorters([])
      setSocketConnected(false)
    }
  }, [realtimeEnabled, token, user?.id])

  useEffect(() => {
    if (!realtimeEnabled || !token) {
      return
    }

    let cancelled = false
    void api.getCallPorters()
      .then((nextPorters) => {
        if (!cancelled) {
          setPorters(nextPorters)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPorters([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [realtimeEnabled, token, user?.id])

  async function startApartmentCall(apartment: Apartment) {
    if (!socketRef.current || socketRef.current.disconnected) {
      throw new Error('El canal de tiempo real no esta conectado')
    }
    if (call || incomingCall) {
      throw new Error('Ya existe una llamada en curso')
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este navegador no soporta captura de audio en tiempo real')
    }

    setMinimized(false)
    setCall({
      apartment,
      muted: false,
      error: null,
      phase: 'requesting-media',
      rejectedCount: 0,
      session: null,
    })

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      localStreamRef.current = localStream

      socketRef.current.emit('calls:initiate', {
        apartmentId: apartment.id,
      })
    } catch (error) {
      teardownCall()
      throw error
    }
  }

  async function startPorterCall(employeeId: string) {
    if (!socketRef.current || socketRef.current.disconnected) {
      throw new Error('El canal de tiempo real no esta conectado')
    }
    if (call || incomingCall) {
      throw new Error('Ya existe una llamada en curso')
    }
    if (user?.id === employeeId) {
      throw new Error('No puedes llamarte a ti mismo')
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este navegador no soporta captura de audio en tiempo real')
    }

    setMinimized(false)
    setCall({
      apartment: null,
      muted: false,
      error: null,
      phase: 'requesting-media',
      rejectedCount: 0,
      session: null,
    })

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      localStreamRef.current = localStream

      socketRef.current.emit('calls:initiate-porter', {
        employeeId,
      })
    } catch (error) {
      teardownCall()
      throw error
    }
  }

  async function acceptIncomingCall() {
    const incoming = incomingCall
    if (!incoming || !socketRef.current) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este navegador no soporta captura de audio en tiempo real')
    }

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      localStreamRef.current = localStream

      socketRef.current.emit('calls:accept', {
        callId: incoming.session.id,
      })
      // calls:accepted event will update state; resident will send the offer
    } catch (error) {
      setIncomingCall(null)
      throw error
    }
  }

  function rejectIncomingCall() {
    const incoming = incomingCall
    if (!incoming || !socketRef.current) {
      return
    }

    setIncomingCall(null)
    socketRef.current.emit('calls:reject', {
      callId: incoming.session.id,
    })
  }

  function toggleMute() {
    const stream = localStreamRef.current
    if (!stream) {
      return
    }

    const nextMuted = !call?.muted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setCall((current) => current ? { ...current, muted: nextMuted } : current)
  }

  function endCall(reason?: string) {
    if (!call?.session?.id) {
      teardownCall()
      return
    }

    const nextCall = { ...call, phase: 'ending' as const }
    callRef.current = nextCall
    releaseRtcResources()
    setCall(nextCall)
    socketRef.current?.emit('calls:end', {
      callId: call.session.id,
      reason,
    })
  }

  const value = {
    connection,
    call,
    incomingCall,
    porters,
    minimized,
    setMinimized,
    startApartmentCall,
    startPorterCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    toggleMute,
  }

  return (
    <CallsContext.Provider value={value}>
      {children}
      <CallDock />
    </CallsContext.Provider>
  )
}
