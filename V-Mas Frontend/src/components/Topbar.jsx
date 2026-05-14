import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Search, Bell, Moon, Sun, User, Check, Info, Fuel, Wrench, Trash2, AlertTriangle } from 'lucide-react'
import { notificationAPI } from '../services/api'

const roleText = {
  ADMIN: 'System Administrator',
  CONTROLLER: 'System Controller',
  DRIVER: 'Driver',
}

// ─── Controller notification helpers (localStorage) ────────────────────────
const CTRL_NOTIF_KEY = 'controller_notifications'

export const addControllerNotification = (message, type = 'INFO') => {
  const existing = JSON.parse(localStorage.getItem(CTRL_NOTIF_KEY) || '[]')
  const newNotif = {
    id: Date.now(),
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  }
  // Keep only last 50
  const updated = [newNotif, ...existing].slice(0, 50)
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify(updated))
  // Dispatch a custom event so the Topbar re-renders immediately
  window.dispatchEvent(new Event('ctrl-notification-update'))
}

const getControllerNotifications = () =>
  JSON.parse(localStorage.getItem(CTRL_NOTIF_KEY) || '[]')

const markCtrlRead = (id) => {
  const updated = getControllerNotifications().map(n =>
    n.id === id ? { ...n, isRead: true } : n
  )
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify(updated))
}

const markAllCtrlRead = () => {
  const updated = getControllerNotifications().map(n => ({ ...n, isRead: true }))
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify(updated))
}

const clearAllCtrlNotifications = () => {
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify([]))
}

// Icon per notification type
const ctrlNotifIcon = (type, isDark) => {
  const base = { borderRadius: '50%', padding: 6, display: 'flex', color: '#fff' }
  if (type === 'FUEL_ADD')    return { ...base, background: '#6366f1' }
  if (type === 'FUEL_EDIT')   return { ...base, background: '#f59e0b' }
  if (type === 'FUEL_DELETE') return { ...base, background: '#ef4444' }
  if (type === 'LOW_EFF')     return { ...base, background: '#f97316' }
  if (type === 'SERVICE')     return { ...base, background: '#10b981' }
  return { ...base, background: isDark ? '#334155' : '#94a3b8' }
}

const ctrlNotifIconEl = (type) => {
  if (type === 'FUEL_ADD')    return <Fuel size={14} />
  if (type === 'FUEL_EDIT')   return <Check size={14} />
  if (type === 'FUEL_DELETE') return <Trash2 size={14} />
  if (type === 'LOW_EFF')     return <AlertTriangle size={14} />
  if (type === 'SERVICE')     return <Wrench size={14} />
  return <Info size={14} />
}
// ───────────────────────────────────────────────────────────────────────────

