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
    background: 'var(--surface)', borderRadius: 24,
    border: '1px solid var(--surface-border)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden',
    padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-6px)'
      e.currentTarget.style.borderColor = colorHex + '50'
      e.currentTarget.style.boxShadow = `0 16px 32px ${colorHex}20`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.borderColor = 'var(--surface-border)'
      e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
    }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colorHex}30`, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{value}</div>
      {change && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>{change}</div>}
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
    background: 'var(--surface)', borderRadius: 20,
    border: '1px solid var(--surface-border)',
    padding: '28px', cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', opacity: disabled ? 0.6 : 1,
    display: 'flex', flexDirection: 'column', height: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
  }}
    onMouseEnter={e => {
      if (!disabled) {
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
        e.currentTarget.style.background = 'var(--surface-hi)'
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 16px 40px rgba(99,102,241,0.15)'
      }
    }}
    onMouseLeave={e => {
      if (!disabled) {
        e.currentTarget.style.borderColor = 'var(--surface-border)'
        e.currentTarget.style.background = 'var(--surface)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
      }
    }}>
    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: '1px solid rgba(99,102,241,0.2)', color: 'var(--primary)', flexShrink: 0 }}>
      {icon}
    </div>
    <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1 }}>{desc}</p>

    <div style={{ marginTop: 22 }}>
      {disabled ? (
        <span style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(251,191,36,0.3)' }}>Coming Soon</span>
      ) : (
        <button style={{
          padding: '10px 20px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
          color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
        }}>
          {btnText}
        </button>
      )}
    </div>
  </div>
)

/* ── Accent colors (theme-aware) ─────────────────────────────── */
const useAccents = (isDark) => ({
  purple:    isDark ? '#818cf8' : '#4f46e5',
  purpleDim: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(79,70,229,0.1)',
  indigo:    isDark ? '#6366f1' : '#4338ca',
  indigoDim: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(67,56,202,0.1)',
  blue:      isDark ? '#38bdf8' : '#0284c7',
  blueDim:   isDark ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.1)',
  green:     isDark ? '#34d399' : '#059669',
  greenDim:  isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.1)',
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
              background: alert.severity === 'OVERDUE' ? 'var(--danger-bg)' : 'var(--warning-bg)',
              border: `1px solid ${alert.severity === 'OVERDUE' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              boxShadow: 'var(--shadow-sm)',
              animation: alert.severity === 'OVERDUE' ? 'pulse-border 2s infinite' : 'none'
            }}
          >
            <div style={{ 
              width: 40, height: 40, borderRadius: 10, 
              background: alert.severity === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertTriangle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</h4>
                <span style={{ 
                  fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, 
                  background: alert.severity === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)', 
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
              onClick={() => {
                if (alert.type === 'SERVICE_DUE') {
                  navigate('/service')
                } else {
                  navigate('/vehicles', { state: { openVehicleProfile: alert.vehicleRegNumber } })
                }
              }}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.15)', color: 'var(--text-primary)',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: 'var(--bg-body)' }}>
        <Topbar title="Dashboard" subtitle="Home / Dashboard" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body">

          {/* Hero Banner — Unified design matching UsersPage */}
          <div style={{
            background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
            borderRadius: 28, padding: '40px', marginBottom: 32,
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          }}>
            {/* Decorative circles */}
            {[['80%', '-20px', '180px', 'rgba(255,255,255,0.03)'], ['20%', '60%', '120px', 'rgba(255,255,255,0.04)'], ['55%', '80%', '90px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 16, width: 64, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}>
                {roleEmoji[user?.role] || <Car size={32} color="#fff" />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Good day, {user?.userName}!
                  </h1>
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: '#dbeafe', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    {roleLabel[user?.role] || user?.role}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', color: '#60a5fa', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Here's your personalized fleet overview
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
