export interface SessionUser {
  id: string
  name: string
  lastName: string
  type: 'resident' | 'employee'
  permissions: string[]
  createdAt?: string
  email?: string | null
  phone?: string | null
  document?: string | null
  username?: string
  role?: string
  roleLabel?: string
  residentType?: string
  residentTypeLabel?: string
}

export interface AuthResponse {
  accessToken: string
  user: SessionUser
}

export interface CatalogOption {
  id: string
  code?: string
  name: string
  description?: string | null
}

export interface Resident {
  id: string
  name: string
  lastName: string
  document: string
  phone?: string | null
  email?: string | null
  isActive: boolean
  createdAt: string
  residentTypeId: string
  residentType?: CatalogOption
  apartmentId?: string | null
  apartment?: Apartment
}

export interface Employee {
  id: string
  name: string
  lastName: string
  document?: string | null
  username: string
  isActive: boolean
  createdAt: string
  roleId: string
  role?: CatalogOption
}

export interface Apartment {
  id: string
  number: string
  towerId: string
  tower?: string | null
  floor?: number | null
  area?: number | null
  createdAt: string
  statusId: string
  status?: CatalogOption
  towerData?: Tower
}

export interface Tower {
  id: string
  code: string
  name: string
  totalFloors: number
  apartmentsPerFloor: number
  isActive: boolean
  createdAt: string
}

export interface Reservation {
  id: string
  residentId: string
  areaId: string
  reservationDate: string
  startTime: string
  endTime: string
  statusId: string
  notesByAdministrator?: string | null
  notesByResident?: string | null
  createdAt: string
  resident?: Resident
  area?: CatalogOption
  status?: CatalogOption
}

export interface NotificationItem {
  id: string
  residentId: string
  notificationTypeId: string
  message: string
  isRead: boolean
  createdAt: string
  notificationType?: CatalogOption
}

export interface PackageItem {
  id: string
  residentId: string
  description?: string | null
  arrivalTime: string
  delivered: boolean
  deliveredTime?: string | null
  receivedByResidentId?: string | null
  createdByEmployeeId?: string | null
  resident?: Resident
  createdByEmployee?: Employee
}

export interface Visitor {
  id: string
  name: string
  lastName: string
  document?: string | null
  phone?: string | null
  createdAt: string
}

export interface AccessAudit {
  id: string
  residentId?: string | null
  visitorId?: string | null
  vehicleId?: string | null
  apartmentId?: string | null
  authorizedByEmployeeId?: string | null
  entryTime: string
  exitTime?: string | null
  notes?: string | null
  resident?: Resident
  visitor?: Visitor
  apartment?: Apartment
  authorizedByEmployee?: Employee
}

export interface PoolEntry {
  id: string
  apartmentId: string
  guestCount: number
  entryTime: string
  createdByEmployeeId?: string | null
  notes?: string | null
  apartment?: Apartment
  residents?: Resident[]
  residentLinks?: Array<{ id: string; residentId: string; resident?: Resident }>
  guests?: Array<{ id: string; name: string }>
}

export interface PoolResidentSearchResult {
  apartment: Apartment
  residents: Resident[]
}

export interface PoolSummary {
  entriesToday: number
  guestsToday: number
  entriesInRange: number
  guestsInRange: number
  uniqueResidents: number
}
