import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TripActionModal from '../components/TripActionModal'
import { useAuth } from '../context/AuthContext'
import { useTheme, useD } from '../context/ThemeContext'
import { userAPI, fuelAPI, serviceAPI, vehicleAPI, alertAPI, notificationAPI, tripAPI } from '../services/api'
import * as notifService from '../services/notificationService'
import { Users, Shield, Gamepad2, Car, CheckCircle, Ban, Wrench, Fuel, MapPin, BarChart3, UserCog, Activity, AlertTriangle, FileText, ShieldAlert, Clock, TrendingUp, Settings2, Info, Gauge, X, ClipboardList, Navigation, Play, Route } from 'lucide-react'

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
    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: '1px solid var(--border)', color: 'var(--primary)', flexShrink: 0, boxShadow: '0 4px 12px var(--primary-glow)' }}>
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
          background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
          color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px var(--primary-glow)',
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
  // Generic accents
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
  // ── Role colours ─────────────────────────────────────────────────
  // Admin  = Royal Violet
  adminColor:      isDark ? '#a78bfa' : '#6d28d9',
  adminDim:        isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.1)',
  adminBorder:     isDark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.25)',
  // Controller = Amber / Gold
  controllerColor: isDark ? '#fbbf24' : '#b45309',
  controllerDim:   isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
  controllerBorder:isDark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.25)',
  // Driver = Emerald
  driverColor:     isDark ? '#34d399' : '#047857',
  driverDim:       isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
  driverBorder:    isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.25)',
})

