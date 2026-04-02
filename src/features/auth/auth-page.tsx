import { startTransition, useState } from 'react'
import { ActivitySquare, ClipboardList, Eye, EyeOff, Lock, Shield, Waves } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { getDefaultRoute } from '@/app/permissions'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const employeeSchema = z.object({
  username: z.string().min(3, 'Ingresa el usuario'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
})

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const employeeForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { username: '', password: '' },
  })

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando sesion...</div>
  }

  if (user?.type === 'employee') {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    const target = from?.startsWith('/app') ? from : getDefaultRoute(user)
    return <Navigate to={target} replace />
  }

  const submitEmployee = employeeForm.handleSubmit(async (values) => {
    try {
      const response = await api.loginEmployee(values)
      startTransition(() => login(response))
      toast.success('Ingreso exitoso')
      navigate(getDefaultRoute(response.user), { replace: true })
    } catch {
      toast.error('Credenciales invalidas')
    }
  })

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary-foreground/10">
            <Waves className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-primary-foreground">Conjunto Admin</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium text-primary-foreground/80">
              <Shield className="size-3.5" />
              Portal del equipo operativo
            </div>
            <h2 className="text-4xl font-bold leading-tight text-primary-foreground">
              control claro,
              <br />
              una sola operación.
            </h2>
            <p className="max-w-sm text-base leading-relaxed text-primary-foreground/65">
              Administra residentes, notificaciones, portería, piscina y reportes desde un panel sobrio y profesional.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Administrador', value: 'Control total', icon: <Shield className="size-4" /> },
              { label: 'Portería', value: 'Accesos y paquetes', icon: <ActivitySquare className="size-4" /> },
              { label: 'Piscina', value: 'Ingreso nominal', icon: <Waves className="size-4" /> },
              { label: 'Reportes', value: 'PDF por fechas', icon: <ClipboardList className="size-4" /> },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-4"
              >
                <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-primary-foreground/8 text-primary-foreground">
                  {item.icon}
                </div>
                <div className="text-sm font-semibold text-primary-foreground">{item.value}</div>
                <div className="text-xs text-primary-foreground/50">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/30">Conjunto · operación interna</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary">
              <Waves className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Conjunto Admin</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                <Lock className="size-3.5 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Portal de administración
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground">Acceso exclusivo para empleados autorizados</p>
          </div>

          <form onSubmit={submitEmployee} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.42)]">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="username"
                {...employeeForm.register('username')}
                placeholder="admin / porter1 / pool1"
              />
              {employeeForm.formState.errors.username ? (
                <p className="text-xs text-destructive">{employeeForm.formState.errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  {...employeeForm.register('password')}
                  className="pr-10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="******"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {employeeForm.formState.errors.password ? (
                <p className="text-xs text-destructive">{employeeForm.formState.errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={employeeForm.formState.isSubmitting}>
              Iniciar sesión en el portal
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
