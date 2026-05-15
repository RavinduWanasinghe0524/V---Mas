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

    if (!isAuthEndpoint && !isProfileEndpoint && (error.response?.status === 401 || error.response?.status === 403)) {
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
  // ── Driver list (for assign-driver dropdown) ─────────────────────────
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
  assignDriver:     (vehicleId, driverId) => api.patch(`/vehicles/${vehicleId}/driver/${driverId}`),
  getAssignedVehicle: ()               => api.get('/vehicles/assigned'),
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

  // ── Efficiency Report ───────────────────────────────────────────────────
  getFuelEfficiencyReport: ()            => api.get('/fuel/efficiency'),
}

export const serviceAPI = {
  getAllServices:       ()               => api.get('/services'),
  getServiceById:       (id)             => api.get(`/services/${id}`),
  createService:        (data)           => api.post('/services', data),
  updateService:        (id, data)       => api.put(`/services/${id}`, data),
  deleteService:        (id)             => api.delete(`/services/${id}`),
  getServiceStats:      ()               => api.get('/services/stats'),
  getUpcomingServices:  ()               => api.get('/services/upcoming'),
  getRecentServices:    ()               => api.get('/services/recent'),
}

export const notificationAPI = {
  getUnread:            ()               => api.get('/notifications/unread'),
  getAll:               ()               => api.get('/notifications'),
  markAsRead:           (id)             => api.patch(`/notifications/${id}/read`),
  markAllAsRead:        ()               => api.patch('/notifications/read-all'),
}

export const alertAPI = {
  getDashboardAlerts:   ()               => api.get('/alerts/dashboard'),
}

export default api
