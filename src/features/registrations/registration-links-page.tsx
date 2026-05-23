import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Link2, Loader2, MapPin, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { RegistrationLink } from '@/types/api'
import { formatDate } from '@/lib/utils'

// Fix default marker icon in bundled Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function GeofenceMap({
  lat, lng, radiusM, onChange,
}: {
  lat: number; lng: number; radiusM: number
  onChange: (lat: number, lng: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current).setView([lat, lng], 17)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
    const circle = L.circle([lat, lng], { radius: radiusM, color: '#3b82f6', fillOpacity: 0.15 }).addTo(map)

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      circle.setLatLng(pos)
      onChange(pos.lat, pos.lng)
    })

    mapRef.current = map
    markerRef.current = marker
    circleRef.current = circle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    circleRef.current?.setRadius(radiusM)
  }, [radiusM])

  return <div ref={containerRef} className="h-64 w-full rounded-md border" />
}

function NewLinkDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [radiusM, setRadiusM] = useState(300)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.createRegistrationLink({
        label,
        geofenceLat: coords!.lat,
        geofenceLng: coords!.lng,
        geofenceRadiusM: radiusM,
      }),
    onSuccess: () => {
      toast.success('Enlace creado')
      setOpen(false)
      setLabel('')
      setCoords(null)
      setRadiusM(300)
      onCreated()
    },
    onError: () => toast.error('Error al crear enlace'),
  })

  function locateMe() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        toast.error('No se pudo obtener la ubicación')
        setLocating(false)
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={() => { if (!coords) locateMe() }}>
          <Plus className="size-4" />
          Nuevo enlace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear enlace de registro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Nombre / Etiqueta">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Registro Torre A — Mayo 2026"
            />
          </Field>

          {!coords ? (
            <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              {locating ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
              {locating ? 'Obteniendo ubicación...' : (
                <button type="button" className="underline" onClick={locateMe}>
                  Usar mi ubicación para centrar el mapa
                </button>
              )}
            </div>
          ) : (
            <>
              <GeofenceMap
                lat={coords.lat}
                lng={coords.lng}
                radiusM={radiusM}
                onChange={(lat, lng) => setCoords({ lat, lng })}
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Radio de geocerca</span>
                  <span className="font-medium">{radiusM}m</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={radiusM}
                  onChange={(e) => setRadiusM(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground">
                  Lat {coords.lat.toFixed(5)} · Lng {coords.lng.toFixed(5)} · Radio {radiusM}m
                </p>
              </div>
            </>
          )}

          <Button
            className="w-full"
            disabled={!label.trim() || !coords || isPending}
            onClick={() => mutate()}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Generar enlace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RegistrationLinksPage() {
  const queryClient = useQueryClient()
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['registration-links'],
    queryFn: api.getRegistrationLinks,
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.toggleRegistrationLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registration-links'] }),
    onError: () => toast.error('Error al cambiar estado'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteRegistrationLink(id),
    onSuccess: () => {
      toast.success('Enlace eliminado')
      queryClient.invalidateQueries({ queryKey: ['registration-links'] })
    },
    onError: () => toast.error('Error al eliminar'),
  })

  function copyLink(publicId: string) {
    const url = `${window.location.origin}/register/${publicId}`
    void navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  }

  const columns: ColumnDef<RegistrationLink>[] = [
    {
      header: 'Nombre',
      cell: (row) => <span className="font-medium">{row.label}</span>,
    },
    {
      header: 'Geocerca',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.geofenceRadiusM}m de radio</span>,
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge className={row.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>
          {row.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: 'Creado',
      cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="Copiar enlace" onClick={() => copyLink(row.publicId)}>
            <Copy className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={row.isActive ? 'Desactivar' : 'Activar'}
            onClick={() => toggleMut.mutate(row.id)}
          >
            {row.isActive ? <ToggleRight className="size-4 text-emerald-600" /> : <ToggleLeft className="size-4 text-slate-400" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Eliminar"
            className="text-rose-500 hover:text-rose-700"
            onClick={() => {
              if (confirm('¿Eliminar este enlace? Las solicitudes enviadas también se eliminarán.')) {
                deleteMut.mutate(row.id)
              }
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <SectionHeader
        eyebrow="Administración"
        title="Registro Masivo"
        description="Genera enlaces públicos con geocerca para que los residentes se auto-registren"
        action={
          <NewLinkDialog onCreated={() => queryClient.invalidateQueries({ queryKey: ['registration-links'] })} />
        }
      />
      <DataTable columns={columns} data={links} isLoading={isLoading} />
    </div>
  )
}
