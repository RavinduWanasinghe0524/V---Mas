import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { fuelAPI } from '../services/api'
import { Fuel, CircleDollarSign, BarChart2, Car, Check, X, Plus, Loader2 } from 'lucide-react'

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
  indigo:    '#818cf8',
  indigoDim: 'rgba(129,140,248,0.15)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.15)',
  green:     '#4ade80',
  greenDim:  'rgba(74,222,128,0.15)',
  gold:      '#fbbf24',
  goldDim:   'rgba(251,191,36,0.15)',
  blue:      '#60a5fa',
  blueDim:   'rgba(96,165,250,0.15)',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1px solid rgba(255,255,255,0.1)`,
  fontSize: '0.85rem',
  color: D.text,
  background: 'rgba(255,255,255,0.05)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: '0.78rem',
  fontWeight: 700,
  color: D.textSub,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
}

const onFocus = e => {
  e.target.style.borderColor = 'rgba(99,102,241,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
  e.target.style.boxShadow = 'none'
}

const FuelLogPage = () => {
  const { user } = useAuth()
  
  // State for fuel logs
  const [myVehicleLogs, setMyVehicleLogs] = useState([])
  const [loading, setLoading] = useState(true)
  
  // State for Add Fuel Log Form
  const [formData, setFormData] = useState({
    vehicleRegNumber: user?.vehicleRegNumber || '',
    fuelType: 'Diesel',
    liters: '',
    costPerLiter: '',
    mileage: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Load fuel logs
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true)
        // Driver-scoped endpoint: GET /api/fuel/my-logs
        const logsRes = await fuelAPI.getMyLogs()
        setMyVehicleLogs(logsRes.data.data || [])
      } catch (error) {
        console.error('Error loading fuel logs:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadLogs()
  }, [user])

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle form submit
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
      
      await fuelAPI.addFuelLog(payload)
      
      // Reload driver's own logs via the correct endpoint
      const logsRes = await fuelAPI.getMyLogs()
      setMyVehicleLogs(logsRes.data.data || [])
      
      // Reset form
      setFormData({
        vehicleRegNumber: user?.vehicleRegNumber || '',
        fuelType: 'Diesel',
        liters: '',
        costPerLiter: '',
        mileage: '',
        date: new Date().toISOString().split('T')[0]
      })
      setShowForm(false)
      
      alert('Fuel log added successfully!')
    } catch (error) {
      console.error('Error adding fuel log:', error)
      alert('Failed to add fuel log: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate statistics
  const totalLiters = myVehicleLogs.reduce((sum, log) => sum + log.liters, 0)
  const totalCost = myVehicleLogs.reduce((sum, log) => sum + log.totalCost, 0)
  const avgEfficiency = myVehicleLogs.filter(log => log.fuelEfficiency).length > 0
    ? myVehicleLogs.filter(log => log.fuelEfficiency).reduce((sum, log) => sum + log.fuelEfficiency, 0) / myVehicleLogs.filter(log => log.fuelEfficiency).length
    : 0
  const lastMileage = myVehicleLogs.length > 0 ? myVehicleLogs[0].mileage : 0

  if (loading) {
    return (
      <div className="app-shell fuel-dark-wrapper" style={{ background: D.bg }}>
        <Sidebar />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="Fuel Log" subtitle="Home / Fuel Log" />
          <div className="page-body" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
            <div style={{ color:D.indigo, fontSize:'1rem', fontWeight:600 }}>Loading fuel logs...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell fuel-dark-wrapper" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Log" subtitle="Home / Fuel Log" />
        <div className="page-body">

          {/* Welcome Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: `1px solid ${D.border}`
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
                  My Fuel Log
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                  Track your vehicle's fuel consumption and monitor efficiency over time.
                </p>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Fuel (L)', value: totalLiters.toFixed(1), icon: <Fuel size={20}/>, colorDim: D.purpleDim, colorHex: D.purple },
              { label: 'Total Spent (LKR)', value: `Rs. ${Math.round(totalCost).toLocaleString()}`, icon: <CircleDollarSign size={20}/>, colorDim: D.greenDim, colorHex: D.green },
              { label: 'Avg Efficiency', value: avgEfficiency > 0 ? `${avgEfficiency.toFixed(2)} km/L` : 'N/A', icon: <BarChart2 size={20}/>, colorDim: D.indigoDim, colorHex: D.indigo },
              { label: 'Last Mileage', value: lastMileage > 0 ? `${lastMileage.toFixed(0)} km` : 'N/A', icon: <Car size={20}/>, colorDim: D.goldDim, colorHex: D.gold },
            ].map(s => (
              <div key={s.label} style={{
                background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
                padding: '20px 22px', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                cursor: 'default'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=D.borderHi; e.currentTarget.style.boxShadow=`0 8px 24px ${s.colorDim}` }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=D.border; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{s.value}</p>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.colorDim, color: s.colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${s.colorDim}`, flexShrink: 0, border: `1px solid ${s.colorHex}30` }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Fuel Log Button */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setShowForm(!showForm)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)' }}
            >
              {showForm ? <><X size={16}/> Cancel</> : <><Plus size={16}/> Add New Fuel Log</>}
            </button>
          </div>

          {/* Add Fuel Log Form */}
          {showForm && (
            <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: 28, marginBottom: 24, animation: 'fadeUp 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: D.indigoDim, color: D.indigo, border: `1px solid ${D.indigo}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Fuel size={20} />
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Add Fuel Log Entry</h3>
              </div>
              
              <form onSubmit={handleAddFuelLog}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
                  <div>
                    <label style={labelStyle}>Vehicle Registration Number *</label>
                    <input 
                      type="text" 
                      name="vehicleRegNumber" 
                      value={formData.vehicleRegNumber} 
                      onChange={handleInputChange}
                      required 
                      readOnly={!!user?.vehicleRegNumber}
                      placeholder="e.g., WP-CAB-1234"
                      style={{ ...inputStyle, background: user?.vehicleRegNumber ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)' }}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Fuel Type *</label>
                    <select 
                      name="fuelType" 
                      value={formData.fuelType} 
                      onChange={handleInputChange}
                      required
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      onFocus={onFocus} onBlur={onBlur}
                    >
                      <option value="Diesel" style={{ background: D.surfaceHi }}>Diesel</option>
                      <option value="Petrol" style={{ background: D.surfaceHi }}>Petrol</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Liters *</label>
                    <input 
                      type="number" 
                      name="liters" 
                      value={formData.liters} 
                      onChange={handleInputChange}
                      step="0.01" min="0" required
                      placeholder="e.g., 45.5"
                      style={inputStyle}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Cost per Liter (LKR) *</label>
                    <input 
                      type="number" 
                      name="costPerLiter" 
                      value={formData.costPerLiter} 
                      onChange={handleInputChange}
                      step="0.01" min="0" required
                      placeholder="e.g., 380.00"
                      style={inputStyle}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Current Mileage (km) *</label>
                    <input 
                      type="number" 
                      name="mileage" 
                      value={formData.mileage} 
                      onChange={handleInputChange}
                      step="0.1" min="0" required
                      placeholder="e.g., 15250.5"
                      style={inputStyle}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Date *</label>
                    <input 
                      type="date" 
                      name="date" 
                      value={formData.date} 
                      onChange={handleInputChange}
                      required
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: submitting ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, boxShadow: submitting ? 'none' : '0 4px 16px rgba(99,102,241,0.4)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {submitting ? <><Loader2 size={16} className="animate-spin"/> Submitting...</> : <><Check size={16}/> Add Fuel Log</>}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    style={{ flex: 0.3, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Fuel Logs Table */}
          <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${D.border}` }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem' }}>Fuel Log History</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: D.textSub }}>
                {myVehicleLogs.length} {myVehicleLogs.length === 1 ? 'entry' : 'entries'} recorded
              </p>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              {myVehicleLogs.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: D.textSub }}>
                  <div style={{ marginBottom: 16, opacity: 0.3, display: 'flex', justifyContent: 'center' }}><Fuel size={48} /></div>
                  <h4 style={{ margin: '0 0 8px', fontWeight: 600, color: D.text }}>No Fuel Logs Yet</h4>
                  <p style={{ fontSize: '0.9rem', marginBottom: 20 }}>Start tracking your vehicle's fuel consumption by adding your first log entry.</p>
                  <button 
                    onClick={() => setShowForm(true)}
                    style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Your First Fuel Log
                  </button>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: D.surfaceHi }}>
                    <tr>
                      {['Date', 'Fuel Type', 'Liters', 'Cost/L', 'Total Cost', 'Mileage', 'Efficiency', 'Status'].map(h => (
                        <th key={h} style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          fontWeight: 700, 
                          color: D.textSub, 
                          fontSize: '0.75rem', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: `1px solid ${D.border}`
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myVehicleLogs.map((log, i) => (
                      <tr key={log.id} style={{ 
                        borderBottom: `1px solid ${D.border}`, 
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                      >
                        <td style={{ padding: '14px 16px', color: D.text, fontWeight: 500 }}>
                          {new Date(log.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: 6, 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            background: log.fuelType === 'Diesel' ? D.indigoDim : D.goldDim, 
                            color: log.fuelType === 'Diesel' ? D.indigo : D.gold,
                            border: `1px solid ${log.fuelType === 'Diesel' ? 'rgba(129,140,248,0.3)' : 'rgba(251,191,36,0.3)'}`
                          }}>
                            {log.fuelType}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: D.text, fontWeight: 600 }}>{log.liters.toFixed(2)} L</td>
                        <td style={{ padding: '14px 16px', color: D.textSub }}>Rs. {log.costPerLiter.toFixed(2)}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: D.text }}>Rs. {log.totalCost.toLocaleString()}</td>
                        <td style={{ padding: '14px 16px', color: D.textSub }}>{log.mileage.toFixed(1)} km</td>
                        <td style={{ padding: '14px 16px' }}>
                          {log.fuelEfficiency ? (
                            <span style={{ 
                              fontWeight: 700, 
                              color: log.fuelEfficiency > 10 ? D.green : log.fuelEfficiency > 5 ? D.indigo : D.gold 
                            }}>
                              {log.fuelEfficiency.toFixed(2)} km/L
                            </span>
                          ) : (
                            <span style={{ color: D.textFaint, fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {log.fuelEfficiency ? (
                            log.fuelEfficiency > 10 ? (
                              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: D.greenDim, color: D.green, border: '1px solid rgba(74,222,128,0.3)' }}>Excellent</span>
                            ) : log.fuelEfficiency > 7 ? (
                              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: D.blueDim, color: D.blue, border: '1px solid rgba(96,165,250,0.3)' }}>Good</span>
                            ) : log.fuelEfficiency > 5 ? (
                              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: D.goldDim, color: D.gold, border: '1px solid rgba(251,191,36,0.3)' }}>Average</span>
                            ) : (
                              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: D.redDim, color: D.red, border: '1px solid rgba(248,113,113,0.3)' }}>Poor</span>
                            )
                          ) : (
                            <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', color: D.textSub, border: `1px solid ${D.border}` }}>N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
      <style>{`
        .fuel-dark-wrapper .topbar { background: #161b27 !important; border-bottom-color: rgba(255,255,255,0.07) !important; }
        .fuel-dark-wrapper .topbar-title { color: #e2e8f0 !important; }
        .fuel-dark-wrapper .topbar-breadcrumb { color: #475569 !important; }
        .fuel-dark-wrapper .topbar-user { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; color: #e2e8f0 !important; }
        .fuel-dark-wrapper .topbar-user:hover { background: rgba(99,102,241,0.15) !important; border-color: rgba(99,102,241,0.4) !important; }
        .fuel-dark-wrapper .topbar-name { color: #e2e8f0 !important; }
        .fuel-dark-wrapper .sidebar { background: #111827 !important; border-right-color: rgba(255,255,255,0.07) !important; }
        .fuel-dark-wrapper .sidebar-header { border-bottom-color: rgba(255,255,255,0.07) !important; }
        .fuel-dark-wrapper .sidebar-title { color: #f1f5f9 !important; }
        .fuel-dark-wrapper .sidebar-subtitle { color: #475569 !important; }
        .fuel-dark-wrapper .nav-section-label { color: #334155 !important; }
        .fuel-dark-wrapper .nav-item { color: #64748b !important; }
        .fuel-dark-wrapper .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: #cbd5e1 !important; }
        .fuel-dark-wrapper .nav-item.active { background: rgba(99,102,241,0.18) !important; color: #a5b4fc !important; }
        .fuel-dark-wrapper .sidebar-divider { background: rgba(255,255,255,0.07) !important; }
        .fuel-dark-wrapper .sidebar-logout-btn { color: rgba(255,255,255,0.4) !important; }
        .fuel-dark-wrapper .sidebar-logout-btn:hover { color: #f87171 !important; }
        .fuel-dark-wrapper .sidebar-user-card { background: rgba(255,255,255,0.03) !important; }
        .fuel-dark-wrapper .sidebar-footer { border-top-color: rgba(255,255,255,0.07) !important; }
        
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; }
      `}</style>
    </div>
  )
}

export default FuelLogPage
