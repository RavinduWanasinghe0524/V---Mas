import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { userAPI } from '../services/api'
import { Users, Shield, Gamepad2, Car, CheckCircle, Ban, Wrench, Fuel, MapPin, BarChart3, UserCog, ClipboardList, Activity, AlertTriangle } from 'lucide-react'

const StatCard = ({ icon, label, value, colorDim, colorHex, change, onClick }) => (
  <div onClick={onClick} style={{
    background: 'var(--surface)', borderRadius: 16,
    border: '1px solid var(--surface-border)',
    padding: '20px 22px', transition: 'all 0.25s ease',
    boxShadow: 'var(--shadow-sm)', cursor: onClick ? 'pointer' : 'default',
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-3px)'
      e.currentTarget.style.borderColor = 'var(--surface-border-hi)'
      e.currentTarget.style.boxShadow = `0 8px 24px ${colorDim}`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.borderColor = 'var(--surface-border)'
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
    }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</p>
        <p style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{value}</p>
        {change && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>{change}</p>}
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0, border: `1px solid ${colorHex}30` }}>
        {icon}
      </div>
    </div>
  </div>
)

const SectionHeader = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, marginTop: 10 }}>
    <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>{title}</h2>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
  </div>
)

const FeatureCard = ({ icon, title, desc, onClick, disabled = false, btnText = "Open →" }) => (
  <div onClick={disabled ? undefined : onClick} style={{
    background: 'var(--surface)', borderRadius: 16,
    border: '1px solid var(--surface-border)',
    padding: '24px', cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.2s', opacity: disabled ? 0.6 : 1,
    display: 'flex', flexDirection: 'column', height: '100%',
  }}
    onMouseEnter={e => {
      if (!disabled) {
        e.currentTarget.style.borderColor = 'var(--surface-border-hi)'
        e.currentTarget.style.background = 'var(--surface-hi)'
      }
    }}
    onMouseLeave={e => {
      if (!disabled) {
        e.currentTarget.style.borderColor = 'var(--surface-border)'
        e.currentTarget.style.background = 'var(--surface)'
      }
    }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 16, border: '1px solid var(--border)', color: 'var(--primary)' }}>
      {icon}
    </div>
    <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>{title}</h3>
    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>{desc}</p>

    <div style={{ marginTop: 20 }}>
      {disabled ? (
        <span style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(251,191,36,0.3)' }}>Coming Soon</span>
      ) : (
        <button style={{
          padding: '8px 18px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
        }}>
          {btnText}
        </button>
      )}
    </div>
  </div>
)

/* ── Accent colors (theme-aware) ─────────────────────────────── */
const useAccents = (isDark) => ({
  purple:    isDark ? '#a78bfa' : '#7c3aed',
  purpleDim: isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)',
  indigo:    isDark ? '#818cf8' : '#4f46e5',
  indigoDim: isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.1)',
  blue:      isDark ? '#60a5fa' : '#2563eb',
  blueDim:   isDark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.1)',
  green:     isDark ? '#4ade80' : '#16a34a',
  greenDim:  isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.1)',
  red:       isDark ? '#f87171' : '#dc2626',
  redDim:    isDark ? 'rgba(248,113,113,0.15)' : 'rgba(220,38,38,0.1)',
  gold:      isDark ? '#fbbf24' : '#d97706',
  goldDim:   isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.1)',
})

