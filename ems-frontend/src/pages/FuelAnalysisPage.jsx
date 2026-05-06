import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { fuelAPI } from '../services/api'
import { Fuel, CircleDollarSign, BarChart2, Check, X, TrendingUp, Edit2, Loader2, Plus, LayoutDashboard } from 'lucide-react'

/* ── Dark palette ───────────────────────────────────────────── */
const D = {
  bg:        '#0d1117',
  surface:   '#161b27',
  surfaceHi: '#1e2535',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.13)',
  text:      '#e2e8f0',
  textSub:   '#64748b',
  textFaint: '#374151',
  teal:      '#2dd4bf',
  tealDim:   'rgba(45,212,191,0.15)',
  blue:      '#60a5fa',
  blueDim:   'rgba(96,165,250,0.15)',
  purple:    '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.15)',
  gold:      '#fbbf24',
  goldDim:   'rgba(251,191,36,0.15)',
  green:     '#4ade80',
  greenDim:  'rgba(74,222,128,0.15)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.15)',
  indigo:    '#818cf8',
  indigoDim: 'rgba(129,140,248,0.15)',
}

const card = {
  background: D.surface,
  border: `1px solid ${D.border}`,
  borderRadius: 14,
  overflow: 'hidden',
}

/* ── Input style (driver form) ──────────────────────────────── */
const darkInput = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: D.text,
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
}

