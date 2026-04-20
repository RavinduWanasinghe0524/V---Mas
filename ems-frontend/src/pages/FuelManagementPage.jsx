import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { fuelAPI } from '../services/api'

/* ── Inline design tokens ─────────────────────────────────────── */
const C = {
  primary:      '#6366f1',
  primaryDark:  '#4f46e5',
  primaryLight: '#eef2ff',
  primaryGlow:  'rgba(99,102,241,0.22)',
  success:      '#10b981',
  successBg:    '#d1fae5',
  successText:  '#065f46',
  warning:      '#f59e0b',
  warningBg:    '#fef3c7',
  warningText:  '#92400e',
  danger:       '#ef4444',
  dangerBg:     '#fee2e2',
  dangerText:   '#991b1b',
  border:       '#e5e7eb',
  bg:           '#f8fafc',
  white:        '#ffffff',
  gray50:       '#f9fafb',
  gray100:      '#f3f4f6',
  textPrimary:  '#111827',
  textSec:      '#374151',
  textMuted:    '#6b7280',
  textLight:    '#9ca3af',
}

/* ── Shared style helpers ─────────────────────────────────────── */
const card = {
  background: C.white,
  borderRadius: 16,
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  overflow: 'hidden',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  fontSize: '0.875rem',
  color: C.textPrimary,
  background: C.white,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: C.textSec,
  marginBottom: 6,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

/* ── Focus handlers ───────────────────────────────────────────── */
const onFocus = e => {
  e.target.style.borderColor = C.primary
  e.target.style.boxShadow = `0 0 0 3px ${C.primaryGlow}`
}
const onBlur = e => {
  e.target.style.borderColor = C.border
  e.target.style.boxShadow = 'none'
}

/* ═══════════════════════════════════════════════════════════════ */
const FuelManagementPage = () => {
  const { user } = useAuth()

  const [allLogs, setAllLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterFuelType, setFilterFuelType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [formData, setFormData] = useState({
    vehicleRegNumber: '',
    fuelType: 'Diesel',
    liters: '',
    costPerLiter: '',
    mileage: '',
    date: new Date().toISOString().split('T')[0],
    driverUsername: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const [editingLog, setEditingLog] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingLog, setDeletingLog] = useState(null)
  const [toast, setToast] = useState(null)

  const [stats, setStats] = useState({
    totalLogs: 0, totalFuel: 0, totalCost: 0, avgEfficiency: 0, vehicleCount: 0,
  })

  useEffect(() => { loadAllLogs() }, [])
  useEffect(() => { applyFilters() }, [allLogs, searchTerm, filterFuelType, filterStatus, activeTab])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadAllLogs = async () => {
    try {
      setLoading(true)
      const res = await fuelAPI.getAllFuelLogs()
      const logs = res.data.data || []
      const activeLogs = logs.filter(l => !l.isDeleted)
      const vehicleCount = [...new Set(activeLogs.map(l => l.vehicleRegNumber))].length
      setAllLogs(logs)
      calculateStats(activeLogs, vehicleCount)
    } catch (err) {
      console.error('Error loading fuel logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (logs, vehicleCount) => {
    const totalFuel = logs.reduce((s, l) => s + l.liters, 0)
    const totalCost = logs.reduce((s, l) => s + l.totalCost, 0)
    const eff = logs.filter(l => l.fuelEfficiency && l.fuelEfficiency > 0)
    const avgEfficiency = eff.length > 0
      ? eff.reduce((s, l) => s + l.fuelEfficiency, 0) / eff.length : 0
    setStats({ totalLogs: logs.length, totalFuel, totalCost, avgEfficiency, vehicleCount })
  }

  const applyFilters = () => {
    let filtered = [...allLogs]
    if (activeTab === 'deleted') { setFilteredLogs(filtered.filter(l => l.isDeleted)); return }
    filtered = filtered.filter(l => !l.isDeleted)
    if (searchTerm) filtered = filtered.filter(l => l.vehicleRegNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    if (filterFuelType !== 'all') filtered = filtered.filter(l => l.fuelType === filterFuelType)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(l => {
        if (!l.fuelEfficiency) return filterStatus === 'na'
        if (filterStatus === 'excellent') return l.fuelEfficiency > 10
        if (filterStatus === 'good') return l.fuelEfficiency > 7 && l.fuelEfficiency <= 10
        if (filterStatus === 'average') return l.fuelEfficiency > 5 && l.fuelEfficiency <= 7
        if (filterStatus === 'poor') return l.fuelEfficiency <= 5
        return true
      })
    }
    setFilteredLogs(filtered)
  }

  const handleInputChange = e => {
    const { name, value } = e.target
    if (editingLog) setEditingLog(p => ({ ...p, [name]: value }))
    else setFormData(p => ({ ...p, [name]: value }))
  }

  const handleAddFuelLog = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fuelAPI.controllerAddLog({
        vehicleRegNumber: formData.vehicleRegNumber,
        fuelType: formData.fuelType,
        liters: parseFloat(formData.liters),
        costPerLiter: parseFloat(formData.costPerLiter),
        mileage: parseFloat(formData.mileage),
        date: formData.date,
        driverUsername: formData.driverUsername || undefined,
      })
      setFormData({ vehicleRegNumber: '', fuelType: 'Diesel', liters: '', costPerLiter: '', mileage: '', date: new Date().toISOString().split('T')[0], driverUsername: '' })
      setActiveTab('all')
      await loadAllLogs()
      showToast('Fuel log added successfully!')
    } catch (err) {
      showToast('Failed to add fuel log: ' + (err.response?.data?.message || err.message), 'error')
    } finally { setSubmitting(false) }
  }

  const handleEditClick = log => setEditingLog({ ...log, date: log.date.split('T')[0] })
  const handleCancelEdit = () => setEditingLog(null)

  const handleSaveEdit = async () => {
    if (!editingLog) return
    setSubmitting(true)
    try {
      await fuelAPI.controllerUpdateLog(editingLog.id, {
        vehicleRegNumber: editingLog.vehicleRegNumber,
        fuelType: editingLog.fuelType,
        liters: parseFloat(editingLog.liters),
        costPerLiter: parseFloat(editingLog.costPerLiter),
        mileage: parseFloat(editingLog.mileage),
        date: editingLog.date,
        driverUsername: editingLog.driverUsername || undefined,
      })
      setEditingLog(null)
      await loadAllLogs()
      showToast('Fuel log updated successfully!')
    } catch (err) {
      showToast('Failed to update: ' + (err.response?.data?.message || err.message), 'error')
    } finally { setSubmitting(false) }
  }

  const handleDeleteClick = log => { setDeletingLog(log); setShowDeleteModal(true) }

  const handleConfirmDelete = async () => {
    if (!deletingLog) return
    try {
      await fuelAPI.controllerDeleteLog(deletingLog.id)
      setShowDeleteModal(false); setDeletingLog(null)
      await loadAllLogs()
      showToast('Fuel log deleted.')
    } catch (err) {
      showToast('Failed to delete: ' + (err.response?.data?.message || err.message), 'error')
      setShowDeleteModal(false); setDeletingLog(null)
    }
  }

  const effBadge = eff => {
    if (!eff) return { label: 'N/A', bg: C.gray100, color: C.textMuted }
    if (eff > 10) return { label: 'Excellent', bg: '#d1fae5', color: '#065f46' }
    if (eff > 7)  return { label: 'Good',      bg: C.primaryLight, color: C.primaryDark }
    if (eff > 5)  return { label: 'Average',   bg: C.warningBg, color: C.warningText }
    return              { label: 'Poor',       bg: C.dangerBg, color: C.dangerText }
  }

  /* ── Loading state ─────────────────────────────────────────── */
  if (loading) return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Fuel Management" subtitle="Home / Fuel Management" />
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: `4px solid ${C.primaryLight}`, borderTopColor: C.primary, animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: C.textMuted, fontWeight: 600 }}>Loading fuel data…</p>
          </div>
        </div>
      </div>
    </div>
  )

  const deletedCount = allLogs.filter(l => l.isDeleted).length

  /* ── Main render ───────────────────────────────────────────── */
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Fuel Management" subtitle="Home / Fuel Management" />
        <div className="page-body">

          {/* ── Toast ──────────────────────────────────────────── */}
          {toast && (
            <div style={{
              position: 'fixed', top: 24, right: 28, zIndex: 9999,
              padding: '14px 22px', borderRadius: 12,
              background: toast.type === 'error' ? C.dangerBg : '#ecfdf5',
              color: toast.type === 'error' ? C.dangerText : C.successText,
              border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#6ee7b7'}`,
              fontWeight: 600, fontSize: '0.875rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              animation: 'fadeUp 0.25s ease both',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: '1.1rem' }}>{toast.type === 'error' ? '❌' : '✅'}</span>
              {toast.msg}
            </div>
          )}

          {/* ── Hero Banner ────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #818cf8 100%)',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
          }}>
            {/* decorative circles */}
            {[['80%','−20px','180px','rgba(255,255,255,0.06)'],['20%','60%','120px','rgba(255,255,255,0.08)'],['55%','80%','90px','rgba(255,255,255,0.05)']].map(([t,l,s,bg],i) => (
              <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, width: 48, height: 48, display:'flex', alignItems:'center', justifyContent:'center', fontSize: '1.5rem', backdropFilter:'blur(4px)' }}>⛽</div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fuel Management</h1>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>Monitor, manage & analyse fleet fuel consumption</p>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:12, flexShrink:0 }}>
                <div style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(6px)', borderRadius:12, padding:'12px 20px', textAlign:'center', border:'1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#fff', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{stats.totalLogs}</div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.7)', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>Total Logs</div>
                </div>
                <div style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(6px)', borderRadius:12, padding:'12px 20px', textAlign:'center', border:'1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#fff', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{stats.vehicleCount}</div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.7)', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>Vehicles</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stat Cards ─────────────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
            {[
              { label:'Total Fuel', value:`${stats.totalFuel.toFixed(1)} L`, icon:'⛽', grad:'linear-gradient(135deg,#ff9a56,#f97316)', glow:'rgba(249,115,22,0.2)' },
              { label:'Total Cost', value:`Rs. ${Math.round(stats.totalCost).toLocaleString()}`, icon:'💰', grad:'linear-gradient(135deg,#34d399,#10b981)', glow:'rgba(16,185,129,0.2)' },
              { label:'Avg Efficiency', value: stats.avgEfficiency > 0 ? `${stats.avgEfficiency.toFixed(2)} km/L` : 'N/A', icon:'📊', grad:'linear-gradient(135deg,#818cf8,#6366f1)', glow:C.primaryGlow },
              { label:'Active Vehicles', value: stats.vehicleCount, icon:'🚗', grad:'linear-gradient(135deg,#60a5fa,#3b82f6)', glow:'rgba(59,130,246,0.2)' },
              { label:'Deleted Logs', value: deletedCount, icon:'🗑️', grad:'linear-gradient(135deg,#f87171,#ef4444)', glow:'rgba(239,68,68,0.2)' },
            ].map(s => (
              <div key={s.label} style={{
                background: C.white, borderRadius: 16, border:`1px solid ${C.border}`,
                padding: '20px 22px', transition:'all 0.25s ease', boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                cursor:'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${s.glow}` }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p style={{ fontSize:'0.7rem', fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>{s.label}</p>
                    <p style={{ fontSize:'1.55rem', fontWeight:800, color:C.textPrimary, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1 }}>{s.value}</p>
                  </div>
                  <div style={{ width:44, height:44, borderRadius:12, background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', boxShadow:`0 4px 12px ${s.glow}`, flexShrink:0 }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tabs ───────────────────────────────────────────── */}
          <div style={{ display:'flex', gap:6, marginBottom:24, background:C.gray100, borderRadius:12, padding:5, width:'fit-content' }}>
            {[
              { id:'all', label:'All Logs', icon:'📋' },
              { id:'add', label:'Add Log', icon:'➕' },
              { id:'deleted', label:`Deleted (${deletedCount})`, icon:'🗑️', danger:true },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding:'9px 20px', borderRadius:9, border:'none', cursor:'pointer',
                fontWeight:600, fontSize:'0.85rem', transition:'all 0.18s ease',
                display:'flex', alignItems:'center', gap:7,
                background: activeTab === t.id ? (t.danger ? C.danger : C.primary) : 'transparent',
                color: activeTab === t.id ? '#fff' : t.danger ? C.danger : C.textMuted,
                boxShadow: activeTab === t.id ? (t.danger ? '0 4px 12px rgba(239,68,68,0.35)' : `0 4px 12px ${C.primaryGlow}`) : 'none',
              }}>
                <span style={{ fontSize:'0.9rem' }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════
              ALL LOGS TAB
          ══════════════════════════════════════════════════════ */}
          {activeTab === 'all' && (
            <>
              {/* Filters */}
              <div style={{ ...card, padding:'18px 22px', marginBottom:20, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:240, position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:'0.9rem', pointerEvents:'none' }}>🔍</span>
                  <input
                    type="text" placeholder="Search by vehicle reg…"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    style={{ ...inputStyle, paddingLeft:36 }}
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </div>
                <select value={filterFuelType} onChange={e => setFilterFuelType(e.target.value)}
                  style={{ ...inputStyle, width:'auto', minWidth:140, cursor:'pointer' }}
                  onFocus={onFocus} onBlur={onBlur}>
                  <option value="all">All Fuel Types</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ ...inputStyle, width:'auto', minWidth:140, cursor:'pointer' }}
                  onFocus={onFocus} onBlur={onBlur}>
                  <option value="all">All Efficiency</option>
                  <option value="excellent">Excellent (&gt;10 km/L)</option>
                  <option value="good">Good (7–10)</option>
                  <option value="average">Average (5–7)</option>
                  <option value="poor">Poor (&lt;5)</option>
                  <option value="na">N/A</option>
                </select>
                <button onClick={() => { setSearchTerm(''); setFilterFuelType('all'); setFilterStatus('all') }}
                  className="btn btn-secondary btn-sm">
                  Clear
                </button>
              </div>

              {/* Table Card */}
              <div style={card}>
                <div style={{ padding:'18px 24px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <h3 style={{ margin:0, fontWeight:700, color:C.textPrimary, fontSize:'0.95rem' }}>Fleet Fuel Logs</h3>
                    <p style={{ margin:'3px 0 0', fontSize:'0.78rem', color:C.textLight }}>{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found</p>
                  </div>
                  <button onClick={() => setActiveTab('add')} className="btn btn-primary btn-sm">+ Add Log</button>
                </div>

                <div style={{ overflowX:'auto' }}>
                  {filteredLogs.length === 0 ? (
                    <div style={{ padding:60, textAlign:'center', color:C.textLight }}>
                      <div style={{ fontSize:'3.5rem', marginBottom:12, opacity:0.4 }}>⛽</div>
                      <p style={{ fontWeight:700, fontSize:'1rem', color:C.textMuted, marginBottom:6 }}>No fuel logs found</p>
                      <p style={{ fontSize:'0.85rem' }}>Try clearing your filters or add a new entry.</p>
                    </div>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.845rem' }}>
                      <thead style={{ background: C.gray50 }}>
                        <tr>
                          {['Vehicle','Date','Fuel Type','Liters','Cost/L','Total Cost','Mileage','Efficiency','Uploaded By','Status','Actions'].map(h => (
                            <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:700, color:C.textMuted, fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log, i) => {
                          const badge = effBadge(log.fuelEfficiency)
                          return (
                            <tr key={log.id}
                              style={{ borderBottom:`1px solid ${C.gray100}`, background: i%2===0 ? C.white : C.gray50, transition:'background 0.12s' }}
                              onMouseEnter={e => e.currentTarget.style.background='#eef2ff'}
                              onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? C.white : C.gray50}>

                              <td style={{ padding:'12px 14px' }}>
                                <span style={{ fontWeight:700, color:C.primary, background:C.primaryLight, padding:'4px 10px', borderRadius:8, fontSize:'0.78rem', letterSpacing:'0.02em' }}>{log.vehicleRegNumber}</span>
                              </td>
                              <td style={{ padding:'12px 14px', color:C.textSec, whiteSpace:'nowrap' }}>
                                {new Date(log.date).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}
                              </td>
                              <td style={{ padding:'12px 14px' }}>
                                <span style={{
                                  padding:'4px 11px', borderRadius:20, fontSize:'0.72rem', fontWeight:700,
                                  background: log.fuelType==='Diesel' ? '#e0e7ff' : '#fff7ed',
                                  color: log.fuelType==='Diesel' ? '#3730a3' : '#c2410c',
                                  border: `1px solid ${log.fuelType==='Diesel' ? '#c7d2fe' : '#fed7aa'}`,
                                }}>{log.fuelType}</span>
                              </td>
                              <td style={{ padding:'12px 14px', fontWeight:600, color:C.textPrimary }}>{log.liters.toFixed(2)} L</td>
                              <td style={{ padding:'12px 14px', color:C.textMuted }}>Rs. {log.costPerLiter.toFixed(2)}</td>
                              <td style={{ padding:'12px 14px', fontWeight:700, color:C.textPrimary }}>Rs. {log.totalCost.toLocaleString()}</td>
                              <td style={{ padding:'12px 14px', color:C.textMuted }}>{log.mileage.toFixed(1)} km</td>
                              <td style={{ padding:'12px 14px' }}>
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:700, background:badge.bg, color:badge.color, whiteSpace:'nowrap', width:'fit-content' }}>
                                    {badge.label}{log.fuelEfficiency ? ` · ${log.fuelEfficiency.toFixed(1)}` : ''}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding:'12px 14px', color:C.textSec, fontSize:'0.8rem', fontWeight:600 }}>
                                {log.uploadedBy || log.driverUsername || '—'}
                              </td>
                              <td style={{ padding:'12px 14px' }}>
                                {log.isUpdated ? (
                                  <span title={log.updatedBy ? `Updated by ${log.updatedBy}` : 'Updated'}
                                    style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, background:'#ede9fe', color:'#6d28d9', border:'1px solid #ddd6fe', cursor:'help', whiteSpace:'nowrap' }}>
                                    ✏️ {log.updatedBy ? `by ${log.updatedBy}` : 'Edited'}
                                  </span>
                                ) : (
                                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, background:C.successBg, color:C.successText, border:'1px solid #6ee7b7', whiteSpace:'nowrap' }}>
                                    ✓ Original
                                  </span>
                                )}
                              </td>
                              <td style={{ padding:'12px 14px' }}>
                                <div style={{ display:'flex', gap:6 }}>
                                  <button onClick={() => handleEditClick(log)}
                                    style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, color:C.primary, fontSize:'0.75rem', fontWeight:700, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background=C.primaryLight; e.currentTarget.style.borderColor=C.primary }}
                                    onMouseLeave={e => { e.currentTarget.style.background=C.white; e.currentTarget.style.borderColor=C.border }}>
                                    ✏️ Edit
                                  </button>
                                  <button onClick={() => handleDeleteClick(log)}
                                    style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #fecaca', background:C.white, color:C.danger, fontSize:'0.75rem', fontWeight:700, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background=C.dangerBg }}
                                    onMouseLeave={e => { e.currentTarget.style.background=C.white }}>
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              DELETED LOGS TAB
          ══════════════════════════════════════════════════════ */}
          {activeTab === 'deleted' && (
            <div style={card}>
              <div style={{ padding:'18px 24px 14px', borderBottom:`1px solid #fecaca`, background:'#fff5f5' }}>
                <h3 style={{ margin:0, fontWeight:700, color:C.danger, fontSize:'0.95rem' }}>🗑️ Soft-Deleted Fuel Logs</h3>
                <p style={{ margin:'3px 0 0', fontSize:'0.78rem', color:C.textLight }}>Retained for audit — {filteredLogs.length} record{filteredLogs.length!==1?'s':''}</p>
              </div>
              <div style={{ overflowX:'auto' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ padding:60, textAlign:'center', color:C.textLight }}>
                    <div style={{ fontSize:'3rem', marginBottom:12, opacity:0.35 }}>🗑️</div>
                    <p style={{ fontWeight:700, color:C.textMuted }}>No deleted logs</p>
                    <p style={{ fontSize:'0.85rem' }}>Nothing has been deleted yet.</p>
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.845rem' }}>
                    <thead style={{ background:'#fef2f2' }}>
                      <tr>
                        {['Vehicle','Fuel Type','Liters','Total Cost','Date','Uploaded By','Deleted At'].map(h => (
                          <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:700, color:'#991b1b', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid #fecaca' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, i) => (
                        <tr key={log.id} style={{ borderBottom:'1px solid #fee2e2', background: i%2===0 ? '#fff8f8' : C.white, opacity:0.88 }}>
                          <td style={{ padding:'12px 14px', fontWeight:700, color:C.danger }}>{log.vehicleRegNumber}</td>
                          <td style={{ padding:'12px 14px' }}>
                            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:700, background:C.dangerBg, color:C.dangerText }}>{log.fuelType}</span>
                          </td>
                          <td style={{ padding:'12px 14px', color:C.textMuted }}>{log.liters.toFixed(2)} L</td>
                          <td style={{ padding:'12px 14px', fontWeight:700, color:C.textSec }}>Rs. {log.totalCost.toLocaleString()}</td>
                          <td style={{ padding:'12px 14px', color:C.textMuted }}>{new Date(log.date).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</td>
                          <td style={{ padding:'12px 14px', color:C.textMuted, fontWeight:600 }}>{log.uploadedBy || log.driverUsername || '—'}</td>
                          <td style={{ padding:'12px 14px' }}>
                            {log.deletedAt ? (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:700, background:C.dangerBg, color:C.dangerText, border:'1px solid #fecaca', whiteSpace:'nowrap' }}>
                                {new Date(log.deletedAt).toLocaleString()}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              ADD LOG TAB
          ══════════════════════════════════════════════════════ */}
          {activeTab === 'add' && (
            <div style={{ ...card, padding:0 }}>
              {/* Form header */}
              <div style={{ padding:'22px 28px 18px', borderBottom:`1px solid ${C.border}`, background:'linear-gradient(135deg,#f8fafc,#eef2ff)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#818cf8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', boxShadow:`0 4px 12px ${C.primaryGlow}` }}>⛽</div>
                  <div>
                    <h3 style={{ margin:0, fontWeight:800, color:C.textPrimary, fontSize:'1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Add New Fuel Log</h3>
                    <p style={{ margin:0, fontSize:'0.78rem', color:C.textMuted }}>Fill in all required fields to record a new fuel entry</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddFuelLog} style={{ padding:'28px 28px 24px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20, marginBottom:24 }}>
                  {/* Vehicle Reg */}
                  <div>
                    <label style={labelStyle}>Vehicle Registration <span style={{ color:C.danger }}>*</span></label>
                    <input type="text" name="vehicleRegNumber" value={formData.vehicleRegNumber} onChange={handleInputChange} required placeholder="e.g. WP-CAB-1234" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Fuel Type */}
                  <div>
                    <label style={labelStyle}>Fuel Type <span style={{ color:C.danger }}>*</span></label>
                    <select name="fuelType" value={formData.fuelType} onChange={handleInputChange} required style={{ ...inputStyle, cursor:'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="Diesel">⛽ Diesel</option>
                      <option value="Petrol">⛽ Petrol</option>
                    </select>
                  </div>
                  {/* Liters */}
                  <div>
                    <label style={labelStyle}>Liters <span style={{ color:C.danger }}>*</span></label>
                    <input type="number" name="liters" value={formData.liters} onChange={handleInputChange} step="0.01" min="0" required placeholder="e.g. 45.5" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Cost per Liter */}
                  <div>
                    <label style={labelStyle}>Cost per Liter (LKR) <span style={{ color:C.danger }}>*</span></label>
                    <input type="number" name="costPerLiter" value={formData.costPerLiter} onChange={handleInputChange} step="0.01" min="0" required placeholder="e.g. 380.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Mileage */}
                  <div>
                    <label style={labelStyle}>Current Mileage (km) <span style={{ color:C.danger }}>*</span></label>
                    <input type="number" name="mileage" value={formData.mileage} onChange={handleInputChange} step="0.1" min="0" required placeholder="e.g. 15250.5" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Date */}
                  <div>
                    <label style={labelStyle}>Date <span style={{ color:C.danger }}>*</span></label>
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={{ ...inputStyle, cursor:'pointer' }} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Driver Username — full width */}
                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={labelStyle}>Driver Username <span style={{ color:C.textLight, fontWeight:400, textTransform:'none', fontSize:'0.78rem' }}>(optional)</span></label>
                    <input type="text" name="driverUsername" value={formData.driverUsername} onChange={handleInputChange} placeholder="e.g. driver1 — leave blank if unassigned" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>

                <div style={{ display:'flex', gap:12 }}>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex:1 }}>
                    {submitting ? '⏳ Adding…' : '✓ Add Fuel Log'}
                  </button>
                  <button type="button" onClick={() => setActiveTab('all')} className="btn btn-secondary" style={{ flex:0.35 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              EDIT MODAL
          ══════════════════════════════════════════════════════ */}
          {editingLog && (
            <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, animation:'fadeIn 0.15s ease' }}>
              <div style={{ background:C.white, borderRadius:20, padding:0, maxWidth:580, width:'92%', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)', animation:'scaleIn 0.2s ease' }}>
                {/* Modal header */}
                <div style={{ padding:'22px 28px 16px', borderBottom:`1px solid ${C.border}`, background:'linear-gradient(135deg,#f8fafc,#eef2ff)', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#818cf8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>✏️</div>
                    <div>
                      <h3 style={{ margin:0, fontWeight:800, color:C.textPrimary, fontSize:'0.95rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Edit Fuel Log</h3>
                      <p style={{ margin:0, fontSize:'0.75rem', color:C.textMuted }}>{editingLog.vehicleRegNumber}</p>
                    </div>
                  </div>
                  <button onClick={handleCancelEdit} style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:C.textMuted, lineHeight:1, padding:4 }}>✕</button>
                </div>

                <div style={{ padding:'24px 28px' }}>
                  <div style={{ display:'grid', gap:16, marginBottom:24 }}>
                    <div>
                      <label style={labelStyle}>Vehicle Registration</label>
                      <input type="text" value={editingLog.vehicleRegNumber} readOnly style={{ ...inputStyle, background:C.gray50, color:C.textMuted, cursor:'not-allowed' }} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      <div>
                        <label style={labelStyle}>Liters</label>
                        <input type="number" name="liters" value={editingLog.liters} onChange={handleInputChange} step="0.01" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Cost per Liter (LKR)</label>
                        <input type="number" name="costPerLiter" value={editingLog.costPerLiter} onChange={handleInputChange} step="0.01" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Fuel Type</label>
                        <select name="fuelType" value={editingLog.fuelType} onChange={handleInputChange} style={{ ...inputStyle, cursor:'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                          <option value="Diesel">⛽ Diesel</option>
                          <option value="Petrol">⛽ Petrol</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Mileage (km)</label>
                        <input type="number" name="mileage" value={editingLog.mileage} onChange={handleInputChange} step="0.1" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Date</label>
                        <input type="date" name="date" value={editingLog.date} onChange={handleInputChange} style={{ ...inputStyle, cursor:'pointer' }} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Driver Username <span style={{ color:C.textLight, fontWeight:400, textTransform:'none' }}>(optional)</span></label>
                        <input type="text" name="driverUsername" value={editingLog.driverUsername || ''} onChange={handleInputChange} placeholder="e.g. driver1" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:12 }}>
                    <button onClick={handleSaveEdit} disabled={submitting} className="btn btn-primary" style={{ flex:1 }}>
                      {submitting ? '⏳ Saving…' : '✓ Save Changes'}
                    </button>
                    <button onClick={handleCancelEdit} className="btn btn-secondary" style={{ flex:0.4 }}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              DELETE MODAL
          ══════════════════════════════════════════════════════ */}
          {showDeleteModal && (
            <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, animation:'fadeIn 0.15s ease' }}>
              <div style={{ background:C.white, borderRadius:20, padding:36, maxWidth:420, width:'92%', boxShadow:'0 24px 60px rgba(0,0,0,0.2)', animation:'scaleIn 0.2s ease', textAlign:'center' }}>
                <div style={{ width:64, height:64, borderRadius:20, background:C.dangerBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', margin:'0 auto 20px' }}>⚠️</div>
                <h3 style={{ margin:'0 0 10px', fontWeight:800, color:C.textPrimary, fontSize:'1.1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Delete Fuel Log?</h3>
                <p style={{ margin:'0 0 24px', color:C.textMuted, fontSize:'0.9rem', lineHeight:1.6 }}>
                  This will soft-delete the log for <strong style={{ color:C.textPrimary }}>{deletingLog?.vehicleRegNumber}</strong>. It will be retained in the Deleted Logs tab for audit purposes.
                </p>
                <div style={{ display:'flex', gap:12 }}>
                  <button onClick={() => { setShowDeleteModal(false); setDeletingLog(null) }} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
                  <button onClick={handleConfirmDelete}
                    style={{ flex:1, padding:'10px 20px', borderRadius:8, border:'none', background:C.danger, color:'#fff', fontSize:'0.9rem', fontWeight:700, cursor:'pointer', transition:'all 0.15s', boxShadow:'0 4px 12px rgba(239,68,68,0.35)' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#dc2626'; e.currentTarget.style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background=C.danger; e.currentTarget.style.transform='translateY(0)' }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default FuelManagementPage
