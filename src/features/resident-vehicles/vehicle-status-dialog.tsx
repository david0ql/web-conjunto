import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-errors'
import { normalizePlate } from '@/lib/utils'
import type { ResidentVehicle } from '@/types/api'

/**
 * Inhabilita una placa que ya no es del apartamento (propietario anterior, o
 * era de una visita) o la vuelve a habilitar. No se borra: portería deja de
 * reconocerla y sale de la lista del apartamento; queda en el historial con
 * motivo, quién y cuándo. `compact` es el botón de ícono del panel del apartamento.
 */
export function VehicleStatusDialog({ vehicle, compact = false }: { vehicle: ResidentVehicle; compact?: boolean }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const disabling = vehicle.isActive !== false
  const plate = normalizePlate(vehicle.plate)
  const where = vehicle.apartment
    ? `${vehicle.apartment.towerData?.name ?? 'Torre —'} · Apt. ${vehicle.apartment.number}`
    : 'el apartamento'

  const mutation = useMutation({
    mutationFn: () =>
      disabling
        ? api.residentVehicleToVisitor(vehicle.id, reason.trim())
        : api.reactivateResidentVehicle(vehicle.id, reason.trim()),
    onSuccess: () => {
      toast.success(disabling ? `Placa ${plate} inhabilitada` : `Placa ${plate} habilitada de nuevo`)
      setOpen(false)
      setReason('')
      void queryClient.invalidateQueries({ queryKey: ['resident-vehicles'] })
      void queryClient.invalidateQueries({ queryKey: ['change-history', 'resident_vehicle'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No fue posible cambiar la placa')),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setReason('') }}>
      <DialogTrigger asChild>
        {compact ? (
          <button
            type="button"
            title="Inhabilitar placa"
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Ban className="size-3.5" />
          </button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
            {disabling ? 'Inhabilitar' : 'Habilitar'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,480px)]">
        <DialogHeader>
          <DialogTitle>{disabling ? `Inhabilitar placa ${plate}` : `Habilitar placa ${plate}`}</DialogTitle>
          <DialogDescription>{disabling ? `Hoy está como vehículo de ${where}.` : `Antes era de ${where}.`}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (reason.trim().length >= 4) mutation.mutate() }}
        >
          <p className="text-sm text-slate-600">
            {disabling
              ? `Deja de salir en ${where} y portería ya no la reconoce como de ese apartamento; si vuelve a entrar, se registra como visita. No se borra nada: queda en el historial y se puede volver a habilitar.`
              : `Portería la volverá a reconocer como vehículo de ${where}. Si es de otro apartamento, después use Reasignar.`}
          </p>
          <Field label="Motivo (queda en el historial)">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={disabling ? 'Ej.: Era del propietario anterior' : 'Ej.: Se inhabilitó por error'}
              autoFocus
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant={disabling ? 'destructive' : 'default'} disabled={reason.trim().length < 4 || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : disabling ? 'Inhabilitar' : 'Habilitar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
