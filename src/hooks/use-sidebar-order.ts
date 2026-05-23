import { useCallback, useState } from 'react'
import type { NavSection } from '@/types/navigation'

const STORAGE_KEY = 'sidebar-order-v1'

interface SidebarOrder {
  sections: string[]
  items: Record<string, string[]>
}

function loadOrder(): SidebarOrder | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SidebarOrder) : null
  } catch {
    return null
  }
}

function saveOrder(order: SidebarOrder) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
}

export function clearSidebarOrder() {
  localStorage.removeItem(STORAGE_KEY)
}

export function applyOrder(sections: NavSection[], order: SidebarOrder | null): NavSection[] {
  if (!order) return sections

  const sectionMap = new Map(sections.map((s) => [s.label, s]))

  const sorted = order.sections
    .map((label) => sectionMap.get(label))
    .filter((s): s is NavSection => Boolean(s))

  const unseen = sections.filter((s) => !order.sections.includes(s.label))
  const allSections = [...sorted, ...unseen]

  return allSections.map((section) => {
    const itemOrder = order.items[section.label]
    if (!itemOrder) return section

    const itemMap = new Map(section.items.map((item) => [item.label, item]))
    const sortedItems = itemOrder
      .map((label) => itemMap.get(label))
      .filter((item): item is NavSection['items'][number] => Boolean(item))
    const unseenItems = section.items.filter((item) => !itemOrder.includes(item.label))
    return { ...section, items: [...sortedItems, ...unseenItems] }
  })
}

export function useSidebarOrder() {
  const [order, setOrderState] = useState<SidebarOrder | null>(loadOrder)

  const persistOrder = useCallback((newOrder: SidebarOrder) => {
    saveOrder(newOrder)
    setOrderState(newOrder)
  }, [])

  const resetOrder = useCallback(() => {
    clearSidebarOrder()
    setOrderState(null)
  }, [])

  return { order, persistOrder, resetOrder }
}
