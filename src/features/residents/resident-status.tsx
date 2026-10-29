import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRightLeft, KeyRound, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FilterableSelect } from '@/components/ui/filterable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-errors'
import { formatDate, formatDocument, formatName } from '@/lib/utils'
import { residentConflictOf, type ResidentConflictError } from '@/lib/resident-conflict'
import type { Resident, ResidentFromVisitorResult, Visitor } from '@/types/api'

// ─── Conflictos de correo / cédula ────────────────────────────────────────────

/**
 * Explica quién tiene el correo o la cédula y qué se puede hacer. Si el correo
 * lo tiene un residente inactivo, ofrece pasárselo a este (queda en el historial
 * de ambos).
 */
export function ConflictNotice({
  error,
  onTakeEmail,
  pending,
}: {
  error: ResidentConflictError
  onTakeEmail?: () => void
  pending?: boolean
}) {
  const holder = formatName(error.conflict.name, error.conflict.lastName)
  const canTake = error.field === 'email' && !error.conflict.isActive && onTakeEmail
  return (
    <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="space-y-2">
        <p>{error.message}</p>
        {error.field === 'email' && error.conflict.isActive && (
          <p className="text-xs text-amber-800">
            El correo es el usuario para entrar a la app, así que no puede repetirse entre residentes activos. Use otro correo o cambie primero el de {holder}.
          </p>
        )}
        {error.field === 'document' && (
          <p className="text-xs text-amber-800">
            {error.conflict.isActive
              ? `Si es la misma persona, ya está registrada: búsquela por la cédula.`
              : `Si es la misma persona, búsquela por la cédula y vuelva a habilitarla. Si la cédula está mal en el registro de ${holder}, corríjala allí primero.`}
          </p>
        )}
        {canTake && (
          <Button type="button" size="sm" variant="outline" className="h-7 border-amber-300 bg-white text-xs" onClick={onTakeEmail} disabled={pending}>
            <ArrowRightLeft className="mr-1 size-3" />
            Quitárselo a {holder} (inactivo) y usarlo aquí
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Estado: inhabilitar / volver a habilitar ─────────────────────────────────

/** "Inhabilitado el … por …" debajo del estado de un residente inactivo. */
export function DeactivationInfo({ resident }: { resident: Resident }) {
  if (resident.isActive || resident.residentType?.code === 'family') return null
  const info = resident.deactivation
  if (!info) return <p className="mt-1 text-[11px] text-slate-400">Inhabilitado antes del historial</p>
  return (
    <div className="mt-1 max-w-[220px] text-[11px] leading-snug text-slate-500" title={info.reason ?? undefined}>
      <p>{formatDate(info.at)}</p>
      {info.by && <p>por {info.by}</p>}
      {info.reason && <p className="truncate text-slate-400">"{info.reason}"</p>}
    </div>
  )
}

/**
 * Inhabilitar o volver a habilitar pide un motivo, que queda en el historial
 * junto con quién y cuándo. Aprobar un familiar pendiente no lo pide.
 */
export function ResidentStatusButton({ resident }: { resident: Resident }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const isPendingFamily = !resident.isActive && resident.residentType?.code === 'family'
  const deactivating = resident.isActive
  const name = formatName(resident.name, resident.lastName)

  const mutation = useMutation({
    mutationFn: (why: string) =>
      deactivating ? api.deactivateResident(resident.id, why) : api.activateResident(resident.id, why),
    onSuccess: () => {
      toast.success(deactivating ? 'Residente inhabilitado' : isPendingFamily ? 'Familiar aprobado' : 'Residente habilitado de nuevo')
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
      void queryClient.invalidateQueries({ queryKey: ['change-history'] })
      setOpen(false)
      setReason('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No fue posible cambiar el estado')),
  })

  if (isPendingFamily) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate('Familiar registrado desde la app, aprobado')}
      >
        Aprobar
      </Button>
    )
  }

  const reasonOk = reason.trim().length >= 4
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReason('') }}>
      <DialogTrigger asChild>
        <Button size="sm" variant={deactivating ? 'secondary' : 'outline'} className="h-7 text-xs">
          {deactivating ? 'Inhabilitar' : 'Habilitar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,460px)]">
        <DialogHeader>
          <DialogTitle>{deactivating ? 'Inhabilitar residente' : 'Volver a habilitar'}</DialogTitle>
          <DialogDescription>
            {name} · CC {formatDocument(resident.document)}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4 pt-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (reasonOk) mutation.mutate(reason.trim())
          }}
        >
          <p className="text-sm text-slate-600">
            {deactivating
              ? 'No podrá entrar a la app ni saldrá en el listado. No se borra nada: su historial se conserva y se puede volver a habilitar.'
              : 'Podrá volver a entrar a la app con su misma cuenta y sus mismos apartamentos.'}
          </p>
          {!deactivating && resident.deactivation && (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Lo inhabilitó {resident.deactivation.by ?? 'alguien'} el {formatDate(resident.deactivation.at)}
              {resident.deactivation.reason ? ` · "${resident.deactivation.reason}"` : ''}
            </p>
          )}
          <Field label="Motivo (queda en el historial)">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="min-h-20"
              placeholder={deactivating ? 'Ej.: Vendió el apartamento' : 'Ej.: Se inhabilitó por error'}
              autoFocus
            />
          </Field>
          <Button type="submit" className="self-end" variant={deactivating ? 'destructive' : 'default'} disabled={!reasonOk || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : deactivating ? 'Inhabilitar' : 'Habilitar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Residente → visitante ────────────────────────────────────────────────────

/** Un familiar registrado como residente que en realidad solo visita. */
export function ResidentToVisitorDialog({ resident }: { resident: Resident }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const name = formatName(resident.name, resident.lastName)

  const mutation = useMutation({
    mutationFn: () => api.convertResidentToVisitor(resident.id, reason.trim()),
    onSuccess: () => {
      toast.success(`${name} ahora está como visitante`)
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
      void queryClient.invalidateQueries({ queryKey: ['visitors'] })
      void queryClient.invalidateQueries({ queryKey: ['change-history'] })
      setOpen(false)
      setReason('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No fue posible pasarlo a visitante')),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReason('') }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Pasar a visitante">
          <ArrowRightLeft className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,460px)]">
        <DialogHeader>
          <DialogTitle>Pasar a visitante</DialogTitle>
          <DialogDescription>
            {name} · CC {formatDocument(resident.document)}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4 pt-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (reason.trim().length >= 4) mutation.mutate()
          }}
        >
          <p className="text-sm text-slate-600">
            Queda inhabilitado como residente (no se borra nada) y registrado como visitante con sus mismos datos, para que portería lo registre en cada ingreso.
            Si se muda después, se puede volver a registrar como residente desde Visitantes.
          </p>
          <Field label="Motivo (queda en el historial)">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="min-h-20"
              placeholder="Ej.: Es familiar pero no vive en el apartamento"
              autoFocus
            />
          </Field>
          <Button type="submit" className="self-end" disabled={reason.trim().length < 4 || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Pasar a visitante'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Visitante → residente ────────────────────────────────────────────────────

/** Alguien que vino como visitante (a ver un apartamento, un familiar) y ahora vive aquí. */
export function VisitorToResidentDialog({ visitor }: { visitor: Visitor }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [towerId, setTowerId] = useState('')
  const [apartmentId, setApartmentId] = useState('')
  const [towerOpen, setTowerOpen] = useState(false)
  const [towerSearch, setTowerSearch] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptSearch, setAptSearch] = useState('')
  const [residentTypeId, setResidentTypeId] = useState('')
  const [document, setDocument] = useState(visitor.document ?? '')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(visitor.phone ?? '')
  const [reason, setReason] = useState('')
  const [conflict, setConflict] = useState<ResidentConflictError | null>(null)
  const [result, setResult] = useState<ResidentFromVisitorResult | null>(null)

  const towersQuery = useQuery({ queryKey: ['towers'], queryFn: api.getTowers, enabled: open })
  const apartmentsQuery = useQuery({
    queryKey: ['apartments', towerId],
    queryFn: () => api.getApartments({ towerId, limit: 500 }),
    enabled: open && Boolean(towerId),
  })
  const typesQuery = useQuery({ queryKey: ['resident-types'], queryFn: api.getResidentTypes, enabled: open })
  const towers = towersQuery.data ?? []
  const apartments = (apartmentsQuery.data?.data ?? []).filter((a) => a.towerId === towerId)
  const types = typesQuery.data ?? []

  const reset = () => {
    setTowerId('')
    setApartmentId('')
    setResidentTypeId('')
    setDocument(visitor.document ?? '')
    setEmail('')
    setPhone(visitor.phone ?? '')
    setReason('')
    setConflict(null)
    setResult(null)
  }

  const mutation = useMutation({
    mutationFn: (takeEmailFromInactive: boolean) =>
      api.createResidentFromVisitor(visitor.id, {
        residentTypeId,
        apartmentId,
        document: document.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        reason: reason.trim(),
        takeEmailFromInactive: takeEmailFromInactive || undefined,
      }),
    onSuccess: (data) => {
      setConflict(null)
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
      void queryClient.invalidateQueries({ queryKey: ['change-history'] })
    },
    onError: (err) => {
      const c = residentConflictOf(err)
      if (c) setConflict(c)
      else toast.error(getApiErrorMessage(err, 'No fue posible registrarlo como residente'))
    },
  })

  const name = formatName(visitor.name, visitor.lastName)
  const canSubmit =
    Boolean(residentTypeId && apartmentId && document.trim().length >= 4) && reason.trim().length >= 4 && !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Registrar como residente">
          <UserPlus className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,520px)]">
        <DialogHeader>
          <DialogTitle>Registrar como residente</DialogTitle>
          <DialogDescription>
            {name}
            {visitor.document ? ` · CC ${formatDocument(visitor.document)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4 pt-1">
            <p className="text-sm text-slate-700">
              {result.reactivated
                ? `${name} ya había sido residente: se volvió a habilitar su mismo registro y se le asignó el apartamento.`
                : `${name} quedó registrado como residente.`}{' '}
              El visitante y sus ingresos se conservan.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-slate-800">
                <KeyRound className="size-3.5" /> Contraseña para la app: <span className="font-mono">{result.generatedPassword}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {result.emailSent
                  ? `Se envió al correo ${result.resident.email}.`
                  : result.resident.email
                    ? `No se pudo enviar al correo ${result.resident.email}; entréguesela al residente.`
                    : 'No tiene correo: agréguelo editando el residente para que pueda entrar a la app.'}
              </p>
            </div>
            <Button className="self-end" onClick={() => { setOpen(false); reset() }}>
              Listo
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 pt-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (canSubmit) mutation.mutate(false)
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Torre">
                <FilterableSelect
                  open={towerOpen}
                  onOpenChange={setTowerOpen}
                  value={towerId}
                  displayValue={towers.find((t) => t.id === towerId)?.name ?? ''}
                  placeholder="Selecciona torre"
                  searchPlaceholder="Filtrar torre..."
                  items={towers}
                  getKey={(t) => t.id}
                  getLabel={(t) => t.name}
                  onSelect={(t) => {
                    setTowerId(t.id)
                    setApartmentId('')
                    setTowerOpen(false)
                    setAptOpen(true)
                  }}
                  searchValue={towerSearch}
                  onSearchValueChange={setTowerSearch}
                />
              </Field>
              <Field label="Apartamento">
                <FilterableSelect
                  open={aptOpen}
                  onOpenChange={setAptOpen}
                  value={apartmentId}
                  displayValue={apartmentId ? `Apt. ${apartments.find((a) => a.id === apartmentId)?.number ?? ''}` : ''}
                  placeholder={towerId ? 'Selecciona apt.' : 'Primero torre'}
                  searchPlaceholder="Filtrar..."
                  disabled={!towerId}
                  items={apartments}
                  getKey={(a) => a.id}
                  getLabel={(a) => `Apt. ${a.number}`}
                  onSelect={(a) => {
                    setApartmentId(a.id)
                    setAptOpen(false)
                  }}
                  searchValue={aptSearch}
                  onSearchValueChange={setAptSearch}
                />
              </Field>
            </div>
            <Field label="Tipo de residente">
              <Select value={residentTypeId} onValueChange={setResidentTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cédula">
                <Input value={document} onChange={(e) => { setDocument(e.target.value); setConflict(null) }} placeholder="10203040" />
              </Field>
              <Field label="Teléfono">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="3001234567" />
              </Field>
            </div>
            <Field label="Correo (para entrar a la app)">
              <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setConflict(null) }} placeholder="correo@ejemplo.com" />
            </Field>
            <Field label="Motivo (queda en el historial)">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                className="min-h-16"
                placeholder="Ej.: Compró el apartamento y se mudó"
              />
            </Field>
            {conflict && <ConflictNotice error={conflict} pending={mutation.isPending} onTakeEmail={() => mutation.mutate(true)} />}
            <Button type="submit" className="self-end" disabled={!canSubmit}>
              {mutation.isPending ? 'Guardando…' : 'Registrar como residente'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
