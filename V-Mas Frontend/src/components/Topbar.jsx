import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Bell, Moon, Sun, User, Check, Info, Fuel, Wrench, Trash2, AlertTriangle, ChevronRight, X, Car } from 'lucide-react'
import { notificationAPI } from '../services/api'
import * as notifService from '../services/notificationService'

const roleText = {
  ADMIN: 'System Administrator',
  CONTROLLER: 'System Controller',
  DRIVER: 'Driver',
}

const parseBackendDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  let normalized = dateStr;
  if (typeof dateStr === 'string') {
    normalized = dateStr.replace(' ', 'T');
  }
  if (normalized.endsWith('Z') || normalized.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(normalized);
  }
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalhost) {
    return new Date(normalized);
  } else {
    return new Date(normalized + 'Z');
  }
};

const getSystemNotifIconEl = (type) => {
  if (!type) return <Info size={14} />
  const uType = type.toUpperCase()
  if (uType === 'WARNING' || uType === 'OVERDUE_SERVICE' || uType === 'SERVICE_DUE') {
    return <Wrench size={14} />
  }
  if (uType.startsWith('FUEL') || uType === 'LOW_EFFICIENCY') {
    return <Fuel size={14} />
  }
  if (uType.startsWith('USER')) {
    return <User size={14} />
  }
  if (uType === 'UPDATE' || uType === 'ASSIGN' || uType === 'UNASSIGN') {
    return <Car size={14} />
  }
  return <Info size={14} />
}

