import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getRoleLogo } from '../utils/roleAssets'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Truck, Wrench, Users, Fuel,
  BarChart2, User, ChevronLeft, LogOut, ClipboardList,
} from 'lucide-react'

const navItems = {
  ADMIN: [
    { label: 'Dashboard',     icon: <LayoutDashboard size={23} strokeWidth={1.5} />, to: '/dashboard'     },
    { label: 'Vehicles',      icon: <Truck size={23} strokeWidth={1.5} />,           to: '/vehicles'      },
    { label: 'Users',         icon: <Users size={23} strokeWidth={1.5} />,           to: '/users'         },
    { label: 'Service',       icon: <Wrench size={23} strokeWidth={1.5} />,          to: '/service'       },
    { label: 'Fuel Analysis', icon: <Fuel size={23} strokeWidth={1.5} />,            to: '/fuel-analysis' },
    { label: 'Reports',       icon: <BarChart2 size={23} strokeWidth={1.5} />,       to: '/reports'       },
    { label: 'My Profile',    icon: <User size={23} strokeWidth={1.5} />,            to: '/profile'       },
  ],
  CONTROLLER: [
    { label: 'Dashboard',       icon: <LayoutDashboard size={23} strokeWidth={1.5} />, to: '/dashboard'       },
    { label: 'Vehicles',        icon: <Truck size={23} strokeWidth={1.5} />,           to: '/vehicles'        },
    { label: 'Users',           icon: <Users size={23} strokeWidth={1.5} />,           to: '/users'           },
    { label: 'Service',         icon: <Wrench size={23} strokeWidth={1.5} />,          to: '/service'         },
    { label: 'Fuel Management', icon: <Fuel size={23} strokeWidth={1.5} />,            to: '/fuel-management' },
    { label: 'Job Management',  icon: <ClipboardList size={23} strokeWidth={1.5} />,   to: '/jobs'            },
    { label: 'My Profile',      icon: <User size={23} strokeWidth={1.5} />,            to: '/profile'         },
  ],
  DRIVER: [
    { label: 'Dashboard',       icon: <LayoutDashboard size={23} strokeWidth={1.5} />, to: '/dashboard' },
    { label: 'My Jobs',         icon: <ClipboardList size={23} strokeWidth={1.5} />,   to: '/jobs'     },
    { label: 'Vehicles',        icon: <Truck size={23} strokeWidth={1.5} />,           to: '/vehicles'  },
    { label: 'Service History', icon: <Wrench size={23} strokeWidth={1.5} />,          to: '/service'   },
    { label: 'Fuel Log',        icon: <Fuel size={23} strokeWidth={1.5} />,            to: '/fuel-log'  },
    { label: 'My Profile',      icon: <User size={23} strokeWidth={1.5} />,            to: '/profile'   },
  ],
}

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const isDark = theme === 'blue'
  const items = navItems[user?.role] || navItems.DRIVER

  // ── Mobile detection ─────────────────────────────────────────────────────
  const isMobile = isOpen  // On mobile the sidebar is always a drawer (isOpen controlled)

  // ── Collapse state — persisted to localStorage ──────────────────────────
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar-collapsed') === 'true'
  )
  const sidebarRef = useRef(null)

  // On mobile: sidebar drawer should never appear collapsed (always show labels)
  const effectiveCollapsed = isMobile ? false : collapsed

  // Sync --sidebar-w CSS variable whenever collapsed changes
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-w',
      collapsed ? '76px' : '290px'
    )
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  // When mobile drawer closes, restore desktop collapsed state variable
  useEffect(() => {
    if (!isOpen) {
      // re-apply desktop sidebar width
      document.documentElement.style.setProperty(
        '--sidebar-w',
        collapsed ? '76px' : '290px'
      )
    }
  }, [isOpen, collapsed])

  // ── Collapse when clicking outside the sidebar ─────────────────────────
  const justExpanded = useRef(false)

  // ── Expand on Nav Click and close mobile drawer ────────────────────────
  const handleNavClick = () => {
    if (collapsed) {
      setCollapsed(false)
      justExpanded.current = true // block the immediate outside-click trigger
    }
    onClose() // close mobile drawer
  }

  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If already collapsed, do nothing
      if (collapsed) return

      // If we just expanded from clicking a collapsed item, ignore this click event propagation
      if (justExpanded.current) {
        justExpanded.current = false
        return
      }

      // Don't collapse if clicking the sidebar toggle button
      if (e.target.closest('.sidebar-toggle-btn')) return

      // Don't collapse if clicking inside the sidebar
      if (sidebarRef.current && sidebarRef.current.contains(e.target)) return

      // Collapse the sidebar
      setCollapsed(true)
    }

    // Use capture phase to intercept click before standard handlers
    document.addEventListener('click', handleOutsideClick, true)
    return () => {
      document.removeEventListener('click', handleOutsideClick, true)
    }
  }, [collapsed])

  // ── Collapsible nav-group open/close state ──────────────────────────────
  const [expanded, setExpanded] = useState(() => {
    const init = {}
    items.forEach(item => { if (item.children) init[item.label] = true })
    return init
  })
  const toggleExpand = (label) =>
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }))

  const handleLogout = () => {
    logout()
  }

  // ── Render a single nav item ─────────────────────────────────────────────
  const renderItem = (item) => {
    // Disabled / coming-soon item
    if (item.disabled) {
      return (
        <div
          key={item.label}
          className="sidebar-nav-tooltip nav-item"
          style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label-text">{item.label}</span>
          <span className="nav-label-text" style={{
            marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 700,
            background: isDark ? 'rgba(251,191,36,0.15)' : '#fef3c7',
            color: isDark ? '#fbbf24' : '#92400e',
            padding: '2px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>Soon</span>
          <span className="nav-tooltip-label">{item.label}</span>
        </div>
      )
    }

    // Parent with nested children (collapsible group)
    if (item.children) {
      const grpOpen = expanded[item.label]
      return (
        <div key={item.label} className="sidebar-nav-tooltip">
          <div
            className="nav-item nav-parent"
            onClick={() => toggleExpand(item.label)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label-text">{item.label}</span>
            <span className="nav-label-text" style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center',
              transition: 'transform 0.22s ease',
              transform: grpOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--text-light)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
            <span className="nav-tooltip-label">{item.label}</span>
          </div>
          {!collapsed && (
            <div style={{
              overflow: 'hidden',
              maxHeight: grpOpen ? `${item.children.length * 52}px` : '0',
              transition: 'max-height 0.25s ease',
            }}>
              {item.children.map(child => (
                <NavLink
                  key={child.label}
                  to={child.to}
                  className={({ isActive }) => `nav-item nav-child${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon" style={{ fontSize: '0.88em' }}>{child.icon}</span>
                  <span className="nav-label-text">{child.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Plain nav link
    return (
      <div key={item.label} className="sidebar-nav-tooltip">
        <NavLink
          to={item.to}
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label-text">{item.label}</span>
        </NavLink>
        <span className="nav-tooltip-label">{item.label}</span>
      </div>
    )
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      {/* ── Collapse toggle button ──────────────────────────────────────────
           Rendered OUTSIDE <aside> so it isn't clipped by overflow:hidden.
           Uses position:fixed + left:calc(--sidebar-w - 14px) to always
           sit precisely at the vertical center of the sidebar's right edge. ── */}
      <button
        className={`sidebar-toggle-btn${collapsed ? ' is-collapsed' : ''}`}
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft size={14} strokeWidth={2.5} />
      </button>

      <aside
        ref={sidebarRef}
        className={`sidebar${isOpen ? ' sidebar-open' : ''}${effectiveCollapsed ? ' sidebar-collapsed' : ''}`}
      >

        {/* Mobile close button */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">✕</button>

        {/* ── Brand / Logo ── */}
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
            title="Go to Dashboard"
          >
            <div className="sidebar-logo" style={{ padding: 0, overflow: 'hidden', background: 'transparent', boxShadow: 'none', flexShrink: 0 }}>
              <img
                src={getRoleLogo(user?.role)} alt="V-MAS Logo"
                style={{
                  width: 44, height: 44, borderRadius: 12, objectFit: 'contain',
                  filter: 'drop-shadow(0 0 8px rgba(37,99,235,0.6))', display: 'block',
                }}
              />
            </div>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="sidebar-title">V-MAS</div>
              <div className="sidebar-subtitle">Fleet Management</div>
            </div>
          </div>
        </div>

        {/* ── Nav items ── */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {/* Always show label on mobile, hide on desktop when collapsed */}
            <div className={`nav-section-label${effectiveCollapsed ? '' : ''}`}>Navigation</div>
            {items.map(renderItem)}
          </div>
        </nav>

        {/* ── Sign Out ── */}
        <div style={{
          padding: effectiveCollapsed ? '12px 8px 16px' : '20px 20px 24px',
          marginTop: 'auto',
          transition: 'padding 0.28s ease',
        }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: effectiveCollapsed ? 12 : 20, transition: 'margin 0.28s ease' }} />
          <button
            onClick={handleLogout}
            className={`sidebar-logout-btn${isMobile ? ' sidebar-logout-mobile' : ''}`}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              gap: 10,
              padding: isMobile ? '16px 20px' : effectiveCollapsed ? '12px' : '14px 18px',
              borderRadius: 12,
              border: isMobile
                ? '1.5px solid rgba(239,68,68,0.5)'
                : '1px solid rgba(239,68,68,0.2)',
              background: isMobile
                ? isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)'
                : 'rgba(239,68,68,0.08)',
              color: isDark ? '#f87171' : '#dc2626',
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: isMobile ? '1.05rem' : '1rem',
              fontWeight: 700,
              letterSpacing: '0.01em',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.22)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
              e.currentTarget.style.color = isDark ? '#fca5a5' : '#b91c1c'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isMobile
                ? isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)'
                : 'rgba(239,68,68,0.08)'
              e.currentTarget.style.borderColor = isMobile ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)'
              e.currentTarget.style.color = isDark ? '#f87171' : '#dc2626'
            }}
          >
            <LogOut size={isMobile ? 22 : 20} strokeWidth={2.2} />
            <span className="sidebar-logout-text">Sign Out</span>
          </button>
        </div>


      </aside>
    </>
  )
}

export default Sidebar
