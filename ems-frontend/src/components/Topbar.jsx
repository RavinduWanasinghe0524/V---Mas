import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Search, Bell, Moon, Sun, User } from 'lucide-react'

const roleText = {
  ADMIN: 'System Administrator',
  CONTROLLER: 'System Controller',
  DRIVER: 'Driver',
}

const Topbar = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'blue'

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

        {/* Bell Icon */}
        <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={22} color={isDark ? '#94a3b8' : '#64748b'} />
          <div style={{
            position: 'absolute', top: -5, right: -5,
            background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700,
            width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid var(--topbar-bg)`,
          }}>
            3
          </div>
        </div>

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
