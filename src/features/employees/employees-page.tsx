import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Shield, UserCheck, Users } from 'lucide-react'
import { z } from 'zod'
import { SectionHeader } from '@/components/layout/section-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/forms/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type ColumnDef, type FilterDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Employee } from '@/types/api'

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
    defaultValues: { name: '', lastName: '', document: '', username: '', password: '', roleId: '' },
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

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? api.deactivateEmployee(id) : api.activateEmployee(id),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'Empleado inactivado' : 'Empleado activado')
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: () => toast.error('No fue posible cambiar el estado'),
  })

  const roleFilterOptions = (rolesQuery.data ?? []).map((r) => ({ value: r.id, label: r.name }))

  const filters: FilterDef[] = [
    ...(roleFilterOptions.length > 0
      ? [{ key: 'roleId', placeholder: 'Rol', options: roleFilterOptions }]
      : []),
    {
      key: 'isActive',
      placeholder: 'Estado',
      options: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Inactivo' },
      ],
    },
  ]

  const columns: ColumnDef<Employee>[] = [
    {
      header: 'Empleado',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.name} {row.lastName}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">@{row.username}</p>
        </div>
      ),
    },
    {
      header: 'Documento',
      cell: (row) => <span className="text-slate-600">{row.document ?? '—'}</span>,
    },
    {
      header: 'Rol',
      cell: (row) => (
        <span className="text-slate-600">{row.role?.name ?? '—'}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={row.isActive ? 'Activo' : 'Inactivo'}
          variant={row.isActive ? 'green' : 'slate'}
        />
      ),
    },
    {
      header: 'Desde',
      cell: (row) => (
        <span className="whitespace-nowrap text-xs text-slate-400">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <Button
          size="sm"
          variant={row.isActive ? 'secondary' : 'outline'}
          className="h-7 text-xs"
          onClick={() => toggleActiveMutation.mutate({ id: row.id, isActive: row.isActive })}
          disabled={toggleActiveMutation.isPending}
        >
          {row.isActive ? 'Inactivar' : 'Activar'}
        </Button>
      ),
    },
  ]

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

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <KpiCard
            label="Equipo"
            value={employees.length}
            detail="Empleados creados en el sistema."
            icon={<Users className="size-5" />}
          />
          <KpiCard
            label="Activos"
            value={employees.filter((e) => e.isActive).length}
            detail="Personal habilitado para operar."
            icon={<UserCheck className="size-5" />}
          />
          <KpiCard
            label="Administradores"
            value={employees.filter((e) => e.role?.name?.toLowerCase().includes('admin')).length}
            detail="Usuarios con mayor alcance operativo."
            icon={<Shield className="size-5" />}
          />
        </div>

        <DataTable
          data={employees}
          columns={columns}
          searchPlaceholder="Buscar nombre, usuario o documento..."
          getSearchText={(row) =>
            [row.name, row.lastName, row.username, row.document, row.role?.name].filter(Boolean).join(' ')
          }
          filters={filters}
          getFilterValues={(row) => ({
            roleId: row.roleId,
            isActive: String(row.isActive),
          })}
          isLoading={employeesQuery.isLoading}
          emptyMessage="Sin empleados registrados."
        />
      </div>
    </div>
  )
}
