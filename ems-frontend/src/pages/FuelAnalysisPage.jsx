import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { fuelAPI } from '../services/api'

const BAR_COLORS = { Diesel: '#6366f1', Petrol: '#f59e0b' }

/* ── Progress bar (mirrors ServicePage) ─────────────────────────── */
const ProgressBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
    </div>
  )
}

/* ── Shared dark-card style (mirrors ServicePage) ────────────────── */
const darkCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '22px 24px',
  flex: 1,
  transition: 'all 0.2s ease',
}

const FuelAnalysisPage = () => {
  const { user, isAdmin, isController, isDriver } = useAuth()
  const [period, setPeriod] = useState('6M')
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' or 'add-log' (driver only)

  // State for backend data
  const [summary, setSummary] = useState({ totalDiesel: 0, totalPetrol: 0, totalVolume: 0, totalCost: 0 })
  const [chartData, setChartData] = useState({ months: [], data: { Diesel: [], Petrol: [] } })
  const [vehicleStats, setVehicleStats] = useState([])
  const [myVehicleLogs, setMyVehicleLogs] = useState([])
  const [allFuelLogs, setAllFuelLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // State for Add Fuel Log Form (Driver only)
  const [formData, setFormData] = useState({
    vehicleRegNumber: '',
    fuelType: 'Diesel',
    liters: '',
    costPerLiter: '',
    mileage: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState(false)

  // Load data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load summary and chart data for all roles
        const [summaryRes, chartRes] = await Promise.all([
          fuelAPI.getSummary(),
          fuelAPI.getChartData()
        ])

        setSummary(summaryRes.data.data || { totalDiesel: 0, totalPetrol: 0, totalVolume: 0, totalCost: 0 })
        setChartData(chartRes.data.data || { months: [], data: { Diesel: [], Petrol: [] } })

        // Load vehicle stats and all fuel logs for admin/controller
        if (isAdmin || isController) {
          const [statsRes, allLogsRes] = await Promise.all([
            fuelAPI.getVehicleStats(),
            fuelAPI.getAllFuelLogs()
          ])
          setVehicleStats(statsRes.data.data || [])
          // Filter out soft-deleted logs and sort by date (most recent first)
          const activeLogs = (allLogsRes.data.data || [])
            .filter(log => !log.isDeleted)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
          setAllFuelLogs(activeLogs)
        }

        // Load driver's own logs using the driver-scoped endpoint GET /api/fuel/my-logs
        if (isDriver) {
          const logsRes = await fuelAPI.getMyLogs()
          setMyVehicleLogs(logsRes.data.data || [])
        }
      } catch (error) {
        console.error('Error loading fuel data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isAdmin, isController, isDriver, user])

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle form submit (Driver)
  const handleAddFuelLog = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        vehicleRegNumber: formData.vehicleRegNumber,
        fuelType: formData.fuelType,
        liters: parseFloat(formData.liters),
        costPerLiter: parseFloat(formData.costPerLiter),
        mileage: parseFloat(formData.mileage),
        date: formData.date
      }

      // Driver endpoint: POST /api/fuel/add
      await fuelAPI.addFuelLog(payload)

      // Reload summary, chart and the driver's own logs
      const [summaryRes, chartRes, logsRes] = await Promise.all([
        fuelAPI.getSummary(),
        fuelAPI.getChartData(),
        fuelAPI.getMyLogs()          // <-- uses correct driver-scoped endpoint
      ])

      setSummary(summaryRes.data.data)
      setChartData(chartRes.data.data)
      setMyVehicleLogs(logsRes.data.data || [])

      // Reset form
      setFormData({
        vehicleRegNumber: '',
        fuelType: 'Diesel',
        liters: '',
        costPerLiter: '',
        mileage: '',
        date: new Date().toISOString().split('T')[0]
      })
      setActiveTab('dashboard')

      alert('✅ Fuel log added successfully!')
    } catch (error) {
      console.error('Error adding fuel log:', error)
      alert('❌ Failed to add fuel log: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const getEfficiencyBadge = (status) => {
    const badges = {
      Excellent: { text: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
      Good:      { text: 'Good',      color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
      Average:   { text: 'Average',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
      Poor:      { text: 'Poor',      color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)'  },
      'N/A':     { text: 'N/A',       color: '#64748b', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)' },
    }
    return badges[status] || badges['N/A']
  }

  const monthlyData = chartData.months?.map((month, idx) => ({
    month,
    Diesel: chartData.data?.Diesel?.[idx] || 0,
    Petrol: chartData.data?.Petrol?.[idx] || 0
  })) || []

  const maxVal = Math.max(
    ...(chartData.data?.Diesel || []),
    ...(chartData.data?.Petrol || []),
    1
  )

  /* ── Stat summary totals for progress bars ───────────────────── */
  const totalVolume = summary.totalVolume || 1

  /* ── Loading state ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="app-shell fuel-page-dark">
        <Sidebar />
        <div className="main-content" style={{ background: '#0f172a', minHeight: '100vh' }}>
          <Topbar title="Fuel Analysis" subtitle="Home / Fuel Analysis" />
          <div className="page-body" style={{ padding: '28px 32px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '22px', height: 84, marginBottom: 12,
                animation: 'pulse 1.5s ease infinite',
              }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    )
  }

  return (
    <div className="app-shell fuel-page-dark">
      <Sidebar />
      <div className="main-content" style={{ background: '#0f172a', minHeight: '100vh' }}>
        <Topbar title="Fuel Analysis" subtitle="Home / Fuel Analysis" />
        <div className="page-body" style={{ padding: '28px 32px' }}>

          {/* ── Page Header ─────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '1.75rem', fontWeight: 800,
                color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em',
              }}>
                Fuel Analysis ⛽
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                {isDriver
                  ? 'Track your vehicle fuel consumption and view history.'
                  : 'Monitor fuel consumption trends and cost analysis across the entire fleet.'}
              </p>
            </div>
          </div>

          {/* ── Driver Tabs ──────────────────────────────────────── */}
          {isDriver && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: 4,
              display: 'inline-flex',
              alignItems: 'center',
              marginBottom: 28,
            }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  background: activeTab === 'dashboard' ? '#2563eb' : 'transparent',
                  color: activeTab === 'dashboard' ? '#fff' : '#64748b',
                  border: 'none', borderRadius: 10,
                  padding: '7px 20px', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveTab('add-log')}
                style={{
                  background: activeTab === 'add-log' ? '#2563eb' : 'transparent',
                  color: activeTab === 'add-log' ? '#fff' : '#64748b',
                  border: 'none', borderRadius: 10,
                  padding: '7px 20px', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                ⛽ Add Fuel Log
              </button>
            </div>
          )}

          {/* ── Dashboard Tab Content ────────────────────────────── */}
          {(!isDriver || activeTab === 'dashboard') && (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                <div style={darkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                      {Math.round(summary.totalDiesel).toLocaleString()}
                    </p>
                    <span style={{ fontSize: '1.25rem' }}>🛢️</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Diesel (L)</p>
                  <ProgressBar value={summary.totalDiesel} max={totalVolume} color="#6366f1" />
                </div>

                <div style={darkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                      {Math.round(summary.totalPetrol).toLocaleString()}
                    </p>
                    <span style={{ fontSize: '1.25rem' }}>⛽</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Petrol (L)</p>
                  <ProgressBar value={summary.totalPetrol} max={totalVolume} color="#f59e0b" />
                </div>

                <div style={darkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                      {Math.round(summary.totalVolume).toLocaleString()}
                    </p>
                    <span style={{ fontSize: '1.25rem' }}>📊</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Volume (L)</p>
                  <ProgressBar value={100} max={100} color="#a855f7" />
                </div>

                <div style={darkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '1.55rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                      Rs.{Math.round(summary.totalCost).toLocaleString()}
                    </p>
                    <span style={{ fontSize: '1.25rem' }}>💰</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Cost</p>
                  <ProgressBar value={100} max={100} color="#3b82f6" />
                </div>
              </div>

              {/* Chart Card */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: 28, marginBottom: 24,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Monthly Fuel Consumption</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Litres consumed per month</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['3M', '6M', '12M'].map(p => (
                      <button key={p} onClick={() => setPeriod(p)} style={{
                        padding: '6px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                        border: period === p ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        background: period === p ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent',
                        color: period === p ? '#fff' : '#94a3b8',
                        boxShadow: period === p ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.15s ease',
                      }}>{p}</button>
                    ))}
                  </div>
                </div>

                {/* Bar Chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 180, paddingBottom: 8 }}>
                  {monthlyData.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#475569' }}>
                      No data available
                    </div>
                  ) : (
                    (period === '3M' ? monthlyData.slice(-3) : period === '6M' ? monthlyData.slice(-6) : monthlyData).map(d => (
                      <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 150, width: '100%', justifyContent: 'center' }}>
                          <div style={{ width: 18, height: `${(d.Diesel / maxVal) * 150}px`, background: BAR_COLORS.Diesel, borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} title={`Diesel: ${d.Diesel}L`} />
                          <div style={{ width: 18, height: `${(d.Petrol / maxVal) * 150}px`, background: BAR_COLORS.Petrol, borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} title={`Petrol: ${d.Petrol}L`} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{d.month}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                  {[['Diesel', '#6366f1'], ['Petrol', '#f59e0b']].map(([name, color]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                      {name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver: My Fuel History */}
              {isDriver && (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, overflow: 'hidden', marginBottom: 24,
                }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h3 style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My Fuel History</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Recent fuel logs for your vehicle</p>
                  </div>

                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {myVehicleLogs.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>⛽</div>
                        <p style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No fuel logs yet</p>
                        <p style={{ fontSize: '0.85rem', color: '#475569' }}>Click "Add Fuel Log" tab to add your first entry</p>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#0f1e35', zIndex: 1 }}>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            {['Date', 'Fuel Type', 'Liters', 'Cost/L', 'Total Cost', 'Mileage', 'Efficiency'].map(h => (
                              <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {myVehicleLogs.map((log, i) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '11px 16px', color: '#cbd5e1' }}>{new Date(log.date).toLocaleDateString()}</td>
                              <td style={{ padding: '11px 16px' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                                  background: log.fuelType === 'Diesel' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                                  color: log.fuelType === 'Diesel' ? '#a5b4fc' : '#fcd34d',
                                  border: `1px solid ${log.fuelType === 'Diesel' ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                }}>
                                  {log.fuelType}
                                </span>
                              </td>
                              <td style={{ padding: '11px 16px', color: '#cbd5e1' }}>{log.liters} L</td>
                              <td style={{ padding: '11px 16px', color: '#cbd5e1' }}>Rs. {log.costPerLiter.toFixed(2)}</td>
                              <td style={{ padding: '11px 16px', fontWeight: 700, color: '#f1f5f9' }}>Rs. {log.totalCost.toFixed(2)}</td>
                              <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{log.mileage.toFixed(1)} km</td>
                              <td style={{ padding: '11px 16px' }}>
                                {log.fuelEfficiency ? (
                                  <span style={{ fontWeight: 700, color: '#a5b4fc' }}>{log.fuelEfficiency.toFixed(2)} km/L</span>
                                ) : (
                                  <span style={{ color: '#475569', fontSize: '0.75rem' }}>—</span>
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

          {/* ── Add Fuel Log Tab (Driver only) ────────────────────── */}
          {isDriver && activeTab === 'add-log' && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '28px 32px', maxWidth: 560,
            }}>
              <h3 style={{ margin: '0 0 6px', fontWeight: 700, color: '#f1f5f9', fontSize: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Add Fuel Log
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: '#64748b' }}>Record a new fuel fill-up for your vehicle</p>

              <form onSubmit={handleAddFuelLog} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Vehicle Reg. Number', name: 'vehicleRegNumber', type: 'text', placeholder: 'e.g. WP-1234' },
                  { label: 'Date', name: 'date', type: 'date', placeholder: '' },
                  { label: 'Liters', name: 'liters', type: 'number', placeholder: 'e.g. 40' },
                  { label: 'Cost per Liter (Rs.)', name: 'costPerLiter', type: 'number', placeholder: 'e.g. 340' },
                  { label: 'Mileage (km)', name: 'mileage', type: 'number', placeholder: 'e.g. 12500' },
                ].map(f => (
                  <div key={f.name}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      name={f.name}
                      value={formData[f.name]}
                      onChange={handleInputChange}
                      placeholder={f.placeholder}
                      required
                      step={f.type === 'number' ? '0.01' : undefined}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#e2e8f0', fontSize: '0.88rem', outline: 'none',
                        boxSizing: 'border-box', transition: 'border-color 0.15s',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)' }}
                      onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                ))}

                {/* Fuel Type select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fuel Type
                  </label>
                  <select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleInputChange}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e2e8f0', fontSize: '0.88rem', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Diesel" style={{ background: '#1e293b' }}>Diesel</option>
                    <option value="Petrol" style={{ background: '#1e293b' }}>Petrol</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: 8, padding: '10px 24px', borderRadius: 12,
                    background: submitting ? 'rgba(59,130,246,0.4)' : '#3b82f6',
                    color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
                  onMouseLeave={e => { e.currentTarget.style.background = submitting ? 'rgba(59,130,246,0.4)' : '#3b82f6'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {submitting ? 'Adding...' : '+ Add Fuel Log'}
                </button>
              </form>
            </div>
          )}

          {/* ── Admin/Controller: Vehicle Statistics Table ─────────── */}
          {(isAdmin || isController) && (
            <>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, overflow: 'hidden', marginBottom: 24,
              }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Vehicle Fuel Statistics</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Fuel efficiency and spending overview</p>
                </div>
                {vehicleStats.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <p style={{ color: '#64748b' }}>No vehicle statistics available yet.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#0f1e35', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Vehicle', 'Fuel Efficiency', 'Total Spending', 'Status'].map(h => (
                          <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleStats.map((v, i) => {
                        const badge = getEfficiencyBadge(v.efficiencyStatus)
                        return (
                          <tr key={v.vehicleRegNumber} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '11px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.9rem' }}>🚗</span>
                                <span style={{ fontWeight: 700, color: '#93c5fd', fontSize: '0.85rem' }}>{v.vehicleRegNumber}</span>
                              </div>
                            </td>
                            <td style={{ padding: '11px 16px', fontWeight: 700, color: '#f1f5f9' }}>
                              {v.fuelEfficiency !== null ? `${v.fuelEfficiency.toFixed(2)} km/L` : 'N/A'}
                            </td>
                            <td style={{ padding: '11px 16px', fontWeight: 700, color: '#a5b4fc' }}>
                              Rs. {v.totalSpending.toLocaleString()}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{
                                padding: '2px 10px', borderRadius: 999,
                                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                              }}>
                                {badge.text}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* All Fuel Logs with Audit Information */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>All Fuel Logs — Audit View</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Complete log history showing who created and updated each entry</p>
                </div>

                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                  {allFuelLogs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: 12 }}>⛽</div>
                      <p style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No fuel logs yet</p>
                      <p style={{ fontSize: '0.85rem', color: '#475569' }}>Fuel logs will appear here once created</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#0f1e35', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          {['Vehicle', 'Date', 'Fuel Type', 'Liters', 'Cost', 'Mileage', 'Created By', 'Updated By', 'Status'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allFuelLogs.map((log, i) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#93c5fd', fontSize: '0.8rem' }}>
                              {log.vehicleRegNumber}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: '0.8rem' }}>
                              {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                                background: log.fuelType === 'Diesel' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                                color: log.fuelType === 'Diesel' ? '#a5b4fc' : '#fcd34d',
                                border: `1px solid ${log.fuelType === 'Diesel' ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                              }}>
                                {log.fuelType}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#cbd5e1', fontWeight: 600, fontSize: '0.8rem' }}>{log.liters.toFixed(1)} L</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f1f5f9', fontSize: '0.8rem' }}>Rs. {Math.round(log.totalCost).toLocaleString()}</td>
                            <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>{log.mileage.toFixed(0)} km</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80' }}>
                                {log.uploadedBy || log.driverUsername || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {log.isUpdated && log.updatedBy ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc' }}>
                                    {log.updatedBy}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                                    {log.updatedAt ? new Date(log.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#334155' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {log.isUpdated ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                                  ✏️ Edited
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>
                                  ✅ Original
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Dark-theme overrides ────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input.fuel-input::placeholder { color: #475569; }

        /* Topbar dark */
        .fuel-page-dark .topbar {
          background: #0f172a !important;
          border-bottom-color: rgba(255,255,255,0.08) !important;
        }
        .fuel-page-dark .topbar-title {
          color: #f1f5f9 !important;
        }
        .fuel-page-dark .topbar-breadcrumb {
          color: #475569 !important;
        }
        .fuel-page-dark .topbar-user {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
          color: #e2e8f0 !important;
        }
        .fuel-page-dark .topbar-user:hover {
          background: rgba(99,102,241,0.15) !important;
          border-color: rgba(99,102,241,0.4) !important;
        }
        .fuel-page-dark .topbar-name {
          color: #e2e8f0 !important;
        }

        /* Sidebar dark */
        .fuel-page-dark .sidebar {
          background: #0f1e35 !important;
          border-right-color: rgba(255,255,255,0.07) !important;
        }
        .fuel-page-dark .sidebar-header {
          border-bottom-color: rgba(255,255,255,0.07) !important;
        }
        .fuel-page-dark .sidebar-title {
          color: #f1f5f9 !important;
        }
        .fuel-page-dark .sidebar-subtitle {
          color: #475569 !important;
        }
        .fuel-page-dark .nav-section-label {
          color: #334155 !important;
        }
        .fuel-page-dark .nav-item {
          color: #64748b !important;
        }
        .fuel-page-dark .nav-item:hover {
          background: rgba(255,255,255,0.05) !important;
          color: #cbd5e1 !important;
        }
        .fuel-page-dark .nav-item.active {
          background: rgba(99,102,241,0.18) !important;
          color: #a5b4fc !important;
        }
        .fuel-page-dark .sidebar-footer {
          border-top-color: rgba(255,255,255,0.07) !important;
        }
        .fuel-page-dark .sidebar-divider {
          background: rgba(255,255,255,0.07) !important;
        }
        .fuel-page-dark .sidebar-logout-btn {
          color: rgba(255,255,255,0.5) !important;
        }
        .fuel-page-dark .sidebar-logout-btn:hover {
          color: #ef4444 !important;
        }
        .fuel-page-dark .sidebar-user-card {
          background: rgba(255,255,255,0.03) !important;
        }
        .fuel-page-dark .sidebar-user-name {
          color: #e2e8f0 !important;
        }
      `}</style>
    </div>
  )
}

export default FuelAnalysisPage
