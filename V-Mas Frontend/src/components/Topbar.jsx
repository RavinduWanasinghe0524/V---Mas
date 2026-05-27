import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Bell, Moon, Sun, User, Check, Info, Fuel, Wrench, Trash2, AlertTriangle } from 'lucide-react'
import { notificationAPI } from '../services/api'
import * as notifService from '../services/notificationService'

const roleText = {
  ADMIN: 'System Administrator',
  CONTROLLER: 'System Controller',
  DRIVER: 'Driver',
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

const Topbar = ({ onMenuToggle }) => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'blue'

  // ── Unified State ────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]) // Admin (backend)
  const [unreadCount, setUnreadCount] = useState(0)      // Admin (backend)
  const [alertCount, setAlertCount] = useState(0)        // Dashboard Alerts
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef(null)

  // Controller / Driver (localStorage)
  const [ctrlNotifs, setCtrlNotifs] = useState([])
  const [ctrlUnread, setCtrlUnread] = useState(0)
  const [drvNotifs, setDrvNotifs] = useState([])
  const [drvUnread, setDrvUnread] = useState(0)

  const fetchData = async () => {
    if (!user) return
    try {
      // 1. Admin notifications (backend)
      if (user.role === 'ADMIN') {
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

  const refreshLocalNotifs = () => {
    if (user?.role === 'CONTROLLER') {
      const data = notifService.getControllerNotifications()
      setCtrlNotifs(data)
      setCtrlUnread(data.filter(n => !n.isRead).length)
    } else if (user?.role === 'DRIVER') {
      const data = notifService.getDriverNotifications()
      setDrvNotifs(data)
      setDrvUnread(data.filter(n => !n.isRead).length)
    }
  }

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const totalUnread = unreadCount + alertCount + (user?.role === 'CONTROLLER' ? ctrlUnread : 0) + (user?.role === 'DRIVER' ? drvUnread : 0)

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 32px', background: 'var(--topbar-bg)',
      borderBottom: '1px solid var(--topbar-border)', height: 80, boxSizing: 'border-box', width: '100%',
      gap: 12,
    }}>
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


      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginLeft: 'auto' }}>
        {/* Theme Toggle */}
        <button onClick={toggleTheme} style={{
          display: 'flex', alignItems: 'center', background: isDark ? '#3b82f6' : '#dbeafe',
          borderRadius: 24, padding: 4, cursor: 'pointer', gap: 4, width: 64, justifyContent: 'space-between', border: 'none',
          boxShadow: isDark ? '0 2px 8px rgba(59,130,246,0.4)' : '0 2px 8px rgba(37, 99, 235,0.15)',
        }}>
          <div style={{ background: isDark ? '#fff' : 'transparent', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Moon size={14} color={isDark ? '#3b82f6' : '#9ca3af'} />
          </div>
          <div style={{ background: !isDark ? '#2563eb' : 'transparent', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sun size={14} color={!isDark ? '#fff' : 'rgba(255,255,255,0.5)'} />
          </div>
        </button>

        {/* Unified Notification Bell */}
        {user && (
          <div ref={dropdownRef} style={{ position: 'relative', cursor: 'pointer' }}>
            <div onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Bell size={22} color={isDark ? '#94a3b8' : '#9ca3af'} />
              {totalUnread > 0 && (
                <div style={{
                  position: 'absolute', top: -5, right: -5,
                  background: alertCount > 0 ? '#ef4444' : (user.role === 'CONTROLLER' ? '#a855f7' : (user.role === 'DRIVER' ? '#10b981' : '#3b82f6')),
                  color: '#fff', fontSize: '0.65rem', fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid var(--topbar-bg)`,
                }}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </div>
              )}
            </div>

            {showNotifications && (
              <div style={{
                position: 'absolute', top: '100%', right: -20, marginTop: 16, width: 340, background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`, borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                <div style={{ padding: '16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: isDark ? '#fff' : '#1e293b', fontWeight: 600 }}>
                    {user.role === 'ADMIN' ? 'System Notifications' : (user.role === 'CONTROLLER' ? 'Activity & Alerts' : 'My Notifications')}
                  </h3>
                </div>

                {/* 1. Dashboard Alerts */}
                {alertCount > 0 && (user.role === 'ADMIN' || user.role === 'CONTROLLER') && (
                  <Link to="/" style={{ textDecoration: 'none' }} onClick={() => setShowNotifications(false)}>
                    <div style={{ padding: '12px 16px', background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', borderBottom: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)'}`, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: 6, display: 'flex' }}><AlertTriangle size={14} /></div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#f87171' : '#dc2626', fontWeight: 700 }}>{alertCount} Critical System Alerts</p>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Check dashboard for details</span>
                      </div>
                    </div>
                  </Link>
                )}

                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {/* 2. Admin System Notifs */}
                  {user.role === 'ADMIN' && (
                    notifications.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No recent system activity</div> :
                    notifications.map(n => (
                      <div key={n.id} onClick={() => !n.isRead && handleMarkAsRead(n.id)} style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', gap: 12, alignItems: 'flex-start', background: n.isRead ? 'transparent' : (isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)'), cursor: 'pointer' }}>
                        <div style={{ background: n.isRead ? (isDark ? '#374151' : '#f3f4f6') : '#3b82f6', color: '#fff', borderRadius: '50%', padding: 6, display: 'flex' }}><Info size={14} /></div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#f3f4f6' : '#374151', fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* 3. Controller Log */}
                  {user.role === 'CONTROLLER' && (
                    ctrlNotifs.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No recent activity log</div> :
                    <>
                      <div style={{ padding: '8px 16px', background: isDark ? 'rgba(96, 165, 250,0.05)' : '#f8fafc', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#eee'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase' }}>Recent Activity</span>
                        <button onClick={handleCtrlClearAll} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.65rem', cursor: 'pointer' }}>Clear All</button>
                      </div>
                      {ctrlNotifs.map(n => (
                        <div key={n.id} onClick={() => !n.isRead && handleCtrlMarkRead(n.id)} style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', gap: 12, alignItems: 'flex-start', background: n.isRead ? 'transparent' : (isDark ? 'rgba(96, 165, 250,0.06)' : 'rgba(96, 165, 250,0.04)'), cursor: 'pointer' }}>
                          <div style={ctrlNotifIcon(n.type, isDark)}>{ctrlNotifIconEl(n.type)}</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: isDark ? '#f3f4f6' : '#374151', fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* 4. Driver Log */}
                  {user.role === 'DRIVER' && (
                    drvNotifs.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No recent activity</div> :
                    drvNotifs.map(n => (
                      <div key={n.id} onClick={() => !n.isRead && handleDrvMarkRead(n.id)} style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', gap: 12, alignItems: 'flex-start', background: n.isRead ? 'transparent' : (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)'), cursor: 'pointer' }}>
                        <div style={drvNotifIcon(n.type, isDark)}>{drvNotifIconEl(n.type)}</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: isDark ? '#f3f4f6' : '#374151', fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
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
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={20} color="#ffffff" strokeWidth={2} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="topbar-username-text" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.userName || 'User'}</span>
              <span className="topbar-role-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{roleText[user?.role] || 'Member'}</span>
            </div>
          </div>
        </a>
      </div>
    </header>
  )
}

export default Topbar
