/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

// ── Helper: build a normalised user object from the backend UserDto ──
const buildUser = (userDto) => ({
  id:            userDto.id,
  userName:      userDto.userName,
  email:         userDto.email,
  role:          userDto.role,          // "ADMIN" | "CONTROLLER" | "DRIVER"
  accountStatus: userDto.accountStatus, // "ACTIVE" | "INACTIVE" | "PENDING"
  profilePicture:
    userDto.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userDto.userName)}&background=6366f1&color=fff&size=128&bold=true`,
})

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser  = localStorage.getItem('user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  // ── LOGIN ──────────────────────────────────────────────────────────
  const login = async (userName, password) => {
    // Demo mode for testing without backend
    const demoUsers = {
      admin: { userName: 'admin', password: 'admin', role: 'ADMIN', email: 'admin@vmas.com' },
      controller1: { userName: 'controller1', password: 'controller1', role: 'CONTROLLER', email: 'controller@vmas.com' },
      driver1: { userName: 'driver1', password: 'driver1', role: 'DRIVER', email: 'driver@vmas.com' },
    }

    // Check if demo credentials match
    if (demoUsers[userName] && demoUsers[userName].password === password) {
      const demoUser = demoUsers[userName]
      const mockToken = `demo_token_${userName}_${Date.now()}`
      const userDto = {
        id: `demo_${userName}`,
        userName: demoUser.userName,
        email: demoUser.email,
        role: demoUser.role,
        accountStatus: 'ACTIVE',
        profilePicture: null,
      }

      const normalised = buildUser(userDto)
      setToken(mockToken)
      setUser(normalised)
      localStorage.setItem('token', mockToken)
      localStorage.setItem('user', JSON.stringify(normalised))

      return { success: true }
    }

    try {
      const response = await authAPI.login({ userName, password })

      const responseData = response.data?.data
      const jwt          = responseData?.token
      const userDto      = responseData?.user

      if (!jwt || !userDto) {
        return { success: false, error: 'Unexpected response from server' }
      }

      const normalised = buildUser(userDto)
      setToken(jwt)
      setUser(normalised)
      localStorage.setItem('token', jwt)
      localStorage.setItem('user', JSON.stringify(normalised))

      return { success: true }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.response?.status === 401 ? 'Invalid username or password' : 'Login failed. Please try again.')
      return { success: false, error: msg }
    }
  }

  // ── REGISTER ───────────────────────────────────────────────────────
  // After the backend change, register returns no JWT (PENDING state).
  // We handle both: if a token is returned (backward compat) we log in;
  // if not, we return { success: true, pending: true } for the UI to show
  // the "Pending Approval" screen.
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)

      const responseData = response.data?.data
      const jwt          = responseData?.token
      const userDto      = responseData?.user

      // Future backend: no token returned (PENDING) — just signal success
      if (!jwt) {
        return { success: true, pending: true }
      }

      // Current backend (ACTIVE, token returned) — log the user in normally
      const normalised = buildUser({
        ...userDto,
        profilePicture: userData.profilePicture || userDto.profilePicture,
      })

      setToken(jwt)
      setUser(normalised)
      localStorage.setItem('token', jwt)
      localStorage.setItem('user', JSON.stringify(normalised))

      return { success: true, pending: false }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.response?.status === 409 ? 'Username or email already exists' : 'Registration failed. Please try again.')
      return { success: false, error: msg }
    }
  }

  // ── LOGOUT ─────────────────────────────────────────────────────────
  const logout = async () => {
    try { await authAPI.logout() } catch { /* ignore */ }
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // ── UPDATE USER ────────────────────────────────────────────────────
  const updateUser = (updatedUserDto) => {
    const normalised = buildUser(updatedUserDto)
    setUser(normalised)
    localStorage.setItem('user', JSON.stringify(normalised))
  }

  const value = {
    user,
    token,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!token,
    isAdmin:      user?.role === 'ADMIN',
    isController: user?.role === 'CONTROLLER',
    isDriver:     user?.role === 'DRIVER',
  }

  // Loading splash
  if (loading) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">🚗 V-MAS</div>
        <div className="splash-spinner"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