/* ── Monthly Cost Trend (Maintenance vs Fuel) — SVG line chart ── */
const MonthlyCostTrendChart = ({ data = [], isDark }) => {
  const [hover, setHover] = useState(null)
  const blue = '#3b82f6', green = '#34d399'
  const pts = (data && data.length) ? data : [{ label: '—', maintenance: 0, fuel: 0 }]
  const W = 580, H = 220, padL = 52, padR = 24, padT = 20, padB = 36
  const plotW = W - padL - padR, plotH = H - padT - padB
  const rawMax = Math.max(1, ...pts.flatMap(p => [Number(p.maintenance) || 0, Number(p.fuel) || 0]))
  const stepPow = Math.pow(10, Math.floor(Math.log10(rawMax)))
  const niceMax = Math.max(stepPow, Math.ceil(rawMax / stepPow) * stepPow)
  const X = i => padL + (pts.length === 1 ? plotW / 2 : (i / (pts.length - 1)) * plotW)
  const Y = v => padT + plotH - ((Number(v) || 0) / niceMax) * plotH
  const grid = 4
  const fmtK = v => `${Math.round((Number(v) || 0) / 1000)}k`
  const linePath = key => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${X(i)} ${Y(p[key])}`).join(' ')
  const axis = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
  const axisText = isDark ? '#64748b' : '#94a3b8'

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '20px 28px' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Monthly Cost Trend</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Maintenance vs fuel (LKR thousands)</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: '250px', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: grid + 1 }).map((_, i) => {
          const v = (niceMax / grid) * i, yy = Y(v)
          return (
            <g key={`g${i}`}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke={axis} strokeDasharray="4 4" />
              <text x={padL - 10} y={yy + 4} fontSize="11" fill={axisText} textAnchor="end" fontWeight="600">{fmtK(v)}</text>
            </g>
          )
        })}
        {pts.map((p, i) => (
          <g key={`x${i}`}>
            <text x={X(i)} y={H - padB + 22} fontSize="11" fill={axisText} textAnchor="middle" fontWeight="600">{p.label}</text>
            <rect x={X(i) - plotW / (pts.length * 2)} y={padT} width={plotW / Math.max(1, pts.length)} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        <path d={linePath('fuel')} fill="none" stroke={green} strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={linePath('maintenance')} fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={X(i)} cy={Y(p.fuel)} r={hover === i ? 5 : 3.5} fill="var(--surface)" stroke={green} strokeWidth="2.5" />
            <circle cx={X(i)} cy={Y(p.maintenance)} r={hover === i ? 5 : 3.5} fill="var(--surface)" stroke={blue} strokeWidth="2.5" />
          </g>
        ))}
        {hover !== null && (() => {
          const p = pts[hover], hx = X(hover), boxW = 152, boxH = 72
          let bx = hx + 12; if (bx + boxW > W) bx = hx - boxW - 12
          const by = padT + 6
          return (
            <g style={{ pointerEvents: 'none' }}>
              <line x1={hx} y1={padT} x2={hx} y2={padT + plotH} stroke={axisText} strokeDasharray="3 3" opacity="0.6" />
              <rect x={bx} y={by} width={boxW} height={boxH} rx="10" fill={isDark ? '#0e1529' : '#ffffff'} stroke="var(--surface-border)" style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.25))' }} />
              <text x={bx + 14} y={by + 22} fontSize="12" fontWeight="800" fill="var(--text-primary)">{p.label}</text>
              <text x={bx + 14} y={by + 43} fontSize="11.5" fill="var(--text-primary)">Maintenance: {fmtK(p.maintenance)}</text>
              <text x={bx + 14} y={by + 61} fontSize="11.5" fill={green} fontWeight="600">Fuel: {fmtK(p.fuel)}</text>
            </g>
          )
        })()}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <span style={{ width: 18, height: 3, borderRadius: 2, background: blue }} /> Maintenance (LKR k)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <span style={{ width: 18, borderTop: `3px dashed ${green}` }} /> Fuel (LKR k)
        </span>
      </div>
    </div>
  )
}

/* ── User Statistics donut with Role / Status toggle ── */
const UserStatsPieChart = ({ stats }) => {
  const [mode, setMode] = useState('role')
  const roleData = [
    { label: 'Admins', value: stats.admins || 0, color: '#7c3aed' },
    { label: 'Controllers', value: stats.controllers || 0, color: '#d97706' },
    { label: 'Drivers', value: stats.drivers || 0, color: '#10b981' },
  ]
  const statusData = [
    { label: 'Active', value: stats.activeUsers || 0, color: '#34d399' },
    { label: 'Inactive', value: stats.inactiveUsers || 0, color: '#f87171' },
    { label: 'Suspended', value: stats.suspendedUsers || 0, color: '#94a3b8' },
    { label: 'Pending', value: stats.pendingUsers || 0, color: '#fbbf24' },
  ]
  const data = mode === 'role' ? roleData : statusData
  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 110, cy = 110, R = 86, r = 56
  let angle = -Math.PI / 2
  const slices = data.map(d => {
    const sweep = (d.value / (total || 1)) * 2 * Math.PI
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(angle + sweep), y2 = cy + R * Math.sin(angle + sweep)
    const ix1 = cx + r * Math.cos(angle), iy1 = cy + r * Math.sin(angle)
    const ix2 = cx + r * Math.cos(angle + sweep), iy2 = cy + r * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`
    const mid = angle + sweep / 2, midR = (R + r) / 2
    const lx = cx + midR * Math.cos(mid), ly = cy + midR * Math.sin(mid)
    angle += sweep
    return { ...d, path, sweep, lx, ly }
  })
  const tabBtn = (active) => ({ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800, fontFamily: 'inherit', transition: 'all 0.15s', background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)' })

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>User Statistics</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{mode === 'role' ? 'Distribution by role' : 'Distribution by account status'}</div>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20 }}>
        <button style={tabBtn(mode === 'role')} onClick={() => setMode('role')}>Role based</button>
        <button style={tabBtn(mode === 'status')} onClick={() => setMode('status')}>Status based</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, flex: 1 }}>
        <svg viewBox="0 0 220 220" style={{ width: 150, height: 150, flexShrink: 0 }}>
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="var(--border)" strokeWidth={R - r} />
          ) : slices.map((s, i) => s.sweep > 0 && (
            <g key={i}>
              <path d={s.path} fill={s.color} style={{ transition: 'opacity 0.2s', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'} />
              <text x={s.lx} y={s.ly + 5} fontSize="15" fontWeight="900" fill="#fff" textAnchor="middle" style={{ pointerEvents: 'none' }}>{s.value}</text>
            </g>
          ))}
          <text x={cx} y={cy - 4} fontSize="26" fontWeight="900" fill="var(--text-primary)" textAnchor="middle" fontFamily="'Plus Jakarta Sans',sans-serif">{total}</text>
          <text x={cx} y={cy + 15} fontSize="11" fill="var(--text-muted)" textAnchor="middle" fontWeight="700" letterSpacing="0.05em">USERS</text>
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: mode === 'role' ? '1fr 1fr 1fr' : '1fr 1fr', width: '100%', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0, boxShadow: `0 0 8px ${d.color}70` }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const AdminDashboard = ({ stats, loading, navigate, isDark, monthlyCostData, activities, services }) => {
  const A = useAccents(isDark)
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${A.purpleDim}`, borderTopColor: A.purple, animation: 'spin 1s linear infinite', marginBottom: 16 }}></div>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading statistics...</span>
    </div>
  )
  return (
    <>

      <div className="dashboard-charts-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 24, alignItems: 'stretch', marginBottom: 36 }}>
        <MonthlyCostTrendChart data={monthlyCostData} isDark={isDark} />
        <MaintenanceCostDonutChart isDark={isDark} services={services} />
        <UserStatsPieChart stats={stats} />
      </div>

      <RecentActivitySection activities={activities || []} navigate={navigate} />

      <style>{`
        @media (max-width: 1200px) {
          .dashboard-charts-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
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
const FleetFuelChart = ({ isDark, logs }) => {
  const [hover, setHover] = useState(null) // { i, type: 'diesel' | 'superDiesel' | 'petrol' | 'superPetrol' | 'month' }
  const svgRef = useRef(null)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedWeek, setSelectedWeek] = useState(1)

  const numDays = useMemo(() => {
    if (selectedMonth === 'all') return 30
    return new Date(selectedYear, selectedMonth + 1, 0).getDate()
  }, [selectedYear, selectedMonth])

  // Extract unique years from logs, ensuring the current year is always an option
  const years = useMemo(() => {
    const yrs = new Set()
    yrs.add(currentYear)
    ;(logs || []).forEach(l => {
      if (l.date) {
        const y = new Date(l.date).getFullYear()
        if (y) yrs.add(y)
      }
    })
    return Array.from(yrs).sort((a, b) => b - a)
  }, [logs, currentYear])

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const toList = map => Object.entries(map).map(([reg, liters]) => ({ reg, liters })).sort((a, b) => b.liters - a.liters)

  const pts0 = []
  
  if (selectedMonth === 'all') {
    const isCurrentYear = selectedYear === currentYear
    const maxMonth = isCurrentYear ? currentMonth : 11

    const agg = Array.from({ length: 12 }, () => ({
      diesel: 0,
      superDiesel: 0,
      petrol: 0,
      superPetrol: 0,
      dieselMap: {},
      superDieselMap: {},
      petrolMap: {},
      superPetrolMap: {}
    }))

    ;(logs || []).forEach(l => {
      const d = new Date(l.date)
      if (d.getFullYear() !== selectedYear) return
      const m = d.getMonth()
      let ft = (l.fuelType || '').toLowerCase().replace('_', ' ')
      if (ft === 'petrol' || ft.includes('92')) ft = 'petrol';
      else if (ft === 'super petrol' || ft.includes('95')) ft = 'super petrol';
      else if (ft === 'diesel' || ft.includes('auto')) ft = 'diesel';
      else if (ft.includes('super diesel')) ft = 'super diesel';

      const liters = Number(l.liters) || 0
      const reg = l.vehicleRegNumber || 'Unknown'
      if (ft === 'diesel') { agg[m].diesel += liters; agg[m].dieselMap[reg] = (agg[m].dieselMap[reg] || 0) + liters }
      else if (ft === 'super diesel') { agg[m].superDiesel += liters; agg[m].superDieselMap[reg] = (agg[m].superDieselMap[reg] || 0) + liters }
      else if (ft === 'petrol') { agg[m].petrol += liters; agg[m].petrolMap[reg] = (agg[m].petrolMap[reg] || 0) + liters }
      else if (ft === 'super petrol') { agg[m].superPetrol += liters; agg[m].superPetrolMap[reg] = (agg[m].superPetrolMap[reg] || 0) + liters }
    })

    for (let m = 0; m <= maxMonth; m++) {
      pts0.push({
        label: monthNames[m],
        fullDateLabel: `${monthNames[m]} ${selectedYear}`,
        diesel: agg[m].diesel,
        superDiesel: agg[m].superDiesel,
        petrol: agg[m].petrol,
        superPetrol: agg[m].superPetrol,
        dieselVehicles: toList(agg[m].dieselMap),
        superDieselVehicles: toList(agg[m].superDieselMap),
        petrolVehicles: toList(agg[m].petrolMap),
        superPetrolVehicles: toList(agg[m].superPetrolMap)
      })
    }
  } else {
    // Specific month selected -> daily view
    const numDays = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const aggDays = Array.from({ length: numDays }, () => ({
      diesel: 0,
      superDiesel: 0,
      petrol: 0,
      superPetrol: 0,
      dieselMap: {},
      superDieselMap: {},
      petrolMap: {},
      superPetrolMap: {}
    }))

    ;(logs || []).forEach(l => {
      const d = new Date(l.date)
      if (d.getFullYear() !== selectedYear || d.getMonth() !== selectedMonth) return
      const dateNum = d.getDate()
      const idx = dateNum - 1
      if (idx < 0 || idx >= numDays) return

      let ft = (l.fuelType || '').toLowerCase().replace('_', ' ')
      if (ft === 'petrol' || ft.includes('92')) ft = 'petrol';
      else if (ft === 'super petrol' || ft.includes('95')) ft = 'super petrol';
      else if (ft === 'diesel' || ft.includes('auto')) ft = 'diesel';
      else if (ft.includes('super diesel')) ft = 'super diesel';

      const liters = Number(l.liters) || 0
      const reg = l.vehicleRegNumber || 'Unknown'
      if (ft === 'diesel') { aggDays[idx].diesel += liters; aggDays[idx].dieselMap[reg] = (aggDays[idx].dieselMap[reg] || 0) + liters }
      else if (ft === 'super diesel') { aggDays[idx].superDiesel += liters; aggDays[idx].superDieselMap[reg] = (aggDays[idx].superDieselMap[reg] || 0) + liters }
      else if (ft === 'petrol') { aggDays[idx].petrol += liters; aggDays[idx].petrolMap[reg] = (aggDays[idx].petrolMap[reg] || 0) + liters }
      else if (ft === 'super petrol') { aggDays[idx].superPetrol += liters; aggDays[idx].superPetrolMap[reg] = (aggDays[idx].superPetrolMap[reg] || 0) + liters }
    })

    for (let d = 0; d < numDays; d++) {
      const dayNum = d + 1
      if (selectedWeek !== 'all') {
        const startDay = (selectedWeek - 1) * 7 + 1
        const endDay = selectedWeek === 5 ? numDays : selectedWeek * 7
        if (dayNum < startDay || dayNum > endDay) continue
      }
      pts0.push({
        label: `${dayNum}`,
        fullDateLabel: `${monthNames[selectedMonth]} ${dayNum}, ${selectedYear}`,
        diesel: aggDays[d].diesel,
        superDiesel: aggDays[d].superDiesel,
        petrol: aggDays[d].petrol,
        superPetrol: aggDays[d].superPetrol,
        dieselVehicles: toList(aggDays[d].dieselMap),
        superDieselVehicles: toList(aggDays[d].superDieselMap),
        petrolVehicles: toList(aggDays[d].petrolMap),
        superPetrolVehicles: toList(aggDays[d].superPetrolMap)
      })
    }
  }

  const hasData = pts0.length > 0
  const dieselC = '#f59e0b', superDieselC = '#7c3aed', petrolC = '#3b82f6', superPetrolC = '#ea580c'
  const W = 720, H = 160, padL = 46, padR = 16, padT = 16, padB = 36
  const chartW = W - padL - padR, chartH = H - padT - padB
  const rawMax = Math.max(1, ...pts0.flatMap(p => [
    p.diesel || 0,
    p.superDiesel || 0,
    p.petrol || 0,
    p.superPetrol || 0
  ]))
  const stepPow = Math.pow(10, Math.floor(Math.log10(rawMax)))
  const maxVal = Math.max(stepPow, Math.ceil(rawMax / stepPow) * stepPow)
  const X = i => padL + (pts0.length <= 1 ? chartW / 2 : (i / (pts0.length - 1)) * chartW)
  const Y = v => padT + chartH - ((Number(v) || 0) / maxVal) * chartH
  const grid = 4
  const axis = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
  const axisText = isDark ? '#64748b' : '#94a3b8'
  const fmtL = v => { const n = Number(v) || 0; return n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}` }
  const smooth = (key, divisor = 1) => {
    if (!pts0.length) return ''
    let d = `M ${X(0)} ${Y(pts0[0][key] / divisor)}`
    for (let i = 1; i < pts0.length; i++) {
      const px = X(i - 1), py = Y(pts0[i - 1][key] / divisor), nx = X(i), ny = Y(pts0[i][key] / divisor)
      d += ` C ${px + (nx - px) * 0.4} ${py} ${nx - (nx - px) * 0.4} ${ny} ${nx} ${ny}`
    }
    return d
  }

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 24,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box'
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fleet Fuel Consumption</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
            {selectedMonth === 'all' ? 'Monthly' : 'Daily'} fuel volume by type (Auto Diesel / Super Diesel / Petrol 92 / Petrol 95) — hover for details
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Month Select */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value
                setSelectedMonth(val === 'all' ? 'all' : Number(val))
                setSelectedWeek(1)
              }}
              style={{
                padding: '6px 28px 6px 12px',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-hi)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='${encodeURIComponent(isDark ? '#94a3b8' : '#64748b')}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '12px',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
            >
              <option value="all">All Months</option>
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>

          {/* Week Select (only when specific month is selected) */}
          {selectedMonth !== 'all' && (
            <div style={{ position: 'relative' }}>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedWeek(val === 'all' ? 'all' : Number(val))
                }}
                style={{
                  padding: '6px 28px 6px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface-hi)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='${encodeURIComponent(isDark ? '#94a3b8' : '#64748b')}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '12px',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
              >
                <option value={1}>Week 1 (1 - 7)</option>
                <option value={2}>Week 2 (8 - 14)</option>
                <option value={3}>Week 3 (15 - 21)</option>
                <option value={4}>Week 4 (22 - 28)</option>
                {numDays > 28 && (
                  <option value={5}>Week 5 (29 - {numDays})</option>
                )}
                <option value="all">Full Month</option>
              </select>
            </div>
          )}

          {/* Year Select */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: '6px 28px 6px 12px',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-hi)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='${encodeURIComponent(isDark ? '#94a3b8' : '#64748b')}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '12px',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
            >
              {years.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {hasData ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', maxHeight: '160px', display: 'block' }}
            onMouseLeave={() => setHover(null)}>
          {Array.from({ length: grid + 1 }).map((_, i) => {
            const v = (maxVal / grid) * i, y = Y(v)
            return (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={axis} strokeDasharray="4 4" />
                <text x={padL - 8} y={y + 4} fontSize="9" fill={axisText} textAnchor="end">{fmtL(v)}</text>
              </g>
            )
          })}
          {pts0.map((p, i) => {
            const showLabel = pts0.length <= 12 || (i + 1) === 1 || (i + 1) % 5 === 0 || (i + 1) === pts0.length
            if (!showLabel) return null
            return (
              <text key={i} x={X(i)} y={H - 6} fontSize="9" fill={axisText} textAnchor="middle" fontWeight="600">
                {p.label}
              </text>
            )
          })}
          {pts0.map((p, i) => {
            const colW = pts0.length > 1 ? chartW / (pts0.length - 1) : chartW
            return <rect key={`mh${i}`} x={X(i) - colW / 2} y={padT + chartH} width={colW} height={padB} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'month' })} />
          })}
          <path d={smooth('diesel')} fill="none" stroke={dieselC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={smooth('superDiesel')} fill="none" stroke={superDieselC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={smooth('petrol')} fill="none" stroke={petrolC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={smooth('superPetrol')} fill="none" stroke={superPetrolC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts0.map((p, i) => (
            <g key={i}>
              <circle cx={X(i)} cy={Y(p.diesel)} r={hover && hover.i === i && hover.type === 'diesel' ? 5 : 3} fill="var(--surface)" stroke={dieselC} strokeWidth="2" />
              <circle cx={X(i)} cy={Y(p.diesel)} r="10" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'diesel' })} />
              
              <circle cx={X(i)} cy={Y(p.superDiesel)} r={hover && hover.i === i && hover.type === 'superDiesel' ? 5 : 3} fill="var(--surface)" stroke={superDieselC} strokeWidth="2" />
              <circle cx={X(i)} cy={Y(p.superDiesel)} r="10" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'superDiesel' })} />

              <circle cx={X(i)} cy={Y(p.petrol)} r={hover && hover.i === i && hover.type === 'petrol' ? 5 : 3} fill="var(--surface)" stroke={petrolC} strokeWidth="2" />
              <circle cx={X(i)} cy={Y(p.petrol)} r="10" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'petrol' })} />

              <circle cx={X(i)} cy={Y(p.superPetrol)} r={hover && hover.i === i && hover.type === 'superPetrol' ? 5 : 3} fill="var(--surface)" stroke={superPetrolC} strokeWidth="2" />
              <circle cx={X(i)} cy={Y(p.superPetrol)} r="10" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'superPetrol' })} />
            </g>
          ))}
          {hover && pts0[hover.i] && (() => {
            const p = pts0[hover.i], hx = X(hover.i)
            if (hover.type === 'month') {
              const bw = 150, bh = 98
              let bx = hx + 12; if (bx + bw > W) bx = hx - bw - 12; if (bx < 2) bx = 2
              const by = padT + 4
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <line x1={hx} y1={padT} x2={hx} y2={padT + chartH} stroke={axisText} strokeDasharray="3 3" opacity="0.5" />
                  <rect x={bx} y={by} width={bw} height={bh} rx="8" fill={isDark ? '#0e1529' : '#ffffff'} stroke="var(--surface-border)" style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.45))' }} />
                  <text x={bx + 12} y={by + 16} fontSize="10" fontWeight="800" fill="var(--text-primary)">{p.fullDateLabel || p.label}</text>
                  <text x={bx + 12} y={by + 32} fontSize="9" fill={dieselC} fontWeight="700">Auto Diesel: {Math.round(p.diesel).toLocaleString()} L</text>
                  <text x={bx + 12} y={by + 46} fontSize="9" fill={superDieselC} fontWeight="700">Super Diesel: {Math.round(p.superDiesel).toLocaleString()} L</text>
                  <text x={bx + 12} y={by + 60} fontSize="9" fill={petrolC} fontWeight="700">Petrol 92 Octane: {Math.round(p.petrol).toLocaleString()} L</text>
                  <text x={bx + 12} y={by + 74} fontSize="9" fill={superPetrolC} fontWeight="700">Petrol 95 Octane: {Math.round(p.superPetrol).toLocaleString()} L</text>
                </g>
              )
            }
            const list = hover.type === 'diesel' ? (p.dieselVehicles || [])
                       : hover.type === 'superDiesel' ? (p.superDieselVehicles || [])
                       : hover.type === 'petrol' ? (p.petrolVehicles || [])
                       : (p.superPetrolVehicles || [])
            const color = hover.type === 'diesel' ? dieselC
                        : hover.type === 'superDiesel' ? superDieselC
                        : hover.type === 'petrol' ? petrolC
                        : superPetrolC
            const fuelName = hover.type === 'diesel' ? 'Auto Diesel'
                           : hover.type === 'superDiesel' ? 'Super Diesel'
                           : hover.type === 'petrol' ? 'Petrol 92 Octane'
                           : 'Petrol 95 Octane'
            const isElectric = false
            const shown = list.slice(0, 7)
            const rowH = 11, headH = 32
            const rows = Math.max(1, shown.length) + (list.length > 7 ? 1 : 0)
            const bw = 170, bh = headH + rows * rowH + 6
            const rawVal = hover.type === 'diesel' ? p.diesel
                         : hover.type === 'superDiesel' ? p.superDiesel
                         : hover.type === 'petrol' ? p.petrol
                         : p.superPetrol
            const cy = Y(rawVal)
            let bx = hx + 12; if (bx + bw > W) bx = hx - bw - 12; if (bx < 2) bx = 2
            let by = cy - bh - 8; if (by < 2) by = cy + 12; if (by + bh > H) by = Math.max(2, H - bh - 2)
            const cx2 = bx + bw / 2
            return (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={hx} y1={padT} x2={hx} y2={padT + chartH} stroke={color} strokeDasharray="3 3" opacity="0.5" />
                <rect x={bx} y={by} width={bw} height={bh} rx="8" fill={isDark ? '#0e1529' : '#ffffff'} stroke="var(--surface-border)" style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.45))' }} />
                <text x={cx2} y={by + 16} fontSize="9" fontWeight="800" fill={color} textAnchor="middle">{p.fullDateLabel || p.label} · {fuelName}</text>
                {list.length === 0
                  ? <text x={cx2} y={by + headH} fontSize="7.5" fill={axisText} textAnchor="middle">No records found</text>
                  : shown.map((v, k) => (
                    <text key={k} x={cx2} y={by + headH + k * rowH} fontSize="7.5" fill="var(--text-primary)" textAnchor="middle">
                      <tspan fontWeight="700">{v.reg}</tspan>
                      <tspan fill={axisText}>  ·  {`${Math.round(v.liters).toLocaleString()} L`}</tspan>
                    </text>
                  ))}
                {list.length > 7 && (
                  <text x={cx2} y={by + headH + shown.length * rowH} fontSize="6.5" fill={axisText} textAnchor="middle">+{list.length - 7} more</text>
                )}
              </g>
            )
          })()}
          </svg>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No fuel data yet</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: dieselC }} /> Auto Diesel (L)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: superDieselC }} /> Super Diesel (L)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: petrolC }} /> Petrol 92 Octane (L)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: superPetrolC }} /> Petrol 95 Octane (L)
        </span>
      </div>
    </div>
  )
}
const MaintenanceCostDonutChart = ({ isDark, services = [] }) => {
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [selectedVehicle, setSelectedVehicle] = useState('ALL')

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const uniqueMonths = Array.from(new Set(services.map(s => {
    if (!s.serviceDate) return null
    return new Date(s.serviceDate).getMonth()
  }).filter(m => m !== null))).sort((a, b) => a - b)

  const uniqueVehicles = Array.from(new Set(services.map(s => s.vehicleRegNumber).filter(Boolean))).sort()

  const filteredServices = services.filter(s => {
    if (!s.serviceDate || !s.serviceCost) return false
    
    if (selectedMonth !== 'ALL') {
      const m = new Date(s.serviceDate).getMonth()
      if (m !== Number(selectedMonth)) return false
    }

    if (selectedVehicle !== 'ALL') {
      if (s.vehicleRegNumber !== selectedVehicle) return false
    }

    return true
  })

  const grouped = {}
  let totalCost = 0
  filteredServices.forEach(s => {
    const type = s.serviceType || 'OTHER'
    const cost = Number(s.serviceCost) || 0
    grouped[type] = (grouped[type] || 0) + cost
    totalCost += cost
  })

  const donutColors = {
    GENERAL_INSPECTION: '#3b82f6',
    TIRE_REPLACEMENT: '#fbbf24',
    BRAKE_SERVICE: '#f87171',
    ENGINE_TUNE_UP: '#a78bfa',
    AC_SERVICE: '#06b6d4',
    OIL_CHANGE: '#34d399',
    BATTERY_REPLACEMENT: '#ec4899',
    OTHER: '#94a3b8'
  }

  const data = Object.entries(grouped).map(([type, value]) => ({
    label: type.replace(/_/g, ' '),
    value,
    color: donutColors[type] || donutColors.OTHER
  })).sort((a, b) => b.value - a.value)

  const cx = 90, cy = 90, R = 85, r = 60
  let angle = -Math.PI / 2
  const slices = data.map(d => {
    const sweep = (d.value / (totalCost || 1)) * 2 * Math.PI
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(angle + sweep), y2 = cy + R * Math.sin(angle + sweep)
    const ix1 = cx + r * Math.cos(angle), iy1 = cy + r * Math.sin(angle)
    const ix2 = cx + r * Math.cos(angle + sweep), iy2 = cy + r * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`
    angle += sweep
    return { path, ...d }
  })

  const D = {
    surface: 'var(--surface)',
    border: 'var(--surface-border)',
    text: 'var(--text-primary)',
    textSub: 'var(--text-muted)'
  }

  const selectStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${D.border}`,
    borderRadius: 12,
    color: D.text,
    padding: '8px 14px',
    fontSize: '0.8rem',
    fontWeight: 700,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  }

  return (
    <div style={{
      background: D.surface,
      borderRadius: 24,
      border: `1px solid ${D.border}`,
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      padding: '28px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box'
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35), 0 0 20px rgba(99, 102, 241, 0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = D.border
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Cost by Service Type</div>
          <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4, fontWeight: 500 }}>Distribution of maintenance expenses</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
            <option value="ALL">All Months</option>
            {uniqueMonths.map(m => (
              <option key={m} value={m}>{monthNames[m]}</option>
            ))}
          </select>

          <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} style={selectStyle}>
            <option value="ALL">All Vehicles</option>
            {uniqueVehicles.map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
        </div>
      </div>

      {totalCost > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', width: 190, height: 190, margin: '0 auto', flexShrink: 0 }}>
            <svg width="190" height="190" viewBox="0 0 180 180">
              {slices.map((slice, i) => (
                <path
                  key={i}
                  d={slice.path}
                  fill={slice.color}
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '0.85'
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.transformOrigin = '90px 90px'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.transform = 'none'
                  }}
                />
              ))}
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '0.72rem', color: D.textSub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cost</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 950, color: D.text, marginTop: 4, fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: 'nowrap' }}>
                Rs. {Math.round(totalCost).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 180, overflowY: 'auto', paddingRight: 6 }}>
            {data.map((item, i) => {
              const pct = ((item.value / totalCost) * 100).toFixed(1)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>
                      {item.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text }}>
                      Rs. {Math.round(item.value).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 600 }}>
                      ({pct}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub, fontSize: '0.85rem' }}>
          No service expenses found for this selection
        </div>
      )}
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
  
  const cx = 110, cy = 110, R = 104, r = 74
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
      height: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Status Breakdown</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Current fleet split</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, flex: 1 }}>
        <svg viewBox="0 0 220 220" style={{ width: 170, height: 170, flexShrink: 0 }}>
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
    { icon: <Car size={18} color="var(--primary)" />, bg: 'var(--primary-light)', border: 'var(--border)', label: 'Register Vehicle', onClick: () => navigate('/vehicles', { state: { openAddVehicle: true, fromOneClick: true } }) },
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

const RecentActivitySection = ({ activities = [], navigate }) => {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 4
  const visible = expanded ? activities : activities.slice(0, LIMIT)
  const hasMore = activities.length > LIMIT

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 24,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      padding: '28px',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Recent Fleet Activity</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Live notifications and updates</div>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        margin: '0 -28px -28px -28px',
        borderTop: '1px solid var(--border)',
        overflow: 'hidden',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        {activities.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No recent activity found.
          </div>
        ) : (
          <>
            {visible.map((a, i) => (
              <div key={a.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 18,
                padding: '16px 28px',
                borderBottom: (i < visible.length - 1 || hasMore) ? '1px solid var(--border)' : 'none',
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
            ))}
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--surface-hi)',
                  border: 'none',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background 0.2s, color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--primary)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--surface-hi)'
                  e.currentTarget.style.color = 'var(--primary)'
                }}
              >
                {expanded ? 'Show Less' : `See More (${activities.length - LIMIT} details)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

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

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const selected = vehicles.find(v => String(v.id) === String(selectedId))
  const currentVal = selected ? (selected.currentMileageKm || 0) : 0
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

