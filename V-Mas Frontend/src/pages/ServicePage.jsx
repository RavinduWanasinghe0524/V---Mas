import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { serviceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { Settings, Droplet, Circle, RotateCcw, Thermometer, Battery, Search, Wrench, Car, Calendar, MapPin, Edit2, Trash2, ClipboardList, CheckCircle, CircleDollarSign, X, Check, AlertTriangle, Paperclip, User, Eye, Archive, Clock } from 'lucide-react'

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

const initialForm = {
  vehicleRegNumber: '',
  serviceType: '',
  serviceTypeDetail: '',
  serviceDate: '',
  currentMileageKm: '',
  serviceCost: '',
  technicianWorkshop: '',
  nextServiceDue: '',
  description: '',
}

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
const ProgressBar = ({ value, max, color, D }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height: 4, background: D ? D.border : 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
    </div>
  )
}

/* ── Service List Card (Old Style) ──────────────────────────────── */
const ServiceListCard = ({ record, index, isDriver, onEdit, onDelete, onView, D }) => {
  const [hovered, setHovered] = useState(false)
  const status = getStatus(record)
  const sc = STATUS_CONFIG[status]
  const icon = SERVICE_TYPE_ICONS[record.serviceType] || <Wrench size={22} />

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onView(record)}
      style={{
        background: hovered ? D.surfaceHi : D.surface,
        border: `1px solid ${hovered ? D.borderHi : D.border}`,
        borderRadius: 14,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.12)' : 'none',
        animation: `fadeUp 0.3s ease ${index * 0.05}s both`,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: D.indigoDim,
        border: `1px solid ${D.borderHi}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: D.indigo,
      }}>
        {icon}
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: D.text }}>
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
            <span style={{ fontSize: '0.75rem', color: D.textSub }}>({record.serviceTypeDetail})</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: D.blue, fontWeight: 600 }}>
            <Car size={14} /> {record.vehicleRegNumber || '—'}
          </span>
          {record.serviceDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: D.textSub }}>
              <Calendar size={14} /> {record.serviceDate.substring(0, 10)}
            </span>
          )}
          {record.currentMileageKm && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: D.textSub }}>
              <MapPin size={14} /> {Number(record.currentMileageKm).toLocaleString()} km
            </span>
          )}
          {record.technicianWorkshop && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: D.textSub }}>
              <Wrench size={14} /> {record.technicianWorkshop}
            </span>
          )}
          {/* ── Who added + when ── */}
          {record.createdBy && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: D.textSub }}>
              <User size={12} /> {record.createdBy}
            </span>
          )}
          {record.createdAt && (
            <span style={{ fontSize: '0.72rem', color: D.textSub }}>
              {new Date(record.createdAt).toLocaleDateString()}
            </span>
          )}
          {/* ── Attachment chip ── */}
          {record.attachmentPath && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)' }}>
              <Paperclip size={11} /> Bill attached
            </span>
          )}
        </div>

        {record.description && (
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: D.textSub, fontStyle: 'italic' }}>
            {record.description}
          </p>
        )}
      </div>

      {/* Cost */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Rs. {Number(record.serviceCost || 0).toLocaleString()}
        </div>
        {record.nextServiceDue && (
          <div style={{ fontSize: '0.67rem', color: D.textSub, marginTop: 3 }}>
            Next: {record.nextServiceDue.substring(0, 10)}
          </div>
        )}
      </div>

      {/* Actions — stop propagation so clicking buttons doesn't also open the detail modal */}
      {!isDriver && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(record.id) }}
            style={{
              padding: '5px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
              background: D.indigoDim, color: D.indigo,
              border: `1px solid ${D.borderHi}`, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = D.indigo; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.color = D.indigo }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Edit2 size={12} /> Edit</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(record.id) }}
            style={{
              padding: '5px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
              background: D.redDim, color: D.red,
              border: `1px solid rgba(239,68,68,0.25)`, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Trash2 size={12} /> Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Service Grid Card (New Style) ──────────────────────────────── */
const ServiceGridCard = ({ record, index, isDriver, onEdit, onDelete, onView, D }) => {
  const [hovered, setHovered] = useState(false)
  const status = getStatus(record)
  const sc = STATUS_CONFIG[status]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onView(record)}
      style={{
        background: D.surface,
        border: `1px solid ${hovered ? D.borderHi : D.border}`,
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'all 0.2s ease',
        animation: `fadeUp 0.3s ease ${index * 0.05}s both`,
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.1)' : 'none',
        cursor: 'pointer',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: D.blue, fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>
            {record.serviceType?.replace(/_/g, ' ') || 'Service'}
          </div>
          <div style={{ color: D.textSub, fontSize: '0.8rem' }}>
            {record.vehicleRegNumber || '—'}
            {record.serviceTypeDetail ? ` - ${record.serviceTypeDetail}` : ''}
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 999,
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
          background: sc.bg, color: sc.color,
          border: `1px solid ${sc.border}`,
          textTransform: 'uppercase'
        }}>
          {sc.label}
        </div>
      </div>

      <div style={{ height: 1, background: D.border }} />

      {/* Description */}
      <div style={{ color: D.text, fontSize: '0.85rem' }}>
        {record.description || 'No description provided.'}
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div>
          <div style={{ color: D.textSub, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Date</div>
          <div style={{ color: D.text, fontSize: '0.9rem', fontWeight: 700 }}>
            {record.serviceDate ? new Date(record.serviceDate).toLocaleDateString() : '—'}
          </div>
        </div>
        <div>
          <div style={{ color: D.textSub, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Mileage</div>
          <div style={{ color: D.text, fontSize: '0.9rem', fontWeight: 700 }}>
            {record.currentMileageKm ? `${Number(record.currentMileageKm).toLocaleString()} km` : '—'}
          </div>
        </div>
        <div>
          <div style={{ color: D.textSub, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Cost</div>
          <div style={{ color: D.text, fontSize: '0.9rem', fontWeight: 700 }}>
            Rs. {Number(record.serviceCost || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: D.textSub, fontSize: '0.75rem' }}>
          <Wrench size={12} /> {record.technicianWorkshop || '—'}
        </div>
        <div style={{ color: D.textSub, fontSize: '0.75rem' }}>
          Next: {record.nextServiceDue ? record.nextServiceDue.substring(0, 10) : '—'}
        </div>
      </div>

      {/* ── Created by / at + attachment ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: `1px solid ${D.border}` }}>
        {record.createdBy && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: D.textSub }}>
            <User size={11} /> {record.createdBy}
          </span>
        )}
        {record.createdAt && (
          <span style={{ fontSize: '0.7rem', color: D.textSub }}>
            · {new Date(record.createdAt).toLocaleDateString()}
          </span>
        )}
        {record.attachmentPath && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)' }}>
            <Paperclip size={11} /> Bill attached
          </span>
        )}
      </div>

      {/* Actions — stop propagation so clicking buttons doesn't also open the detail modal */}
      {!isDriver && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(record.id) }}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
              background: D.indigoDim, color: D.indigo, border: `1px solid ${D.borderHi}`, cursor: 'pointer', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = D.indigo; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.color = D.indigo }}
          >
            Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(record.id) }}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
              background: D.redDim, color: D.red, border: `1px solid rgba(239,68,68,0.2)`, cursor: 'pointer', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Calendar View ────────────────────────────────────────────── */
const ServiceCalendar = ({ services, onEdit, isDriver, getStatus, STATUS_CONFIG, D }) => {
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
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${D.border}` }}>
        <h2 style={{ fontSize: '1.25rem', color: D.text, margin: 0 }}>{monthName} {year}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={prevMonth} style={{ background: D.surfaceHi, border: `1px solid ${D.border}`, color: D.text, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem' }}>Prev</button>
          <button onClick={nextMonth} style={{ background: D.surfaceHi, border: `1px solid ${D.border}`, color: D.text, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem' }}>Next</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: D.border }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{ padding: '12px 10px', background: D.surfaceHi, color: D.textSub, fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`blank-${i}`} style={{ background: D.bg, minHeight: 110 }}></div>
        ))}

        {days.map(day => {
          const dayServices = servicesByDate[day] || []
          return (
            <div key={day} style={{ background: D.surface, minHeight: 110, padding: '8px', borderTop: `1px solid ${D.border}` }}>
              <div style={{ fontSize: '0.85rem', color: D.text, fontWeight: 600, marginBottom: 8 }}>{day}</div>
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
          <div key={`end-blank-${i}`} style={{ background: D.bg, minHeight: 110, borderTop: `1px solid ${D.border}` }}></div>
        ))}
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
const ServicePage = () => {
  const D = useD()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDriver = user?.role === 'DRIVER'

  const [services, setServices] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
  const [detailModal, setDetailModal] = useState({ isOpen: false, record: null })

  // ── Deleted records drawer ─────────────────────────────────────────────
  const [deletedDrawer, setDeletedDrawer] = useState(false)
  const [deletedRecords, setDeletedRecords] = useState([])
  const [deletedLoading, setDeletedLoading] = useState(false)
  const [deletedDetail, setDeletedDetail] = useState(null)  // record shown in inner detail
  const [restoringId, setRestoringId] = useState(null)     // tracks which record is being restored

  // ── Audit history for detail modal ─────────────────────────────────────
  const [serviceHistory, setServiceHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [editFormData, setEditFormData] = useState(initialForm)
  const [formLoading, setFormLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  // Attachment file state
  const [addAttachmentFile, setAddAttachmentFile] = useState(null)
  const [editAttachmentFile, setEditAttachmentFile] = useState(null)

  const showToast = (msg, type) => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => {
    if (isAddModalOpen || isEditModalOpen || deleteModal.isOpen || detailModal.isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isAddModalOpen, isEditModalOpen, deleteModal.isOpen, detailModal.isOpen])

  // Fetch audit history whenever detail modal opens for a record
  useEffect(() => {
    if (detailModal.isOpen && detailModal.record?.id) {
      setServiceHistory([])
      setHistoryLoading(true)
      serviceAPI.getServiceHistory(detailModal.record.id)
        .then(res => setServiceHistory(res.data.data || []))
        .catch(() => setServiceHistory([]))
        .finally(() => setHistoryLoading(false))
    }
  }, [detailModal.isOpen, detailModal.record?.id])

  const validate = (data) => {
    const e = {}
    if (!data.vehicleRegNumber?.trim()) e.vehicleRegNumber = 'Required'
    if (!data.serviceType) e.serviceType = 'Required'
    if (data.serviceType === 'OTHER' && !data.serviceTypeDetail?.trim())
      e.serviceTypeDetail = 'Required for Other'
    if (!data.serviceDate) e.serviceDate = 'Required'
    if (!data.currentMileageKm) e.currentMileageKm = 'Required'
    if (!data.serviceCost) e.serviceCost = 'Required'
    if (!data.technicianWorkshop?.trim()) e.technicianWorkshop = 'Required'
    return e
  }

  const openAddModal = () => {
    setFormData(initialForm)
    setErrors({})
    setSubmitError(null)
    setAddAttachmentFile(null)
    setIsAddModalOpen(true)
  }
  const closeAddModal = () => setIsAddModalOpen(false)

  const handleAddChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(formData)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setFormLoading(true)
    setSubmitError(null)
    try {
      const payload = {
        ...formData,
        nextServiceMileageKm: formData.nextServiceMileageKm ? Number(formData.nextServiceMileageKm) : null
      }
      const res = await serviceAPI.createService(payload)
      // If a file was selected, upload it immediately after record creation
      if (addAttachmentFile && res.data?.data?.id) {
        try {
          await serviceAPI.uploadAttachment(res.data.data.id, addAttachmentFile)
        } catch {
          // Non-fatal — record is saved, just the attachment failed
          showToast('Record saved but attachment upload failed.', 'error')
        }
      }
      setIsAddModalOpen(false)
      loadData()
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save service record.')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditModal = (id) => {
    const record = services.find(s => s.id === id)
    if (!record) return
    setEditingServiceId(id)
    setEditFormData({
      vehicleRegNumber: record.vehicleRegNumber || '',
      serviceType: record.serviceType || '',
      serviceTypeDetail: record.serviceTypeDetail || '',
      serviceDate: record.serviceDate ? record.serviceDate.substring(0, 10) : '',
      currentMileageKm: record.currentMileageKm || '',
      serviceCost: record.serviceCost || '',
      technicianWorkshop: record.technicianWorkshop || '',
      nextServiceDue: record.nextServiceDue ? record.nextServiceDue.substring(0, 10) : '',
      nextServiceMileageKm: record.nextServiceMileageKm || '',
      description: record.description || '',
    })
    setErrors({})
    setSubmitError(null)
    setEditAttachmentFile(null)
    setIsEditModalOpen(true)
  }
  const closeEditModal = () => setIsEditModalOpen(false)

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(editFormData)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setFormLoading(true)
    setSubmitError(null)
    try {
      const payload = {
        ...editFormData,
        nextServiceMileageKm: editFormData.nextServiceMileageKm ? Number(editFormData.nextServiceMileageKm) : null
      }
      await serviceAPI.updateService(editingServiceId, payload)
      // Upload new attachment if selected
      if (editAttachmentFile) {
        try {
          await serviceAPI.uploadAttachment(editingServiceId, editAttachmentFile)
        } catch {
          showToast('Record saved but attachment upload failed.', 'error')
        }
      }
      setIsEditModalOpen(false)
      loadData()
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to update service record.')
    } finally {
      setFormLoading(false)
    }
  }

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

  const loadDeletedData = useCallback(async () => {
    setDeletedLoading(true)
    try {
      const res = await serviceAPI.getDeletedServices()
      setDeletedRecords(res.data.data || [])
    } catch (err) {
      console.error('Error loading deleted records', err)
    } finally {
      setDeletedLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Load deleted records when drawer opens
  useEffect(() => {
    if (deletedDrawer) loadDeletedData()
  }, [deletedDrawer, loadDeletedData])

  const restoreRecord = async (id) => {
    setRestoringId(id)
    try {
      await serviceAPI.restoreService(id)
      // Refresh both lists so everything stays in sync
      await Promise.all([loadData(), loadDeletedData()])
      setDeletedDetail(null)  // go back to list so user sees the record is gone
      showToast('Service record restored successfully.', 'success')
    } catch (err) {
      console.error('Error restoring record', err)
      showToast('Failed to restore record.', 'error')
    } finally {
      setRestoringId(null)
    }
  }

  const confirmDelete = (id) => {
    setDeleteModal({ isOpen: true, id })
  }

  const executeDelete = async () => {
    const id = deleteModal.id;
    if (!id) return;
    try {
      await serviceAPI.deleteService(id)
      loadData()
      setDeleteModal({ isOpen: false, id: null })
      showToast('Service record deleted successfully.', 'success')
    } catch (err) {
      console.error('Error deleting', err)
      setDeleteModal({ isOpen: false, id: null })
      showToast('Failed to delete record.', 'error')
    }
  }

  /* Derived counts */
  const scheduled = services.filter(s => getStatus(s) === 'SCHEDULED').length
  const completed = services.filter(s => getStatus(s) === 'COMPLETED').length
  const total = services.length

  /* Filtered and sorted list */
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
  }).sort((a, b) => {
    const dateA = a.serviceDate ? new Date(a.serviceDate) : new Date(0);
    const dateB = b.serviceDate ? new Date(b.serviceDate) : new Date(0);
    return dateB - dateA;
  })

  /* ── Shared stat-card style ───────────────────────────────────── */
  const statCard = {
    background: D.surface,
    border: `1px solid ${D.border}`,
    borderRadius: 16,
    padding: '22px 24px',
    flex: 1,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  }

  /* ── Modal form styles ────────────────────────────────────────── */
  const fieldLabel = {
    display: 'block', fontSize: '0.78rem', fontWeight: 700,
    color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 6,
  }
  const fieldInput = (hasError) => ({
    width: '100%', padding: '10px 14px', background: D.inputBg,
    border: `1px solid ${hasError ? 'rgba(248,113,113,0.5)' : D.inputBorder}`,
    borderRadius: 8, color: D.text, fontSize: '0.85rem',
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
  })
  const fieldError = { color: D.red, fontSize: '0.72rem', margin: '4px 0 0 0' }

  const focusBorder = (e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }
  const blurBorder = (e, hasErr) => { e.target.style.borderColor = hasErr ? 'rgba(248,113,113,0.5)' : D.inputBorder; e.target.style.boxShadow = 'none' }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content" style={{ background: D.bg, minHeight: '100vh' }}>
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
              {/* List / Grid / Calendar Toggle */}
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
                  onClick={() => setViewMode('grid')}
                  style={{
                    background: viewMode === 'grid' ? '#ffffff' : 'transparent', color: viewMode === 'grid' ? '#4338ca' : '#a5b4fc', border: 'none', borderRadius: 10,
                    padding: '7px 20px', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}>Grid</button>
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
                  onClick={openAddModal}
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
              <div style={statCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{total}</p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#6366f1' }}><ClipboardList size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Records</p>
                <ProgressBar value={total} max={total || 1} color="#6366f1" D={D} />
              </div>

              {/* Scheduled */}
              <div style={statCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{scheduled}</p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#f59e0b' }}><Calendar size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Scheduled</p>
                <ProgressBar value={scheduled} max={total || 1} color="#f59e0b" D={D} />
              </div>

              {/* Completed */}
              <div style={statCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{completed}</p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}><CheckCircle size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Completed</p>
                <ProgressBar value={completed} max={total || 1} color="#10b981" D={D} />
              </div>

              {/* Total Cost */}
              {stats && (
                <div style={statCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                      Rs.{(stats.totalServiceCost || 0).toLocaleString()}
                    </p>
                    <span style={{ display: 'flex', alignItems: 'center', color: D.blue }}><CircleDollarSign size={28} /></span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Total Cost</p>
                  <ProgressBar value={100} max={100} color={D.blue} D={D} />
                </div>
              )}
            </div>
          )}

          {/* ── Filter Tabs + Search ───────────────────────────────── */}
          <div style={{
            background: D.surface,
            border: `1px solid ${D.border}`,
            borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center',
            gap: 10, flexWrap: 'wrap', marginBottom: 20,
          }}>
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
                      border: active ? 'none' : `1px solid ${D.border}`,
                      background: active ? `linear-gradient(135deg, #3b82f6, #6366f1)` : 'transparent',
                      color: active ? '#fff' : D.textSub,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: active ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                    }}
                  >
                    {cfg.label} <span style={{ opacity: 0.8, marginLeft: 2 }}>{count}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ flex: 1 }} />
            {/* ── Deleted Records Button ──────────────────── */}
            {!isDriver && (
              <button
                id="view-deleted-records-btn"
                onClick={() => setDeletedDrawer(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '7px 16px', borderRadius: 10,
                  fontSize: '0.78rem', fontWeight: 700,
                  background: 'rgba(239,68,68,0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.25)',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
              >
                <Archive size={14} />
                Deleted Records
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.textSub, display: 'flex', alignItems: 'center' }}><Search size={16} /></span>
              <input
                id="service-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vehicles, drivers..."
                style={{
                  padding: '8px 14px 8px 32px',
                  borderRadius: 10, fontSize: '0.82rem',
                  background: D.inputBg,
                  border: `1px solid ${D.inputBorder}`,
                  color: D.text, outline: 'none', minWidth: 240,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)' }}
                onBlur={e => { e.target.style.borderColor = D.inputBorder }}
              />
            </div>
          </div>

          {/* ── Main View Area ──────────────────────────────────────── */}
          <div style={
            viewMode === 'calendar' ? { display: 'flex', flexDirection: 'column', gap: 12 } : 
            viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 } : 
            { display: 'flex', flexDirection: 'column', gap: 16 }
          }>

            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{
                  background: D.surface, border: `1px solid ${D.border}`,
                  borderRadius: 14, padding: '22px', minHeight: viewMode === 'grid' ? 200 : 84,
                  animation: 'pulse 1.5s ease infinite',
                }} />
              ))
            ) : filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '64px 32px',
                background: D.surface, borderRadius: 16,
                border: `1px dashed ${D.border}`,
              }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', opacity: 0.5, color: D.textSub }}><Search size={48} /></div>
                <p style={{ color: D.textSub, fontSize: '0.95rem', fontWeight: 500 }}>No service records found.</p>
                {!isDriver && (
                  <button
                    onClick={openAddModal}
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
                onEdit={openEditModal}
                getStatus={getStatus}
                STATUS_CONFIG={STATUS_CONFIG}
                D={D}
              />
            ) : viewMode === 'grid' ? (
              filtered.map((record, i) => (
                <ServiceGridCard
                  key={record.id}
                  record={record}
                  index={i}
                  isDriver={isDriver}
                  onEdit={openEditModal}
                  onDelete={confirmDelete}
                  onView={r => setDetailModal({ isOpen: true, record: r })}
                  D={D}
                />
              ))
            ) : (
              filtered.map((record, i) => (
                <ServiceListCard
                  key={record.id}
                  record={record}
                  index={i}
                  isDriver={isDriver}
                  onEdit={openEditModal}
                  onDelete={confirmDelete}
                  onView={r => setDetailModal({ isOpen: true, record: r })}
                  D={D}
                />
              ))
            )}
          </div>

          {/* ── Footer count ──────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div style={{ marginTop: 18, fontSize: '0.78rem', color: D.textSub, textAlign: 'right' }}>
              Showing <strong style={{ color: D.text }}>{filtered.length}</strong> of <strong style={{ color: D.text }}>{services.length}</strong> records
            </div>
          )}

        </div>
      </div>

      {/* ── Deleted Records Drawer ─────────────────────────────────── */}
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
                    Deleted Records
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                    Soft-deleted records are stored securely — not permanently removed
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

            {/* Count badge */}
            {!deletedLoading && (
              <div style={{
                padding: '14px 28px', background: D.surface,
                borderBottom: `1px solid ${D.border}`,
                display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 14px', borderRadius: 999,
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: '0.78rem', fontWeight: 700,
                }}>
                  <Trash2 size={12} />
                  {deletedRecords.length} record{deletedRecords.length !== 1 ? 's' : ''} deleted
                </span>
                <span style={{ fontSize: '0.75rem', color: D.textSub }}>
                  These records are preserved for audit purposes
                </span>
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deletedLoading ? (
                [1,2,3].map(i => (
                  <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, height: 90, animation: 'pulse 1.5s ease infinite' }} />
                ))
              ) : deletedRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: D.textSub }}>
                  <div style={{ opacity: 0.4, display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Archive size={44} /></div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>No deleted records found.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Deleted service records will appear here.</p>
                </div>
              ) : deletedDetail ? (
                /* ── Inner Detail View ───────────────────────────────── */
                (() => {
                  const r = deletedDetail
                  const icon = SERVICE_TYPE_ICONS[r.serviceType] || <Wrench size={20} />
                  return (
                    <div style={{ animation: 'fadeIn 0.15s ease' }}>
                      {/* Action row: Back + Restore */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <button
                          onClick={() => setDeletedDetail(null)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8,
                            background: D.surface, border: `1px solid ${D.border}`,
                            color: D.textSub, cursor: 'pointer', fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          ← Back to list
                        </button>

                        {/* Restore button */}
                        <button
                          id={`restore-btn-${r.id}`}
                          onClick={() => restoreRecord(r.id)}
                          disabled={restoringId === r.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '8px 20px', borderRadius: 8,
                            background: restoringId === r.id ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.3)',
                            cursor: restoringId === r.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.82rem', fontWeight: 700,
                            transition: 'all 0.15s',
                            opacity: restoringId === r.id ? 0.7 : 1,
                          }}
                          onMouseEnter={e => { if (restoringId !== r.id) { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' } }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.color = '#10b981' }}
                        >
                          {restoringId === r.id ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                              Restoring…
                            </>
                          ) : (
                            <>
                              <RotateCcw size={14} /> Restore Record
                            </>
                          )}
                        </button>
                      </div>

                      {/* Record header card */}
                      <div style={{
                        background: 'linear-gradient(135deg,rgba(127,29,29,0.15) 0%,rgba(239,68,68,0.08) 100%)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 14, padding: '20px 22px', marginBottom: 16,
                        display: 'flex', alignItems: 'center', gap: 16,
                      }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                        }}>
                          {icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: D.text }}>
                            {r.serviceType?.replace(/_/g, ' ') || 'Service'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: D.textSub, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Car size={12} /> {r.vehicleRegNumber || '—'}
                            {r.serviceTypeDetail && <span>· {r.serviceTypeDetail}</span>}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 12px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                          background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.25)', letterSpacing: '0.05em',
                          textTransform: 'uppercase', flexShrink: 0,
                        }}>DELETED</span>
                      </div>

                      {/* Deletion info — prominent red banner */}
                      <div style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 12, padding: '16px 20px', marginBottom: 16,
                      }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444', marginBottom: 10 }}>
                          🗑 Deletion Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>Deleted By</div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <User size={14} /> {r.deletedBy || '—'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>Deleted At</div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Clock size={14} />
                              {r.deletedAt ? new Date(r.deletedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Service Details */}
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Service Details <div style={{ flex: 1, height: 1, background: D.border }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
                        {[
                          ['Service Date', r.serviceDate ? new Date(r.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null],
                          ['Mileage', r.currentMileageKm ? `${Number(r.currentMileageKm).toLocaleString()} km` : null],
                          ['Cost', r.serviceCost ? `Rs. ${Number(r.serviceCost).toLocaleString()}` : null],
                          ['Technician / Workshop', r.technicianWorkshop],
                          r.nextServiceDue ? ['Next Service Due', new Date(r.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })] : null,
                          r.nextServiceMileageKm ? ['Next Service Mileage', `${Number(r.nextServiceMileageKm).toLocaleString()} km`] : null,
                        ].filter(Boolean).map(([label, value]) => (
                          <div key={label}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: value ? D.text : D.textSub }}>{value || '—'}</div>
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Description <div style={{ flex: 1, height: 1, background: D.border }} />
                      </div>
                      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: r.description ? D.text : D.textSub, lineHeight: 1.6, fontStyle: r.description ? 'normal' : 'italic', background: D.surfaceHi, padding: '12px 14px', borderRadius: 10, border: `1px solid ${D.border}` }}>
                        {r.description || 'No description provided.'}
                      </p>

                      {/* Original record info */}
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Original Record Info <div style={{ flex: 1, height: 1, background: D.border }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 8 }}>
                        {r.createdBy && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: D.textSub }}>
                            <User size={13} /> Created by <strong style={{ color: D.text, marginLeft: 2 }}>{r.createdBy}</strong>
                          </span>
                        )}
                        {r.createdAt && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: D.textSub }}>
                            <Calendar size={13} />
                            {new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {r.attachmentPath && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)' }}>
                            <Paperclip size={12} /> Bill Attached
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()
              ) : (
                /* ── Deleted Records List ────────────────────────────── */
                deletedRecords.map((r, i) => {
                  const icon = SERVICE_TYPE_ICONS[r.serviceType] || <Wrench size={18} />
                  return (
                    <div
                      key={r.id}
                      onClick={() => setDeletedDetail(r)}
                      style={{
                        background: D.surface,
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: 12,
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        animation: `fadeUp 0.25s ease ${i * 0.04}s both`,
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = D.surfaceHi
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(239,68,68,0.1)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = D.surface
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                      }}>
                        {icon}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Service type + vehicle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: D.text }}>
                            {r.serviceType?.replace(/_/g, ' ') || 'Service'}
                          </span>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                            textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }}>DELETED</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: D.blue, fontWeight: 600 }}>
                            <Car size={12} /> {r.vehicleRegNumber || '—'}
                          </span>
                          {r.serviceDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: D.textSub }}>
                              <Calendar size={12} /> {r.serviceDate.substring(0,10)}
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: D.text }}>
                            Rs. {Number(r.serviceCost || 0).toLocaleString()}
                          </span>
                        </div>
                        {/* Deletion info inline */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
                          {r.deletedBy && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#ef4444' }}>
                              <User size={11} /> Deleted by <strong style={{ marginLeft: 2 }}>{r.deletedBy}</strong>
                            </span>
                          )}
                          {r.deletedAt && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#ef4444' }}>
                              <Clock size={11} />
                              {new Date(r.deletedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: restore button + view arrow */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        {/* Restore button — stops propagation so it doesn't open detail view */}
                        <button
                          id={`restore-list-btn-${r.id}`}
                          onClick={e => { e.stopPropagation(); restoreRecord(r.id) }}
                          disabled={restoringId === r.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', borderRadius: 7,
                            background: 'rgba(16,185,129,0.1)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.25)',
                            cursor: restoringId === r.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.72rem', fontWeight: 700,
                            whiteSpace: 'nowrap',
                            opacity: restoringId === r.id ? 0.6 : 1,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (restoringId !== r.id) { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' } }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.color = '#10b981' }}
                        >
                          {restoringId === r.id ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                              Restoring…
                            </>
                          ) : (
                            <><RotateCcw size={11} /> Restore</>
                          )}
                        </button>
                        {/* View detail hint */}
                        <span style={{ color: D.textSub, fontSize: '0.75rem' }}>View ›</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────── */}

      {detailModal.isOpen && detailModal.record && (() => {
        const r = detailModal.record
        const status = getStatus(r)
        const sc = STATUS_CONFIG[status]
        const icon = SERVICE_TYPE_ICONS[r.serviceType] || <Wrench size={24} />
        const closeDetail = () => setDetailModal({ isOpen: false, record: null })
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease', padding: '16px' }}
            onClick={closeDetail}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: D.surface, borderRadius: 20, width: '100%', maxWidth: 660, boxShadow: '0 28px 70px rgba(0,0,0,0.5)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header — indigo gradient */}
              <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)', padding: '22px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        {r.serviceType?.replace(/_/g, ' ') || 'Service'}
                      </h2>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {sc.label}
                      </span>
                    </div>
                    <div style={{ color: '#a5b4fc', fontSize: '0.85rem', marginTop: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Car size={13} /> {r.vehicleRegNumber || '—'}</span>
                      {r.serviceTypeDetail && <span style={{ marginLeft: 10, opacity: 0.8 }}>· {r.serviceTypeDetail}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={closeDetail} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', color: '#fff', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                {/* Service Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Service Details</span>
                  <div style={{ flex: 1, height: 1, background: D.border }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px', marginBottom: 24 }}>
                  {[
                    ['Service Date', r.serviceDate ? new Date(r.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null],
                    ['Current Mileage', r.currentMileageKm ? `${Number(r.currentMileageKm).toLocaleString()} km` : null],
                    ['Service Cost', r.serviceCost ? `Rs. ${Number(r.serviceCost).toLocaleString()}` : null],
                    ['Technician / Workshop', r.technicianWorkshop],
                    r.nextServiceDue ? ['Next Service Due', new Date(r.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })] : null,
                    r.nextServiceMileageKm ? ['Next Service Mileage', `${Number(r.nextServiceMileageKm).toLocaleString()} km`] : null,
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: value ? D.text : D.textSub }}>{value || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Description</span>
                  <div style={{ flex: 1, height: 1, background: D.border }} />
                </div>
                <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: r.description ? D.text : D.textSub, lineHeight: 1.6, fontStyle: r.description ? 'normal' : 'italic', background: D.surfaceHi, padding: '12px 16px', borderRadius: 10, border: `1px solid ${D.border}` }}>
                  {r.description || 'No description provided.'}
                </p>

                {/* ── Record Activity & Change History ───────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Record Activity</span>
                  <div style={{ flex: 1, height: 1, background: D.border }} />
                  {r.attachmentPath && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Paperclip size={12} /> Bill Attached
                    </span>
                  )}
                </div>

                {/* Timeline */}
                <div style={{ position: 'relative', paddingLeft: 28 }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, background: D.border, borderRadius: 2 }} />

                  {/* Creation entry — always first */}
                  <div style={{ position: 'relative', marginBottom: 18 }}>
                    <div style={{ position: 'absolute', left: -28, top: 6, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px ' + D.bg }}>
                      <User size={9} color="#fff" />
                    </div>
                    <div style={{ background: D.surfaceHi, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</span>
                        {r.createdBy && (
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.text }}>by {r.createdBy}</span>
                        )}
                        {r.createdAt && (
                          <span style={{ fontSize: '0.75rem', color: D.textSub, marginLeft: 'auto' }}>
                            {new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4 }}>
                        Service record was added to the system.
                      </div>
                    </div>
                  </div>

                  {/* Audit/edit history entries */}
                  {historyLoading ? (
                    <div style={{ position: 'relative', marginBottom: 18 }}>
                      <div style={{ position: 'absolute', left: -28, top: 6, width: 18, height: 18, borderRadius: '50%', background: D.border }} />
                      <div style={{ background: D.surfaceHi, borderRadius: 10, height: 56, animation: 'pulse 1.5s ease infinite' }} />
                    </div>
                  ) : serviceHistory.length === 0 ? (
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <div style={{ position: 'absolute', left: -28, top: 6, width: 18, height: 18, borderRadius: '50%', background: D.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: D.textSub }} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: D.textSub, fontStyle: 'italic', paddingTop: 4 }}>
                        No edits have been made to this record.
                      </div>
                    </div>
                  ) : (
                    // Render each edit from newest → oldest
                    serviceHistory.map((entry, idx) => {
                      let fields = []
                      try { fields = JSON.parse(entry.changedFields || '[]') } catch {}
                      return (
                        <div key={entry.id} style={{ position: 'relative', marginBottom: idx < serviceHistory.length - 1 ? 14 : 4 }}>
                          {/* Timeline dot */}
                          <div style={{ position: 'absolute', left: -28, top: 6, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px ' + D.bg }}>
                            <Edit2 size={8} color="#fff" />
                          </div>

                          <div style={{ background: D.surfaceHi, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid #6366f1' }}>
                            {/* Edit header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edited</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.text }}>by {entry.changedBy || '—'}</span>
                              <span style={{ fontSize: '0.75rem', color: D.textSub, marginLeft: 'auto' }}>
                                {entry.changedAt ? new Date(entry.changedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>

                            {/* Field-level changes */}
                            {fields.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {fields.map((f, fi) => (
                                  <div key={fi} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 18px 1fr', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                                    <span style={{ fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>{f.field}</span>
                                    <span style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.15)', fontWeight: 600, textDecoration: 'line-through', textDecorationColor: 'rgba(239,68,68,0.4)' }}>
                                      {f.from}
                                    </span>
                                    <span style={{ textAlign: 'center', color: D.textSub, fontWeight: 700 }}>→</span>
                                    <span style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(16,185,129,0.15)', fontWeight: 600 }}>
                                      {f.to}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: D.textSub, fontStyle: 'italic' }}>Details not available.</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 28px', borderTop: `1px solid ${D.border}`, display: 'flex', gap: 10, background: D.surfaceHi, flexShrink: 0 }}>
                {!isDriver && (
                  <>
                    <button
                      onClick={() => { closeDetail(); openEditModal(r.id) }}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
                    >
                      <Edit2 size={15} /> Edit Record
                    </button>
                    <button
                      onClick={() => { closeDetail(); confirmDelete(r.id) }}
                      style={{ flex: 0.6, padding: '10px 0', borderRadius: 10, border: `1px solid rgba(239,68,68,0.3)`, background: D.redDim, color: D.red, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </>
                )}
                <button
                  onClick={closeDetail}
                  style={{ flex: 0.5, padding: '10px 0', borderRadius: 10, border: `1px solid ${D.border}`, background: 'transparent', color: D.textSub, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Add Modal ──────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
          <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 640, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
            <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: D.indigoDim, color: D.indigo, border: `1px solid ${D.indigo}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Add Service Record</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: D.textSub }}>Log a new service or maintenance record for a vehicle.</p>
                </div>
              </div>
              <button onClick={closeAddModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            {submitError && (
              <div style={{ margin: '20px 28px 0', background: D.redDim, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 16px', color: D.red, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} /> {submitError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ padding: '24px 28px' }} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Vehicle & Service Details</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={fieldLabel}>Vehicle (License Plate) <span style={{ color: D.red }}>*</span></label>
                  <input type="text" name="vehicleRegNumber" value={formData.vehicleRegNumber} onChange={handleAddChange} placeholder="e.g. KA-01-AB-1234" style={fieldInput(errors.vehicleRegNumber)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.vehicleRegNumber)} />
                  {errors.vehicleRegNumber && <p style={fieldError}>{errors.vehicleRegNumber}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Service Type <span style={{ color: D.red }}>*</span></label>
                  <select name="serviceType" value={formData.serviceType} onChange={handleAddChange} style={{ ...fieldInput(errors.serviceType), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '18px', paddingRight: 38 }} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceType)}>
                    <option value="" disabled style={{ background: D.surfaceHi }}>Select service type</option>
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: D.surfaceHi }}>{t.label}</option>)}
                  </select>
                  {errors.serviceType && <p style={fieldError}>{errors.serviceType}</p>}
                </div>

                {formData.serviceType === 'OTHER' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={fieldLabel}>Service Type Detail <span style={{ color: D.red }}>*</span></label>
                    <input type="text" name="serviceTypeDetail" value={formData.serviceTypeDetail} onChange={handleAddChange} placeholder="Describe the service…" style={fieldInput(errors.serviceTypeDetail)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceTypeDetail)} />
                    {errors.serviceTypeDetail && <p style={fieldError}>{errors.serviceTypeDetail}</p>}
                  </div>
                )}

                <div>
                  <label style={fieldLabel}>Service Date <span style={{ color: D.red }}>*</span></label>
                  <input type="date" name="serviceDate" value={formData.serviceDate} onChange={handleAddChange} style={fieldInput(errors.serviceDate)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceDate)} />
                  {errors.serviceDate && <p style={fieldError}>{errors.serviceDate}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                  <input type="number" name="currentMileageKm" value={formData.currentMileageKm} onChange={handleAddChange} placeholder="e.g. 45000" style={fieldInput(errors.currentMileageKm)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.currentMileageKm)} />
                  {errors.currentMileageKm && <p style={fieldError}>{errors.currentMileageKm}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Service Cost (Rs.) <span style={{ color: D.red }}>*</span></label>
                  <input type="number" step="0.01" name="serviceCost" value={formData.serviceCost} onChange={handleAddChange} placeholder="e.g. 8500" style={fieldInput(errors.serviceCost)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceCost)} />
                  {errors.serviceCost && <p style={fieldError}>{errors.serviceCost}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Technician / Workshop <span style={{ color: D.red }}>*</span></label>
                  <input type="text" name="technicianWorkshop" value={formData.technicianWorkshop} onChange={handleAddChange} placeholder="e.g. Auto Care Center" style={fieldInput(errors.technicianWorkshop)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.technicianWorkshop)} />
                  {errors.technicianWorkshop && <p style={fieldError}>{errors.technicianWorkshop}</p>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Optional Details</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div>
                  <label style={fieldLabel}>Next Service Due (Date)</label>
                  <input type="date" name="nextServiceDue" value={formData.nextServiceDue} onChange={handleAddChange} style={fieldInput(false)} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                <div>
                  <label style={fieldLabel}>Next Service Due (Mileage)</label>
                  <input type="number" name="nextServiceMileageKm" value={formData.nextServiceMileageKm} onChange={handleAddChange} placeholder="e.g. 50000" style={fieldInput(false)} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Description / Notes</label>
                  <textarea name="description" value={formData.description} onChange={handleAddChange} rows={2} placeholder="Any additional notes…" style={{ ...fieldInput(false), resize: 'none', lineHeight: 1.5 }} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                {/* ── Bill Attachment (optional) ── */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Paperclip size={13} /> Bill / Receipt Attachment <span style={{ color: D.textSub, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </span>
                  </label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    border: `1.5px dashed ${addAttachmentFile ? '#10b981' : D.inputBorder}`,
                    borderRadius: 8, padding: '10px 14px',
                    background: addAttachmentFile ? 'rgba(16,185,129,0.06)' : D.inputBg,
                    transition: 'all 0.15s',
                  }}>
                    <Paperclip size={16} color={addAttachmentFile ? '#10b981' : D.textSub} />
                    <span style={{ fontSize: '0.82rem', color: addAttachmentFile ? '#10b981' : D.textSub, flex: 1 }}>
                      {addAttachmentFile ? addAttachmentFile.name : 'Click to attach a bill, invoice or photo (PDF, JPG, PNG — max 10MB)'}
                    </span>
                    {addAttachmentFile && (
                      <button type="button" onClick={e => { e.preventDefault(); setAddAttachmentFile(null) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X size={15} />
                      </button>
                    )}
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                      onChange={e => setAddAttachmentFile(e.target.files[0] || null)} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={formLoading} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: formLoading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: formLoading ? 'none' : '0 4px 16px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {formLoading ? 'Saving...' : <><Check size={16} /> Add Record</>}
                </button>
                <button type="button" onClick={closeAddModal} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
          <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 640, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
            <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: D.indigoDim, color: D.indigo, border: `1px solid ${D.indigo}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Edit Service Record</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: D.textSub }}>Update the details of this service record.</p>
                </div>
              </div>
              <button onClick={closeEditModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            {submitError && (
              <div style={{ margin: '20px 28px 0', background: D.redDim, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 16px', color: D.red, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} /> {submitError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ padding: '24px 28px' }} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Vehicle & Service Details</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={fieldLabel}>Vehicle (License Plate) <span style={{ color: D.red }}>*</span></label>
                  <input type="text" name="vehicleRegNumber" value={editFormData.vehicleRegNumber} onChange={handleEditChange} placeholder="e.g. KA-01-AB-1234" style={fieldInput(errors.vehicleRegNumber)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.vehicleRegNumber)} />
                  {errors.vehicleRegNumber && <p style={fieldError}>{errors.vehicleRegNumber}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Service Type <span style={{ color: D.red }}>*</span></label>
                  <select name="serviceType" value={editFormData.serviceType} onChange={handleEditChange} style={{ ...fieldInput(errors.serviceType), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '18px', paddingRight: 38 }} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceType)}>
                    <option value="" disabled style={{ background: D.surfaceHi }}>Select service type</option>
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: D.surfaceHi }}>{t.label}</option>)}
                  </select>
                  {errors.serviceType && <p style={fieldError}>{errors.serviceType}</p>}
                </div>

                {editFormData.serviceType === 'OTHER' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={fieldLabel}>Service Type Detail <span style={{ color: D.red }}>*</span></label>
                    <input type="text" name="serviceTypeDetail" value={editFormData.serviceTypeDetail} onChange={handleEditChange} placeholder="Describe the service…" style={fieldInput(errors.serviceTypeDetail)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceTypeDetail)} />
                    {errors.serviceTypeDetail && <p style={fieldError}>{errors.serviceTypeDetail}</p>}
                  </div>
                )}

                <div>
                  <label style={fieldLabel}>Service Date <span style={{ color: D.red }}>*</span></label>
                  <input type="date" name="serviceDate" value={editFormData.serviceDate} onChange={handleEditChange} style={fieldInput(errors.serviceDate)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceDate)} />
                  {errors.serviceDate && <p style={fieldError}>{errors.serviceDate}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                  <input type="number" name="currentMileageKm" value={editFormData.currentMileageKm} onChange={handleEditChange} placeholder="e.g. 45000" style={fieldInput(errors.currentMileageKm)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.currentMileageKm)} />
                  {errors.currentMileageKm && <p style={fieldError}>{errors.currentMileageKm}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Service Cost (Rs.) <span style={{ color: D.red }}>*</span></label>
                  <input type="number" step="0.01" name="serviceCost" value={editFormData.serviceCost} onChange={handleEditChange} placeholder="e.g. 8500" style={fieldInput(errors.serviceCost)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceCost)} />
                  {errors.serviceCost && <p style={fieldError}>{errors.serviceCost}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Technician / Workshop <span style={{ color: D.red }}>*</span></label>
                  <input type="text" name="technicianWorkshop" value={editFormData.technicianWorkshop} onChange={handleEditChange} placeholder="e.g. Auto Care Center" style={fieldInput(errors.technicianWorkshop)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.technicianWorkshop)} />
                  {errors.technicianWorkshop && <p style={fieldError}>{errors.technicianWorkshop}</p>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Optional Details</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div>
                  <label style={fieldLabel}>Next Service Due (Date)</label>
                  <input type="date" name="nextServiceDue" value={editFormData.nextServiceDue} onChange={handleEditChange} style={fieldInput(false)} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                <div>
                  <label style={fieldLabel}>Next Service Due (Mileage)</label>
                  <input type="number" name="nextServiceMileageKm" value={editFormData.nextServiceMileageKm} onChange={handleEditChange} placeholder="e.g. 50000" style={fieldInput(false)} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Description / Notes</label>
                  <textarea name="description" value={editFormData.description} onChange={handleEditChange} rows={2} placeholder="Any additional notes…" style={{ ...fieldInput(false), resize: 'none', lineHeight: 1.5 }} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                {/* ── Bill Attachment (optional) ── */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Paperclip size={13} /> Bill / Receipt Attachment <span style={{ color: D.textSub, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </span>
                  </label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    border: `1.5px dashed ${editAttachmentFile ? '#10b981' : D.inputBorder}`,
                    borderRadius: 8, padding: '10px 14px',
                    background: editAttachmentFile ? 'rgba(16,185,129,0.06)' : D.inputBg,
                    transition: 'all 0.15s',
                  }}>
                    <Paperclip size={16} color={editAttachmentFile ? '#10b981' : D.textSub} />
                    <span style={{ fontSize: '0.82rem', color: editAttachmentFile ? '#10b981' : D.textSub, flex: 1 }}>
                      {editAttachmentFile ? editAttachmentFile.name : 'Click to replace or add a bill, invoice or photo (PDF, JPG, PNG — max 10MB)'}
                    </span>
                    {editAttachmentFile && (
                      <button type="button" onClick={e => { e.preventDefault(); setEditAttachmentFile(null) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X size={15} />
                      </button>
                    )}
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                      onChange={e => setEditAttachmentFile(e.target.files[0] || null)} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={formLoading} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: formLoading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: formLoading ? 'none' : '0 4px 16px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {formLoading ? 'Saving...' : <><Check size={16} /> Save Changes</>}
                </button>
                <button type="button" onClick={closeEditModal} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
          <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: D.redDim, color: D.red, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Delete Record?</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: D.textSub }}>This action cannot be undone. Are you sure you want to delete this service record?</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteModal({ isOpen: false, id: null })} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                Cancel
              </button>
              <button onClick={executeDelete} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: D.red, color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Message ──────────────────────────────────────── */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toastMessage.type === 'success' ? D.surface : D.redDim,
          border: `1px solid ${toastMessage.type === 'success' ? '#10b981' : 'rgba(248,113,113,0.3)'}`,
          color: toastMessage.type === 'success' ? '#10b981' : D.red,
          padding: '12px 20px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          animation: 'fadeUp 0.3s ease',
          fontWeight: 600, fontSize: '0.9rem'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {toastMessage.msg}
        </div>
      )}

      {/* ── Scoped Styles ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input[id="service-search"]::placeholder { color: ${D.textSub}; }
      `}</style>
    </div>
  )
}

export default ServicePage
