import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Shield, UserCheck, Users } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const employeeSchema = z.object({
  name: z.string().min(2),
  lastName: z.string().min(2),
  document: z.string().max(50).optional().or(z.literal('')),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  roleId: z.string().uuid(),
})

export function EmployeesPage() {
  const queryClient = useQueryClient()
  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: api.getEmployees,
  })
  const rolesQuery = useQuery({
    queryKey: ['employee-roles'],
    queryFn: api.getEmployeeRoles,
  })
  const employees = employeesQuery.data ?? []

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      lastName: '',
      document: '',
      username: '',
      password: '',
      roleId: '',
    },
  })
  const selectedRoleId = useWatch({ control: form.control, name: 'roleId' })

  const createMutation = useMutation({
    mutationFn: api.createEmployee,
    onSuccess: () => {
      toast.success('Empleado creado')
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: () => toast.error('No fue posible crear el empleado'),
  })

  return (
    <div className="h-full overflow-y-auto">
      <SectionHeader
        eyebrow="Administracion"
        title="Equipo operativo"
        description="Credenciales, rol y trazabilidad del personal que opera el conjunto."
        action={
          <Dialog>
            <DialogTrigger asChild>
              <Button>Nuevo empleado</Button>
            </DialogTrigger>
            <DialogContent className="w-[min(96vw,760px)]">
              <DialogHeader>
                <DialogTitle>Crear empleado</DialogTitle>
                <DialogDescription>Usuario, contrasena y rol operativo.</DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
              >
                <Field label="Nombre" error={form.formState.errors.name?.message}>
                  <Input {...form.register('name')} placeholder="Carlos" />
                </Field>
                <Field label="Apellido" error={form.formState.errors.lastName?.message}>
                  <Input {...form.register('lastName')} placeholder="Perez" />
                </Field>
                <Field label="Documento" error={form.formState.errors.document?.message}>
                  <Input {...form.register('document')} placeholder="100200300" />
                </Field>
                <Field label="Usuario" error={form.formState.errors.username?.message}>
                  <Input {...form.register('username')} placeholder="porter2" />
                </Field>
                <Field label="Contrasena" error={form.formState.errors.password?.message}>
                  <Input {...form.register('password')} type="password" placeholder="Minimo 6 caracteres" />
                </Field>
                <Field label="Rol" error={form.formState.errors.roleId?.message}>
                  <Select
                    onValueChange={(value) => form.setValue('roleId', value, { shouldValidate: true })}
                    value={selectedRoleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {(rolesQuery.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button className="md:col-span-2" type="submit" disabled={createMutation.isPending}>
                  Guardar empleado
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Equipo"
            value={employees.length}
            detail="Empleados creados en el sistema."
            icon={<Users className="size-5" />}
          />
          <KpiCard
            label="Activos"
            value={employees.filter((employee) => employee.isActive).length}
            detail="Personal habilitado para operar."
            icon={<UserCheck className="size-5" />}
          />
          <KpiCard
            label="Administradores"
            value={employees.filter((employee) => employee.role?.name?.toLowerCase().includes('admin')).length}
            detail="Usuarios con mayor alcance operativo."
            icon={<Shield className="size-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {employees.map((employee) => (
            <Card key={employee.id} className="bg-white">
              <CardHeader className="flex flex-col items-start justify-between gap-4 space-y-0 sm:flex-row">
                <div className="min-w-0">
                  <CardTitle>
                    {employee.name} {employee.lastName}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">@{employee.username}</p>
                </div>
                <Badge>{employee.role?.name ?? 'Sin rol'}</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Identificación</p>
                  <p className="mt-2 text-slate-700">{employee.document ?? 'Sin documento'}</p>
                  <p className="mt-1 text-slate-500">Creado {formatDate(employee.createdAt)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado</p>
                  <p className="mt-2 font-medium text-slate-900">{employee.isActive ? 'Activo' : 'Inactivo'}</p>
                  <p className="mt-1 text-slate-500">Rol operativo asignado</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
