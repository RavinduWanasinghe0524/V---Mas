import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Search, Bell, Moon, Sun, User, Check, Trash2, Info } from 'lucide-react'
import { notificationAPI } from '../services/api'

const roleText = {
  ADMIN: 'System Administrator',
  CONTROLLER: 'System Controller',
  DRIVER: 'Driver',
}

const Topbar = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'blue'

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
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          {/* Moon (left = active in dark) */}
          <div style={{
            background: isDark ? '#fff' : 'transparent',
            borderRadius: '50%', width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.3s ease',
          }}>
            <Moon size={14} color={isDark ? '#3b82f6' : '#9ca3af'} />
          </div>
          {/* Sun (right = active in light) */}
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

        {/* Bell Icon / Notifications */}
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

            {/* Notification Dropdown */}
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
