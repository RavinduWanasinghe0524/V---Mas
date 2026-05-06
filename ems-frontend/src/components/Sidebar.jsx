import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'
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
    { label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, to: '/dashboard' },
    { label: 'Vehicles', icon: <Truck size={20} strokeWidth={1.5} />, to: '/vehicles', disabled: true },
    { label: 'Driver Assignment', icon: <UserCheck size={20} strokeWidth={1.5} />, to: '/assignments', disabled: true },
    { label: 'Live Tracking', icon: <MapPin size={20} strokeWidth={1.5} />, to: '/tracking', disabled: true },
    { label: 'Fuel Management', icon: <Fuel size={20} strokeWidth={1.5} />, to: '/fuel-management' },
    { label: 'Service', icon: <Wrench size={20} strokeWidth={1.5} />, to: '/service' },
    { label: 'Users', icon: <Users size={20} strokeWidth={1.5} />, to: '/users' },
    { label: 'My Profile', icon: <User size={20} strokeWidth={1.5} />, to: '/profile' },
  ],
  DRIVER: [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, to: '/dashboard' },
    { label: 'My Vehicle', icon: <Truck size={20} strokeWidth={1.5} />, to: '/vehicle', disabled: true },
    { label: 'Task List', icon: <ClipboardList size={20} strokeWidth={1.5} />, to: '/tasks', disabled: true },
    { label: 'Fuel Log', icon: <Fuel size={20} strokeWidth={1.5} />, to: '/fuel-log' },
    { label: 'Service History', icon: <Wrench size={20} strokeWidth={1.5} />, to: '/service' },
    { label: 'My Profile', icon: <User size={20} strokeWidth={1.5} />, to: '/profile' },
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
          <div className="sidebar-logo" style={{ padding: 0, overflow: 'hidden', background: 'transparent', boxShadow: 'none' }}>
            <img
              src={logo}
              alt="V-MAS"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
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

      <div className="sidebar-footer" style={{ padding: '16px 16px 20px', borderTop: 'none', marginTop: 'auto' }}>
        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} className="sidebar-divider" />
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)',
            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '0.95rem', fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
          className="sidebar-logout-btn"
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sign Out
        </button>
      </div>
      <style>{`
        .sidebar-nav {
          padding: 0 16px 0 0 !important; /* remove left padding to touch edge, keep right padding */
        }
        .nav-section-label {
          padding-left: 20px !important;
        }
        .nav-item {
          border-radius: 0 24px 24px 0 !important;
          margin: 4px 0 !important;
          padding-left: 20px !important;
          color: #64748b !important;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.05) !important;
          color: #e2e8f0 !important;
        }
        .nav-item.active {
          background: #2563eb !important;
          color: #ffffff !important;
        }
        .nav-item.active .nav-icon {
          color: #ffffff !important;
        }
        /* Override any local dark-theme wrappers that might conflict */
        .dark-theme-wrapper .nav-item.active {
          background: #2563eb !important;
          color: #ffffff !important;
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
