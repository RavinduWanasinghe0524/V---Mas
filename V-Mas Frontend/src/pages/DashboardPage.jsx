import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { userAPI, fuelAPI, serviceAPI } from '../services/api'
import { Users, Shield, Gamepad2, Car, CheckCircle, Ban, Wrench, Fuel, MapPin, BarChart3, UserCog, ClipboardList, Activity, AlertTriangle, FileText, ShieldAlert, Clock, TrendingUp, Settings2 } from 'lucide-react'

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
        <StatCard icon={<Shield size={20} color={A.indigo}/>} label="Admins" value={stats.admins} colorDim={A.indigoDim} colorHex={A.indigo} change="System administrators" onClick={() => navigate('/users')} />
        <StatCard icon={<Gamepad2 size={20} color={A.blue}/>} label="Controllers" value={stats.controllers} colorDim={A.blueDim} colorHex={A.blue} change="Fleet controllers" onClick={() => navigate('/users')} />
        <StatCard icon={<Car size={20} color={A.green}/>} label="Drivers" value={stats.drivers} colorDim={A.greenDim} colorHex={A.green} change="Vehicle operators" onClick={() => navigate('/users')} />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Active" value={stats.activeUsers} colorDim={A.greenDim} colorHex={A.green} change="Currently active accounts" onClick={() => navigate('/users')} />
        <StatCard icon={<Ban size={20} color={A.red}/>} label="Inactive" value={stats.inactiveUsers} colorDim={A.redDim} colorHex={A.red} change="Disabled accounts" onClick={() => navigate('/users')} />
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

