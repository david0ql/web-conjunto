import { navigation } from '@/app/navigation'
import { isNavGroup, type NavGroup, type NavLeaf, type NavSection } from '@/types/navigation'
import type { SessionUser } from '@/types/api'

function canAccessEntry(user: SessionUser, item: NavLeaf | NavGroup) {
  if (!item.roles.includes(user.type)) {
    return false
  }

  if (user.type === 'employee' && item.employeeRoles?.length) {
    return Boolean(user.role && item.employeeRoles.includes(user.role))
  }

  return true
}

function filterLeaf(user: SessionUser, item: NavLeaf) {
  return canAccessEntry(user, item) ? item : null
}

function filterSection(user: SessionUser, section: NavSection): NavSection | null {
  const items = section.items
    .map((item) => {
      if (isNavGroup(item)) {
        if (!canAccessEntry(user, item)) return null

        const children = item.children.map((child) => filterLeaf(user, child)).filter(Boolean) as NavLeaf[]
        return children.length > 0 ? { ...item, children } : null
      }

      return filterLeaf(user, item)
    })
    .filter(Boolean) as NavSection['items']

  return items.length > 0 ? { ...section, items } : null
}

export function getAllowedNavigation(user: SessionUser) {
  return navigation.map((section) => filterSection(user, section)).filter(Boolean) as NavSection[]
}

export function getAllowedLeafNavigation(user: SessionUser) {
  return getAllowedNavigation(user).flatMap((section) =>
    section.items.flatMap((item) =>
      isNavGroup(item)
        ? item.children.map((child) => ({
            ...child,
            sectionLabel: section.label,
            parentLabel: item.label,
          }))
        : [{ ...item, sectionLabel: section.label }],
    ),
  )
}

export function canAccessItem(user: SessionUser, path: string) {
  return getAllowedLeafNavigation(user).some((item) => item.to === path)
}

export function getDefaultRoute(user: SessionUser) {
  return getAllowedLeafNavigation(user)[0]?.to ?? '/login'
}
