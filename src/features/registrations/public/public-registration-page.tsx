import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Apartment, Tower, VehicleBrand } from '@/types/api'

// ─── Haversine (browser-side check) ──────────────────────────────────────────
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PersonForm {
  name: string
  lastName: string
  document: string
  phone: string
  email: string
  birthDate: string
  isOwner: boolean
  photoBlob?: Blob | null
  photoPreview?: string | null
}

interface VehicleForm {
  vehicleType: string
  brandName: string
  model: string
  color: string
  plate: string
  notes: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isPersonComplete(person: PersonForm): boolean {
  return Boolean(
    person.name.trim() &&
    person.lastName.trim() &&
    person.document.trim() &&
    person.birthDate.trim() &&
    person.phone.trim() &&
    isValidEmail(person.email) &&
    person.photoBlob,
  )
}

function isVehicleComplete(vehicle: VehicleForm): boolean {
  return Boolean(
    vehicle.vehicleType.trim() &&
    vehicle.brandName.trim() &&
    vehicle.plate.trim() &&
    vehicle.model.trim() &&
    vehicle.color.trim(),
  )
}

// ─── Camera overlay ───────────────────────────────────────────────────────────
function CameraCapture({
  mode = 'face',
  onCapture,
  onCancel,
}: {
  mode?: 'face' | 'document'
  onCapture: (blob: Blob, preview: string) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setReady(true)
        }
      })
      .catch(() => toast.error('No se pudo acceder a la cámara'))

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capture() {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      onCapture(blob, url)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }, 'image/jpeg', 0.85)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
      <div className="relative w-full max-w-sm">
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {mode === 'face' ? (
            <svg viewBox="0 0 320 240" className="w-full h-full">
              <defs>
                <mask id="oval-mask">
                  <rect width="320" height="240" fill="white" />
                  <ellipse cx="160" cy="110" rx="75" ry="95" fill="black" />
                </mask>
              </defs>
              <rect width="320" height="240" fill="rgba(0,0,0,0.45)" mask="url(#oval-mask)" />
              <ellipse cx="160" cy="110" rx="75" ry="95" fill="none" stroke="white" strokeWidth="2" strokeDasharray="6 3" />
              <text x="160" y="220" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif">
                Alinea tu rostro aquí
              </text>
            </svg>
          ) : (
            <svg viewBox="0 0 320 240" className="w-full h-full">
              <defs>
                <mask id="receipt-mask">
                  <rect width="320" height="240" fill="white" />
                  <rect x="28" y="36" width="264" height="168" rx="8" fill="black" />
                </mask>
              </defs>
              <rect width="320" height="240" fill="rgba(0,0,0,0.32)" mask="url(#receipt-mask)" />
              <rect x="28" y="36" width="264" height="168" rx="8" fill="none" stroke="white" strokeWidth="2" strokeDasharray="8 4" />
              <text x="160" y="220" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif">
                Ubica el recibo dentro del marco
              </text>
            </svg>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="bg-white/10 text-white border-white/30" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={!ready} onClick={capture}>
          <Camera className="size-4" />
          Capturar
        </Button>
      </div>
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i < step ? 'bg-primary flex-1' : i === step ? 'bg-primary w-6' : 'bg-slate-200 flex-1',
          )}
        />
      ))}
    </div>
  )
}

const STEP_LABELS = ['Ubicación', 'Apartamento', 'Personas', 'Vehículos', 'Recibo', 'Resumen']
const TOTAL_STEPS = 6

