import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Shield, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
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
import { formatDate, formatName } from '@/lib/utils'
import { toast } from 'sonner'
import type { Employee } from '@/types/api'

const usernameSchema = z
  .string()
  .min(3, 'Mínimo 3 caracteres')
  .max(50)
  .regex(/^[^@]+$/, 'El usuario no puede contener @ (reservado para residentes)')

const employeeSchema = z.object({
  name: z.string().min(2),
  lastName: z.string().min(2),
  document: z.string().max(50).optional().or(z.literal('')),
  username: usernameSchema,
  password: z.string().min(6),
  roleId: z.string().uuid(),
})

const credentialsSchema = z.object({
  username: usernameSchema,
  // En blanco = no cambiar la contraseña.
  password: z.string().min(6, 'Mínimo 6 caracteres').or(z.literal('')),
})

function EditCredentialsDialog({ employee }: { employee: Employee }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const form = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { username: employee.username, password: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof credentialsSchema>) =>
      api.updateEmployee(employee.id, {
        username: values.username,
        ...(values.password ? { password: values.password } : {}),
      }),
    onSuccess: () => {
      toast.success('Credenciales actualizadas')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: () => toast.error('No fue posible actualizar las credenciales'),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) form.reset({ username: employee.username, password: '' })
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <KeyRound className="size-3.5" /> Credenciales
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,420px)]">
        <DialogHeader>
          <DialogTitle>Credenciales de {formatName(employee.name, employee.lastName)}</DialogTitle>
          <DialogDescription>Cambia el usuario o la contraseña de acceso.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Usuario" error={form.formState.errors.username?.message}>
            <Input {...form.register('username')} placeholder="porter2" autoComplete="off" />
          </Field>
          <Field label="Nueva contraseña" error={form.formState.errors.password?.message}>
            <Input
              {...form.register('password')}
              type="password"
              autoComplete="new-password"
              placeholder="Dejar en blanco para no cambiar"
            />
          </Field>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            Guardar credenciales
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EmployeesPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({})

  const employeesQuery = useQuery({
    queryKey: ['employees', page, search, tableFilters],
    queryFn: () => api.getEmployees({ page, limit: 15, search: search || undefined, ...tableFilters }),
    placeholderData: keepPreviousData,
  })
  const rolesQuery = useQuery({
    queryKey: ['employee-roles'],
    queryFn: api.getEmployeeRoles,
  })
  const employees = employeesQuery.data?.data ?? []

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', lastName: '', document: '', username: '', password: '', roleId: '' },
  })
  const selectedRoleId = useWatch({ control: form.control, name: 'roleId' })

  const createMutation = useMutation({
    mutationFn: api.createEmployee,
    onSuccess: () => {
      toast.success('Empleado creado')
      setCreateOpen(false)
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
            {formatName(row.name, row.lastName)}
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
        <div className="flex justify-end gap-1.5">
          <EditCredentialsDialog employee={row} />
          <Button
            size="sm"
            variant={row.isActive ? 'secondary' : 'outline'}
            className="h-7 text-xs"
            onClick={() => toggleActiveMutation.mutate({ id: row.id, isActive: row.isActive })}
            disabled={toggleActiveMutation.isPending}
          >
            {row.isActive ? 'Inactivar' : 'Activar'}
          </Button>
        </div>
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
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) form.reset()
            }}
          >
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
            value={employeesQuery.data?.meta.total ?? 0}
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
          serverSide
          totalItems={employeesQuery.data?.meta.total}
          currentPage={page}
          onPageChange={setPage}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          onFiltersChange={(v) => { setTableFilters(v); setPage(1) }}
        />
      </div>
    </div>
  )
}
