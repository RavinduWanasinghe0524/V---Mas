import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { fuelAPI, vehicleAPI } from '../services/api'
import {
  Fuel, DollarSign, Droplets, Activity, Zap, ArrowUpRight, ArrowDownRight, TrendingUp, Gauge,
  Calendar, Car, User, Clock, RotateCcw, ChevronLeft, ChevronRight, Filter,
  Search, X, Check, Edit2, MoreVertical, AlertTriangle, BadgeCheck, RefreshCw
} from 'lucide-react'
import { computeLogsEfficiency, formatFuelType } from '../utils/fuelUtils'

// ── Shared fuel-type badge helper ───────────────────────────────────────
const fuelBadge = (ft, D) => {
  const clean = (ft || '').toUpperCase().replace('_', ' ');
  if (clean.includes('PETROL 92') || clean === 'PETROL') {
    return { color: D.gold, bg: D.goldDim };
  }
  if (clean.includes('PETROL 95') || clean === 'SUPER PETROL') {
    return { color: '#ea580c', bg: 'rgba(234,88,12,0.12)' };
  }
  if (clean.includes('AUTO DIESEL') || clean === 'DIESEL') {
    return { color: D.indigo, bg: D.indigoDim };
  }
  if (clean.includes('SUPER DIESEL')) {
    return { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' };
  }
  if (clean.includes('HYBRID')) {
    return { color: D.green, bg: D.greenDim };
  }
  if (clean.includes('ELECTRIC')) {
    return { color: D.blue, bg: D.blueDim };
  }
  return { color: D.textSub, bg: D.surfaceHi };
}

const card = (D) => ({
  background: D.surface,
  borderRadius: 24,
  border: `1px solid ${D.border}`,
  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
  overflow: 'hidden',
})



/* -- SVG Bar Chart (fixed 12-slot width - never resizes on period change) -- */
const BarChart = ({ data, maxVal, highlightCount = 12, D }) => {
  if (!data.length) return (
    <div style={{ height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub }}>
      No data available
    </div>
  )
  // Always render exactly 12 slots so the SVG size never changes.
  // Slots beyond `highlightCount` from the right are rendered at reduced opacity.
  const TOTAL = 12
  const H = 160, W_BAR = 16, SLOT = 58   // fixed slot width -> total = 12 * 58 = 696
  const TOTAL_W = TOTAL * SLOT
  // Pad data array to TOTAL slots on the left with empty months if needed
  const padded = Array.from({ length: TOTAL }, (_, i) => data[i] ?? { month: '', Diesel: 0, Petrol: 0 })
  const dimStart = TOTAL - highlightCount   // months before this index are dimmed
  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <svg width="100%" viewBox={`0 0 ${TOTAL_W} ${H + 32}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="barD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="barP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={0} y1={H - f * H}
            x2={TOTAL_W} y2={H - f * H}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {padded.map((d, i) => {
          const x = i * SLOT + (SLOT - W_BAR * 2 - 3) / 2
          const dH = maxVal > 0 ? Math.max((d.Diesel / maxVal) * H, d.Diesel > 0 ? 4 : 0) : 0
          const pH = maxVal > 0 ? Math.max((d.Petrol / maxVal) * H, d.Petrol > 0 ? 4 : 0) : 0
          const dim = i < dimStart
          const opacity = dim ? 0.15 : 1
          return (
            <g key={i} opacity={opacity} style={{ transition: 'opacity 0.3s ease' }}>
              <rect x={x} y={H - dH} width={W_BAR} height={dH} rx={3} fill="url(#barD)">
                {!dim && <title>Auto Diesel: {d.Diesel.toFixed(1)} L</title>}
              </rect>
              <rect x={x + W_BAR + 3} y={H - pH} width={W_BAR} height={pH} rx={3} fill="url(#barP)">
                {!dim && <title>Petrol 92 Octane: {d.Petrol.toFixed(1)} L</title>}
              </rect>
              {d.month ? (
                <text x={i * SLOT + SLOT / 2} y={H + 18} textAnchor="middle"
                  fill={dim ? 'rgba(100,116,139,0.4)' : D.textSub}
                  fontSize={9} fontWeight={600}>{d.month}</text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* -- SVG Line / Area Chart (efficiency trend) ----------------- */
const LineChart = ({ data, maxVal, minVal, D }) => {
  if (!data.length) return (
    <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub }}>No data</div>
  )
  const W = 500, H = 140, pad = 10
  const range = maxVal - minVal || 1
  const pts = data.map((v, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2),
    y: H - pad - ((v - minVal) / range) * (H - pad * 2),
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `${pts[0].x},${H} ` + pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length - 1].x},${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Y gridlines */}
      {[0, 0.33, 0.66, 1].map(f => (
        <line key={f} x1={pad} y1={pad + f * (H - pad * 2)} x2={W - pad} y2={pad + f * (H - pad * 2)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      <polygon points={area} fill="url(#areaGrad)" />
      <polyline points={polyline} fill="none" stroke="#2dd4bf" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0b132b" stroke="#2dd4bf" strokeWidth={2}>
          <title>{data[i].toFixed(2)} km/L</title>
        </circle>
      ))}
    </svg>
  )
}

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr
  const parts = String(dateStr).split('T')[0].split('-')
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  }
  return new Date(dateStr)
}

const classifyFuelType = (raw) => {
  const clean = String(raw || '').toUpperCase().replace(/_/g, ' ')
  if (clean.includes('SUPER DIESEL')) return 'superDiesel'
  if (clean.includes('DIESEL') || clean.includes('AUTO DIESEL')) return 'diesel'
  if (clean.includes('SUPER PETROL') || clean.includes('95') || clean.includes('PETROL 95')) return 'superPetrol'
  if (clean.includes('PETROL') || clean.includes('92') || clean.includes('PETROL 92')) return 'petrol'
  return 'diesel'
}

/* -- Fuel Consumption Line Chart (Diesel vs Petrol, per vehicle hover) -- */
const FleetFuelConsumptionChart = ({ logs, D, isDark }) => {
  const [hover, setHover] = useState(null)
  const svgRef = useRef(null)

  // Build monthly aggregation from raw logs
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
  ;(logs || []).forEach(l => {
    if (l.isDeleted || l.deleted || l.status === 'REJECTED') return
    const d = parseLocalDate(l.date)
    if (!d || d.getFullYear() !== yr) return
    const m = d.getMonth()
    const ft = classifyFuelType(l.fuelType)

    const liters = Number(l.liters) || 0
    const reg = l.vehicleRegNumber || 'Unknown'
    if (ft === 'diesel') { agg[m].diesel += liters; agg[m].dieselMap[reg] = (agg[m].dieselMap[reg] || 0) + liters }
    else if (ft === 'superDiesel') { agg[m].superDiesel += liters; agg[m].superDieselMap[reg] = (agg[m].superDieselMap[reg] || 0) + liters }
    else if (ft === 'petrol') { agg[m].petrol += liters; agg[m].petrolMap[reg] = (agg[m].petrolMap[reg] || 0) + liters }
    else if (ft === 'superPetrol') { agg[m].superPetrol += liters; agg[m].superPetrolMap[reg] = (agg[m].superPetrolMap[reg] || 0) + liters }
  })
  const toList = map => Object.entries(map).map(([reg, liters]) => ({ reg, liters })).sort((a, b) => b.liters - a.liters)
  const pts0 = []
  for (let m = 0; m <= upto; m++) {
    pts0.push({
      label: monthNames[m],
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

  const hasData = pts0.length > 0
  const dieselC = '#f59e0b', superDieselC = '#7c3aed', petrolC = '#3b82f6', superPetrolC = '#ea580c'
  const W = 520, H = 180, padL = 46, padR = 16, padT = 16, padB = 36
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
    <div style={{ padding: '22px 24px' }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fuel Consumption</h3>
        <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: D.textSub }}>Monthly fuel volume by type — hover a point for details</p>
      </div>
      {hasData ? (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
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
          {pts0.map((p, i) => (<text key={i} x={X(i)} y={H - 6} fontSize="9" fill={axisText} textAnchor="middle" fontWeight="600">{p.label}</text>))}
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
              <circle cx={X(i)} cy={Y(p.diesel)} r={hover && hover.i === i && hover.type === 'diesel' ? 5 : 3} fill={D.surface} stroke={dieselC} strokeWidth="2" />
              <circle cx={X(i)} cy={Y(p.diesel)} r="10" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'diesel' })} />
              
              <circle cx={X(i)} cy={Y(p.superDiesel)} r={hover && hover.i === i && hover.type === 'superDiesel' ? 5 : 3} fill={D.surface} stroke={superDieselC} strokeWidth="2" />
              <circle cx={X(i)} cy={Y(p.superDiesel)} r="10" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'superDiesel' })} />

              <circle cx={X(i)} cy={Y(p.petrol)} r={hover && hover.i === i && hover.type === 'petrol' ? 5 : 3} fill={D.surface} stroke={petrolC} strokeWidth="2" />
              <circle cx={X(i)} cy={Y(p.petrol)} r="10" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ i, type: 'petrol' })} />

              <circle cx={X(i)} cy={Y(p.superPetrol)} r={hover && hover.i === i && hover.type === 'superPetrol' ? 5 : 3} fill={D.surface} stroke={superPetrolC} strokeWidth="2" />
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
                  <rect x={bx} y={by} width={bw} height={bh} rx="8" fill={isDark ? '#0e1529' : '#ffffff'} stroke={D.border} style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.45))' }} />
                  <text x={bx + 12} y={by + 16} fontSize="10" fontWeight="800" fill={D.text}>{p.label}</text>
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
                <rect x={bx} y={by} width={bw} height={bh} rx="8" fill={isDark ? '#0e1529' : '#ffffff'} stroke={D.border} style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.45))' }} />
                <text x={cx2} y={by + 16} fontSize="9" fontWeight="800" fill={color} textAnchor="middle">{p.label} · {fuelName}</text>
                {list.length === 0
                  ? <text x={cx2} y={by + headH} fontSize="7.5" fill={axisText} textAnchor="middle">No records found</text>
                  : shown.map((v, k) => (
                    <text key={k} x={cx2} y={by + headH + k * rowH} fontSize="7.5" fill={D.text} textAnchor="middle">
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
      ) : (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub, fontSize: '0.85rem' }}>No fuel data yet</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: D.textSub }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: dieselC }} /> Auto Diesel (L)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: D.textSub }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: superDieselC }} /> Super Diesel (L)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: D.textSub }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: petrolC }} /> Petrol 92 Octane (L)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: D.textSub }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: superPetrolC }} /> Petrol 95 Octane (L)
        </span>
      </div>
    </div>
  )
}

const HBar = ({ label, value, max, color, sub, D }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: D.text }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: D.textSub, fontWeight: 600 }}>{sub}</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

/* -
   MAIN COMPONENT
- */
/* ── Admin-only SVG Area Chart (Fuel Cost Trend) ────────────────────── */
const AdminCostTrendChart = ({ logs, D }) => {
  // Build monthly cost data from logs
  const monthMap = {}
  logs.forEach(l => {
    const d = new Date(l.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('default', { month: 'short' })
    if (!monthMap[key]) monthMap[key] = { label, cost: 0 }
    // Use totalCost if available, otherwise compute from liters * costPerLiter
    const cost = l.totalCost != null ? l.totalCost : (l.liters || 0) * (l.costPerLiter || 0)
    monthMap[key].cost += cost
  })
  const entries = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  if (entries.length === 0) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub }}>No data</div>

  const W = 600, H = 160, PAD = { t: 10, b: 30, l: 50, r: 10 }
  const costs = entries.map(([, v]) => v.cost)
  const maxC = Math.max(...costs, 1)
  const minC = 0
  const range = maxC - minC || 1

  // For a single data point, center it; otherwise distribute evenly
  const pts = costs.map((c, i) => ({
    x: costs.length === 1
      ? (W - PAD.l - PAD.r) / 2 + PAD.l
      : PAD.l + (i / (costs.length - 1)) * (W - PAD.l - PAD.r),
    y: PAD.t + (1 - (c - minC) / range) * (H - PAD.t - PAD.b),
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = costs.length === 1
    ? `${pts[0].x - 20},${H - PAD.b} ${pts[0].x},${pts[0].y} ${pts[0].x + 20},${H - PAD.b}`
    : `${pts[0].x},${H - PAD.b} ` + pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length - 1].x},${H - PAD.b}`
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: PAD.t + (1 - f) * (H - PAD.t - PAD.b), val: Math.round(f * maxC / 1000) + 'k' }))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="adminCostGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map(({ y, val }, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="rgba(148,163,184,0.7)" fontSize={9} fontWeight={600}>{val}</text>
        </g>
      ))}
      <polygon points={area} fill="url(#adminCostGrad)" />
      <polyline points={polyline} fill="none" stroke="#06b6d4" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#0b132b" stroke="#06b6d4" strokeWidth={2.5}>
            <title>{`LKR ${Math.round(costs[i]).toLocaleString()}`}</title>
          </circle>
          <text x={p.x} y={H - 8} textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize={10} fontWeight={600}>{entries[i][1].label}</text>
        </g>
      ))}
    </svg>
  )
}

