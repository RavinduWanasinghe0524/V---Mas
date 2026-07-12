import { useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import { AuthContext } from './AuthContext'
import { LogOut, X } from 'lucide-react'
import { useD, useTheme } from './ThemeContext'

// ── Helper: build a normalised user object from the backend UserDto ──
const buildUser = (userDto) => ({
  id:                  userDto.id,
  userName:            userDto.userName,
  email:               userDto.email,
  role:                userDto.role,          // "ADMIN" | "CONTROLLER" | "DRIVER"
  accountStatus:       userDto.accountStatus, // "ACTIVE" | "INACTIVE" | "PENDING"
  profilePicture:
    userDto.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userDto.userName)}&background=2563eb&color=fff&size=128&bold=true`,
  phoneNumber:         userDto.phoneNumber,
  gender:              userDto.gender,
  nic:                 userDto.nic,
  dateOfBirth:         userDto.dateOfBirth,
  licenseNumber:       userDto.licenseNumber,
  licenseExpiryDate:   userDto.licenseExpiryDate,
  licenseDocumentPath: userDto.licenseDocumentPath,
  dateJoined:          userDto.dateJoined,
  experience:          userDto.experience,
})

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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

  // Apply user role data attribute to html node for dynamic CSS variables
  useEffect(() => {
    if (user?.role) {
      document.documentElement.setAttribute('data-role', user.role);
    } else {
      document.documentElement.removeAttribute('data-role');
    }
  }, [user]);

  // ── LOGIN ──────────────────────────────────────────────────────────
  const login = async (userName, password) => {
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
  const confirmLogout = async () => {
    try { await authAPI.logout() } catch { /* ignore */ }
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const logout = () => {
    setShowLogoutConfirm(true)
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

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showLogoutConfirm && (
        <LogoutConfirmationModal 
          onConfirm={async () => {
            setShowLogoutConfirm(false)
            await confirmLogout()
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </AuthContext.Provider>
  )
}

const LogoutConfirmationModal = ({ onConfirm, onCancel }) => {
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,15,26,0.4)', 
        backdropFilter: 'blur(12px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 9999, 
        animation: 'fadeIn 0.25s ease' 
      }} 
      onClick={onCancel}
    >
      <div 
        style={{ 
          background: D.surface, 
          borderRadius: 32, 
          padding: '40px 32px 32px', 
          width: '90%', 
          maxWidth: 400, 
          boxShadow: isDark ? '0 32px 100px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.15)', 
          border: `1px solid ${D.border}`, 
          textAlign: 'center',
          position: 'relative'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onCancel} 
          style={{ 
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'transparent', 
            border: 'none', 
            borderRadius: 10, 
            padding: 8, 
            color: D.textSub, 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} 
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={18} />
        </button>

        <div style={{ 
          width: 56, 
          height: 56, 
          borderRadius: 16, 
          background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', 
          color: D.red, 
          border: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(239,68,68,0.2)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '12px auto 20px' 
        }}>
          <LogOut size={24} />
        </div>

        <h3 style={{ 
          margin: '0 0 8px', 
          fontWeight: 800, 
          color: D.text, 
          fontSize: '1.25rem', 
          fontFamily: "'Plus Jakarta Sans', sans-serif", 
          letterSpacing: '-0.02em' 
        }}>
          Sign Out
        </h3>

        <p style={{ 
          margin: '0 0 28px', 
          color: D.textSub, 
          fontSize: '0.9rem', 
          lineHeight: 1.5,
          fontFamily: "inherit"
        }}>
          Are you sure to sign out?
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            type="button" 
            onClick={onCancel} 
            style={{ 
              flex: 1, 
              padding: '11px 20px', 
              borderRadius: 12, 
              border: `1px solid ${D.border}`, 
              background: 'transparent', 
              color: D.text, 
              cursor: 'pointer', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }} 
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} 
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          
          <button 
            type="button" 
            onClick={onConfirm} 
            style={{ 
              flex: 1, 
              padding: '11px 20px', 
              borderRadius: 12, 
              border: 'none', 
              background: D.red, 
              color: '#fff', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              cursor: 'pointer', 
              transition: 'all 0.2s', 
              boxShadow: isDark ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(239,68,68,0.2)',
              fontFamily: 'inherit'
            }} 
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isDark ? '0 6px 16px rgba(239,68,68,0.4)' : '0 6px 16px rgba(239,68,68,0.3)' }} 
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(239,68,68,0.2)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
