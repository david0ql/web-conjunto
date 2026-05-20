import { apiClient } from '@/lib/api-client'
import type { ApiRequestConfig } from '@/lib/api-client'
import type {
  AccessAudit,
  Apartment,
  ApartmentStats,
  AuthResponse,
  CallPorterAvailability,
  CallsIceConfigResponse,
  CatalogOption,
  CommonArea,
  CommunitySpace,
  Employee,
  Fine,
  FineType,
  NewsCategory,
  NewsItem,
  NotificationItem,
  PackageItem,
  PackagePhoto,
  PaginatedResponse,
  PoolEntry,
  PoolResidentSearchResult,
  PoolSummary,
  Reservation,
  Resident,
  ResidentStats,
  ResidentApartment,
  ResidentVehicle,
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
  getSession: (config?: ApiRequestConfig) => unwrap<SessionUser>(apiClient.get('/auth/me', config)),

  getResidents: (params?: { apartmentId?: string; page?: number; limit?: number; search?: string; typeId?: string; isActive?: string; hasApartment?: string; towerId?: string }) =>
    unwrap<PaginatedResponse<Resident>>(apiClient.get('/residents', { params })),
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

  getEmployees: (params?: { page?: number; limit?: number; search?: string; roleId?: string; isActive?: string }) =>
    unwrap<PaginatedResponse<Employee>>(apiClient.get('/employees', { params })),
  createEmployee: (payload: Record<string, unknown>) =>
    unwrap<Employee>(apiClient.post('/employees', payload)),
  activateEmployee: (id: string) =>
    unwrap<Employee>(apiClient.patch(`/employees/${id}/activate`)),
  deactivateEmployee: (id: string) =>
    unwrap<Employee>(apiClient.patch(`/employees/${id}/deactivate`)),

  getTowers: () => unwrap<Tower[]>(apiClient.get('/towers')),
  createTower: (payload: Record<string, unknown>) =>
    unwrap<Tower>(apiClient.post('/towers', payload)),
  getApartments: (params?: { towerId?: string; page?: number; limit?: number; search?: string; occupancy?: string }) =>
    unwrap<PaginatedResponse<Apartment>>(apiClient.get('/apartments', { params })),
  getApartmentsStats: () =>
    unwrap<ApartmentStats>(apiClient.get('/apartments/stats')),
  createApartment: (payload: Record<string, unknown>) =>
    unwrap<Apartment>(apiClient.post('/apartments', payload)),

  getReservations: (params?: { page?: number; limit?: number; search?: string; status?: string; reservationDate?: string }) =>
    unwrap<PaginatedResponse<Reservation>>(apiClient.get('/reservations', { params })),
  getMyReservations: () => unwrap<Reservation[]>(apiClient.get('/reservations/my')),
  createReservation: (payload: Record<string, unknown>) =>
    unwrap<Reservation>(apiClient.post('/reservations', payload)),
  updateReservationStatus: (id: string, payload: Record<string, unknown>) =>
    unwrap<Reservation>(apiClient.patch(`/reservations/${id}/status`, payload)),

  getNotifications: (params?: { page?: number; limit?: number }) =>
    unwrap<PaginatedResponse<NotificationItem>>(apiClient.get('/notifications/my', { params })),
  getAllNotifications: (params?: { page?: number; limit?: number; search?: string; isRead?: string; typeId?: string; createdAt?: string }) =>
    unwrap<PaginatedResponse<NotificationItem>>(apiClient.get('/notifications', { params })),
  markNotificationRead: (id: string) =>
    unwrap<NotificationItem>(apiClient.patch(`/notifications/${id}/read`)),
  createNotification: (payload: Record<string, unknown>) =>
    unwrap<NotificationItem>(apiClient.post('/notifications', payload)),

  getMyPackages: (params?: { page?: number; limit?: number }) =>
    unwrap<PaginatedResponse<PackageItem>>(apiClient.get('/packages/my', { params })),
  getPackages: (params?: { page?: number; limit?: number; search?: string; delivered?: string; arrivalTime?: string; towerId?: string }) =>
    unwrap<PaginatedResponse<PackageItem>>(apiClient.get('/packages', { params })),
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
  markPackageDelivered: (id: string, payload: Record<string, unknown>, deliveryPhoto: File) => {
    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    })
    form.append('deliveryPhoto', deliveryPhoto)

    return unwrap<PackageItem>(
      apiClient.patch(`/packages/${id}/deliver`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },
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

  getResidentVehicles: (params?: { page?: number; limit?: number; search?: string }) =>
    unwrap<PaginatedResponse<ResidentVehicle>>(apiClient.get('/resident-vehicles', { params })),
  getResidentVehiclesByApartment: (apartmentId: string) =>
    unwrap<ResidentVehicle[]>(apiClient.get(`/resident-vehicles/by-apartment/${apartmentId}`)),
  createResidentVehicle: (payload: Record<string, unknown>) =>
    unwrap<ResidentVehicle>(apiClient.post('/resident-vehicles', payload)),
  updateResidentVehicle: (id: string, payload: Record<string, unknown>) =>
    unwrap<ResidentVehicle>(apiClient.patch(`/resident-vehicles/${id}`, payload)),
  deleteResidentVehicle: (id: string) =>
    unwrap<void>(apiClient.delete(`/resident-vehicles/${id}`)),

  getAccessAudit: (params?: { page?: number; limit?: number; search?: string; type?: string; entryType?: string; entryTime?: string; towerId?: string }) =>
    unwrap<PaginatedResponse<AccessAudit>>(apiClient.get('/access-audit', { params })),
  getAccessAuditStats: () =>
    unwrap<{ total: number; today: number; uniqueVisitorsToday: number }>(apiClient.get('/access-audit/stats')),
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

  getFines: (params?: {
    search?: string
    towerId?: string
    apartmentId?: string
    residentId?: string
    fineTypeId?: string
    createdByEmployeeId?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  }) => unwrap<PaginatedResponse<Fine>>(apiClient.get('/fines', { params })),
  createFine: (payload: { apartmentId: string; residentId?: string; fineTypeId: string; amount?: number; notes?: string }) =>
    unwrap<Fine>(apiClient.post('/fines', payload)),
  downloadFinesReportPdf: async (params?: {
    towerId?: string
    apartmentId?: string
    residentId?: string
    fineTypeId?: string
    createdByEmployeeId?: string
    dateFrom?: string
    dateTo?: string
  }) => {
    const { data } = await apiClient.get<Blob>('/fines/reports/pdf', {
      params,
      responseType: 'blob',
    })

    return data
  },

  getPoolEntries: (params?: { page?: number; limit?: number }) =>
    unwrap<PaginatedResponse<PoolEntry>>(apiClient.get('/pool-entries', { params })),
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
  getCommonAreas: (params?: { page?: number; limit?: number }) =>
    unwrap<PaginatedResponse<CommonArea>>(apiClient.get('/common-areas', { params })),
  createCommonArea: (payload: Record<string, unknown>) => unwrap<CommonArea>(apiClient.post('/common-areas', payload)),
  updateCommonArea: (id: string, payload: Record<string, unknown>) => unwrap<CommonArea>(apiClient.patch(`/common-areas/${id}`, payload)),
  deleteCommonArea: (id: string) => unwrap<void>(apiClient.delete(`/common-areas/${id}`)),
  getReservationStatuses: () => unwrap<CatalogOption[]>(apiClient.get('/reservation-statuses')),
  getNotificationTypes: () => unwrap<CatalogOption[]>(apiClient.get('/notification-types')),

  getNewsCategories: () => unwrap<NewsCategory[]>(apiClient.get('/news-categories')),
  createNewsCategory: (payload: Record<string, unknown>) =>
    unwrap<NewsCategory>(apiClient.post('/news-categories', payload)),

  getNews: (params?: { page?: number; limit?: number }) =>
    unwrap<PaginatedResponse<NewsItem>>(apiClient.get('/news', { params })),
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
  getCallHistory: (params?: { page?: number; limit?: number; search?: string; status?: string; direction?: string; createdAt?: string }) =>
    unwrap<PaginatedResponse<import('@/features/calls/types').CallSessionPayload>>(apiClient.get('/calls/history', { params })),
  getCallsIceConfig: () => unwrap<CallsIceConfigResponse>(apiClient.get('/calls/ice-config')),
  createCallTrace: (payload: {
    callId: string
    source: 'web' | 'mobile' | 'api'
    stage: string
    message: string
    level?: 'info' | 'warn' | 'error'
    metadata?: Record<string, unknown> | null
  }) => unwrap<{ ok: boolean }>(apiClient.post('/calls/trace', payload)),

  getAssemblies: (params?: { page?: number; limit?: number }) =>
    unwrap<PaginatedResponse<import('@/features/assemblies/types').AssemblyItem>>(apiClient.get('/assemblies', { params })),
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
