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

export interface VehicleBrand {
  id: string
  name: string
  createdAt: string
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

export interface ResidentStats {
  total: number
  active: number
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
  residentCount?: number
  towerData?: Tower
}

export interface ApartmentStats {
  total: number
  occupied: number
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
  apartmentId?: string | null
  residentId?: string | null
  notificationTypeId: string
  message: string
  isRead: boolean
  createdAt: string
  apartment?: Apartment
  resident?: Resident
  notificationType?: CatalogOption
}

export interface PackagePhoto {
  id: string
  packageId: string
  filePath: string
  createdAt: string
}

export interface PackageItem {
  id: string
  apartmentId?: string | null
  residentId?: string | null
  description?: string | null
  arrivalTime: string
  delivered: boolean
  deliveredTime?: string | null
  receivedByResidentId?: string | null
  createdByEmployeeId?: string | null
  apartment?: Apartment
  resident?: Resident
  createdByEmployee?: Employee
  photoCount?: number
}

export interface Visitor {
  id: string
  name: string
  lastName: string
  document?: string | null
  phone?: string | null
  createdAt: string
}

export interface VisitorLastAccessSnapshot {
  id: string
  entryType: 'pedestrian' | 'car' | 'motorcycle' | 'other'
  vehicleBrandId?: string | null
  vehicleColor?: string | null
  vehiclePlate?: string | null
  vehicleModel?: string | null
  visitorPhotoPath?: string | null
  entryTime: string
  vehicleBrand?: VehicleBrand | null
}

export interface VisitorSearchResult {
  visitor: Visitor | null
  lastAccess: VisitorLastAccessSnapshot | null
}

export interface AccessAudit {
  id: string
  residentId?: string | null
  visitorId?: string | null
  vehicleId?: string | null
  entryType: 'pedestrian' | 'car' | 'motorcycle' | 'other'
  vehicleBrandId?: string | null
  vehicleColor?: string | null
  vehiclePlate?: string | null
  vehicleModel?: string | null
  visitorPhotoPath?: string | null
  apartmentId?: string | null
  authorizedByEmployeeId?: string | null
  entryTime: string
  exitTime?: string | null
  notes?: string | null
  resident?: Resident
  visitor?: Visitor
  vehicleBrand?: VehicleBrand | null
  apartment?: Apartment
  authorizedByEmployee?: Employee
}

export interface FineType {
  id: string
  name: string
  value: number
  createdAt: string
  createdByEmployeeId?: string | null
  createdByEmployee?: Employee | null
}

export interface Fine {
  id: string
  residentId?: string | null
  apartmentId?: string | null
  fineTypeId: string
  amount: number
  notes?: string | null
  createdByEmployeeId: string
  createdAt: string
  resident?: Resident | null
  apartment?: Apartment | null
  fineType?: FineType
  createdByEmployee?: Employee
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

export interface NewsCategory {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

export interface NewsItem {
  id: string
  title: string
  content: string
  publishedAt: string
  categoryId: string
  createdByEmployeeId: string
  createdAt: string
  imageUrl?: string | null
  category?: NewsCategory
  createdByEmployee?: Employee
}

export interface ResidentApartment {
  id: string
  residentId: string
  apartmentId: string
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  apartment?: Apartment
  resident?: Resident
}

export interface CommunitySpace {
  id: string
  name: string
  phase: string
  description?: string | null
  isActive: boolean
  createdAt: string
  schedules?: CommunitySpaceSchedule[]
}

export interface CommunitySpaceSchedule {
  id: string
  communitySpaceId: string
  dayOfWeek: number
  isOpen: boolean
  startTime?: string | null
  endTime?: string | null
}

export interface CallsIceConfigResponse {
  iceServers: RTCIceServer[]
}

export interface CallPorterAvailability {
  id: string
  username: string
  name: string
  lastName: string
  available: boolean
  status: 'available' | 'busy'
  currentCall: {
    callId: string
    direction: 'outbound' | 'inbound' | 'internal'
    status: 'ringing' | 'active'
    withType: 'resident' | 'employee' | 'apartment'
    withLabel: string
    apartment: {
      id: string
      number: string
      floor: number | null
      tower: {
        id: string
        code: string
        name: string
      } | null
    } | null
  } | null
}
