import { apiClient } from '@/lib/api-client'
import type {
  AccessAudit,
  Apartment,
  AuthResponse,
  CatalogOption,
  Employee,
  NotificationItem,
  PackageItem,
  PoolEntry,
  PoolResidentSearchResult,
  PoolSummary,
  Reservation,
  Resident,
  SessionUser,
  Tower,
  Visitor,
} from '@/types/api'

async function unwrap<T>(promise: Promise<{ data: T }>) {
  const { data } = await promise
  return data
}

export const api = {
  loginResident: (payload: { identifier: string; password: string }) =>
    unwrap<AuthResponse>(apiClient.post('/auth/login/resident', payload)),
  loginEmployee: (payload: { username: string; password: string }) =>
    unwrap<AuthResponse>(apiClient.post('/auth/login/employee', payload)),
  getSession: () => unwrap<SessionUser>(apiClient.get('/auth/me')),

  getResidents: (params?: { apartmentId?: string }) =>
    unwrap<Resident[]>(apiClient.get('/residents', { params })),
  createResident: (payload: Record<string, unknown>) =>
    unwrap<Resident>(apiClient.post('/residents', payload)),
  activateResident: (id: string) =>
    unwrap<Resident>(apiClient.patch(`/residents/${id}/activate`)),
  deactivateResident: (id: string) =>
    unwrap<Resident>(apiClient.patch(`/residents/${id}/deactivate`)),
  assignResidentApartment: (id: string, apartmentId: string) =>
    unwrap<Resident>(apiClient.patch(`/residents/${id}/assign-apartment`, { apartmentId })),
  unassignResidentApartment: (id: string) =>
    unwrap<Resident>(apiClient.patch(`/residents/${id}/unassign-apartment`)),

  getEmployees: () => unwrap<Employee[]>(apiClient.get('/employees')),
  createEmployee: (payload: Record<string, unknown>) =>
    unwrap<Employee>(apiClient.post('/employees', payload)),
  activateEmployee: (id: string) =>
    unwrap<Employee>(apiClient.patch(`/employees/${id}/activate`)),
  deactivateEmployee: (id: string) =>
    unwrap<Employee>(apiClient.patch(`/employees/${id}/deactivate`)),

  getTowers: () => unwrap<Tower[]>(apiClient.get('/towers')),
  createTower: (payload: Record<string, unknown>) =>
    unwrap<Tower>(apiClient.post('/towers', payload)),
  getApartments: (towerId?: string) =>
    unwrap<Apartment[]>(apiClient.get('/apartments', { params: { towerId } })),
  createApartment: (payload: Record<string, unknown>) =>
    unwrap<Apartment>(apiClient.post('/apartments', payload)),

  getReservations: () => unwrap<Reservation[]>(apiClient.get('/reservations')),
  getMyReservations: () => unwrap<Reservation[]>(apiClient.get('/reservations/my')),
  createReservation: (payload: Record<string, unknown>) =>
    unwrap<Reservation>(apiClient.post('/reservations', payload)),
  updateReservationStatus: (id: string, payload: Record<string, unknown>) =>
    unwrap<Reservation>(apiClient.patch(`/reservations/${id}/status`, payload)),

  getNotifications: () => unwrap<NotificationItem[]>(apiClient.get('/notifications/my')),
  getAllNotifications: () => unwrap<NotificationItem[]>(apiClient.get('/notifications')),
  markNotificationRead: (id: string) =>
    unwrap<NotificationItem>(apiClient.patch(`/notifications/${id}/read`)),
  createNotification: (payload: Record<string, unknown>) =>
    unwrap<NotificationItem>(apiClient.post('/notifications', payload)),

  getMyPackages: () => unwrap<PackageItem[]>(apiClient.get('/packages/my')),
  getPackages: () => unwrap<PackageItem[]>(apiClient.get('/packages')),
  createPackage: (payload: Record<string, unknown>) =>
    unwrap<PackageItem>(apiClient.post('/packages', payload)),
  markPackageDelivered: (id: string, payload: Record<string, unknown>) =>
    unwrap<PackageItem>(apiClient.patch(`/packages/${id}/deliver`, payload)),

  getVisitors: () => unwrap<Visitor[]>(apiClient.get('/visitors')),
  createVisitor: (payload: Record<string, unknown>) =>
    unwrap<Visitor>(apiClient.post('/visitors', payload)),

  getAccessAudit: () => unwrap<AccessAudit[]>(apiClient.get('/access-audit')),
  createAccessAudit: (payload: Record<string, unknown>) =>
    unwrap<AccessAudit>(apiClient.post('/access-audit', payload)),
  registerExit: (id: string) =>
    unwrap<AccessAudit>(apiClient.patch(`/access-audit/${id}/exit`)),

  getPoolEntries: () => unwrap<PoolEntry[]>(apiClient.get('/pool-entries')),
  createPoolEntry: (payload: Record<string, unknown>) =>
    unwrap<PoolEntry>(apiClient.post('/pool-entries', payload)),
  searchPoolResidents: (apartmentId: string) =>
    unwrap<PoolResidentSearchResult>(
      apiClient.get('/pool-entries/resident-search', { params: { apartmentId } }),
    ),
  getPoolSummary: (dateFrom?: string, dateTo?: string) =>
    unwrap<PoolSummary>(
      apiClient.get('/pool-entries/reports/summary', { params: { dateFrom, dateTo } }),
    ),
  downloadPoolReportPdf: async (dateFrom?: string, dateTo?: string) => {
    const { data } = await apiClient.get<Blob>('/pool-entries/reports/pdf', {
      params: { dateFrom, dateTo },
      responseType: 'blob',
    })

    return data
  },

  getResidentTypes: () => unwrap<CatalogOption[]>(apiClient.get('/resident-types')),
  getEmployeeRoles: () => unwrap<CatalogOption[]>(apiClient.get('/employee-roles')),
  getApartmentStatuses: () => unwrap<CatalogOption[]>(apiClient.get('/apartment-statuses')),
  getCommonAreas: () => unwrap<CatalogOption[]>(apiClient.get('/common-areas')),
  getReservationStatuses: () => unwrap<CatalogOption[]>(apiClient.get('/reservation-statuses')),
  getNotificationTypes: () => unwrap<CatalogOption[]>(apiClient.get('/notification-types')),
}
