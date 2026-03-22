import { ChevronRight, Command, LogOut, Menu, PanelLeftClose, Waves, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getAllowedLeafNavigation, getAllowedNavigation } from '@/app/permissions'
import { CommandMenu } from '@/components/layout/command-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth-context'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { isNavGroup, type NavLeaf } from '@/types/navigation'

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [commandOpen, setCommandOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  if (!user) return null

  const sections = getAllowedNavigation(user)
  const items = getAllowedLeafNavigation(user)
  const initials = `${user.name.charAt(0)}${user.lastName.charAt(0)}`
  const homeRoute = items[0]?.to ?? '/app/pool/control'

  function renderLeaf(item: NavLeaf, nested = false) {
    const Icon = item.icon
    const active = location.pathname === item.to

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'sidebar-item',
          sidebarCollapsed && !nested && 'justify-center px-2',
          nested && 'py-1.5 pl-3 text-[13px]',
          active && 'active',
        )}
        title={sidebarCollapsed ? item.label : undefined}
      >
        {Icon && !nested ? <Icon className="size-4" /> : null}
        <span className={cn('flex-1', sidebarCollapsed && !nested && 'hidden')}>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} items={items} />

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-[88px]' : 'w-72',
        )}
      >
        <div className={cn('flex items-center border-b border-border px-4', sidebarCollapsed ? 'h-16 justify-center px-3' : 'h-16 justify-between')}>
          <Link to={homeRoute} className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary">
              <Waves className="size-3.5 text-primary-foreground" />
            </div>
            <div className={cn('leading-tight', sidebarCollapsed && 'hidden')}>
              <span className="block text-sm font-semibold tracking-tight">Conjunto Admin</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Operación activa
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              className="hidden rounded-md p-2 text-muted-foreground transition hover:bg-slate-100 hover:text-foreground lg:inline-flex"
              onClick={() => setSidebarCollapsed((current) => !current)}
            >
              <PanelLeftClose className={cn('size-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
            </button>
            <button
              type="button"
              aria-label="Cerrar menú"
              className="rounded-md p-2 text-muted-foreground transition hover:bg-slate-100 hover:text-foreground lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <button
          className={cn('sidebar-command-trigger mx-3 mt-3', sidebarCollapsed && 'justify-center px-0')}
          type="button"
          onClick={() => setCommandOpen(true)}
        >
          <Command className="size-3.5" />
          <span className={cn('flex-1 text-left', sidebarCollapsed && 'hidden')}>Buscar sección...</span>
          <kbd className={cn('sidebar-command-kbd', sidebarCollapsed && 'hidden')}>⌘K</kbd>
        </button>

        <div className={cn('mx-3 mt-3 rounded-lg border border-slate-200 bg-white p-3', sidebarCollapsed && 'px-2')}>
          <div className={cn('flex items-center gap-2.5', sidebarCollapsed && 'justify-center')}>
            <Avatar className="size-8 border-border">
              <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className={cn(sidebarCollapsed && 'hidden')}>
              <p className="text-sm font-semibold leading-none">
                {user.name} {user.lastName}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{ROLE_LABELS[user.role ?? ''] ?? 'Empleado'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {sections.map((section) => (
            <div key={section.label} className="space-y-2">
              <p className={cn('px-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground', sidebarCollapsed && 'hidden')}>
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  if (isNavGroup(item)) {
                    const active = item.children.some((child) => child.to === location.pathname)

                    return (
                      <details key={item.label} open={active} className="submenu-group space-y-1">
                        <summary
                          className={cn(
                            'sidebar-item cursor-pointer list-none',
                            sidebarCollapsed && 'justify-center px-2',
                            active && 'active',
                          )}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <item.icon className="size-4" />
                          <span className={cn('flex-1', sidebarCollapsed && 'hidden')}>{item.label}</span>
                          <ChevronRight className={cn('submenu-chevron size-3.5', sidebarCollapsed && 'hidden')} />
                        </summary>
                        <div className={cn('ml-3 space-y-1 border-l border-border/80 pl-2', sidebarCollapsed && 'hidden')}>
                          {item.children.map((child) => renderLeaf(child, true))}
                        </div>
                      </details>
                    )
                  }

                  return renderLeaf(item)
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            className={cn(
              'sidebar-item w-full text-left text-rose-700 hover:bg-rose-50 hover:text-rose-800',
              sidebarCollapsed && 'justify-center px-2 text-center',
            )}
            type="button"
            title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            <LogOut className="size-4" />
            <span className={cn(sidebarCollapsed && 'hidden')}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className={cn('flex min-h-screen min-w-0 flex-1 flex-col bg-[#f5f5f5] transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-72')}>
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Abrir menú"
            className="inline-flex rounded-md border border-border bg-background p-2 text-foreground shadow-sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Conjunto Admin</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role ?? ''] ?? 'Empleado'}</p>
          </div>
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
