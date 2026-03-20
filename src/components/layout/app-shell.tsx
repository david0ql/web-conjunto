import { ChevronRight, Command, LogOut, Waves } from 'lucide-react'
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
        className={cn(
          'sidebar-item',
          nested && 'py-1.5 pl-3 text-[13px]',
          active && 'active',
        )}
      >
        {Icon && !nested ? <Icon className="size-4" /> : null}
        <span className="flex-1">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} items={items} />

      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
        <div className="flex h-13 items-center border-b border-border px-4">
          <Link to={homeRoute} className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary">
              <Waves className="size-3.5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">Conjunto Admin</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Operación activa
              </span>
            </div>
          </Link>
        </div>

        <button
          className="sidebar-command-trigger mx-3 mt-3"
          type="button"
          onClick={() => setCommandOpen(true)}
        >
          <Command className="size-3.5" />
          <span className="flex-1 text-left">Buscar sección...</span>
          <kbd className="sidebar-command-kbd">⌘K</kbd>
        </button>

        <div className="mx-3 mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8 border-border">
              <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div>
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
              <p className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  if (isNavGroup(item)) {
                    const active = item.children.some((child) => child.to === location.pathname)

                    return (
                      <details key={item.label} open={active} className="submenu-group space-y-1">
                        <summary className={cn('sidebar-item cursor-pointer list-none', active && 'active')}>
                          <item.icon className="size-4" />
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight className="submenu-chevron size-3.5" />
                        </summary>
                        <div className="ml-3 space-y-1 border-l border-border/80 pl-2">
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
            className="sidebar-item w-full text-left text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            type="button"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="ml-64 flex flex-1 flex-col overflow-hidden bg-[#f5f5f5]">
        <Outlet />
      </main>
    </div>
  )
}