const Topbar = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'blue'

  // ── Admin notifications ──────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef(null)

  const fetchNotifications = async () => {
    if (user?.role !== 'ADMIN') return
    try {
      const res = await notificationAPI.getAll()
      const data = res.data.data || []
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.isRead).length)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  // ── Controller notifications (localStorage) ──────────────────────────────
  const [ctrlNotifs, setCtrlNotifs] = useState([])
  const [ctrlUnread, setCtrlUnread] = useState(0)
  const [showCtrlNotifs, setShowCtrlNotifs] = useState(false)
  const ctrlDropdownRef = useRef(null)

  const refreshCtrlNotifs = () => {
    const data = getControllerNotifications()
    setCtrlNotifs(data)
    setCtrlUnread(data.filter(n => !n.isRead).length)
  }

  useEffect(() => {
    if (user?.role !== 'CONTROLLER') return
    refreshCtrlNotifs()
    window.addEventListener('ctrl-notification-update', refreshCtrlNotifs)
    const interval = setInterval(refreshCtrlNotifs, 10000)
    return () => {
      window.removeEventListener('ctrl-notification-update', refreshCtrlNotifs)
      clearInterval(interval)
    }
  }, [user])

  const handleCtrlMarkRead = (id) => {
    markCtrlRead(id)
    refreshCtrlNotifs()
  }

  const handleCtrlMarkAllRead = () => {
    markAllCtrlRead()
    refreshCtrlNotifs()
  }

  const handleCtrlClearAll = () => {
    clearAllCtrlNotifications()
    refreshCtrlNotifs()
  }

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowNotifications(false)
      if (ctrlDropdownRef.current && !ctrlDropdownRef.current.contains(e.target))
        setShowCtrlNotifs(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 32px',
      background: 'var(--topbar-bg)',
      borderBottom: '1px solid var(--topbar-border)',
      height: 80, boxSizing: 'border-box', width: '100%',
    }}>
      {/* Left: Global Search */}
      <div style={{ flex: 1, maxWidth: 500 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.04)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.12)'}`,
          borderRadius: 14, padding: '10px 18px',
          transition: 'border-color 0.2s ease',
        }}>
          <Search size={18} color={isDark ? '#64748b' : '#94a3b8'} />
          <input
            type="text"
            placeholder="Search vehicles, drivers, services..."
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-primary)', width: '100%',
              fontSize: '0.95rem', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Right: Actions & User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Day Theme' : 'Switch to Night Theme'}
          style={{
            display: 'flex', alignItems: 'center',
            background: isDark ? '#3b82f6' : '#e0e7ff',
            borderRadius: 24, padding: 4, cursor: 'pointer',
            gap: 4, width: 64, justifyContent: 'space-between',
            border: 'none', outline: 'none',
            boxShadow: isDark
              ? '0 2px 8px rgba(59,130,246,0.4)'
              : '0 2px 8px rgba(99,102,241,0.15)',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{
            background: isDark ? '#fff' : 'transparent',
            borderRadius: '50%', width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.3s ease',
          }}>
            <Moon size={14} color={isDark ? '#3b82f6' : '#9ca3af'} />
          </div>
          <div style={{
            background: !isDark ? '#6366f1' : 'transparent',
            borderRadius: '50%', width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: !isDark ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.3s ease',
          }}>
            <Sun size={14} color={!isDark ? '#fff' : 'rgba(255,255,255,0.5)'} />
          </div>
        </button>

        {/* ── ADMIN Notification Bell ── */}
        {user?.role === 'ADMIN' && (
          <div ref={dropdownRef} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative' }}>
              <Bell size={22} color={isDark ? '#94a3b8' : '#64748b'} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: -5, right: -5,
                  background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                  width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid var(--topbar-bg)`,
                }}>
                  {unreadCount}
                </div>
              )}
            </div>

            {showNotifications && (
              <div style={{
                position: 'absolute', top: '100%', right: -20, marginTop: 16,
                width: 320, background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                <div style={{ padding: '16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: isDark ? '#fff' : '#1e293b', fontWeight: 600 }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No recent notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => !n.isRead && handleMarkAsRead(n.id)} style={{
                        padding: '12px 16px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                        background: n.isRead ? 'transparent' : (isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)'),
                        cursor: n.isRead ? 'default' : 'pointer',
                        transition: 'background 0.2s',
                      }}>
                        <div style={{ background: n.isRead ? (isDark ? '#334155' : '#e2e8f0') : '#3b82f6', color: '#fff', borderRadius: '50%', padding: 6, display: 'flex' }}>
                          <Info size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#e2e8f0' : '#334155', fontWeight: n.isRead ? 400 : 600, lineHeight: 1.4 }}>
                            {n.message}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: 6 }} />}
                      </div>
                    ))
                  )}
                </div>
                <div style={{ background: isDark ? 'rgba(0,0,0,0.1)' : '#f8fafc', padding: 10, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>System generated notifications</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONTROLLER Notification Bell ── */}
        {user?.role === 'CONTROLLER' && (
          <div ref={ctrlDropdownRef} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={() => setShowCtrlNotifs(!showCtrlNotifs)} style={{ position: 'relative' }}>
              <Bell size={22} color={isDark ? '#94a3b8' : '#64748b'} />
              {ctrlUnread > 0 && (
                <div style={{
                  position: 'absolute', top: -5, right: -5,
                  background: '#a855f7', color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                  width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid var(--topbar-bg)`,
                }}>
                  {ctrlUnread > 9 ? '9+' : ctrlUnread}
                </div>
              )}
            </div>

            {showCtrlNotifs && (
              <div style={{
                position: 'absolute', top: '100%', right: -20, marginTop: 16,
                width: 340, background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.15)'}`,
                borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  padding: '14px 16px',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: isDark ? 'rgba(167,139,250,0.05)' : 'rgba(167,139,250,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={16} color='#a855f7' />
                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: isDark ? '#e2e8f0' : '#1e293b', fontWeight: 700 }}>
                      Activity Feed
                    </h3>
                    {ctrlUnread > 0 && (
                      <span style={{ background: '#a855f7', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                        {ctrlUnread} new
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {ctrlUnread > 0 && (
                      <button onClick={handleCtrlMarkAllRead} style={{ background: 'transparent', border: 'none', color: '#a855f7', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                        Mark all read
                      </button>
                    )}
                    {ctrlNotifs.length > 0 && (
                      <button onClick={handleCtrlClearAll} style={{ background: 'transparent', border: 'none', color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {ctrlNotifs.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                      <div style={{ marginBottom: 8, opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
                        <Bell size={32} color={isDark ? '#94a3b8' : '#64748b'} />
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No activity yet</p>
                      <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '4px 0 0' }}>Actions you take will appear here</p>
                    </div>
                  ) : (
                    ctrlNotifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && handleCtrlMarkRead(n.id)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                          background: n.isRead ? 'transparent' : (isDark ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.04)'),
                          cursor: n.isRead ? 'default' : 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!n.isRead) e.currentTarget.style.background = isDark ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'transparent' : (isDark ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.04)') }}
                      >
                        <div style={ctrlNotifIcon(n.type, isDark)}>
                          {ctrlNotifIconEl(n.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0, fontSize: '0.82rem',
                            color: isDark ? '#e2e8f0' : '#334155',
                            fontWeight: n.isRead ? 400 : 600,
                            lineHeight: 1.45, wordBreak: 'break-word'
                          }}>
                            {n.message}
                          </p>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {!n.isRead && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', marginTop: 5, flexShrink: 0 }} />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div style={{
                  background: isDark ? 'rgba(0,0,0,0.1)' : '#f8fafc',
                  padding: '8px 16px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Your fuel & fleet activity log</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {user?.profilePicture ? (
              <img src={user?.profilePicture} alt={user?.userName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#8b5cf6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={22} color="#ffffff" strokeWidth={2} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.userName || 'Admin User'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {roleText[user?.role] || 'System Controller'}
              </span>
            </div>
          </div>
        </Link>

      </div>

      <style>{`
        input::placeholder { color: var(--text-muted) !important; }
      `}</style>
    </header>
  )
}

export default Topbar

