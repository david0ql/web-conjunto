import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, LayoutList, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { isNavGroup, type NavSection } from '@/types/navigation'
import { cn } from '@/lib/utils'

interface SortableItemProps {
  id: string
  label: string
  depth?: number
}

function SortableItem({ id, label, depth = 0 }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm select-none',
        depth > 0 && 'ml-6 bg-slate-50',
        isDragging && 'opacity-50 shadow-md z-50',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        aria-label="Arrastrar"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1 text-slate-700">{label}</span>
    </div>
  )
}

interface SectionEditorProps {
  section: NavSection
  itemOrder: string[]
  onItemsReorder: (sectionLabel: string, items: string[]) => void
}

function SectionEditor({ section, itemOrder, onItemsReorder }: SectionEditorProps) {
  const [open, setOpen] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = itemOrder.indexOf(String(active.id))
      const newIndex = itemOrder.indexOf(String(over.id))
      onItemsReorder(section.label, arrayMove(itemOrder, oldIndex, newIndex))
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-slate-500 hover:bg-slate-100"
      >
        {section.label}
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>
      {open && (
        <div className="space-y-1.5 p-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itemOrder} strategy={verticalListSortingStrategy}>
              {itemOrder.map((label) => {
                const item = section.items.find((i) => i.label === label)
                if (!item) return null
                return (
                  <div key={label} className="space-y-1">
                    <SortableItem id={label} label={isNavGroup(item) ? `${label} (grupo)` : label} />
                  </div>
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

interface SidebarOrderEditorProps {
  sections: NavSection[]
  onSave: (sectionOrder: string[], itemOrder: Record<string, string[]>) => void
  onReset: () => void
}

export function SidebarOrderEditor({ sections, onSave, onReset }: SidebarOrderEditorProps) {
  const [open, setOpen] = useState(false)

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => sections.map((s) => s.label))
  const [itemOrders, setItemOrders] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(sections.map((s) => [s.label, s.items.map((i) => i.label)])),
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(String(active.id))
      const newIndex = sectionOrder.indexOf(String(over.id))
      setSectionOrder((prev) => arrayMove(prev, oldIndex, newIndex))
    }
  }

  function handleItemsReorder(sectionLabel: string, newOrder: string[]) {
    setItemOrders((prev) => ({ ...prev, [sectionLabel]: newOrder }))
  }

  function handleOpen() {
    setSectionOrder(sections.map((s) => s.label))
    setItemOrders(Object.fromEntries(sections.map((s) => [s.label, s.items.map((i) => i.label)])))
    setOpen(true)
  }

  function handleSave() {
    onSave(sectionOrder, itemOrders)
    setOpen(false)
  }

  function handleReset() {
    onReset()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Editar orden del menú"
        title="Editar orden del menú"
        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
      >
        <LayoutList className="size-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(96vw,480px)] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-slate-100">
            <DialogTitle>Organizar menú</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-slate-500">Arrastra las secciones para reordenarlas, luego organiza los elementos dentro de cada una.</p>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Secciones</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {sectionOrder.map((label) => (
                      <SortableItem key={label} id={label} label={label} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Elementos por sección</p>
              <div className="space-y-2">
                {sectionOrder.map((label) => {
                  const section = sections.find((s) => s.label === label)
                  if (!section) return null
                  return (
                    <SectionEditor
                      key={label}
                      section={section}
                      itemOrder={itemOrders[label] ?? section.items.map((i) => i.label)}
                      onItemsReorder={handleItemsReorder}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="size-3.5" />
              Restaurar orden
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