// ─── Main page ────────────────────────────────────────────────────────────────
export function PublicRegistrationPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Step 0 — geolocation
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'far' | 'denied'>('idle')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceM, setDistanceM] = useState<number | null>(null)

  // Step 1 — tower/apartment
  const [selectedTowerId, setSelectedTowerId] = useState('')
  const [selectedApartmentId, setSelectedApartmentId] = useState('')

  // Step 2 — persons
  const [persons, setPersons] = useState<PersonForm[]>([
    { name: '', lastName: '', document: '', phone: '', email: '', birthDate: '', isOwner: true },
  ])
  const [cameraPersonIndex, setCameraPersonIndex] = useState<number | null>(null)

  // Step 3 — vehicles
  const [hasVehicles, setHasVehicles] = useState<boolean | null>(null)
  const [vehicles, setVehicles] = useState<VehicleForm[]>([])

  // Step 4 — receipt
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [cameraReceipt, setCameraReceipt] = useState(false)

  // Step 5 — confirm
  const [confirmed, setConfirmed] = useState(false)

  const { data: linkInfo, isLoading: loadingLink, isError } = useQuery({
    queryKey: ['public-reg-link', publicId],
    queryFn: () => api.getPublicRegistrationLink(publicId!),
    enabled: !!publicId,
    retry: false,
  })

  // ── Geolocation check ────────────────────────────────────────────────────
  function checkGeolocation() {
    if (!linkInfo) return
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const dist = haversineM(linkInfo.geofenceLat, linkInfo.geofenceLng, latitude, longitude)
        setUserCoords({ lat: latitude, lng: longitude })
        setDistanceM(dist)
        if (dist <= linkInfo.geofenceRadiusM) {
          setGeoStatus('ok')
          setTimeout(() => setStep(1), 600)
        } else {
          setGeoStatus('far')
        }
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // ── Person helpers ────────────────────────────────────────────────────────
  function updatePerson(index: number, field: keyof PersonForm, value: unknown) {
    setPersons((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function addPerson() {
    setPersons((prev) => [
      ...prev,
      { name: '', lastName: '', document: '', phone: '', email: '', birthDate: '', isOwner: false },
    ])
  }

  function removePerson(index: number) {
    setPersons((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Vehicle helpers ───────────────────────────────────────────────────────
  function addVehicle() {
    setVehicles((prev) => [...prev, { vehicleType: 'car', brandName: '', model: '', color: '', plate: '', notes: '' }])
  }

  function updateVehicle(index: number, field: keyof VehicleForm, value: string) {
    setVehicles((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!linkInfo || !publicId || !userCoords) return
    if (!persons.length || !persons.some((p) => p.isOwner) || persons.some((p) => !isPersonComplete(p))) {
      toast.error('Completa todos los datos de cada residente antes de enviar')
      return
    }
    if (hasVehicles === true && vehicles.some((vehicle) => !isVehicleComplete(vehicle))) {
      toast.error('Completa todos los datos de cada vehículo antes de enviar')
      return
    }
    if (!receiptBlob) {
      toast.error('Debes adjuntar la foto del recibo de administración')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('towerId', selectedTowerId)
      formData.append('apartmentId', selectedApartmentId)
      formData.append('submittedLat', String(userCoords.lat))
      formData.append('submittedLng', String(userCoords.lng))

      const personsPayload = persons.map(({ photoBlob: _b, photoPreview: _p, ...rest }, i) => ({
        ...rest,
        sortOrder: i,
      }))
      formData.append('persons', JSON.stringify(personsPayload))
      formData.append('vehicles', JSON.stringify(vehicles.map(({ ...v }) => v)))

      persons.forEach((p) => {
        if (p.photoBlob) formData.append('personPhoto', p.photoBlob, 'photo.jpg')
      })

      if (receiptBlob) formData.append('receiptPhoto', receiptBlob, 'receipt.jpg')

      await api.submitRegistration(publicId, formData)
      setSubmitted(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al enviar la solicitud'
      toast.error(msg)
    }
    setSubmitting(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loadingLink) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !linkInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <XCircle className="size-10 text-rose-500" />
        <p className="text-lg font-semibold">Enlace no válido</p>
        <p className="text-sm text-muted-foreground">Este enlace no existe o ya no está activo.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="size-14 text-emerald-500" />
        <h1 className="text-2xl font-bold">¡Solicitud enviada!</h1>
        <p className="max-w-sm text-muted-foreground">
          La administración revisará tu solicitud y se pondrá en contacto contigo próximamente.
        </p>
      </div>
    )
  }

  const towers: Tower[] = linkInfo.towers ?? []
  const allApartments: Apartment[] = linkInfo.apartments ?? []
  const vehicleBrands: VehicleBrand[] = linkInfo.vehicleBrands ?? []
  const filteredApartments = selectedTowerId
    ? allApartments.filter((a: any) => a.towerId === selectedTowerId || a.tower_id === selectedTowerId)
    : []

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white px-5 py-4">
        <h1 className="text-base font-semibold">{linkInfo.label}</h1>
        <p className="text-xs text-muted-foreground">Auto-registro de residentes</p>
        <div className="mt-3">
          <StepIndicator step={step} total={TOTAL_STEPS} />
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{STEP_LABELS[step]}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Step 0: Geolocation */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <MapPin className="size-12 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Verificación de ubicación</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Para registrarte debes estar físicamente dentro del conjunto.
              </p>
            </div>

            {geoStatus === 'idle' && (
              <Button onClick={checkGeolocation}>
                <MapPin className="size-4" />
                Verificar mi ubicación
              </Button>
            )}
            {geoStatus === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Obteniendo ubicación...
              </div>
            )}
            {geoStatus === 'ok' && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">Estás dentro del conjunto</span>
              </div>
            )}
            {geoStatus === 'far' && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-rose-600">
                  <XCircle className="size-5" />
                  <span className="text-sm font-medium">
                    Estás a {Math.round(distanceM ?? 0)}m del conjunto (máximo {linkInfo.geofenceRadiusM}m)
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={checkGeolocation}>
                  <RefreshCw className="size-4" />
                  Intentar de nuevo
                </Button>
              </div>
            )}
            {geoStatus === 'denied' && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-rose-600">Debes permitir el acceso a tu ubicación para continuar.</p>
                <Button variant="outline" size="sm" onClick={checkGeolocation}>
                  <RefreshCw className="size-4" />
                  Reintentar
                </Button>
              </div>
            )}

            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-left text-sm text-blue-700">
              <strong>¿Eres visitante?</strong> Los visitantes se registran en la portería, no en esta web.
            </div>
          </div>
        )}

        {/* Step 1: Tower + Apartment */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Torre</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedTowerId}
                onChange={(e) => {
                  setSelectedTowerId(e.target.value)
                  setSelectedApartmentId('')
                }}
              >
                <option value="">Selecciona una torre</option>
                {towers.map((t) => (
                  <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
                ))}
              </select>
            </div>

            {selectedTowerId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Apartamento</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedApartmentId}
                  onChange={(e) => setSelectedApartmentId(e.target.value)}
                >
                  <option value="">Selecciona un apartamento</option>
                  {filteredApartments.map((a) => (
                    <option key={a.id} value={a.id}>{a.number}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Persons */}
        {step === 2 && (
          <div className="space-y-4">
            {persons.map((p, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => updatePerson(i, 'isOwner', true)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition',
                        p.isOwner ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      Propietario
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePerson(i, 'isOwner', false)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition',
                        !p.isOwner ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      Arrendatario
                    </button>
                  </div>
                  {persons.length > 1 && (
                    <button type="button" onClick={() => removePerson(i)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Nombre</label>
                    <Input value={p.name} onChange={(e) => updatePerson(i, 'name', e.target.value)} placeholder="Nombre" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Apellido</label>
                    <Input value={p.lastName} onChange={(e) => updatePerson(i, 'lastName', e.target.value)} placeholder="Apellido" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Cédula / Documento</label>
                  <Input value={p.document} onChange={(e) => updatePerson(i, 'document', e.target.value)} placeholder="Número de documento" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Fecha de nacimiento</label>
                    <Input type="date" value={p.birthDate} onChange={(e) => updatePerson(i, 'birthDate', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Teléfono</label>
                    <Input value={p.phone} onChange={(e) => updatePerson(i, 'phone', e.target.value)} placeholder="Teléfono" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Email</label>
                  <Input type="email" value={p.email} onChange={(e) => updatePerson(i, 'email', e.target.value)} placeholder="correo@dominio.com" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Foto (tipo selfie / cédula)</label>
                  {p.photoPreview ? (
                    <div className="flex items-center gap-3">
                      <img src={p.photoPreview} alt="preview" className="size-14 rounded-full object-cover border" />
                      <button
                        type="button"
                        className="text-xs text-blue-600 underline"
                        onClick={() => setCameraPersonIndex(i)}
                      >
                        Repetir foto
                      </button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setCameraPersonIndex(i)}>
                      <Camera className="size-4" />
                      Tomar foto
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {persons.length < 8 && (
              <Button variant="outline" className="w-full" onClick={addPerson}>
                <Plus className="size-4" />
                Agregar persona
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Vehicles */}
        {step === 3 && (
          <div className="space-y-4">
            {hasVehicles === null && (
              <div className="flex flex-col gap-3 py-4">
                <p className="text-center text-sm text-muted-foreground">¿Tendrás vehículos para registrar?</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setHasVehicles(false) }}>
                    No tengo vehículos
                  </Button>
                  <Button className="flex-1" onClick={() => { setHasVehicles(true); addVehicle() }}>
                    <Car className="size-4" />
                    Agregar vehículo
                  </Button>
                </div>
              </div>
            )}

            {hasVehicles === false && (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                <CheckCircle2 className="size-8 text-emerald-500" />
                <p className="text-sm">Sin vehículos por registrar</p>
                <button type="button" className="text-xs underline" onClick={() => { setHasVehicles(null); setVehicles([]) }}>
                  Cambiar
                </button>
              </div>
            )}

            {hasVehicles === true && vehicles.map((v, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Vehículo {i + 1}</span>
                  <button type="button" onClick={() => setVehicles((prev) => prev.filter((_, j) => j !== i))} className="text-rose-500">
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Tipo</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={v.vehicleType}
                    onChange={(e) => updateVehicle(i, 'vehicleType', e.target.value)}
                  >
                    <option value="car">Carro</option>
                    <option value="motorcycle">Moto</option>
                    <option value="bicycle">Bicicleta</option>
                    <option value="truck">Camioneta</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Marca</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={v.brandName}
                      onChange={(e) => updateVehicle(i, 'brandName', e.target.value)}
                    >
                      <option value="">Selecciona marca</option>
                      {vehicleBrands.map((brand) => (
                        <option key={brand.id} value={brand.name}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Placa</label>
                    <Input value={v.plate} onChange={(e) => updateVehicle(i, 'plate', e.target.value.toUpperCase())} placeholder="ABC123" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Modelo</label>
                    <Input value={v.model} onChange={(e) => updateVehicle(i, 'model', e.target.value)} placeholder="Modelo" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Color</label>
                    <Input value={v.color} onChange={(e) => updateVehicle(i, 'color', e.target.value)} placeholder="Color" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Notas</label>
                  <Input value={v.notes} onChange={(e) => updateVehicle(i, 'notes', e.target.value)} placeholder="Opcional" />
                </div>
              </div>
            ))}

            {hasVehicles === true && (
              <Button variant="outline" className="w-full" onClick={addVehicle}>
                <Plus className="size-4" />
                Agregar otro vehículo
              </Button>
            )}
          </div>
        )}

        {/* Step 4: Receipt */}
        {step === 4 && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              Sube una foto clara del <strong>recibo de administración del último mes</strong>.
            </div>

            {receiptPreview ? (
              <div className="space-y-2">
                <img src={receiptPreview} alt="Recibo" className="w-full rounded-lg border object-contain max-h-72" />
                <Button variant="outline" size="sm" onClick={() => { setReceiptBlob(null); setReceiptPreview(null) }}>
                  Cambiar foto
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCameraReceipt(true)}>
                  <Camera className="size-4" />
                  Tomar foto
                </Button>
                <label className="flex-1 cursor-pointer">
                  <span className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                    Galería
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setReceiptBlob(file)
                        setReceiptPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & submit */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <p className="font-medium">Resumen</p>
              <div className="space-y-1 text-muted-foreground">
                <p>Apartamento: <span className="text-foreground font-medium">
                  {allApartments.find((a) => a.id === selectedApartmentId)?.number ?? '—'}
                </span></p>
                <p>Torre: <span className="text-foreground font-medium">
                  {towers.find((t) => t.id === selectedTowerId)?.name ?? '—'}
                </span></p>
                <p>Personas: <span className="text-foreground font-medium">{persons.length}</span></p>
                <p>Vehículos: <span className="text-foreground font-medium">{vehicles.length}</span></p>
                <p>Recibo: <span className={receiptBlob ? 'text-emerald-600 font-medium' : 'text-rose-500'}>
                  {receiptBlob ? 'Adjunto' : 'No adjunto'}
                </span></p>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-muted-foreground">
                Confirmo que la información ingresada es correcta y verídica.
              </span>
            </label>

            <Button
              className="w-full"
              disabled={!confirmed || submitting}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Enviar solicitud
            </Button>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="border-t border-border bg-white px-5 py-4 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        {step < TOTAL_STEPS - 1 && (
          <Button
            size="sm"
            disabled={
              (step === 0 && geoStatus !== 'ok') ||
              (step === 1 && (!selectedTowerId || !selectedApartmentId)) ||
              (step === 2 && (
                persons.length === 0 ||
                !persons.some((p) => p.isOwner) ||
                persons.some((p) => !isPersonComplete(p))
              )) ||
              (step === 3 && hasVehicles === null)
              || (step === 3 && hasVehicles === true && vehicles.some((v) => !isVehicleComplete(v)))
              || (step === 4 && !receiptBlob)
            }
            onClick={() => setStep((s) => s + 1)}
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Camera overlays */}
      {cameraPersonIndex !== null && (
        <CameraCapture
          onCapture={(blob, preview) => {
            updatePerson(cameraPersonIndex, 'photoBlob', blob)
            updatePerson(cameraPersonIndex, 'photoPreview', preview)
            setCameraPersonIndex(null)
          }}
          onCancel={() => setCameraPersonIndex(null)}
        />
      )}
      {cameraReceipt && (
        <CameraCapture
          mode="document"
          onCapture={(blob, preview) => {
            setReceiptBlob(blob)
            setReceiptPreview(preview)
            setCameraReceipt(false)
          }}
          onCancel={() => setCameraReceipt(false)}
        />
      )}
    </div>
  )
}