const ControllerDashboard = ({ navigate, isDark, chartData, fuelLogs = [], statusData, stats, activities, services, pendingFuelCount, pendingServiceCount }) => {
  const [mileageOpen, setMileageOpen] = useState(false)
  return (
    <>
      <SectionHeader title="Fleet Overview" />

      {/* Row containing all three charts, stretched to equal height */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 24, alignItems: 'stretch', marginBottom: 24 }}>
        <FleetFuelChart isDark={isDark} logs={fuelLogs} />
        <MaintenanceCostDonutChart isDark={isDark} services={services} />
        <StatusBreakdown isDark={isDark} statusData={statusData} stats={stats} />
      </div>

      {/* Row containing activities and quick commands, aligned with the charts above */}
      <div className="dashboard-columns-grid" style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: 24, alignItems: 'start', marginBottom: 36 }}>
        <RecentActivitySection activities={activities} navigate={navigate} />
        <QuickActionsPanel navigate={navigate} />
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .dashboard-charts-grid,
          .dashboard-columns-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}

const dashboardAlertCategory = (a) => {
  const t = String(a?.type || '').toUpperCase()
  if (t.includes('DOCUMENT') || t.includes('INSURANCE') || t.includes('LICENSE') || t.includes('EXPIR')) return 'INSURANCE'
  if (String(a?.severity || '').toUpperCase() === 'OVERDUE') return 'OVERDUE'
  return 'SERVICE'
}

