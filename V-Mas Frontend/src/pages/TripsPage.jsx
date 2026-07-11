import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TripActionModal from '../components/TripActionModal'
import { useD, useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { tripAPI, userAPI, vehicleAPI, serviceAPI } from '../services/api'
import {
  MapPin, Navigation, Car, User, Calendar, Plus, Loader2,
  Play, X, CheckCircle, Ban, Clock, MoreVertical, ClipboardList, Wrench, Fuel, AlertTriangle, UserCheck,
  Trash2, Archive
} from 'lucide-react'

// ── Helpers to parse job type from purpose field ──────────────────────────
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

// ── Helpers for checking overdue services (sync with ServicePage) ────────
const getStatus = (s) => {
  if (!s.serviceDate) return 'SCHEDULED'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const scheduled = new Date(s.serviceDate)
  scheduled.setHours(0, 0, 0, 0)
  return scheduled > today ? 'SCHEDULED' : 'COMPLETED'
}

const getVehicleMilestones = (vehicle, services, intervals) => {
  if (!vehicle || !intervals) return []
  const vehicleIntervals = intervals.filter(i => i.vehicleType === vehicle.vehicleType)
  
  return vehicleIntervals.map(interval => {
    const completed = services.filter(s =>
      s.vehicleRegNumber === vehicle.registrationNo &&
      s.serviceType === interval.serviceType &&
      getStatus(s) === 'COMPLETED'
    )
    
    let lastServiceMileage = vehicle.initialMileageKm != null ? Number(vehicle.initialMileageKm) : Number(vehicle.currentMileageKm || 0)
    if (completed.length > 0) {
      completed.sort((a, b) => Number(b.currentMileageKm || 0) - Number(a.currentMileageKm || 0))
      lastServiceMileage = Number(completed[0].currentMileageKm || 0)
    }
    
    const nextDueMileage = lastServiceMileage + interval.intervalKm
    const currentMileage = vehicle.currentMileageKm || 0
    const remainingKm = nextDueMileage - currentMileage
    
    let status = 'OK'
    if (remainingKm <= 0) {
      status = 'OVERDUE'
    } else if (remainingKm <= 200) {
      status = 'DUE_SOON'
    }
    
    return {
      serviceType: interval.serviceType,
      status
    }
  })
}

const isServiceOverdueForVehicle = (vehicle, serviceType, services, intervals) => {
  if (!vehicle) return false

  // 1. Check mileage milestones
  if (intervals && intervals.length > 0) {
    const milestones = getVehicleMilestones(vehicle, services, intervals)
    const m = milestones.find(ms => ms.serviceType === serviceType)
    if (m && m.status === 'OVERDUE') return true
  }

  // 2. Check date-based overdue scheduled tasks
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdueDate = services.some(s => 
    s.vehicleRegNumber === vehicle.registrationNo &&
    s.serviceType === serviceType &&
    getStatus(s) === 'SCHEDULED' &&
    s.serviceDate &&
    new Date(s.serviceDate) < today
  )

  return isOverdueDate
}

const SERVICE_TYPES = [
  { value: 'OIL_CHANGE', label: 'Oil Change' },
  { value: 'ENGINE_TUNE_UP', label: 'Engine Tune Up' },
  { value: 'BRAKE_SERVICE', label: 'Brake Service' },
  { value: 'TIRE_ROTATION', label: 'Tire Rotation' },
  { value: 'TRANSMISSION_SERVICE', label: 'Transmission Service' },
  { value: 'AC_SERVICE', label: 'AC Service' },
  { value: 'BATTERY_REPLACEMENT', label: 'Battery Replacement' },
  { value: 'GENERAL_INSPECTION', label: 'General Inspection' },
  { value: 'OTHER', label: 'Other' },
]

// ── Status → badge styling ────────────────────────────────────────────────
const statusBadge = (status) => {
  const s = (status || 'ASSIGNED').toUpperCase()
  switch (s) {
    case 'STARTED':   return { label: 'In Progress', bg: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'rgba(56,189,248,0.28)' }
    case 'DECLINED':  return { label: 'Declined',    bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.28)' }
    case 'COMPLETED': return { label: 'Completed',   bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.28)' }
    case 'CANCELLED': return { label: 'Cancelled',   bg: 'rgba(148,163,184,0.14)', color: '#94a3b8', border: 'rgba(148,163,184,0.28)' }
    default:          return { label: 'Assigned',    bg: 'rgba(251,191,36,0.12)', color: '#f59e0b', border: 'rgba(251,191,36,0.28)' }
  }
}

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const up = (s) => (s || '').toUpperCase()

const TripsPage = () => {
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'
  const { user, isAdmin, isController } = useAuth()
  const canManage = isAdmin || isController

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [trips, setTrips] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [allServices, setAllServices] = useState([])
  const [allIntervals, setAllIntervals] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [banner, setBanner] = useState(null) // { type: 'success'|'error', text }

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [activeTab, setActiveTab] = useState('TRIP') // 'TRIP' | 'SERVICE' | 'FUEL'
  const emptyForm = { driverUsername: '', vehicleRegNumber: '', origin: '', destination: '', purpose: '', scheduledDate: '' }
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const [tripToCancel, setTripToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [driverModal, setDriverModal] = useState(null) // { action, trip }

  const [deletedDrawer, setDeletedDrawer] = useState(false)
  const [deletedTrips, setDeletedTrips] = useState([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [deletedDetail, setDeletedDetail] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [deleteConfirmTrip, setDeleteConfirmTrip] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')

  const flash = (type, text) => {
    setBanner({ type, text })
    setTimeout(() => setBanner(null), 4000)
  }

  const loadDeletedTrips = async () => {
    try {
      setLoadingDeleted(true)
      const res = await tripAPI.getDeletedTrips()
      setDeletedTrips(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load deleted jobs:', err)
      flash('error', 'Failed to load deleted jobs')
    } finally {
      setLoadingDeleted(false)
    }
  }

  useEffect(() => {
    if (deletedDrawer) {
      loadDeletedTrips()
    }
  }, [deletedDrawer])

  const handleDeleteTrip = async (tripId) => {
    setDeletingId(tripId)
    try {
      await tripAPI.deleteTrip(tripId)
      flash('success', 'Job deleted successfully')
      setDeleteConfirmTrip(null)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to delete job')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRestoreTrip = async (tripId) => {
    setRestoringId(tripId)
    try {
      await tripAPI.restoreTrip(tripId)
      flash('success', 'Job restored successfully')
      loadTrips()
      if (deletedDrawer) {
        loadDeletedTrips()
      }
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to restore job')
    } finally {
      setRestoringId(null)
    }
  }

  const loadTrips = useCallback(async () => {
    try {
      const res = canManage ? await tripAPI.getAllTrips() : await tripAPI.getMyTrips()
      setTrips(res.data.data || [])
    } catch (err) {
      console.error('Error loading jobs:', err)
      flash('error', 'Could not load jobs')
    } finally {
      setLoading(false)
    }
  }, [canManage])

  useEffect(() => {
    loadTrips()
    if (canManage) {
      userAPI.getAllDrivers()
        .then(res => setDrivers((res.data.data || []).filter(d => (d.accountStatus || 'ACTIVE') === 'ACTIVE')))
        .catch(err => console.error('Error loading drivers:', err))
      vehicleAPI.getAllVehicles()
        .then(res => setVehicles((res.data.data || []).filter(v => !v.deleted && !v.isDeleted)))
        .catch(err => console.error('Error loading vehicles:', err))
      serviceAPI.getAllServices()
        .then(res => setAllServices(res.data.data || []))
        .catch(err => console.error('Error loading services:', err))
      serviceAPI.getAllIntervals()
        .then(res => setAllIntervals(res.data.data || []))
        .catch(err => console.error('Error loading intervals:', err))
    }
  }, [loadTrips, canManage])

  // Lock body scroll while a modal is open
  useEffect(() => {
    const open = showAssignModal || !!tripToCancel || !!driverModal
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showAssignModal, tripToCancel, driverModal])

  // ── Controller: assign a job ──────────────────────────────────────────
  const handleAssign = async (e) => {
    e.preventDefault()
    if (!form.driverUsername || !form.vehicleRegNumber || !form.destination.trim()) {
      flash('error', 'Driver, vehicle and destination/location are required')
      return
    }
    if (activeTab === 'SERVICE' && !form.purpose) {
      flash('error', 'Service Description is required')
      return
    }
    setSubmitting(true)
    try {
      const prefix = activeTab === 'SERVICE' ? '[Service] ' : activeTab === 'FUEL' ? '[Fuel] ' : '[Trip] '
      const finalPurpose = prefix + (form.purpose || '').trim()

      await tripAPI.assignTrip({
        ...form,
        purpose: finalPurpose,
        scheduledDate: form.scheduledDate || null
      })
      flash('success', `${activeTab === 'SERVICE' ? 'Service' : activeTab === 'FUEL' ? 'Fuel' : 'Trip'} job assigned successfully`)
      setForm(emptyForm)
      setShowAssignModal(false)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to assign job')
    } finally {
      setSubmitting(false)
    }
  }

  const closeAssignModal = () => { if (!submitting) { setShowAssignModal(false); setForm(emptyForm) } }

  // When a vehicle is selected in the modal, auto-fill the assigned driver (but allow override)
  const handleVehicleChange = (regNo) => {
    const selected = vehicles.find(v => v.registrationNo === regNo)
    setForm(prev => ({
      ...prev,
      vehicleRegNumber: regNo,
      // Auto-fill driver only if the vehicle has one and the driver field is currently empty OR
      // was previously auto-filled (i.e. no manual override)
      driverUsername: selected?.driverUsername || prev.driverUsername
    }))
  }

  const confirmCancel = async () => {
    if (!tripToCancel) return
    setCancelling(true)
    try {
      await tripAPI.cancelTrip(tripToCancel.id)
      flash('success', 'Job cancelled')
      setTripToCancel(null)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to cancel job')
    } finally {
      setCancelling(false)
    }
  }

  // ── Driver: act on a job (confirmed via TripActionModal) ───────────────
  const runDriverAction = async (reason) => {
    if (!driverModal) return
    const { action, trip } = driverModal
    setBusyId(trip.id)
    try {
      if (action === 'start') { await tripAPI.startTrip(trip.id); flash('success', 'Job accepted successfully!') }
      if (action === 'complete') { await tripAPI.completeTrip(trip.id); flash('success', 'Job completed') }
      if (action === 'decline') { await tripAPI.declineTrip(trip.id, reason || ''); flash('success', 'Job declined') }
      setDriverModal(null)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────
  const stat = {
    total: trips.length,
    assigned: trips.filter(t => up(t.status) === 'ASSIGNED').length,
    started: trips.filter(t => up(t.status) === 'STARTED').length,
    completed: trips.filter(t => up(t.status) === 'COMPLETED').length,
  }
  const uniqueDrivers = [...new Set(trips.map(t => t.driverUsername).filter(Boolean))]
  const filteredTrips = trips.filter(t => {
    if (filterStatus !== 'all' && up(t.status) !== filterStatus) return false
    if (canManage && filterDriver !== 'all' && t.driverUsername !== filterDriver) return false
    return true
  })

  // ── Style helpers (match Fuel Management) ───────────────────────────────
  const card = { background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }
  const inputStyle = { width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }
  const filterStyle = { ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer', width: '100%' }
  const onFocus = e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }
  const onBlur = e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }

  const statCards = [
    { label: 'Total Jobs', value: stat.total, icon: <ClipboardList size={24} />, color: D.blue, bg: D.blueDim },
    { label: 'Awaiting Response', value: stat.assigned, icon: <Clock size={24} />, color: D.gold, bg: D.goldDim },
    { label: 'In Progress', value: stat.started, icon: <Navigation size={24} />, color: D.indigo, bg: D.indigoDim },
    { label: 'Completed', value: stat.completed, icon: <CheckCircle size={24} />, color: D.green, bg: D.greenDim },
  ]

  // Find selected vehicle and determine overdue services
  const selectedVehicle = vehicles.find(v => v.registrationNo === form.vehicleRegNumber)
  const sortedServiceTypes = [...SERVICE_TYPES].map(type => {
    const isOverdue = isServiceOverdueForVehicle(selectedVehicle, type.value, allServices, allIntervals)
    return { ...type, isOverdue }
  }).sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0))

  if (loading) return (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Jobs" subtitle={canManage ? 'Home / Job Assignments' : 'Home / My Jobs'} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 80, color: D.textSub }}>
          <Loader2 size={20} className="spin" /> Loading jobs…
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Jobs" subtitle={canManage ? 'Home / Job Assignments' : 'Home / My Jobs'} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body">

          {banner && (
            <div style={{
              marginBottom: 20, padding: '12px 18px', borderRadius: 14, fontWeight: 600, fontSize: '0.85rem',
              background: banner.type === 'success' ? D.greenDim : D.redDim,
              color: banner.type === 'success' ? D.green : D.red,
              border: `1px solid ${banner.type === 'success' ? D.green : D.red}40`,
            }}>{banner.text}</div>
          )}

          {/* ── Hero Banner ───────────────────────────────────────────── */}
          <div style={{
            background: isDark
              ? 'linear-gradient(135deg, #030712 0%, #0a1628 30%, #0f2345 60%, #1a3a7a 85%, #1e40af 100%)'
              : 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
            borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 16px 48px rgba(0,0,0,0.4)',
            border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : `1px solid ${D.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          }}>
            {[['80%', '-20px', '220px', 'rgba(59,130,246,0.04)'], ['20%', '60%', '150px', 'rgba(99,102,241,0.04)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(8px)', border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.15)', boxShadow: isDark ? '0 0 20px rgba(59,130,246,0.3), 0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)' }}>
                <ClipboardList size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {canManage ? 'Fleet Job Management' : 'My Assigned Jobs'}
                </h1>
                <p style={{ margin: '4px 0 0', color: '#60a5fa', fontSize: '0.9rem' }}>
                  {canManage ? 'Assign jobs & vehicles, track driver progress' : 'Start, decline or complete the jobs assigned to you'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Quick Action Cards (Controller only) ──────────────────── */}
          {canManage && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 36 }}>
              {[
                { type: 'TRIP', label: 'Trip Assignment', desc: 'Assign driver and vehicle for transport trips', icon: <Navigation size={22} />, color: D.blue, bg: D.blueDim },
                { type: 'SERVICE', label: 'Service Assignment', desc: 'Dispatch driver for maintenance & services', icon: <Wrench size={22} />, color: D.gold, bg: D.goldDim },
                { type: 'FUEL', label: 'Fuel Assignment', desc: 'Assign driver to fill up gas before trip or when low', icon: <Fuel size={22} />, color: D.green, bg: D.greenDim },
              ].map(act => (
                <div key={act.type} onClick={() => { setActiveTab(act.type); setShowAssignModal(true) }}
                  style={{
                    background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, padding: '24px',
                    display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = act.color + '60';
                    e.currentTarget.style.boxShadow = `0 12px 28px ${act.color}15`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = D.border;
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                  }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: act.bg, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${act.color}30` }}>
                    {act.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginBottom: 4 }}>{act.label}</div>
                    <div style={{ fontSize: '0.78rem', color: D.textSub, lineHeight: 1.4 }}>{act.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}


          {/* ── Controls & List ───────────────────────────────────────── */}
          <div style={{ ...card, padding: 0 }}>
            <div style={{ padding: '22px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: D.surfaceHi, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
                {/* Status filter */}
                <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 160 }}>
                  <ClipboardList size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.blue, pointerEvents: 'none', opacity: 0.8 }} />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...filterStyle, paddingLeft: 38 }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="all">All Statuses</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="STARTED">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DECLINED">Declined</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                </div>
                {/* Driver filter (controller only) */}
                {canManage && (
                  <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 160 }}>
                    <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.purple, pointerEvents: 'none', opacity: 0.8 }} />
                    <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)} style={{ ...filterStyle, paddingLeft: 38 }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="all">All Drivers</option>
                      {uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canManage && (
                  <button
                    onClick={() => setDeletedDrawer(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 12,
                      background: D.surface, border: `1px solid ${D.border}`,
                      color: D.textSub, fontSize: '0.8rem', fontWeight: 800,
                      cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.28)'; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.background = D.surface; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub }}
                  >
                    <Archive size={13} />
                    Deleted Jobs
                  </button>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: D.text, padding: '10px 16px', borderRadius: 12, background: D.surface, border: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>
                  {filteredTrips.length} Job{filteredTrips.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Job rows */}
            {filteredTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: D.textSub }}>
                <ClipboardList size={40} color={D.textFaint} style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 700, color: D.text, marginBottom: 4 }}>No jobs found</div>
                <div style={{ fontSize: '0.85rem' }}>{canManage ? 'Assign a job with the buttons above.' : 'You have no assigned jobs right now.'}</div>
              </div>
            ) : (
              filteredTrips.map((trip, i) => {
                const type = getJobType(trip.purpose)
                const cleanPurpose = getCleanPurpose(trip.purpose)
                const badge = statusBadge(trip.status)
                const s = up(trip.status)
                const busy = busyId === trip.id

                const typeConfig = {
                  TRIP: { icon: <Navigation size={20} color={D.blue} />, bg: D.blueDim, label: 'Trip' },
                  SERVICE: { icon: <Wrench size={20} color={D.gold} />, bg: D.goldDim, label: 'Service' },
                  FUEL: { icon: <Fuel size={20} color={D.green} />, bg: D.greenDim, label: 'Fuel' },
                }[type] || { icon: <Navigation size={20} color={D.blue} />, bg: D.blueDim, label: 'Trip' }

                return (
                  <div key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 32px', borderBottom: i < filteredTrips.length - 1 ? `1px solid ${D.border}` : 'none', flexWrap: 'wrap', transition: 'background 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.background = D.surfaceHi}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* Route + meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: typeConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {typeConfig.icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: typeConfig.bg, color: typeConfig.icon.props.color, border: `1px solid ${typeConfig.icon.props.color}30`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {typeConfig.label}
                          </span>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {type === 'TRIP' && trip.origin ? `${trip.origin} → ` : ''}{trip.destination}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: D.textSub, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Car size={13} /> {trip.vehicleRegNumber}</span>
                          {canManage && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={13} /> {trip.driverUsername}</span>}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {fmtDate(trip.scheduledDate)}</span>
                          {cleanPurpose && <span style={{ color: D.textSub, fontWeight: 500 }}>· {cleanPurpose}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '5px 12px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{badge.label}</span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
                      {/* Driver */}
                      {!canManage && s === 'ASSIGNED' && (
                        <>
                          <ActionBtn onClick={() => setDriverModal({ action: 'start', trip })} disabled={busy} bg="linear-gradient(135deg,#059669,#10b981)" color="#fff" icon={<Play size={14} />}>Accept</ActionBtn>
                          <ActionBtn onClick={() => setDriverModal({ action: 'decline', trip })} disabled={busy} bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<X size={14} />}>Decline</ActionBtn>
                        </>
                      )}
                      {!canManage && s === 'STARTED' && (
                        <ActionBtn onClick={() => setDriverModal({ action: 'complete', trip })} disabled={busy} bg="linear-gradient(135deg,#2563eb,#3b82f6)" color="#fff" icon={<CheckCircle size={14} />}>Complete</ActionBtn>
                      )}
                      {/* Controller */}
                      {canManage && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {(s === 'DECLINED' || s === 'COMPLETED' || s === 'CANCELLED') && (
                            <span style={{ fontSize: '0.76rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
                              {s === 'DECLINED' && trip.declineReason ? `Reason: ${trip.declineReason}` : <><Clock size={13} /> Closed</>}
                            </span>
                          )}
                          {(s === 'ASSIGNED' || s === 'STARTED') && (
                            <ActionBtn onClick={() => setTripToCancel(trip)} disabled={busy} bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<Ban size={14} />}>Cancel</ActionBtn>
                          )}
                          <ActionBtn onClick={() => setDeleteConfirmTrip(trip)} disabled={busy} bg="rgba(239,68,68,0.1)" color="#ef4444" border="1px solid rgba(239,68,68,0.2)" icon={<Trash2 size={14} />}>Delete</ActionBtn>
                        </div>
                      )}
                      {!canManage && (s === 'DECLINED' || s === 'COMPLETED' || s === 'CANCELLED') && (
                        <span style={{ fontSize: '0.76rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {s === 'DECLINED' && trip.declineReason ? `Reason: ${trip.declineReason}` : <><Clock size={13} /> Closed</>}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Assign Job Modal (popup) ───────────────────────────────── */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, animation: 'fadeIn 0.25s ease' }} onClick={closeAssignModal}>
          <div style={{ background: D.surface, borderRadius: 24, width: '92%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {{
                    TRIP: <Navigation size={18} />,
                    SERVICE: <Wrench size={18} />,
                    FUEL: <Fuel size={18} />,
                  }[activeTab] || <ClipboardList size={18} />}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                    Assign a {activeTab === 'TRIP' ? 'Trip' : activeTab === 'SERVICE' ? 'Service Job' : 'Fuel Job'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>
                    {activeTab === 'TRIP' ? 'Assign a trip and a vehicle to a driver' : activeTab === 'SERVICE' ? 'Assign driver to perform vehicle service' : 'Assign driver to fill up gas for a vehicle'}
                  </p>
                </div>
              </div>
              <button onClick={closeAssignModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
            </div>

            <form onSubmit={handleAssign} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Driver *</label>
                  <select style={inputStyle} value={form.driverUsername} onChange={e => setForm(f => ({ ...f, driverUsername: e.target.value }))} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Select driver…</option>
                    {drivers.map(d => <option key={d.id} value={d.userName}>{d.userName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Vehicle *</label>
                  <select style={inputStyle} value={form.vehicleRegNumber} onChange={e => handleVehicleChange(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => <option key={v.id} value={v.registrationNo}>{v.registrationNo}{v.model ? ` — ${v.model}` : ''}{v.driverUsername ? ` 👤 ${v.driverUsername}` : ''}</option>)}
                  </select>
                  {/* Show auto-fill hint */}
                  {form.vehicleRegNumber && vehicles.find(v => v.registrationNo === form.vehicleRegNumber)?.driverUsername && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: D.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserCheck size={11} /> Driver auto-filled from vehicle assignment
                    </p>
                  )}
                </div>
                
                {activeTab === 'TRIP' && (
                  <div>
                    <label style={labelStyle}>Origin</label>
                    <input style={inputStyle} placeholder="e.g. Colombo" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                )}
                
                <div style={{ gridColumn: activeTab === 'TRIP' ? 'auto' : 'span 2' }}>
                  <label style={labelStyle}>
                    {activeTab === 'TRIP' ? 'Destination *' : activeTab === 'SERVICE' ? 'Service Center / Location *' : 'Fuel Station / Location *'}
                  </label>
                  <input style={inputStyle} 
                    placeholder={activeTab === 'TRIP' ? 'e.g. Kandy' : activeTab === 'SERVICE' ? 'e.g. Toyota Service Center, Colombo' : 'e.g. Lanka IOC Station, Kandy'} 
                    value={form.destination} 
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} 
                    onFocus={onFocus} 
                    onBlur={onBlur} 
                  />
                </div>
                
                <div>
                  <label style={labelStyle}>Scheduled Date</label>
                  <input type="date" style={inputStyle} value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} onFocus={onFocus} onBlur={onBlur} />
                </div>
                
                <div>
                  <label style={labelStyle}>
                    {activeTab === 'TRIP' ? 'Purpose' : activeTab === 'SERVICE' ? 'Service Description *' : 'Instructions'}
                  </label>
                  {activeTab === 'SERVICE' ? (
                    <select style={inputStyle} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} onFocus={onFocus} onBlur={onBlur}>
                      <option value="">Select service type…</option>
                      {sortedServiceTypes.map(t => (
                        <option key={t.value} value={t.label} style={{ color: t.isOverdue ? '#ef4444' : 'inherit', fontWeight: t.isOverdue ? 'bold' : 'normal' }}>
                          {t.isOverdue ? `⚠️ [OVERDUE] ${t.label}` : t.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input style={inputStyle} 
                      placeholder={activeTab === 'TRIP' ? 'e.g. Cargo delivery' : 'e.g. Fill full tank Octane 95 before trip'} 
                      value={form.purpose} 
                      onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} 
                      onFocus={onFocus} 
                      onBlur={onBlur} 
                    />
                  )}
                </div>

                {/* Overdue alert banner inside the form */}
                {activeTab === 'SERVICE' && selectedVehicle && sortedServiceTypes.some(t => t.isOverdue) && (
                  <div style={{
                    gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.82rem', fontWeight: 600,
                  }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    This vehicle has overdue service milestones! Please prioritize them (marked with ⚠️).
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 14, marginTop: 28 }}>
                <button type="button" disabled={submitting} onClick={closeAssignModal} style={{ flex: 1, padding: '15px', borderRadius: 16, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub, fontSize: '0.95rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }} onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = D.border }} onMouseLeave={e => e.currentTarget.style.background = D.surfaceHi}>Discard</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '15px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(59,130,246,0.35)', opacity: submitting ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submitting ? <Loader2 size={17} className="spin" /> : <Plus size={17} strokeWidth={3} />}
                  {submitting ? 'Assigning…' : `Assign ${activeTab === 'TRIP' ? 'Trip' : activeTab === 'SERVICE' ? 'Service' : 'Fuel'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Driver action confirmation ──────────────────────────────── */}
      <TripActionModal
        action={driverModal?.action}
        trip={driverModal?.trip}
        busy={busyId === driverModal?.trip?.id}
        onClose={() => setDriverModal(null)}
        onConfirm={runDriverAction}
      />

      {/* ── Cancel Job Confirmation Modal ──────────────────────────── */}
      {tripToCancel && (
        <div onClick={() => !cancelling && setTripToCancel(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', padding: '36px 32px', textAlign: 'center', animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
            <button type="button" onClick={() => !cancelling && setTripToCancel(null)} disabled={cancelling}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', borderRadius: 10, padding: 8, color: D.textSub, cursor: cancelling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = D.surfaceHi }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: D.redDim, border: `1px solid ${D.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.red, margin: '0 auto 20px' }}>
              <Ban size={28} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Cancel job to "{tripToCancel.destination}"?
            </h3>
            <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.6 }}>
              This job assigned to <strong style={{ color: D.text }}>{tripToCancel.driverUsername}</strong> will be cancelled and the driver notified. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => setTripToCancel(null)} disabled={cancelling}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = D.surfaceHi }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Keep Job
              </button>
              <button type="button" onClick={confirmCancel} disabled={cancelling}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: 'none', background: D.red, color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', fontFamily: 'inherit', opacity: cancelling ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {cancelling && <Loader2 size={15} className="spin" />}
                {cancelling ? 'Cancelling…' : 'Cancel Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Job Confirmation Modal ──────────────────────────── */}
      {deleteConfirmTrip && (
        <div onClick={() => !deletingId && setDeleteConfirmTrip(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', padding: '36px 32px', textAlign: 'center', animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
            <button type="button" onClick={() => !deletingId && setDeleteConfirmTrip(null)} disabled={!!deletingId}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', borderRadius: 10, padding: 8, color: D.textSub, cursor: deletingId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { if (!deletingId) e.currentTarget.style.background = D.surfaceHi }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: D.redDim, border: `1px solid ${D.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.red, margin: '0 auto 20px' }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Delete job to "{deleteConfirmTrip.destination}"?
            </h3>
            <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.6 }}>
              This will soft-delete the job. You can find and restore it from the **Deleted Jobs** tab.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeleteConfirmTrip(null)} disabled={!!deletingId}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: deletingId ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!deletingId) e.currentTarget.style.background = D.surfaceHi }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Cancel
              </button>
              <button type="button" onClick={() => handleDeleteTrip(deleteConfirmTrip.id)} disabled={!!deletingId}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: 'none', background: D.red, color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: deletingId ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', fontFamily: 'inherit', opacity: deletingId ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {deletingId && <Loader2 size={15} className="spin" />}
                {deletingId ? 'Deleting…' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deleted Jobs Drawer ─────────────────────────────────── */}
      {deletedDrawer && (
        <div
          onClick={() => { setDeletedDrawer(false); setDeletedDetail(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)', zIndex: 1200,
            animation: 'fadeIn 0.18s ease',
          }}
        >
          {/* Drawer panel */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 700,
              background: D.bg, display: 'flex', flexDirection: 'column',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
              animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)',
              borderLeft: `1px solid ${D.border}`,
            }}
          >
            {/* Drawer Header */}
            <div style={{
              background: 'linear-gradient(135deg,#7f1d1d 0%,#991b1b 45%,#dc2626 100%)',
              padding: '22px 28px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexShrink: 0, gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  <Archive size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    Deleted Jobs
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                    Soft-deleted jobs are preserved — not permanently removed
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setDeletedDrawer(false); setDeletedDetail(null) }}
                style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, cursor: 'pointer', color: '#fff',
                  padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
              {loadingDeleted ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: D.indigo }}>
                  <Loader2 className="spin" size={28} />
                </div>
              ) : deletedTrips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: D.textSub }}>
                  <ClipboardList size={40} opacity={0.3} style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, color: D.text }}>No deleted jobs found</div>
                  <div style={{ fontSize: '0.85rem' }}>Deleted jobs will appear here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {deletedTrips.map(trip => {
                    const type = getJobType(trip.purpose)
                    const cleanPurpose = getCleanPurpose(trip.purpose)
                    const s = up(trip.status)
                    const isRestoring = restoringId === trip.id

                    return (
                      <div key={trip.id} style={{
                        background: D.surface, border: `1px solid ${D.border}`,
                        borderRadius: 16, padding: '18px 22px', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', gap: 16
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: D.text }}>{trip.destination}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: D.surfaceHi, color: D.textSub, border: `1px solid ${D.border}` }}>
                              {type}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: D.textSub }}>
                            Driver: <strong>{trip.driverUsername}</strong> | Vehicle: <strong>{trip.vehicleRegNumber}</strong>
                          </div>
                          {cleanPurpose && (
                            <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4, fontStyle: 'italic' }}>
                              "{cleanPurpose}"
                            </div>
                          )}
                          {trip.deletedBy && (
                            <div style={{ fontSize: '0.72rem', color: D.red, marginTop: 6, fontWeight: 600 }}>
                              Deleted by {trip.deletedBy} on {fmtDate(trip.deletedAt)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRestoreTrip(trip.id)}
                          disabled={isRestoring}
                          style={{
                            background: D.indigoDim, color: D.indigo, border: 'none',
                            padding: '8px 14px', borderRadius: 10, fontSize: '0.78rem',
                            fontWeight: 800, cursor: isRestoring ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { if (!isRestoring) e.currentTarget.style.background = D.indigo; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { if (!isRestoring) e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.color = D.indigo; }}
                        >
                          {isRestoring ? <Loader2 size={13} className="spin" /> : <UserCheck size={13} />}
                          Restore
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  )
}

const ActionBtn = ({ children, onClick, disabled, bg, color, border, icon }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 10, border: border || 'none',
    background: bg, color, fontSize: '0.81rem', fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit', transition: 'all 0.15s',
  }}>
    {disabled ? <Loader2 size={14} className="spin" /> : icon}
    {children}
  </button>
)

export default TripsPage
