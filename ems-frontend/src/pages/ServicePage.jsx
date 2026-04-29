import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { serviceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Settings, Droplet, Circle, RotateCcw, Thermometer, Battery, Search, Wrench, Car, Calendar, MapPin, Edit2, Trash2, ClipboardList, CheckCircle, CircleDollarSign } from 'lucide-react'

/* ── Service type icon map ──────────────────────────────────────── */
const SERVICE_TYPE_ICONS = {
  OIL_CHANGE: <Droplet size={22} />,
  ENGINE_TUNE_UP: <Settings size={22} />,
  BRAKE_SERVICE: <Circle size={22} />,
  TIRE_ROTATION: <RotateCcw size={22} />,
  TRANSMISSION_SERVICE: <Settings size={22} />,
  AC_SERVICE: <Thermometer size={22} />,
  BATTERY_REPLACEMENT: <Battery size={22} />,
  GENERAL_INSPECTION: <Search size={22} />,
  OTHER: <Wrench size={22} />,
}

/* ── Status helpers ─────────────────────────────────────────────── */
const getStatus = (s) => {
  if (!s.serviceDate) return 'SCHEDULED'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const scheduled = new Date(s.serviceDate)
  scheduled.setHours(0, 0, 0, 0)
  return scheduled > today ? 'SCHEDULED' : 'COMPLETED'
}

const STATUS_CONFIG = {
  ALL: { label: 'All', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)' },
  SCHEDULED: { label: 'Scheduled', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  COMPLETED: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
}

/* ── Progress bar widths for stat cards ─────────────────────────── */
const ProgressBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
    </div>
  )
}

