import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { CallDock } from '@/features/calls/call-dock'
import { CallsContext, type RealtimeCallState } from '@/features/calls/calls-context'
import type {
  CallSessionPayload,
  CallSignalEnvelope,
  IceConfigResponse,
} from '@/features/calls/types'
import { useAuth } from '@/hooks/use-auth-context'
import { api } from '@/lib/api'
import { REALTIME_URL } from '@/lib/constants'
import type { Apartment } from '@/types/api'

function isEmployeeRealtimeEnabled(role?: string) {
  return role === 'administrator' || role === 'porter'
}

export function CallsProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const [connection, setConnection] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [call, setCall] = useState<RealtimeCallState | null>(null)
  const [minimized, setMinimized] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const iceServersRef = useRef<RTCIceServer[] | null>(null)
  const callRef = useRef<RealtimeCallState | null>(null)
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  useEffect(() => {
    callRef.current = call
  }, [call])

  useEffect(() => {
    if (!user || user.type !== 'employee' || !token || !isEmployeeRealtimeEnabled(user.role)) {
      teardownCall()
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnection('disconnected')
      return
    }

    setConnection('connecting')
    const socket = io(REALTIME_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnection('connected'))
    socket.on('disconnect', () => setConnection('disconnected'))
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
        rejectedCount: session.rejectedResidentIds.length,
        session,
      }))
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
    socket.on('calls:accepted', (session: CallSessionPayload) => {
      setMinimized(false)
      setCall((current) => ({
        apartment: current?.apartment ?? null,
        muted: current?.muted ?? false,
        error: null,
        phase: 'connecting',
        rejectedCount: session.rejectedResidentIds.length,
        session,
      }))
      void startOfferForCall(session)
    })
    socket.on('calls:signal', (event: { callId: string; signal: CallSignalEnvelope }) => {
      void handleSignal(event.callId, event.signal)
    })
    socket.on('calls:ended', (session: CallSessionPayload) => handleTerminalState(session))
    socket.on('calls:missed', (session: CallSessionPayload) => handleTerminalState(session))
    socket.on('calls:rejected', (session: CallSessionPayload) => handleTerminalState(session))

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setConnection('disconnected')
    }
  }, [token, user?.id, user?.role, user?.type])

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

  async function startApartmentCall(apartment: Apartment) {
    if (!socketRef.current || socketRef.current.disconnected) {
      throw new Error('El canal de tiempo real no esta conectado')
    }
    if (call) {
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

  async function startOfferForCall(session: CallSessionPayload) {
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
  }

  async function handleSignal(callId: string, signal: CallSignalEnvelope) {
    const peer = peerRef.current
    const currentCall = callRef.current
    if (
      !peer ||
      currentCall?.session?.id !== callId ||
      currentCall.phase === 'ending' ||
      currentCall.phase === 'error'
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

  function handleTerminalState(session: CallSessionPayload) {
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
  }

  function teardownCall() {
    callRef.current = null
    releaseRtcResources()
    setCall(null)
    setMinimized(false)
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

  const value = useMemo(
    () => ({
      connection,
      call,
      minimized,
      setMinimized,
      startApartmentCall,
      endCall,
      toggleMute,
    }),
    [call, connection, minimized],
  )

  return (
    <CallsContext.Provider value={value}>
      {children}
      <CallDock />
    </CallsContext.Provider>
  )
}
