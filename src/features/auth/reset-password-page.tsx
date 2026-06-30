import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Mirrors the backend policy (ConfirmResetDto): min 8 chars, at least one
// letter and one number, max 72 bytes.
function passwordIssues(pwd: string): string[] {
  const issues: string[] = []
  if (pwd.length < 8) issues.push('Al menos 8 caracteres')
  if (!/[A-Za-z]/.test(pwd)) issues.push('Al menos una letra')
  if (!/\d/.test(pwd)) issues.push('Al menos un número')
  if (pwd.length > 72) issues.push('Máximo 72 caracteres')
  return issues
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">{children}</div>
    </div>
  )
}

export function ResetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)

  const validation = useQuery({
    queryKey: ['password-reset-validate', token],
    queryFn: () => api.validatePasswordResetToken(token),
    enabled: token.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const issues = useMemo(() => passwordIssues(password), [password])
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = issues.length === 0 && !mismatch && confirm.length > 0

  const mutation = useMutation({
    mutationFn: () => api.confirmPasswordReset(token, password),
    onSuccess: () => setDone(true),
  })

  if (!token) {
    return (
      <Shell>
        <InvalidState />
      </Shell>
    )
  }

  if (validation.isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="size-7 animate-spin text-slate-400" />
          <p className="text-sm text-muted-foreground">Verificando el enlace…</p>
        </div>
      </Shell>
    )
  }

  if (!validation.data?.valid) {
    return (
      <Shell>
        <InvalidState />
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-green-50">
            <CheckCircle2 className="size-7 text-green-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">¡Contraseña actualizada!</h1>
          <p className="text-sm text-muted-foreground">
            Ya puedes iniciar sesión con tu nueva contraseña desde la app.
          </p>
          <Link to="/login" className="mt-2 text-sm font-medium text-primary hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </Shell>
    )
  }

  const serverMsg = (mutation.error as any)?.response?.data?.message as string | undefined

  return (
    <Shell>
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <div className="grid size-11 place-items-center rounded-full bg-primary/10">
          <KeyRound className="size-5 text-primary" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Crea una nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">
          {validation.data.name ? `Hola ${validation.data.name}, define` : 'Define'} una contraseña segura para tu
          cuenta.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) mutation.mutate()
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Nueva contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-9"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-9"
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
          </div>
          {mismatch && <p className="text-xs text-rose-500">Las contraseñas no coinciden.</p>}
        </div>

        {password.length > 0 && issues.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            {issues.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        )}

        {serverMsg && <p className="text-sm text-rose-500">{serverMsg}</p>}

        <Button type="submit" className="w-full" disabled={!canSubmit || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar nueva contraseña'}
        </Button>
      </form>
    </Shell>
  )
}

function InvalidState() {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-rose-50">
        <ShieldAlert className="size-7 text-rose-500" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">Enlace no válido</h1>
      <p className="text-sm text-muted-foreground">
        Este enlace de restablecimiento no es válido, ya fue usado o expiró. Solicita uno nuevo a la
        administración del conjunto.
      </p>
      <Link to="/login" className="mt-2 text-sm font-medium text-primary hover:underline">
        Volver al inicio
      </Link>
    </div>
  )
}
