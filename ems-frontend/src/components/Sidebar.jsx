import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Helper for initials
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

const navItems = {
  ADMIN: [
    { label: 'Dashboard',     icon: '📊', to: '/dashboard'     },
    { label: 'Vehicles',      icon: '🚗', to: '/vehicles'      },
    { label: 'Service',       icon: '🔧', to: '/service'       },
    { label: 'Users',         icon: '👥', to: '/users'         },
    { label: 'Fuel Analysis', icon: '⛽', to: '/fuel-analysis' },
    { label: 'Location',      icon: '📍', to: '/location'      },
    { label: 'Reports',       icon: '📈', to: '/reports'       },
    { label: 'My Profile',    icon: '👤', to: '/profile'       },
  ],
  CONTROLLER: [
    { label: 'Dashboard', icon: '📊', to: '/dashboard' },
    { label: 'Vehicles', icon: '🚗', to: '/vehicles', disabled: true },
    { label: 'Driver Assignment', icon: '👨‍✈️', to: '/assignments', disabled: true },
    { label: 'Live Tracking', icon: '📍', to: '/tracking', disabled: true },
    { label: 'Fuel Management', icon: '⛽', to: '/fuel-management' },
    { label: 'Service', icon: '🔧', to: '/service' },
    { label: 'My Profile', icon: '👤', to: '/profile' },
  ],
  DRIVER: [
    { label: 'Dashboard', icon: '📊', to: '/dashboard' },
    { label: 'My Vehicle', icon: '🚗', to: '/vehicle', disabled: true },
    { label: 'Task List', icon: '📋', to: '/tasks', disabled: true },
    { label: 'Fuel Log', icon: '⛽', to: '/fuel-log' },
    { label: 'Service History', icon: '🔧', to: '/service' },
    { label: 'My Profile', icon: '👤', to: '/profile' },
  ],
}

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const items = navItems[user?.role] || navItems.DRIVER

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleColor = { ADMIN: '#6366f1', CONTROLLER: '#3b82f6', DRIVER: '#10b981' }[user?.role] || '#6366f1'
  const roleBg   = { ADMIN: '#eef2ff', CONTROLLER: '#dbeafe', DRIVER: '#d1fae5'  }[user?.role] || '#eef2ff'
  const roleText = { ADMIN: 'Admin', CONTROLLER: 'Controller', DRIVER: 'Driver'  }[user?.role] || ''

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">🚗</div>
          <div>
            <div className="sidebar-title">V-MAS</div>
            <div className="sidebar-subtitle">Fleet Management</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-label">Navigation</div>
          {items.map((item) =>
            item.disabled ? (
              <div
                key={item.to}
                className="nav-item"
                style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                <span style={{
                  marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 700,
                  background: '#fef3c7', color: '#92400e',
                  padding: '2px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>Soon</span>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </div>
      </nav>

      <div className="sidebar-footer" style={{ padding: '16px 16px 20px', borderTop: 'none' }}>
        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} className="sidebar-divider" />
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', border: 'none', background: 'transparent',
            color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '0.9rem', fontWeight: 600, marginBottom: 16,
            transition: 'all 0.15s ease',
          }}
          className="sidebar-logout-btn"
          onMouseEnter={e => { e.currentTarget.style.color = '#dc2626' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#ef4444' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sign Out
        </button>

        {/* User card matching image */}
        <div className="sidebar-user-card" style={{ 
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          background: 'var(--bg-gray-50)', borderRadius: 16,
        }}>
          {user?.profilePicture ? (
            <img src={user?.profilePicture} alt={user?.userName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 700 
            }}>
              {getInitials(user?.userName)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.userName}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{roleText}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
