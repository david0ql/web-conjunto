import { useEffect, useRef } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

export type FilterableSelectProps<T> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  displayValue: string
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  items: T[]
  disabled?: boolean
  getKey: (item: T) => string
  getLabel: (item: T) => string
  onSelect: (item: T) => void
  searchValue: string
  onSearchValueChange: (v: string) => void
}

export function FilterableSelect<T>({
  open,
  onOpenChange,
  value,
  displayValue,
  placeholder = 'Selecciona...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados.',
  items,
  disabled,
  getKey,
  getLabel,
  onSelect,
  searchValue,
  onSearchValueChange,
}: FilterableSelectProps<T>) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
    else onSearchValueChange('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition outline-none',
          'focus:ring-2 focus:ring-slate-950/8 disabled:cursor-not-allowed disabled:opacity-50',
          !displayValue && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground ml-2" />
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-md border border-slate-200 bg-white shadow-lg">
            <Command
              value={searchValue}
              onValueChange={onSearchValueChange}
              className={cn(
                'w-full bg-transparent',
                '[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-slate-200',
                '[&_[cmdk-item]]:rounded-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5',
                '[&_[cmdk-item][data-selected=true]]:bg-slate-100',
              )}
            >
              <CommandInput ref={inputRef} placeholder={searchPlaceholder} className="h-9 rounded-none" />
              <CommandList className="max-h-52 overflow-y-auto p-1">
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                {items.map((item) => {
                  const key = getKey(item)
                  const label = getLabel(item)
                  return (
                    <CommandItem
                      key={key}
                      value={label}
                      onSelect={() => {
                        onSelect(item)
                        onOpenChange(false)
                      }}
                      className="flex w-full items-center justify-between"
                    >
                      <span className="truncate">{label}</span>
                      <Check className={cn('size-4 shrink-0 ml-2', value === key ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  )
                })}
              </CommandList>
            </Command>
          </div>
        </>
      )}
    </div>
  )
}
