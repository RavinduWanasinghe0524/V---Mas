import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleBadgeStyle = {
  ADMIN:      { background: '#ede9fe', color: '#6d28d9' },
  CONTROLLER: { background: '#dbeafe', color: '#1d4ed8' },
  DRIVER:     { background: '#d1fae5', color: '#065f46' },
}

// Helper to get initials
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

const Topbar = ({ title, subtitle, hideTitle = false, children }) => {
  const { user } = useAuth()
  const badgeStyle = roleBadgeStyle[user?.role] || { background: '#f3f4f6', color: '#374151' }

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ flex: 1 }}>
        {!hideTitle && (
          <div>
            <div className="topbar-title">{title}</div>
            {subtitle && <div className="topbar-breadcrumb">{subtitle}</div>}
          </div>
        )}
        {children}
      </div>

      <div className="topbar-right">
        {!hideTitle && (
          <span style={{
            padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            ...badgeStyle,
          }}>
            {user?.role}
          </span>
        )}

        {/* Bell Icon */}
        <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12, marginRight: 8 }} className="topbar-bell">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'inherit' }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <div style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, background: '#3b82f6', borderRadius: '50%', border: '2px solid transparent' }} className="topbar-dot" />
        </div>

        <Link to="/profile">
          <div className="topbar-user" style={{ padding: '6px 12px 6px 6px', gap: 10 }}>
            {user?.profilePicture ? (
              <img src={user?.profilePicture} alt={user?.userName} className="topbar-avatar" />
            ) : (
              <div className="topbar-avatar-text" style={{ 
                width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #818cf8)', 
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 
              }}>
                {getInitials(user?.userName)}
              </div>
            )}
            {!hideTitle && (
              <div>
                <div className="topbar-name">{user?.userName}</div>
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}

export default Topbar
