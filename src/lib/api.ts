import { apiClient } from '@/lib/api-client'
import type {
  AccessAudit,
  Apartment,
  ApartmentStats,
  AuthResponse,
  CallPorterAvailability,
  CallsIceConfigResponse,
  CatalogOption,
  CommunitySpace,
  Employee,
  Fine,
  FineType,
  NewsCategory,
  NewsItem,
  NotificationItem,
  PackageItem,
  PackagePhoto,
  PoolEntry,
  PoolResidentSearchResult,
  PoolSummary,
  Reservation,
  Resident,
  ResidentStats,
  ResidentApartment,
  SessionUser,
  Tower,
  VehicleBrand,
  Visitor,
  VisitorSearchResult,
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
  getResidentsStats: () =>
    unwrap<ResidentStats>(apiClient.get('/residents/stats')),
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
  getApartmentsStats: () =>
    unwrap<ApartmentStats>(apiClient.get('/apartments/stats')),
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
  createPackage: (payload: Record<string, unknown>, photos?: File[]) => {
    if (!photos?.length) {
      return unwrap<PackageItem>(apiClient.post('/packages', payload))
    }

    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    })
    photos.forEach((file) => form.append('photos', file))

    return unwrap<PackageItem>(
      apiClient.post('/packages', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },
  markPackageDelivered: (id: string, payload: Record<string, unknown>) =>
    unwrap<PackageItem>(apiClient.patch(`/packages/${id}/deliver`, payload)),
  getPackagePhotos: (id: string) =>
    unwrap<PackagePhoto[]>(apiClient.get(`/packages/${id}/photos`)),
  uploadPackagePhoto: (id: string, file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return unwrap<PackagePhoto>(
      apiClient.post(`/packages/${id}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },

  getVisitors: () => unwrap<Visitor[]>(apiClient.get('/visitors')),
  searchVisitorByDocument: (document: string) =>
    unwrap<VisitorSearchResult>(apiClient.get('/visitors/search', { params: { document } })),
  createVisitor: (payload: Record<string, unknown>) =>
    unwrap<Visitor>(apiClient.post('/visitors', payload)),

  getVehicleBrands: () => unwrap<VehicleBrand[]>(apiClient.get('/vehicle-brands')),
  createVehicleBrand: (payload: { name: string }) =>
    unwrap<VehicleBrand>(apiClient.post('/vehicle-brands', payload)),

  getAccessAudit: () => unwrap<AccessAudit[]>(apiClient.get('/access-audit')),
  createAccessAudit: (payload: Record<string, unknown>, photo?: File) => {
    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    })
    if (photo) {
      form.append('photo', photo)
    }

    return unwrap<AccessAudit>(
      apiClient.post('/access-audit', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },
  registerExit: (id: string) =>
    unwrap<AccessAudit>(apiClient.patch(`/access-audit/${id}/exit`)),

  getFineTypes: () => unwrap<FineType[]>(apiClient.get('/fine-types')),
  createFineType: (payload: { name: string; value: number }) =>
    unwrap<FineType>(apiClient.post('/fine-types', payload)),
  updateFineTypeValue: (id: string, payload: { value: number }) =>
    unwrap<FineType>(apiClient.patch(`/fine-types/${id}/value`, payload)),

  getFines: () => unwrap<Fine[]>(apiClient.get('/fines')),
  createFine: (payload: { apartmentId: string; fineTypeId: string; amount?: number; notes?: string }) =>
    unwrap<Fine>(apiClient.post('/fines', payload)),

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
  getApartmentStatuses: () => unwrap<CatalogOption[]>(apiClient.get('/apartment-statuses')), // unused, kept for reference
  getCommonAreas: () => unwrap<CatalogOption[]>(apiClient.get('/common-areas')),
  getReservationStatuses: () => unwrap<CatalogOption[]>(apiClient.get('/reservation-statuses')),
  getNotificationTypes: () => unwrap<CatalogOption[]>(apiClient.get('/notification-types')),

  getNewsCategories: () => unwrap<NewsCategory[]>(apiClient.get('/news-categories')),
  createNewsCategory: (payload: Record<string, unknown>) =>
    unwrap<NewsCategory>(apiClient.post('/news-categories', payload)),

  getNews: () => unwrap<NewsItem[]>(apiClient.get('/news')),
  createNews: (payload: Record<string, unknown>) =>
    unwrap<NewsItem>(apiClient.post('/news', payload)),
  updateNews: (id: string, payload: Record<string, unknown>) =>
    unwrap<NewsItem>(apiClient.patch(`/news/${id}`, payload)),
  deleteNews: (id: string) => apiClient.delete(`/news/${id}`),
  uploadNewsImage: (id: string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return unwrap<NewsItem>(
      apiClient.post(`/news/${id}/upload-image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },

  getResidentApartments: (residentId: string) =>
    unwrap<ResidentApartment[]>(apiClient.get(`/resident-apartments/by-resident/${residentId}`)),
  addResidentApartment: (residentId: string, apartmentId: string) =>
    unwrap<ResidentApartment>(apiClient.post('/resident-apartments', { residentId, apartmentId })),
  removeResidentApartment: (id: string) => apiClient.delete(`/resident-apartments/${id}`),

  getCommunitySpaces: () => unwrap<CommunitySpace[]>(apiClient.get('/community-spaces')),
  createCommunitySpace: (payload: Record<string, unknown>) => unwrap<CommunitySpace>(apiClient.post('/community-spaces', payload)),
  updateCommunitySpace: (id: string, payload: Record<string, unknown>) => unwrap<CommunitySpace>(apiClient.patch(`/community-spaces/${id}`, payload)),
  deleteCommunitySpace: (id: string) => unwrap<void>(apiClient.delete(`/community-spaces/${id}`)),
  getCallPorters: () => unwrap<CallPorterAvailability[]>(apiClient.get('/calls/porters')),
  getCallHistory: () => unwrap<import('@/features/calls/types').CallSessionPayload[]>(apiClient.get('/calls/history')),
  getCallsIceConfig: () => unwrap<CallsIceConfigResponse>(apiClient.get('/calls/ice-config')),
  createCallTrace: (payload: {
    callId: string
    source: 'web' | 'mobile' | 'api'
    stage: string
    message: string
    level?: 'info' | 'warn' | 'error'
    metadata?: Record<string, unknown> | null
  }) => unwrap<{ ok: boolean }>(apiClient.post('/calls/trace', payload)),

  getAssemblies: () => unwrap<import('@/features/assemblies/types').AssemblyItem[]>(apiClient.get('/assemblies')),
  createAssembly: (payload: Record<string, unknown>) =>
    unwrap<import('@/features/assemblies/types').AssemblyItem>(apiClient.post('/assemblies', payload)),
  getAssembly: (id: string) =>
    unwrap<import('@/features/assemblies/types').AssemblyItem>(apiClient.get(`/assemblies/${id}`)),
  startAssembly: (id: string) =>
    unwrap<import('@/features/assemblies/types').AssemblyItem>(apiClient.post(`/assemblies/${id}/start`)),
  finishAssembly: (id: string) =>
    unwrap<import('@/features/assemblies/types').AssemblyItem>(apiClient.post(`/assemblies/${id}/finish`)),
  openQuestion: (assemblyId: string, questionId: string) =>
    unwrap<import('@/features/assemblies/types').AssemblyItem>(apiClient.post(`/assemblies/${assemblyId}/questions/${questionId}/open`)),
  closeQuestion: (assemblyId: string, questionId: string) =>
    unwrap<import('@/features/assemblies/types').AssemblyItem>(apiClient.post(`/assemblies/${assemblyId}/questions/${questionId}/close`)),
  getPublicAssemblyStats: (publicId: string) =>
    unwrap<import('@/features/assemblies/types').PublicStats>(apiClient.get(`/assemblies/public/${publicId}`)),
  verifyAssemblyToken: (publicId: string, token: string) =>
    unwrap<{ questionText: string; vote: string; isValid: boolean; rejectedReason: string | null }[]>(
      apiClient.get(`/assemblies/public/${publicId}/verify`, { params: { token } }),
    ),
}