/* ── Admin-only SVG Bar Chart (Usage by Vehicle) ─────────────────────── */
const AdminVehicleUsageChart = ({ logs, D }) => {
  const vMap = {}
  logs.forEach(l => {
    const k = l.vehicleRegNumber
    if (!vMap[k]) vMap[k] = 0
    vMap[k] += l.liters || 0
  })
  const entries = Object.entries(vMap).sort((a, b) => b[1] - a[1]).slice(0, 7)
  if (entries.length === 0) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub }}>No data</div>

  const W = 540, H = 180, PAD = { t: 10, b: 40, l: 10, r: 10 }
  const maxL = Math.max(...entries.map(([, v]) => v), 1)
  const barW = Math.min(36, (W - PAD.l - PAD.r) / entries.length - 12)
  const gap = (W - PAD.l - PAD.r - entries.length * barW) / (entries.length + 1)
  const yTicks = [0, 85, 170, 255, 340].map(v => ({ y: PAD.t + (1 - v / 340) * (H - PAD.t - PAD.b), val: v }))
  const colors = ['#3b82f6', '#60a5fa', '#818cf8', '#a78bfa', '#7dd3fc', '#38bdf8', '#6366f1']
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
      <defs>
        {entries.map((_, i) => (
          <linearGradient key={i} id={`vbg${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity="1" />
            <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity="0.4" />
          </linearGradient>
        ))}
      </defs>
      {yTicks.map(({ y, val }, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={PAD.l} y={y - 3} fill="rgba(148,163,184,0.6)" fontSize={9} fontWeight={600}>{val}</text>
        </g>
      ))}
      {entries.map(([reg, liters], i) => {
        const bH = Math.max((liters / maxL) * (H - PAD.t - PAD.b), liters > 0 ? 4 : 0)
        const x = PAD.l + gap + i * (barW + gap)
        const shortReg = reg.replace(/^[A-Z]+-/, '').slice(-7)
        return (
          <g key={reg}>
            <rect x={x} y={H - PAD.b - bH} width={barW} height={bH} rx={4} fill={`url(#vbg${i})`}>
              <title>{`${reg}: ${liters.toFixed(1)} L`}</title>
            </rect>
            <text x={x + barW / 2} y={H - PAD.b + 12} textAnchor="middle" fill="rgba(148,163,184,0.75)" fontSize={8} fontWeight={700}>{shortReg}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Fuel Type Distribution Donut Chart ──────────────────────────────── */
const FuelTypeDonutChart = ({ logs, D }) => {
  const [activeIdx, setActiveIdx] = useState(null)
  const [view, setView] = useState('volume') // 'volume' | 'cost'

  const FUEL_META = [
    { key: 'auto diesel',       label: 'Auto Diesel',       color: '#f59e0b' },
    { key: 'super diesel',      label: 'Super Diesel',      color: '#7c3aed' },
    { key: 'petrol 92 octane',  label: 'Petrol 92 Octane',  color: '#3b82f6' },
    { key: 'petrol 95 octane',  label: 'Petrol 95 Octane',  color: '#ea580c' },
  ]

  const totals = {}
  ;(logs || []).forEach(l => {
    let ft = (l.fuelType || '').toLowerCase().replace('_', ' ')
    if (ft === 'petrol' || ft.includes('92')) ft = 'petrol 92 octane';
    else if (ft === 'super petrol' || ft.includes('95')) ft = 'petrol 95 octane';
    else if (ft === 'diesel' || ft.includes('auto')) ft = 'auto diesel';
    else if (ft.includes('super diesel')) ft = 'super diesel';

    if (!totals[ft]) totals[ft] = { volume: 0, cost: 0, count: 0 }
    totals[ft].volume += Number(l.liters) || 0
    totals[ft].cost   += Number(l.totalCost) || 0
    totals[ft].count  += 1
  })

  const slices = FUEL_META
    .map(m => ({ ...m, volume: totals[m.key]?.volume || 0, cost: totals[m.key]?.cost || 0, count: totals[m.key]?.count || 0 }))
    .filter(s => (view === 'volume' ? s.volume : s.cost) > 0)
    .sort((a, b) => (view === 'volume' ? b.volume - a.volume : b.cost - a.cost))

  const totalVal = slices.reduce((s, sl) => s + (view === 'volume' ? sl.volume : sl.cost), 0)

  if (slices.length === 0) return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub, fontSize: '0.82rem' }}>No data</div>
  )

  // Build SVG donut arcs
  const CX = 100, CY = 100, R = 85, IR = 55
  let cumAngle = -Math.PI / 2
  const arcSlices = slices.map((sl, i) => {
    const val = view === 'volume' ? sl.volume : sl.cost
    const frac = totalVal > 0 ? val / totalVal : 0
    const sweep = frac * 2 * Math.PI
    const startA = cumAngle
    cumAngle += sweep
    const endA = cumAngle
    const gap = 0.025
    const s1 = startA + gap, e1 = endA - gap
    const large = e1 - s1 > Math.PI ? 1 : 0
    const ox = (r, a) => CX + r * Math.cos(a)
    const oy = (r, a) => CY + r * Math.sin(a)
    const isActive = activeIdx === i
    const scale = isActive ? 1.045 : 1
    const midA = (s1 + e1) / 2
    const tx = CX + (Math.cos(midA) * (isActive ? 6 : 0))
    const ty = CY + (Math.sin(midA) * (isActive ? 6 : 0))
    const path = e1 <= s1 ? null : [
      `M ${ox(IR, s1)} ${oy(IR, s1)}`,
      `A ${IR} ${IR} 0 ${large} 1 ${ox(IR, e1)} ${oy(IR, e1)}`,
      `L ${ox(R, e1)} ${oy(R, e1)}`,
      `A ${R} ${R} 0 ${large} 0 ${ox(R, s1)} ${oy(R, s1)}`,
      'Z'
    ].join(' ')
    return { ...sl, path, frac, isActive, tx, ty, midA }
  })

  const active = activeIdx != null ? arcSlices[activeIdx] : null
  const fmtVal = (v) => view === 'volume'
    ? `${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(1)} L`
    : `LKR ${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v).toLocaleString()}`
  const fmtCenter = (v) => view === 'volume'
    ? Math.round(v).toLocaleString() + ' L'
    : 'Rs. ' + Math.round(v).toLocaleString()

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['volume', 'By Volume'], ['cost', 'By Cost']].map(([v, label]) => (
          <button key={v} onClick={() => { setView(v); setActiveIdx(null) }} style={{
            padding: '4px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.15s',
            background: view === v ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.05)',
            color: view === v ? '#60a5fa' : D.textSub,
          }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* SVG donut */}
        <svg viewBox="0 0 200 200" style={{ width: 200, minWidth: 200, height: 200, overflow: 'visible', flexShrink: 0 }}>
          {arcSlices.map((sl, i) => sl.path && (
            <path
              key={sl.key}
              d={sl.path}
              fill={sl.color}
              opacity={activeIdx == null || sl.isActive ? 1 : 0.35}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s, transform 0.2s', transformOrigin: `${CX}px ${CY}px`, transform: sl.isActive ? 'scale(1.045)' : 'scale(1)' }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
            />
          ))}
          {/* Center label */}
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={D.textSub} letterSpacing="0.05em">
            {active ? `${active.label.toUpperCase()} ${view.toUpperCase()}` : `TOTAL ${view.toUpperCase()}`}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="14.5" fontWeight="900" fill={active ? active.color : D.text}>
            {active ? fmtCenter(view === 'volume' ? active.volume : active.cost) : fmtCenter(totalVal)}
          </text>
        </svg>
        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {arcSlices.map((sl, i) => {
            const val = view === 'volume' ? sl.volume : sl.cost
            const pct = totalVal > 0 ? (val / totalVal) * 100 : 0
            return (
              <div key={sl.key}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                style={{ cursor: 'pointer', opacity: activeIdx == null || activeIdx === i ? 1 : 0.45, transition: 'opacity 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: sl.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: D.text }}>{sl.label}</span>
                    <span style={{ fontSize: '0.67rem', color: D.textSub }}>{sl.count} log{sl.count !== 1 ? 's' : ''}</span>
                  </div>
                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: sl.color }}>{fmtVal(val)}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: sl.color, borderRadius: 999, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const FuelAnalysisPage = () => {
  const D = useD()
  const isDark = D.bg === '#060b18' || D.bg === '#080d1a'
  const navigate = useNavigate()
  const { user, isAdmin, isController, isDriver } = useAuth()
  const [period, setPeriod] = useState('6M')
  const [costPeriod, setCostPeriod] = useState('ALL')
  const [liveTime, setLiveTime] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimeoutRef = useRef(null)

  const [summary, setSummary] = useState({ totalDiesel: 0, totalPetrol: 0, totalVolume: 0, totalCost: 0, logCount: 0 })
  const [chartData, setChartData] = useState({ months: [], data: { Diesel: [], Petrol: [] } })
  const [vehicleStats, setVehicleStats] = useState([])
  const [myVehicleLogs, setMyVehicleLogs] = useState([])
  const [allFuelLogs, setAllFuelLogs] = useState([])
  const [deletedFuelLogs, setDeletedFuelLogs] = useState([])
  const [activeTab, setActiveTab] = useState('audit')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')
  const [filterFuelType, setFilterFuelType] = useState('all')
  const [filterAuditStatus, setFilterAuditStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Live clock
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    setLiveTime(fmt())
    const t = setInterval(() => setLiveTime(fmt()), 30000)
    return () => clearInterval(t)
  }, [])

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)

      if (isAdmin || isController) {
        // -- Admin/Controller: compute everything locally from raw logs --
        const [allLogsRes, vehiclesRes] = await Promise.all([
          fuelAPI.getAllFuelLogs().catch(err => {
            console.error('Failed to load fuel logs:', err);
            return { data: { data: [] } };
          }),
          vehicleAPI.getAllVehicles().catch(err => {
            console.error('Failed to load vehicles:', err);
            return { data: { data: [] } };
          }),
        ])
        const rawLogs = allLogsRes.data.data || []
        const vehicles = vehiclesRes.data.data || []

        if (isAdmin) {
          try {
            const deletedRes = await fuelAPI.getDeletedLogs()
            setDeletedFuelLogs((deletedRes.data.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)))
          } catch (err) {
            console.error("Failed to fetch deleted logs:", err)
          }
        }

        const activeLogs = rawLogs.filter(l => !l.isDeleted)

        // Calculate efficiency client-side — pass vehicles so first log gets a baseline
        computeLogsEfficiency(activeLogs, vehicles)

        // Sort for display table (newest first)
        setAllFuelLogs([...activeLogs].sort((a, b) => new Date(b.date) - new Date(a.date)))

        // -- Summary KPIs (all-time totals, same as FuelManagementPage) --
        const curYear = new Date().getFullYear()

        const totalDiesel = activeLogs.filter(l => {
          const ft = (l.fuelType || '').toLowerCase();
          return ft === 'diesel' || ft === 'super diesel' || ft.includes('diesel');
        }).reduce((s, l) => s + (l.liters || 0), 0)

        const totalPetrol = activeLogs.filter(l => {
          const ft = (l.fuelType || '').toLowerCase();
          return ft === 'petrol' || ft === 'super petrol' || ft.includes('petrol');
        }).reduce((s, l) => s + (l.liters || 0), 0)
        const totalVolume = totalDiesel + totalPetrol
        const totalCost = activeLogs.reduce((s, l) => s + (l.totalCost || 0), 0)

        setSummary({ totalDiesel, totalPetrol, totalVolume, totalCost, logCount: activeLogs.length })

        // -- Monthly Chart (current year) ------------------------------
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
        const dieselArr = Array(12).fill(0)
        const petrolArr = Array(12).fill(0)

        activeLogs.forEach(l => {
          const d = new Date(l.date)
          if (d.getFullYear() !== curYear) return
          const m = d.getMonth()
          const ft = (l.fuelType || '').toLowerCase()
          // Merge super-variants and Sri Lankan types into base types for the chart
          if (ft === 'diesel' || ft === 'super diesel' || ft.includes('diesel')) dieselArr[m] += (l.liters || 0)
          else if (ft === 'petrol' || ft === 'super petrol' || ft.includes('petrol')) petrolArr[m] += (l.liters || 0)
          // Electric logs (liters=0) are excluded automatically
        })

        setChartData({ months, data: { Diesel: dieselArr, Petrol: petrolArr } })

        // -- Per-vehicle stats -----------------------------------------
        const vehicleMap = {}
        activeLogs.forEach(l => {
          if (!vehicleMap[l.vehicleRegNumber]) {
            vehicleMap[l.vehicleRegNumber] = { logs: [], totalSpending: 0 }
          }
          vehicleMap[l.vehicleRegNumber].logs.push(l)
          vehicleMap[l.vehicleRegNumber].totalSpending += (l.totalCost || 0)
        })

        const statsArr = Object.entries(vehicleMap).map(([reg, { logs, totalSpending }]) => {
          // Use the per-log fuelEfficiency values already set by computeLogsEfficiency.
          // Average all valid (non-null, positive) readings for this vehicle so that
          // even vehicles with a single log show a real value instead of N/A.
          const validEffs = logs
            .map(l => l.fuelEfficiency)
            .filter(e => e != null && e > 0)
          const fuelEfficiency = validEffs.length > 0
            ? Math.round((validEffs.reduce((s, e) => s + e, 0) / validEffs.length) * 100) / 100
            : null
          const efficiencyStatus = fuelEfficiency == null ? 'Insufficient Data'
            : fuelEfficiency < 5 ? 'Poor'
              : fuelEfficiency < 10 ? 'Good'
                : 'Excellent'
          return { vehicleRegNumber: reg, fuelEfficiency, totalSpending, efficiencyStatus }
        })

        setVehicleStats(statsArr)

      } else if (isDriver) {
        // -- Driver: use own-scoped summary + chart + logs + vehicles for baseline --
        const [summaryRes, chartRes, logsRes, vehiclesRes] = await Promise.all([
          fuelAPI.getSummary().catch(err => {
            console.error('Failed to load fuel summary:', err);
            return { data: { data: null } };
          }),
          fuelAPI.getChartData().catch(err => {
            console.error('Failed to load fuel chart data:', err);
            return { data: { data: null } };
          }),
          fuelAPI.getMyLogs().catch(err => {
            console.error('Failed to load driver fuel logs:', err);
            return { data: { data: [] } };
          }),
          vehicleAPI.getAllVehicles().catch(err => {
            console.error('Failed to load vehicles:', err);
            return { data: { data: [] } };
          }),
        ])
        setSummary(summaryRes?.data?.data || { totalDiesel: 0, totalPetrol: 0, totalVolume: 0, totalCost: 0 })
        setChartData(chartRes?.data?.data || { months: [], data: { Diesel: [], Petrol: [] } })
        const driverLogs = logsRes.data.data || []
        const vehicles = vehiclesRes.data.data || []
        computeLogsEfficiency(driverLogs, vehicles)
        setMyVehicleLogs(driverLogs)
      }

    } catch (err) { console.error('Error loading fuel data:', err) }
    finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [isAdmin, isController, isDriver])

  // Initial load + re-load on refreshKey change
  useEffect(() => {
    loadData(refreshKey > 0) // silent refresh after first load
  }, [loadData, refreshKey])

  // Auto-poll every 30 seconds (admin/controller only)
  useEffect(() => {
    if (!isAdmin && !isController) return
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [isAdmin, isController])

  const handleManualRefresh = () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
  }

  // Refresh when user switches back to this tab (e.g. after adding/removing on FuelManagementPage)
  useEffect(() => {
    if (!isAdmin && !isController) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setRefreshKey(k => k + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAdmin, isController])



  const getFilteredLogs = () => {
    let baseLogs = []
    if (isAdmin && activeTab === 'deleted') {
      baseLogs = deletedFuelLogs
    } else {
      baseLogs = allFuelLogs
    }

    return baseLogs.filter(log => {
      if (filterVehicle !== 'all' && log.vehicleRegNumber !== filterVehicle) return false
      if (filterDriver !== 'all') {
        const drv = log.driverUsername || log.uploadedBy || ''
        if (drv !== filterDriver) return false
      }
      if (filterFuelType !== 'all') {
        const ft = (log.fuelType || '').toLowerCase();
        const filterFt = filterFuelType.toLowerCase();
        let match = false;
        if (filterFt === 'petrol 92 octane') match = (ft === 'petrol 92 octane' || ft === 'petrol');
        else if (filterFt === 'petrol 95 octane') match = (ft === 'petrol 95 octane' || ft === 'super petrol');
        else if (filterFt === 'auto diesel') match = (ft === 'auto diesel' || ft === 'diesel');
        else if (filterFt === 'super diesel') match = (ft === 'super diesel');
        else match = (ft === filterFt);
        if (!match) return false;
      }
      if (filterAuditStatus === 'edited' && !log.isUpdated) return false
      if (filterAuditStatus === 'original' && log.isUpdated) return false
      return true
    })
  }

  const displayLogs = getFilteredLogs()

  // Unique vehicles and drivers from the active log source for dropdowns
  const activeLogSource = (isAdmin && activeTab === 'deleted') ? deletedFuelLogs : allFuelLogs
  const uniqueVehiclesInLogs = [...new Set(activeLogSource.map(l => l.vehicleRegNumber).filter(Boolean))]
  const uniqueDriversInLogs = [...new Set(
    activeLogSource.map(l => l.driverUsername || l.uploadedBy).filter(Boolean)
  )]

  /* chart helpers */
  const monthlyData = (chartData.months || []).map((month, i) => ({
    month, Diesel: chartData.data?.Diesel?.[i] || 0, Petrol: chartData.data?.Petrol?.[i] || 0,
  }))
  const highlightCount = period === '3M' ? 3 : period === '6M' ? 6 : 12
  const maxVal = Math.max(...(chartData.data?.Diesel || [0]), ...(chartData.data?.Petrol || [0]), 1)

  /* efficiency trend — monthly average km/L from all active logs (uses backend-stored fuelEfficiency) */
  const effTrendData = (() => {
    const monthMap = {}
    const targetLogs = (isAdmin || isController) ? allFuelLogs : myVehicleLogs
    targetLogs.forEach(l => {
      if (!l.fuelEfficiency || l.fuelEfficiency <= 0) return
      // Parse ISO date string as local date to avoid UTC timezone off-by-one issues
      const [year, month] = (l.date || '').split('-').map(Number)
      if (!year || !month) return
      const key = `${year}-${String(month).padStart(2, '0')}`
      const label = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' })
      if (!monthMap[key]) monthMap[key] = { sum: 0, count: 0, label }
      monthMap[key].sum += l.fuelEfficiency
      monthMap[key].count += 1
    })
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // last 12 months
      .map(([, { sum, count, label }]) => ({ value: Math.round((sum / count) * 100) / 100, label }))
  })()
  const effTrend = effTrendData.map(d => d.value)
  const maxEff = Math.max(...effTrend, 1)
  // Use a floor slightly below the minimum value so the chart isn't flat at the top
  const minEff = effTrend.length > 0 ? Math.max(0, Math.min(...effTrend) - 1) : 0



  /* ── Cost period filter & derived stats ────────────────────────────────── */
  const costCutoff = (() => {
    if (costPeriod === 'ALL') return null
    const d = new Date()
    if (costPeriod === '3M') d.setMonth(d.getMonth() - 3)
    else if (costPeriod === '6M') d.setMonth(d.getMonth() - 6)
    else if (costPeriod === '12M') d.setFullYear(d.getFullYear() - 1)
    return d
  })()
  const costFilteredLogs = costCutoff
    ? allFuelLogs.filter(l => new Date(l.date) >= costCutoff)
    : allFuelLogs

  /* Vehicle spending filtered by selected period */
  const filteredVehicleSpendMap = {}
  costFilteredLogs.forEach(l => {
    if (!filteredVehicleSpendMap[l.vehicleRegNumber]) filteredVehicleSpendMap[l.vehicleRegNumber] = 0
    filteredVehicleSpendMap[l.vehicleRegNumber] += l.totalCost || 0
  })
  const filteredSpendStats = Object.entries(filteredVehicleSpendMap)
    .map(([reg, totalSpending]) => ({ vehicleRegNumber: reg, totalSpending }))
    .sort((a, b) => b.totalSpending - a.totalSpending)
  const maxFilteredSpend = Math.max(...filteredSpendStats.map(v => v.totalSpending), 1)

  /* Driver performance ranking for selected period */
  const drvMap = {}
  costFilteredLogs.forEach(l => {
    const drv = l.driverUsername || l.uploadedBy || 'Unassigned'
    if (!drvMap[drv]) drvMap[drv] = { logs: [], totalCost: 0, totalLiters: 0 }
    drvMap[drv].logs.push(l)
    drvMap[drv].totalCost += l.totalCost || 0
    drvMap[drv].totalLiters += l.liters || 0
  })
  const driverRanking = Object.entries(drvMap)
    .map(([name, { logs, totalCost, totalLiters }]) => {
      const effLogs = logs.filter(l => l.fuelEfficiency && l.fuelEfficiency > 0)
      const avgEff = effLogs.length > 0
        ? effLogs.reduce((s, l) => s + l.fuelEfficiency, 0) / effLogs.length
        : null
      const status = avgEff == null ? 'N/A'
        : avgEff > 10 ? 'Excellent'
          : avgEff > 7 ? 'Good'
            : avgEff > 5 ? 'Average'
              : 'Poor'
      return { name, logCount: logs.length, totalCost, totalLiters, avgEff, status }
    })
    .sort((a, b) => (b.avgEff ?? -Infinity) - (a.avgEff ?? -Infinity))

  const hBarColor = status => ({
    Excellent: D.green, Good: D.blue, Average: D.gold, Poor: D.red,
  }[status] || D.textSub)

  /* loading */
  if (loading) return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Analysis" subtitle="Home / Fuel Analysis" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', border: '4px solid rgba(37, 99, 235,0.2)', borderTopColor: '#60a5fa', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: D.textSub, fontWeight: 600 }}>Loading fuel analytics...</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Analysis" subtitle="Home / Fuel Analysis" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ padding: '24px 28px' }}>



          {/* Hero Banner — admin/controller variant */}
          {(isAdmin || isController) ? (
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)',
              borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px var(--primary-glow), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 16px 48px rgba(0,0,0,0.15), 0 8px 32px var(--primary-glow)',
              border: '1px solid var(--border-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
            }}>
              {/* Neon radial glow for dark */}
              {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
              {/* Decorative blobs */}
              <div style={{ position: 'absolute', top: '-30px', right: '10%', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '-40px', right: '30%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.01)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '20%', left: '60%', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.01)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      Fuel &amp; Analysis, {user?.firstName || user?.username || (isAdmin ? 'Admin' : 'Controller')}!
                    </h1>
                    <span style={{ background: 'var(--primary-light)', border: '1px solid var(--border)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Consumption Insights
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#f8fafc', fontSize: '0.875rem', fontWeight: 500 }}>
                    Track fuel spend, efficiency and consumption patterns across every vehicle.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Live · {liveTime}</span>
                  </div>
                </div>
              </div>




            </div>
          ) : (
            /* Driver hero banner (updated to premium style) */
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)',
              borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px var(--primary-glow), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 16px 48px rgba(0,0,0,0.15), 0 8px 32px var(--primary-glow)',
              border: '1px solid var(--border-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
            }}>
              {/* Neon radial glow for dark */}
              {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
              {/* Decorative blobs */}
              <div style={{ position: 'absolute', top: '-30px', right: '10%', width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '-40px', right: '30%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(6,182,212,0.07)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '20%', left: '60%', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      Fuel &amp; Analysis, {user?.firstName || user?.username || 'Driver'}!
                    </h1>
                    <span style={{ background: 'var(--primary-light)', border: '1px solid var(--border)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      My Vehicle Insights
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#f8fafc', fontSize: '0.875rem', fontWeight: 500 }}>
                    Track your fuel fills, efficiency and mileage history.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Live · {liveTime}</span>
                  </div>
                </div>
              </div>

              {/* Right: Add Fuel Log button */}
              {isDriver && (
                <button
                  onClick={() => navigate('/fuel-log')}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 26px', borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.95)', color: '#1e3a8a', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(255,255,255,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)' }}
                >
                  <Plus size={18} strokeWidth={3} /> Add Fuel Log
                </button>
              )}
            </div>
          )}

          {/* -
              DASHBOARD
          - */}
          <>
            {/* ── Admin / Controller: Fuel Overview KPI cards (new design) ── */}
            {(isAdmin || isController) && (() => {
              const totalSpend = summary.totalCost
              const litersUsed = summary.totalVolume
              const avgEff = (() => {
                const effLogs = allFuelLogs.filter(l => l.fuelEfficiency && l.fuelEfficiency > 0)
                if (!effLogs.length) return null
                return effLogs.reduce((s, l) => s + l.fuelEfficiency, 0) / effLogs.length
              })()
              const avgCostPerLiter = litersUsed > 0 ? totalSpend / litersUsed : 0

              const kpiCards = [
                {
                  label: 'TOTAL SPEND',
                  value: `LKR ${Math.round(totalSpend).toLocaleString()}`,
                  sub: 'Recent fill-ups',
                  icon: <DollarSign size={20} />,
                  iconBg: 'rgba(59,130,246,0.15)',
                  iconColor: '#60a5fa',
                  trend: '+4.6%',
                  trendUp: true,
                  filterFuel: 'all', filterStatus: 'all'
                },
                {
                  label: 'LITERS USED',
                  value: `${Math.round(litersUsed).toLocaleString()} L`,
                  sub: 'Across fleet',
                  icon: <Droplets size={20} />,
                  iconBg: 'rgba(6,182,212,0.15)',
                  iconColor: '#22d3ee',
                  trend: '+2.1%',
                  trendUp: true,
                  filterFuel: 'all', filterStatus: 'all'
                },
                {
                  label: 'AVG EFFICIENCY',
                  value: avgEff != null ? `${avgEff.toFixed(1)} km/L` : '—',
                  sub: 'Fleet average',
                  icon: <Activity size={20} />,
                  iconBg: 'rgba(16,185,129,0.15)',
                  iconColor: '#34d399',
                  trend: '+1.2%',
                  trendUp: true,
                  filterFuel: 'all', filterStatus: 'all'
                },
                {
                  label: 'COST / LITER',
                  value: `LKR ${Math.round(avgCostPerLiter).toLocaleString()}`,
                  sub: 'Blended rate',
                  icon: <Zap size={20} />,
                  iconBg: 'rgba(245,158,11,0.15)',
                  iconColor: '#fbbf24',
                  trend: '-0.8%',
                  trendUp: false,
                  filterFuel: 'all', filterStatus: 'all'
                },
              ]

              return (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fuel Overview</h2>
                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>This period's fuel performance</p>
                  </div>
                  <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {kpiCards.map(s => (
                      <div key={s.label}
                        onClick={() => { setFilterFuelType(s.filterFuel); setFilterAuditStatus(s.filterStatus); setActiveTab('audit'); document.getElementById('audit-view')?.scrollIntoView({ behavior: 'smooth' }) }}
                        style={{ ...card(D), padding: '20px 22px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', position: 'relative', overflow: 'hidden' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = s.iconColor + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${s.iconColor}18` }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.iconColor}25`, flexShrink: 0 }}>
                            {s.icon}
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: s.trendUp ? '#4ade80' : '#f87171', background: s.trendUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '3px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3 }}>
                            {s.trendUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{s.trend}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: D.textSub, letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.1, marginBottom: 4 }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Driver: upgraded KPI cards (premium design) ── */}
            {isDriver && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fuel Overview</h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>Your vehicle's fuel performance</p>
                </div>
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    {
                      label: 'TOTAL DIESEL',
                      value: `${Math.round(summary.totalDiesel).toLocaleString()} L`,
                      sub: 'Diesel logs',
                      icon: <Fuel size={20} />,
                      iconBg: 'rgba(99,102,241,0.15)',
                      iconColor: D.indigo,
                    },
                    {
                      label: 'TOTAL PETROL',
                      value: `${Math.round(summary.totalPetrol).toLocaleString()} L`,
                      sub: 'Petrol logs',
                      icon: <Fuel size={20} />,
                      iconBg: 'rgba(245,158,11,0.15)',
                      iconColor: D.gold,
                    },
                    {
                      label: 'TOTAL VOLUME',
                      value: `${Math.round(summary.totalVolume).toLocaleString()} L`,
                      sub: `Logs count: ${summary.logCount || 0}`,
                      icon: <Droplets size={20} />,
                      iconBg: 'rgba(6,182,212,0.15)',
                      iconColor: '#22d3ee',
                    },
                    {
                      label: 'TOTAL SPEND',
                      value: `LKR ${Math.round(summary.totalCost).toLocaleString()}`,
                      sub: 'Total fuel cost',
                      icon: <DollarSign size={20} />,
                      iconBg: 'rgba(16,185,129,0.15)',
                      iconColor: D.green,
                    },
                  ].map(s => (
                    <div key={s.label}
                      style={{ ...card(D), padding: '20px 22px', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', position: 'relative', overflow: 'hidden' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = s.iconColor + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${s.iconColor}18` }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.iconColor}25`, flexShrink: 0 }}>
                          {s.icon}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: D.textSub, letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.1, marginBottom: 4 }}>{s.value}</div>
                      <div style={{ fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* ── Admin: Fuel Cost Trend + Usage by Vehicle ── */}
            {(isAdmin || isController) && (
              <div className="fuel-analysis-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 20 }}>

                {/* Fuel Consumption Chart */}
                <div style={{ ...card(D) }}>
                  <FleetFuelConsumptionChart logs={allFuelLogs} D={D} isDark={isDark} />
                </div>

                {/* Fuel Type Distribution */}
                <div style={{ ...card(D), padding: '22px 24px' }}>
                  <div style={{ marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fuel Type Distribution</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: D.textSub }}>Fleet-wide breakdown by volume &amp; spend</p>
                  </div>
                  <FuelTypeDonutChart logs={allFuelLogs} D={D} />
                </div>
              </div>
            )}

            {/* ── Admin: Recent Fuel Logs table ── */}
            {(isAdmin || isController) && allFuelLogs.length > 0 && (() => {
              const recentLogs = allFuelLogs.slice(0, 10)
              const colStyle = (w) => ({ padding: '13px 14px', fontSize: '0.82rem', color: D.text, fontWeight: 600, width: w, whiteSpace: 'nowrap' })
              const hStyle = { padding: '10px 14px', fontSize: '0.67rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, textAlign: 'left' }
              return (
                <div style={{ ...card(D), padding: 0, marginBottom: 20 }}>
                  <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${D.border}` }}>
                    <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Recent Fuel Logs</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: D.textSub }}>Latest fill-ups across the fleet</p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['DATE', 'VEHICLE', 'DRIVER', 'LITERS', 'COST', 'KM/L'].map(h => (
                            <th key={h} style={hStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentLogs.map((log, i) => {
                          const eff = log.fuelEfficiency
                          const effColor = eff == null ? D.textSub : eff > 10 ? '#4ade80' : eff > 7 ? '#60a5fa' : eff > 5 ? '#fbbf24' : '#f87171'
                          const station = log.station || log.fuelStation || '—'
                          return (
                            <tr key={log.id || i}
                              style={{ borderBottom: `1px solid ${D.border}`, transition: 'background 0.15s', cursor: 'default' }}
                              onMouseEnter={e => e.currentTarget.style.background = D.surfaceHi}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ ...colStyle('110px'), color: D.textSub }}>
                                {new Date(log.date).toLocaleDateString('en-CA')}
                              </td>
                              <td style={{ ...colStyle('130px') }}>
                                <span style={{ color: '#60a5fa', fontWeight: 800 }}>{log.vehicleRegNumber}</span>
                              </td>
                              <td style={{ ...colStyle('130px'), color: D.text }}>
                                {log.driverUsername || log.uploadedBy || '—'}
                              </td>
                              <td style={{ ...colStyle('80px'), color: D.text }}>
                                {log.liters != null ? log.liters.toFixed(1) : '—'} L
                              </td>
                              <td style={{ ...colStyle('120px'), color: D.green, fontWeight: 800 }}>
                                LKR {Math.round(log.totalCost || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '13px 14px', width: '70px' }}>
                                {eff != null ? (
                                  <span style={{ background: effColor + '18', color: effColor, border: `1px solid ${effColor}40`, padding: '3px 9px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}>
                                    {eff.toFixed(1)}
                                  </span>
                                ) : <span style={{ color: D.textSub, fontSize: '0.78rem' }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {/* ── Driver/both: Monthly Consumption + Efficiency Trend ── */}
            {isDriver && (
              <div className="fuel-analysis-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

                {/* Monthly Consumption Bar Chart */}
                <div style={{ ...card(D), padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Monthly Fuel Consumption</h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>Litres consumed per month</p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['3M', '6M', '12M'].map(p => (
                        <button key={p} onClick={() => setPeriod(p)} style={{
                          padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                          fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.15s',
                          background: period === p ? 'rgba(59, 130, 246,0.25)' : 'transparent',
                          color: period === p ? D.indigo : D.textSub,
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <BarChart data={monthlyData} maxVal={maxVal} highlightCount={highlightCount} D={D} />
                  <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
                    {[['Auto Diesel', 'url(#barD)', '#3b82f6'], ['Petrol 92 Octane', 'url(#barP)', '#fbbf24']].map(([n, , c]) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{n}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fuel Efficiency Trend (monthly average line chart) */}
                <div style={{ ...card(D), padding: '22px 24px' }}>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fuel Efficiency Trend</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>Monthly avg km/L across fleet · last 12 months</p>
                  </div>
                  {effTrend.length === 0 ? (
                    <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: 8, opacity: 0.3, display: 'flex', justifyContent: 'center' }}><TrendingUp size={40} /></div>
                        <p style={{ fontSize: '0.8rem' }}>No efficiency data yet</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <LineChart data={effTrend} maxVal={maxEff} minVal={minEff} D={D} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingLeft: 10, paddingRight: 10 }}>
                        {effTrendData.map((d, i) => (
                          <span key={i} style={{ fontSize: '0.6rem', color: D.textFaint, fontWeight: 600 }}>{d.label}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 20, marginTop: 10, paddingTop: 12, borderTop: `1px solid ${D.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>
                          <div style={{ width: 20, height: 2, background: D.teal, borderRadius: 999 }} />Monthly avg km/L
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: D.textSub }}>
                          Avg: <span style={{ color: D.teal, fontWeight: 700 }}>{effTrend.length > 0 ? (effTrend.reduce((a, b) => a + b, 0) / effTrend.length).toFixed(2) : '-'} km/L</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* -- Vehicle Performance (horizontal bars) ------- */}
            {(isAdmin || isController) && vehicleStats.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

                {/* Efficiency H-bars */}
                <div style={{ ...card(D), padding: '22px 24px' }}>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Vehicle Fuel Efficiency</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>km per litre by vehicle</p>
                  </div>
                  {vehicleStats.slice(0, 8).map(v => (
                    <HBar key={v.vehicleRegNumber}
                      label={v.vehicleRegNumber}
                      value={v.fuelEfficiency || 0}
                      max={maxEff || 1}
                      color={hBarColor(v.efficiencyStatus)}
                      sub={v.fuelEfficiency != null ? `${v.fuelEfficiency.toFixed(2)} km/L` : 'N/A'}
                      D={D}
                    />
                  ))}
                </div>

                {/* Spending H-bars */}
                <div style={{ ...card(D), padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fleet Fuel Spending</h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>
                        {costPeriod === 'ALL' ? 'All-time LKR spent per vehicle' : `Last ${costPeriod} — LKR per vehicle`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['3M', '6M', '12M', 'ALL'].map(p => (
                        <button key={p} onClick={() => setCostPeriod(p)} style={{
                          padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                          fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.15s',
                          background: costPeriod === p ? 'rgba(59, 130, 246,0.25)' : 'transparent',
                          color: costPeriod === p ? D.indigo : D.textSub,
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  {filteredSpendStats.length === 0 ? (
                    <div style={{ padding: '28px 0', textAlign: 'center', color: D.textSub, fontSize: '0.82rem', opacity: 0.6 }}>No data for selected period</div>
                  ) : filteredSpendStats.slice(0, 8).map((v, i) => (
                    <HBar key={v.vehicleRegNumber}
                      label={v.vehicleRegNumber}
                      value={v.totalSpending}
                      max={maxFilteredSpend}
                      color={[D.blue, D.indigo, D.teal, D.purple, D.green, D.gold][i % 6]}
                      sub={`Rs. ${Math.round(v.totalSpending).toLocaleString()}`}
                      D={D}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Driver Performance Ranking ─────────────────────────────────── */}
            {(isAdmin || isController) && driverRanking.length > 0 && (
              <div style={{ ...card(D), padding: 0, marginBottom: 20 }}>
                {/* Header */}
                <div style={{ padding: '22px 28px 18px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Driver Fuel Performance Ranking</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>
                      Ranked by average km/L · {costPeriod === 'ALL' ? 'All time' : `Last ${costPeriod}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['3M', '6M', '12M', 'ALL'].map(p => (
                      <button key={p} onClick={() => setCostPeriod(p)} style={{
                        padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                        fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.15s',
                        background: costPeriod === p ? 'rgba(59, 130, 246,0.25)' : 'transparent',
                        color: costPeriod === p ? D.indigo : D.textSub,
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
                {/* Ranked list */}
                <div style={{ padding: '20px 28px 28px' }}>
                  {driverRanking.map((drv, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                    const effColor = drv.status === 'Excellent' ? D.green
                      : drv.status === 'Good' ? D.blue
                        : drv.status === 'Average' ? D.gold
                          : drv.status === 'Poor' ? D.red
                            : D.textSub
                    const effBg = drv.status === 'Excellent' ? D.greenDim
                      : drv.status === 'Good' ? D.blueDim
                        : drv.status === 'Average' ? D.goldDim
                          : drv.status === 'Poor' ? D.redDim
                            : 'rgba(255,255,255,0.04)'
                    return (
                      <div key={drv.name} style={{
                        display: 'flex', alignItems: 'center', gap: 20,
                        padding: '13px 18px', borderRadius: 16, marginBottom: 10,
                        background: idx < 3 ? `${effColor}08` : D.surfaceHi,
                        border: `1px solid ${idx < 3 ? effColor + '28' : D.border}`,
                        transition: 'all 0.2s ease',
                        animation: `fadeUp 0.4s ease ${idx * 0.06}s both`,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${effColor}15` }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}
                      >
                        {/* Rank */}
                        <div style={{ width: 36, flexShrink: 0, textAlign: 'center' }}>
                          {medal
                            ? <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{medal}</span>
                            : <span style={{ fontSize: '0.88rem', fontWeight: 900, color: D.textSub, opacity: 0.45 }}>#{idx + 1}</span>
                          }
                        </div>
                        {/* Driver name + stats */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {drv.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: D.textSub, marginTop: 3 }}>
                            {drv.logCount} log{drv.logCount !== 1 ? 's' : ''} · {drv.totalLiters.toFixed(1)} L consumed
                          </div>
                        </div>
                        {/* Total cost */}
                        <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total Cost</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: D.green }}>Rs. {Math.round(drv.totalCost).toLocaleString()}</div>
                        </div>
                        {/* Efficiency badge */}
                        <div style={{ flexShrink: 0 }}>
                          <div style={{
                            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                            padding: '8px 18px', borderRadius: 12, background: effBg,
                            border: `1px solid ${effColor}35`,
                          }}>
                            <span style={{ fontSize: '1.08rem', fontWeight: 900, color: effColor, lineHeight: 1 }}>
                              {drv.avgEff != null ? drv.avgEff.toFixed(2) : '—'}
                            </span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: effColor, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.8, marginTop: 2 }}>
                              {drv.avgEff != null ? 'km/L' : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* -- Driver: My Fuel History (premium table) --------- */}
            {isDriver && (
              <div style={{ ...card(D), padding: 0, marginBottom: 20 }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${D.border}` }}>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>My Fuel History</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: D.textSub }}>Recent fuel logs for your vehicle</p>
                </div>
                <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                  {myVehicleLogs.length === 0 ? (
                    <div style={{ padding: '80px 0', textAlign: 'center' }}>
                      <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                        <Fuel size={36} opacity={0.3} />
                      </div>
                      <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>No fuel logs yet</h3>
                      <p style={{ margin: '10px 0 0', color: D.textSub, fontSize: '1rem', fontWeight: 500 }}>Click "+ Add Fuel Log" above to add your first entry.</p>
                    </div>
                  ) : (() => {
                    const colStyle = (w) => ({ padding: '13px 14px', fontSize: '0.82rem', color: D.text, fontWeight: 600, width: w, whiteSpace: 'nowrap' })
                    const hStyle = { padding: '10px 14px', fontSize: '0.67rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi }
                    return (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['DATE', 'FUEL GRADE', 'VOLUME', 'UNIT PRICE', 'TOTAL COST', 'ODOMETER', 'EFFICIENCY'].map(h => (
                                <th key={h} style={hStyle}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {myVehicleLogs.map((log, i) => {
                              const eff = log.fuelEfficiency
                              const effColor = eff == null ? D.textSub : eff > 10 ? '#4ade80' : eff > 7 ? '#60a5fa' : eff > 5 ? '#fbbf24' : '#f87171'
                              return (
                                <tr key={log.id || i}
                                  style={{ borderBottom: `1px solid ${D.border}`, transition: 'background 0.15s', cursor: 'default' }}
                                  onMouseEnter={e => e.currentTarget.style.background = D.surfaceHi}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <td style={{ ...colStyle('110px'), color: D.textSub }}>
                                    {new Date(log.date).toLocaleDateString('en-CA')}
                                  </td>
                                  <td style={{ ...colStyle('120px') }}>
                                    {(() => {
                                      const fb = fuelBadge(log.fuelType, D);
                                      return (
                                        <span style={{
                                          fontSize: '0.75rem', color: fb.color, fontWeight: 800, textTransform: 'uppercase',
                                          background: fb.bg, padding: '3px 10px', borderRadius: 6, border: `1px solid ${fb.color}30`
                                        }}>
                                          {formatFuelType(log.fuelType)}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td style={{ ...colStyle('100px'), color: D.text }}>
                                    {log.liters != null ? log.liters.toFixed(1) : '—'} L
                                  </td>
                                  <td style={{ ...colStyle('120px'), color: D.textSub }}>
                                    LKR {log.costPerLiter != null ? log.costPerLiter.toFixed(2) : '—'}
                                  </td>
                                  <td style={{ ...colStyle('140px'), color: D.green, fontWeight: 800 }}>
                                    LKR {Math.round(log.totalCost || 0).toLocaleString()}
                                  </td>
                                  <td style={{ ...colStyle('120px'), color: D.text }}>
                                    {log.mileage != null ? log.mileage.toLocaleString() : '—'} km
                                  </td>
                                  <td style={{ padding: '13px 14px', width: '90px' }}>
                                    {eff != null ? (
                                      <span style={{ background: effColor + '18', color: effColor, border: `1px solid ${effColor}40`, padding: '3px 9px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}>
                                        {eff.toFixed(1)} km/L
                                      </span>
                                    ) : <span style={{ color: D.textSub, fontSize: '0.78rem' }}>—</span>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* -- Admin/Controller: All Fuel Logs ------------ */}
            {(isAdmin || isController) && (
              <div id="audit-view" style={{ ...card(D), padding: 0 }}>
                <div style={{ padding: '28px 32px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '1.1rem' }}>All Fuel Logs - Audit View</h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: D.textSub }}>Complete log history with creator and editor info</p>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 16, border: `1px solid ${D.border}` }}>
                        <button onClick={() => setActiveTab('audit')} style={{ padding: '8px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s', background: activeTab === 'audit' ? D.surface : 'transparent', color: activeTab === 'audit' ? D.text : D.textSub, boxShadow: activeTab === 'audit' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none' }}>
                          Active Logs
                        </button>
                        <button onClick={() => setActiveTab('deleted')} style={{ padding: '8px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s', background: activeTab === 'deleted' ? D.surface : 'transparent', color: activeTab === 'deleted' ? D.red : D.textSub, boxShadow: activeTab === 'deleted' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none' }}>
                          Archived Vault
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filters Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

                    {/* Vehicle Dropdown */}
                    <div style={{ position: 'relative', minWidth: 180 }}>
                      <Car size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: D.blue, pointerEvents: 'none', opacity: 0.8 }} />
                      <select
                        value={filterVehicle}
                        onChange={e => { setFilterVehicle(e.target.value) }}
                        style={{ width: '100%', padding: '11px 32px 11px 36px', borderRadius: 12, border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem', color: D.text, background: D.inputBg, outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }}
                        onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 3px ${D.purpleDim}` }}
                        onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                      >
                        <option value="all">All Vehicles</option>
                        {uniqueVehiclesInLogs.map(reg => (
                          <option key={reg} value={reg}>{reg}</option>
                        ))}
                      </select>
                      <MoreVertical size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                    </div>

                    {/* Driver Dropdown */}
                    <div style={{ position: 'relative', minWidth: 180 }}>
                      <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: D.purple, pointerEvents: 'none', opacity: 0.8 }} />
                      <select
                        value={filterDriver}
                        onChange={e => { setFilterDriver(e.target.value) }}
                        style={{ width: '100%', padding: '11px 32px 11px 36px', borderRadius: 12, border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem', color: D.text, background: D.inputBg, outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }}
                        onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 3px ${D.purpleDim}` }}
                        onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                      >
                        <option value="all">All Drivers</option>
                        {uniqueDriversInLogs.map(drv => (
                          <option key={drv} value={drv}>{drv}</option>
                        ))}
                      </select>
                      <MoreVertical size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                    </div>

                    {/* Fuel Type Dropdown */}
                    <div style={{ position: 'relative', minWidth: 150 }}>
                      <Filter size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: D.textSub }} />
                      <select value={filterFuelType} onChange={e => setFilterFuelType(e.target.value)} style={{ width: '100%', padding: '11px 32px 11px 36px', borderRadius: 12, border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem', color: D.text, background: D.inputBg, outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }} onFocus={e => { e.target.style.borderColor = D.purple }} onBlur={e => { e.target.style.borderColor = D.inputBorder }}>
                        <option value="all" style={{ background: D.surface, color: D.text }}>All Fuels</option>
                        <option value="Petrol 92 Octane" style={{ background: D.surface, color: D.text }}>Petrol 92 Octane</option>
                        <option value="Petrol 95 Octane" style={{ background: D.surface, color: D.text }}>Petrol 95 Octane</option>
                        <option value="Auto Diesel" style={{ background: D.surface, color: D.text }}>Auto Diesel</option>
                        <option value="Super Diesel" style={{ background: D.surface, color: D.text }}>Super Diesel</option>
                      </select>
                      <MoreVertical size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                    </div>

                    {/* Status Dropdown */}
                    <div style={{ position: 'relative', minWidth: 150 }}>
                      <Filter size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: D.textSub }} />
                      <select value={filterAuditStatus} onChange={e => setFilterAuditStatus(e.target.value)} style={{ width: '100%', padding: '11px 32px 11px 36px', borderRadius: 12, border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem', color: D.text, background: D.inputBg, outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }} onFocus={e => { e.target.style.borderColor = D.purple }} onBlur={e => { e.target.style.borderColor = D.inputBorder }}>
                        <option value="all" style={{ background: D.surface, color: D.text }}>All Status</option>
                        <option value="original" style={{ background: D.surface, color: D.text }}>Original</option>
                        <option value="edited" style={{ background: D.surface, color: D.text }}>Edited</option>
                      </select>
                      <MoreVertical size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                    </div>

                    {/* Clear button */}
                    {(filterVehicle !== 'all' || filterDriver !== 'all' || filterFuelType !== 'all' || filterAuditStatus !== 'all') && (
                      <button
                        onClick={() => { setFilterVehicle('all'); setFilterDriver('all'); setFilterFuelType('all'); setFilterAuditStatus('all') }}
                        style={{ padding: '11px 16px', borderRadius: 12, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                      >
                        <X size={14} /> Clear
                      </button>
                    )}

                    <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: D.textSub, fontWeight: 700, background: D.surface, padding: '11px 16px', borderRadius: 12, border: `1px solid ${D.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      <span style={{ color: D.purple }}>{displayLogs.length}</span> Records
                    </div>
                  </div>
                </div>
                <div style={{ maxHeight: 600, overflowY: 'auto', padding: '24px 32px 40px' }}>
                  {displayLogs.length === 0 ? (
                    <div style={{ padding: '80px 0', textAlign: 'center' }}>
                      <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                        <Search size={36} opacity={0.3} />
                      </div>
                      <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>No matching logs found</h3>
                      <p style={{ margin: '10px 0 0', color: D.textSub, fontSize: '1rem', fontWeight: 500 }}>Try adjusting your search or filters.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                      {displayLogs.map((log, i) => {
                        const badge = log.fuelEfficiency ? (
                          log.fuelEfficiency >= 10 ? { label: 'Excellent', bg: D.greenDim, color: D.green, border: 'rgba(74,222,128,0.3)' } :
                            log.fuelEfficiency >= 7 ? { label: 'Good', bg: D.blueDim, color: D.blue, border: 'rgba(96,165,250,0.3)' } :
                              log.fuelEfficiency >= 5 ? { label: 'Average', bg: D.goldDim, color: D.gold, border: 'rgba(251,191,36,0.3)' } :
                                { label: 'Poor', bg: D.redDim, color: D.red, border: 'rgba(248,113,113,0.3)' }
                        ) : { label: 'N/A', bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border };

                        return (
                          <div key={log.id} style={{
                            background: D.surface, borderRadius: 20, border: `1px solid ${D.border}`,
                            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }} onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>

                            <div style={{ width: 130, flexShrink: 0 }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 950, color: D.blue, letterSpacing: '0.02em' }}>{log.vehicleRegNumber}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                {(() => { const fb = fuelBadge(log.fuelType, D); return <span style={{ fontSize: '0.72rem', color: fb.color, fontWeight: 800, textTransform: 'uppercase', background: fb.bg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${fb.color}30`, display: 'flex', alignItems: 'center', gap: 3 }}>{log.fuelType?.toUpperCase() === 'ELECTRIC' && <Zap size={9} />}{formatFuelType(log.fuelType)}</span> })()}
                              </div>
                            </div>

                            <div style={{ width: 150, flexShrink: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: D.text, fontWeight: 700 }}>
                                <Calendar size={16} color={D.textSub} strokeWidth={2.5} /> {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: D.textSub, marginTop: 6, fontWeight: 600 }}>
                                <User size={14} opacity={0.7} /> {log.uploadedBy || log.driverUsername || '-'}
                              </div>
                            </div>

                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 40 }}>
                              {log.fuelType?.toUpperCase() === 'ELECTRIC' ? (
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>⚡ Charging Cost</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.green }}>Rs. {Math.round(log.totalCost || 0).toLocaleString()}</div>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Volume</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{(log.liters || 0).toFixed(1)} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>L</span></div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mileage</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{(log.mileage || 0).toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>km</span></div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Cost</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: D.green }}>Rs. {Math.round(log.totalCost || 0).toLocaleString()}</div>
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Efficiency */}
                            <div style={{ width: 140, flexShrink: 0, padding: '0 16px', borderLeft: `1px solid ${D.border}` }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Efficiency</div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{badge.label}</span>
                                {log.fuelEfficiency != null && log.fuelEfficiency > 0 && (
                                  <span style={{ fontWeight: 950, fontSize: '0.85rem' }}>
                                    {Number(log.fuelEfficiency).toFixed(1)} <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>km/L</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ width: 140, flexShrink: 0, padding: '0 16px', borderLeft: `1px solid ${D.border}` }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Audit Status</div>
                              {log.isDeleted ? (
                                <div>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 800, color: D.red, marginBottom: 2 }}><X size={12} /> Deleted</div>
                                  <div style={{ fontSize: '0.7rem', color: D.textSub }}>By {log.deletedBy || '-'}</div>
                                </div>
                              ) : log.isUpdated ? (
                                <div>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 800, color: D.purple, marginBottom: 2 }}><Edit2 size={12} /> Edited</div>
                                  <div style={{ fontSize: '0.7rem', color: D.textSub }}>By {log.updatedBy}</div>
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 800, color: D.green }}><Check size={12} /> Original</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>

          {/* -
              DRIVER: ADD LOG MODAL
          - */}


        </div>
      </div>

      {/* -- Dark theme overrides for sidebar/topbar ----------- */}
      <style>{`
        .fuel-dark .topbar {
          background: #1c2541 !important;
          border-bottom-color: rgba(255,255,255,0.07) !important;
        }
        .fuel-dark .topbar-title { color: #f3f4f6 !important; }
        .fuel-dark .topbar-breadcrumb { color: #4b5563 !important; }
        .fuel-dark .topbar-user {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .fuel-dark .topbar-user:hover {
          background: rgba(37, 99, 235,0.15) !important;
          border-color: rgba(37, 99, 235,0.4) !important;
        }
        .fuel-dark .topbar-name { color: #f3f4f6 !important; }
        .fuel-dark .sidebar {
          background: #0e1933 !important;
          border-right-color: rgba(255,255,255,0.07) !important;
        }
        .fuel-dark .sidebar-header { border-bottom-color: rgba(255,255,255,0.07) !important; }
        .fuel-dark .sidebar-title { color: #f1f5f9 !important; }
        .fuel-dark .sidebar-subtitle { color: #4b5563 !important; }
        .fuel-dark .nav-section-label { color: #374151 !important; }
        .fuel-dark .nav-item { color: #9ca3af !important; }
        .fuel-dark .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: #d1d5db !important; }
        .fuel-dark .nav-item.active { background: rgba(37, 99, 235,0.18) !important; color: #60a5fa !important; }
        .fuel-dark .sidebar-divider { background: rgba(255,255,255,0.07) !important; }
        .fuel-dark .sidebar-logout-btn { color: rgba(255,255,255,0.4) !important; }
        .fuel-dark .sidebar-logout-btn:hover { color: #f87171 !important; }
        .fuel-dark .sidebar-user-card { background: rgba(255,255,255,0.03) !important; }
        .fuel-dark .sidebar-footer { border-top-color: rgba(255,255,255,0.07) !important; }
      `}</style>
    </div>
  )
}

export default FuelAnalysisPage