const AlertSection = ({ alerts, navigate, isDark }) => {
  const [expanded, setExpanded] = useState(false)
  if (!alerts || alerts.length === 0) return null

  const sorted = [...alerts].sort((a, b) => {
    if (a.severity === 'OVERDUE' && b.severity !== 'OVERDUE') return -1
    if (b.severity === 'OVERDUE' && a.severity !== 'OVERDUE') return 1
    return 0
  })

  const overdueCount = sorted.filter(a => a.severity === 'OVERDUE').length
  const dueSoonCount = sorted.filter(a => a.severity !== 'OVERDUE').length
  const PREVIEW = 5
  const visible = expanded ? sorted : sorted.slice(0, PREVIEW)
  const hasMore = sorted.length > PREVIEW

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>System Alerts</h2>
        <div style={{ height: 1, background: 'var(--border)', width: 32, flexShrink: 0 }} />
        {overdueCount > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 999,
            background: 'var(--danger)', color: '#fff',
            fontSize: '0.74rem', fontWeight: 800,
            boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
          }}>
            <AlertTriangle size={12} /> {overdueCount} OVERDUE
          </span>
        )}
        {dueSoonCount > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 999,
            background: 'var(--warning)', color: '#fff',
            fontSize: '0.74rem', fontWeight: 800,
            boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
          }}>
            <Clock size={12} /> {dueSoonCount} DUE SOON
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate('/service')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-muted)'; e.currentTarget.style.borderColor = 'var(--primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <ShieldAlert size={13} /> Manage in Service →
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((alert, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '13px 18px', borderRadius: 12,
              background: alert.severity === 'OVERDUE' ? 'var(--danger-bg)' : 'var(--warning-bg)',
              border: `1px solid ${alert.severity === 'OVERDUE' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              boxShadow: 'var(--shadow-sm)',
              animation: alert.severity === 'OVERDUE' ? 'pulse-border 2s infinite' : 'none',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: alert.severity === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertTriangle size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</h4>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                  background: alert.severity === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
                  color: '#fff', textTransform: 'uppercase', flexShrink: 0
                }}>
                  {alert.severity}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.13)', color: 'var(--text-primary)',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                flexShrink: 0, fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
            >
              View
            </button>
          </div>
        ))}
      </div>

      {hasMore && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hi)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {expanded ? '▲ Show less' : `▼ Show ${sorted.length - PREVIEW} more alert${sorted.length - PREVIEW !== 1 ? 's' : ''}`}
          </button>
          {!expanded && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing {Math.min(PREVIEW, sorted.length)} of {sorted.length} — most critical shown first
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-border {
          0%   { border-color: rgba(239,68,68,0.2); }
          50%  { border-color: rgba(239,68,68,0.6); }
          100% { border-color: rgba(239,68,68,0.2); }
        }
      `}</style>
    </div>
  )
}