/* ── Service Record Card ────────────────────────────────────────── */
const ServiceCard = ({ record, index, isDriver, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false)
  const status = getStatus(record)
  const sc = STATUS_CONFIG[status]
  const icon = SERVICE_TYPE_ICONS[record.serviceType] || <Wrench size={22} />

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        transition: 'all 0.2s ease',
        cursor: 'default',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.25)' : 'none',
        animation: `fadeUp 0.3s ease ${index * 0.05}s both`,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: 'rgba(99,102,241,0.18)',
        border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#a5b4fc',
      }}>
        {icon}
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>
            {record.serviceType?.replace(/_/g, ' ') || 'Service'}
          </span>
          {/* Status badge */}
          <span style={{
            padding: '2px 10px', borderRadius: 999,
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: sc.bg, color: sc.color,
            border: `1px solid ${sc.border}`,
          }}>
            {sc.label}
          </span>
          {record.serviceTypeDetail && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({record.serviceTypeDetail})</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Vehicle */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#93c5fd', fontWeight: 600 }}>
            <Car size={14} /> {record.vehicleRegNumber || '—'}
          </span>
          {/* Date */}
          {record.serviceDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#94a3b8' }}>
              <Calendar size={14} /> {record.serviceDate.substring(0, 10)}
            </span>
          )}
          {/* Mileage */}
          {record.currentMileageKm && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#94a3b8' }}>
              <MapPin size={14} /> {Number(record.currentMileageKm).toLocaleString()} km
            </span>
          )}
          {/* Workshop */}
          {record.technicianWorkshop && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#94a3b8' }}>
              <Wrench size={14} /> {record.technicianWorkshop}
            </span>
          )}
        </div>

        {/* Description / notes */}
        {record.description && (
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
            {record.description}
          </p>
        )}
      </div>

      {/* Cost */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Rs. {Number(record.serviceCost || 0).toLocaleString()}
        </div>
        {record.nextServiceDue && (
          <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: 3 }}>
            Next: {record.nextServiceDue.substring(0, 10)}
          </div>
        )}
      </div>

      {/* Actions — Admin / Controller only */}
      {!isDriver && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            id={`edit-service-${record.id}`}
            onClick={() => onEdit(record.id)}
            style={{
              padding: '5px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
              background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#a5b4fc' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Edit2 size={12} /> Edit</span>
          </button>
          <button
            id={`delete-service-${record.id}`}
            onClick={() => onDelete(record.id)}
            style={{
              padding: '5px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
              background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
              border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#fca5a5' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Trash2 size={12} /> Delete</span>
          </button>
        </div>
      )}

    </div>
  )
}

/* ── Calendar View ────────────────────────────────────────────── */
const ServiceCalendar = ({ services, onEdit, isDriver, getStatus, STATUS_CONFIG }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))

  const monthName = currentDate.toLocaleString('default', { month: 'long' })

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const servicesByDate = services.reduce((acc, s) => {
    if (s.serviceDate) {
      const d = new Date(s.serviceDate)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateKey = d.getDate()
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(s)
      }
    }
    return acc
  }, {})

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9', margin: 0 }}>{monthName} {year}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem' }}>Prev</button>
          <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem' }}>Next</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.05)' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{ padding: '12px 10px', background: 'rgba(15,23,42,0.6)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`blank-${i}`} style={{ background: '#0f172a', minHeight: 110 }}></div>
        ))}

        {days.map(day => {
          const dayServices = servicesByDate[day] || []
          return (
            <div key={day} style={{ background: '#0f1e35', minHeight: 110, padding: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, marginBottom: 8 }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayServices.map(s => {
                  const status = getStatus(s)
                  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.COMPLETED
                  return (
                    <div key={s.id} onClick={() => !isDriver && onEdit(s.id)} style={{ cursor: isDriver ? 'default' : 'pointer', fontSize: '0.7rem', fontWeight: 600, background: sc.bg, color: sc.color, padding: '4px 6px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: `1px solid ${sc.border}` }}>
                      {s.vehicleRegNumber}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
          <div key={`end-blank-${i}`} style={{ background: '#0f172a', minHeight: 110, borderTop: '1px solid rgba(255,255,255,0.05)' }}></div>
        ))}
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
const ServicePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDriver = user?.role === 'DRIVER'

  const [services, setServices] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [servRes, statsRes] = await Promise.all([
        serviceAPI.getAllServices(),
        serviceAPI.getServiceStats(),
      ])
      setServices(servRes.data.data || [])
      setStats(statsRes.data.data)
    } catch (err) {
      console.error('Error loading service data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service record?')) return
    try {
      await serviceAPI.deleteService(id)
      loadData()
    } catch (err) {
      console.error('Error deleting', err)
      alert('Failed to delete record.')
    }
  }

  /* Derived counts */
  const scheduled = services.filter(s => getStatus(s) === 'SCHEDULED').length
  const completed = services.filter(s => getStatus(s) === 'COMPLETED').length
  const total = services.length

  /* Filtered list */
  const filtered = services.filter(s => {
    if (filter !== 'ALL' && getStatus(s) !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.vehicleRegNumber?.toLowerCase().includes(q) ||
        s.serviceType?.toLowerCase().includes(q) ||
        s.technicianWorkshop?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      )
    }
    return true
  })

  /* ── Shared dark-card style ───────────────────────────────────── */
  const darkCard = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '22px 24px',
    flex: 1,
    transition: 'all 0.2s ease',
  }

  return (
    <div className="app-shell service-page-dark">
      <Sidebar />
      <div className="main-content" style={{ background: '#0f172a', minHeight: '100vh' }}>
        <Topbar
          title={isDriver ? 'Service History' : 'Service'}
          subtitle={`Home / ${isDriver ? 'Service History' : 'Service'}`}
        />

        <div className="page-body" style={{ padding: '28px 32px' }}>

          {/* Hero Banner */}
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
            {[['80%', '−20px', '180px', 'rgba(255,255,255,0.03)'], ['20%', '60%', '120px', 'rgba(255,255,255,0.04)'], ['55%', '80%', '90px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Wrench size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {isDriver ? 'Service History' : 'Service Management'}
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                  {isDriver ? 'View your vehicle service and maintenance history.' : 'Schedule and track vehicle maintenance records.'}
                </p>
              </div>
            </div>

            {/* Top-right Actions: Toggle & Add */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, zIndex: 10 }}>
              {/* List / Calendar Toggle */}
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: 4,
              }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    background: viewMode === 'list' ? '#ffffff' : 'transparent', color: viewMode === 'list' ? '#4338ca' : '#a5b4fc', border: 'none', borderRadius: 10,
                    padding: '7px 20px', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}>List</button>
                <button
                  onClick={() => setViewMode('calendar')}
                  style={{
                    background: viewMode === 'calendar' ? '#ffffff' : 'transparent', color: viewMode === 'calendar' ? '#4338ca' : '#a5b4fc', border: 'none', borderRadius: 10,
                    padding: '7px 20px', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}>Calendar</button>
              </div>

              {/* Add button — Admin & Controller */}
              {!isDriver && (
                <button
                  id="add-service-btn"
                  onClick={() => navigate('/service/add')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 22px', borderRadius: 14, fontSize: '0.875rem', fontWeight: 700,
                    background: '#ffffff', color: '#4338ca', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <Calendar size={18} /> Schedule
                </button>
              )}
            </div>
          </div>

          {/* ── Stat Cards ────────────────────────────────────────── */}
          {!loading && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              {/* Total */}
              <div style={darkCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{total}</p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#6366f1' }}><ClipboardList size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Records</p>
                <ProgressBar value={total} max={total || 1} color="#6366f1" />
              </div>

              {/* Scheduled */}
              <div style={darkCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{scheduled}</p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#f59e0b' }}><Calendar size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Scheduled</p>
                <ProgressBar value={scheduled} max={total || 1} color="#f59e0b" />
              </div>

              {/* Completed */}
              <div style={darkCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{completed}</p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}><CheckCircle size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Completed</p>
                <ProgressBar value={completed} max={total || 1} color="#10b981" />
              </div>

              {/* Total Cost */}
              {stats && (
                <div style={darkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '1.55rem', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                      Rs.{(stats.totalServiceCost || 0).toLocaleString()}
                    </p>
                    <span style={{ display: 'flex', alignItems: 'center', color: '#3b82f6' }}><CircleDollarSign size={28} /></span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Cost</p>
                  <ProgressBar value={100} max={100} color="#3b82f6" />
                </div>
              )}
            </div>
          )}

          {/* ── Filter Tabs + Search ───────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center',
            gap: 10, flexWrap: 'wrap', marginBottom: 20,
          }}>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = key === 'ALL' ? total : key === 'SCHEDULED' ? scheduled : completed
                const active = filter === key
                return (
                  <button
                    key={key}
                    id={`filter-${key.toLowerCase()}`}
                    onClick={() => setFilter(key)}
                    style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      background: active ? `linear-gradient(135deg, #3b82f6, #6366f1)` : 'transparent',
                      color: active ? '#fff' : '#94a3b8',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: active ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                    }}
                  >
                    {cfg.label} <span style={{ opacity: 0.8, marginLeft: 2 }}>{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569', display: 'flex', alignItems: 'center' }}><Search size={16} /></span>
              <input
                id="service-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vehicles, drivers..."
                style={{
                  padding: '8px 14px 8px 32px',
                  borderRadius: 10, fontSize: '0.82rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0', outline: 'none', minWidth: 240,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* ── Main View Area ──────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {loading ? (
              /* Skeleton loader */
              [1, 2, 3].map(i => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '22px', height: 84,
                  animation: 'pulse 1.5s ease infinite',
                }} />
              ))
            ) : filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '64px 32px',
                background: 'rgba(255,255,255,0.02)', borderRadius: 16,
                border: '1px dashed rgba(255,255,255,0.1)',
              }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', opacity: 0.5 }}><Search size={48} /></div>
                <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>No service records found.</p>
                {!isDriver && (
                  <button
                    onClick={() => navigate('/service/add')}
                    style={{
                      marginTop: 16, padding: '9px 22px', borderRadius: 10,
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      color: '#fff', border: 'none', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 700,
                    }}
                  >
                    + Add First Record
                  </button>
                )}
              </div>
            ) : viewMode === 'calendar' ? (
              <ServiceCalendar
                services={filtered}
                isDriver={isDriver}
                onEdit={id => navigate(`/service/edit/${id}`)}
                getStatus={getStatus}
                STATUS_CONFIG={STATUS_CONFIG}
              />
            ) : (
              filtered.map((record, i) => (
                <ServiceCard
                  key={record.id}
                  record={record}
                  index={i}
                  isDriver={isDriver}
                  onEdit={id => navigate(`/service/edit/${id}`)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* ── Footer count ──────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div style={{ marginTop: 18, fontSize: '0.78rem', color: '#475569', textAlign: 'right' }}>
              Showing <strong style={{ color: '#94a3b8' }}>{filtered.length}</strong> of <strong style={{ color: '#94a3b8' }}>{services.length}</strong> records
            </div>
          )}

        </div>
      </div>

      {/* ── Dark-theme overrides for this page ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input[id="service-search"]::placeholder { color: #475569; }

        /* Topbar dark */
        .service-page-dark .topbar {
          background: #0f172a !important;
          border-bottom-color: rgba(255,255,255,0.08) !important;
        }
        .service-page-dark .topbar-title {
          color: #f1f5f9 !important;
        }
        .service-page-dark .topbar-breadcrumb {
          color: #475569 !important;
        }
        .service-page-dark .topbar-user {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
          color: #e2e8f0 !important;
        }
        .service-page-dark .topbar-user:hover {
          background: rgba(99,102,241,0.15) !important;
          border-color: rgba(99,102,241,0.4) !important;
        }
        .service-page-dark .topbar-name {
          color: #e2e8f0 !important;
        }

        /* Sidebar dark */
        .service-page-dark .sidebar {
          background: #0f1e35 !important;
          border-right-color: rgba(255,255,255,0.07) !important;
        }
        .service-page-dark .sidebar-header {
          border-bottom-color: rgba(255,255,255,0.07) !important;
        }
        .service-page-dark .sidebar-title {
          color: #f1f5f9 !important;
        }
        .service-page-dark .sidebar-subtitle {
          color: #475569 !important;
        }
        .service-page-dark .nav-section-label {
          color: #334155 !important;
        }
        .service-page-dark .nav-item {
          color: #64748b !important;
        }
        .service-page-dark .nav-item:hover {
          background: rgba(255,255,255,0.05) !important;
          color: #cbd5e1 !important;
        }
        .service-page-dark .nav-item.active {
          background: rgba(99,102,241,0.18) !important;
          color: #a5b4fc !important;
        }
        .service-page-dark .sidebar-footer {
          border-top-color: rgba(255,255,255,0.07) !important;
        }
        .service-page-dark .sidebar-divider {
          background: rgba(255,255,255,0.07) !important;
        }
        .service-page-dark .sidebar-logout-btn {
          color: rgba(255,255,255,0.5) !important;
        }
        .service-page-dark .sidebar-logout-btn:hover {
          color: #ef4444 !important;
        }
        .service-page-dark .sidebar-user-card {
          background: rgba(255,255,255,0.03) !important;
        }
        .service-page-dark .sidebar-user-name {
          color: #e2e8f0 !important;
        }
      `}</style>
    </div>
  )
}

export default ServicePage
