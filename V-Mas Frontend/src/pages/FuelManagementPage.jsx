import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { fuelAPI, vehicleAPI, userAPI } from '../services/api'
import { addControllerNotification } from '../services/notificationService'
import { 
  Fuel, CircleDollarSign, BarChart2, Car, Trash2, ClipboardList, Plus, Search, 
  Edit2, AlertTriangle, Check, X, Loader2, RotateCcw, FileText, ChevronRight, 
  Calendar, Clock, User, ArrowRight, MoreVertical
} from 'lucide-react'
import { computeLogsEfficiency } from '../utils/fuelUtils'

/* ── Fuel Management Page ────────────────────────────────────────────────── */
const FuelManagementPage = () => {
  const D = useD()
  const { user } = useAuth()

  // ── Styles ──────────────────────────────────────────────────────────────
  const card = {
    background: D.surface,
    borderRadius: 24,
    border: `1px solid ${D.border}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: 16,
    border: `1px solid ${D.inputBorder}`,
    fontSize: '0.95rem',
    color: D.text,
    background: D.inputBg,
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 800,
    color: D.textSub,
    marginBottom: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  }

  const onFocus = e => {
    e.target.style.borderColor = D.purple
    e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}`
    e.target.style.background = D.surface
    e.target.style.transform = 'translateY(-1px)'
  }
  const onBlur = e => {
    e.target.style.borderColor = D.inputBorder
    e.target.style.boxShadow = 'none'
    e.target.style.background = D.inputBg
    e.target.style.transform = 'translateY(0)'
  }

  // ── State ───────────────────────────────────────────────────────────────
  const [allLogs, setAllLogs] = useState([])
  const [deletedLogs, setDeletedLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingDeleted, setLoadingDeleted] = useState(false)

  const [filterVehicle, setFilterVehicle] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')
  const [filterFuelType, setFilterFuelType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeletedDrawer, setShowDeletedDrawer] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingLog, setDeletingLog] = useState(null)
  const [restoringId, setRestoringId] = useState(null)

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
  const [toast, setToast] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [driversList, setDriversList] = useState([])

  const [stats, setStats] = useState({
    totalLogs: 0, totalFuel: 0, totalCost: 0, avgEfficiency: 0, vehicleCount: 0,
  })

  const [previousMileage, setPreviousMileage] = useState(null)
  const [mileageError, setMileageError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => { loadData() }, [])
  useEffect(() => { applyFilters() }, [allLogs, filterVehicle, filterDriver, filterFuelType, filterStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      const [fuelRes, vehRes, driverRes, delRes] = await Promise.allSettled([
        fuelAPI.getAllFuelLogs(),
        vehicleAPI.getAllVehicles(),
        userAPI.getAllDrivers(),
        fuelAPI.getDeletedLogs()
      ])

      let logs = []
      if (fuelRes.status === 'fulfilled') {
        const rawLogs = fuelRes.value.data.data || []
        computeLogsEfficiency(rawLogs)
        logs = [...rawLogs].sort((a, b) => new Date(b.date) - new Date(a.date))
        setAllLogs(logs)
      } else {
        console.error('Failed to load fuel logs:', fuelRes.reason)
      }

      if (vehRes.status === 'fulfilled') {
        setVehicles(vehRes.value.data.data || [])
      } else {
        console.error('Failed to load vehicles:', vehRes.reason)
      }

      if (driverRes.status === 'fulfilled') {
        setDriversList(driverRes.value.data.data || [])
      } else {
        console.error('Failed to load drivers:', driverRes.reason)
      }

      if (delRes.status === 'fulfilled') {
        setDeletedLogs(delRes.value.data.data || [])
      } else {
        console.error('Failed to load deleted logs:', delRes.reason)
      }

      const activeLogs = logs.filter(l => !l.isDeleted)
      const vehicleCount = [...new Set(activeLogs.map(l => l.vehicleRegNumber))].length
      calculateStats(activeLogs, vehicleCount)
    } catch (err) {
      console.error('Error loading data:', err)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadDeletedLogs = async () => {
    try {
      setLoadingDeleted(true)
      const res = await fuelAPI.getDeletedLogs()
      setDeletedLogs(res.data.data || [])
    } catch (err) {
      console.error('Error loading deleted logs:', err)
    } finally {
      setLoadingDeleted(false)
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
    let filtered = allLogs.filter(l => !l.isDeleted)
    if (filterVehicle !== 'all') filtered = filtered.filter(l => l.vehicleRegNumber === filterVehicle)
    if (filterDriver !== 'all') filtered = filtered.filter(l => l.driverUsername === filterDriver)
    if (filterFuelType !== 'all') filtered = filtered.filter(l => l.fuelType === filterFuelType)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(l => {
        const eff = l.fuelEfficiency
        if (!eff) return filterStatus === 'na'
        if (filterStatus === 'excellent') return eff > 10
        if (filterStatus === 'good') return eff > 7 && eff <= 10
        if (filterStatus === 'average') return eff > 5 && eff <= 7
        if (filterStatus === 'poor') return eff <= 5
        return true
      })
    }
    setFilteredLogs(filtered)
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleInputChange = e => {
    const { name, value } = e.target
    if (editingLog) setEditingLog(p => ({ ...p, [name]: value }))
    else setFormData(p => ({ ...p, [name]: value }))
  }

  const handleMileageChange = e => {
    const val = e.target.value
    if (editingLog) setEditingLog(p => ({ ...p, mileage: val }))
    else setFormData(p => ({ ...p, mileage: val }))
    
    const prev = editingLog ? null : previousMileage // only validate for new logs
    if (prev != null && val !== '' && parseFloat(val) < prev) {
      setMileageError(`Must be ≥ previous reading (${prev.toFixed(1)} km)`)
    } else {
      setMileageError('')
    }
  }

  const handleVehicleSelect = e => {
    const regNo = e.target.value
    const selected = vehicles.find(v => v.registrationNo === regNo)
    const fuelType = selected?.fuelType
      ? selected.fuelType.charAt(0).toUpperCase() + selected.fuelType.slice(1).toLowerCase()
      : undefined

    const lastLog = allLogs.find(l => !l.isDeleted && l.vehicleRegNumber === regNo)
    const lastMil = lastLog ? lastLog.mileage : null
    setPreviousMileage(lastMil)
    setMileageError('') // reset any stale validation error when switching vehicles

    // Auto-fill driver from vehicle's assigned driver
    const autoDriver = selected?.driverName && selected.driverName !== 'Not Assigned'
      ? driversList.find(d => d.fullName === selected.driverName || d.username === selected.driverName)?.username || selected.driverName
      : ''

    setFormData(p => ({
      ...p,
      vehicleRegNumber: regNo,
      ...(fuelType && { fuelType }),
      mileage: '', // always clear so controller must enter a new (higher) odometer reading
      driverUsername: autoDriver || p.driverUsername,
    }))
  }

  const handleAddSubmit = async e => {
    e.preventDefault()
    if (previousMileage != null && parseFloat(formData.mileage) < previousMileage) {
      setMileageError(`Must be ≥ previous reading (${previousMileage.toFixed(1)} km)`)
      return
    }

    setSubmitting(true)
    const prevMilCapture = previousMileage
    const milNew = parseFloat(formData.mileage)
    const litersNew = parseFloat(formData.liters)
    const regCapture = formData.vehicleRegNumber
    try {
      await fuelAPI.controllerAddLog({
        ...formData,
        liters: litersNew,
        costPerLiter: parseFloat(formData.costPerLiter),
        mileage: milNew,
        driverUsername: formData.driverUsername || undefined,
      })
      setShowAddModal(false)
      setFormData({ vehicleRegNumber: '', fuelType: 'Diesel', liters: '', costPerLiter: '', mileage: '', date: new Date().toISOString().split('T')[0], driverUsername: '' })
      setPreviousMileage(null)
      setMileageError('')
      await loadData()
      showToast('Fuel log added successfully!')
      addControllerNotification(`Fuel log added for vehicle ${regCapture}`, 'FUEL_ADD')
      // ── Low efficiency alert ─────────────────────────────────────────────
      if (prevMilCapture != null && milNew > prevMilCapture && litersNew > 0) {
        const eff = (milNew - prevMilCapture) / litersNew
        if (eff < 5) {
          addControllerNotification(
            `⚠️ Low Efficiency Alert: ${regCapture} recorded only ${eff.toFixed(2)} km/L (Poor) — consider scheduling an inspection.`,
            'FUEL_LOW_EFF'
          )
        }
      }
    } catch (err) {
      console.error('Add fuel log error:', err?.response?.data || err);
      showToast(err?.response?.data?.message || 'Failed to add fuel log', 'error')
    } finally { setSubmitting(false) }
  }

  const handleEditSubmit = async e => {
    e.preventDefault()
    if (!editingLog) return
    setSubmitting(true)
    const editMilNew = parseFloat(editingLog.mileage)
    const editLitersNew = parseFloat(editingLog.liters)
    const editReg = editingLog.vehicleRegNumber
    const editId = editingLog.id
    // Find the previous log's mileage for this vehicle (excluding current log)
    const prevLogForEdit = allLogs
      .filter(l => !l.isDeleted && l.vehicleRegNumber === editReg && l.id !== editId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    const prevMilForEdit = prevLogForEdit ? prevLogForEdit.mileage : null
    try {
      await fuelAPI.controllerUpdateLog(editId, {
        ...editingLog,
        liters: editLitersNew,
        costPerLiter: parseFloat(editingLog.costPerLiter),
        mileage: editMilNew,
        driverUsername: editingLog.driverUsername || undefined,
        updatedBy: user?.username
      })
      setEditingLog(null)
      await loadData()
      showToast('Fuel log updated!')
      addControllerNotification(`Fuel log #${editId} updated`, 'FUEL_EDIT')
      // ── Low efficiency alert ─────────────────────────────────────────────
      if (prevMilForEdit != null && editMilNew > prevMilForEdit && editLitersNew > 0) {
        const eff = (editMilNew - prevMilForEdit) / editLitersNew
        if (eff < 5) {
          addControllerNotification(
            `⚠️ Low Efficiency Alert: ${editReg} updated log shows only ${eff.toFixed(2)} km/L (Poor) — consider scheduling an inspection.`,
            'FUEL_LOW_EFF'
          )
        }
      }
    } catch (err) {
      showToast('Failed to update', 'error')
    } finally { setSubmitting(false) }
  }

  const handleConfirmDelete = async () => {
    if (!deletingLog) return
    try {
      await fuelAPI.controllerDeleteLog(deletingLog.id)
      setShowDeleteConfirm(false)
      setDeletingLog(null)
      await loadData()
      showToast('Fuel log archived.')
      addControllerNotification(`Fuel log for ${deletingLog?.vehicleRegNumber} archived`, 'FUEL_DELETE')
    } catch (err) {
      showToast('Failed to archive', 'error')
    }
  }

  const handleRestore = async (id) => {
    try {
      setRestoringId(id)
      await fuelAPI.restoreLog(id)
      await loadData()
      showToast('Fuel log restored successfully!')
      addControllerNotification(`Fuel log restored`, 'FUEL_RESTORE')
    } catch (err) {
      showToast('Failed to restore fuel log', 'error')
    } finally {
      setRestoringId(null)
    }
  }

  const effBadge = eff => {
    if (!eff) return { label: 'N/A', bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
    if (eff > 10) return { label: 'Excellent', bg: D.greenDim, color: D.green, border: 'rgba(74,222,128,0.3)' }
    if (eff > 7) return { label: 'Good', bg: D.blueDim, color: D.blue, border: 'rgba(96,165,250,0.3)' }
    if (eff > 5) return { label: 'Average', bg: D.goldDim, color: D.gold, border: 'rgba(251,191,36,0.3)' }
    return { label: 'Poor', bg: D.redDim, color: D.red, border: 'rgba(248,113,113,0.3)' }
  }

  // Build unique driver list from actual logs (so dropdown always matches filter)
  const uniqueDriversInLogs = [...new Set(
    allLogs.filter(l => !l.isDeleted && l.driverUsername).map(l => l.driverUsername)
  )].map(username => {
    const found = driversList.find(d => d.username === username)
    return { username, displayName: found?.fullName || username }
  })

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Management" subtitle="Home / Fuel Management" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '4px solid rgba(167,139,250,0.2)', borderTopColor: D.purple, animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: D.textSub, fontWeight: 600 }}>Loading fleet data...</p>
          </div>
        </div>
      </div>
    </div>
  )

  const deletedCount = deletedLogs.length

  // ── Main Render ─────────────────────────────────────────────────────────
  return (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Management" subtitle="Home / Fuel Management" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body">

          {/* -- Hero Section ------------------------------------ */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
            borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`
          }}>
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 20, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Fuel size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fleet Fuel Intelligence</h1>
                    <p style={{ margin: '6px 0 0', color: '#a5b4fc', fontSize: '1rem', fontWeight: 500, opacity: 0.9 }}>Centralized monitoring, cost analysis & efficiency tracking</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                <button onClick={() => setShowAddModal(true)} style={{ 
                  padding: '14px 28px', borderRadius: 16, border: 'none', 
                  background: '#fff', color: '#312e81', cursor: 'pointer', 
                  fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.3)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}>
                  <Plus size={20} strokeWidth={3} /> Add Fuel Log
                </button>
                <button onClick={() => setShowDeletedDrawer(true)} style={{ 
                  padding: '14px 24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.25)', 
                  background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', 
                  fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 10,
                  backdropFilter: 'blur(10px)', transition: 'all 0.2s ease'
                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                  <Trash2 size={20} /> Archive {deletedCount > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8, marginLeft: 4, fontWeight: 900 }}>{deletedCount}</span>}
                </button>
              </div>
            </div>
            {/* decoration */}
            <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(165,180,252,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          </div>

          {/* -- Stats Grid -------------------------------------- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
            {[
              { label: 'Fuel Consumed', value: `${stats.totalFuel.toFixed(1)} L`, icon: <Fuel size={24} />, color: D.gold, bg: D.goldDim },
              { label: 'Total Expenditure', value: `Rs. ${Math.round(stats.totalCost).toLocaleString()}`, icon: <CircleDollarSign size={24} />, color: D.green, bg: D.greenDim },
              { label: 'Fleet Efficiency', value: stats.avgEfficiency > 0 ? `${stats.avgEfficiency.toFixed(2)} km/L` : 'N/A', icon: <BarChart2 size={24} />, color: D.indigo, bg: D.indigoDim },
              { label: 'Tracked Vehicles', value: stats.vehicleCount, icon: <Car size={24} />, color: D.blue, bg: D.blueDim },
            ].map(s => (
              <div key={s.label} style={{
                ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default'
              }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = s.color + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${s.color}20` }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.color}30`, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* -- Controls & List ---------------------------------- */}
          <div style={{ ...card, padding: 0 }}>
            <div style={{ padding: '22px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: D.surfaceHi, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>

                {/* Vehicle Dropdown */}
                <div style={{ position: 'relative', minWidth: 190 }}>
                  <Car size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.blue, pointerEvents: 'none', opacity: 0.8 }} />
                  <select
                    value={filterVehicle}
                    onChange={e => setFilterVehicle(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 38, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
                    onFocus={onFocus} onBlur={onBlur}
                  >
                    <option value="all">All Vehicles</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.registrationNo}>{v.registrationNo}</option>
                    ))}
                  </select>
                  <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                </div>

                {/* Driver Dropdown */}
                <div style={{ position: 'relative', minWidth: 190 }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.purple, pointerEvents: 'none', opacity: 0.8 }} />
                  <select
                    value={filterDriver}
                    onChange={e => setFilterDriver(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 38, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
                    onFocus={onFocus} onBlur={onBlur}
                  >
                    <option value="all">All Drivers</option>
                    {uniqueDriversInLogs.map(d => (
                      <option key={d.username} value={d.username}>{d.displayName}</option>
                    ))}
                  </select>
                  <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                </div>

                {/* Fuel Type Dropdown */}
                <div style={{ position: 'relative', minWidth: 160 }}>
                  <select value={filterFuelType} onChange={e => setFilterFuelType(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="all">All Fuel Types</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                  </select>
                  <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                </div>

                {/* Efficiency Dropdown */}
                <div style={{ position: 'relative', minWidth: 175 }}>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="all">All Efficiency</option>
                    <option value="excellent">Excellent (&gt;10)</option>
                    <option value="good">Good (7–10)</option>
                    <option value="average">Average (5–7)</option>
                    <option value="poor">Poor (&lt;5)</option>
                  </select>
                  <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                </div>

                {/* Clear Filters */}
                {(filterVehicle !== 'all' || filterDriver !== 'all' || filterFuelType !== 'all' || filterStatus !== 'all') && (
                  <button
                    onClick={() => { setFilterVehicle('all'); setFilterDriver('all'); setFilterFuelType('all'); setFilterStatus('all') }}
                    style={{ padding: '10px 16px', borderRadius: 12, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                  >
                    <X size={14} /> Clear
                  </button>
                )}
              </div>

              <div style={{ fontSize: '0.9rem', color: D.textSub, fontWeight: 700, background: D.surface, padding: '8px 16px', borderRadius: 12, border: `1px solid ${D.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <span style={{ color: D.purple }}>{filteredLogs.length}</span> Active Logs
              </div>
            </div>

            {/* -- Data List ------------------------------------- */}
            <div style={{ padding: '24px 32px 40px' }}>
              {filteredLogs.length === 0 ? (
                <div style={{ padding: '100px 0', textAlign: 'center' }}>
                  <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                    <Search size={36} opacity={0.3} />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>No matching fuel logs</h3>
                  <p style={{ margin: '10px 0 0', color: D.textSub, fontSize: '1rem', fontWeight: 500 }}>Adjust your search terms or filters to find what you're looking for.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  {filteredLogs.map((log, i) => {
                    const badge = effBadge(log.fuelEfficiency)
                    return (
                      <div key={log.id} style={{
                        background: D.surface, borderRadius: 20, border: `1px solid ${D.border}`,
                        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }} onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>
                        
                        {/* Vehicle Info */}
                        <div style={{ width: 130, flexShrink: 0 }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 950, color: D.blue, letterSpacing: '0.02em' }}>{log.vehicleRegNumber}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                             <span style={{ fontSize: '0.72rem', color: log.fuelType === 'Diesel' ? D.indigo : D.gold, fontWeight: 800, textTransform: 'uppercase', background: log.fuelType === 'Diesel' ? D.indigoDim : D.goldDim, padding: '2px 8px', borderRadius: 6, border: `1px solid ${log.fuelType === 'Diesel' ? D.indigo : D.gold}30` }}>{log.fuelType}</span>
                          </div>
                        </div>

                        {/* Date & Driver */}
                        <div style={{ width: 160, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: D.text, fontWeight: 700 }}>
                            <Calendar size={16} color={D.textSub} strokeWidth={2.5} /> {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: D.textSub, marginTop: 6, fontWeight: 600 }}>
                            <User size={14} opacity={0.7} /> {log.driverUsername || 'Not assigned'}
                          </div>
                        </div>

                        {/* Usage Details */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 48 }}>
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
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: D.green }}>Rs. {log.totalCost.toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Efficiency */}
                        <div style={{ width: 160, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 12, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, boxShadow: `0 4px 12px ${badge.color}15` }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{badge.label}</span>
                            {log.fuelEfficiency && <span style={{ fontWeight: 950, fontSize: '1rem' }}>{log.fuelEfficiency.toFixed(1)}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10, marginLeft: 16 }}>
                          <button onClick={() => setEditingLog({ ...log, date: log.date.split('T')[0] })} style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`, background: D.surface, color: D.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.25s' }} onMouseEnter={e => { e.currentTarget.style.color = D.purple; e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.background = D.purpleDim }} onMouseLeave={e => { e.currentTarget.style.color = D.textSub; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface }}>
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => { setDeletingLog(log); setShowDeleteConfirm(true) }} style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`, background: D.surface, color: D.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.25s' }} onMouseEnter={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.borderColor = D.red }} onMouseLeave={e => { e.currentTarget.style.background = D.surface; e.currentTarget.style.borderColor = D.border }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── ADD/EDIT MODAL ────────────────────────────────────── */}
      {(showAddModal || editingLog) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={() => { if (!submitting) { setShowAddModal(false); setEditingLog(null) } }}>
          <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {editingLog ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{editingLog ? 'Edit Fuel Record' : 'Record Fuel Entry'}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600, opacity: 0.9 }}>{editingLog ? `Refining details for ${editingLog.vehicleRegNumber}` : 'Enter the latest fill-up data for analysis'}</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingLog(null) }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
            </div>

            <form onSubmit={editingLog ? handleEditSubmit : handleAddSubmit} style={{ padding: '36px' }}>
              {/* derive selected vehicle for info strip */}
              {(() => {
                const selectedVehicle = !editingLog && formData.vehicleRegNumber
                  ? vehicles.find(v => v.registrationNo === formData.vehicleRegNumber)
                  : null
                const fuelTypeValue = editingLog ? editingLog.fuelType : formData.fuelType
                const fuelColor = fuelTypeValue === 'Diesel' ? D.indigo : D.gold
                const fuelBg = fuelTypeValue === 'Diesel' ? D.indigoDim : D.goldDim

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 40 }}>

                    {/* Vehicle Select / Read-only reg */}
                    {!editingLog ? (
                      <div style={{ gridColumn: selectedVehicle ? '1' : '1' }}>
                        <label style={labelStyle}>Vehicle Identification <span style={{ color: D.red }}>*</span></label>
                        <select name="vehicleRegNumber" value={formData.vehicleRegNumber} onChange={handleVehicleSelect} required style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                          <option value="">Select a Vehicle</option>
                          {vehicles.map(v => <option key={v.id} value={v.registrationNo}>{v.registrationNo}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label style={labelStyle}>Vehicle Identification</label>
                        <input type="text" value={editingLog.vehicleRegNumber} readOnly style={{ ...inputStyle, background: D.surfaceHi, color: D.textSub, cursor: 'not-allowed', opacity: 0.7 }} />
                      </div>
                    )}

                    {/* Date */}
                    <div>
                      <label style={labelStyle}>Transaction Date <span style={{ color: D.red }}>*</span></label>
                      <input type="date" name="date" value={editingLog ? editingLog.date : formData.date} onChange={handleInputChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>

                    {/* Vehicle Info Strip — shown when a vehicle is selected (add mode only) */}
                    {selectedVehicle && (
                      <div style={{ gridColumn: 'span 2', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', animation: 'fadeIn 0.2s ease' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: D.indigo, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Vehicle Info</span>
                        <div style={{ width: 1, height: 16, background: D.border }} />
                        {selectedVehicle.manufacturer && (
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.text }}>{selectedVehicle.manufacturer} {selectedVehicle.model}</span>
                        )}
                        {selectedVehicle.year && (
                          <span style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600 }}>· {selectedVehicle.year}</span>
                        )}
                        {/* Locked fuel type badge */}
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', background: fuelBg, color: fuelColor, padding: '3px 10px', borderRadius: 20, border: `1px solid ${fuelColor}30`, display: 'flex', alignItems: 'center', gap: 5 }}>
                          🔒 {fuelTypeValue}
                        </span>
                        {selectedVehicle.currentMileageKm && (
                          <span style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600 }}>· {Number(selectedVehicle.currentMileageKm).toLocaleString()} km on odometer</span>
                        )}
                        {selectedVehicle.driverName && selectedVehicle.driverName !== 'Not Assigned' && (
                          <span style={{ fontSize: '0.78rem', color: D.purple, fontWeight: 700, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={12} /> {selectedVehicle.driverName}
                          </span>
                        )}
                        {/* Status chip */}
                        {selectedVehicle.status && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
                            background: selectedVehicle.status === 'ACTIVE' ? D.greenDim : selectedVehicle.status === 'AVAILABLE' ? D.blueDim : D.orangeDim,
                            color: selectedVehicle.status === 'ACTIVE' ? D.green : selectedVehicle.status === 'AVAILABLE' ? D.blue : D.orange,
                          }}>{selectedVehicle.status}</span>
                        )}
                      </div>
                    )}

                    {/* Fuel Grade — locked read-only when vehicle selected (add mode), editable in edit mode */}
                    <div>
                      <label style={labelStyle}>Fuel Grade <span style={{ color: D.red }}>*</span></label>
                      {selectedVehicle ? (
                        // Locked: vehicle dictates fuel type
                        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 10, background: D.surfaceHi, cursor: 'not-allowed', opacity: 0.85, padding: '14px 18px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', background: fuelBg, color: fuelColor, padding: '3px 10px', borderRadius: 20, border: `1px solid ${fuelColor}30` }}>{fuelTypeValue}</span>
                          <span style={{ fontSize: '0.75rem', color: D.textFaint, fontWeight: 600 }}>Auto-set from vehicle</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: D.textFaint }}>🔒</span>
                        </div>
                      ) : (
                        <select name="fuelType" value={editingLog ? editingLog.fuelType : formData.fuelType} onChange={handleInputChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                          <option value="Diesel">Diesel</option>
                          <option value="Petrol">Petrol</option>
                        </select>
                      )}
                    </div>

                    {/* Volume */}
                    <div>
                      <label style={labelStyle}>Volume Dispensed (L) <span style={{ color: D.red }}>*</span></label>
                      <input type="number" name="liters" value={editingLog ? editingLog.liters : formData.liters} onChange={handleInputChange} step="0.01" min="0" required placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label style={labelStyle}>Unit Price (LKR/L) <span style={{ color: D.red }}>*</span></label>
                      <input type="number" name="costPerLiter" value={editingLog ? editingLog.costPerLiter : formData.costPerLiter} onChange={handleInputChange} step="0.01" min="0" required placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>

                    {/* Odometer */}
                    <div>
                      <label style={labelStyle}>Odometer Reading (km) <span style={{ color: D.red }}>*</span></label>
                      <input type="number" name="mileage" value={editingLog ? editingLog.mileage : formData.mileage} onChange={handleMileageChange} step="0.1" required placeholder="0.0" style={{ ...inputStyle, ...(mileageError ? { borderColor: D.red, boxShadow: `0 0 0 4px ${D.red}20` } : {}) }} onFocus={onFocus} onBlur={onBlur} />
                      {mileageError ? (
                        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.red, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>⚠ {mileageError}</p>
                      ) : previousMileage != null && !editingLog && (
                        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.textFaint, fontWeight: 600 }}>Last reading: <span style={{ color: D.purple }}>{previousMileage.toLocaleString()} km</span></p>
                      )}
                    </div>

                    {/* Assigned Operator */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Assigned Operator <span style={{ textTransform: 'none', color: D.textFaint, fontWeight: 500, marginLeft: 6, opacity: 0.8 }}>(Optional)</span></label>
                      <select name="driverUsername" value={editingLog ? (editingLog.driverUsername || '') : (formData.driverUsername || '')} onChange={handleInputChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">System Generated / Unassigned</option>
                        {driversList.map(d => <option key={d.id} value={d.username}>{d.fullName || d.username}</option>)}
                      </select>
                      {selectedVehicle?.driverName && selectedVehicle.driverName !== 'Not Assigned' && (
                        <p style={{ margin: '7px 0 0', fontSize: '0.72rem', color: D.purple, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={11} /> Auto-filled from vehicle assignment
                        </p>
                      )}
                    </div>

                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 20 }}>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '16px', borderRadius: 18, border: 'none', background: submitting ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: '1.05rem', fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: submitting ? 'none' : '0 10px 25px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onMouseEnter={e => { if(!submitting) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(99,102,241,0.5)' } }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = submitting ? 'none' : '0 10px 25px rgba(99,102,241,0.4)' }}>
                  {submitting ? <Loader2 size={22} className="animate-spin" /> : editingLog ? <Check size={22} /> : <FileText size={22} />}
                  {submitting ? (editingLog ? 'Updating Analysis...' : 'Processing Entry...') : (editingLog ? 'Update Analysis' : 'Complete Fuel Entry')}
                </button>
                <button type="button" disabled={submitting} onClick={() => { setShowAddModal(false); setEditingLog(null) }} style={{ flex: 1, padding: '16px', borderRadius: 18, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub, fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = D.border} onMouseLeave={e => e.currentTarget.style.background = D.surfaceHi}>Discard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETED RECORDS DRAWER ─────────────────────────────── */}
      {showDeletedDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.25s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={() => setShowDeletedDrawer(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 580, background: D.bg, height: '100%', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)', borderLeft: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            
            {/* Drawer Header */}
            <div style={{ padding: '32px 36px', borderBottom: `1px solid ${D.border}`, background: D.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: D.red, marginBottom: 8 }}>
                  <Trash2 size={24} />
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Archive Vault</h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: D.textSub, fontWeight: 600, opacity: 0.8 }}>Review and restore archived fuel consumption records</p>
              </div>
              <button onClick={() => setShowDeletedDrawer(false)} style={{ background: D.surfaceHi, border: `1px solid ${D.border}`, borderRadius: 12, padding: 12, color: D.textSub, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = D.border} onMouseLeave={e => e.currentTarget.style.background = D.surfaceHi}><X size={24} /></button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px', background: 'rgba(0,0,0,0.02)' }}>
              {loadingDeleted ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Loader2 size={40} className="animate-spin" color={D.purple} style={{ margin: '0 auto 20px' }} />
                  <p style={{ color: D.textSub, fontWeight: 700, fontSize: '1rem' }}>Synchronizing archive...</p>
                </div>
              ) : deletedLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '120px 0' }}>
                  <div style={{ background: D.surface, width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', color: D.textSub, border: `1px solid ${D.border}`, opacity: 0.4 }}>
                    <Trash2 size={42} />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: 900, color: D.textSub, fontSize: '1.25rem' }}>Vault is empty</h3>
                  <p style={{ margin: '12px 0 0', color: D.textFaint, fontSize: '1rem', fontWeight: 500 }}>No archived logs were found in the system.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 20 }}>
                  {deletedLogs.map((log, i) => (
                    <div key={log.id} style={{ 
                      background: D.surface, borderRadius: 24, border: '1px solid rgba(239,68,68,0.2)', 
                      padding: '24px', animation: `fadeUp 0.4s ease ${i * 0.08}s both`,
                      position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: 6, background: D.red, opacity: 0.8 }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontWeight: 950, fontSize: '1.2rem', color: D.text }}>{log.vehicleRegNumber}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: D.red, border: '1px solid rgba(239,68,68,0.2)' }}>ARCHIVED</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={14} opacity={0.6} /> {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {log.fuelType}
                          </div>
                        </div>
                        <button onClick={() => handleRestore(log.id)} disabled={restoringId === log.id} style={{ 
                          padding: '10px 20px', borderRadius: 14, border: 'none', background: D.green, color: '#fff', 
                          fontSize: '0.85rem', fontWeight: 900, cursor: restoringId === log.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 15px rgba(16,185,129,0.3)', transition: 'all 0.2s'
                        }} onMouseEnter={e => { if(restoringId !== log.id) e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                          {restoringId === log.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                          Restore Log
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 16, background: D.surfaceHi, padding: '16px 20px', borderRadius: 18, border: `1px solid ${D.border}` }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>Volume</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: D.text }}>{log.liters.toFixed(1)} L</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>Total Cost</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: D.text }}>Rs. {log.totalCost.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>Archived By</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: D.red, opacity: 0.9 }}>{log.uploadedBy || 'System Admin'}</div>
                        </div>
                      </div>

                      {log.deletedAt && (
                        <div style={{ marginTop: 16, fontSize: '0.78rem', color: D.textFaint, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontWeight: 600 }}>
                          <Clock size={14} opacity={0.6} /> Moved to archive on {new Date(log.deletedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- Delete Confirmation Modal ----------------------- */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: D.surface, borderRadius: 32, padding: '48px', maxWidth: 460, width: '92%', boxShadow: '0 40px 120px rgba(0,0,0,0.7)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 26, background: D.redDim, color: D.red, border: '1px solid rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
              <Trash2 size={40} />
            </div>
            <h3 style={{ margin: '0 0 14px', fontWeight: 950, color: D.text, fontSize: '1.5rem', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Archive this Log?</h3>
            <p style={{ margin: '0 0 40px', color: D.textSub, fontSize: '1rem', lineHeight: 1.6, fontWeight: 600, opacity: 0.9 }}>
              This record for <strong style={{ color: D.text, fontWeight: 900 }}>{deletingLog?.vehicleRegNumber}</strong> will be moved to the archive vault. It will be excluded from reports but can be restored at any time.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeletingLog(null) }} style={{ flex: 1, padding: '16px', borderRadius: 16, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub, cursor: 'pointer', fontSize: '1rem', fontWeight: 800, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = D.border} onMouseLeave={e => e.currentTarget.style.background = D.surfaceHi}>Keep Record</button>
              <button onClick={handleConfirmDelete} style={{ flex: 1, padding: '16px', borderRadius: 16, border: 'none', background: D.red, color: '#fff', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 25px rgba(239,68,68,0.4)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.transform = 'translateY(0)' }}>Move to Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* -- Toast Notification ------------------------------- */}
      {toast && (
        <div style={{
          position: 'fixed', top: 32, right: 32, zIndex: 9999,
          padding: '20px 32px', borderRadius: 20,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
          color: '#fff',
          fontWeight: 900, fontSize: '0.95rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
          display: 'flex', alignItems: 'center', gap: 14,
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.2)',
          letterSpacing: '0.01em'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={24} /> : <Check size={24} strokeWidth={3} />}
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}

export default FuelManagementPage
