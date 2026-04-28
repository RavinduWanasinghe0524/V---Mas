import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../services/api'
import { Users, Shield, Gamepad2, Car, CheckCircle, Ban, Wrench, Fuel, MapPin, BarChart3, UserCog, ClipboardList, Activity, AlertTriangle } from 'lucide-react'

/* ── Dark palette ───────────────────────────────────────────── */
const D = {
  bg: '#0d1117',
  surface: '#161b27',
  surfaceHi: '#1e2535',
  border: 'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.13)',
  text: '#e2e8f0',
  textSub: '#64748b',
  purple: '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.15)',
  indigo: '#818cf8',
  indigoDim: 'rgba(129,140,248,0.15)',
  blue: '#60a5fa',
  blueDim: 'rgba(96,165,250,0.15)',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.15)',
  red: '#f87171',
  redDim: 'rgba(248,113,113,0.15)',
  gold: '#fbbf24',
  goldDim: 'rgba(251,191,36,0.15)',
}

const StatCard = ({ icon, label, value, colorDim, colorHex, change }) => (
  <div style={{
    background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
    padding: '20px 22px', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = D.borderHi; e.currentTarget.style.boxShadow = `0 8px 24px ${colorDim}` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</p>
        <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{value}</p>
        {change && <p style={{ fontSize: '0.75rem', color: D.textSub, marginTop: 6 }}>{change}</p>}
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: `0 4px 12px ${colorDim}`, flexShrink: 0, border: `1px solid ${colorHex}30` }}>
        {icon}
      </div>
    </div>
  </div>
)

const SectionHeader = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, marginTop: 10 }}>
    <h2 style={{ margin: 0, fontSize: '1.15rem', color: D.text, fontWeight: 700 }}>{title}</h2>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
  </div>
)

const FeatureCard = ({ icon, title, desc, onClick, disabled = false, btnText = "Open →" }) => (
  <div onClick={disabled ? undefined : onClick} style={{
    background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
    padding: '24px', cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s',
    opacity: disabled ? 0.6 : 1, display: 'flex', flexDirection: 'column', height: '100%'
  }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = D.borderHi; e.currentTarget.style.background = D.surfaceHi; } }}
    onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; } }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 16, border: `1px solid ${D.border}` }}>
      {icon}
    </div>
    <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: D.text, fontWeight: 700 }}>{title}</h3>
    <p style={{ margin: 0, fontSize: '0.85rem', color: D.textSub, lineHeight: 1.5, flex: 1 }}>{desc}</p>

    <div style={{ marginTop: 20 }}>
      {disabled ? (
        <span style={{ padding: '4px 10px', borderRadius: 8, background: D.goldDim, color: D.gold, fontSize: '0.75rem', fontWeight: 700, border: `1px solid rgba(251,191,36,0.3)` }}>Coming Soon</span>
      ) : (
        <button style={{
          padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
        }}>
          {btnText}
        </button>
      )}
    </div>
  </div>
)

