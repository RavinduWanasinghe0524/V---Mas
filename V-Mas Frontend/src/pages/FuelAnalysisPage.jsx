import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { fuelAPI } from '../services/api'
import { Fuel, CircleDollarSign, BarChart2, Check, X, TrendingUp, Edit2, Loader2, Plus, LayoutDashboard, Calendar, User } from 'lucide-react'

const card = (D) => ({
  background: D.surface,
  borderRadius: 24,
  border: `1px solid ${D.border}`,
  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
  overflow: 'hidden',
})

/* -- Input style (driver form) -------------------------------- */
const darkInput = (D) => ({
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
                {!dim && <title>Diesel: {d.Diesel.toFixed(1)} L</title>}
              </rect>
              <rect x={x + W_BAR + 3} y={H - pH} width={W_BAR} height={pH} rx={3} fill="url(#barP)">
                {!dim && <title>Petrol: {d.Petrol.toFixed(1)} L</title>}
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
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0d1117" stroke="#2dd4bf" strokeWidth={2}>
          <title>{data[i].toFixed(2)} km/L</title>
        </circle>
      ))}
    </svg>
  )
}

/* -- Horizontal bar (vehicle stats) -------------------------- */
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
const FuelAnalysisPage = () => {
  const D = useD()
  const { user, isAdmin, isController, isDriver } = useAuth()
  const [period, setPeriod] = useState('6M')
  const [showAddModal, setShowAddModal] = useState(false)

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
          // -- Admin/Controller: compute everything locally from raw logs --
          // This mirrors FuelManagementPage approach and avoids backend
          // analytics endpoints which have a NULL/false mismatch on is_deleted.
          const allLogsRes = await fuelAPI.getAllFuelLogs()
          let rawLogs = allLogsRes.data.data || []
          
          if (isAdmin) {
            try {
              const deletedRes = await fuelAPI.getDeletedLogs()
              const deletedLogs = deletedRes.data.data || []
              rawLogs = [...rawLogs, ...deletedLogs]
            } catch (err) {
              console.error("Failed to fetch deleted logs:", err)
            }
          }
          
          const activeLogs = rawLogs.filter(l => !l.isDeleted)

          // Sort for display table (newest first)
          const tableLogs = isAdmin ? rawLogs : activeLogs
          setAllFuelLogs([...tableLogs].sort((a, b) => new Date(b.date) - new Date(a.date)))

          // -- Summary KPIs (all-time totals, same as FuelManagementPage) --
          const curYear = new Date().getFullYear()

          const totalDiesel = activeLogs.filter(l => l.fuelType?.toLowerCase() === 'diesel').reduce((s, l) => s + (l.liters || 0), 0)
          const totalPetrol = activeLogs.filter(l => l.fuelType?.toLowerCase() === 'petrol').reduce((s, l) => s + (l.liters || 0), 0)
          const totalVolume = totalDiesel + totalPetrol
          const totalCost   = activeLogs.reduce((s, l) => s + (l.totalCost || 0), 0)

          setSummary({ totalDiesel, totalPetrol, totalVolume, totalCost, logCount: activeLogs.length })

          // -- Monthly Chart (current year) ------------------------------
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
          // -- Driver: use own-scoped summary + chart + logs -------------
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
      setShowAddModal(false); showToast('Fuel log added!')
    } catch (err) { showToast('Failed: ' + (err.response?.data?.message || err.message), 'error') }
    finally { setSubmitting(false) }
  }

  /* chart helpers */
  const monthlyData = (chartData.months || []).map((month, i) => ({
    month, Diesel: chartData.data?.Diesel?.[i] || 0, Petrol: chartData.data?.Petrol?.[i] || 0,
  }))
  const highlightCount = period === '3M' ? 3 : period === '6M' ? 6 : 12
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
            <p style={{ color: D.textSub, fontWeight: 600 }}>Loading fuel analytics...</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell" style={{ background: D.bg }}>
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

          {/* -- Hero Banner --------------------------------------- */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
            borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 30
          }}>
            {/* decoration */}
            <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(165,180,252,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 20, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Fuel size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Fuel Analysis
                </h1>
                <p style={{ margin: '6px 0 0', color: '#a5b4fc', fontSize: '1rem', fontWeight: 500, opacity: 0.9 }}>
                  {isDriver ? 'Track your vehicle fuel consumption.' : 'Fleet-wide consumption trends, cost breakdowns & efficiency tracking.'}
                </p>
              </div>
            </div>
            {isDriver && (
              <button 
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 24px', borderRadius: 16, border: 'none', background: '#fff',
                  color: '#312e81', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 2
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}
              >
                <Plus size={20} strokeWidth={3}/> Add Fuel Log
              </button>
            )}
          </div>

          {/* -
              DASHBOARD
          - */}
          <>
              {/* -- KPI cards -------------------------------- */}
              <div style={{ display: 'grid', gridTemplateColumns: (isAdmin || isController) ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
                {(isAdmin || isController ? [
                  { label: 'Total Diesel', value: `${Math.round(summary.totalDiesel).toLocaleString()} L`, icon: <Fuel size={24}/>, iconBg: D.indigoDim, iconColor: D.indigo },
                  { label: 'Total Petrol', value: `${Math.round(summary.totalPetrol).toLocaleString()} L`, icon: <Fuel size={24}/>, iconBg: D.goldDim, iconColor: D.gold },
                  { label: 'Total Volume', value: `${Math.round(summary.totalVolume).toLocaleString()} L`, icon: <BarChart2 size={24}/>, iconBg: D.tealDim, iconColor: D.teal },
                  { label: 'Total Cost', value: `Rs. ${Math.round(summary.totalCost).toLocaleString()}`, icon: <CircleDollarSign size={24}/>, iconBg: D.greenDim, iconColor: D.green },
                  { label: 'Active Logs', value: summary.logCount, icon: <BarChart2 size={24}/>, iconBg: D.purpleDim, iconColor: D.purple },
                ] : [
                  { label: 'Total Diesel', value: `${Math.round(summary.totalDiesel).toLocaleString()} L`, icon: <Fuel size={24}/>, iconBg: D.indigoDim, iconColor: D.indigo },
                  { label: 'Total Petrol', value: `${Math.round(summary.totalPetrol).toLocaleString()} L`, icon: <Fuel size={24}/>, iconBg: D.goldDim, iconColor: D.gold },
                  { label: 'Total Volume', value: `${Math.round(summary.totalVolume).toLocaleString()} L`, icon: <BarChart2 size={24}/>, iconBg: D.tealDim, iconColor: D.teal },
                  { label: 'Total Cost', value: `Rs. ${Math.round(summary.totalCost).toLocaleString()}`, icon: <CircleDollarSign size={24}/>, iconBg: D.greenDim, iconColor: D.green },
                ]).map(s => (
                  <div key={s.label} style={{
                    ...card(D), padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default'
                  }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = s.iconColor + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${s.iconColor}20` }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.iconColor}30`, flexShrink: 0 }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>


              {/* -- Charts row --------------------------------- */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

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
                          background: period === p ? 'rgba(129,140,248,0.25)' : 'transparent',
                          color: period === p ? D.indigo : D.textSub,
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <BarChart data={monthlyData} maxVal={maxVal} highlightCount={highlightCount} D={D} />
                  <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
                    {[['Diesel', 'url(#barD)', '#818cf8'], ['Petrol', 'url(#barP)', '#fbbf24']].map(([n, , c]) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{n}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fuel Efficiency Trend (line chart using vehicle efficiency values) */}
                <div style={{ ...card(D), padding: '22px 24px' }}>
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
                      <LineChart data={effTrend} maxVal={maxEff} minVal={minEff} D={D} />
                      <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', color: D.textSub, fontWeight: 600 }}>
                          <div style={{ width: 20, height: 2, background: D.teal, borderRadius: 999 }} />km/L per vehicle
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: D.textSub }}>
                          Avg: <span style={{ color: D.teal, fontWeight: 700 }}>{effTrend.length > 0 ? (effTrend.reduce((a, b) => a + b, 0) / effTrend.length).toFixed(2) : '-'} km/L</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

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
                        D={D}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* -- Driver: My Fuel History --------------------- */}
              {isDriver && (
                <div style={{ ...card(D), padding: 0, marginBottom: 20 }}>
                  <div style={{ padding: '28px 32px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi }}>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '1.1rem' }}>My Fuel History</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: D.textSub }}>Recent fuel logs for your vehicle</p>
                  </div>
                  <div style={{ maxHeight: 460, overflowY: 'auto', padding: '24px 32px 40px' }}>
                    {myVehicleLogs.length === 0 ? (
                      <div style={{ padding: '80px 0', textAlign: 'center' }}>
                        <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                          <Fuel size={36} opacity={0.3} />
                        </div>
                        <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>No fuel logs yet</h3>
                        <p style={{ margin: '10px 0 0', color: D.textSub, fontSize: '1rem', fontWeight: 500 }}>Switch to "Add Log" tab to add your first entry.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                        {myVehicleLogs.map((log, i) => {
                          const badge = log.fuelEfficiency ? (
                            log.fuelEfficiency > 10 ? { label: 'Excellent', bg: D.greenDim, color: D.green, border: 'rgba(74,222,128,0.3)' } :
                            log.fuelEfficiency > 7 ? { label: 'Good', bg: D.blueDim, color: D.blue, border: 'rgba(96,165,250,0.3)' } :
                            log.fuelEfficiency > 5 ? { label: 'Average', bg: D.goldDim, color: D.gold, border: 'rgba(251,191,36,0.3)' } :
                            { label: 'Poor', bg: D.redDim, color: D.red, border: 'rgba(248,113,113,0.3)' }
                          ) : { label: 'N/A', bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border };
                          
                          return (
                            <div key={log.id} style={{
                              background: D.surface, borderRadius: 20, border: `1px solid ${D.border}`,
                              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24,
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }} onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>
                              
                              <div style={{ width: 140, flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', color: D.text, fontWeight: 800 }}>
                                  <Calendar size={18} color={D.textSub} strokeWidth={2.5} /> {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                  <span style={{ fontSize: '0.75rem', color: log.fuelType === 'Diesel' ? D.indigo : D.gold, fontWeight: 800, textTransform: 'uppercase', background: log.fuelType === 'Diesel' ? D.indigoDim : D.goldDim, padding: '3px 10px', borderRadius: 6, border: `1px solid ${log.fuelType === 'Diesel' ? D.indigo : D.gold}30` }}>{log.fuelType}</span>
                                </div>
                              </div>
                              
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 48 }}>
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Volume</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{log.liters.toFixed(1)} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>L</span></div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Cost/L</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.textSub }}>Rs. {log.costPerLiter.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Cost</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: D.green }}>Rs. {log.totalCost.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mileage</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{log.mileage.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>km</span></div>
                                </div>
                              </div>
                              
                              <div style={{ width: 140, textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 12, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, boxShadow: `0 4px 12px ${badge.color}15` }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{badge.label}</span>
                                  {log.fuelEfficiency && <span style={{ fontWeight: 950, fontSize: '1rem' }}>{log.fuelEfficiency.toFixed(1)}</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -- Admin/Controller: All Fuel Logs ------------ */}
              {(isAdmin || isController) && (
                <div style={{ ...card(D), padding: 0 }}>
                  <div style={{ padding: '28px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: D.surfaceHi }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '1.1rem' }}>All Fuel Logs - Audit View</h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: D.textSub }}>Complete log history with creator and editor info</p>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: D.textSub, fontWeight: 700, background: D.surface, padding: '8px 16px', borderRadius: 12, border: `1px solid ${D.border}` }}>
                      <span style={{ color: D.purple }}>{allFuelLogs.length}</span> Records
                    </div>
                  </div>
                  <div style={{ maxHeight: 600, overflowY: 'auto', padding: '24px 32px 40px' }}>
                    {allFuelLogs.length === 0 ? (
                      <div style={{ padding: '80px 0', textAlign: 'center' }}>
                        <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                          <Fuel size={36} opacity={0.3} />
                        </div>
                        <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>No fuel logs</h3>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                        {allFuelLogs.map((log, i) => {
                          const badge = log.fuelEfficiency ? (
                            log.fuelEfficiency > 10 ? { label: 'Excellent', bg: D.greenDim, color: D.green, border: 'rgba(74,222,128,0.3)' } :
                            log.fuelEfficiency > 7 ? { label: 'Good', bg: D.blueDim, color: D.blue, border: 'rgba(96,165,250,0.3)' } :
                            log.fuelEfficiency > 5 ? { label: 'Average', bg: D.goldDim, color: D.gold, border: 'rgba(251,191,36,0.3)' } :
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
                                   <span style={{ fontSize: '0.72rem', color: log.fuelType === 'Diesel' ? D.indigo : D.gold, fontWeight: 800, textTransform: 'uppercase', background: log.fuelType === 'Diesel' ? D.indigoDim : D.goldDim, padding: '2px 8px', borderRadius: 6, border: `1px solid ${log.fuelType === 'Diesel' ? D.indigo : D.gold}30` }}>{log.fuelType}</span>
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
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Volume</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{log.liters.toFixed(1)} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>L</span></div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mileage</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{log.mileage.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>km</span></div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Cost</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.green }}>Rs. {Math.round(log.totalCost).toLocaleString()}</div>
                                </div>
                              </div>
                              
                              <div style={{ width: 140, flexShrink: 0, padding: '0 16px', borderLeft: `1px solid ${D.border}` }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Audit Status</div>
                                {log.isDeleted ? (
                                  <div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 800, color: D.red, marginBottom: 2 }}><X size={12}/> Deleted</div>
                                    <div style={{ fontSize: '0.7rem', color: D.textSub }}>By {log.deletedBy || '-'}</div>
                                  </div>
                                ) : log.isUpdated ? (
                                  <div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 800, color: D.purple, marginBottom: 2 }}><Edit2 size={12}/> Edited</div>
                                    <div style={{ fontSize: '0.7rem', color: D.textSub }}>By {log.updatedBy}</div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 800, color: D.green }}><Check size={12}/> Original</div>
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
          {isDriver && showAddModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={() => { if (!submitting) setShowAddModal(false) }}>
              <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Plus size={24} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Record Fuel Entry</h2>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600, opacity: 0.9 }}>Enter the latest fill-up data for analysis</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
                </div>

                <form onSubmit={handleAddFuelLog} style={{ padding: '36px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 40 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vehicle Identification <span style={{ color: D.red }}>*</span></label>
                      <input type="text" name="vehicleRegNumber" value={formData.vehicleRegNumber} onChange={handleInputChange} required placeholder="e.g. WP-1234" style={{ width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }} onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Transaction Date <span style={{ color: D.red }}>*</span></label>
                      <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={{ width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }} onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }} />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fuel Grade <span style={{ color: D.red }}>*</span></label>
                      <select name="fuelType" value={formData.fuelType} onChange={handleInputChange} required style={{ width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }} onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}>
                        <option value="Diesel">Diesel</option>
                        <option value="Petrol">Petrol</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Volume Dispensed (L) <span style={{ color: D.red }}>*</span></label>
                      <input type="number" name="liters" value={formData.liters} onChange={handleInputChange} step="0.01" min="0" required placeholder="0.00" style={{ width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }} onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }} />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit Price (LKR/L) <span style={{ color: D.red }}>*</span></label>
                      <input type="number" name="costPerLiter" value={formData.costPerLiter} onChange={handleInputChange} step="0.01" min="0" required placeholder="0.00" style={{ width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }} onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }} />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Odometer Reading (km) <span style={{ color: D.red }}>*</span></label>
                      <input type="number" name="mileage" value={formData.mileage} onChange={handleInputChange} step="0.1" required placeholder="0.0" style={{ width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }} onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 20 }}>
                    <button type="submit" disabled={submitting} style={{ flex: 2, padding: '16px', borderRadius: 18, border: 'none', background: submitting ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: '1.05rem', fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: submitting ? 'none' : '0 10px 25px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onMouseEnter={e => { if(!submitting) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(99,102,241,0.5)' } }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = submitting ? 'none' : '0 10px 25px rgba(99,102,241,0.4)' }}>
                      {submitting ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
                      {submitting ? 'Processing Entry...' : 'Complete Fuel Entry'}
                    </button>
                    <button type="button" disabled={submitting} onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '16px', borderRadius: 18, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub, fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = D.border} onMouseLeave={e => e.currentTarget.style.background = D.surfaceHi}>Discard</button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* -- Dark theme overrides for sidebar/topbar ----------- */}
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
