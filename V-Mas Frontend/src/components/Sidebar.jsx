import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Truck, Wrench, Users, Fuel,
  MapPin, BarChart2, User, UserCheck, ClipboardList
} from 'lucide-react'

// Helper for initials
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

const navItems = {
  ADMIN: [
    { label: 'Dashboard',     icon: <LayoutDashboard size={20} strokeWidth={1.5} />, to: '/dashboard'     },
    { label: 'Vehicles',      icon: <Truck size={20} strokeWidth={1.5} />, to: '/vehicles'      },
    { label: 'Service',       icon: <Wrench size={20} strokeWidth={1.5} />, to: '/service'       },
    { label: 'Users',         icon: <Users size={20} strokeWidth={1.5} />, to: '/users'         },
    { label: 'Fuel Analysis', icon: <Fuel size={20} strokeWidth={1.5} />, to: '/fuel-analysis' },
    { label: 'Location',      icon: <MapPin size={20} strokeWidth={1.5} />, to: '/location'      },
    { label: 'Reports',       icon: <BarChart2 size={20} strokeWidth={1.5} />, to: '/reports'       },
    { label: 'My Profile',    icon: <User size={20} strokeWidth={1.5} />, to: '/profile'       },
  ],
  CONTROLLER: [
    { label: 'Dashboard',        icon: <LayoutDashboard size={20} strokeWidth={1.5} />, to: '/dashboard' },
    { label: 'Vehicles',         icon: <Truck size={20} strokeWidth={1.5} />,         to: '/vehicles' },
    { label: 'Driver Assignment', icon: <UserCheck size={20} strokeWidth={1.5} />,    to: '/users' },
    { label: 'Live Tracking',    icon: <MapPin size={20} strokeWidth={1.5} />,         to: '/location' },
    { label: 'Fuel Management',  icon: <Fuel size={20} strokeWidth={1.5} />,          to: '/fuel-management' },
    { label: 'Service',          icon: <Wrench size={20} strokeWidth={1.5} />,        to: '/service' },
    { label: 'Users',            icon: <Users size={20} strokeWidth={1.5} />,         to: '/users' },
    { label: 'My Profile',       icon: <User size={20} strokeWidth={1.5} />,          to: '/profile' },
  ],
  DRIVER: [
    { label: 'Dashboard',       icon: <LayoutDashboard size={20} strokeWidth={1.5} />, to: '/dashboard' },
    { label: 'My Vehicle',      icon: <Truck size={20} strokeWidth={1.5} />,           to: '/vehicles' },
    { label: 'Task List',       icon: <ClipboardList size={20} strokeWidth={1.5} />,  to: '/tasks',    disabled: true },
    { label: 'Fuel Log',        icon: <Fuel size={20} strokeWidth={1.5} />,            to: '/fuel-log' },
    { label: 'Service History', icon: <Wrench size={20} strokeWidth={1.5} />,         to: '/service' },
    { label: 'My Profile',      icon: <User size={20} strokeWidth={1.5} />,            to: '/profile' },
  ],
}

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'blue'
  const items = navItems[user?.role] || navItems.DRIVER

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo" style={{ padding: 0, overflow: 'hidden', background: 'transparent', boxShadow: 'none' }}>
            <img
              src={logo}
              alt="V-MAS"
              style={{
                width: 40, height: 40, borderRadius: 10,
                objectFit: 'cover',
                filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.6))',
                display: 'block',
              }}
            />
          </div>
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
                  background: isDark ? 'rgba(251,191,36,0.15)' : '#fef3c7',
                  color: isDark ? '#fbbf24' : '#92400e',
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

      <div style={{ padding: '16px 16px 20px', marginTop: 'auto' }}>
        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-logout-btn"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 12,
            border: '1px solid rgba(239, 68, 68, 0.2)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: isDark ? 'rgba(248,113,113,0.8)' : '#dc2626',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '0.875rem', fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)'
            e.currentTarget.style.color = isDark ? '#f87171' : '#b91c1c'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
            e.currentTarget.style.color = isDark ? 'rgba(248,113,113,0.8)' : '#dc2626'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign Out
        </button>
      </div>

      <style>{`
        .sidebar {
          background: var(--sidebar-bg) !important;
          border-right: 1px solid var(--border) !important;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .sidebar-header {
          border-bottom: 1px solid var(--border) !important;
          transition: border-color 0.3s ease;
        }
        .sidebar-title { color: var(--text-primary) !important; }
        .sidebar-subtitle { color: var(--text-muted) !important; }
        .nav-section-label { color: var(--text-light) !important; padding-left: 20px !important; }

        .sidebar-nav { padding: 0 16px 0 0 !important; }

        .nav-item {
          border-radius: 0 24px 24px 0 !important;
          margin: 4px 0 !important;
          padding-left: 20px !important;
          color: var(--text-muted) !important;
          transition: background 0.15s ease, color 0.15s ease !important;
        }
        .nav-item:hover {
          background: var(--primary-muted) !important;
          color: var(--text-primary) !important;
        }
        .nav-item.active {
          background: #2563eb !important;
          color: #ffffff !important;
        }
        .nav-item.active .nav-icon { color: #ffffff !important; }
      `}</style>
    </aside>
  )
}

export default Sidebar