const AdminDashboard = ({ stats, loading, navigate }) => {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${D.purpleDim}`, borderTopColor: D.purple, animation: 'spin 1s linear infinite', marginBottom: 16 }}></div>
      <span style={{ color: D.textSub, fontWeight: 600 }}>Loading statistics...</span>
    </div>
  )
  return (
    <>
      <SectionHeader title="User Statistics" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Users size={20}/>} label="Total Users" value={stats.totalUsers} colorDim={D.purpleDim} colorHex={D.purple} change="Registered in system" />
        <StatCard icon={<Shield size={20}/>} label="Admins" value={stats.admins} colorDim={D.indigoDim} colorHex={D.indigo} change="System administrators" />
        <StatCard icon={<Gamepad2 size={20}/>} label="Controllers" value={stats.controllers} colorDim={D.blueDim} colorHex={D.blue} change="Fleet controllers" />
        <StatCard icon={<Car size={20}/>} label="Drivers" value={stats.drivers} colorDim={D.greenDim} colorHex={D.green} change="Vehicle operators" />
        <StatCard icon={<CheckCircle size={20}/>} label="Active" value={stats.activeUsers} colorDim={D.greenDim} colorHex={D.green} change="Currently active accounts" />
        <StatCard icon={<Ban size={20}/>} label="Inactive" value={stats.inactiveUsers} colorDim={D.redDim} colorHex={D.red} change="Disabled accounts" />
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

const ControllerDashboard = ({ navigate }) => (
  <>
    <SectionHeader title="Fleet Overview" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
      <StatCard icon={<Car size={20}/>} label="Total Vehicles" value="24" colorDim={D.purpleDim} colorHex={D.purple} change="Under your management" />
      <StatCard icon={<CheckCircle size={20}/>} label="Active" value="18" colorDim={D.greenDim} colorHex={D.green} change="Currently in use" />
      <StatCard icon={<Wrench size={20}/>} label="Maintenance" value="4" colorDim={D.goldDim} colorHex={D.gold} change="Being serviced" />
      <StatCard icon={<Activity size={20}/>} label="Available" value="2" colorDim={D.blueDim} colorHex={D.blue} change="Ready to assign" />
    </div>

    <SectionHeader title="Controller Tools" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
      <FeatureCard icon={<Car size={24}/>} title="Vehicle Management" desc="Monitor, track, and manage all fleet vehicles." disabled />
      <FeatureCard icon={<UserCog size={24}/>} title="Driver Assignment" desc="Assign and manage drivers to vehicles and routes." disabled />
      <FeatureCard icon={<MapPin size={24}/>} title="Live Tracking" desc="Real-time GPS tracking and vehicle monitoring." onClick={() => navigate('/location')} />
      <FeatureCard icon={<Wrench size={24}/>} title="Maintenance Schedule" desc="Schedule and track vehicle service appointments." onClick={() => navigate('/service')} />
      <FeatureCard icon={<Fuel size={24}/>} title="Fuel Management" desc="Record and track fuel consumption and costs." onClick={() => navigate('/fuel')} />
      <FeatureCard icon={<AlertTriangle size={24}/>} title="Alerts & Incidents" desc="Monitor vehicle alerts and emergency incidents." disabled />
    </div>
  </>
)

const DriverDashboard = ({ navigate }) => (
  <>
    <SectionHeader title="My Overview" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
      <StatCard icon={<Car size={20}/>} label="Assigned Vehicle" value="1" colorDim={D.purpleDim} colorHex={D.purple} change="VH-2024-087" />
      <StatCard icon={<ClipboardList size={20}/>} label="Today's Tasks" value="3" colorDim={D.blueDim} colorHex={D.blue} change="Pending deliveries" />
      <StatCard icon={<CheckCircle size={20}/>} label="Completed" value="12" colorDim={D.greenDim} colorHex={D.green} change="This week" />
      <StatCard icon={<Activity size={20}/>} label="Status" value="Active" colorDim={D.greenDim} colorHex={D.green} change="Ready to drive" />
    </div>

    <SectionHeader title="Driver Tools" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
      <FeatureCard icon={<Car size={24}/>} title="My Vehicle" desc="View status and information about your assigned vehicle." disabled />
      <FeatureCard icon={<ClipboardList size={24}/>} title="Task List" desc="View and manage your assigned tasks and schedules." disabled />
      <FeatureCard icon={<MapPin size={24}/>} title="Location" desc="View your current location relative to fleet bounds." onClick={() => navigate('/location')} />
      <FeatureCard icon={<Fuel size={24}/>} title="Fuel Log" desc="Record fuel consumption and view usage history." onClick={() => navigate('/fuel-log')} />
      <FeatureCard icon={<Wrench size={24}/>} title="Service History" desc="View maintenance history for your vehicle." onClick={() => navigate('/service')} />
      <FeatureCard icon={<BarChart3 size={24}/>} title="My Performance" desc="View driving stats, performance metrics, and history." disabled />
    </div>
  </>
)

const DashboardPage = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, controllers: 0, drivers: 0, activeUsers: 0, inactiveUsers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
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
      } catch (err) {
        console.error('Error loading stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [isAdmin])

  const roleLabel = { ADMIN: 'Administrator', CONTROLLER: 'Fleet Controller', DRIVER: 'Vehicle Driver' }
  const roleEmoji = { ADMIN: <Shield size={32} color="#fff"/>, CONTROLLER: <Gamepad2 size={32} color="#fff"/>, DRIVER: <Car size={32} color="#fff"/> }

  return (
    <div className="app-shell dark-theme-wrapper" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Dashboard" subtitle="Home / Dashboard" />
        <div className="page-body">

          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 32,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: `1px solid ${D.border}`
          }}>
            {/* decorative circles */}
            {[['80%', '−20px', '180px', 'rgba(255,255,255,0.03)'], ['20%', '60%', '120px', 'rgba(255,255,255,0.04)'], ['55%', '80%', '90px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {roleEmoji[user?.role] || <Car size={32} color="#fff"/>}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Good day, {user?.userName}!
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                  Logged in as <strong style={{ color: '#fff' }}>{roleLabel[user?.role] || user?.role}</strong> · Here's your personalized overview
                </p>
              </div>
            </div>
          </div>

          {/* Role-based content */}
          {user?.role === 'ADMIN' && <AdminDashboard stats={stats} loading={loading} navigate={navigate} />}
          {user?.role === 'CONTROLLER' && <ControllerDashboard navigate={navigate} />}
          {user?.role === 'DRIVER' && <DriverDashboard navigate={navigate} />}
        </div>
      </div>

      <style>{`
        .dark-theme-wrapper .topbar {
          background: #161b27 !important;
          border-bottom-color: rgba(255,255,255,0.07) !important;
        }
        .dark-theme-wrapper .topbar-title { color: #e2e8f0 !important; }
        .dark-theme-wrapper .topbar-breadcrumb { color: #475569 !important; }
        .dark-theme-wrapper .topbar-user {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .dark-theme-wrapper .topbar-user:hover {
          background: rgba(99,102,241,0.15) !important;
          border-color: rgba(99,102,241,0.4) !important;
        }
        .dark-theme-wrapper .topbar-name { color: #e2e8f0 !important; }
        .dark-theme-wrapper .sidebar {
          background: #111827 !important;
          border-right-color: rgba(255,255,255,0.07) !important;
        }
        .dark-theme-wrapper .sidebar-header { border-bottom-color: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-title { color: #f1f5f9 !important; }
        .dark-theme-wrapper .sidebar-subtitle { color: #475569 !important; }
        .dark-theme-wrapper .nav-section-label { color: #334155 !important; }
        .dark-theme-wrapper .nav-item { color: #64748b !important; }
        .dark-theme-wrapper .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: #cbd5e1 !important; }
        
        .dark-theme-wrapper .sidebar-divider { background: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-logout-btn { color: rgba(255,255,255,0.4) !important; }
        .dark-theme-wrapper .sidebar-logout-btn:hover { color: #f87171 !important; }
        .dark-theme-wrapper .sidebar-user-card { background: rgba(255,255,255,0.03) !important; }
        .dark-theme-wrapper .sidebar-footer { border-top-color: rgba(255,255,255,0.07) !important; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default DashboardPage