const LiveChartsSection = ({ isDark, navigate, chartData, statusData }) => {
  const A = useAccents(isDark)
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
  }, [])

  // Chart dimensions
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

  // Donut — 🟢 Green=Active  🟡 Yellow=Maintenance  🔵 Blue=Available
  const donutData = (statusData && statusData.length > 0) ? statusData : [
    { label: 'Active',      value: 18, color: '#22c55e' },
    { label: 'Maintenance', value: 4,  color: '#eab308' },
    { label: 'Available',   value: 2,  color: '#3b82f6' },
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
    return { ...d, path }
  })

  const handleMouseMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    let closest = null, minDist = 30
    pts.forEach(p => { const dist = Math.abs(p.x - mx); if (dist < minDist) { minDist = dist; closest = p } })
    setTooltip(closest)
  }, [pts])

  const quickActions = [
    { icon: <ClipboardList size={20} color="#fbbf24" />, bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', label: 'Add Service Record',    onClick: () => navigate('/service/add', { state: { fromOneClick: true } }) },
    { icon: <UserCog size={20} color="#34d399" />,       bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.3)',  label: 'Driver Check-in',       onClick: () => navigate('/users') },
    { icon: <Car size={20} color="#3b82f6" />,           bg: 'rgba(59, 130, 246,0.15)', border: 'rgba(59, 130, 246,0.3)', label: 'Update Vehicle',       onClick: () => navigate('/vehicles', { state: { openAddVehicle: true, fromOneClick: true } }) },
    { icon: <Fuel size={20} color="#38bdf8" />,          bg: 'rgba(56,189,248,0.15)',  border: 'rgba(56,189,248,0.3)',  label: 'Mileage Update',        onClick: () => navigate('/fuel-management', { state: { openAddFuelLog: true, fromOneClick: true } }) },
  ]

  return (
    <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gridTemplateRows: 'auto auto', gap: 20, marginBottom: 36 }}>

      {/* ── Top-Left: Live Fleet Utilization ── */}
      <div style={{
        background: 'var(--surface)', borderRadius: 24,
        border: '1px solid var(--surface-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px',
        position: 'relative', overflow: 'hidden',
        gridColumn: '1 / -1',
      }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Live Fleet Utilization</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Active vehicles across the day</div>
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {gridLines.map(gl => (
            <g key={gl.label}>
              <line x1={padL} x2={W - padR} y1={gl.y} y2={gl.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={padL - 6} y={gl.y + 4} fontSize="10" fill="var(--text-muted)" textAnchor="end" fontFamily="inherit">{gl.label}</text>
            </g>
          ))}
          {pts.filter((_, i) => i % 2 === 0).map((p, i) => (
            <text key={i} x={p.x} y={H - 4} fontSize="10" fill="var(--text-muted)" textAnchor="middle" fontFamily="inherit">{p.time}</text>
          ))}
          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
          {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {animProgress > 0 && (
            <>
              <circle cx={lastPt.x} cy={lastPt.y} r="6" fill="#2563eb" opacity="0.25">
                <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={lastPt.x} cy={lastPt.y} r="4" fill="#2563eb" stroke="#fff" strokeWidth="2" />
            </>
          )}
          {tooltip && (
            <g>
              <line x1={tooltip.x} x2={tooltip.x} y1={padT} y2={padT + chartH} stroke="#2563eb" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
              <rect x={tooltip.x - 58} y={tooltip.y - 32} width={116} height={28} rx={6} fill="rgba(15,20,40,0.92)" stroke="rgba(37, 99, 235,0.4)" strokeWidth="1" />
              <text x={tooltip.x} y={tooltip.y - 19} fontSize="8" fill="#94a3b8" textAnchor="middle" fontFamily="inherit">{tooltip.time}</text>
              <text x={tooltip.x} y={tooltip.y - 8} fontSize="8.5" fill="#fff" textAnchor="middle" fontWeight="700" fontFamily="inherit">Active vehicles : {tooltip.active}</text>
              <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      {/* ── Bottom-Left: One-click data entry ── */}
      <div style={{
        background: 'var(--surface)', borderRadius: 24,
        border: '1px solid var(--surface-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>One-click data entry</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Quick actions</div>
        </div>
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
          {quickActions.map((qa, i) => (
            <button key={i} onClick={qa.onClick} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 14,
              background: qa.bg, border: `1px solid ${qa.border}`,
              cursor: 'pointer', transition: 'all 0.2s',
              textAlign: 'left',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${qa.border}` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{qa.icon}</div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{qa.label}</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 300 }}>+</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom-Right: Status Breakdown ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flex: 1 }}>
          <svg viewBox="0 0 220 220" style={{ width: 150, height: 150, flexShrink: 0 }}>
            {slices.map((s, i) => (
              <path key={i} d={s.path} fill={s.color}
                style={{ transition: 'opacity 0.2s', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              />
            ))}
            <text x={cx} y={cy - 8} fontSize="28" fontWeight="900" fill="var(--text-primary)" textAnchor="middle" fontFamily="'Plus Jakarta Sans',sans-serif">{total}</text>
            <text x={cx} y={cy + 14} fontSize="12" fill="var(--text-muted)" textAnchor="middle" fontFamily="inherit">Total</text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: d.color, flexShrink: 0, boxShadow: `0 0 8px ${d.color}70` }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d.label}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{d.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Controller System Alerts ────────────────────────────────── */
const controllerAlerts = [
  { type: 'service', severity: 'UPCOMING', title: 'Service Due Soon',    vehicle: 'SG-ABC-2122', msg: 'Service due in 6 days on 2026-06-12',         color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.35)', icon: <Wrench size={18} color="#fbbf24" /> },
  { type: 'license', severity: 'URGENT',   title: 'License Expiring',    vehicle: 'WP-CAB-8841', msg: 'Driver license expires in 9 days',              color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.35)', icon: <FileText size={18} color="#f87171" /> },
  { type: 'insure',  severity: 'URGENT',   title: 'Insurance Expiring',  vehicle: 'CP-DEF-3390', msg: 'Insurance lapses in 4 days',                    color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.35)', icon: <ShieldAlert size={18} color="#f87171" /> },
  { type: 'service', severity: 'URGENT',   title: 'Service Overdue Risk',vehicle: 'WP-PQR-9034', msg: 'Only 60 km remaining to next service',           color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.35)', icon: <Wrench size={18} color="#f87171" /> },
  { type: 'license', severity: 'UPCOMING', title: 'License Renewal',     vehicle: 'NW-LMN-5521', msg: 'Renewal recommended within 24 days',            color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.35)', icon: <FileText size={18} color="#fbbf24" /> },
]

const ControllerSystemAlertsSection = ({ navigate }) => (
  <div style={{ marginBottom: 36 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, marginTop: 10 }}>
      <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>System Alerts</h2>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Urgent and upcoming</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{
        background: 'rgba(248,113,113,0.15)', color: '#f87171',
        padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
        border: '1px solid rgba(248,113,113,0.3)',
      }}>{controllerAlerts.filter(a => a.severity === 'URGENT').length} Urgent</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {controllerAlerts.map((alert, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 18,
          padding: '16px 28px',
          borderRadius: 14,
          background: alert.bg,
          border: `1px solid ${alert.border}`,
          borderLeft: `3px solid ${alert.color}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${alert.color}20` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)' }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${alert.color}18`, border: `1px solid ${alert.color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{alert.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</span>
              <span style={{
                fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                background: alert.severity === 'URGENT' ? 'rgba(248,113,113,0.22)' : 'rgba(251,191,36,0.22)',
                color: alert.color, border: `1px solid ${alert.color}40`,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{alert.severity}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              <span style={{ color: alert.color, fontWeight: 700 }}>{alert.vehicle}</span>
              {' · '}{alert.msg}
            </div>
          </div>
          <button
            onClick={() => alert.type === 'service' ? navigate('/service') : navigate('/vehicles')}
            style={{
              padding: '7px 20px', borderRadius: 9,
              border: `1px solid ${alert.color}40`, background: `${alert.color}14`,
              color: alert.color, fontSize: '0.78rem', fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${alert.color}28` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${alert.color}14` }}
          >View</button>
        </div>
      ))}
    </div>
  </div>
)

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
  <div style={{ marginTop: 36 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>Recent Activity</h2>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <button
        onClick={() => navigate('/reports')}
        style={{
          padding: '6px 14px', borderRadius: 8, border: '1px solid var(--surface-border)',
          background: 'var(--surface)', color: 'var(--text-muted)',
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
        }}
      >View all →</button>
    </div>
    <div style={{
      background: 'var(--surface)', borderRadius: 20,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      overflow: 'hidden',
    }}>
      {activities.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          No recent activity found.
        </div>
      ) : (
        activities.map((a, i) => (
          <div key={a.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 18,
            padding: '16px 32px',
            borderBottom: i < activities.length - 1 ? '1px solid var(--surface-border)' : 'none',
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
              <div style={{ fontSize: '0.87rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{a.action}</div>
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

const ControllerDashboard = ({ navigate, isDark, chartData, statusData }) => {
  const A = useAccents(isDark)
  return (
    <>
      <SectionHeader title="Fleet Overview" />
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Car size={20} color={A.purple}/>} label="Total Vehicles" value="24" colorDim={A.purpleDim} colorHex={A.purple} change="Under your management" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Active" value="18" colorDim={A.greenDim} colorHex={A.green} change="Currently in use" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<Wrench size={20} color={A.gold}/>} label="Maintenance" value="4" colorDim={A.goldDim} colorHex={A.gold} change="Being serviced" onClick={() => navigate('/service')} />
        <StatCard icon={<Activity size={20} color={A.blue}/>} label="Available" value="2" colorDim={A.blueDim} colorHex={A.blue} change="Ready to assign" onClick={() => navigate('/vehicles')} />
      </div>

      <LiveChartsSection isDark={isDark} navigate={navigate} chartData={chartData} statusData={statusData} />

      <SectionHeader title="One-click data entry" />
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <FeatureCard icon={<Car size={24}/>} title="Vehicle Management" desc="Monitor, track, and manage all fleet vehicles." onClick={() => navigate('/vehicles')} />
        <FeatureCard icon={<UserCog size={24}/>} title="Driver Assignment" desc="Assign and manage drivers to vehicles and routes." onClick={() => navigate('/users')} />
        <FeatureCard icon={<Wrench size={24}/>} title="Maintenance Schedule" desc="Schedule and track vehicle service appointments." onClick={() => navigate('/service')} />
        <FeatureCard icon={<Fuel size={24}/>} title="Fuel Management" desc="Record and track fuel consumption and costs." onClick={() => navigate('/fuel-management')} />
        
      </div>

      <RecentActivitySection navigate={navigate} />
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
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon={<Car size={20} color={A.purple}/>} label="Assigned Vehicle" value="1" colorDim={A.purpleDim} colorHex={A.purple} change="VH-2024-087" onClick={() => navigate('/vehicles')} />
        <StatCard icon={<ClipboardList size={20} color={A.blue}/>} label="Today's Tasks" value="3" colorDim={A.blueDim} colorHex={A.blue} change="Pending deliveries" />
        <StatCard icon={<CheckCircle size={20} color={A.green}/>} label="Completed" value="12" colorDim={A.greenDim} colorHex={A.green} change="This week" />
        <StatCard icon={<Activity size={20} color={A.green}/>} label="Status" value="Active" colorDim={A.greenDim} colorHex={A.green} change="Ready to drive" />
      </div>
      <SectionHeader title="Driver Tools" />
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
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
  const [fleetChartData, setFleetChartData] = useState([]);
  const [statusData, setStatusData] = useState([]);
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

          // Fetch real-time chart data for live fleet utilization
          try {
            const chartRes = await fuelAPI.getChartData();
            setFleetChartData(chartRes.data.data || []);
          } catch (err) {
            console.error('Error loading chart data:', err);
          }

          // Fetch real-time vehicle status breakdown data
          try {
            const statusRes = await fuelAPI.getVehicleStats();
            setStatusData(statusRes.data.data || []);
          } catch (err) {
            console.error('Error loading status data:', err);
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
          {user?.role === 'CONTROLLER' && <ControllerDashboard navigate={navigate} isDark={isDark} chartData={fleetChartData} statusData={statusData} />}
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