/* ── SVG Bar Chart ──────────────────────────────────────────── */
const BarChart = ({ data, maxVal }) => {
  if (!data.length) return (
    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.textSub }}>
      No data available
    </div>
  )
  const H = 160, W_BAR = 18, GAP = 6
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${data.length * (W_BAR * 2 + GAP + 20)} ${H + 32}`} style={{ minWidth: data.length * 52 }}>
        <defs>
          <linearGradient id="barD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
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
            x2="100%" y2={H - f * H}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = i * (W_BAR * 2 + GAP + 20) + 10
          const dH = maxVal > 0 ? Math.max((d.Diesel / maxVal) * H, d.Diesel > 0 ? 4 : 0) : 0
          const pH = maxVal > 0 ? Math.max((d.Petrol / maxVal) * H, d.Petrol > 0 ? 4 : 0) : 0
          return (
            <g key={d.month}>
              <rect x={x} y={H - dH} width={W_BAR} height={dH} rx={3} fill="url(#barD)">
                <title>Diesel: {d.Diesel.toFixed(1)} L</title>
              </rect>
              <rect x={x + W_BAR + 3} y={H - pH} width={W_BAR} height={pH} rx={3} fill="url(#barP)">
                <title>Petrol: {d.Petrol.toFixed(1)} L</title>
              </rect>
              <text x={x + W_BAR} y={H + 18} textAnchor="middle" fill={D.textSub} fontSize={10} fontWeight={600}>{d.month}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── SVG Line / Area Chart (efficiency trend) ───────────────── */
const LineChart = ({ data, maxVal, minVal }) => {
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
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0d1117" stroke="#2dd4bf" strokeWidth={2}>
          <title>{data[i].toFixed(2)} km/L</title>
        </circle>
      ))}
    </svg>
  )
}

/* ── Horizontal bar (vehicle stats) ────────────────────────── */
const HBar = ({ label, value, max, color, sub }) => {
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

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const FuelAnalysisPage = () => {
  const { user, isAdmin, isController, isDriver } = useAuth()
  const [period, setPeriod] = useState('6M')
  const [activeTab, setActiveTab] = useState('dashboard')

  const [summary, setSummary] = useState({ totalDiesel: 0, totalPetrol: 0, totalVolume: 0, totalCost: 0, logCount: 0 })
  const [chartData, setChartData] = useState({ months: [], data: { Diesel: [], Petrol: [] } })
  const [vehicleStats, setVehicleStats] = useState([])
  const [myVehicleLogs, setMyVehicleLogs] = useState([])
  const [allFuelLogs, setAllFuelLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    vehicleRegNumber: '', fuelType: 'Diesel', liters: '', costPerLiter: '', mileage: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        if (isAdmin || isController) {
          // ── Admin/Controller: compute everything locally from raw logs ──
          // This mirrors FuelManagementPage approach and avoids backend
          // analytics endpoints which have a NULL/false mismatch on is_deleted.
          const allLogsRes = await fuelAPI.getAllFuelLogs()
          const rawLogs = allLogsRes.data.data || []
          const activeLogs = rawLogs.filter(l => !l.isDeleted)

          // Sort for display table (newest first)
          setAllFuelLogs([...activeLogs].sort((a, b) => new Date(b.date) - new Date(a.date)))

          // ── Summary KPIs (all-time totals, same as FuelManagementPage) ──
          const curYear = new Date().getFullYear()

          const totalDiesel = activeLogs.filter(l => l.fuelType?.toLowerCase() === 'diesel').reduce((s, l) => s + (l.liters || 0), 0)
          const totalPetrol = activeLogs.filter(l => l.fuelType?.toLowerCase() === 'petrol').reduce((s, l) => s + (l.liters || 0), 0)
          const totalVolume = totalDiesel + totalPetrol
          const totalCost   = activeLogs.reduce((s, l) => s + (l.totalCost || 0), 0)

          setSummary({ totalDiesel, totalPetrol, totalVolume, totalCost, logCount: activeLogs.length })

          // ── Monthly Chart (current year) ──────────────────────────────
          const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
          const dieselArr = Array(12).fill(0)
          const petrolArr = Array(12).fill(0)

          activeLogs.forEach(l => {
            const d = new Date(l.date)
            if (d.getFullYear() !== curYear) return
            const m = d.getMonth()
            if (l.fuelType?.toLowerCase() === 'diesel') dieselArr[m] += (l.liters || 0)
            else if (l.fuelType?.toLowerCase() === 'petrol') petrolArr[m] += (l.liters || 0)
          })

          setChartData({ months, data: { Diesel: dieselArr, Petrol: petrolArr } })

          // ── Per-vehicle stats ─────────────────────────────────────────
          const vehicleMap = {}
          activeLogs.forEach(l => {
            if (!vehicleMap[l.vehicleRegNumber]) {
              vehicleMap[l.vehicleRegNumber] = { logs: [], totalSpending: 0 }
            }
            vehicleMap[l.vehicleRegNumber].logs.push(l)
            vehicleMap[l.vehicleRegNumber].totalSpending += (l.totalCost || 0)
          })

          const statsArr = Object.entries(vehicleMap).map(([reg, { logs, totalSpending }]) => {
            // Sort logs by date desc, efficiency = (latestMileage - prevMileage) / latestLiters
            const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))
            let fuelEfficiency = null
            if (sorted.length >= 2) {
              const diff = sorted[0].mileage - sorted[1].mileage
              const lit  = sorted[0].liters
              if (lit > 0) fuelEfficiency = Math.round((diff / lit) * 100) / 100
            }
            const efficiencyStatus = fuelEfficiency == null ? 'Insufficient Data'
              : fuelEfficiency < 5  ? 'Poor'
              : fuelEfficiency < 10 ? 'Good'
              : 'Excellent'
            return { vehicleRegNumber: reg, fuelEfficiency, totalSpending, efficiencyStatus }
          })

          setVehicleStats(statsArr)

        } else if (isDriver) {
          // ── Driver: use own-scoped summary + chart + logs ─────────────
          const [summaryRes, chartRes, logsRes] = await Promise.all([
            fuelAPI.getSummary(), fuelAPI.getChartData(), fuelAPI.getMyLogs()
          ])
          setSummary(summaryRes.data.data || { totalDiesel: 0, totalPetrol: 0, totalVolume: 0, totalCost: 0 })
          setChartData(chartRes.data.data || { months: [], data: { Diesel: [], Petrol: [] } })
          setMyVehicleLogs(logsRes.data.data || [])
        }

      } catch (err) { console.error('Error loading fuel data:', err) }
      finally { setLoading(false) }
    }
    loadData()
  }, [isAdmin, isController, isDriver, user])

  const handleInputChange = e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleAddFuelLog = async e => {
    e.preventDefault(); setSubmitting(true)
    try {
      await fuelAPI.addFuelLog({
        vehicleRegNumber: formData.vehicleRegNumber, fuelType: formData.fuelType,
        liters: parseFloat(formData.liters), costPerLiter: parseFloat(formData.costPerLiter),
        mileage: parseFloat(formData.mileage), date: formData.date,
      })
      const [sR, cR, lR] = await Promise.all([fuelAPI.getSummary(), fuelAPI.getChartData(), fuelAPI.getMyLogs()])
      setSummary(sR.data.data); setChartData(cR.data.data); setMyVehicleLogs(lR.data.data || [])
      setFormData({ vehicleRegNumber: '', fuelType: 'Diesel', liters: '', costPerLiter: '', mileage: '', date: new Date().toISOString().split('T')[0] })
      setActiveTab('dashboard'); showToast('Fuel log added!')
    } catch (err) { showToast('Failed: ' + (err.response?.data?.message || err.message), 'error') }
    finally { setSubmitting(false) }
  }

  /* chart helpers */
  const monthlyData = (chartData.months || []).map((month, i) => ({
    month, Diesel: chartData.data?.Diesel?.[i] || 0, Petrol: chartData.data?.Petrol?.[i] || 0,
  }))
  const sliced = period === '3M' ? monthlyData.slice(-3) : period === '6M' ? monthlyData.slice(-6) : monthlyData
  const maxVal = Math.max(...(chartData.data?.Diesel || [0]), ...(chartData.data?.Petrol || [0]), 1)

  /* efficiency trend from vehicle stats */
  const effTrend = vehicleStats.filter(v => v.fuelEfficiency != null).map(v => v.fuelEfficiency)
  const maxEff = Math.max(...effTrend, 1)
  const minEff = Math.min(...effTrend, 0)

  /* max spending for normalising hbars */
  const maxSpend = Math.max(...vehicleStats.map(v => v.totalSpending), 1)

  const hBarColor = status => ({
    Excellent: D.green, Good: D.blue, Average: D.gold, Poor: D.red,
  }[status] || D.textSub)

  /* loading */
  if (loading) return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Analysis" subtitle="Home / Fuel Analysis" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: D.textSub, fontWeight: 600 }}>Loading fuel analytics…</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell fuel-dark" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Analysis" subtitle="Home / Fuel Analysis" />
        <div className="page-body" style={{ padding: '24px 28px' }}>

          {/* Toast */}
          {toast && (
            <div style={{
              position: 'fixed', top: 24, right: 28, zIndex: 9999, padding: '13px 20px',
              borderRadius: 12, background: toast.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)',
              color: toast.type === 'error' ? D.red : D.green,
              border: `1px solid ${toast.type === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}`,
              fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              animation: 'fadeUp 0.25s ease both', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {toast.type === 'error' ? <X size={14}/> : <Check size={14}/>} {toast.msg}
            </div>
          )}

          {/* ── Hero Banner ─────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: `1px solid rgba(255,255,255,0.07)`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
          }}>
            {/* decorative circles */}
            {[['80%','−20px','180px','rgba(255,255,255,0.03)'],['20%','60%','120px','rgba(255,255,255,0.04)'],['55%','80%','90px','rgba(255,255,255,0.02)']].map(([t,l,s,bg],i) => (
              <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display:'flex', alignItems:'center', justifyContent:'center', color: '#fff', backdropFilter:'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Fuel size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Fuel Analysis
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                  {isDriver ? 'Track your vehicle fuel consumption.' : 'Fleet-wide consumption trends, cost breakdowns & efficiency tracking.'}
                </p>
              </div>
            </div>
            {isDriver && (
              <div style={{ display: 'flex', gap: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, border: `1px solid ${D.border}` }}>
                {[{ id: 'dashboard', icon: <LayoutDashboard size={16}/>, label: 'Dashboard' }, { id: 'add-log', icon: <Fuel size={16}/>, label: 'Add Log' }].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                    padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: activeTab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent',
                    color: activeTab === t.id ? '#a78bfa' : D.textSub,
                    boxShadow: activeTab === t.id ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                  }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════
              DASHBOARD
          ════════════════════════════════════════════════════ */}
          {(!isDriver || activeTab === 'dashboard') && (
            <>
              {/* ── KPI cards ──────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
                {(isAdmin || isController ? [
                  { label: 'Total Diesel', value: `${Math.round(summary.totalDiesel).toLocaleString()} L`, icon: <Fuel size={20}/>, iconBg: D.indigoDim, iconColor: D.indigo },
                  { label: 'Total Petrol', value: `${Math.round(summary.totalPetrol).toLocaleString()} L`, icon: <Fuel size={20}/>, iconBg: D.goldDim, iconColor: D.gold },
                  { label: 'Total Volume', value: `${Math.round(summary.totalVolume).toLocaleString()} L`, icon: <BarChart2 size={20}/>, iconBg: D.tealDim, iconColor: D.teal },
                  { label: 'Total Cost (LKR)', value: `Rs. ${Math.round(summary.totalCost).toLocaleString()}`, icon: <CircleDollarSign size={20}/>, iconBg: D.greenDim, iconColor: D.green },
                  { label: 'Active Logs', value: summary.logCount, icon: <BarChart2 size={20}/>, iconBg: D.purpleDim, iconColor: D.purple },
                ] : [
                  { label: 'Total Diesel', value: `${Math.round(summary.totalDiesel).toLocaleString()} L`, icon: <Fuel size={20}/>, iconBg: D.indigoDim, iconColor: D.indigo },
                  { label: 'Total Petrol', value: `${Math.round(summary.totalPetrol).toLocaleString()} L`, icon: <Fuel size={20}/>, iconBg: D.goldDim, iconColor: D.gold },
                  { label: 'Total Volume', value: `${Math.round(summary.totalVolume).toLocaleString()} L`, icon: <BarChart2 size={20}/>, iconBg: D.tealDim, iconColor: D.teal },
                  { label: 'Total Cost (LKR)', value: `Rs. ${Math.round(summary.totalCost).toLocaleString()}`, icon: <CircleDollarSign size={20}/>, iconBg: D.greenDim, iconColor: D.green },
                ]).map(s => (
                  <div key={s.label} style={{
                    ...card, padding: '20px 22px', transition: 'all 0.25s ease', cursor: 'default',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = D.borderHi; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', border: `1px solid ${s.iconColor}30`, color: s.iconColor }}>
                        {s.icon}
                      </div>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '1.65rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{s.value}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  </div>
                ))}
              </div>


              {/* ── Charts row ───────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

                {/* Monthly Consumption Bar Chart */}
                <div style={{ ...card, padding: '22px 24px' }}>
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
                          background: period === p ? 'rgba(129,140,248,0.25)' : 'transparent',
                          color: period === p ? D.indigo : D.textSub,
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <BarChart data={sliced} maxVal={maxVal} />
                  <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
                    {[['Diesel', 'url(#barD)', '#818cf8'], ['Petrol', 'url(#barP)', '#fbbf24']].map(([n, , c]) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{n}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fuel Efficiency Trend (line chart using vehicle efficiency values) */}
                <div style={{ ...card, padding: '22px 24px' }}>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fuel Efficiency Trend</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>Avg km/L across vehicles</p>
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
                      <LineChart data={effTrend} maxVal={maxEff} minVal={minEff} />
                      <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>
                          <div style={{ width: 20, height: 2, background: D.teal, borderRadius: 999 }} />km/L per vehicle
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: D.textSub }}>
                          Avg: <span style={{ color: D.teal, fontWeight: 700 }}>{effTrend.length > 0 ? (effTrend.reduce((a, b) => a + b, 0) / effTrend.length).toFixed(2) : '—'} km/L</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Vehicle Performance (horizontal bars) ─────── */}
              {(isAdmin || isController) && vehicleStats.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

                  {/* Efficiency H-bars */}
                  <div style={{ ...card, padding: '22px 24px' }}>
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
                      />
                    ))}
                  </div>

                  {/* Spending H-bars */}
                  <div style={{ ...card, padding: '22px 24px' }}>
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fleet Fuel Spending</h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>Total LKR spent per vehicle</p>
                    </div>
                    {vehicleStats.slice(0, 8).map((v, i) => (
                      <HBar key={v.vehicleRegNumber}
                        label={v.vehicleRegNumber}
                        value={v.totalSpending}
                        max={maxSpend}
                        color={[D.blue, D.indigo, D.teal, D.purple, D.green, D.gold][i % 6]}
                        sub={`Rs. ${v.totalSpending.toLocaleString()}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Driver: My Fuel History ───────────────────── */}
              {isDriver && (
                <div style={{ ...card, marginBottom: 20 }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${D.border}` }}>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.92rem' }}>My Fuel History</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>Recent fuel logs for your vehicle</p>
                  </div>
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {myVehicleLogs.length === 0 ? (
                      <div style={{ padding: 50, textAlign: 'center', color: D.textSub }}>
                        <div style={{ marginBottom: 10, opacity: 0.3, display: 'flex', justifyContent: 'center' }}><Fuel size={48} /></div>
                        <p style={{ fontWeight: 600, marginBottom: 4 }}>No fuel logs yet</p>
                        <p style={{ fontSize: '0.82rem' }}>Switch to "Add Log" tab to add your first entry.</p>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: D.surfaceHi }}>
                            {['Date', 'Fuel Type', 'Liters', 'Cost/L', 'Total', 'Mileage', 'Efficiency'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {myVehicleLogs.map((log, i) => (
                            <tr key={log.id}
                              style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.12s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.07)'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                              <td style={{ padding: '10px 14px', color: D.textSub }}>{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                                  background: log.fuelType === 'Diesel' ? D.indigoDim : D.goldDim,
                                  color: log.fuelType === 'Diesel' ? D.indigo : D.gold,
                                  border: `1px solid ${log.fuelType === 'Diesel' ? 'rgba(129,140,248,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
                                  {log.fuelType}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: D.text, fontWeight: 600 }}>{log.liters} L</td>
                              <td style={{ padding: '10px 14px', color: D.textSub }}>Rs. {log.costPerLiter.toFixed(2)}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: D.text }}>Rs. {log.totalCost.toFixed(2)}</td>
                              <td style={{ padding: '10px 14px', color: D.textSub }}>{log.mileage.toFixed(1)} km</td>
                              <td style={{ padding: '10px 14px' }}>
                                {log.fuelEfficiency
                                  ? <span style={{ fontWeight: 700, color: D.teal }}>{log.fuelEfficiency.toFixed(2)} km/L</span>
                                  : <span style={{ color: D.textFaint }}>—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ── Admin/Controller: All Fuel Logs ──────────── */}
              {(isAdmin || isController) && (
                <div style={{ ...card }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.92rem' }}>All Fuel Logs — Audit View</h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>Complete log history with creator and editor info</p>
                    </div>
                    <span style={{ padding: '3px 11px', borderRadius: 20, background: D.indigoDim, color: D.indigo, fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(129,140,248,0.25)' }}>
                      {allFuelLogs.length} records
                    </span>
                  </div>
                  <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                    {allFuelLogs.length === 0 ? (
                      <div style={{ padding: 50, textAlign: 'center', color: D.textSub }}>
                        <div style={{ marginBottom: 10, opacity: 0.3, display: 'flex', justifyContent: 'center' }}><Fuel size={48} /></div>
                        <p style={{ fontWeight: 600 }}>No fuel logs yet</p>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <tr style={{ background: D.surfaceHi }}>
                            {['Vehicle', 'Date', 'Type', 'Liters', 'Cost', 'Mileage', 'Created By', 'Updated By', 'Status'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {allFuelLogs.map((log, i) => (
                            <tr key={log.id}
                              style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.12s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.07)'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontWeight: 700, color: D.blue, background: D.blueDim, padding: '2px 9px', borderRadius: 6, fontSize: '0.75rem' }}>{log.vehicleRegNumber}</span>
                              </td>
                              <td style={{ padding: '10px 14px', color: D.textSub, whiteSpace: 'nowrap' }}>
                                {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                                  background: log.fuelType === 'Diesel' ? D.indigoDim : D.goldDim,
                                  color: log.fuelType === 'Diesel' ? D.indigo : D.gold }}>
                                  {log.fuelType}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: D.text, fontWeight: 600 }}>{log.liters.toFixed(1)} L</td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: D.text }}>Rs. {Math.round(log.totalCost).toLocaleString()}</td>
                              <td style={{ padding: '10px 14px', color: D.textSub }}>{log.mileage.toFixed(0)} km</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: D.green }}>{log.uploadedBy || log.driverUsername || '—'}</span>
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {log.isUpdated && log.updatedBy ? (
                                  <div>
                                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: D.purple, display: 'block' }}>{log.updatedBy}</span>
                                    {log.updatedAt && <span style={{ fontSize: '0.65rem', color: D.textSub }}>{new Date(log.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                  </div>
                                ) : <span style={{ color: D.textFaint }}>—</span>}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {log.isUpdated ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, background: D.purpleDim, color: D.purple, border: '1px solid rgba(167,139,250,0.3)' }}><Edit2 size={10}/> Edited</span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, background: D.greenDim, color: D.green, border: '1px solid rgba(74,222,128,0.3)' }}><Check size={10}/> Original</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════
              DRIVER: ADD LOG FORM
          ════════════════════════════════════════════════════ */}
          {isDriver && activeTab === 'add-log' && (
            <div style={{ ...card, padding: 0, maxWidth: 520 }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: D.purpleDim, border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.purple }}><Fuel size={18} /></div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '0.92rem' }}>Add Fuel Log</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: D.textSub }}>Record a new fuel fill-up for your vehicle</p>
                </div>
              </div>
              <form onSubmit={handleAddFuelLog} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Vehicle Reg. Number', name: 'vehicleRegNumber', type: 'text', placeholder: 'e.g. WP-1234' },
                  { label: 'Date', name: 'date', type: 'date' },
                  { label: 'Liters', name: 'liters', type: 'number', placeholder: 'e.g. 40.5', step: '0.01' },
                  { label: 'Cost per Liter (Rs.)', name: 'costPerLiter', type: 'number', placeholder: 'e.g. 340', step: '0.01' },
                  { label: 'Current Mileage (km)', name: 'mileage', type: 'number', placeholder: 'e.g. 12500', step: '0.1' },
                ].map(f => (
                  <div key={f.name}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: D.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                    <input type={f.type} name={f.name} value={formData[f.name]} onChange={handleInputChange}
                      placeholder={f.placeholder} required step={f.step}
                      style={darkInput}
                      onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: D.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuel Type</label>
                  <select name="fuelType" value={formData.fuelType} onChange={handleInputChange}
                    style={{ ...darkInput, cursor: 'pointer' }}>
                    <option value="Diesel" style={{ background: '#1e2535' }}>Diesel</option>
                    <option value="Petrol" style={{ background: '#1e2535' }}>Petrol</option>
                  </select>
                </div>
                <button type="submit" disabled={submitting} style={{
                  marginTop: 6, padding: '11px 24px', borderRadius: 10, border: 'none',
                  background: submitting ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', fontWeight: 700, fontFamily: 'inherit',
                  boxShadow: submitting ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = submitting ? 'none' : '0 4px 16px rgba(99,102,241,0.4)' }}>
                  {submitting ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Loader2 size={16} className="animate-spin" /> Adding…</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Plus size={16} /> Add Fuel Log</span>}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* ── Dark theme overrides for sidebar/topbar ─────────── */}
      <style>{`
        .fuel-dark .topbar {
          background: #161b27 !important;
          border-bottom-color: rgba(255,255,255,0.07) !important;
        }
        .fuel-dark .topbar-title { color: #e2e8f0 !important; }
        .fuel-dark .topbar-breadcrumb { color: #475569 !important; }
        .fuel-dark .topbar-user {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .fuel-dark .topbar-user:hover {
          background: rgba(99,102,241,0.15) !important;
          border-color: rgba(99,102,241,0.4) !important;
        }
        .fuel-dark .topbar-name { color: #e2e8f0 !important; }
        .fuel-dark .sidebar {
          background: #111827 !important;
          border-right-color: rgba(255,255,255,0.07) !important;
        }
        .fuel-dark .sidebar-header { border-bottom-color: rgba(255,255,255,0.07) !important; }
        .fuel-dark .sidebar-title { color: #f1f5f9 !important; }
        .fuel-dark .sidebar-subtitle { color: #475569 !important; }
        .fuel-dark .nav-section-label { color: #334155 !important; }
        .fuel-dark .nav-item { color: #64748b !important; }
        .fuel-dark .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: #cbd5e1 !important; }
        .fuel-dark .nav-item.active { background: rgba(99,102,241,0.18) !important; color: #a5b4fc !important; }
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
