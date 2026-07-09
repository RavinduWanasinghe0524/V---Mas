import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TripActionModal from '../components/TripActionModal'
import { useD, useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { tripAPI, userAPI, vehicleAPI } from '../services/api'
import {
  MapPin, Navigation, Car, User, Calendar, Plus, Loader2,
  Play, X, CheckCircle, Ban, Route, Clock, MoreVertical, ClipboardList,
} from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [banner, setBanner] = useState(null) // { type: 'success'|'error', text }

  const [showAssignModal, setShowAssignModal] = useState(false)
  const emptyForm = { driverUsername: '', vehicleRegNumber: '', origin: '', destination: '', purpose: '', scheduledDate: '' }
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const [tripToCancel, setTripToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [driverModal, setDriverModal] = useState(null) // { action, trip }

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')

  const flash = (type, text) => {
    setBanner({ type, text })
    setTimeout(() => setBanner(null), 4000)
  }

  const loadTrips = useCallback(async () => {
    try {
      const res = canManage ? await tripAPI.getAllTrips() : await tripAPI.getMyTrips()
      setTrips(res.data.data || [])
    } catch (err) {
      console.error('Error loading trips:', err)
      flash('error', 'Could not load trips')
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
    }
  }, [loadTrips, canManage])

  // Lock body scroll while a modal is open
  useEffect(() => {
    const open = showAssignModal || !!tripToCancel || !!driverModal
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showAssignModal, tripToCancel, driverModal])

  // ── Controller: assign a trip ──────────────────────────────────────────
  const handleAssign = async (e) => {
    e.preventDefault()
    if (!form.driverUsername || !form.vehicleRegNumber || !form.destination.trim()) {
      flash('error', 'Driver, vehicle and destination are required')
      return
    }
    setSubmitting(true)
    try {
      await tripAPI.assignTrip({ ...form, scheduledDate: form.scheduledDate || null })
      flash('success', 'Trip assigned successfully')
      setForm(emptyForm)
      setShowAssignModal(false)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to assign trip')
    } finally {
      setSubmitting(false)
    }
  }

  const closeAssignModal = () => { if (!submitting) { setShowAssignModal(false); setForm(emptyForm) } }

  const confirmCancel = async () => {
    if (!tripToCancel) return
    setCancelling(true)
    try {
      await tripAPI.cancelTrip(tripToCancel.id)
      flash('success', 'Trip cancelled')
      setTripToCancel(null)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to cancel trip')
    } finally {
      setCancelling(false)
    }
  }

  // ── Driver: act on a trip (confirmed via TripActionModal) ───────────────
  const runDriverAction = async (reason) => {
    if (!driverModal) return
    const { action, trip } = driverModal
    setBusyId(trip.id)
    try {
      if (action === 'start') { await tripAPI.startTrip(trip.id); flash('success', 'Trip started — drive safe!') }
      if (action === 'complete') { await tripAPI.completeTrip(trip.id); flash('success', 'Trip completed') }
      if (action === 'decline') { await tripAPI.declineTrip(trip.id, reason || ''); flash('success', 'Trip declined') }
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
    { label: 'Total Trips', value: stat.total, icon: <Route size={24} />, color: D.blue, bg: D.blueDim },
    { label: 'Awaiting Response', value: stat.assigned, icon: <Clock size={24} />, color: D.gold, bg: D.goldDim },
    { label: 'In Progress', value: stat.started, icon: <Navigation size={24} />, color: D.indigo, bg: D.indigoDim },
    { label: 'Completed', value: stat.completed, icon: <CheckCircle size={24} />, color: D.green, bg: D.greenDim },
  ]

  if (loading) return (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Trips" subtitle={canManage ? 'Home / Trip Assignments' : 'Home / My Trips'} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 80, color: D.textSub }}>
          <Loader2 size={20} className="spin" /> Loading trips…
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Trips" subtitle={canManage ? 'Home / Trip Assignments' : 'Home / My Trips'} onMenuToggle={() => setSidebarOpen(o => !o)} />
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
                <Route size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {canManage ? 'Fleet Trip Management' : 'My Assigned Trips'}
                </h1>
                <p style={{ margin: '4px 0 0', color: '#60a5fa', fontSize: '0.9rem' }}>
                  {canManage ? 'Assign trips & vehicles, track driver progress' : 'Start, decline or complete the trips assigned to you'}
                </p>
              </div>
            </div>
            {canManage && (
              <div style={{ position: 'relative', display: 'flex', gap: 16, flexShrink: 0 }}>
                <button onClick={() => setShowAssignModal(true)} style={{
                  padding: '14px 28px', borderRadius: 16, border: 'none', background: '#fff', color: '#1e3a8a', cursor: 'pointer',
                  fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.3)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}>
                  <Plus size={20} strokeWidth={3} /> Assign Trip
                </button>
              </div>
            )}
          </div>

          {/* ── Stats Grid ────────────────────────────────────────────── */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
            {statCards.map(s => (
              <div key={s.label} style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: 24, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = s.color + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${s.color}20` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.color}30`, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

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
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: D.text, padding: '10px 16px', borderRadius: 12, background: D.surface, border: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>
                {filteredTrips.length} Trip{filteredTrips.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Trip rows */}
            {filteredTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: D.textSub }}>
                <Route size={40} color={D.textFaint} style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 700, color: D.text, marginBottom: 4 }}>No trips found</div>
                <div style={{ fontSize: '0.85rem' }}>{canManage ? 'Assign a trip with the button above.' : 'You have no assigned trips right now.'}</div>
              </div>
            ) : (
              filteredTrips.map((trip, i) => {
                const badge = statusBadge(trip.status)
                const s = up(trip.status)
                const busy = busyId === trip.id
                return (
                  <div key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 32px', borderBottom: i < filteredTrips.length - 1 ? `1px solid ${D.border}` : 'none', flexWrap: 'wrap', transition: 'background 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.background = D.surfaceHi}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* Route + meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: D.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Navigation size={20} color={D.blue} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {trip.origin ? `${trip.origin} → ` : ''}{trip.destination}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: D.textSub, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Car size={13} /> {trip.vehicleRegNumber}</span>
                          {canManage && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={13} /> {trip.driverUsername}</span>}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {fmtDate(trip.scheduledDate)}</span>
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
                          <ActionBtn onClick={() => setDriverModal({ action: 'start', trip })} disabled={busy} bg="linear-gradient(135deg,#059669,#10b981)" color="#fff" icon={<Play size={14} />}>Start</ActionBtn>
                          <ActionBtn onClick={() => setDriverModal({ action: 'decline', trip })} disabled={busy} bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<X size={14} />}>Decline</ActionBtn>
                        </>
                      )}
                      {!canManage && s === 'STARTED' && (
                        <ActionBtn onClick={() => setDriverModal({ action: 'complete', trip })} disabled={busy} bg="linear-gradient(135deg,#2563eb,#3b82f6)" color="#fff" icon={<CheckCircle size={14} />}>Complete</ActionBtn>
                      )}
                      {/* Controller */}
                      {canManage && (s === 'ASSIGNED' || s === 'STARTED') && (
                        <ActionBtn onClick={() => setTripToCancel(trip)} disabled={busy} bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<Ban size={14} />}>Cancel</ActionBtn>
                      )}
                      {(s === 'DECLINED' || s === 'COMPLETED' || s === 'CANCELLED') && (
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

      {/* ── Assign Trip Modal (popup) ───────────────────────────────── */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, animation: 'fadeIn 0.25s ease' }} onClick={closeAssignModal}>
          <div style={{ background: D.surface, borderRadius: 24, width: '92%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}><Route size={18} /></div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Assign a Trip</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>Assign a trip and a vehicle to a driver</p>
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
                  <select style={inputStyle} value={form.vehicleRegNumber} onChange={e => setForm(f => ({ ...f, vehicleRegNumber: e.target.value }))} onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => <option key={v.id} value={v.registrationNo}>{v.registrationNo}{v.model ? ` — ${v.model}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Origin</label>
                  <input style={inputStyle} placeholder="e.g. Colombo" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Destination *</label>
                  <input style={inputStyle} placeholder="e.g. Kandy" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Scheduled Date</label>
                  <input type="date" style={inputStyle} value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Purpose</label>
                  <input style={inputStyle} placeholder="e.g. Cargo delivery" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, marginTop: 28 }}>
                <button type="button" disabled={submitting} onClick={closeAssignModal} style={{ flex: 1, padding: '15px', borderRadius: 16, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub, fontSize: '0.95rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }} onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = D.border }} onMouseLeave={e => e.currentTarget.style.background = D.surfaceHi}>Discard</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '15px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(59,130,246,0.35)', opacity: submitting ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submitting ? <Loader2 size={17} className="spin" /> : <Plus size={17} strokeWidth={3} />}
                  {submitting ? 'Assigning…' : 'Assign Trip'}
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

      {/* ── Cancel Trip Confirmation Modal ──────────────────────────── */}
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
              Cancel trip to "{tripToCancel.destination}"?
            </h3>
            <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.6 }}>
              This trip assigned to <strong style={{ color: D.text }}>{tripToCancel.driverUsername}</strong> will be cancelled and the driver notified. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => setTripToCancel(null)} disabled={cancelling}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = D.surfaceHi }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Keep Trip
              </button>
              <button type="button" onClick={confirmCancel} disabled={cancelling}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: 'none', background: D.red, color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', fontFamily: 'inherit', opacity: cancelling ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {cancelling && <Loader2 size={15} className="spin" />}
                {cancelling ? 'Cancelling…' : 'Cancel Trip'}
              </button>
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
    background: bg, color, fontSize: '0.8rem', fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit', transition: 'all 0.15s',
  }}>
    {disabled ? <Loader2 size={14} className="spin" /> : icon}
    {children}
  </button>
)

export default TripsPage
