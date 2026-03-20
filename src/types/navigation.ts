import type { LucideIcon } from 'lucide-react'

interface NavAccess {
  roles: Array<'resident' | 'employee'>
  employeeRoles?: string[]
}

export interface NavLeaf extends NavAccess {
  to: string
  label: string
  description: string
  icon?: LucideIcon
  keywords?: string[]
}

export interface NavGroup extends NavAccess {
  type: 'group'
  label: string
  description: string
  icon: LucideIcon
  children: NavLeaf[]
}

export interface NavSection {
  label: string
  items: Array<NavLeaf | NavGroup>
}

export function isNavGroup(item: NavLeaf | NavGroup): item is NavGroup {
  return 'children' in item
}
