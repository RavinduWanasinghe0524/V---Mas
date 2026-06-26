import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useTheme, useD } from '../context/ThemeContext'
import { userAPI, fuelAPI, serviceAPI, vehicleAPI, alertAPI, notificationAPI } from '../services/api'
import * as notifService from '../services/notificationService'
import { Users, Shield, Gamepad2, Car, CheckCircle, Ban, Wrench, Fuel, MapPin, BarChart3, UserCog, ClipboardList, Activity, AlertTriangle, FileText, ShieldAlert, Clock, TrendingUp, Settings2, Info, Gauge, X } from 'lucide-react'

const StatCard = ({ icon, label, value, colorDim, colorHex, change, onClick }) => (
  <div onClick={onClick} style={{
    background: 'var(--surface)', borderRadius: 24,
    border: '1px solid var(--surface-border)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden',
    padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-6px)'
      e.currentTarget.style.borderColor = colorHex + '50'
      e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.35), 0 0 24px ${colorHex}22`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.borderColor = 'var(--surface-border)'
      e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
    }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colorHex}30`, flexShrink: 0, boxShadow: `0 4px 12px ${colorHex}20` }}>
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
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }}
    onMouseEnter={e => {
      if (!disabled) {
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.45)'
        e.currentTarget.style.background = 'var(--surface-hi)'
        e.currentTarget.style.transform = 'translateY(-5px)'
        e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.35), 0 0 30px rgba(59,130,246,0.1)'
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
    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: '1px solid rgba(59, 130, 246, 0.25)', color: 'var(--primary)', flexShrink: 0, boxShadow: '0 4px 12px rgba(59,130,246,0.15)' }}>
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
          background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
          transition: 'all 0.2s ease',
        }}>
          {btnText}
        </button>
      )}
    </div>
  </div>
)

/* ── Accent colors (theme-aware) ──────────────────────── */
const useAccents = (isDark) => ({
  purple:    isDark ? '#60a5fa' : '#1d4ed8',
  purpleDim: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(29, 78, 216, 0.1)',
  indigo:    isDark ? '#818cf8' : '#1e40af',
  indigoDim: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(29, 78, 216, 0.1)',
  blue:      isDark ? '#38bdf8' : '#0284c7',
  blueDim:   isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
  green:     isDark ? '#34d399' : '#059669',
  greenDim:  isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.1)',
  red:       isDark ? '#f87171' : '#dc2626',
  redDim:    isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(220, 38, 38, 0.1)',
  gold:      isDark ? '#fbbf24' : '#d97706',
  goldDim:   isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.1)',
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
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Users size={20} color={A.purple}/>} label="Total Users" value={stats.totalUsers} colorDim={A.purpleDim} colorHex={A.purple} change="Registered in system" onClick={() => navigate('/users')} />
        <StatCard icon={<Shield size={20} color={A.indigo}/>} label="Admins" value={stats.admins} colorDim={A.indigoDim} colorHex={A.indigo} change="System administrators" onClick={() => navigate('/users', { state: { roleFilter: 'ADMIN' } })} />
        <StatCard icon={<Gamepad2 size={20} color={A.blue}/>} label="Controllers" value={stats.controllers} colorDim={A.blueDim} colorHex={A.blue} change="Fleet controllers" onClick={() => navigate('/users', { state: { roleFilter: 'CONTROLLER' } })} />
        <StatCard icon={<Car size={20} color={A.green}/>} label="Drivers" value={stats.drivers} colorDim={A.greenDim} colorHex={A.green} change="Vehicle operators" onClick={() => navigate('/users', { state: { roleFilter: 'DRIVER' } })} />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Active" value={stats.activeUsers} colorDim={A.greenDim} colorHex={A.green} change="Currently active accounts" onClick={() => navigate('/users', { state: { statusFilter: 'ACTIVE' } })} />
        <StatCard icon={<Ban size={20} color={A.red}/>} label="Inactive" value={stats.inactiveUsers} colorDim={A.redDim} colorHex={A.red} change="Disabled accounts" onClick={() => navigate('/users', { state: { statusFilter: 'INACTIVE' } })} />
      </div>

      <SectionHeader title="Quick Actions" />
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <FeatureCard icon={<Car size={24}/>} title="Vehicles" desc="Manage and monitor all fleet vehicles, statuses, assignments and details." onClick={() => navigate('/vehicles')} />
        <FeatureCard icon={<Wrench size={24}/>} title="Service" desc="Schedule and track vehicle service appointments and maintenance records." onClick={() => navigate('/service')} />
        <FeatureCard icon={<Users size={24}/>} title="Users" desc="Create, view, edit, and delete users. Manage roles and account status." onClick={() => navigate('/users')} />
        <FeatureCard icon={<Fuel size={24}/>} title="Fuel Analysis" desc="Monitor fuel consumption trends and cost analysis across the entire fleet." onClick={() => navigate('/fuel-analysis')} />

        <FeatureCard icon={<BarChart3 size={24}/>} title="Reports" desc="Generate comprehensive reports on fleet performance and system activity." onClick={() => navigate('/reports')} />
      </div>
    </>
  )
}

