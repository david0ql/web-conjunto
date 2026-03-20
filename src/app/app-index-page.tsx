import { useEffect } from 'react'
import { BarChart3, Waves } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getDefaultRoute } from '@/app/permissions'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth-context'

export function AppIndexPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    navigate(getDefaultRoute(user), { replace: true })
  }, [navigate, user])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#f5f5f5] p-6">
      <Card className="w-full max-w-xl bg-white">
        <CardContent className="p-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              {user.role === 'pool_attendant' ? <Waves className="size-4" /> : <BarChart3 className="size-4" />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Accediendo al panel</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                {user.role === 'pool_attendant' ? 'Cargando reportes de piscina' : 'Preparando tu espacio de trabajo'}
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/3 rounded-full bg-slate-950" />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Estamos llevando tu sesión al módulo correcto según tu rol para que no aterrices en una pantalla vacía.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
