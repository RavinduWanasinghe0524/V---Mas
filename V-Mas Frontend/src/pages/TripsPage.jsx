import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TripActionModal from '../components/TripActionModal'
import { useD, useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { tripAPI, userAPI, vehicleAPI } from '../services/api'
import {
  MapPin, Navigation, Car, User, Calendar, Plus, Loader2,
  Play, X, CheckCircle, Ban, Route, Clock,
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
  const [tripToCancel, setTripToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [driverModal, setDriverModal] = useState(null) // { action, trip }

  const emptyForm = { driverUsername: '', vehicleRegNumber: '', origin: '', destination: '', purpose: '', scheduledDate: '' }
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

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

  // ── Controller: assign a trip ──────────────────────────────────────────
  const handleAssign = async (e) => {
    e.preventDefault()
    if (!form.driverUsername || !form.vehicleRegNumber || !form.destination.trim()) {
      flash('error', 'Driver, vehicle and destination are required')
      return
    }
    setSubmitting(true)
    try {
      const payload = { ...form, scheduledDate: form.scheduledDate || null }
      await tripAPI.assignTrip(payload)
      flash('success', 'Trip assigned successfully')
      setForm(emptyForm)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to assign trip')
    } finally {
      setSubmitting(false)
    }
  }

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

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem',
    color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = {
    display: 'block', marginBottom: 6, fontSize: '0.72rem', fontWeight: 700,
    color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  const cardStyle = {
    background: D.surface, borderRadius: 18, border: `1px solid ${D.border}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)', padding: 22,
  }

  return (
    <div className="app-shell" style={{ background: 'var(--bg-body)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: 'var(--bg-body)' }}>
        <Topbar
          title="Trips"
          subtitle={canManage ? 'Home / Trip Assignments' : 'Home / My Trips'}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />
        <div className="page-body">

          {banner && (
            <div style={{
              marginBottom: 20, padding: '12px 18px', borderRadius: 12, fontWeight: 600, fontSize: '0.85rem',
              background: banner.type === 'success' ? D.greenDim : D.redDim,
              color: banner.type === 'success' ? D.green : D.red,
              border: `1px solid ${banner.type === 'success' ? D.green : D.red}40`,
            }}>{banner.text}</div>
          )}

          {/* ── Controller: assignment form ─────────────────────────────── */}
          {canManage && (
            <div style={{ ...cardStyle, marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: D.purpleDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Route size={20} color={D.purple} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>Assign a Trip</div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub }}>Assign a trip and a vehicle to a driver</div>
                </div>
              </div>

              <form onSubmit={handleAssign}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Driver *</label>
                    <select style={inputStyle} value={form.driverUsername}
                      onChange={e => setForm(f => ({ ...f, driverUsername: e.target.value }))}>
                      <option value="">Select driver…</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.userName}>{d.userName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Vehicle *</label>
                    <select style={inputStyle} value={form.vehicleRegNumber}
                      onChange={e => setForm(f => ({ ...f, vehicleRegNumber: e.target.value }))}>
                      <option value="">Select vehicle…</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.registrationNo}>
                          {v.registrationNo}{v.model ? ` — ${v.model}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Scheduled Date</label>
                    <input type="date" style={inputStyle} value={form.scheduledDate}
                      onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Origin</label>
                    <input style={inputStyle} placeholder="e.g. Colombo" value={form.origin}
                      onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Destination *</label>
                    <input style={inputStyle} placeholder="e.g. Kandy" value={form.destination}
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Purpose</label>
                    <input style={inputStyle} placeholder="e.g. Cargo delivery" value={form.purpose}
                      onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" disabled={submitting} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff',
                  fontSize: '0.85rem', fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
                  fontFamily: 'inherit',
                }}>
                  {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  {submitting ? 'Assigning…' : 'Assign Trip'}
                </button>
              </form>
            </div>
          )}

          {/* ── Trip list ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: D.text }}>
              {canManage ? 'All Trips' : 'My Trips'}
            </h2>
            <span style={{ fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }}>({trips.length})</span>
            <div style={{ flex: 1, height: 1, background: D.border }} />
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 60, color: D.textSub }}>
              <Loader2 size={20} className="spin" /> Loading trips…
            </div>
          ) : trips.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: 60, color: D.textSub }}>
              <Route size={40} color={D.textFaint} style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 700, color: D.text, marginBottom: 4 }}>No trips yet</div>
              <div style={{ fontSize: '0.85rem' }}>
                {canManage ? 'Assign a trip using the form above.' : 'You have no assigned trips right now.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
              {trips.map(trip => {
                const badge = statusBadge(trip.status)
                const s = (trip.status || 'ASSIGNED').toUpperCase()
                const busy = busyId === trip.id
                return (
                  <div key={trip.id} style={cardStyle}>
                    {/* Header: route + status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 11, background: D.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Navigation size={20} color={D.blue} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: D.text, lineHeight: 1.2 }}>
                            {trip.origin ? `${trip.origin} → ` : ''}{trip.destination}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: D.textSub, marginTop: 2 }}>Trip #{trip.id}</div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, padding: '4px 10px', borderRadius: 999,
                        background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                        textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                      }}>{badge.label}</span>
                    </div>

                    {/* Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                      <Detail D={D} icon={<Car size={15} color={D.textSub} />} label="Vehicle" value={trip.vehicleRegNumber} />
                      {canManage && <Detail D={D} icon={<User size={15} color={D.textSub} />} label="Driver" value={trip.driverUsername} />}
                      <Detail D={D} icon={<Calendar size={15} color={D.textSub} />} label="Scheduled" value={fmtDate(trip.scheduledDate)} />
                      {trip.purpose && <Detail D={D} icon={<MapPin size={15} color={D.textSub} />} label="Purpose" value={trip.purpose} />}
                      {s === 'DECLINED' && trip.declineReason && (
                        <Detail D={D} icon={<Ban size={15} color={D.red} />} label="Decline reason" value={trip.declineReason} />
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${D.border}`, paddingTop: 14 }}>
                      {/* Driver actions */}
                      {!canManage && s === 'ASSIGNED' && (
                        <>
                          <ActionBtn onClick={() => setDriverModal({ action: 'start', trip })} disabled={busy}
                            bg="linear-gradient(135deg,#059669,#10b981)" color="#fff" icon={<Play size={14} />}>Start</ActionBtn>
                          <ActionBtn onClick={() => setDriverModal({ action: 'decline', trip })} disabled={busy}
                            bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<X size={14} />}>Decline</ActionBtn>
                        </>
                      )}
                      {!canManage && s === 'STARTED' && (
                        <ActionBtn onClick={() => setDriverModal({ action: 'complete', trip })} disabled={busy}
                          bg="linear-gradient(135deg,#2563eb,#3b82f6)" color="#fff" icon={<CheckCircle size={14} />}>Complete Trip</ActionBtn>
                      )}
                      {!canManage && (s === 'DECLINED' || s === 'COMPLETED' || s === 'CANCELLED') && (
                        <span style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={14} /> No actions available
                        </span>
                      )}

                      {/* Controller actions */}
                      {canManage && (s === 'ASSIGNED' || s === 'STARTED') && (
                        <ActionBtn onClick={() => setTripToCancel(trip)} disabled={busy}
                          bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<Ban size={14} />}>Cancel Trip</ActionBtn>
                      )}
                      {canManage && (s === 'DECLINED' || s === 'COMPLETED' || s === 'CANCELLED') && (
                        <span style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {busy ? <Loader2 size={14} className="spin" /> : <Clock size={14} />} Closed
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Driver action (start / decline / complete) confirmation ─── */}
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
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', borderRadius: 10, padding: 8, color: D.textSub, cursor: cancelling ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = 'var(--surface-hi)' }}
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
                onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = 'var(--surface-hi)' }}
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
      `}</style>
    </div>
  )
}

const Detail = ({ D, icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: '0.74rem', color: D.textSub, fontWeight: 600, minWidth: 82 }}>{label}</span>
    <span style={{ fontSize: '0.82rem', color: D.text, fontWeight: 700, wordBreak: 'break-word' }}>{value}</span>
  </div>
)

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