const getSystemNotifIconBg = (type, isRead, isDark) => {
  const base = { borderRadius: '50%', padding: 6, display: 'flex', color: '#fff' }
  if (isRead) {
    return { ...base, background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#9ca3af' : '#6b7280' }
  }
  if (!type) {
    return { ...base, background: '#3b82f6' }
  }
  const uType = type.toUpperCase()
  if (uType === 'OVERDUE_SERVICE') {
    return { ...base, background: '#ef4444' } // Red for overdue
  }
  if (uType === 'WARNING' || uType === 'SERVICE_DUE') {
    return { ...base, background: '#f59e0b' } // Orange for warnings/due soon
  }
  if (uType.startsWith('FUEL') || uType === 'LOW_EFFICIENCY') {
    return { ...base, background: uType === 'LOW_EFFICIENCY' ? '#f97316' : '#2563eb' }
  }
  if (uType.startsWith('USER')) {
    return { ...base, background: '#6366f1' } // Indigo for user management
  }
  if (uType === 'UPDATE' || uType === 'ASSIGN' || uType === 'UNASSIGN') {
    return { ...base, background: '#10b981' } // Green for vehicles
  }
  return { ...base, background: '#3b82f6' }
}

// Map backend notification types → frontend routes
const getLinkFromType = (type) => {
  if (!type) return null
  switch (type.toUpperCase()) {
    // Vehicle events
    case 'UPDATE':          return '/vehicles'
    case 'ASSIGN':          return '/vehicles'
    case 'UNASSIGN':        return '/vehicles'
    // User events
    case 'USER_UPDATE':     return '/users'
    case 'USER_APPROVAL':   return '/users'
    case 'USER_REJECTION':  return '/users'
    // Fuel events
    case 'FUEL_ADD':        return '/fuel-management'
    case 'FUEL_EDIT':       return '/fuel-management'
    case 'FUEL_DELETE':     return '/fuel-management'
    case 'FUEL_RESTORE':    return '/fuel-management'
    case 'FUEL_UPDATE':     return '/fuel-management'
    case 'LOW_EFFICIENCY':  return '/fuel-analysis'
    case 'FUEL_LOW_EFF':    return '/fuel-analysis'
    // Service events
    case 'WARNING':         return '/service'
    case 'SERVICE_DUE':     return '/service'
    case 'OVERDUE_SERVICE': return '/service'
    // Dashboard alerts
    case 'ALERT':           return '/dashboard'
    default:                return null
  }
}

// Map a notification/alert type → the profile "Alert Types" filter category (null = not an alert, always shown)
const alertCategoryOf = (type) => {
  if (!type) return null
  const t = String(type).toUpperCase()
  if (t.includes('OVERDUE')) return 'OVERDUE'
  if (t === 'SERVICE_DUE' || t === 'SERVICE' || t === 'WARNING') return 'SERVICE'
  if (t === 'LOW_EFFICIENCY' || t === 'FUEL_LOW_EFF' || t === 'LOW_EFF') return 'FUEL'
  if (t.includes('INSURANCE') || t.includes('LICENSE') || t.includes('DOCUMENT') || t.includes('EXPIRY')) return 'INSURANCE'
  return null
}

// Icon per notification type
const ctrlNotifIcon = (type, isDark) => {
  const base = { borderRadius: '50%', padding: 6, display: 'flex', color: '#fff' }
  if (type === 'FUEL_ADD')    return { ...base, background: '#2563eb' }
  if (type === 'FUEL_EDIT')   return { ...base, background: '#f59e0b' }
  if (type === 'FUEL_DELETE') return { ...base, background: '#ef4444' }
  if (type === 'LOW_EFF')     return { ...base, background: '#f97316' }
  if (type === 'SERVICE')     return { ...base, background: '#10b981' }
  return { ...base, background: isDark ? '#374151' : '#94a3b8' }
}

const ctrlNotifIconEl = (type) => {
  if (type === 'FUEL_ADD')    return <Fuel size={14} />
  if (type === 'FUEL_EDIT')   return <Check size={14} />
  if (type === 'FUEL_DELETE') return <Trash2 size={14} />
  if (type === 'LOW_EFF')     return <AlertTriangle size={14} />
  if (type === 'SERVICE')     return <Wrench size={14} />
  return <Info size={14} />
}

const drvNotifIcon = (type, isDark) => {
  const base = { borderRadius: '50%', padding: 6, display: 'flex', color: '#fff' }
  if (type === 'FUEL_ADD')  return { ...base, background: '#10b981' }
  if (type === 'FUEL_EDIT') return { ...base, background: '#f59e0b' }
  if (type === 'LOW_EFF')   return { ...base, background: '#f97316' }
  if (type === 'VEHICLE')   return { ...base, background: '#2563eb' }
  return { ...base, background: isDark ? '#374151' : '#94a3b8' }
}

const drvNotifIconEl = (type) => {
  if (type === 'FUEL_ADD')  return <Fuel size={14} />
  if (type === 'FUEL_EDIT') return <Check size={14} />
  if (type === 'LOW_EFF')   return <AlertTriangle size={14} />
  if (type === 'VEHICLE')   return <Info size={14} />
  return <Info size={14} />
}

const Topbar = ({ title, subtitle, onMenuToggle }) => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'blue'
  const navigate = useNavigate()

  // ── Unified State ────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]) // Admin (backend)
  const [unreadCount, setUnreadCount] = useState(0)      // Admin (backend)
  const [alertCount, setAlertCount] = useState(0)        // Dashboard Alerts
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef(null)

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showHeader, setShowHeader] = useState(true)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const lastScrollY = lastScrollYRef.current
      
      if (isMobile) {
        if (currentScrollY < 0) return // Skip elastic bounce
        
        if (currentScrollY <= 10) {
          setShowHeader(true)
        } else if (currentScrollY > lastScrollY) {
          setShowHeader(false)
        } else if (currentScrollY < lastScrollY) {
          setShowHeader(true)
        }
      } else {
        setShowHeader(true)
      }
      
      lastScrollYRef.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  // Controller / Driver (localStorage)
  const [ctrlNotifs, setCtrlNotifs] = useState([])
  const [ctrlUnread, setCtrlUnread] = useState(0)
  const [drvNotifs, setDrvNotifs] = useState([])
  const [drvUnread, setDrvUnread] = useState(0)

  // Selected alert-type filter from Profile → Notification Settings (persisted per user)
  const [alertFilter, setAlertFilter] = useState(['SERVICE', 'INSURANCE', 'FUEL', 'OVERDUE'])
  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(`vmas-privacy-settings-${user?.id || 'me'}`)
        const parsed = saved ? JSON.parse(saved) : null
        setAlertFilter(Array.isArray(parsed?.alertTypes) ? parsed.alertTypes : ['SERVICE', 'INSURANCE', 'FUEL', 'OVERDUE'])
      } catch { /* keep default */ }
    }
    load()
    window.addEventListener('focus', load)
    window.addEventListener('vmas-notif-settings-update', load)
    return () => {
      window.removeEventListener('focus', load)
      window.removeEventListener('vmas-notif-settings-update', load)
    }
  }, [user?.id, showNotifications])

  const fetchData = async () => {
    if (!user) return
    try {
      // 1. Admin & Controller notifications (backend)
      if (user.role === 'ADMIN' || user.role === 'CONTROLLER') {
        const res = await notificationAPI.getAll()
        const data = res.data.data || []
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.isRead).length)
      }

      // 2. Dashboard Alerts (Admin/Controller)
      if (user.role === 'ADMIN' || user.role === 'CONTROLLER') {
        const { alertAPI } = await import('../services/api')
        const alertRes = await alertAPI.getDashboardAlerts()
        setAlertCount(alertRes.data.data.totalAlerts || 0)
      }
    } catch (err) {
      console.error('Error fetching topbar data:', err)
    }
  }

  const refreshLocalNotifs = useCallback(() => {
    if (user?.role === 'CONTROLLER') {
      const data = notifService.getControllerNotifications()
      setCtrlNotifs(data)
      setCtrlUnread(data.filter(n => !n.isRead).length)
    } else if (user?.role === 'DRIVER') {
      const data = notifService.getDriverNotifications()
      setDrvNotifs(data)
      setDrvUnread(data.filter(n => !n.isRead).length)
    }
  }, [user?.role])

  useEffect(() => {
    fetchData()
    refreshLocalNotifs()
    const interval = setInterval(fetchData, 30000)

    window.addEventListener('ctrl-notification-update', refreshLocalNotifs)
    window.addEventListener('drv-notification-update', refreshLocalNotifs)

    return () => {
      clearInterval(interval)
      window.removeEventListener('ctrl-notification-update', refreshLocalNotifs)
      window.removeEventListener('drv-notification-update', refreshLocalNotifs)
    }
  }, [user])

  // Handlers
  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) { console.error(err) }
  }

  const handleCtrlMarkRead = (id) => notifService.markCtrlRead(id)
  const handleCtrlClearAll = () => notifService.clearAllCtrlNotifications()
  const handleDrvMarkRead = (id) => notifService.markDrvRead(id)

  const handleMarkAllAsRead = async () => {
    try {
      if (user?.role === 'ADMIN' || user?.role === 'CONTROLLER') {
        await notificationAPI.markAllAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
      if (user?.role === 'CONTROLLER') {
        notifService.markAllCtrlRead()
      } else if (user?.role === 'DRIVER') {
        notifService.markAllDrvRead()
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  // Navigate to link + mark read
  const handleNotifClick = (n, markRead) => {
    if (!n.isRead && markRead) markRead(n.id)
    setShowNotifications(false)
    const dest = n.link || getLinkFromType(n.type)
    if (dest) navigate(dest)
  }

  const handleAdminNotifClick = (n) => {
    if (!n.isRead) handleMarkAsRead(n.id)
    setShowNotifications(false)
    const dest = n.link || getLinkFromType(n.type)
    if (dest) navigate(dest)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Apply the alert-type filter: hide notifications whose alert category is deselected (non-alert types always show)
  const passAlert = (n) => { const c = alertCategoryOf(n?.type); return c === null || alertFilter.includes(c) }
  const fNotifications = notifications.filter(passAlert)
  const fCtrlNotifs = ctrlNotifs.filter(passAlert)
  const fDrvNotifs = drvNotifs.filter(passAlert)
  const fUnread = fNotifications.filter(n => !n.isRead).length
  const fCtrlUnread = fCtrlNotifs.filter(n => !n.isRead).length
  const fDrvUnread = fDrvNotifs.filter(n => !n.isRead).length

  const totalUnread = fUnread +
    (user?.role === 'CONTROLLER' ? fCtrlUnread : 0) +
    (user?.role === 'DRIVER' ? fDrvUnread : 0) +
    ((user?.role === 'ADMIN' || user?.role === 'CONTROLLER') ? alertCount : 0)
  const hasUnreadNotifs = fUnread > 0 || (user?.role === 'CONTROLLER' ? fCtrlUnread > 0 : false) || (user?.role === 'DRIVER' ? fDrvUnread > 0 : false)

  return (
    <>
      <style>{`
        @keyframes bellSwing {
          0%, 100% { transform: rotate(0); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-15deg); }
          60% { transform: rotate(10deg); }
          80% { transform: rotate(-10deg); }
        }

        @keyframes bellRingingAlert {
          0%, 85%, 100% { transform: rotate(0) scale(1); }
          90% { transform: rotate(12deg) scale(1.05); }
          92% { transform: rotate(-12deg) scale(1.05); }
          94% { transform: rotate(10deg) scale(1.05); }
          96% { transform: rotate(-10deg) scale(1.05); }
          98% { transform: rotate(5deg) scale(1.02); }
        }

        @keyframes badgePulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            transform: scale(1.15);
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        @keyframes badgePulseAlert {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1.15);
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        @keyframes dropdownEntry {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes mobileSlideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .topbar-bell-container {
          transition: all 0.2s ease;
        }
        .topbar-bell-container:hover {
          background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} !important;
        }
        .topbar-bell-container:hover .topbar-bell-icon-wrapper {
          animation: bellSwing 0.5s ease-in-out;
          transform-origin: top center;
        }

        .topbar-notif-dropdown {
          position: absolute;
          top: 100%;
          right: -20px;
          margin-top: 16px;
          width: 380px;
          background: ${isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)'};
          backdrop-filter: blur(12px);
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          border-radius: 16px;
          box-shadow: ${isDark ? '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' : 'var(--shadow-xl)'};
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: dropdownEntry 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }

        .topbar-notif-dropdown-list {
          max-height: 380px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .topbar-notif-dropdown-list::-webkit-scrollbar {
          display: none;
        }

        .topbar-notif-mobile-close {
          display: none;
        }

      `}</style>
      <header 
        className="topbar"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', background: 'var(--topbar-bg)',
          borderBottom: '1px solid var(--topbar-border)', height: 'var(--navbar-h)', boxSizing: 'border-box', width: '100%',
          gap: 12,
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: showHeader ? 'translateY(0)' : 'translateY(-100%)',
        }}
      >
      {/* Hamburger menu button (mobile only) */}
      {onMenuToggle && (
        <button
          className="topbar-hamburger"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Left: Title + Breadcrumb */}
      {(title || subtitle) && (
        <div className="topbar-left">
          {title && <span className="topbar-title">{title}</span>}
          {subtitle && <span className="topbar-breadcrumb">{subtitle}</span>}
        </div>
      )}


      {/* Right Actions */}
      <div className="topbar-right-actions" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 28px)', marginLeft: 'auto' }}>
        {/* Theme Toggle — Premium pill with animated knob */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center',
            width: 56, height: 30,
            borderRadius: 999,
            padding: 3,
            border: 'none',
            cursor: 'pointer',
            background: isDark
              ? 'linear-gradient(135deg, #172554, #1e3a8a)'
              : 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            boxShadow: isDark
              ? '0 0 0 1px rgba(37, 99, 235,0.4), 0 4px 16px rgba(37, 99, 235,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 0 0 1px rgba(29, 78, 216,0.2), 0 2px 8px rgba(29, 78, 216,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            outline: 'none',
          }}
        >
          {/* Sliding knob */}
          <span style={{
            position: 'absolute',
            left: isDark ? 'calc(100% - 27px)' : '3px',
            width: 24, height: 24,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark
              ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
              : 'linear-gradient(135deg, #ffffff, #f0f4ff)',
            boxShadow: isDark
              ? '0 2px 8px rgba(37, 99, 235,0.6), 0 0 12px rgba(37, 99, 235,0.4)'
              : '0 2px 6px rgba(29, 78, 216,0.25), 0 1px 2px rgba(0,0,0,0.08)',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease',
          }}>
            {isDark
              ? <Moon size={12} color="#fff" />
              : <Sun size={12} color="#1d4ed8" />
            }
          </span>
          {/* Background icon hints */}
          <Sun size={10} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(29, 78, 216,0.3)'} style={{ marginLeft: 4, flexShrink: 0 }} />
          <Moon size={10} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(29, 78, 216,0.2)'} style={{ marginLeft: 'auto', marginRight: 4, flexShrink: 0 }} />
        </button>

        {/* Unified Notification Bell */}
        {user && (
          <div ref={dropdownRef} style={{ position: 'relative', cursor: 'pointer' }}>
            <div 
              onClick={() => {
                const nextShow = !showNotifications;
                setShowNotifications(nextShow);
                if (nextShow) {
                  fetchData();
                  refreshLocalNotifs();
                }
              }} 
              className="topbar-bell-container"
              style={{ 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center',
                padding: 8,
                borderRadius: '50%',
                background: showNotifications 
                  ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)') 
                  : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                animation: totalUnread > 0 ? 'bellRingingAlert 3.5s ease-in-out infinite' : 'none',
                transformOrigin: 'top center',
              }}
              className="topbar-bell-icon-wrapper"
              >
                <Bell 
                  size={22} 
                  color={showNotifications || totalUnread > 0 
                    ? (isDark ? '#3b82f6' : '#2563eb') 
                    : (isDark ? '#94a3b8' : '#6b7280')} 
                  style={{ transition: 'color 0.2s' }}
                />
              </div>
              {totalUnread > 0 && (
                <div 
                  className="topbar-bell-badge"
                  style={{
                    position: 'absolute', 
                    top: 2, 
                    right: 2,
                    background: alertCount > 0 ? '#ef4444' : '#3b82f6',
                    color: '#fff', 
                    fontSize: '0.62rem', 
                    fontWeight: 800, 
                    minWidth: 16, 
                    height: 16, 
                    borderRadius: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: `2px solid var(--topbar-bg)`,
                    padding: '0 2px',
                    boxSizing: 'border-box',
                    animation: alertCount > 0 ? 'badgePulseAlert 2s infinite' : 'badgePulse 2s infinite',
                  }}
                >
                  {totalUnread > 9 ? '9+' : totalUnread}
                </div>
              )}
            </div>
            {showNotifications && (
              <div className="topbar-notif-dropdown">
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: isDark ? '#fff' : '#1e293b', fontWeight: 600 }}>
                    {user.role === 'ADMIN' ? 'System Notifications' : (user.role === 'CONTROLLER' ? 'Activity & Alerts' : 'My Notifications')}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasUnreadNotifs && (
                      <button
                        onClick={handleMarkAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: 6,
                          transition: 'background 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Check size={12} />
                        Mark all as read
                      </button>
                    )}
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="topbar-notif-mobile-close"
                      title="Close"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isDark ? '#94a3b8' : '#64748b',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 6,
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* 1. Dashboard Alerts */}
                {alertCount > 0 && (user.role === 'ADMIN' || user.role === 'CONTROLLER') && (
                  <Link to="/dashboard" style={{ textDecoration: 'none' }} onClick={() => setShowNotifications(false)}>
                    <div style={{ padding: '12px 16px', background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', borderBottom: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)'}`, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: 6, display: 'flex' }}><AlertTriangle size={14} /></div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#f87171' : '#dc2626', fontWeight: 700 }}>{alertCount} Critical System Alerts</p>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Check dashboard for details</span>
                      </div>
                    </div>
                  </Link>
                )}

                <div className="topbar-notif-dropdown-list">
                  {/* 2. Admin System Notifs */}
                  {user.role === 'ADMIN' && (
                    fNotifications.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No recent system activity</div> :
                    fNotifications.map(n => {
                      const dest = n.link || getLinkFromType(n.type)
                      return (
                        <div key={n.id} onClick={() => handleAdminNotifClick(n)} style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', gap: 12, alignItems: 'flex-start', background: n.isRead ? 'transparent' : (isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)'), cursor: dest ? 'pointer' : (n.isRead ? 'default' : 'pointer'), transition: 'all 0.15s', borderLeft: n.isRead ? '3px solid transparent' : '3px solid #3b82f6' }}
                          onMouseEnter={e => { if (dest || !n.isRead) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'transparent' : (isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)') }}
                        >
                          <div style={getSystemNotifIconBg(n.type, n.isRead, isDark)}>{getSystemNotifIconEl(n.type)}</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: n.isRead ? (isDark ? '#94a3b8' : '#64748b') : (isDark ? '#f3f4f6' : '#1e293b'), fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>{parseBackendDate(n.createdAt).toLocaleString()}</span>
                          </div>
                          {dest && <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0, alignSelf: 'center', marginLeft: 4 }} />}
                        </div>
                      )
                    })
                  )}

                  {/* 3. Controller Log */}
                  {user.role === 'CONTROLLER' && (
                    <>
                      {/* System Notifications from Backend */}
                      {fNotifications.length > 0 && (
                        <>
                          <div style={{ padding: '8px 16px', background: isDark ? 'rgba(59,130,246,0.05)' : '#f8fafc', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#eee'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>System Notifications</span>
                          </div>
                          {fNotifications.map(n => {
                            const dest = n.link || getLinkFromType(n.type)
                            return (
                              <div key={n.id} onClick={() => handleAdminNotifClick(n)} style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', gap: 12, alignItems: 'flex-start', background: n.isRead ? 'transparent' : (isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)'), cursor: dest ? 'pointer' : (n.isRead ? 'default' : 'pointer'), transition: 'all 0.15s', borderLeft: n.isRead ? '3px solid transparent' : '3px solid #3b82f6' }}
                                onMouseEnter={e => { if (dest || !n.isRead) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'transparent' : (isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)') }}
                              >
                                <div style={getSystemNotifIconBg(n.type, n.isRead, isDark)}>{getSystemNotifIconEl(n.type)}</div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontSize: '0.85rem', color: n.isRead ? (isDark ? '#94a3b8' : '#64748b') : (isDark ? '#f3f4f6' : '#1e293b'), fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>{parseBackendDate(n.createdAt).toLocaleString()}</span>
                                </div>
                                {dest && <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0, alignSelf: 'center', marginLeft: 4 }} />}
                              </div>
                            )
                          })}
                        </>
                      )}

                      {/* Local Activity Log */}
                      <div style={{ padding: '8px 16px', background: isDark ? 'rgba(96, 165, 250,0.05)' : '#f8fafc', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#eee'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase' }}>Recent Activity</span>
                        {fCtrlNotifs.length > 0 && (
                          <button onClick={handleCtrlClearAll} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.65rem', cursor: 'pointer' }}>Clear All</button>
                        )}
                      </div>
                      {fCtrlNotifs.length === 0 && fNotifications.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No recent activity</div>
                      ) : (
                        fCtrlNotifs.map(n => (
                          <div key={n.id} onClick={() => handleNotifClick(n, handleCtrlMarkRead)} style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', gap: 12, alignItems: 'flex-start', background: n.isRead ? 'transparent' : (isDark ? 'rgba(96, 165, 250,0.06)' : 'rgba(96, 165, 250,0.04)'), cursor: n.link ? 'pointer' : (n.isRead ? 'default' : 'pointer'), transition: 'all 0.15s', borderLeft: n.isRead ? '3px solid transparent' : '3px solid #a855f7' }}
                            onMouseEnter={e => { if (n.link || !n.isRead) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'transparent' : (isDark ? 'rgba(96, 165, 250,0.06)' : 'rgba(96, 165, 250,0.04)') }}
                          >
                            <div style={ctrlNotifIcon(n.type, isDark)}>{ctrlNotifIconEl(n.type)}</div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '0.82rem', color: n.isRead ? (isDark ? '#94a3b8' : '#64748b') : (isDark ? '#f3f4f6' : '#1e293b'), fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>{parseBackendDate(n.createdAt).toLocaleString()}</span>
                            </div>
                            {n.link && <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0, alignSelf: 'center', marginLeft: 4 }} />}
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* 4. Driver Log */}
                  {user.role === 'DRIVER' && (
                    fDrvNotifs.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No recent activity</div> :
                    fDrvNotifs.map(n => (
                      <div key={n.id} onClick={() => handleNotifClick(n, handleDrvMarkRead)} style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', gap: 12, alignItems: 'flex-start', background: n.isRead ? 'transparent' : (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)'), cursor: n.link ? 'pointer' : (n.isRead ? 'default' : 'pointer'), transition: 'all 0.15s', borderLeft: n.isRead ? '3px solid transparent' : '3px solid #10b981' }}
                        onMouseEnter={e => { if (n.link || !n.isRead) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'transparent' : (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)') }}
                      >
                        <div style={drvNotifIcon(n.type, isDark)}>{drvNotifIconEl(n.type)}</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: n.isRead ? (isDark ? '#94a3b8' : '#64748b') : (isDark ? '#f3f4f6' : '#1e293b'), fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>{parseBackendDate(n.createdAt).toLocaleString()}</span>
                        </div>
                        {n.link && <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0, alignSelf: 'center', marginLeft: 4 }} />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        <a href="/profile" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user?.profilePicture ? (
              <img src={user?.profilePicture} alt={user?.userName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={20} color="#ffffff" strokeWidth={2} />
              </div>
            )}
            <div className="topbar-user-profile-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="topbar-username-text" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.userName || 'User'}</span>
              <span className="topbar-role-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{roleText[user?.role] || 'Member'}</span>
            </div>
          </div>
        </a>
      </div>
    </header>
    {isMobile && (
      <div style={{ height: 'var(--navbar-h)', flexShrink: 0 }} />
    )}
    </>
  )
}

export default Topbar