const DriverFuelChart = ({ logs = [], isDark }) => {
  const now = new Date()
  const yr = now.getFullYear()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const byMonth = Array.from({ length: 12 }, () => ({ litres: 0, cost: 0 }))
  logs.forEach(l => {
    const d = new Date(l.date)
    if (d.getFullYear() === yr) {
      byMonth[d.getMonth()].litres += Number(l.liters) || 0
      byMonth[d.getMonth()].cost += Number(l.totalCost) || 0
    }
  })
  const data = monthNames.slice(0, now.getMonth() + 1).map((label, i) => ({ label, litres: byMonth[i].litres, cost: byMonth[i].cost }))
  const hasData = data.some(d => d.litres > 0)
  const maxL = Math.max(1, ...data.map(d => d.litres))
  const barColor = '#3b82f6'
  const axisText = isDark ? '#64748b' : '#94a3b8'
  const axis = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
  const W = 560, H = 180, padL = 48, padR = 16, padT = 20, padB = 36
  const chartH = H - padT - padB
  const chartW = W - padL - padR
  const barW = Math.max(8, Math.min(28, (chartW / Math.max(data.length, 1)) - 8))
  const X = i => padL + (data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 24,
      border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '28px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35), 0 0 20px rgba(59,130,246,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>My Fuel Usage</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Monthly litres filled — {yr}</div>
      </div>
      {hasData ? (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = padT + chartH - f * chartH
            return (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={axis} strokeDasharray="4 4" />
                <text x={padL - 8} y={y + 4} fontSize="9" fill={axisText} textAnchor="end">{Math.round(f * maxL)}</text>
              </g>
            )
          })}
          {data.map((d, i) => {
            const bh = Math.max(d.litres > 0 ? 4 : 0, (d.litres / maxL) * chartH)
            const bx = X(i) - barW / 2
            const by = padT + chartH - bh
            return (
              <g key={i}>
                <rect x={bx} y={by} width={barW} height={bh} rx="4"
                  fill={barColor} opacity="0.82"
                  style={{ transition: 'opacity 0.2s', cursor: 'default' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.82'}
                />
                <text x={X(i)} y={H - 6} fontSize="9" fill={axisText} textAnchor="middle" fontWeight="600">{d.label}</text>
                {d.litres > 0 && (
                  <text x={X(i)} y={Math.max(by - 5, padT + 11)} fontSize="8.5" fill={barColor} textAnchor="middle" fontWeight="700">{Math.round(d.litres)}L</text>
                )}
              </g>
            )
          })}
        </svg>
      ) : (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No fuel data yet for {yr}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <span style={{ width: 18, height: 3, borderRadius: 2, background: barColor }} /> Litres (L)
        </span>
      </div>
    </div>
  )
}

/* ── Driver's active-trip panel with Start / Decline / Complete actions ── */
const ActiveTripPanel = ({ trip, isDark, onChanged, navigate }) => {
  const A = useAccents(isDark)
  const [busy, setBusy] = useState(false)
  const [modalAction, setModalAction] = useState(null) // 'start' | 'decline' | 'complete'
  const status = (trip.status || 'ASSIGNED').toUpperCase()

  const getJobType = (purposeText) => {
    const p = purposeText || ''
    if (p.startsWith('[Service]')) return 'SERVICE'
    if (p.startsWith('[Fuel]')) return 'FUEL'
    return 'TRIP'
  }

  const getCleanPurpose = (purposeText) => {
    const p = purposeText || ''
    return p.replace(/^\[(Service|Fuel|Trip)\]\s*/i, '')
  }

  const jobType = getJobType(trip.purpose)
  const cleanPurpose = getCleanPurpose(trip.purpose)

  const act = async (reason) => {
    if (!modalAction) return
    setBusy(true)
    try {
      if (modalAction === 'start') await tripAPI.startTrip(trip.id)
      if (modalAction === 'complete') await tripAPI.completeTrip(trip.id)
      if (modalAction === 'decline') await tripAPI.declineTrip(trip.id, reason || '')
      setModalAction(null)
      await onChanged?.()
    } catch (err) {
      console.error('Trip action failed:', err)
      alert(err.response?.data?.message || 'Action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const statusMeta = status === 'STARTED'
    ? { label: 'In Progress', color: A.blue, dim: A.blueDim }
    : { label: 'Awaiting your response', color: A.gold, dim: A.goldDim }

  const typeConfig = {
    TRIP: { icon: <Navigation size={22} color={A.blue} />, bg: A.blueDim, label: 'Trip Job' },
    SERVICE: { icon: <Wrench size={22} color={A.gold} />, bg: A.goldDim, label: 'Service Job' },
    FUEL: { icon: <Fuel size={22} color={A.green} />, bg: A.greenDim, label: 'Fuel Job' },
  }[jobType] || { icon: <Navigation size={22} color={A.blue} />, bg: A.blueDim, label: 'Trip Job' }

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--surface-border)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: 28, marginBottom: 36,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: typeConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {typeConfig.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: typeConfig.bg, color: typeConfig.icon.props.color, border: `1px solid ${typeConfig.icon.props.color}30`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {typeConfig.label}
              </span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {jobType === 'TRIP' && trip.origin ? `${trip.origin} → ` : ''}{trip.destination}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Job #{trip.id} · Vehicle {trip.vehicleRegNumber}</div>
          </div>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 800, padding: '5px 12px', borderRadius: 999,
          background: statusMeta.dim, color: statusMeta.color, border: `1px solid ${statusMeta.color}40`,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{statusMeta.label}</span>
      </div>

      {cleanPurpose && (
        <p style={{ margin: '0 0 18px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
          {cleanPurpose}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {status === 'ASSIGNED' && (
          <>
            <button onClick={() => setModalAction('start')} disabled={busy} style={tripBtnStyle('linear-gradient(135deg,#059669,#10b981)', '#fff', busy)}>
              <Play size={15} /> Accept Job
            </button>
            <button onClick={() => setModalAction('decline')} disabled={busy} style={tripBtnStyle(A.redDim, A.red, busy, `1px solid ${A.red}40`)}>
              <X size={15} /> Decline
            </button>
          </>
        )}
        {status === 'STARTED' && (
          <button onClick={() => setModalAction('complete')} disabled={busy} style={tripBtnStyle('linear-gradient(135deg,var(--primary-dark),var(--primary))', '#fff', busy)}>
            <CheckCircle size={15} /> Complete Job
          </button>
        )}
        <button onClick={() => navigate('/jobs')} style={tripBtnStyle('var(--surface-hi)', 'var(--text-primary)', false, '1px solid var(--surface-border)')}>
          View all my jobs →
        </button>
      </div>

      <TripActionModal
        action={modalAction}
        trip={trip}
        busy={busy}
        onClose={() => !busy && setModalAction(null)}
        onConfirm={act}
      />
    </div>
  )
}

const tripBtnStyle = (bg, color, busy, border) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '10px 20px', borderRadius: 12, border: border || 'none',
  background: bg, color, fontSize: '0.83rem', fontWeight: 700,
  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
  fontFamily: 'inherit', transition: 'all 0.15s',
})

const DriverDashboard = ({ navigate, isDark, trips, onTripChanged }) => {
  const A = useAccents(isDark)
  const allTrips = trips || []
  const activeTrip = allTrips.find(t => ['ASSIGNED', 'STARTED'].includes((t.status || '').toUpperCase()))
  const tripStatusLabel = { ASSIGNED: 'Awaiting response', STARTED: 'In progress' }
  const activeStatus = (activeTrip?.status || '').toUpperCase()

  const [myVehicle, setMyVehicle] = useState(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)

  useEffect(() => {
    vehicleAPI.getMyVehicle()
      .then(res => setMyVehicle(res.data.data || null))
      .catch(() => setMyVehicle(null))
      .finally(() => setVehicleLoading(false))
  }, [])

  const vStatusColors = {
    AVAILABLE:   { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: '#10b98140' },
    ON_TRIP:     { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '#60a5fa40' },
    MAINTENANCE: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '#fbbf2440' },
    INACTIVE:    { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: '#f8717140' },
  }

  return (
    <>
      <SectionHeader title="My Overview" />
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={<Car size={20} color={A.driverColor}/>}
          label="Assigned Vehicle"
          value={vehicleLoading ? '…' : (myVehicle ? myVehicle.registrationNo : '—')}
          colorDim={A.driverDim} colorHex={A.driverColor}
          change={myVehicle ? `${myVehicle.manufacturer || ''} ${myVehicle.model || ''}`.trim() || 'My vehicle' : 'No vehicle assigned'}
          onClick={() => myVehicle && navigate('/vehicles', { state: { openVehicleProfile: myVehicle.registrationNo } })}
        />
        <StatCard
          icon={<ClipboardList size={20} color={A.driverColor}/>}
          label="Assigned Job"
          value={activeTrip ? activeTrip.destination : 'None'}
          colorDim={A.driverDim} colorHex={A.driverColor}
          change={activeTrip ? (tripStatusLabel[activeStatus] || activeStatus) : 'Nothing assigned yet'}
          onClick={() => navigate('/jobs')}
        />
      </div>

      {/* My Vehicle Card */}
      {!vehicleLoading && (
        <div style={{
          background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--surface-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: '24px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
        }}>
          {/* Icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: myVehicle ? 'linear-gradient(135deg,#1e3a8a,#2563eb)' : 'rgba(255,255,255,0.06)',
            color: myVehicle ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: myVehicle ? '0 8px 20px rgba(37,99,235,0.35)' : 'none'
          }}>
            <Car size={24} />
          </div>
          {myVehicle ? (
            <>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>My Assigned Vehicle</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {myVehicle.registrationNo}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                  {myVehicle.manufacturer} {myVehicle.model} {myVehicle.year ? `(${myVehicle.year})` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Mileage */}
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Mileage</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: A.green }}>
                    {myVehicle.currentMileageKm ? `${myVehicle.currentMileageKm.toLocaleString()} km` : 'N/A'}
                  </div>
                </div>
                {/* Status */}
                {myVehicle.status && (() => {
                  const sc = vStatusColors[myVehicle.status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'var(--surface-border)' }
                  return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '6px 14px', borderRadius: 8, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {myVehicle.status.replace('_', ' ')}
                    </span>
                  )
                })()}
                <button onClick={() => myVehicle && navigate('/vehicles', { state: { openVehicleProfile: myVehicle.registrationNo } })}
                  style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', color: '#fff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px var(--primary-glow)' }}>
                  View Details
                </button>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>My Assigned Vehicle</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>No vehicle assigned</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Your controller will assign a vehicle to you.</div>
            </div>
          )}
        </div>
      )}

      {activeTrip ? (
        <ActiveTripPanel trip={activeTrip} isDark={isDark} onChanged={onTripChanged} navigate={navigate} />
      ) : (
        <div style={{
          background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--surface-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)', padding: 48, marginBottom: 36, textAlign: 'center',
        }}>
          <ClipboardList size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>No job assigned right now</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your controller will assign a job and a vehicle here.</div>
        </div>
      )}
    </>
  )
}

