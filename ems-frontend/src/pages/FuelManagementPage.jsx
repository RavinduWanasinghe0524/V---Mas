import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { fuelAPI, vehicleAPI, userAPI } from '../services/api'
import { Fuel, CircleDollarSign, BarChart2, Car, Trash2, ClipboardList, Plus, Search, Edit2, AlertTriangle, Check, X, Loader2 } from 'lucide-react'


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const FuelManagementPage = () => {
  const D = useD()
  const { user } = useAuth()

  const card = {
    background: D.surface,
    borderRadius: 16,
    border: `1px solid ${D.border}`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${D.inputBorder}`,
    fontSize: '0.875rem',
    color: D.text,
    background: D.inputBg,
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: D.textSub,
    marginBottom: 6,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  }

  const onFocus = e => {
    e.target.style.borderColor = D.purple
    e.target.style.boxShadow = `0 0 0 3px ${D.purpleDim}`
  }
  const onBlur = e => {
    e.target.style.borderColor = D.inputBorder
    e.target.style.boxShadow = 'none'
  }

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
  const [vehicles, setVehicles] = useState([])
  const [driversList, setDriversList] = useState([])

  const [stats, setStats] = useState({
    totalLogs: 0, totalFuel: 0, totalCost: 0, avgEfficiency: 0, vehicleCount: 0,
  })

  useEffect(() => { loadAllLogs() }, [])
  useEffect(() => {
    vehicleAPI.getAllVehicles().then(r => setVehicles(r.data.data || [])).catch(() => {})
    userAPI.getAllDrivers().then(r => setDriversList(r.data.data || [])).catch(() => {})
  }, [])
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

  // When a vehicle is selected in the Add form, auto-fill the assigned driver
  const handleVehicleSelect = e => {
    const regNo = e.target.value
    const selected = vehicles.find(v => v.registrationNo === regNo)
    // Convert PETROL → Petrol, DIESEL → Diesel, etc.
    const fuelType = selected?.fuelType
      ? selected.fuelType.charAt(0).toUpperCase() + selected.fuelType.slice(1).toLowerCase()
      : undefined
    setFormData(p => ({
      ...p,
      vehicleRegNumber: regNo,
      ...(fuelType && { fuelType }),
      driverUsername: selected?.driverName && selected.driverName !== 'Not Assigned' ? selected.driverName : p.driverUsername,
    }))
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
    if (!eff) return { label: 'N/A', bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
    if (eff > 10) return { label: 'Excellent', bg: D.greenDim, color: D.green, border: 'rgba(74,222,128,0.3)' }
    if (eff > 7) return { label: 'Good', bg: D.blueDim, color: D.blue, border: 'rgba(96,165,250,0.3)' }
    if (eff > 5) return { label: 'Average', bg: D.goldDim, color: D.gold, border: 'rgba(251,191,36,0.3)' }
    return { label: 'Poor', bg: D.redDim, color: D.red, border: 'rgba(248,113,113,0.3)' }
  }

  /* â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (loading) return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Management" subtitle="Home / Fuel Management" />
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '4px solid rgba(167,139,250,0.2)', borderTopColor: D.purple, animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: D.textSub, fontWeight: 600 }}>Loading fuel dataâ€¦</p>
          </div>
        </div>
      </div>
    </div>
  )

  const deletedCount = allLogs.filter(l => l.isDeleted).length

  /* â”€â”€ Main render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Management" subtitle="Home / Fuel Management" />
        <div className="page-body">

          {/* â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {toast && (
            <div style={{
              position: 'fixed', top: 24, right: 28, zIndex: 9999,
              padding: '14px 22px', borderRadius: 12,
              background: toast.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)',
              color: toast.type === 'error' ? D.red : D.green,
              border: `1px solid ${toast.type === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}`,
              fontWeight: 600, fontSize: '0.875rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              animation: 'fadeUp 0.25s ease both',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>{toast.type === 'error' ? <X size={20} /> : <Check size={20} />}</span>
              {toast.msg}
            </div>
          )}

          {/* â”€â”€ Hero Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
            {[['80%', 'âˆ’20px', '180px', 'rgba(255,255,255,0.03)'], ['20%', '60%', '120px', 'rgba(255,255,255,0.04)'], ['55%', '80%', '90px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Fuel size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fuel Management</h1>
                    <p style={{ margin: 0, color: '#a5b4fc', fontSize: '0.875rem' }}>Monitor, manage & analyse fleet fuel consumption</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{stats.totalLogs}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total Logs</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{stats.vehicleCount}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Vehicles</div>
                </div>
              </div>
            </div>
          </div>

          {/* â”€â”€ Stat Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Fuel', value: `${stats.totalFuel.toFixed(1)} L`, icon: <Fuel size={20} />, iconBg: D.goldDim, iconColor: D.gold, glow: 'rgba(251,191,36,0.15)' },
              { label: 'Total Cost', value: `Rs. ${Math.round(stats.totalCost).toLocaleString()}`, icon: <CircleDollarSign size={20} />, iconBg: D.greenDim, iconColor: D.green, glow: 'rgba(74,222,128,0.15)' },
              { label: 'Avg Efficiency', value: stats.avgEfficiency > 0 ? `${stats.avgEfficiency.toFixed(2)} km/L` : 'N/A', icon: <BarChart2 size={20} />, iconBg: D.indigoDim, iconColor: D.indigo, glow: 'rgba(129,140,248,0.15)' },
              { label: 'Active Vehicles', value: stats.vehicleCount, icon: <Car size={20} />, iconBg: D.blueDim, iconColor: D.blue, glow: 'rgba(96,165,250,0.15)' },
              { label: 'Deleted Logs', value: deletedCount, icon: <Trash2 size={20} />, iconBg: D.redDim, iconColor: D.red, glow: 'rgba(248,113,113,0.15)' },
            ].map(s => (
              <div key={s.label} style={{
                background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
                padding: '20px 22px', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = D.borderHi; e.currentTarget.style.boxShadow = `0 8px 24px ${s.glow}` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{s.value}</p>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${s.glow}`, flexShrink: 0, border: `1px solid ${s.iconColor}30` }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: D.surfaceHi, borderRadius: 12, padding: 5, width: 'fit-content', border: `1px solid ${D.border}` }}>
            {[
              { id: 'all', label: 'All Logs', icon: <ClipboardList size={16} /> },
              { id: 'add', label: 'Add Log', icon: <Plus size={16} /> },
              { id: 'deleted', label: `Deleted (${deletedCount})`, icon: <Trash2 size={16} />, danger: true },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '9px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.18s ease',
                display: 'flex', alignItems: 'center', gap: 7,
                background: activeTab === t.id ? (t.danger ? 'rgba(248,113,113,0.15)' : 'rgba(99,102,241,0.2)') : 'transparent',
                color: activeTab === t.id ? (t.danger ? D.red : '#a5b4fc') : D.textSub,
                boxShadow: activeTab === t.id ? (t.danger ? `0 4px 12px rgba(248,113,113,0.15)` : `0 4px 12px rgba(99,102,241,0.15)`) : 'none',
              }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              ALL LOGS TAB
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'all' && (
            <>
              {/* Filters */}
              <div style={{ ...card, padding: '18px 22px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.textSub, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}><Search size={16} /></span>
                  <input
                    type="text" placeholder="Search by vehicle regâ€¦"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 36 }}
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </div>
                <select value={filterFuelType} onChange={e => setFilterFuelType(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', minWidth: 140, cursor: 'pointer' }}
                  onFocus={onFocus} onBlur={onBlur}>
                  <option value="all" style={{ background: D.surfaceHi }}>All Fuel Types</option>
                  <option value="Diesel" style={{ background: D.surfaceHi }}>Diesel</option>
                  <option value="Petrol" style={{ background: D.surfaceHi }}>Petrol</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', minWidth: 140, cursor: 'pointer' }}
                  onFocus={onFocus} onBlur={onBlur}>
                  <option value="all" style={{ background: D.surfaceHi }}>All Efficiency</option>
                  <option value="excellent" style={{ background: D.surfaceHi }}>Excellent (&gt;10 km/L)</option>
                  <option value="good" style={{ background: D.surfaceHi }}>Good (7â€“10)</option>
                  <option value="average" style={{ background: D.surfaceHi }}>Average (5â€“7)</option>
                  <option value="poor" style={{ background: D.surfaceHi }}>Poor (&lt;5)</option>
                  <option value="na" style={{ background: D.surfaceHi }}>N/A</option>
                </select>
                <button onClick={() => { setSearchTerm(''); setFilterFuelType('all'); setFilterStatus('all') }}
                  style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                  Clear
                </button>
              </div>

              {/* Table Card */}
              <div style={card}>
                <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem' }}>Fleet Fuel Logs</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found</p>
                  </div>
                  <button onClick={() => setActiveTab('add')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>+ Add Log</button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {filteredLogs.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: D.textSub }}>
                      <div style={{ marginBottom: 12, opacity: 0.3, display: 'flex', justifyContent: 'center' }}><Fuel size={48} /></div>
                      <p style={{ fontWeight: 700, fontSize: '1rem', color: D.text, marginBottom: 6 }}>No fuel logs found</p>
                      <p style={{ fontSize: '0.85rem' }}>Try clearing your filters or add a new entry.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.845rem' }}>
                      <thead style={{ background: D.surfaceHi }}>
                        <tr>
                          {['Vehicle', 'Date', 'Fuel Type', 'Liters', 'Cost/L', 'Total Cost', 'Mileage', 'Efficiency', 'Uploaded By', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log, i) => {
                          const badge = effBadge(log.fuelEfficiency)
                          return (
                            <tr key={log.id}
                              style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.12s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.07)'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>

                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontWeight: 700, color: D.blue, background: D.blueDim, padding: '4px 10px', borderRadius: 8, fontSize: '0.78rem', letterSpacing: '0.02em', border: `1px solid rgba(96,165,250,0.3)` }}>{log.vehicleRegNumber}</span>
                              </td>
                              <td style={{ padding: '12px 14px', color: D.textSub, whiteSpace: 'nowrap' }}>
                                {new Date(log.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  padding: '4px 11px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                                  background: log.fuelType === 'Diesel' ? D.indigoDim : D.goldDim,
                                  color: log.fuelType === 'Diesel' ? D.indigo : D.gold,
                                  border: `1px solid ${log.fuelType === 'Diesel' ? 'rgba(129,140,248,0.3)' : 'rgba(251,191,36,0.3)'}`,
                                }}>{log.fuelType}</span>
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: D.text }}>{log.liters.toFixed(2)} L</td>
                              <td style={{ padding: '12px 14px', color: D.textSub }}>Rs. {log.costPerLiter.toFixed(2)}</td>
                              <td style={{ padding: '12px 14px', fontWeight: 700, color: D.text }}>Rs. {log.totalCost.toLocaleString()}</td>
                              <td style={{ padding: '12px 14px', color: D.textSub }}>{log.mileage.toFixed(1)} km</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap', width: 'fit-content' }}>
                                    {badge.label}{log.fuelEfficiency ? ` Â· ${log.fuelEfficiency.toFixed(1)}` : ''}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', color: D.green, fontSize: '0.8rem', fontWeight: 700 }}>
                                {log.uploadedBy || log.driverUsername || 'â€”'}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                {log.isUpdated ? (
                                  <span title={log.updatedBy ? `Updated by ${log.updatedBy}` : 'Updated'}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, background: D.purpleDim, color: D.purple, border: '1px solid rgba(167,139,250,0.3)', cursor: 'help', whiteSpace: 'nowrap' }}>
                                    <Edit2 size={12} /> {log.updatedBy ? `by ${log.updatedBy}` : 'Edited'}
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, background: D.greenDim, color: D.green, border: '1px solid rgba(74,222,128,0.3)', whiteSpace: 'nowrap' }}>
                                    <Check size={12} /> Original
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => handleEditClick(log)}
                                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#a5b4fc' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text }}>
                                    <Edit2 size={14} style={{ marginRight: 6 }} /> Edit
                                  </button>
                                  <button onClick={() => handleDeleteClick(log)}
                                    style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}>
                                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
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

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              DELETED LOGS TAB
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'deleted' && (
            <div style={card}>
              <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid rgba(248,113,113,0.3)`, background: 'rgba(248,113,113,0.05)' }}>
                <h3 style={{ margin: 0, fontWeight: 700, color: D.red, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={16} /> Soft-Deleted Fuel Logs</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>Retained for audit â€” {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: D.textSub }}>
                    <div style={{ marginBottom: 12, opacity: 0.35, display: 'flex', justifyContent: 'center' }}><Trash2 size={48} /></div>
                    <p style={{ fontWeight: 700, color: D.text }}>No deleted logs</p>
                    <p style={{ fontSize: '0.85rem' }}>Nothing has been deleted yet.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.845rem' }}>
                    <thead style={{ background: D.surfaceHi }}>
                      <tr>
                        {['Vehicle', 'Fuel Type', 'Liters', 'Total Cost', 'Date', 'Uploaded By', 'Deleted At'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: D.red, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(248,113,113,0.2)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, i) => (
                        <tr key={log.id} style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: D.red }}>{log.vehicleRegNumber}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: D.redDim, color: D.red }}>{log.fuelType}</span>
                          </td>
                          <td style={{ padding: '12px 14px', color: D.text }}>{log.liters.toFixed(2)} L</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: D.text }}>Rs. {log.totalCost.toLocaleString()}</td>
                          <td style={{ padding: '12px 14px', color: D.textSub }}>{new Date(log.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                          <td style={{ padding: '12px 14px', color: D.textSub, fontWeight: 600 }}>{log.uploadedBy || log.driverUsername || 'â€”'}</td>
                          <td style={{ padding: '12px 14px' }}>
                            {log.deletedAt ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: D.redDim, color: D.red, border: '1px solid rgba(248,113,113,0.3)', whiteSpace: 'nowrap' }}>
                                {new Date(log.deletedAt).toLocaleString()}
                              </span>
                            ) : 'â€”'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              ADD LOG TAB
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'add' && (
            <div style={{ ...card, padding: 0 }}>
              {/* Form header */}
              <div style={{ padding: '22px 28px 18px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: D.purpleDim, color: D.purple, border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Fuel size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Add New Fuel Log</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: D.textSub }}>Fill in all required fields to record a new fuel entry</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddFuelLog} style={{ padding: '28px 28px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, marginBottom: 24 }}>
                  {/* Vehicle Reg */}
                  <div>
                    <label style={labelStyle}>Vehicle Registration <span style={{ color: D.red }}>*</span></label>
                    <select name="vehicleRegNumber" value={formData.vehicleRegNumber} onChange={handleVehicleSelect} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>— Select Vehicle —</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.registrationNo} style={{ background: D.surfaceHi }}>
                          {v.registrationNo}{v.driverName && v.driverName !== 'Not Assigned' ? ` (${v.driverName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Fuel Type */}
                  <div>
                    <label style={labelStyle}>Fuel Type <span style={{ color: D.red }}>*</span></label>
                    <select name="fuelType" value={formData.fuelType} onChange={handleInputChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="Diesel" style={{ background: D.surfaceHi }}>Diesel</option>
                      <option value="Petrol" style={{ background: D.surfaceHi }}>Petrol</option>
                    </select>
                  </div>
                  {/* Liters */}
                  <div>
                    <label style={labelStyle}>Liters <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="liters" value={formData.liters} onChange={handleInputChange} step="0.01" min="0" required placeholder="e.g. 45.5" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Cost per Liter */}
                  <div>
                    <label style={labelStyle}>Cost per Liter (LKR) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="costPerLiter" value={formData.costPerLiter} onChange={handleInputChange} step="0.01" min="0" required placeholder="e.g. 380.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Mileage */}
                  <div>
                    <label style={labelStyle}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="mileage" value={formData.mileage} onChange={handleInputChange} step="0.1" min="0" required placeholder="e.g. 15250.5" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Date */}
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: D.red }}>*</span></label>
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  {/* Driver Username â€” full width */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Driver Username <span style={{ color: D.textFaint, fontWeight: 400, textTransform: 'none', fontSize: '0.78rem' }}>(optional)</span></label>
                    <input type="text" name="driverUsername" value={formData.driverUsername} onChange={handleInputChange} placeholder="e.g. driver1 â€” leave blank if unassigned" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" disabled={submitting} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: submitting ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, boxShadow: submitting ? 'none' : '0 4px 16px rgba(99,102,241,0.4)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onMouseEnter={e => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' } }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = submitting ? 'none' : '0 4px 16px rgba(99,102,241,0.4)' }}>
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Addingâ€¦</> : <><Check size={16} /> Add Fuel Log</>}
                  </button>
                  <button type="button" onClick={() => setActiveTab('all')} style={{ flex: 0.35, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              EDIT MODAL
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {editingLog && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
              <div style={{ background: D.surface, borderRadius: 20, padding: 0, maxWidth: 580, width: '92%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease' }}>
                {/* Modal header */}
                <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: D.indigoDim, color: D.indigo, border: '1px solid rgba(129,140,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit2 size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '0.95rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Edit Fuel Log</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: D.textSub }}>{editingLog.vehicleRegNumber}</p>
                    </div>
                  </div>
                  <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                </div>

                <div style={{ padding: '24px 28px' }}>
                  <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                    <div>
                      <label style={labelStyle}>Vehicle Registration</label>
                      <input type="text" value={editingLog.vehicleRegNumber} readOnly style={{ ...inputStyle, background: D.surfaceHi, color: D.textFaint, cursor: 'not-allowed' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                        <select name="fuelType" value={editingLog.fuelType} onChange={handleInputChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                          <option value="Diesel" style={{ background: D.surfaceHi }}>Diesel</option>
                          <option value="Petrol" style={{ background: D.surfaceHi }}>Petrol</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Mileage (km)</label>
                        <input type="number" name="mileage" value={editingLog.mileage} onChange={handleInputChange} step="0.1" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Date</label>
                        <input type="date" name="date" value={editingLog.date} onChange={handleInputChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Driver Username <span style={{ color: D.textFaint, fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                        <input type="text" name="driverUsername" value={editingLog.driverUsername || ''} onChange={handleInputChange} placeholder="e.g. driver1" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleSaveEdit} disabled={submitting} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: submitting ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {submitting ? <><Loader2 size={16} className="animate-spin" /> Savingâ€¦</> : <><Check size={16} /> Save Changes</>}
                    </button>
                    <button onClick={handleCancelEdit} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              DELETE MODAL
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {showDeleteModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
              <div style={{ background: D.surface, borderRadius: 20, padding: 36, maxWidth: 420, width: '92%', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: D.redDim, color: D.red, border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <AlertTriangle size={32} />
                </div>
                <h3 style={{ margin: '0 0 10px', fontWeight: 800, color: D.text, fontSize: '1.1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Delete Fuel Log?</h3>
                <p style={{ margin: '0 0 24px', color: D.textSub, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  This will soft-delete the log for <strong style={{ color: D.text }}>{deletingLog?.vehicleRegNumber}</strong>. It will be retained in the Deleted Logs tab for audit purposes.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setShowDeleteModal(false); setDeletingLog(null) }} style={{ flex: 1, padding: '10px 20px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.15s' }}>Cancel</button>
                  <button onClick={handleConfirmDelete}
                    style={{ flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none', background: D.red, color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <Trash2 size={16} style={{ marginRight: 6 }} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* â”€â”€ Dark theme overrides for sidebar/topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

export default FuelManagementPage
