import { useEffect, useEffectEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import type { NavLeaf } from '@/types/navigation'

interface CommandMenuItem extends NavLeaf {
  sectionLabel: string
  parentLabel?: string
}

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CommandMenuItem[]
}

export function CommandMenu({ open, onOpenChange, items }: CommandMenuProps) {
  const navigate = useNavigate()

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      onOpenChange(!open)
    }
  })

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const groupedItems = items.reduce<Record<string, CommandMenuItem[]>>((groups, item) => {
    const key = item.parentLabel ? `${item.sectionLabel} · ${item.parentLabel}` : item.sectionLabel
    const currentItems = groups[key] ?? []
    groups[key] = [...currentItems, item]
    return groups
  }, {})

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar modulo, formulario o reporte..." />
      <CommandList>
        <CommandEmpty>Sin resultados para esa busqueda.</CommandEmpty>
        {Object.entries(groupedItems).map(([group, groupItems]) => (
          <CommandGroup key={group} heading={group}>
            {groupItems.map((item) => {
              const Icon = item.icon

              return (
                <CommandItem
                  key={item.to}
                  value={`${item.label} ${item.description}`}
                  keywords={item.keywords}
                  onSelect={() => {
                    onOpenChange(false)
                    navigate(item.to)
                  }}
                >
                  <div className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                    {Icon ? <Icon className="size-4" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                  <CommandShortcut>{item.parentLabel ?? item.sectionLabel}</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