/* ── Live Fleet Utilization + Status Breakdown ─────────────────── */

/* ── Mapped activities from system alerts/notifications ── */
const mapNotificationToActivity = (n) => {
  let color = '#3b82f6'
  let icon = <Info size={16} color="#3b82f6" />
  let action = 'System Update'
  
  const typeUpper = (n.type || '').toUpperCase()
  if (typeUpper.startsWith('FUEL')) {
    color = '#38bdf8'
    icon = <Fuel size={16} color="#38bdf8" />
    if (typeUpper === 'FUEL_ADD') action = 'Fuel Log Added'
    else if (typeUpper === 'FUEL_EDIT') action = 'Fuel Log Updated'
    else if (typeUpper === 'FUEL_DELETE') action = 'Fuel Log Deleted'
    else if (typeUpper === 'FUEL_RESTORE') action = 'Fuel Log Restored'
    else if (typeUpper === 'FUEL_LOW_EFF' || typeUpper === 'LOW_EFFICIENCY' || typeUpper === 'LOW_EFF') {
      color = '#ef4444'
      icon = <AlertTriangle size={16} color="#ef4444" />
      action = 'Low Fuel Efficiency Alert'
    } else action = 'Fuel Management Update'
  } else if (typeUpper.startsWith('SERVICE') || typeUpper.startsWith('OVERDUE') || typeUpper === 'WARNING') {
    color = '#fbbf24'
    icon = <Wrench size={16} color="#fbbf24" />
    if (typeUpper === 'SERVICE_DUE') action = 'Service Due'
    else if (typeUpper === 'OVERDUE_SERVICE') {
      color = '#ef4444'
      icon = <AlertTriangle size={16} color="#ef4444" />
      action = 'Service Overdue'
    } else {
      action = 'Maintenance Update'
    }
  } else if (typeUpper.startsWith('USER')) {
    color = '#10b981'
    icon = <Users size={16} color="#10b981" />
    if (typeUpper === 'USER_APPROVAL') action = 'User Account Approved'
    else if (typeUpper === 'USER_REJECTION') {
      color = '#ef4444'
      action = 'User Account Rejected'
    } else {
      action = 'User Profile Updated'
    }
  } else if (typeUpper === 'ASSIGN') {
    color = '#a855f7'
    icon = <Car size={16} color="#a855f7" />
    action = 'Driver Assigned'
  } else if (typeUpper === 'UNASSIGN') {
    color = '#64748b'
    icon = <Car size={16} color="#64748b" />
    action = 'Driver Unassigned'
  } else if (typeUpper === 'VEHICLE' || typeUpper === 'UPDATE') {
    color = '#2563eb'
    icon = <Car size={16} color="#2563eb" />
    action = 'Vehicle Updated'
  }

  return {
    id: n.id,
    color,
    icon,
    action,
    detail: n.message,
    timestamp: new Date(n.createdAt)
  }
}

