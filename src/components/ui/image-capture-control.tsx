import { Camera, RefreshCw, Upload, X } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ImageCaptureControlProps {
  multiple?: boolean
  buttonLabel?: string
  onFiles: (files: File[]) => void
  className?: string
}

function supportsCamera() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

function createPhotoFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `camera-${stamp}.jpg`
}

export function ImageCaptureControl({
  multiple = false,
  buttonLabel = multiple ? 'Agregar imágenes' : 'Tomar o seleccionar foto',
  onFiles,
  className,
}: ImageCaptureControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraPanelRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [loadingCamera, setLoadingCamera] = useState(false)

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const allDevices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = allDevices.filter((device) => device.kind === 'videoinput')
    setDevices(videoDevices)
    if (!deviceId && videoDevices[0]?.deviceId) {
      setDeviceId(videoDevices[0].deviceId)
    }
  }

  function scrollCameraIntoView() {
    window.setTimeout(() => {
      cameraPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      videoRef.current?.focus({ preventScroll: true })
    }, 80)
  }

  function startCamera(nextDeviceId = deviceId) {
    if (!supportsCamera()) {
      toast.error('Este navegador no permite usar la cámara')
      return
    }

    const videoConstraints: MediaTrackConstraints = nextDeviceId ? { deviceId: { exact: nextDeviceId } } : { facingMode: 'user' }
    setLoadingCamera(true)
    stopCamera()
    setCameraOpen(true)
    scrollCameraIntoView()

    navigator.mediaDevices
      .getUserMedia({
        video: videoConstraints,
        audio: false,
      })
      .then(async (stream) => {
        streamRef.current = stream
        await new Promise((resolve) => requestAnimationFrame(resolve))
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
          scrollCameraIntoView()
        }
        await refreshDevices()
        setLoadingCamera(false)
      })
      .catch(() => {
        setCameraOpen(false)
        stopCamera()
        setLoadingCamera(false)
        toast.error('No fue posible abrir la cámara')
      })
  }

  function handleDeviceChange(nextDeviceId: string) {
    setDeviceId(nextDeviceId)
    startCamera(nextDeviceId)
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    if (selectedFiles.length > 0) {
      onFiles(multiple ? selectedFiles : selectedFiles.slice(0, 1))
    }
    event.target.value = ''
  }

  async function capturePhoto() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('La cámara aún no está lista')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!blob) {
      toast.error('No fue posible capturar la foto')
      return
    }

    onFiles([new File([blob], createPhotoFileName(), { type: 'image/jpeg' })])
    if (!multiple) {
      setCameraOpen(false)
      stopCamera()
    }
  }

  useEffect(() => () => stopCamera(), [])

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => startCamera()} disabled={loadingCamera}>
          <Camera className="size-4" />
          {loadingCamera ? 'Abriendo cámara...' : 'Tomar foto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" />
          {buttonLabel}
        </Button>
      </div>

      {cameraOpen ? (
        <div ref={cameraPanelRef} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {devices.length > 1 ? (
              <select
                value={deviceId}
                onChange={(event) => handleDeviceChange(event.target.value)}
                className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-950/8"
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${index + 1}`}
                  </option>
                ))}
              </select>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={() => void refreshDevices()}>
              <RefreshCw className="size-3.5" />
              Actualizar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCameraOpen(false)
                stopCamera()
              }}
            >
              <X className="size-3.5" />
              Cerrar
            </Button>
          </div>
          <video
            ref={videoRef}
            playsInline
            muted
            tabIndex={-1}
            className="aspect-video w-full rounded-lg bg-slate-950 object-cover"
          />
          <Button type="button" className="mt-3 w-full" onClick={() => void capturePhoto()}>
            <Camera className="size-4" />
            Capturar foto
          </Button>
        </div>
      ) : null}
    </div>
  )
}
