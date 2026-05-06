import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Search, Bell, Moon, Sun, User } from 'lucide-react'

const roleText = {
  ADMIN: 'System Administrator',
  CONTROLLER: 'System Controller',
  DRIVER: 'Driver',
}

const Topbar = () => {
  const { user } = useAuth()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 32px', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.05)',
      height: 80, boxSizing: 'border-box', width: '100%'
    }}>
      {/* Left: Global Search */}
      <div style={{ flex: 1, maxWidth: 500 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '10px 18px',
          transition: 'border-color 0.2s ease'
        }}>
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search vehicles, drivers, services..." 
            style={{ 
              background: 'transparent', border: 'none', color: '#f1f5f9', width: '100%',
              fontSize: '0.95rem', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Right: Actions & User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        
        {/* Theme Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', background: '#3b82f6', borderRadius: 24,
          padding: 4, cursor: 'pointer', gap: 6, width: 64, justifyContent: 'space-between'
        }}>
          <div style={{ background: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <Moon size={14} color="#3b82f6" />
          </div>
          <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sun size={14} color="rgba(255,255,255,0.7)" />
          </div>
        </div>

        {/* Bell Icon */}
        <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={22} color="#94a3b8" />
          <div style={{ 
            position: 'absolute', top: -5, right: -5, 
            background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700,
            width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0f172a'
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
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={22} color="#ffffff" strokeWidth={2} />
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                {user?.userName || 'Admin User'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                {roleText[user?.role] || 'System Controller'}
              </span>
            </div>
          </div>
        </Link>

      </div>

      <style>{`
        input::placeholder { color: #475569 !important; }
      `}</style>
    </header>
  )
}

export default Topbar