const FleetUtilizationChart = ({ isDark, chartData }) => {
  const [tooltip, setTooltip] = useState(null)
  const [animProgress, setAnimProgress] = useState(0)
  const svgRef = useRef(null)

  const fleetHourlyData = (chartData && chartData.length > 0) ? chartData : [
    { time: '06:00', active: 4 },
    { time: '07:00', active: 7 },
    { time: '08:00', active: 11 },
    { time: '09:00', active: 14 },
    { time: '10:00', active: 16 },
    { time: '11:00', active: 17 },
    { time: '12:00', active: 15 },
    { time: '13:00', active: 16 },
    { time: '14:00', active: 14 },
    { time: '15:00', active: 12 },
    { time: '16:00', active: 10 },
    { time: '17:00', active: 6 },
  ]

  useEffect(() => {
    let frame
    let start = null
    const duration = 1200
    const animate = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setAnimProgress(p)
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [chartData])

  const W = 520, H = 180, padL = 40, padR = 16, padT = 16, padB = 36
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const maxVal = Math.max(...fleetHourlyData.map(d => d.active), 22)
  const pts = fleetHourlyData.map((d, i) => ({
    x: padL + (i / (fleetHourlyData.length - 1 || 1)) * chartW,
    y: padT + chartH - (d.active / maxVal) * chartH,
    ...d,
  }))

  const buildPath = (progress) => {
    const cutIdx = Math.floor(progress * (pts.length - 1))
    const frac = progress * (pts.length - 1) - cutIdx
    const visible = pts.slice(0, cutIdx + 1)
    if (visible.length < 2) return ''
    if (cutIdx < pts.length - 1) {
      const next = pts[cutIdx + 1]
      const curr = pts[cutIdx]
      visible.push({ x: curr.x + (next.x - curr.x) * frac, y: curr.y + (next.y - curr.y) * frac })
    }
    let d = `M ${visible[0].x} ${visible[0].y}`
    for (let i = 1; i < visible.length; i++) {
      const prev = visible[i - 1]
      const cp1x = prev.x + (visible[i].x - prev.x) * 0.4
      const cp2x = visible[i].x - (visible[i].x - prev.x) * 0.4
      d += ` C ${cp1x} ${prev.y} ${cp2x} ${visible[i].y} ${visible[i].x} ${visible[i].y}`
    }
    return d
  }

  const linePath = buildPath(animProgress)
  const lastPt = (() => {
    if (pts.length === 0) return { x: padL, y: padT + chartH }
    const cutIdx = Math.min(Math.floor(animProgress * (pts.length - 1)), pts.length - 2)
    const frac = animProgress * (pts.length - 1) - cutIdx
    const curr = pts[cutIdx], next = pts[Math.min(cutIdx + 1, pts.length - 1)]
    return { x: curr.x + (next.x - curr.x) * frac, y: curr.y + (next.y - curr.y) * frac }
  })()

  const areaPath = linePath ? linePath + ` L ${lastPt.x} ${padT + chartH} L ${padL} ${padT + chartH} Z` : ''
  const gridLines = [0, 5, 10, 15, 20].map(v => ({ y: padT + chartH - (v / maxVal) * chartH, label: v }))

  const handleMouseMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    let closest = null, minDist = 30
    pts.forEach(p => { const dist = Math.abs(p.x - mx); if (dist < minDist) { minDist = dist; closest = p } })
    setTooltip(closest)
  }, [pts])

  const step = pts.length > 15 ? 4 : (pts.length > 8 ? 2 : 1)
  const visibleTicks = pts.filter((_, i) => {
    if (i === 0 || i === pts.length - 1) return true
    return i % step === 0 && (pts.length - 1 - i) >= step * 0.7
  })

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 24,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35), 0 0 20px rgba(99, 102, 241, 0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--surface-border)'
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Live Fleet Utilization</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Active vehicles across the day</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="live-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Tracking</span>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Faint Vertical Grid Lines */}
        {visibleTicks.map(p => (
          <line key={p.time} x1={p.x} x2={p.x} y1={padT} y2={padT + chartH} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.15" />
        ))}

        {/* Horizontal Grid Lines */}
        {gridLines.map(gl => (
          <g key={gl.label}>
            <line x1={padL} x2={W - padR} y1={gl.y} y2={gl.y} stroke="var(--border)" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.25" />
            <text x={padL - 8} y={gl.y + 4} fontSize="9" fill="var(--text-muted)" textAnchor="end" fontFamily="inherit">{gl.label}</text>
          </g>
        ))}

        {/* X Axis Labels */}
        {visibleTicks.map((p, i) => (
          <text key={i} x={p.x} y={H - 4} fontSize="9" fill="var(--text-muted)" textAnchor="middle" fontFamily="inherit" fontWeight="600">{p.time}</text>
        ))}

        {/* Area fill path */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

        {/* Neon Glow stroke paths */}
        {linePath && <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="5" opacity="0.18" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" />}
        {linePath && <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Animating pulsing end dot */}
        {animProgress > 0 && (
          <>
            <circle cx={lastPt.x} cy={lastPt.y} r="7" fill="#06b6d4" opacity="0.3">
              <animate attributeName="r" values="5;11;5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={lastPt.x} cy={lastPt.y} r="4" fill="#06b6d4" stroke="#fff" strokeWidth="2" />
          </>
        )}

        {/* Interactive Hover Tooltip */}
        {tooltip && (
          <g>
            <line x1={tooltip.x} x2={tooltip.x} y1={padT} y2={padT + chartH} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <rect x={tooltip.x - 58} y={tooltip.y - 34} width={116} height={28} rx={6} fill="rgba(10,15,30,0.85)" stroke="url(#lineGrad)" strokeWidth="1.5" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
            <text x={tooltip.x} y={tooltip.y - 22} fontSize="8" fill="#94a3b8" textAnchor="middle" fontFamily="inherit" fontWeight="600">{tooltip.time}</text>
            <text x={tooltip.x} y={tooltip.y - 10} fontSize="8.5" fill="#fff" textAnchor="middle" fontWeight="800" fontFamily="inherit">Active : {tooltip.active} vehicles</text>
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#06b6d4" stroke="#fff" strokeWidth="1.5" />
          </g>
        )}
      </svg>
      <style>{`
        @keyframes pulse-live {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        .live-pulse-dot {
          animation: pulse-live 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}

const StatusBreakdown = ({ isDark, statusData, stats }) => {
  const [animProgress, setAnimProgress] = useState(0)

  useEffect(() => {
    let frame
    let start = null
    const duration = 1200
    const animate = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setAnimProgress(p)
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [statusData])

  const donutData = [
    { label: 'Active',      value: stats.active || 0, color: '#34d399' },
    { label: 'Maintenance', value: stats.maintenance || 0,  color: '#fbbf24' },
    { label: 'Available',   value: stats.available || 0,  color: '#3b82f6' },
  ]
  const total = donutData.reduce((s, d) => s + d.value, 0)
  
  const cx = 110, cy = 110, R = 86, r = 56
  let angle = -Math.PI / 2
  const slices = donutData.map(d => {
    const sweep = (d.value / (total || 1)) * 2 * Math.PI * animProgress
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(angle + sweep), y2 = cy + R * Math.sin(angle + sweep)
    const ix1 = cx + r * Math.cos(angle), iy1 = cy + r * Math.sin(angle)
    const ix2 = cx + r * Math.cos(angle + sweep), iy2 = cy + r * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`
    angle += sweep
    return { ...d, path, sweep }
  })

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 24,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Status Breakdown</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Current fleet split</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, flex: 1 }}>
        <svg viewBox="0 0 220 220" style={{ width: 140, height: 140, flexShrink: 0 }}>
          {slices.map((s, i) => (
            s.sweep > 0 && (
              <path key={i} d={s.path} fill={s.color}
                style={{ transition: 'opacity 0.2s', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              />
            )
          ))}
          <text x={cx} y={cy - 6} fontSize="28" fontWeight="900" fill="var(--text-primary)" textAnchor="middle" fontFamily="'Plus Jakarta Sans',sans-serif">{total}</text>
          <text x={cx} y={cy + 14} fontSize="11" fill="var(--text-muted)" textAnchor="middle" fontWeight="700" fontFamily="inherit" style={{ textTransform: 'uppercase' }} letterSpacing="0.05em">Total</text>
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', width: '100%', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          {donutData.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0, boxShadow: `0 0 8px ${d.color}70` }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>{d.label}</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const QuickActionsPanel = ({ navigate }) => {
  const quickActions = [
    { icon: <Wrench size={18} color="#fbbf24" />, bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', label: 'Add Service Record', onClick: () => navigate('/service', { state: { openAddServiceModal: true, fromOneClick: true } }) },
    { icon: <Gauge size={18} color="#a855f7" />, bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', label: 'Daily Mileage Update', onClick: () => navigate('/service', { state: { activeTab: 'update' } }) },
    { icon: <UserCog size={18} color="#34d399" />, bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', label: 'Driver Check-in', onClick: () => navigate('/users', { state: { roleFilter: 'DRIVER' } }) },
    { icon: <Car size={18} color="#3b82f6" />, bg: 'rgba(59, 130, 246,0.12)', border: 'rgba(59, 130, 246,0.25)', label: 'Register Vehicle', onClick: () => navigate('/vehicles', { state: { openAddVehicle: true, fromOneClick: true } }) },
    { icon: <Fuel size={18} color="#38bdf8" />, bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)', label: 'Record Fuel Fill-up', onClick: () => navigate('/fuel-management', { state: { openAddFuelLog: true, fromOneClick: true } }) },
  ]

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 24,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Quick Commands</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>One-click fleet entries</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {quickActions.map((qa, i) => (
          <button key={i} onClick={qa.onClick} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14,
            background: qa.bg, border: `1px solid ${qa.border}`,
            cursor: 'pointer', transition: 'all 0.2s',
            textAlign: 'left',
            outline: 'none',
            fontFamily: 'inherit',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${qa.border}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{qa.icon}</div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{qa.label}</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 300 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Recent Activity ─────────────────────────────────────────── */
const formatTimeAgo = (date) => {
  if (!date || isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const RecentActivitySection = ({ activities = [], navigate }) => (
  <div style={{ marginTop: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>Recent Fleet Activity</h2>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
    <div style={{
      background: 'var(--surface)', borderRadius: 24,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}>
      {activities.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          No recent activity found.
        </div>
      ) : (
        activities.map((a, i) => (
          <div key={a.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 18,
            padding: '16px 28px',
            borderBottom: i < activities.length - 1 ? '1px solid var(--border)' : 'none',
            transition: 'background 0.18s',
            cursor: 'default',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hi)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: `${a.color}15`, border: `1px solid ${a.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{a.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.87rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{a.action}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.detail}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <Clock size={12} color="var(--text-muted)" />
              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600 }}>{formatTimeAgo(a.timestamp)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)

/* ── Daily Mileage Update Modal ──────────────────────────────── */
const DailyMileageModal = ({ open, onClose }) => {
  const D = useD()
  const [vehicles, setVehicles] = useState([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [newMileage, setNewMileage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Load vehicles when opened; reset everything when closed
  useEffect(() => {
    if (!open) {
      setSelectedId(''); setNewMileage(''); setError(''); setSuccess(''); setSaving(false)
      return
    }
    setLoadingVehicles(true)
    vehicleAPI.getAllVehicles()
      .then(res => setVehicles((res.data.data || []).filter(v => !v.isDeleted)))
      .catch(() => setError('Failed to load vehicles.'))
      .finally(() => setLoadingVehicles(false))
  }, [open])

  // Lock background scroll while the modal is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const selected = vehicles.find(v => String(v.id) === String(selectedId))
  const currentVal = selected ? (selected.currentMileageKm || 0) : 0
  // Lower limit mirrors the bulk Daily Mileage Update guardrail: not below the vehicle's initial reading.
  const lowerLimit = selected && selected.initialMileageKm != null ? Number(selected.initialMileageKm) : 0

  const labelStyle = { display: 'block', fontSize: '0.74rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 6 }
  const inputStyle = { width: '100%', padding: '10px 14px', background: D.inputBg, border: `1px solid ${D.inputBorder}`, borderRadius: 8, color: D.text, fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  const handleSave = async () => {
    setError(''); setSuccess('')
    if (!selected) { setError('Please select a vehicle.'); return }
    if (newMileage === '' || isNaN(Number(newMileage))) { setError('Enter a valid mileage reading.'); return }
    const val = Number(newMileage)
    if (val < lowerLimit) { setError(`Reading cannot be less than ${lowerLimit.toLocaleString()} km.`); return }
    if (val === currentVal) { setError('New reading matches the current mileage.'); return }
    if (val < currentVal) {
      const ok = window.confirm(`You are decreasing the mileage for ${selected.registrationNo}: ${currentVal.toLocaleString()} km → ${val.toLocaleString()} km.\n\nProceed with this correction?`)
      if (!ok) return
    }
    setSaving(true)
    try {
      await vehicleAPI.updateBulkMileage([{ id: selected.id, currentMileageKm: val }])
      setVehicles(prev => prev.map(v => v.id === selected.id ? { ...v, currentMileageKm: val } : v))
      setSuccess(`${selected.registrationNo} updated to ${val.toLocaleString()} km.`)
      setNewMileage('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update mileage.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.45)', overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(168,85,247,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', flexShrink: 0 }}>
            <Gauge size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Daily Mileage Update</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: D.textSub }}>Record today's odometer reading</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: D.textSub, cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px' }}>
          {error && (
            <div style={{ background: D.redDim, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '9px 14px', marginBottom: 16, color: D.red, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '9px 14px', marginBottom: 16, color: '#22c55e', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} /> {success}
            </div>
          )}

          <label style={labelStyle}>Vehicle *</label>
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setNewMileage(''); setError(''); setSuccess('') }}
            disabled={loadingVehicles}
            style={{ ...inputStyle, cursor: 'pointer', marginBottom: 18 }}
          >
            <option value="">{loadingVehicles ? 'Loading vehicles...' : 'Select a vehicle'}</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registrationNo} — {v.manufacturer} {v.model}</option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Current Mileage</label>
              <div style={{ ...inputStyle, background: D.surfaceHi, color: D.textSub, display: 'flex', alignItems: 'center' }}>
                {selected ? `${currentVal.toLocaleString()} km` : '—'}
              </div>
            </div>
            <div>
              <label style={labelStyle}>New Reading (km) *</label>
              <input
                type="number"
                value={newMileage}
                onChange={e => { setNewMileage(e.target.value); setError('') }}
                placeholder={selected ? currentVal.toString() : 'e.g. 45200'}
                disabled={!selected}
                style={{ ...inputStyle, opacity: selected ? 1 : 0.6 }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${D.border}`, background: D.surfaceHi }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 22px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(168,85,247,0.35)', opacity: (saving || !selected) ? 0.6 : 1, cursor: (saving || !selected) ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : <><CheckCircle size={15} /> Update Mileage</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const ControllerDashboard = ({ navigate, isDark, chartData, statusData, stats, activities }) => {
  const [mileageOpen, setMileageOpen] = useState(false)
  return (
    <>
      <SectionHeader title="Fleet Overview" />
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={<Car size={20} color="var(--primary)"/>} label="Total Vehicles" value={stats.total} colorDim="var(--primary-muted)" colorHex="var(--primary)" change="Under fleet management" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<CheckCircle size={20} color="var(--success)"/>} label="Active" value={stats.active} colorDim="var(--success-bg)" colorHex="var(--success)" change="Currently active" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<Wrench size={20} color="var(--warning)"/>} label="In Service" value={stats.maintenance} colorDim="var(--warning-bg)" colorHex="var(--warning)" change="Under maintenance" onClick={() => navigate('/service')} />
        <StatCard icon={<Activity size={20} color="var(--info)"/>} label="Available" value={stats.available} colorDim="var(--info-bg)" colorHex="var(--info)" change="Ready to assign" onClick={() => navigate('/vehicles')} />
      </div>

      <div className="dashboard-columns-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start', marginBottom: 36 }}>
        {/* Left Column: Utilization & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <FleetUtilizationChart isDark={isDark} chartData={chartData} />
          <RecentActivitySection activities={activities} navigate={navigate} />
        </div>

        {/* Right Column: Breakdown & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <StatusBreakdown isDark={isDark} statusData={statusData} stats={stats} />
          <QuickActionsPanel navigate={navigate} />
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .dashboard-columns-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
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

const DriverDashboard = ({ navigate, isDark, vehicleCount }) => {
  const A = useAccents(isDark)
  return (
    <>
      <SectionHeader title="My Overview" />
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Car size={20} color={A.purple}/>} label="Fleet Vehicles" value={vehicleCount} colorDim={A.purpleDim} colorHex={A.purple} change="Total vehicles in fleet" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<ClipboardList size={20} color={A.blue}/>} label="Today's Tasks" value="3" colorDim={A.blueDim} colorHex={A.blue} change="Pending deliveries" />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Completed" value="12" colorDim={A.greenDim} colorHex={A.green} change="This week" />
        <StatCard icon={<Activity size={20} color={A.green}/>} label="Status" value="Active" colorDim={A.greenDim} colorHex={A.green} change="Ready to drive" />
      </div>
      <SectionHeader title="Driver Tools" />
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <FeatureCard icon={<Car size={24}/>} title="Vehicles" desc="View status and information about all fleet vehicles." onClick={() => navigate('/vehicles')} />
        <FeatureCard icon={<Fuel size={24}/>} title="Fuel Log" desc="Record fuel consumption and view usage history." onClick={() => navigate('/fuel-log')} />
        <FeatureCard icon={<Wrench size={24}/>} title="Service History" desc="View maintenance history and service records for all vehicles." onClick={() => navigate('/service')} />
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
  const [controllerStats, setControllerStats] = useState({ total: 0, active: 0, maintenance: 0, available: 0 })
  const [driverVehicleCount, setDriverVehicleCount] = useState(0)
  const [fleetChartData, setFleetChartData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [alerts, setAlerts] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (isAdmin || user?.role === 'CONTROLLER') {
          // Fetch alerts for Admin and Controller
          try {
            const alertRes = await alertAPI.getDashboardAlerts()
            const alertList = alertRes.data.data?.alerts || (Array.isArray(alertRes.data.data) ? alertRes.data.data : [])
            setAlerts(alertList)
          } catch (err) {
            console.error('Error loading dashboard alerts:', err)
          }

          // Fetch stats for Admin
          if (isAdmin) {
            try {
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
            } catch (err) {
              console.error('Error loading admin user stats:', err)
            }
          }

          // Fetch data for Controller
          if (user?.role === 'CONTROLLER') {
            try {
              // 1. Fetch vehicles for stats calculation
              const response = await vehicleAPI.getAllVehicles()
              const vehicles = response.data.data || []
              setControllerStats({
                total: vehicles.length,
                active: vehicles.filter(v => v.status === 'ACTIVE').length,
                maintenance: vehicles.filter(v => v.status === 'SERVICE').length,
                available: vehicles.filter(v => v.status === 'AVAILABLE').length,
              })

              // 2. Fetch notifications & merge with local notifications for activities
              const notifsRes = await notificationAPI.getAll()
              const backendNotifs = notifsRes.data.data || []
              const localNotifs = notifService.getControllerNotifications() || []
              
              const merged = [...backendNotifs, ...localNotifs]
              merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              
              const top10 = merged.slice(0, 10)
              const mappedActivities = top10.map(mapNotificationToActivity)
              setActivities(mappedActivities)
            } catch (err) {
              console.error('Error fetching controller dashboard data:', err)
            }
          }

          // Fetch real-time chart data for live fleet utilization
          try {
            const chartRes = await fuelAPI.getChartData()
            setFleetChartData(chartRes.data.data || [])
          } catch (err) {
            console.error('Error loading chart data:', err)
          }

          // Fetch real-time vehicle status breakdown data
          try {
            const statusRes = await fuelAPI.getVehicleStats()
            setStatusData(statusRes.data.data || [])
          } catch (err) {
            console.error('Error loading status data:', err)
          }
        } else if (user?.role === 'DRIVER') {
          // Fetch total fleet vehicle count for driver dashboard
          try {
            const vehicleRes = await vehicleAPI.getAllVehicles()
            const vehicles = vehicleRes.data.data || []
            setDriverVehicleCount(vehicles.filter(v => !v.isDeleted).length)
          } catch (err) {
            console.error('Error loading fleet vehicle count for driver:', err)
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

          {/* Hero Banner — Dynamic glassmorphic design */}
          <div style={{
            background: isDark
              ? 'linear-gradient(135deg, #030712 0%, #0a1628 30%, #0f2345 60%, #1a3a7a 85%, #1e40af 100%)'
              : 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
            borderRadius: 28, padding: '40px', marginBottom: 32,
            position: 'relative', overflow: 'hidden',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 16px 48px rgba(0,0,0,0.4)',
            border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(37, 99, 235, 0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          }}>
            {/* Decorative circles */}
            {[['80%', '-20px', '220px', 'rgba(59,130,246,0.04)'], ['20%', '60%', '150px', 'rgba(99,102,241,0.04)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            {/* Neon glow accent for dark mode */}
            {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.1)',
                borderRadius: 16, width: 64, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', backdropFilter: 'blur(8px)',
                border: isDark ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: isDark ? '0 0 20px rgba(59,130,246,0.3), 0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)',
              }}>
                {roleEmoji[user?.role] || <Car size={32} color="#fff" />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Good day, {user?.userName}!
                  </h1>
                  <span style={{ background: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.15)', color: '#dbeafe', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)', border: isDark ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.2)' }}>
                    {roleLabel[user?.role] || user?.role}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', color: isDark ? '#93c5fd' : '#60a5fa', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
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
          {user?.role === 'CONTROLLER' && <ControllerDashboard navigate={navigate} isDark={isDark} chartData={fleetChartData} statusData={statusData} stats={controllerStats} activities={activities} />}
          {user?.role === 'DRIVER' && <DriverDashboard navigate={navigate} isDark={isDark} vehicleCount={driverVehicleCount} />}
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default DashboardPage
