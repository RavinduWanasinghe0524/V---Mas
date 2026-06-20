import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Global 401/403 handler — but NOT for the login/register/profile endpoints
// (those 401s should be handled by the calling code to show error messages)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
    const isProfileEndpoint = url.includes('/users/me')

    if (!isAuthEndpoint && !isProfileEndpoint && error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
}

export const userAPI = {
  getAllUsers:     ()         => api.get('/users'),
  getUserById:    (id)       => api.get(`/users/${id}`),
  createUser:     (data)     => api.post('/users', data),
  updateUser:     (id, data) => api.put(`/users/${id}`, data),
  deleteUser:     (id)       => api.delete(`/users/${id}`),
  // ── Admin approval workflow ─────────────────────────────────────────
  getPendingUsers: ()        => api.get('/users/pending'),
  approveUser:    (id)       => api.patch(`/users/${id}/approve`),
  rejectUser:     (id)       => api.patch(`/users/${id}/reject`),
  getAllDrivers:   ()         => api.get('/users/drivers'),
}

export const profileAPI = {
  getMyProfile:    ()     => api.get('/users/me'),
  updateMyProfile: (data) => api.put('/users/me', data),
  changePassword:  (data) => api.put('/users/me/password', data),
}

export const employeeAPI = {
  getAllEmployees:  ()         => api.get('/employees'),
  getEmployeeById: (id)       => api.get(`/employees/${id}`),
  createEmployee:  (data)     => api.post('/employees', data),
  updateEmployee:  (id, data) => api.put(`/employees/${id}`, data),
  deleteEmployee:  (id)       => api.delete(`/employees/${id}`),
}

export const vehicleAPI = {
  getAllVehicles:    ()                  => api.get('/vehicles'),
  getVehicleById:   (id)                => api.get(`/vehicles/${id}`),
  updateVehicle:    (id, data)          => api.put(`/vehicles/${id}`, data),
  deleteVehicle:    (id)                => api.delete(`/vehicles/${id}`),
  registerVehicle:  (data)              => api.post('/vehicles', data),
  uploadDocument: (id, docType, file, expiryDate) => {
    const form = new FormData()
    form.append('file', file)
    if (expiryDate) {
      form.append('expiryDate', expiryDate)
    }
    return api.post(`/vehicles/${id}/document/${docType}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getDocumentUrl: (id, docType) => `${API_BASE_URL}/vehicles/${id}/document/${docType}`,
  getDeletedVehicles: () => api.get('/vehicles/deleted'),
  restoreVehicle: (id) => api.patch(`/vehicles/${id}/restore`),
  updateBulkMileage: (payload) => api.post('/vehicles/bulk-mileage', payload)
}

export const fuelAPI = {
  // ── Driver-scoped (uses /api/fuel/add & /api/fuel/my-logs) ──────────────
  addFuelLog:           (data)           => api.post('/fuel/add', data),
  getMyLogs:            ()               => api.get('/fuel/my-logs'),
  getMyLogById:         (id)             => api.get(`/fuel/my-logs/${id}`),
  updateMyLog:          (id, data)       => api.put(`/fuel/my-logs/${id}`, data),

  // ── Analytics / shared ──────────────────────────────────────────────────
  getSummary:           ()               => api.get('/fuel/summary'),
  getChartData:         ()               => api.get('/fuel/chart'),
  getVehicleStats:      ()               => api.get('/fuel/stats'),
  getFuelLogById:       (id)             => api.get(`/fuel/log/${id}`),
  getLogsByVehicle:     (reg)            => api.get(`/fuel/vehicle/${reg}`),

  // ── Controller / Admin (uses /api/fuel/controller/*) ────────────────────
  getAllFuelLogs:        ()               => api.get('/fuel/all'),
  controllerAddLog:     (data)           => api.post('/fuel/controller/add', data),
  controllerSearchById: (id)             => api.get(`/fuel/controller/search/${id}`),
  controllerUpdateLog:  (id, data)       => api.put(`/fuel/controller/${id}`, data),
  controllerDeleteLog:  (id)             => api.delete(`/fuel/controller/${id}`),
  getDeletedLogs:       ()               => api.get('/fuel/controller/deleted'),
  restoreLog:           (id)             => api.patch(`/fuel/controller/restore/${id}`),

  // ── Efficiency Report ───────────────────────────────────────────────────
  getFuelEfficiencyReport: ()            => api.get('/fuel/efficiency'),
}

export const serviceAPI = {
  getAllServices:       ()               => api.get('/services'),
  getDeletedServices:   ()               => api.get('/services/deleted'),
  getServiceById:       (id)             => api.get(`/services/${id}`),
  createService:        (data)           => api.post('/services', data),
  updateService:        (id, data)       => api.put(`/services/${id}`, data),
  deleteService:        (id)             => api.delete(`/services/${id}`),
  restoreService:       (id)             => api.patch(`/services/${id}/restore`),
  getServiceHistory:    (id)             => api.get(`/services/${id}/history`),
  getServiceStats:      ()               => api.get('/services/stats'),
  getUpcomingServices:  ()               => api.get('/services/upcoming'),
  getRecentServices:    ()               => api.get('/services/recent'),
  uploadAttachment:     (id, file)       => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/services/${id}/attachment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getAttachmentBlob:    (id)             => api.get(`/services/${id}/attachment`, { responseType: 'blob' }),
  getServicesByVehicle: (regNo)          => api.get(`/services/vehicle/${encodeURIComponent(regNo)}`),
  getAllIntervals:      ()               => api.get('/services/intervals'),
  getIntervalsByVehicleType: (type)      => api.get(`/services/intervals/vehicle-type/${type}`),
  updateIntervalsBulk:  (payload)        => api.put('/services/intervals', payload),
}

export const notificationAPI = {
  create:               (data)           => api.post('/notifications', data),
  getUnread:            ()               => api.get('/notifications/unread'),
  getAll:               ()               => api.get('/notifications'),
  markAsRead:           (id)             => api.patch(`/notifications/${id}/read`),
  markAllAsRead:        ()               => api.patch('/notifications/read-all'),
}

export const alertAPI = {
  getDashboardAlerts:   ()               => api.get('/alerts/dashboard'),
}

export default api