const AdminDashboard = ({ stats, loading, navigate, isDark }) => {
  const A = useAccents(isDark)
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${A.purpleDim}`, borderTopColor: A.purple, animation: 'spin 1s linear infinite', marginBottom: 16 }}></div>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading statistics...</span>
    </div>
  )
  return (
    <>
      <SectionHeader title="User Statistics" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Users size={20} color={A.purple}/>} label="Total Users" value={stats.totalUsers} colorDim={A.purpleDim} colorHex={A.purple} change="Registered in system" onClick={() => navigate('/users')} />
        <StatCard icon={<Shield size={20} color={A.indigo}/>} label="Admins" value={stats.admins} colorDim={A.indigoDim} colorHex={A.indigo} change="System administrators" onClick={() => navigate('/users')} />
        <StatCard icon={<Gamepad2 size={20} color={A.blue}/>} label="Controllers" value={stats.controllers} colorDim={A.blueDim} colorHex={A.blue} change="Fleet controllers" onClick={() => navigate('/users')} />
        <StatCard icon={<Car size={20} color={A.green}/>} label="Drivers" value={stats.drivers} colorDim={A.greenDim} colorHex={A.green} change="Vehicle operators" onClick={() => navigate('/users')} />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Active" value={stats.activeUsers} colorDim={A.greenDim} colorHex={A.green} change="Currently active accounts" onClick={() => navigate('/users')} />
        <StatCard icon={<Ban size={20} color={A.red}/>} label="Inactive" value={stats.inactiveUsers} colorDim={A.redDim} colorHex={A.red} change="Disabled accounts" onClick={() => navigate('/users')} />
      </div>

      <SectionHeader title="Quick Actions" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <FeatureCard icon={<Car size={24}/>} title="Vehicles" desc="Manage and monitor all fleet vehicles, statuses, assignments and details." onClick={() => navigate('/vehicles')} />
        <FeatureCard icon={<Wrench size={24}/>} title="Service" desc="Schedule and track vehicle service appointments and maintenance records." onClick={() => navigate('/service')} />
        <FeatureCard icon={<Users size={24}/>} title="Users" desc="Create, view, edit, and delete users. Manage roles and account status." onClick={() => navigate('/users')} />
        <FeatureCard icon={<Fuel size={24}/>} title="Fuel Analysis" desc="Monitor fuel consumption trends and cost analysis across the entire fleet." onClick={() => navigate('/fuel-analysis')} />
        <FeatureCard icon={<MapPin size={24}/>} title="Location" desc="Real-time GPS tracking for all fleet vehicles. Monitor routes and positions." onClick={() => navigate('/location')} />
        <FeatureCard icon={<BarChart3 size={24}/>} title="Reports" desc="Generate comprehensive reports on fleet performance and system activity." onClick={() => navigate('/reports')} />
      </div>
    </>
  )
}

const ControllerDashboard = ({ navigate, isDark }) => {
  const A = useAccents(isDark)
  return (
    <>
      <SectionHeader title="Fleet Overview" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Car size={20} color={A.purple}/>} label="Total Vehicles" value="24" colorDim={A.purpleDim} colorHex={A.purple} change="Under your management" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Active" value="18" colorDim={A.greenDim} colorHex={A.green} change="Currently in use" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<Wrench size={20} color={A.gold}/>} label="Maintenance" value="4" colorDim={A.goldDim} colorHex={A.gold} change="Being serviced" onClick={() => navigate('/service')} />
        <StatCard icon={<Activity size={20} color={A.blue}/>} label="Available" value="2" colorDim={A.blueDim} colorHex={A.blue} change="Ready to assign" onClick={() => navigate('/vehicles')} />
      </div>
      <SectionHeader title="Controller Tools" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <FeatureCard icon={<Car size={24}/>} title="Vehicle Management" desc="Monitor, track, and manage all fleet vehicles." onClick={() => navigate('/vehicles')} />
        <FeatureCard icon={<UserCog size={24}/>} title="Driver Assignment" desc="Assign and manage drivers to vehicles and routes." onClick={() => navigate('/users')} />
        <FeatureCard icon={<MapPin size={24}/>} title="Live Tracking" desc="Real-time GPS tracking and vehicle monitoring." onClick={() => navigate('/location')} />
        <FeatureCard icon={<Wrench size={24}/>} title="Maintenance Schedule" desc="Schedule and track vehicle service appointments." onClick={() => navigate('/service')} />
        <FeatureCard icon={<Fuel size={24}/>} title="Fuel Management" desc="Record and track fuel consumption and costs." onClick={() => navigate('/fuel-management')} />
        <FeatureCard icon={<AlertTriangle size={24}/>} title="Alerts & Incidents" desc="Monitor vehicle alerts and emergency incidents." onClick={() => navigate('/reports')} />
      </div>
    </>
  )
}

const AlertSection = ({ alerts, navigate, isDark }) => {
  const A = useAccents(isDark)
  if (!alerts || alerts.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionHeader title="System Alerts" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alerts.map((alert, idx) => (
          <div 
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 12,
              background: alert.severity === 'OVERDUE' ? 'var(--error-bg)' : 'var(--warning-bg)',
              border: `1px solid ${alert.severity === 'OVERDUE' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              boxShadow: 'var(--shadow-sm)',
              animation: alert.severity === 'OVERDUE' ? 'pulse-border 2s infinite' : 'none'
            }}
          >
            <div style={{ 
              width: 40, height: 40, borderRadius: 10, 
              background: alert.severity === 'OVERDUE' ? '#ef4444' : '#f59e0b',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertTriangle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</h4>
                <span style={{ 
                  fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, 
                  background: alert.severity === 'OVERDUE' ? '#ef4444' : '#f59e0b', 
                  color: '#fff', textTransform: 'uppercase' 
                }}>
                  {alert.severity}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>{alert.vehicleRegNumber}</strong>: {alert.message}
              </p>
            </div>
            <button 
              onClick={() => navigate(alert.type === 'SERVICE_DUE' ? '/service' : '/vehicles')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              View Details
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse-border {
          0% { border-color: rgba(239,68,68,0.2); }
          50% { border-color: rgba(239,68,68,0.6); }
          100% { border-color: rgba(239,68,68,0.2); }
        }
      `}</style>
    </div>
  )
}

const DriverDashboard = ({ navigate, isDark }) => {
  const A = useAccents(isDark)
  return (
    <>
      <SectionHeader title="My Overview" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Car size={20} color={A.purple}/>} label="Assigned Vehicle" value="1" colorDim={A.purpleDim} colorHex={A.purple} change="VH-2024-087" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<ClipboardList size={20} color={A.blue}/>} label="Today's Tasks" value="3" colorDim={A.blueDim} colorHex={A.blue} change="Pending deliveries" />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Completed" value="12" colorDim={A.greenDim} colorHex={A.green} change="This week" />
        <StatCard icon={<Activity size={20} color={A.green}/>} label="Status" value="Active" colorDim={A.greenDim} colorHex={A.green} change="Ready to drive" />
      </div>
      <SectionHeader title="Driver Tools" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <FeatureCard icon={<Car size={24}/>} title="My Vehicle" desc="View status and information about your assigned vehicle." onClick={() => navigate('/vehicles')} />
        <FeatureCard icon={<ClipboardList size={24}/>} title="Task List" desc="View and manage your assigned tasks and schedules." disabled />
        <FeatureCard icon={<MapPin size={24}/>} title="Location" desc="View your current location relative to fleet bounds." onClick={() => navigate('/location')} />
        <FeatureCard icon={<Fuel size={24}/>} title="Fuel Log" desc="Record fuel consumption and view usage history." onClick={() => navigate('/fuel-log')} />
        <FeatureCard icon={<Wrench size={24}/>} title="Service History" desc="View maintenance history for your vehicle." onClick={() => navigate('/service')} />
        <FeatureCard icon={<BarChart3 size={24}/>} title="My Performance" desc="View driving stats, performance metrics, and history." onClick={() => navigate('/profile')} />
      </div>
    </>
  )
}

const DashboardPage = () => {
  const { user, isAdmin } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'blue'
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, controllers: 0, drivers: 0, activeUsers: 0, inactiveUsers: 0 })
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (isAdmin || user?.role === 'CONTROLLER') {
          // Fetch stats for Admin
          if (isAdmin) {
            const response = await userAPI.getAllUsers()
            const users = response.data.data || []
            setStats({
              totalUsers: users.length,
              admins: users.filter(u => u.role === 'ADMIN').length,
              controllers: users.filter(u => u.role === 'CONTROLLER').length,
              drivers: users.filter(u => u.role === 'DRIVER').length,
              activeUsers: users.filter(u => u.accountStatus === 'ACTIVE').length,
              inactiveUsers: users.filter(u => u.accountStatus === 'INACTIVE').length,
            })
          }

          // Fetch alerts for Admin and Controller
          try {
            const { alertAPI } = await import('../services/api')
            const alertRes = await alertAPI.getDashboardAlerts()
            setAlerts(alertRes.data.data.alerts || [])
          } catch (err) {
            console.error('Error loading alerts:', err)
          }
        }
      } catch (err) {
        console.error('Error loading stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [isAdmin, user?.role])

  const roleLabel = { ADMIN: 'Administrator', CONTROLLER: 'Fleet Controller', DRIVER: 'Vehicle Driver' }
  const roleEmoji = { ADMIN: <Shield size={32} color="#fff"/>, CONTROLLER: <Gamepad2 size={32} color="#fff"/>, DRIVER: <Car size={32} color="#fff"/> }

  return (
    <div className="app-shell" style={{ background: 'var(--bg-body)' }}>
      <Sidebar />
      <div className="main-content" style={{ background: 'var(--bg-body)' }}>
        <Topbar title="Dashboard" subtitle="Home / Dashboard" />
        <div className="page-body">

          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
            borderRadius: 20, padding: '32px 36px', marginBottom: 32,
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {[['80%', '-20px', '180px', 'rgba(255,255,255,0.04)'], ['20%', '60%', '120px', 'rgba(255,255,255,0.05)'], ['55%', '80%', '90px', 'rgba(255,255,255,0.03)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                {roleEmoji[user?.role] || <Car size={32} color="#fff"/>}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Good day, {user?.userName}!
                </h1>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
                  Logged in as <strong style={{ color: '#fff' }}>{roleLabel[user?.role] || user?.role}</strong> · Here's your personalized overview
                </p>
              </div>
            </div>
          </div>

          {/* Alerts Section - Show for Admin and Controller */}
          {(isAdmin || user?.role === 'CONTROLLER') && (
            <AlertSection alerts={alerts} navigate={navigate} isDark={isDark} />
          )}

          {/* Role-based content */}
          {user?.role === 'ADMIN' && <AdminDashboard stats={stats} loading={loading} navigate={navigate} isDark={isDark} />}
          {user?.role === 'CONTROLLER' && <ControllerDashboard navigate={navigate} isDark={isDark} />}
          {user?.role === 'DRIVER' && <DriverDashboard navigate={navigate} isDark={isDark} />}
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default DashboardPage