const DashboardPage = () => {
  const { user, isAdmin } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'blue'
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, controllers: 0, drivers: 0, activeUsers: 0, inactiveUsers: 0, suspendedUsers: 0, pendingUsers: 0 })
  const [monthlyCostData, setMonthlyCostData] = useState([])
  const [controllerStats, setControllerStats] = useState({ total: 0, active: 0, maintenance: 0, available: 0 })
  const [fleetChartData, setFleetChartData] = useState([])
  const [rawFuelLogs, setRawFuelLogs] = useState([])
  const [statusData, setStatusData] = useState([])
  const [alerts, setAlerts] = useState([])
  const [activities, setActivities] = useState([])
  const [services, setServices] = useState([])
  const [pendingFuelCount, setPendingFuelCount] = useState(0)
  const [pendingServiceCount, setPendingServiceCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [driverTrips, setDriverTrips] = useState([])

  // Reload the driver's trips (used on initial load and after start/decline/complete)
  const loadDriverTrips = useCallback(async () => {
    try {
      const res = await tripAPI.getMyTrips()
      setDriverTrips(res.data.data || [])
    } catch (err) {
      console.error('Error loading driver trips:', err)
    }
  }, [])

  const [alertFilter, setAlertFilter] = useState(['SERVICE', 'INSURANCE', 'FUEL', 'OVERDUE'])
  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(`vmas-privacy-settings-${user?.id || 'me'}`)
        const parsed = saved ? JSON.parse(saved) : null
        setAlertFilter(Array.isArray(parsed?.alertTypes) ? parsed.alertTypes : ['SERVICE', 'INSURANCE', 'FUEL', 'OVERDUE'])
      } catch { }
    }
    load()
    window.addEventListener('focus', load)
    window.addEventListener('vmas-notif-settings-update', load)
    return () => { window.removeEventListener('focus', load); window.removeEventListener('vmas-notif-settings-update', load) }
  }, [user?.id])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (isAdmin || user?.role === 'CONTROLLER') {
          try {
            const alertRes = await alertAPI.getDashboardAlerts()
            const alertList = alertRes.data.data?.alerts || (Array.isArray(alertRes.data.data) ? alertRes.data.data : [])
            setAlerts(alertList)
          } catch (err) {
            console.error('Error loading dashboard alerts:', err)
          }

          try {
            const servRes = await serviceAPI.getAllServices()
            const allServices = servRes.data.data || []
            setServices(allServices)
            const pendingServ = allServices.filter(s => s.status === 'PENDING').length
            setPendingServiceCount(pendingServ)
          } catch (err) {
            console.error('Error loading service records for dashboard:', err)
          }

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
                suspendedUsers: users.filter(u => u.accountStatus === 'SUSPENDED').length,
                pendingUsers: users.filter(u => u.accountStatus === 'PENDING').length,
              })
            } catch (err) {
              console.error('Error loading admin user stats:', err)
            }

            try {
              const [fuelRes, serviceRes] = await Promise.all([
                fuelAPI.getAllFuelLogs(),
                serviceAPI.getAllServices(),
              ])
              const fuelLogs = (fuelRes.data.data || []).filter(l => !l.isDeleted && !l.deleted)
              const serviceRecords = (serviceRes.data.data || []).filter(s => !s.isDeleted && !s.deleted)
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              const now = new Date(), yr = now.getFullYear(), upto = now.getMonth()
              const fuelByMonth = Array(12).fill(0), maintByMonth = Array(12).fill(0)
              fuelLogs.forEach(l => { const d = new Date(l.date); if (d.getFullYear() === yr) fuelByMonth[d.getMonth()] += (l.totalCost || 0) })
              serviceRecords.forEach(s => { const d = new Date(s.serviceDate); if (d.getFullYear() === yr) maintByMonth[d.getMonth()] += (parseFloat(s.serviceCost) || 0) })
              const mcd = []
              for (let m = 0; m <= upto; m++) mcd.push({ label: monthNames[m], maintenance: maintByMonth[m], fuel: fuelByMonth[m] })
              setMonthlyCostData(mcd)
            } catch (err) {
              console.error('Error loading monthly cost trend:', err)
            }

            try {
              const notifsRes = await notificationAPI.getAll()
              const backendNotifs = notifsRes.data.data || []
              const localNotifs = notifService.getControllerNotifications() || []
              const merged = [...backendNotifs, ...localNotifs]
              merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              setActivities(merged.slice(0, 10).map(mapNotificationToActivity))
            } catch (err) {
              console.error('Error loading admin recent activity:', err)
            }
          }

          if (user?.role === 'CONTROLLER') {
            try {
              const response = await vehicleAPI.getAllVehicles()
              const vehicles = response.data.data || []
              setControllerStats({
                total: vehicles.length,
                active: vehicles.filter(v => v.status === 'ACTIVE').length,
                maintenance: vehicles.filter(v => v.status === 'SERVICE').length,
                available: vehicles.filter(v => v.status === 'AVAILABLE').length,
              })

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
          try {
            const logsRes = await fuelAPI.getAllFuelLogs()
            const allLogs = logsRes.data.data || []
            const logs = allLogs.filter(l => !l.isDeleted && !l.deleted)
            setRawFuelLogs(logs)
            const pendingFuel = allLogs.filter(l => l.status === 'PENDING').length
            setPendingFuelCount(pendingFuel)
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const now = new Date(), yr = now.getFullYear(), upto = now.getMonth()
            const agg = Array.from({ length: 12 }, () => ({
              diesel: 0,
              superDiesel: 0,
              petrol: 0,
              superPetrol: 0,
              dieselMap: {},
              superDieselMap: {},
              petrolMap: {},
              superPetrolMap: {}
            }))
            logs.forEach(l => {
              const d = new Date(l.date)
              if (d.getFullYear() !== yr) return
              const m = d.getMonth()
              let ft = (l.fuelType || '').toLowerCase().replace('_', ' ')
              if (ft === 'petrol' || ft.includes('92')) ft = 'petrol';
              else if (ft === 'super petrol' || ft.includes('95')) ft = 'super petrol';
              else if (ft === 'diesel' || ft.includes('auto')) ft = 'diesel';
              else if (ft.includes('super diesel')) ft = 'super diesel';

              const liters = Number(l.liters) || 0
              const cost = Number(l.totalCost) || 0
              const reg = l.vehicleRegNumber || 'Unknown'
              if (ft === 'diesel') { agg[m].diesel += liters; agg[m].dieselMap[reg] = (agg[m].dieselMap[reg] || 0) + liters }
              else if (ft === 'super diesel') { agg[m].superDiesel += liters; agg[m].superDieselMap[reg] = (agg[m].superDieselMap[reg] || 0) + liters }
              else if (ft === 'petrol') { agg[m].petrol += liters; agg[m].petrolMap[reg] = (agg[m].petrolMap[reg] || 0) + liters }
              else if (ft === 'super petrol') { agg[m].superPetrol += liters; agg[m].superPetrolMap[reg] = (agg[m].superPetrolMap[reg] || 0) + liters }
            })
            const toList = map => Object.entries(map).map(([reg, liters]) => ({ reg, liters })).sort((a, b) => b.liters - a.liters)
            const arr = []
            for (let m = 0; m <= upto; m++) {
              arr.push({
                label: monthNames[m],
                diesel: agg[m].diesel,
                superDiesel: agg[m].superDiesel,
                petrol: agg[m].petrol,
                superPetrol: agg[m].superPetrol,
                electric: 0,
                dieselVehicles: toList(agg[m].dieselMap),
                superDieselVehicles: toList(agg[m].superDieselMap),
                petrolVehicles: toList(agg[m].petrolMap),
                superPetrolVehicles: toList(agg[m].superPetrolMap)
              })
            }
            setFleetChartData(arr)
          } catch (err) {
            console.error('Error loading fuel consumption chart data:', err)
          }

          // Fetch real-time vehicle status breakdown data
          try {
            const statusRes = await fuelAPI.getVehicleStats()
            setStatusData(statusRes.data.data || [])
          } catch (err) {
            console.error('Error loading status data:', err)
          }
        } else if (user?.role === 'DRIVER') {
          // Fetch the driver's assigned trips for the dashboard
          await loadDriverTrips()
        }
      } catch (err) {
        console.error('Error loading stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
    // Real-time refresh: re-fetch dashboard data every 30 seconds
    const refreshId = setInterval(loadDashboardData, 30000)
    return () => clearInterval(refreshId)
  }, [isAdmin, user?.role, loadDriverTrips])

  const roleLabel = { ADMIN: 'Administrator', CONTROLLER: 'Fleet Controller', DRIVER: 'Vehicle Driver' }
  const roleEmoji = { ADMIN: <Shield size={32} color="#fff"/>, CONTROLLER: <Gamepad2 size={32} color="#fff"/>, DRIVER: <Car size={32} color="#fff"/> }
  // Role badge colours — violet / amber / emerald
  const roleBadgeMeta = {
    ADMIN:      { color: isDark ? '#a78bfa' : '#c4b5fd', bg: isDark ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.22)', border: isDark ? 'rgba(124,58,237,0.45)' : 'rgba(124,58,237,0.35)' },
    CONTROLLER: { color: isDark ? '#fbbf24' : '#fde68a', bg: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.22)', border: isDark ? 'rgba(245,158,11,0.45)' : 'rgba(245,158,11,0.35)' },
    DRIVER:     { color: isDark ? '#6ee7b7' : '#a7f3d0', bg: isDark ? 'rgba(16,185,129,0.22)' : 'rgba(16,185,129,0.20)', border: isDark ? 'rgba(16,185,129,0.45)' : 'rgba(16,185,129,0.35)' },
  }
  const currentRoleMeta = roleBadgeMeta[user?.role] || { color: '#dbeafe', bg: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.3)' }

  return (
    <div className="app-shell" style={{ background: 'var(--bg-body)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: 'var(--bg-body)' }}>
        <Topbar title="Dashboard" subtitle="Home / Dashboard" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body">

          {/* Hero Banner — Dynamic glassmorphic design */}
          {(() => {
            const heroBg = 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)';

            return (
              <div style={{
                background: heroBg,
                borderRadius: 28, padding: '40px', marginBottom: 32,
                position: 'relative', overflow: 'hidden',
                boxShadow: isDark
                  ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px var(--primary-glow), inset 0 1px 0 rgba(255,255,255,0.04)'
                  : '0 16px 48px rgba(0,0,0,0.15), 0 8px 32px var(--primary-glow)',
                border: '1px solid var(--border-strong)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
              }}>
                {/* Decorative circles */}
                {[['80%', '-20px', '220px', 'rgba(255,255,255,0.02)'], ['20%', '60%', '150px', 'rgba(255,255,255,0.02)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.01)']].map(([t, l, s, bg], i) => (
                  <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
                ))}
                {/* Neon glow accent for dark mode */}
                {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-light) 0.06%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Good day, {user?.userName}!
                      </h1>
                      {user?.role === 'DRIVER' && user?.accountStatus && (() => {
                        const st = (user.accountStatus || '').toUpperCase()
                        const meta = {
                          ACTIVE:    { label: 'Active',    color: '#34d399', bg: 'rgba(16,185,129,0.22)',  border: 'rgba(16,185,129,0.45)' },
                          INACTIVE:  { label: 'Inactive',  color: '#cbd5e1', bg: 'rgba(148,163,184,0.22)', border: 'rgba(148,163,184,0.45)' },
                          PENDING:   { label: 'Pending',   color: '#fbbf24', bg: 'rgba(251,191,36,0.22)',  border: 'rgba(251,191,36,0.45)' },
                          SUSPENDED: { label: 'Suspended', color: '#f87171', bg: 'rgba(239,68,68,0.22)',   border: 'rgba(239,68,68,0.45)' },
                        }[st] || { label: st.charAt(0) + st.slice(1).toLowerCase(), color: '#cbd5e1', bg: 'rgba(148,163,184,0.22)', border: 'rgba(148,163,184,0.45)' }
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.bg, color: '#fff', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)', border: `1px solid ${meta.border}` }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, display: 'inline-block', boxShadow: `0 0 6px ${meta.color}` }} />
                            {meta.label}
                          </span>
                        )
                      })()}
                    </div>
                    <p style={{ margin: '6px 0 0', color: '#f8fafc', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      Here's how your fleet is doing today.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Alerts Section - Show for Admin and Controller */}
          {(isAdmin || user?.role === 'CONTROLLER') && (
            <AlertSection alerts={alerts.filter(a => alertFilter.includes(dashboardAlertCategory(a)))} navigate={navigate} isDark={isDark} />
          )}

          {/* Role-based content */}
          {user?.role === 'ADMIN' && <AdminDashboard stats={stats} loading={loading} navigate={navigate} isDark={isDark} monthlyCostData={monthlyCostData} activities={activities} services={services} />}
          {user?.role === 'CONTROLLER' && (
            <ControllerDashboard
              navigate={navigate}
              isDark={isDark}
              chartData={fleetChartData}
              fuelLogs={rawFuelLogs}
              statusData={statusData}
              stats={controllerStats}
              activities={activities}
              services={services}
              pendingFuelCount={pendingFuelCount}
              pendingServiceCount={pendingServiceCount}
            />
          )}
          {user?.role === 'DRIVER' && <DriverDashboard navigate={navigate} isDark={isDark} trips={driverTrips} onTripChanged={loadDriverTrips} />}
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default DashboardPage
