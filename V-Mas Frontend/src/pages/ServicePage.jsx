import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import api, { serviceAPI, vehicleAPI, notificationAPI, userAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useD, useTheme } from '../context/ThemeContext'
import { addControllerNotification, addDriverNotification } from '../services/notificationService'
import { computeMileageProgress, computeDateAlert, getAlertLevel, ALERT_COLORS, fmtKmRemaining, fmtDaysRemaining } from '../utils/serviceAlertUtils'
import { Settings, Droplet, Circle, RotateCcw, Thermometer, Battery, Search, Wrench, Car, Calendar, MapPin, Edit2, Trash2, ClipboardList, CheckCircle, CircleDollarSign, X, Check, AlertTriangle, Paperclip, User, Eye, Archive, Clock, Gauge, BellRing, MoreVertical, ShieldAlert, Wallet, Sparkles, LayoutGrid, List, Download, IdCard, Shield, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

/* ── Table Status Helper ────────────────────────────────────────── */
const getTableStatus = (s) => {
  if (!s) return 'Open'
  const isCompleted = s.serviceDate && (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const serviceDate = new Date(s.serviceDate)
    serviceDate.setHours(0, 0, 0, 0)
    return serviceDate <= today
  })()

  if (isCompleted) return 'Completed'
  if (!s.serviceDate) return 'Open'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetDate = new Date(s.serviceDate)
  targetDate.setHours(0, 0, 0, 0)

  if (targetDate < today) return 'Overdue'

  // Mark as In Progress if within 5 days
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays <= 5) return 'In Progress'

  return 'Open'
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

const SERVICE_LOGIC_ENGINE = {
  OIL_CHANGE: { intervalKm: 5000, intervalMonths: 3 },
  ENGINE_TUNE_UP: { intervalKm: 10000, intervalMonths: 6 },
  BRAKE_SERVICE: { intervalKm: 20000, intervalMonths: 12 },
  TIRE_ROTATION: { intervalKm: 10000, intervalMonths: 6 },
  TRANSMISSION_SERVICE: { intervalKm: 40000, intervalMonths: 24 },
  AC_SERVICE: { intervalKm: 20000, intervalMonths: 12 },
  BATTERY_REPLACEMENT: { intervalKm: 60000, intervalMonths: 36 },
  GENERAL_INSPECTION: { intervalKm: 10000, intervalMonths: 6 },
  OTHER: { intervalKm: 5000, intervalMonths: 3 }
}

const initialForm = {
  vehicleRegNumber: '',
  serviceType: '',
  serviceTypeDetail: '',
  serviceDate: '',
  currentMileageKm: '',
  serviceCost: '',
  technicianWorkshop: '',
  nextServiceDue: '',
  nextServiceMileageKm: '',
  description: '',
  partsReplaced: '',
  serviceClassification: 'ROUTINE',
  driverUsername: '',
}

const initialScheduleForm = {
  vehicleRegNumber: '',
  serviceType: '',
  serviceTypeDetail: '',
  scheduleMode: 'date', // 'date' | 'mileage' | 'both'
  scheduledDate: '',
  targetMileageKm: '',
  estimatedCost: '',
  preferredWorkshop: '',
  description: '',
  driverUsername: '',
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
  ALL: { label: 'All', color: '#0d9488', bg: 'rgba(13,148,136,0.15)', border: 'rgba(13,148,136,0.3)' },
  SCHEDULED: { label: 'Scheduled', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  COMPLETED: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  UPCOMING: { label: 'Upcoming', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  OVERDUE: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
}

/* ── Check if a service record is the latest chronologically ── */
const checkIsLatest = (record, services) => {
  if (!services || services.length === 0) return true
  const matching = services.filter(s =>
    s.vehicleRegNumber === record.vehicleRegNumber &&
    s.serviceType === record.serviceType
  )
  if (matching.length <= 1) return true

  let latest = matching[0]
  for (const s of matching) {
    const dateLatest = latest.serviceDate ? new Date(latest.serviceDate).getTime() : 0
    const dateS = s.serviceDate ? new Date(s.serviceDate).getTime() : 0

    if (dateS > dateLatest) {
      latest = s
    } else if (dateS === dateLatest) {
      const milLatest = Number(latest.currentMileageKm || 0)
      const milS = Number(s.currentMileageKm || 0)
      if (milS > milLatest) {
        latest = s
      } else if (milS === milLatest) {
        if (s.id && latest.id && s.id > latest.id) {
          latest = s
        }
      }
    }
  }
  return latest.id === record.id
}


/* ── Service Progress Meter ──────────────────────────────────────────
   Shows mileage progress bar + date countdown for a service record.
   vehicleCurrentKm: live mileage from vehicle entity.
──────────────────────────────────────────────────────────────────── */
const ServiceProgressMeter = ({ record, vehicleCurrentKm, D }) => {
  const mileage = computeMileageProgress(record, vehicleCurrentKm)
  const date = computeDateAlert(record)

  if (!mileage && !date) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      {/* Mileage progress bar */}
      {mileage && (() => {
        const ac = ALERT_COLORS[mileage.level]
        const pct = Math.min(mileage.pct, 100)
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Gauge size={11} /> Next Service Mileage
              </span>
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px',
                borderRadius: 999, background: ac.bg, color: ac.color,
                border: `1px solid ${ac.border}`
              }}>
                {pct.toFixed(0)}% · {fmtKmRemaining(mileage.remaining)}
              </span>
            </div>
            <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: ac.color,
                borderRadius: 999,
                transition: 'width 0.6s ease',
                animation: mileage.level === 'OVERDUE' ? 'pulseBar 1.5s ease-in-out infinite' : 'none',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: '0.62rem', color: D.textFaint }}>
              <span>{mileage.serviceKm?.toLocaleString()} km</span>
              <span>{mileage.nextKm?.toLocaleString()} km</span>
            </div>
          </div>
        )
      })()}

      {/* Date countdown chip */}
      {date && (() => {
        const ac = ALERT_COLORS[date.level]
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={11} style={{ color: ac.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: D.textSub }}>Next service date:</span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px',
              borderRadius: 999, background: ac.bg, color: ac.color,
              border: `1px solid ${ac.border}`,
              animation: date.level === 'OVERDUE' ? 'pulseBar 1.5s ease-in-out infinite' : 'none',
            }}>
              {fmtDaysRemaining(date.daysRemaining)}
            </span>
          </div>
        )
      })()}
    </div>
  )
}

/* ── Service Due Alert Strip ─────────────────────────────────────────
   Horizontal scroll strip shown at top of the page for records
   that are DUE_SOON or OVERDUE.
──────────────────────────────────────────────────────────────────── */
const ServiceDueAlertStrip = ({ alertRecords, onCompleteAlert, onViewAlert, D }) => {
  if (!alertRecords || alertRecords.length === 0) return null

  const overdue = alertRecords.filter(r => r._alertLevel === 'OVERDUE')
  const dueSoon = alertRecords.filter(r => r._alertLevel === 'DUE_SOON')

  return (
    <div style={{
      background: D.surface,
      border: `1px solid ${overdue.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
      borderRadius: 16,
      marginBottom: 20,
      overflow: 'hidden',
      animation: 'fadeIn 0.3s ease',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${D.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
        background: overdue.length > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)',
      }}>
        <BellRing size={20} style={{ color: overdue.length > 0 ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: D.text, fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
          Vehicle Service Alerts
        </span>
        {overdue.length > 0 && (
          <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: 999 }}>
            {overdue.length} Overdue
          </span>
        )}
        {dueSoon.length > 0 && (
          <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: 999 }}>
            {dueSoon.length} Due Soon
          </span>
        )}
      </div>

      {/* Scroll strip of alert cards */}
      <div style={{ display: 'flex', gap: 16, padding: '20px', overflowX: 'auto', scrollbarWidth: 'thin' }}>
        {alertRecords.map(r => {
          const ac = ALERT_COLORS[r._alertLevel] || ALERT_COLORS.DUE_SOON
          const mileage = computeMileageProgress(r, r._vehicleCurrentKm)
          const date = computeDateAlert(r)

          let progressPct = 0
          let remainingText = ''

          if (mileage) {
            progressPct = Math.min(mileage.pct, 100)
            remainingText = fmtKmRemaining(mileage.remaining)
          } else if (date) {
            progressPct = Math.max(0, Math.min(100, (30 - date.daysRemaining) / 30 * 100))
            remainingText = fmtDaysRemaining(date.daysRemaining)
          }

          return (
            <div
              key={r.id}
              onClick={() => onViewAlert && onViewAlert(r)}
              style={{
                flexShrink: 0,
                minWidth: 300,
                maxWidth: 340,
                background: D.bg,
                border: `1px solid ${ac.border}`,
                borderRadius: 14,
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: `0 4px 14px rgba(0, 0, 0, 0.12)`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 6px 20px ${ac.bg}`
                e.currentTarget.style.borderColor = ac.color
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.12)'
                e.currentTarget.style.borderColor = ac.border
              }}
            >
              {/* First Row: Vehicle + type & badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: ac.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: `1px solid ${ac.border}`
                  }}>
                    <Car size={18} style={{ color: ac.color }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: D.text }}>{r.vehicleRegNumber}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {r.serviceType?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(0, 0, 0, 0.2)',
                  color: ac.color,
                  border: `1px solid ${ac.color}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>{ac.label}</span>
              </div>

              {/* Second Row: Progress Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: ac.color,
                    borderRadius: 999,
                    transition: 'width 0.6s ease'
                  }} />
                </div>
                <span style={{ fontSize: '0.78rem', color: ac.color, fontWeight: 700, letterSpacing: '0.01em' }}>
                  {remainingText}
                </span>

                {/* Secondary detail if both exist */}
                {mileage && date && (
                  <span style={{ fontSize: '0.7rem', color: D.textSub, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Calendar size={11} /> {fmtDaysRemaining(date.daysRemaining)}
                  </span>
                )}
              </div>

              {/* Actions */}
              {onCompleteAlert && (
                <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCompleteAlert(r); }}
                    style={{
                      width: '100%', padding: '7px 0', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700,
                      background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`,
                      cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = ac.color; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ac.bg; e.currentTarget.style.color = ac.color }}
                  >
                    <CheckCircle size={14} /> Complete Service
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Service List Card (Old Style) ──────────────────────────────── */
const ServiceListCard = ({ record, index, isDriver, isAdmin, currentUsername, vehicleCurrentKm, isLatest, onEdit, onDelete, onView, onViewAttachment, D }) => {
  const [hovered, setHovered] = useState(false)
  const status = getStatus(record)
  const sc = STATUS_CONFIG[status]
  const icon = SERVICE_TYPE_ICONS[record.serviceType] || <Wrench size={22} />

  // Drivers cannot edit or delete records
  const canEdit = !isDriver
  const canDelete = !isDriver

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
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: D.text }}>
            {record.serviceType?.replace(/_/g, ' ') || 'Service'}
          </span>
          {/* Status badge */}
          <span style={{
            padding: '2px 10px', borderRadius: 999,
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: sc.bg, color: sc.color,
            border: `1px solid ${sc.border}`,
          }}>
            {sc.label}
          </span>
          {/* Classification badge */}
          <span style={{
            padding: '2px 10px', borderRadius: 999,
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: record.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            color: record.serviceClassification === 'AD_HOC' ? '#ef4444' : '#10b981',
            border: `1px solid ${record.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
          }}>
            {record.serviceClassification === 'AD_HOC' ? '🛠️ Ad-hoc Repair' : '🟢 Routine'}
          </span>
          {record.serviceTypeDetail && (
            <span style={{ fontSize: '0.85rem', color: D.textSub }}>({record.serviceTypeDetail})</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.9rem', color: D.blue, fontWeight: 700 }}>
            <Car size={15} /> {record.vehicleRegNumber || '—'}
          </span>
          {record.serviceDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', color: D.textSub, fontWeight: 600 }}>
              <Calendar size={15} /> {record.serviceDate.substring(0, 10)}
            </span>
          )}
          {record.currentMileageKm && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', color: D.textSub, fontWeight: 600 }}>
              <MapPin size={15} /> {Number(record.currentMileageKm).toLocaleString()} km
            </span>
          )}
          {record.technicianWorkshop && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', color: D.textSub, fontWeight: 600 }}>
              <Wrench size={15} /> {record.technicianWorkshop}
            </span>
          )}
          {/* ── Who added + when ── */}
          {record.createdBy && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: D.textSub, fontWeight: 600 }}>
              <User size={13} /> {record.createdBy}
            </span>
          )}
          {record.createdAt && (
            <span style={{ fontSize: '0.82rem', color: D.textSub, fontWeight: 500 }}>
              {new Date(record.createdAt).toLocaleDateString()}
            </span>
          )}
          {/* ── Attachment chip ── */}
          {record.attachmentPath && (
            <span
              onClick={e => { e.stopPropagation(); onViewAttachment(record) }}
              title="Click to view attached bill"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem',
                color: '#10b981', background: 'rgba(16,185,129,0.1)',
                padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.transform = 'scale(1.03)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Paperclip size={12} /> Bill attached · <span style={{ textDecoration: 'underline', fontWeight: 700 }}>View</span>
            </span>
          )}
        </div>

        {record.description && (
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: D.textSub, fontStyle: 'italic' }}>
            {record.description}
          </p>
        )}
        {/* Parts Replaced */}
        {record.partsReplaced && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Parts:</span>
            {record.partsReplaced.split(',').map((part, pi) => (
              <span key={pi} style={{
                background: D.surfaceHi, border: `1px solid ${D.border}`,
                color: D.text, borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600
              }}>
                {part.trim()}
              </span>
            ))}
          </div>
        )}
        {/* Service progress meter */}
        {isLatest && <ServiceProgressMeter record={record} vehicleCurrentKm={vehicleCurrentKm} D={D} />}
      </div>

      {/* Cost */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Rs. {Number(record.serviceCost || 0).toLocaleString()}
        </div>
      </div>

      {(canEdit || canDelete) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {canEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(record.id) }}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                background: D.indigoDim, color: D.indigo,
                border: `1px solid ${D.borderHi}`, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = D.indigo; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.color = D.indigo }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Edit2 size={12} /> Edit</span>
            </button>
          )}
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(record.id) }}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                background: D.redDim, color: D.red,
                border: `1px solid rgba(239,68,68,0.25)`, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Trash2 size={12} /> Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Service Grid Card (New Style) ──────────────────────────────── */
const ServiceGridCard = ({ record, index, isDriver, isAdmin, currentUsername, vehicleCurrentKm, isLatest, onEdit, onDelete, onView, onViewAttachment, D }) => {
  const [hovered, setHovered] = useState(false)
  const status = getStatus(record)
  const sc = STATUS_CONFIG[status]

  // Drivers cannot edit or delete records
  const canEdit = !isDriver
  const canDelete = !isDriver

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
          <div style={{ color: D.indigo, fontSize: '1.05rem', fontWeight: 800, marginBottom: 4 }}>
            {record.serviceType?.replace(/_/g, ' ') || 'Service'}
          </div>
          <div style={{ color: D.textSub, fontSize: '0.9rem' }}>
            {record.vehicleRegNumber || '—'}
            {record.serviceTypeDetail ? ` - ${record.serviceTypeDetail}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em',
            background: sc.bg, color: sc.color,
            border: `1px solid ${sc.border}`,
            textTransform: 'uppercase'
          }}>
            {sc.label}
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em',
            background: record.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            color: record.serviceClassification === 'AD_HOC' ? '#ef4444' : '#10b981',
            border: `1px solid ${record.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
            textTransform: 'uppercase'
          }}>
            {record.serviceClassification === 'AD_HOC' ? '🛠️ Ad-hoc' : '🟢 Routine'}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: D.border }} />

      {/* Description — only show when there is real content */}
      {record.description && (
        <div style={{ color: D.textSub, fontSize: '0.9rem', lineHeight: 1.6 }}>
          {record.description}
        </div>
      )}

      {/* Parts Replaced */}
      {record.partsReplaced && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Parts:</span>
          {record.partsReplaced.split(',').map((part, pi) => (
            <span key={pi} style={{
              background: D.surfaceHi, border: `1px solid ${D.border}`,
              color: D.text, borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600
            }}>
              {part.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div>
          <div style={{ color: D.textSub, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Date</div>
          <div style={{ color: D.text, fontSize: '1.0rem', fontWeight: 800 }}>
            {record.serviceDate ? new Date(record.serviceDate).toLocaleDateString() : '—'}
          </div>
        </div>
        <div>
          <div style={{ color: D.textSub, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Mileage</div>
          <div style={{ color: D.text, fontSize: '1.0rem', fontWeight: 800 }}>
            {record.currentMileageKm ? `${Number(record.currentMileageKm).toLocaleString()} km` : '—'}
          </div>
        </div>
        <div>
          <div style={{ color: D.textSub, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cost</div>
          <div style={{ color: D.text, fontSize: '1.0rem', fontWeight: 800 }}>
            Rs. {Number(record.serviceCost || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: D.textSub, fontSize: '0.85rem', fontWeight: 600 }}>
          <Wrench size={13} /> {record.technicianWorkshop || '—'}
        </div>
      </div>
      {/* Service progress meter */}
      {isLatest && <ServiceProgressMeter record={record} vehicleCurrentKm={vehicleCurrentKm} D={D} />}

      {/* ── Created by / at + attachment ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: `1px solid ${D.border}` }}>
        {record.createdBy && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }}>
            <User size={12} /> {record.createdBy}
          </span>
        )}
        {record.createdAt && (
          <span style={{ fontSize: '0.8rem', color: D.textSub, fontWeight: 500 }}>
            · {new Date(record.createdAt).toLocaleDateString()}
          </span>
        )}
        {record.attachmentPath && (
          <span
            onClick={e => { e.stopPropagation(); onViewAttachment(record) }}
            title="Click to view attached bill"
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem',
              color: '#10b981', background: 'rgba(16,185,129,0.1)',
              padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Paperclip size={12} /> Bill attached · <span style={{ textDecoration: 'underline', fontWeight: 700 }}>View</span>
          </span>
        )}
      </div>

      {/* Actions — stop propagation so clicking buttons doesn't also open the detail modal */}
      {(canEdit || canDelete) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
          {canEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(record.id) }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                background: D.indigoDim, color: D.indigo, border: `1px solid ${D.borderHi}`, cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = D.indigo; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.color = D.indigo }}
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(record.id) }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                background: D.redDim, color: D.red, border: `1px solid rgba(239,68,68,0.2)`, cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
            >
              Delete
            </button>
          )}
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

/* ── Helper to calculate dynamic milestones for a vehicle ── */
const getVehicleMilestones = (vehicle, services, intervals) => {
  if (!vehicle || !intervals) return []
  const vehicleIntervals = intervals.filter(i => i.vehicleType === vehicle.vehicleType)
  
  return vehicleIntervals.map(interval => {
    // Find completed services for this vehicle and service type
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
      intervalKm: interval.intervalKm,
      lastServiceMileage,
      nextDueMileage,
      remainingKm,
      status
    }
  })
}


/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
const ServicePage = () => {
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDriver = user?.role === 'DRIVER'
  const isAdmin = user?.role === 'ADMIN'

  const [services, setServices] = useState([])
  const [activeTab, setActiveTab] = useState('status')
  const [intervals, setIntervals] = useState([])
  const [dailyMileages, setDailyMileages] = useState({})
  const [localIntervals, setLocalIntervals] = useState([])
  const [stats, setStats] = useState(null)
  const [statusSearch, setStatusSearch] = useState('')
  const [mileageSearch, setMileageSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [vehicleFilter, setVehicleFilter] = useState('ALL')
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')

  // ── Service due alerts ──────────────────────────────────────────
  const [alertRecords, setAlertRecords] = useState([])  // records with DUE_SOON or OVERDUE level
  // Track which record IDs have already had a notification fired this session
  const notifiedRef = useRef(new Set())

  // ── Vehicle scope ───────────────────────────────────────────────
  const [allVehicles, setAllVehicles] = useState([])
  const [allDrivers, setAllDrivers] = useState([])
  const [previousMileage, setPreviousMileage] = useState(null)
  const [expandedVehicleIds, setExpandedVehicleIds] = useState({})

  // ── Driver-specific lookup vehicle states ───────────────────────
  const [selectedDriverVehicle, setSelectedDriverVehicle] = useState(null)
  const [driverVehicleSearch, setDriverVehicleSearch] = useState('')
  const [driverVehicleDropdownVisible, setDriverVehicleDropdownVisible] = useState(false)
  const driverVehicleSearchRef = useRef(null)

  // ── Vehicle search dropdown state ───────────────────────────────
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicleDropdownVisible, setVehicleDropdownVisible] = useState(false)
  const [editVehicleSearch, setEditVehicleSearch] = useState('')
  const [editVehicleDropdownVisible, setEditVehicleDropdownVisible] = useState(false)
  const [scheduleVehicleSearch, setScheduleVehicleSearch] = useState('')
  const [scheduleVehicleDropdownVisible, setScheduleVehicleDropdownVisible] = useState(false)
  const vehicleSearchRef = useRef(null)
  const editVehicleSearchRef = useRef(null)
  const scheduleVehicleSearchRef = useRef(null)

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
  const [showAllEdits, setShowAllEdits] = useState(false)

  useEffect(() => {
    if (!detailModal.isOpen) {
      setShowAllEdits(false)
    }
  }, [detailModal.isOpen])

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState(null)
  const [errors, setErrors] = useState({})
  const [scheduleErrors, setScheduleErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [scheduleFormData, setScheduleFormData] = useState(initialScheduleForm)
  const [editFormData, setEditFormData] = useState(initialForm)
  const [formLoading, setFormLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  // Attachment file state
  const [addAttachmentFile, setAddAttachmentFile] = useState(null)
  const [editAttachmentFile, setEditAttachmentFile] = useState(null)

  // Attachment lightbox viewer state
  const [attachmentViewer, setAttachmentViewer] = useState({
    isOpen: false,
    url: null,
    type: null,
    filename: null,
    loading: false
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString())

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (driverVehicleSearchRef.current && !driverVehicleSearchRef.current.contains(e.target)) {
        setDriverVehicleDropdownVisible(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleExportPDF = () => {
    if (filtered.length === 0) {
      showToast('No records to export', 'error')
      return
    }
    try {
      const doc = new jsPDF()

      // Branding Header Banner in Blue/Navy
      doc.setFillColor(30, 58, 138)
      doc.rect(0, 0, 210, 38, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('V-MAS Maintenance Work Orders Report', 14, 22)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated on: ${new Date().toLocaleString()} | Filtered Work Orders: ${filtered.length}`, 14, 30)

      const tableData = filtered.map(s => [
        s.id ? `WO-${s.id}` : '—',
        s.vehicleRegNumber || '—',
        s.serviceType?.replace(/_/g, ' ') || '—',
        s.technicianWorkshop || '—',
        s.serviceDate ? s.serviceDate.substring(0, 10) : '—',
        s.serviceCost ? `LKR ${Number(s.serviceCost).toLocaleString()}` : '—',
        getTableStatus(s)
      ])

      doc.autoTable({
        startY: 46,
        head: [['Work Order', 'Vehicle', 'Task', 'Garage', 'Due Date', 'Cost', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      })

      doc.save(`work_orders_${new Date().toISOString().split('T')[0]}.pdf`)
      showToast('Service records exported to PDF successfully.', 'success')
    } catch (e) {
      showToast('Failed to export PDF', 'error')
    }
  }


  const handleViewAttachment = async (record) => {
    if (!record || !record.id) return
    setAttachmentViewer(prev => ({ ...prev, loading: true }))
    try {
      const res = await serviceAPI.getAttachmentBlob(record.id)
      const blob = res.data
      const type = blob.type || ''
      const url = URL.createObjectURL(blob)

      const path = record.attachmentPath || ''
      let filename = path.substring(path.lastIndexOf('/') + 1)
      if (filename.length > 37 && filename.substring(8, 9) === '-' && filename.substring(13, 14) === '-') {
        filename = filename.substring(37)
      }

      if (type.includes('pdf')) {
        setAttachmentViewer(prev => ({ ...prev, loading: false }))
        window.open(url, '_blank')
      } else {
        setAttachmentViewer({
          isOpen: true,
          url,
          type,
          filename,
          loading: false
        })
      }
    } catch (err) {
      console.error('Error loading attachment', err)
      setAttachmentViewer(prev => ({ ...prev, loading: false }))
      showToast('Failed to load attachment. File may not exist.', 'error')
    }
  }

  const showToast = (msg, type) => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const downloadDocument = async (id, docType, filename) => {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/vehicles/${id}/document/${docType}`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || `${docType}_document`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download document:", err)
      showToast("Failed to download document. Please try again.", "error")
    }
  }

  useEffect(() => {
    if (isAddModalOpen || isEditModalOpen || isScheduleModalOpen || deleteModal.isOpen || detailModal.isOpen || deletedDrawer || attachmentViewer.isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isAddModalOpen, isEditModalOpen, isScheduleModalOpen, deleteModal.isOpen, detailModal.isOpen, deletedDrawer, attachmentViewer.isOpen])

  // Fetch audit history whenever detail modal opens for a record
  useEffect(() => {
    if (detailModal.isOpen && detailModal.record?.id && typeof detailModal.record.id === 'number') {
      setServiceHistory([])
      setHistoryLoading(true)
      serviceAPI.getServiceHistory(detailModal.record.id)
        .then(res => setServiceHistory(res.data.data || []))
        .catch(() => setServiceHistory([]))
        .finally(() => setHistoryLoading(false))
    }
  }, [detailModal.isOpen, detailModal.record?.id])

  const validate = (data, isEdit = false) => {
    const e = {}
    if (!data.vehicleRegNumber?.trim()) {
      e.vehicleRegNumber = 'Required'
    } else {
      const isRegValid = allVehicles.some(v => v.registrationNo === data.vehicleRegNumber)
      if (!isRegValid) {
        e.vehicleRegNumber = 'Please select a valid registered vehicle'
      }
    }

    if (!data.serviceType) e.serviceType = 'Required'
    if (data.serviceType === 'OTHER' && !data.serviceTypeDetail?.trim())
      e.serviceTypeDetail = 'Required for Other'
    if (!data.serviceDate) e.serviceDate = 'Required'

    if (!data.currentMileageKm) {
      e.currentMileageKm = 'Required'
    } else {
      const originalRecord = isEdit ? services.find(s => s.id === editingServiceId) : null
      const isMileageChanged = !originalRecord || Number(data.currentMileageKm) !== Number(originalRecord.currentMileageKm)

      if (isMileageChanged) {
        const regNo = data.vehicleRegNumber
        const recordDate = data.serviceDate ? new Date(data.serviceDate) : new Date()

        // Find service records for this vehicle with an earlier or equal date (excluding scheduled)
        const earlierServices = services.filter(s =>
          s.vehicleRegNumber === regNo &&
          (!originalRecord || s.id !== originalRecord.id) &&
          s.currentMileageKm &&
          s.serviceDate &&
          getStatus(s) !== 'SCHEDULED' &&
          new Date(s.serviceDate) <= recordDate
        )

        // Find the maximum mileage among older services
        const maxEarlierMileage = earlierServices.reduce((max, s) => Math.max(max, Number(s.currentMileageKm)), 0)

        // Find service records for this vehicle with a later date (excluding scheduled)
        const laterServices = services.filter(s =>
          s.vehicleRegNumber === regNo &&
          (!originalRecord || s.id !== originalRecord.id) &&
          s.currentMileageKm &&
          s.serviceDate &&
          getStatus(s) !== 'SCHEDULED' &&
          new Date(s.serviceDate) > recordDate
        )

        // Find the minimum mileage among newer services
        const minLaterMileage = laterServices.reduce((min, s) => Math.min(min, Number(s.currentMileageKm)), Infinity)

        const inputMil = Number(data.currentMileageKm)

        if (inputMil < maxEarlierMileage) {
          e.currentMileageKm = `Enter reading greater than or equal to ${maxEarlierMileage.toLocaleString()} km`
        } else if (minLaterMileage !== Infinity && inputMil > minLaterMileage) {
          e.currentMileageKm = `Enter reading less than or equal to ${minLaterMileage.toLocaleString()} km`
        }
      }
    }

    if (!data.serviceCost) e.serviceCost = 'Required'
    if (!data.technicianWorkshop?.trim()) e.technicianWorkshop = 'Required'
    return e
  }

  const handleVehicleSelect = (e, isEdit = false) => {
    const regNo = e.target.value
    if (isEdit) {
      setEditFormData(prev => ({ ...prev, vehicleRegNumber: regNo }))
    } else {
      setFormData(prev => ({ ...prev, vehicleRegNumber: regNo }))
    }
    setErrors(prev => ({
      ...prev,
      vehicleRegNumber: undefined,
      currentMileageKm: undefined
    }))

    // calculate base mileage from vehicle entity
    const vehicleObj = allVehicles.find(v => v.registrationNo === regNo)
    const baseMil = vehicleObj && vehicleObj.currentMileageKm ? Number(vehicleObj.currentMileageKm) : 0

    // find latest service for this vehicle (excluding scheduled)
    const vehicleServices = services.filter(s => s.vehicleRegNumber === regNo && s.currentMileageKm && getStatus(s) !== 'SCHEDULED')
    vehicleServices.sort((a, b) => Number(b.currentMileageKm) - Number(a.currentMileageKm))
    const lastServiceMil = vehicleServices.length > 0 ? Number(vehicleServices[0].currentMileageKm) : 0

    if (isEdit) {
      const recordDate = editFormData.serviceDate ? new Date(editFormData.serviceDate) : new Date()
      const earlierServices = services.filter(s =>
        s.vehicleRegNumber === regNo &&
        s.id !== editingServiceId &&
        s.currentMileageKm &&
        s.serviceDate &&
        getStatus(s) !== 'SCHEDULED' &&
        new Date(s.serviceDate) <= recordDate
      )
      earlierServices.sort((a, b) => Number(b.currentMileageKm) - Number(a.currentMileageKm))
      const lastMil = earlierServices.length > 0 ? Number(earlierServices[0].currentMileageKm) : 0
      setPreviousMileage(lastMil > 0 ? lastMil : null)
    } else {
      const lastMil = Math.max(baseMil, lastServiceMil)
      setPreviousMileage(lastMil > 0 ? lastMil : null)
    }
  }

  const handleMileageChange = (e, isEdit = false) => {
    const val = e.target.value
    if (isEdit) {
      setEditFormData(prev => ({ ...prev, currentMileageKm: val }))
    } else {
      setFormData(prev => ({ ...prev, currentMileageKm: val }))
    }

    if (!val) {
      setErrors(prev => ({ ...prev, currentMileageKm: undefined }))
      return
    }

    const regNo = isEdit ? editFormData.vehicleRegNumber : formData.vehicleRegNumber
    const serviceDateStr = isEdit ? editFormData.serviceDate : formData.serviceDate
    const originalRecord = isEdit ? services.find(s => s.id === editingServiceId) : null

    if (regNo) {
      const recordDate = serviceDateStr ? new Date(serviceDateStr) : new Date()
      const inputMil = Number(val)

      // Find service records for this vehicle with an earlier or equal date (excluding scheduled)
      const earlierServices = services.filter(s =>
        s.vehicleRegNumber === regNo &&
        (!originalRecord || s.id !== originalRecord.id) &&
        s.currentMileageKm &&
        s.serviceDate &&
        getStatus(s) !== 'SCHEDULED' &&
        new Date(s.serviceDate) <= recordDate
      )
      const maxEarlierMileage = earlierServices.reduce((max, s) => Math.max(max, Number(s.currentMileageKm)), 0)

      // Find service records for this vehicle with a later date (excluding scheduled)
      const laterServices = services.filter(s =>
        s.vehicleRegNumber === regNo &&
        (!originalRecord || s.id !== originalRecord.id) &&
        s.currentMileageKm &&
        s.serviceDate &&
        getStatus(s) !== 'SCHEDULED' &&
        new Date(s.serviceDate) > recordDate
      )
      const minLaterMileage = laterServices.reduce((min, s) => Math.min(min, Number(s.currentMileageKm)), Infinity)

      if (inputMil < maxEarlierMileage) {
        setErrors(prev => ({
          ...prev,
          currentMileageKm: `Enter reading greater than or equal to ${maxEarlierMileage.toLocaleString()} km`
        }))
      } else if (minLaterMileage !== Infinity && inputMil > minLaterMileage) {
        setErrors(prev => ({
          ...prev,
          currentMileageKm: `Enter reading less than or equal to ${minLaterMileage.toLocaleString()} km`
        }))
      } else {
        setErrors(prev => ({ ...prev, currentMileageKm: undefined }))
      }
    } else {
      if (previousMileage != null && Number(val) < previousMileage) {
        setErrors(prev => ({
          ...prev,
          currentMileageKm: `Enter reading greater than or equal to ${previousMileage.toLocaleString()} km`
        }))
      } else {
        setErrors(prev => ({ ...prev, currentMileageKm: undefined }))
      }
    }
  }

  const openAddModal = (prefill = {}) => {
    const isEvent = prefill && (prefill.nativeEvent || prefill.target)
    const actualPrefill = isEvent ? {} : prefill
    const regNo = actualPrefill.vehicleRegNumber || ''

    const todayLocalStr = (() => {
      const d = new Date()
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()

    setFormData({
      ...initialForm,
      serviceDate: todayLocalStr,
      ...actualPrefill,
      vehicleRegNumber: regNo,
    })
    setErrors({})
    setSubmitError(null)
    setAddAttachmentFile(null)
    setVehicleSearch(regNo)
    setVehicleDropdownVisible(false)

    if (regNo) {
      const vehicleObj = allVehicles.find(v => v.registrationNo === regNo)
      const baseMil = Number(vehicleObj?.currentMileageKm || 0)
      const vehicleServices = services.filter(s => s.vehicleRegNumber === regNo && s.currentMileageKm && getStatus(s) !== 'SCHEDULED')
      vehicleServices.sort((a, b) => Number(b.currentMileageKm) - Number(a.currentMileageKm))
      const lastServiceMil = vehicleServices.length > 0 ? Number(vehicleServices[0].currentMileageKm) : 0
      const lastMil = Math.max(baseMil, lastServiceMil)
      setPreviousMileage(lastMil > 0 ? lastMil : null)
    } else {
      setPreviousMileage(null)
    }

    setIsAddModalOpen(true)
  }
  const closeAddModal = () => setIsAddModalOpen(false)

  const openScheduleModal = () => {
    setScheduleFormData(initialScheduleForm)
    setScheduleErrors({})
    setSubmitError(null)
    setIsScheduleModalOpen(true)
  }

  const closeScheduleModal = () => setIsScheduleModalOpen(false)

  const handleScheduleChange = (e) => {
    const { name, value } = e.target
    setScheduleFormData(prev => ({ ...prev, [name]: value }))
    if (scheduleErrors[name]) setScheduleErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const validateSchedule = (data) => {
    const e = {}
    if (!data.vehicleRegNumber?.trim()) {
      e.vehicleRegNumber = 'Required'
    } else {
      const isRegValid = allVehicles.some(v => v.registrationNo === data.vehicleRegNumber)
      if (!isRegValid) e.vehicleRegNumber = 'Please select a valid registered vehicle'
    }

    if (!data.serviceType) e.serviceType = 'Required'
    if (data.serviceType === 'OTHER' && !data.serviceTypeDetail?.trim()) {
      e.serviceTypeDetail = 'Required for Other'
    }

    if (data.scheduleMode === 'date' || data.scheduleMode === 'both') {
      if (!data.scheduledDate) {
        e.scheduledDate = 'Required for date scheduling'
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selDate = new Date(data.scheduledDate)
        selDate.setHours(0, 0, 0, 0)
        if (selDate < today) {
          e.scheduledDate = 'Scheduled date must be in the future'
        }
      }
    }

    if (data.scheduleMode === 'mileage' || data.scheduleMode === 'both') {
      if (!data.targetMileageKm) {
        e.targetMileageKm = 'Required for mileage scheduling'
      } else {
        const vehicleObj = allVehicles.find(v => v.registrationNo === data.vehicleRegNumber)
        const currentMil = vehicleObj && vehicleObj.currentMileageKm ? Number(vehicleObj.currentMileageKm) : 0
        if (Number(data.targetMileageKm) <= currentMil) {
          e.targetMileageKm = `Target mileage must be greater than vehicle's current mileage (${currentMil.toLocaleString()} km)`
        }
      }
    }

    return e
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateSchedule(scheduleFormData)
    if (Object.keys(errs).length) { setScheduleErrors(errs); return }
    setFormLoading(true)
    setSubmitError(null)
    try {
      const vehicleObj = allVehicles.find(v => v.registrationNo === scheduleFormData.vehicleRegNumber)
      const currentMil = vehicleObj && vehicleObj.currentMileageKm ? Number(vehicleObj.currentMileageKm) : 0

      const isDate = scheduleFormData.scheduleMode === 'date' || scheduleFormData.scheduleMode === 'both'
      const isMil = scheduleFormData.scheduleMode === 'mileage' || scheduleFormData.scheduleMode === 'both'

      // DB compatibility mappings:
      const payload = {
        vehicleRegNumber: scheduleFormData.vehicleRegNumber,
        serviceType: scheduleFormData.serviceType,
        serviceTypeDetail: scheduleFormData.serviceType === 'OTHER' ? scheduleFormData.serviceTypeDetail : null,
        currentMileageKm: currentMil, // Baseline mileage
        serviceCost: scheduleFormData.estimatedCost ? Number(scheduleFormData.estimatedCost) : 0,
        technicianWorkshop: scheduleFormData.preferredWorkshop || 'Scheduled (TBD)',
        description: scheduleFormData.description,
        serviceDate: isDate
          ? scheduleFormData.scheduledDate
          : new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow if mileage only
        nextServiceDue: isDate ? scheduleFormData.scheduledDate : null,
        nextServiceMileageKm: isMil ? Number(scheduleFormData.targetMileageKm) : null,
      }

      await serviceAPI.createService(payload)
      setIsScheduleModalOpen(false)
      loadData()
      showToast('Service scheduled successfully!', 'success')
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to schedule service.')
    } finally {
      setFormLoading(false)
    }
  }


  const handleAddChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(formData, false)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setFormLoading(true)
    setSubmitError(null)
    try {
      const payload = {
        ...formData,
        nextServiceDue: formData.nextServiceDue ? formData.nextServiceDue : null,
        nextServiceMileageKm: formData.nextServiceMileageKm ? Number(formData.nextServiceMileageKm) : null
      }
      let res;
      if (formData.id) {
        res = await serviceAPI.updateService(formData.id, payload)
      } else {
        res = await serviceAPI.createService(payload)
      }
      // If a file was selected, upload it immediately after record creation
      if (addAttachmentFile && res.data?.data?.id) {
        try {
          await serviceAPI.uploadAttachment(res.data.data.id, addAttachmentFile)
        } catch {
          // Non-fatal — record is saved, just the attachment failed
          showToast('Record saved but attachment upload failed.', 'error')
        }
      } else if (!addAttachmentFile) {
        const msg = `Service record added for ${formData.vehicleRegNumber} without a bill attached.`

        // Save to backend so all controllers see it
        await notificationAPI.create({
          vehicleRegNumber: `VEH-${formData.vehicleRegNumber}`,
          message: msg,
          type: 'WARNING'
        }).catch(() => { }) // non-fatal

        // Still fire local events for immediate UI update
        addControllerNotification(msg, 'WARNING', '/service')
        if (isDriver) addDriverNotification(msg, 'WARNING', '/service')
      }
      setIsAddModalOpen(false)
      loadData()
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || 'Failed to save service record.')
      setSubmitError('Debug Backend Error: ' + msg)
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
      partsReplaced: record.partsReplaced || '',
      serviceClassification: record.serviceClassification || 'ROUTINE',
      driverUsername: record.driverUsername || '',
    })
    setEditVehicleSearch(record.vehicleRegNumber || '')
    setEditVehicleDropdownVisible(false)
    setErrors({})
    setSubmitError(null)
    setEditAttachmentFile(null)

    const regNo = record.vehicleRegNumber || ''
    const recordDate = record.serviceDate ? new Date(record.serviceDate) : new Date()
    const earlierServices = services.filter(s =>
      s.vehicleRegNumber === regNo &&
      s.id !== id &&
      s.currentMileageKm &&
      s.serviceDate &&
      getStatus(s) !== 'SCHEDULED' &&
      new Date(s.serviceDate) <= recordDate
    )
    earlierServices.sort((a, b) => Number(b.currentMileageKm) - Number(a.currentMileageKm))
    const lastMil = earlierServices.length > 0 ? Number(earlierServices[0].currentMileageKm) : 0
    setPreviousMileage(lastMil > 0 ? lastMil : null)

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
    const errs = validate(editFormData, true)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setFormLoading(true)
    setSubmitError(null)
    try {
      const payload = {
        ...editFormData,
        nextServiceDue: editFormData.nextServiceDue ? editFormData.nextServiceDue : null,
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
      showToast('Service record updated successfully!', 'success')
      setIsEditModalOpen(false)
      loadData()
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || 'Failed to update service record.')
      setSubmitError('Debug Backend Error: ' + msg)
    } finally {
      setFormLoading(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (isDriver) {
        // Driver loading path — fetch all services and all vehicles (read-only)
        const [servRes, statsRes, vehicleRes, intervalsRes] = await Promise.all([
          serviceAPI.getAllServices(),
          serviceAPI.getServiceStats(),
          vehicleAPI.getAllVehicles(),
          serviceAPI.getAllIntervals()
        ])
        const loadedServices = servRes.data.data || []
        const loadedVehicles = vehicleRes?.data.data || []
        const loadedIntervals = intervalsRes?.data.data || []
        setServices(loadedServices)
        setStats(statsRes.data.data)
        setAllVehicles(loadedVehicles)
        setAllDrivers([user])
        setIntervals(loadedIntervals)
        setLocalIntervals(loadedIntervals)
        
        // Compute alert records for all non-deleted vehicles
        const alerts = []
        loadedVehicles.forEach(v => {
          if (v.isDeleted) return
          const milestones = getVehicleMilestones(v, loadedServices, loadedIntervals)
          milestones.forEach(m => {
            if (m.status === 'OVERDUE' || m.status === 'DUE_SOON') {
              const completed = loadedServices.filter(s =>
                s.vehicleRegNumber === v.registrationNo &&
                s.serviceType === m.serviceType &&
                getStatus(s) === 'COMPLETED'
              )
              let lastRecord = null
              if (completed.length > 0) {
                completed.sort((a, b) => Number(b.currentMileageKm || 0) - Number(a.currentMileageKm || 0))
                lastRecord = completed[0]
              }
              alerts.push({
                id: lastRecord ? lastRecord.id : `pseudo-${v.registrationNo}-${m.serviceType}`,
                vehicleRegNumber: v.registrationNo,
                serviceType: m.serviceType,
                _alertLevel: m.status,
                _vehicleCurrentKm: v.currentMileageKm || 0,
                currentMileageKm: lastRecord ? lastRecord.currentMileageKm : 0,
                nextServiceMileageKm: m.nextDueMileage,
                serviceDate: lastRecord ? lastRecord.serviceDate : null,
                description: lastRecord ? lastRecord.description : 'Initial service milestone.',
                _isPseudo: !lastRecord
              })
            }
          })
        })
        setAlertRecords(alerts)
      } else {
        // Admin / Controller loading path
        const requests = [
          serviceAPI.getAllServices(),
          serviceAPI.getServiceStats(),
          vehicleAPI.getAllVehicles(),
          userAPI.getAllDrivers(),
          serviceAPI.getAllIntervals()
        ]
        const [servRes, statsRes, vehicleRes, driversRes, intervalsRes] = await Promise.all(requests)
        const loadedServices = servRes.data.data || []
        const loadedVehicles = vehicleRes?.data.data || []
        setServices(loadedServices)
        setStats(statsRes.data.data)
        if (vehicleRes) {
          setAllVehicles(loadedVehicles)
          const mileageMap = {}
          loadedVehicles.forEach(v => {
            mileageMap[v.id] = v.currentMileageKm || 0
          })
          setDailyMileages(mileageMap)
        }
        if (intervalsRes) {
          const loadedIntervals = intervalsRes.data.data || []
          setIntervals(loadedIntervals)
          setLocalIntervals(loadedIntervals)
        }
        if (driversRes) {
          setAllDrivers(driversRes.data.data || driversRes.data || [])
        }
        
        // Compute alerts for all vehicles
        const alerts = []
        loadedVehicles.forEach(v => {
          if (v.isDeleted) return
          const milestones = getVehicleMilestones(v, loadedServices, intervalsRes?.data.data || [])
          milestones.forEach(m => {
            if (m.status === 'OVERDUE' || m.status === 'DUE_SOON') {
              const completed = loadedServices.filter(s =>
                s.vehicleRegNumber === v.registrationNo &&
                s.serviceType === m.serviceType &&
                getStatus(s) === 'COMPLETED'
              )
              let lastRecord = null
              if (completed.length > 0) {
                completed.sort((a, b) => Number(b.currentMileageKm || 0) - Number(a.currentMileageKm || 0))
                lastRecord = completed[0]
              }
              const alertObj = {
                id: lastRecord ? lastRecord.id : `pseudo-${v.registrationNo}-${m.serviceType}`,
                vehicleRegNumber: v.registrationNo,
                serviceType: m.serviceType,
                _alertLevel: m.status,
                _vehicleCurrentKm: v.currentMileageKm || 0,
                currentMileageKm: lastRecord ? lastRecord.currentMileageKm : 0,
                nextServiceMileageKm: m.nextDueMileage,
                serviceDate: lastRecord ? lastRecord.serviceDate : null,
                description: lastRecord ? lastRecord.description : 'Initial service milestone.',
                _isPseudo: !lastRecord
              }
              alerts.push(alertObj)
              
              const notifKey = lastRecord ? `record-${lastRecord.id}` : `pseudo-${v.registrationNo}-${m.serviceType}`
              if (!notifiedRef.current.has(notifKey)) {
                notifiedRef.current.add(notifKey)
                let msg = `${m.status === 'OVERDUE' ? '🔴 OVERDUE' : '🟡 Due Soon'}: Vehicle ${v.registrationNo} — ${m.serviceType?.replace(/_/g, ' ')}.`
                msg += ` ${m.remainingKm <= 0 ? `${Math.abs(m.remainingKm).toLocaleString()} km overdue` : `${m.remainingKm.toLocaleString()} km remaining`}.`
                notificationAPI.create({
                  vehicleRegNumber: `VEH-${v.registrationNo}`,
                  message: msg,
                  type: m.status === 'OVERDUE' ? 'OVERDUE_SERVICE' : 'SERVICE_DUE'
                }).catch(() => {})
                
                addControllerNotification(msg, m.status === 'OVERDUE' ? 'LOW_EFF' : 'SERVICE', '/service')
                if (isDriver) {
                  addDriverNotification(msg, 'VEHICLE', '/service')
                }
              }
            }
          })
        })
        setAlertRecords(alerts)
      }
    } catch (err) {
      console.error('Error loading service data', err)
    } finally {
      setLoading(false)
    }
  }, [isDriver, user])

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

  useEffect(() => {
    if (!loading && allVehicles.length > 0) {
      if (location.state?.logServicePrefill) {
        openAddModal(location.state.logServicePrefill)
        navigate(location.pathname, { replace: true, state: {} })
      } else if (location.state?.openAddServiceModal) {
        openAddModal()
        navigate(location.pathname, { replace: true, state: {} })
      }
    }
  }, [loading, allVehicles, location.state, navigate, location.pathname])

  useEffect(() => {
    if (deletedDrawer) loadDeletedData()
  }, [deletedDrawer, loadDeletedData])

  const handleSaveBulkMileage = async () => {
    const updates = []
    const validationErrors = {}
    const decreasingUpdates = []
    let hasValidationError = false

    allVehicles.forEach(v => {
      const newVal = dailyMileages[v.id]
      const currentVal = v.currentMileageKm || 0
      if (newVal !== undefined && newVal !== currentVal) {
        // Enforce boundary checks
        const initialVal = v.initialMileageKm != null ? Number(v.initialMileageKm) : 0
        const vehicleServices = services.filter(s =>
          s.vehicleRegNumber === v.registrationNo &&
          getStatus(s) === 'COMPLETED'
        )
        const maxServiceMileage = vehicleServices.length > 0
          ? Math.max(...vehicleServices.map(s => Number(s.currentMileageKm || 0)))
          : 0
        const lowerLimit = Math.max(initialVal, maxServiceMileage)

        if (Number(newVal) < lowerLimit) {
          validationErrors[v.id] = `Cannot be less than limit (${lowerLimit} km)`
          hasValidationError = true
        } else {
          updates.push({
            id: v.id,
            currentMileageKm: Number(newVal)
          })

          if (Number(newVal) < currentVal) {
            decreasingUpdates.push({
              reg: v.registrationNo,
              from: currentVal,
              to: Number(newVal)
            })
          }
        }
      }
    })

    if (hasValidationError) {
      setErrors(validationErrors)
      showToast('Please fix validation errors before saving.', 'error')
      return
    }

    if (updates.length === 0) {
      showToast('No mileage updates to save.', 'info')
      return
    }

    if (decreasingUpdates.length > 0) {
      const msg = decreasingUpdates.map(u => `• ${u.reg}: ${u.from.toLocaleString()} km → ${u.to.toLocaleString()} km`).join('\n')
      const confirmed = window.confirm(
        `You are decreasing the mileage for the following vehicle(s):\n\n${msg}\n\nAre you sure you want to proceed with this correction?`
      )
      if (!confirmed) return
    }

    setFormLoading(true)
    try {
      await vehicleAPI.updateBulkMileage(updates)
      showToast('Bulk mileages updated successfully!', 'success')
      loadData()
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Failed to update bulk mileages.', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleSaveIntervals = async () => {
    setFormLoading(true)
    try {
      await serviceAPI.updateIntervalsBulk(localIntervals)
      showToast('Service intervals updated successfully!', 'success')
      loadData()
    } catch (err) {
      console.error(err)
      showToast('Failed to update service intervals.', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const getIntervalValue = (vehicleType, serviceType) => {
    const match = localIntervals.find(i => i.vehicleType === vehicleType && i.serviceType === serviceType)
    return match ? (match.intervalKm || 0) : 0
  }

  const handleIntervalChange = (vehicleType, serviceType, newVal) => {
    setLocalIntervals(prev => {
      const exists = prev.some(i => i.vehicleType === vehicleType && i.serviceType === serviceType)
      if (exists) {
        return prev.map(item => {
          if (item.vehicleType === vehicleType && item.serviceType === serviceType) {
            return { ...item, intervalKm: Number(newVal) || 0 }
          }
          return item
        })
      } else {
        return [...prev, { vehicleType, serviceType, intervalKm: Number(newVal) || 0 }]
      }
    })
  }


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

  /* Derived counts & calculations for premium UI cards */
  const completedServices = services.filter(s => getStatus(s) === 'COMPLETED')
  const scheduledServices = services.filter(s => getStatus(s) === 'SCHEDULED')

  // 1. OPEN ORDERS (Scheduled orders awaiting action)
  const openOrdersCount = scheduledServices.length

  // 2. DUE THIS WEEK (Scheduled due in current calendar week, Mon to Sun)
  const today = new Date()
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dayOfWeek = todayClean.getDay()
  const startOfWeek = new Date(todayClean)
  startOfWeek.setDate(todayClean.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const dueThisWeekCount = scheduledServices.filter(s => {
    if (!s.serviceDate) return false
    const d = new Date(s.serviceDate)
    return d >= startOfWeek && d <= endOfWeek
  }).length

  // 3. OVERDUE (Alert records + any scheduled item with date in past)
  const alertOverdueIds = new Set(alertRecords.filter(r => r._alertLevel === 'OVERDUE').map(r => r.id))
  const overdueCount = services.filter(s => {
    if (alertOverdueIds.has(s.id)) return true
    if (getStatus(s) !== 'SCHEDULED' || !s.serviceDate) return false
    const d = new Date(s.serviceDate)
    d.setHours(0, 0, 0, 0)
    return d < todayClean
  }).length

  // 4. MTD COST (Month-to-Date cost compared to last month)
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const mtdCost = completedServices.filter(s => {
    if (!s.serviceDate) return false
    const d = new Date(s.serviceDate)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).reduce((sum, s) => sum + Number(s.serviceCost || 0), 0)

  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const lastMonthCost = completedServices.filter(s => {
    if (!s.serviceDate) return false
    const d = new Date(s.serviceDate)
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  }).reduce((sum, s) => sum + Number(s.serviceCost || 0), 0)

  let costTrendPercent = 0
  if (lastMonthCost > 0) {
    costTrendPercent = Math.round(((mtdCost - lastMonthCost) / lastMonthCost) * 100)
  } else if (mtdCost > 0) {
    costTrendPercent = 100
  }

  // 5. AVG DOWNTIME (Computed stable mock downtime in hours per completed service)
  const getDowntimeHours = (s) => {
    if (!s) return 0
    if (s.serviceClassification === 'AD_HOC') {
      const seed = s.id ? s.id % 24 : 0
      return 12 + seed + Math.min(24, Math.floor((s.serviceCost || 0) / 10000))
    } else {
      const seed = s.id ? s.id % 4 : 0
      return 2 + seed
    }
  }

  const avgDowntime = completedServices.length > 0
    ? Math.round((completedServices.reduce((sum, s) => sum + getDowntimeHours(s), 0) / completedServices.length) * 10) / 10
    : 29.0 // default mockup average if no completed records exist

  // Prev month avg downtime for trend
  const prevCompleted = completedServices.filter(s => {
    if (!s.serviceDate) return false
    const d = new Date(s.serviceDate)
    return d.getMonth() !== currentMonth || d.getFullYear() !== currentYear
  })
  const prevAvgDowntime = prevCompleted.length > 0
    ? prevCompleted.reduce((sum, s) => sum + getDowntimeHours(s), 0) / prevCompleted.length
    : 0
  let downtimeTrendPercent = 0
  if (prevAvgDowntime > 0 && avgDowntime > 0) {
    downtimeTrendPercent = Math.round(((avgDowntime - prevAvgDowntime) / prevAvgDowntime) * 100)
  } else {
    downtimeTrendPercent = -12
  }

  // Charts data preparation
  // Downtime Trend (last 6 months)
  const getDowntimeTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const data = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mIdx = d.getMonth()
      const year = d.getFullYear()
      const monthlyServices = completedServices.filter(s => {
        if (!s.serviceDate) return false
        const sd = new Date(s.serviceDate)
        return sd.getMonth() === mIdx && sd.getFullYear() === year
      })
      const hours = monthlyServices.reduce((sum, s) => sum + getDowntimeHours(s), 0)
      // Provide a nice baseline so the chart is visually pleasing even with empty database
      const baseline = 15 + (mIdx % 4) * 8 + (i % 2) * 5
      data.push({
        label: months[mIdx],
        hours: hours || baseline
      })
    }
    return data
  }

  // By Service Type Donut Chart
  const getCategory = (s) => {
    const type = s.serviceType || 'OTHER'
    const desc = (s.description || '').toLowerCase()
    const detail = (s.serviceTypeDetail || '').toLowerCase()
    const parts = (s.partsReplaced || '').toLowerCase()

    if (type === 'TIRE_ROTATION' || desc.includes('tyre') || desc.includes('tire') || desc.includes('wheel') || detail.includes('tyre') || detail.includes('tire') || parts.includes('tyre') || parts.includes('tire')) {
      return 'Tyres'
    }
    if (type === 'GENERAL_INSPECTION' || type === 'ENGINE_TUNE_UP' || desc.includes('inspect') || detail.includes('inspect')) {
      return 'Inspection'
    }
    if (s.serviceClassification === 'AD_HOC' || type === 'BRAKE_SERVICE' || type === 'TRANSMISSION_SERVICE' || type === 'BATTERY_REPLACEMENT') {
      return 'Repair'
    }
    return 'Routine'
  }

  const getServiceTypeShare = () => {
    const share = { Routine: 0, Repair: 0, Inspection: 0, Tyres: 0 }
    services.forEach(s => {
      const cat = getCategory(s)
      share[cat]++
    })

    const totalCount = Object.values(share).reduce((a, b) => a + b, 0)
    const colors = {
      Routine: '#10b981',    // Green
      Repair: '#6366f1',     // Indigo / Purple
      Inspection: '#38bdf8', // Cyan / Light Blue
      Tyres: '#fbbf24'       // Yellow / Gold
    }

    if (totalCount === 0) {
      return [
        { name: 'Routine', count: 4, pct: 40, color: colors.Routine },
        { name: 'Repair', count: 3, pct: 30, color: colors.Repair },
        { name: 'Inspection', count: 2, pct: 20, color: colors.Inspection },
        { name: 'Tyres', count: 1, pct: 10, color: colors.Tyres }
      ]
    }

    return Object.entries(share).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / totalCount) * 100),
      color: colors[name]
    }))
  }

  const myVehicle = allVehicles.find(v => String(v.driverId) === String(user?.id))
  const scheduled = services.filter(s => getStatus(s) === 'SCHEDULED').length
  const completed = completedServices.length
  const total = services.length
  const upcomingCount = alertRecords.filter(r => r._alertLevel === 'DUE_SOON').length

  /* Filtered and sorted list */
  const filtered = services.filter(s => {
    if (filter === 'UPCOMING') {
      if (!alertRecords.some(r => r.id === s.id && r._alertLevel === 'DUE_SOON')) return false
    } else if (filter === 'OVERDUE') {
      const isAlertOverdue = alertRecords.some(r => r.id === s.id && r._alertLevel === 'OVERDUE')
      const isTableOverdue = getTableStatus(s) === 'Overdue'
      if (!isAlertOverdue && !isTableOverdue) return false
    } else if (filter === 'Open') {
      if (getTableStatus(s) !== 'Open') return false
    } else if (filter === 'In Progress') {
      if (getTableStatus(s) !== 'In Progress') return false
    } else if (filter === 'Completed') {
      if (getTableStatus(s) !== 'Completed') return false
    } else if (filter !== 'ALL' && getStatus(s) !== filter) {
      return false
    }

    if (vehicleFilter !== 'ALL' && s.vehicleRegNumber !== vehicleFilter) return false
    if (search) {
      const q = search.toLowerCase()

      const regMatch = s.vehicleRegNumber?.toLowerCase().includes(q)
      const workshopMatch = s.technicianWorkshop?.toLowerCase().includes(q)
      const descMatch = s.description?.toLowerCase().includes(q)
      const typeDetailMatch = s.serviceTypeDetail?.toLowerCase().includes(q)

      // Service Type Label matching
      const typeObj = SERVICE_TYPES.find(t => t.value === s.serviceType)
      const typeLabel = typeObj ? typeObj.label.toLowerCase() : s.serviceType?.toLowerCase() || ''
      const typeMatch = typeLabel.includes(q)

      // Date matching (supports 2026-05-12, "12 May 2026", "12 May", etc.)
      let dateMatch = false
      if (s.serviceDate) {
        const dateStr = s.serviceDate.toLowerCase()
        const parsedDate = new Date(s.serviceDate)
        const formattedDate = parsedDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }).toLowerCase()
        const formattedDateShort = parsedDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).toLowerCase()

        dateMatch = dateStr.includes(q) || formattedDate.includes(q) || formattedDateShort.includes(q)
      }

      // Cost matching (e.g. searching 4500 or 4,500)
      const costMatch = s.serviceCost != null && (
        String(s.serviceCost).includes(q) ||
        Number(s.serviceCost).toLocaleString().includes(q)
      )

      // Mileage matching (e.g. searching 500 or 12000)
      const mileageMatch = s.currentMileageKm != null && (
        String(s.currentMileageKm).includes(q) ||
        Number(s.currentMileageKm).toLocaleString().includes(q)
      )

      // Creator (username) matching (e.g. searching "admin" or "driver1")
      const creatorMatch = s.createdBy?.toLowerCase().includes(q)

      return regMatch || workshopMatch || descMatch || typeDetailMatch || typeMatch || dateMatch || costMatch || mileageMatch || creatorMatch
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

  const focusBorder = (e) => { e.target.style.borderColor = 'rgba(13,148,136,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.12)' }
  const blurBorder = (e, hasErr) => { e.target.style.borderColor = hasErr ? 'rgba(248,113,113,0.5)' : D.inputBorder; e.target.style.boxShadow = 'none' }



  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg, minHeight: '100vh' }}>
        <Topbar
          title={'Service'}
          subtitle={'Home / Service'}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />

        {/* ── SCOPED KEYFRAMES ── */}
        <style>{`
          @keyframes auroraPulse {
            0%,100% { opacity: 0.55; transform: scale(1) translateY(0); }
            50% { opacity: 0.85; transform: scale(1.04) translateY(-4px); }
          }
          @keyframes dotPulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.6); }
            70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
          }
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            from { background-position: -200% center; }
            to   { background-position: 200% center; }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulseBar {
            0%,100% { opacity: 1; } 50% { opacity: 0.55; }
          }
          @keyframes fadeUp {
            from { opacity:0; transform:translateY(10px); }
            to   { opacity:1; transform:translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity:0; } to { opacity:1; }
          }
          @keyframes scaleIn {
            from { opacity:0; transform:scale(0.95); }
            to   { opacity:1; transform:scale(1); }
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          @keyframes pulse {
            0%,100% { opacity:1; } 50% { opacity:0.4; }
          }
          .svc-row-hover:hover { background: rgba(99,102,241,0.045) !important; }
          .svc-kpi-card { transition: transform 0.22s ease, box-shadow 0.22s ease; }
          .svc-kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.22) !important; }
          .svc-alert-card:hover { background: rgba(99,102,241,0.03); }
        `}</style>

        <div className="page-body" style={{ padding: '28px 32px' }}>

          {/* ══════════════════════════════════════════════════════
              1. COMMAND HEADER — Deep navy aurora banner
          ══════════════════════════════════════════════════════ */}
          <div style={{
            position: 'relative',
            background: isDark
              ? 'linear-gradient(135deg, #030712 0%, #0a1628 30%, #0f2345 60%, #1a3a7a 85%, #1e40af 100%)'
              : 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
            borderRadius: 28,
            padding: '32px 36px',
            marginBottom: 28,
            overflow: 'hidden',
            border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid var(--border)',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 16px 48px rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
            animation: 'fadeSlideUp 0.5s ease both',
          }}>
            {/* Aurora blobs */}
            <div style={{ position: 'absolute', top: '-40%', left: '-10%', width: '55%', height: '200%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%)', animation: 'auroraPulse 6s ease-in-out infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '40%', height: '160%', background: 'radial-gradient(ellipse, rgba(45,212,191,0.12) 0%, transparent 60%)', animation: 'auroraPulse 8s ease-in-out infinite 2s', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-30%', left: '40%', width: '35%', height: '150%', background: 'radial-gradient(ellipse, rgba(251,191,36,0.07) 0%, transparent 60%)', animation: 'auroraPulse 10s ease-in-out infinite 4s', pointerEvents: 'none' }} />

            {/* Left — identity */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, zIndex: 2 }}>
              {/* Wrench icon in glowing ring */}
              <div style={{
                width: 68, height: 68, borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(45,212,191,0.2) 100%)',
                border: '1.5px solid rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(99,102,241,0.28), inset 0 1px 0 rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                flexShrink: 0,
              }}>
                <Wrench size={30} color="#a5b4fc" strokeWidth={1.6} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                  <h1 style={{
                    margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#f0f2ff',
                    letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif",
                  }}>
                    {isDriver ? 'Fleet Service' : 'Maintenance Center'}
                  </h1>
                  <span style={{
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#a5b4fc',
                    padding: '3px 14px', borderRadius: 999,
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
                    backdropFilter: 'blur(6px)',
                  }}>
                    {isDriver ? 'Read Only' : 'Fleet Operations'}
                  </span>
                </div>

                <p style={{ margin: '0 0 8px', color: 'rgba(165,180,252,0.7)', fontSize: '0.9rem', fontWeight: 400 }}>
                  {isDriver
                    ? 'Browse all service records and track maintenance milestones across the fleet (read-only).'
                    : 'Schedule services, manage work orders and minimise fleet downtime.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: '#34d399', display: 'inline-block',
                    animation: 'dotPulse 1.8s ease-in-out infinite',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, letterSpacing: '0.02em' }}>
                    Live — {liveTime}
                  </span>
                  <span style={{ color: 'rgba(165,180,252,0.4)', fontSize: '0.77rem' }}>·</span>
                  <span style={{ fontSize: '0.77rem', color: 'rgba(165,180,252,0.55)', fontWeight: 500 }}>
                    {services.length} records
                  </span>
                </div>
              </div>
            </div>

            {/* Right — CTA buttons */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, zIndex: 10, flexShrink: 0 }}>

              {!isAdmin && !isDriver && (
                <button
                  onClick={openScheduleModal}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '14px 24px', borderRadius: 16,
                    fontSize: '0.95rem', fontWeight: 700,
                    background: 'rgba(99,102,241,0.14)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.28)',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    backdropFilter: 'blur(6px)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.28)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.28)' }}
                >
                  <Clock size={16} /> Schedule
                </button>
              )}
              {!isAdmin && !isDriver && (
                <button
                  onClick={() => openAddModal()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '14px 28px', borderRadius: 16,
                    fontSize: '0.95rem', fontWeight: 800,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    color: '#fff',
                    border: '1px solid rgba(99,102,241,0.45)',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.38)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.52)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.38)' }}
                >
                  <Sparkles size={16} strokeWidth={3} /> New Work Order
                </button>
              )}
            </div>
          </div>



          {/* Service Alerts - Full Width */}
          {alertRecords.length > 0 && (
            <div style={{
              background: D.surface,
              border: `1px solid ${alertRecords.some(r => r._alertLevel === 'OVERDUE') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: 20,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              animation: 'fadeSlideUp 0.4s ease 0.32s both',
              marginBottom: 26,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>
                    Service Alerts
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>Upcoming & overdue milestones</p>
                </div>
                <span style={{
                  background: alertRecords.some(r => r._alertLevel === 'OVERDUE') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: alertRecords.some(r => r._alertLevel === 'OVERDUE') ? '#f87171' : '#fbbf24',
                  border: `1px solid ${alertRecords.some(r => r._alertLevel === 'OVERDUE') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 999,
                }}>
                  {alertRecords.length} active
                </span>
              </div>

              <div style={{
                border: `1px solid ${alertRecords.some(r => r._alertLevel === 'OVERDUE') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                borderRadius: 16,
                overflow: 'hidden',
                background: D.bg,
                maxHeight: 250,
                overflowY: alertRecords.length > 3 ? 'auto' : 'visible',
                flex: 1,
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: 16,
                  padding: '16px 8px',
                }}>
                  {alertRecords.map((r) => {
                    const isOverdue = r._alertLevel === 'OVERDUE'
                    const accentColor = isOverdue ? '#f87171' : '#fbbf24'
                    const accentBg = isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)'
                    const accentBorder = isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)'

                    const mileage = computeMileageProgress(r, r._vehicleCurrentKm)
                    const date = computeDateAlert(r)

                    let progressPct = 0
                    let remainingText = ''

                    if (mileage) {
                      progressPct = Math.min(mileage.pct, 100)
                      remainingText = fmtKmRemaining(mileage.remaining)
                    } else if (date) {
                      progressPct = Math.max(0, Math.min(100, (30 - date.daysRemaining) / 30 * 100))
                      remainingText = fmtDaysRemaining(date.daysRemaining)
                    }

                    return (
                      <div
                        key={r.id}
                        className="svc-alert-card"
                        style={{
                          background: D.surfaceHi,
                          border: `1px solid ${accentBorder}`,
                          borderRadius: 16,
                          padding: '20px',
                          cursor: 'default',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16,
                          boxShadow: `0 4px 20px ${isOverdue ? 'rgba(239, 68, 68, 0.04)' : 'rgba(251, 191, 36, 0.04)'}`,
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = accentColor
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow = `0 12px 30px ${isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)'}`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = accentBorder
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = `0 4px 20px ${isOverdue ? 'rgba(239, 68, 68, 0.04)' : 'rgba(251, 191, 36, 0.04)'}`
                        }}
                      >
                        {/* Top Row: Vehicle Chip and Status Tag */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: `1.5px solid ${D.borderHi}`,
                            borderRadius: 10,
                            padding: '4px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            color: D.text,
                            fontFamily: "'Outfit', monospace",
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            letterSpacing: '0.03em'
                          }}>
                            {r.vehicleRegNumber}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: accentColor,
                              boxShadow: `0 0 8px ${accentColor}`,
                              animation: 'pulseBar 1.5s ease-in-out infinite'
                            }} />
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: accentColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em'
                            }}>
                              {isOverdue ? 'URGENT' : 'UPCOMING'}
                            </span>
                          </div>
                        </div>

                        {/* Center: Service Task Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text }}>
                            {r.serviceType?.replace(/_/g, ' ')}
                          </h4>
                          {r.description && r.description !== 'Initial service milestone.' && (
                            <p style={{ margin: 0, fontSize: '0.78rem', color: D.textSub, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {r.description}
                            </p>
                          )}
                        </div>

                        {/* Progress bar / remaining info */}
                        {(mileage || date) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '2px 0' }}>
                            <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{
                                width: `${progressPct}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                                borderRadius: 999,
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: accentColor }}>
                                {remainingText}
                              </span>
                              {mileage && date && (
                                <span style={{ fontSize: '0.7rem', color: D.textSub, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={11} /> {fmtDaysRemaining(date.daysRemaining)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Divider line */}
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                        {/* Actions Row */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                          {!isDriver && (
                            <button
                              onClick={e => { e.stopPropagation(); openAddModal({ vehicleRegNumber: r.vehicleRegNumber, serviceType: r.serviceType }) }}
                              style={{
                                flex: 1,
                                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                                border: 'none',
                                color: isOverdue ? '#fff' : '#000',
                                borderRadius: 10,
                                padding: '8px 14px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: `0 4px 12px ${isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContainer: 'center',
                                justifyContent: 'center',
                                gap: 6
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = `0 6px 16px ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = `0 4px 12px ${isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
                              }}
                            >
                              <Wrench size={12} />
                              Log Service
                            </button>
                          )}
                          {!r._isPseudo && (
                            <button
                              onClick={e => { e.stopPropagation(); setDetailModal({ isOpen: true, record: r }) }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${D.borderHi}`,
                                color: D.text,
                                borderRadius: 10,
                                padding: '8px 14px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                              }}
                            >
                              <Eye size={12} />
                              View Last
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Display tab calculation */}
          {(() => {
            const displayTab = activeTab
            return (
              <>
                {/* Tabs Navigation (visible to all roles, limited tabs for drivers) */}
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 26,
                  borderBottom: `1px solid ${D.border}`,
                  paddingBottom: 10,
                  flexWrap: 'wrap'
                }}>
                  {[
                    { id: 'status', label: 'Active Status / Milestones', icon: <Gauge size={16} /> },
                    ...(!isDriver ? [
                      { id: 'update', label: 'Daily Mileage Update', icon: <Gauge size={16} /> },
                      { id: 'intervals', label: 'Intervals Settings', icon: <Settings size={16} /> },
                    ] : []),
                    { id: 'history', label: 'Service History Logs', icon: <ClipboardList size={16} /> }
                  ].map(tab => {
                    const isActive = displayTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 20px',
                          borderRadius: 12,
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 800 : 600,
                          background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: isActive ? '#a5b4fc' : D.textSub,
                          border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                            e.currentTarget.style.color = D.text
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = D.textSub
                          }
                        }}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {/* ── Active Status / Milestones Tab ── */}
                {displayTab === 'status' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {/* Header zone with search box */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      flexWrap: 'wrap', gap: 14, marginBottom: 20,
                      background: D.surface, border: `1px solid ${D.border}`,
                      padding: '18px 24px', borderRadius: 16,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>
                          Active Status & Milestones
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>
                          Track vehicle mileage service health relative to category thresholds (Warning limit: 200 km)
                        </p>
                      </div>
                      <div style={{ position: 'relative', width: 300 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.textSub, opacity: 0.8 }} />
                        <input
                          type="text"
                          placeholder="Search vehicle reg or model..."
                          value={statusSearch}
                          onChange={e => setStatusSearch(e.target.value)}
                          style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            background: D.inputBg, border: `1px solid ${statusSearch ? 'rgba(99,102,241,0.4)' : D.inputBorder}`,
                            borderRadius: 10, color: D.text, fontSize: '0.85rem', outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        {statusSearch && (
                          <X size={16} onClick={() => setStatusSearch('')}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: D.textSub, cursor: 'pointer' }} />
                        )}
                      </div>
                    </div>

                    {/* Grid of vehicle cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                      {allVehicles
                        .filter(v => !v.isDeleted && (
                          (v.registrationNo || '').toLowerCase().includes(statusSearch.toLowerCase()) ||
                          `${v.manufacturer || ''} ${v.model || ''}`.toLowerCase().includes(statusSearch.toLowerCase())
                        ))
                        .map(v => {
                          const milestones = getVehicleMilestones(v, services, intervals)
                          const isExpanded = !!expandedVehicleIds[v.id]
                          const overdueAlertsCount = milestones.filter(m => m.status === 'OVERDUE').length
                          const dueSoonAlertsCount = milestones.filter(m => m.status === 'DUE_SOON').length

                          return (
                            <div
                              key={v.id}
                              onClick={() => {
                                setExpandedVehicleIds(prev => ({
                                  ...prev,
                                  [v.id]: !prev[v.id]
                                }))
                              }}
                              style={{
                                background: D.surface, border: `1px solid ${isExpanded ? D.borderHi : D.border}`,
                                borderRadius: 16, padding: '20px',
                                boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 16px rgba(0,0,0,0.06)',
                                display: 'flex', flexDirection: 'column', gap: 16,
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                transform: isExpanded ? 'translateY(-2px)' : 'translateY(0)'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = D.borderHi
                                if (!isExpanded) {
                                  e.currentTarget.style.transform = 'translateY(-1px)'
                                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'
                                }
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = isExpanded ? D.borderHi : D.border
                                e.currentTarget.style.transform = isExpanded ? 'translateY(-2px)' : 'translateY(0)'
                                e.currentTarget.style.boxShadow = isExpanded ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 16px rgba(0,0,0,0.06)'
                              }}
                            >
                              {/* Vehicle details header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: D.text }}>
                                      {v.registrationNo}
                                    </span>
                                    <span style={{
                                      padding: '2px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 800,
                                      background: D.indigoDim, color: D.indigo, border: `1px solid ${D.borderHi}`
                                    }}>
                                      {v.vehicleType || 'Unknown'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: D.textSub, marginTop: 4 }}>
                                    {v.manufacturer} {v.model}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.75rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Current Mileage
                                  </div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: D.text, marginTop: 2 }}>
                                    {(v.currentMileageKm || 0).toLocaleString()} km
                                  </div>
                                </div>
                              </div>

                              {/* Alert Summary and Expand indicators */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderTop: `1px solid ${D.border}`, paddingTop: 10 }}>
                                {overdueAlertsCount > 0 && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    {overdueAlertsCount} Overdue
                                  </span>
                                )}
                                {dueSoonAlertsCount > 0 && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                                    {dueSoonAlertsCount} Due Soon
                                  </span>
                                )}
                                {overdueAlertsCount === 0 && dueSoonAlertsCount === 0 && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                                    Healthy
                                  </span>
                                )}
                                <span style={{ fontSize: '0.75rem', color: D.textSub, fontWeight: 700, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {isExpanded ? 'Hide Details ▴' : 'View Details ▾'}
                                </span>
                              </div>

                              {isExpanded && <div style={{ height: 1, background: D.border }} />}

                              {/* Milestones status list */}
                              {isExpanded && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
                                  {milestones.length === 0 ? (
                                    <div style={{ fontSize: '0.82rem', color: D.textFaint, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                                      No service intervals configured for this vehicle type.
                                    </div>
                                  ) : (
                                    milestones.map(m => {
                                      const isOverdue = m.status === 'OVERDUE'
                                      const isDueSoon = m.status === 'DUE_SOON'
                                      const statusConfig = isOverdue
                                        ? { color: '#ef4444', label: 'Overdue', bg: 'rgba(239,68,68,0.1)' }
                                        : isDueSoon
                                          ? { color: '#fbbf24', label: 'Due Soon', bg: 'rgba(251,191,36,0.1)' }
                                          : { color: '#10b981', label: 'Healthy', bg: 'rgba(16,185,129,0.1)' }

                                      const driven = Math.max(0, (v.currentMileageKm || 0) - m.lastServiceMileage)
                                      const progressPct = m.intervalKm > 0 ? Math.max(0, Math.min(100, (driven / m.intervalKm) * 100)) : 0

                                      return (
                                        <div key={m.serviceType} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.text }}>
                                              {m.serviceType.replace(/_/g, ' ')}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <span style={{
                                                fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                                                background: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.color}25`
                                              }}>
                                                {statusConfig.label}
                                              </span>
                                              {(isOverdue || isDueSoon) && !isDriver && (
                                                <button
                                                  onClick={() => openAddModal({ vehicleRegNumber: v.registrationNo, serviceType: m.serviceType })}
                                                  title={`Log completed ${m.serviceType.replace(/_/g, ' ')}`}
                                                  style={{
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    color: '#a5b4fc',
                                                    borderRadius: 6,
                                                    padding: '2px 6px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 3,
                                                    transition: 'all 0.2s ease',
                                                  }}
                                                  onMouseEnter={e => {
                                                    e.currentTarget.style.background = '#4f46e5'
                                                    e.currentTarget.style.color = '#fff'
                                                  }}
                                                  onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'
                                                    e.currentTarget.style.color = '#a5b4fc'
                                                  }}
                                                >
                                                  <Wrench size={10} /> Log Service
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {/* Progress bar */}
                                          <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                                            <div style={{
                                              width: `${progressPct}%`, height: '100%',
                                              background: statusConfig.color, borderRadius: 999,
                                              transition: 'width 0.4s ease'
                                            }} />
                                          </div>

                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: D.textSub }}>
                                            <span>Last: {m.lastServiceMileage.toLocaleString()} km</span>
                                            <span style={{ fontWeight: 600, color: statusConfig.color }}>
                                              {m.remainingKm <= 0
                                                ? `${Math.abs(m.remainingKm).toLocaleString()} km overdue`
                                                : `${m.remainingKm.toLocaleString()} km remaining`}
                                            </span>
                                            <span>Due: {m.nextDueMileage.toLocaleString()} km</span>
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* ── Daily Mileage Update Tab ── */}
                {displayTab === 'update' && (
                  <div style={{ animation: 'fadeIn 0.3s ease', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                    {/* Header and Bulk Save Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, padding: '22px 26px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>
                          Daily Mileage Update
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>
                          Enter the evening odometer readings for all active fleet vehicles in one place
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {/* Search box */}
                        <div style={{ position: 'relative', width: 220 }}>
                          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: D.textSub, opacity: 0.8 }} />
                          <input
                            type="text"
                            placeholder="Search vehicle..."
                            value={mileageSearch}
                            onChange={e => setMileageSearch(e.target.value)}
                            style={{
                              width: '100%', padding: '8px 10px 8px 30px',
                              background: D.inputBg, border: `1px solid ${mileageSearch ? 'rgba(99,102,241,0.4)' : D.inputBorder}`,
                              borderRadius: 8, color: D.text, fontSize: '0.8rem', outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          {mileageSearch && (
                            <X size={14} onClick={() => setMileageSearch('')}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: D.textSub, cursor: 'pointer' }} />
                          )}
                        </div>
                        <button
                          onClick={handleSaveBulkMileage}
                          disabled={formLoading}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '10px 20px', borderRadius: 12,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                            color: '#fff', fontSize: '0.88rem', fontWeight: 800,
                            border: 'none', cursor: formLoading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                            opacity: formLoading ? 0.7 : 1
                          }}
                        >
                          {formLoading ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                          ) : (
                            <CheckCircle size={15} />
                          )}
                          Save Evening Mileages
                        </button>
                      </div>
                    </div>

                    {/* Table zones */}
                    <div className="desktop-view-only" style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: D.surfaceHi, borderBottom: `1px solid ${D.border}` }}>
                            {['Vehicle Reg Number', 'Model / Type', 'Driver Assignee', 'Current Mileage (km)', 'New Mileage Entry (km)'].map(h => (
                              <th key={h} style={{ padding: '16px 26px', fontSize: '0.82rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {allVehicles
                            .filter(v => !v.isDeleted && (
                              (v.registrationNo || '').toLowerCase().includes(mileageSearch.toLowerCase()) ||
                              `${v.manufacturer || ''} ${v.model || ''}`.toLowerCase().includes(mileageSearch.toLowerCase())
                            ))
                            .map(v => {
                              const currentVal = v.currentMileageKm || 0
                              const entryVal = dailyMileages[v.id] !== undefined ? dailyMileages[v.id] : currentVal
                              const hasError = errors[v.id]
                              const isChanged = Number(entryVal) !== currentVal

                              return (
                                <tr key={v.id} style={{ borderBottom: `1px solid ${D.border}`, background: isChanged ? 'rgba(99,102,241,0.02)' : 'transparent' }}>
                                  <td style={{ padding: '16px 26px', fontSize: '0.92rem', fontWeight: 800, color: D.text }}>
                                    {v.registrationNo}
                                  </td>
                                  <td style={{ padding: '16px 26px', fontSize: '0.85rem', color: D.textSub }}>
                                    <span style={{ fontWeight: 600, color: D.text }}>{v.manufacturer} {v.model}</span>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: D.textFaint, marginTop: 2 }}>{v.vehicleType || '—'}</span>
                                  </td>
                                  <td style={{ padding: '16px 26px', fontSize: '0.85rem', color: D.textSub, fontWeight: 500 }}>
                                    {v.driverName || 'Unassigned'}
                                  </td>
                                  <td style={{ padding: '16px 26px', fontSize: '0.92rem', fontWeight: 800, color: D.text }}>
                                    {currentVal.toLocaleString()} km
                                  </td>
                                  <td style={{ padding: '16px 26px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 200 }}>
                                      <input
                                        type="number"
                                        value={entryVal === 0 ? '' : entryVal}
                                        placeholder={currentVal.toString()}
                                        onChange={e => {
                                          const val = e.target.value === '' ? 0 : Number(e.target.value)
                                          setDailyMileages(prev => ({ ...prev, [v.id]: val }))
                                          if (val >= currentVal && errors[v.id]) {
                                            setErrors(prev => ({ ...prev, [v.id]: undefined }))
                                          }
                                        }}
                                        style={{
                                          width: '100%', padding: '8px 12px',
                                          background: D.inputBg, border: `1px solid ${hasError ? '#ef4444' : isChanged ? 'rgba(99,102,241,0.6)' : D.inputBorder}`,
                                          borderRadius: 8, color: D.text, fontSize: '0.9rem', outline: 'none',
                                          boxShadow: isChanged ? '0 0 8px rgba(99,102,241,0.1)' : 'none'
                                        }}
                                      />
                                      {hasError && (
                                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                                          {hasError}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card list */}
                    <div className="mobile-view-only" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {allVehicles
                        .filter(v => !v.isDeleted && (
                          (v.registrationNo || '').toLowerCase().includes(mileageSearch.toLowerCase()) ||
                          `${v.manufacturer || ''} ${v.model || ''}`.toLowerCase().includes(mileageSearch.toLowerCase())
                        ))
                        .map(v => {
                          const currentVal = v.currentMileageKm || 0
                          const entryVal = dailyMileages[v.id] !== undefined ? dailyMileages[v.id] : currentVal
                          const hasError = errors[v.id]
                          const isChanged = Number(entryVal) !== currentVal

                          return (
                            <div key={v.id} style={{
                              background: D.surfaceHi,
                              border: `1px solid ${hasError ? '#ef4444' : isChanged ? 'rgba(99,102,241,0.4)' : D.border}`,
                              borderRadius: 16,
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                              boxShadow: isChanged ? '0 4px 12px rgba(99,102,241,0.08)' : 'none',
                              transition: 'all 0.2s ease'
                            }}>
                              {/* Row 1: Reg Number + Type */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: D.text }}>
                                  {v.registrationNo}
                                </span>
                                <span style={{
                                  fontSize: '0.7rem', fontWeight: 700,
                                  color: D.textSub, background: D.inputBg,
                                  padding: '4px 10px', borderRadius: 8,
                                  border: `1px solid ${D.border}`,
                                  textTransform: 'uppercase', letterSpacing: '0.04em'
                                }}>
                                  {v.vehicleType || 'Unknown'}
                                </span>
                              </div>

                              {/* Row 2: Details & Assignee */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: D.textSub }}>
                                <span>{v.manufacturer} {v.model}</span>
                                <span style={{ fontWeight: 600, color: v.driverName ? D.text : D.textFaint }}>
                                  Assignee: {v.driverName || 'Unassigned'}
                                </span>
                              </div>

                              {/* Row 3: Current Mileage vs New Entry */}
                              <div style={{
                                borderTop: `1px solid ${D.border}`,
                                paddingTop: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                  <span style={{ color: D.textFaint, fontWeight: 500 }}>Current Mileage:</span>
                                  <span style={{ fontWeight: 800, color: D.text }}>{currentVal.toLocaleString()} km</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <input
                                    type="number"
                                    value={entryVal === 0 ? '' : entryVal}
                                    placeholder={`New Mileage (min: ${currentVal})`}
                                    onChange={e => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                                      setDailyMileages(prev => ({ ...prev, [v.id]: val }))
                                      if (val >= currentVal && errors[v.id]) {
                                        setErrors(prev => ({ ...prev, [v.id]: undefined }))
                                      }
                                    }}
                                    style={{
                                      width: '100%', padding: '10px 12px',
                                      background: D.inputBg, border: `1px solid ${hasError ? '#ef4444' : isChanged ? 'rgba(99,102,241,0.6)' : D.inputBorder}`,
                                      borderRadius: 10, color: D.text, fontSize: '0.9rem', outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  {hasError && (
                                    <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: 2 }}>
                                      {hasError}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* ── Intervals Settings Tab ── */}
                {displayTab === 'intervals' && (
                  <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Header and save actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, background: D.surface, border: `1px solid ${D.border}`, padding: '18px 24px', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>
                          Service Intervals Configuration
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>
                          Configure default mileage interval thresholds (km) per service type for each vehicle type category
                        </p>
                      </div>
                      <button
                        onClick={handleSaveIntervals}
                        disabled={formLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '10px 20px', borderRadius: 12,
                          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                          color: '#fff', fontSize: '0.88rem', fontWeight: 800,
                          border: 'none', cursor: formLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                          opacity: formLoading ? 0.7 : 1
                        }}
                      >
                        {formLoading ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        ) : (
                          <CheckCircle size={15} />
                        )}
                        Save Configuration
                      </button>
                    </div>

                    {/* Grid of 4 categories: CAR, VAN, LORRY, BUS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                      {['CAR', 'VAN', 'LORRY', 'BUS'].map(vType => (
                        <div
                          key={vType}
                          style={{
                            background: D.surface, border: `1px solid ${D.border}`,
                            borderRadius: 16, padding: '20px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                            display: 'flex', flexDirection: 'column', gap: 16
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Car size={18} color="#a5b4fc" />
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>
                              {vType} Category
                            </h4>
                          </div>

                          <div style={{ height: 1, background: D.border }} />

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {SERVICE_TYPES.map(sType => {
                              const val = getIntervalValue(vType, sType.value)
                              return (
                                <div key={sType.value} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: D.textSub }}>
                                    {sType.label}
                                  </label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                      type="number"
                                      value={val === 0 ? '' : val}
                                      placeholder="0"
                                      onChange={e => handleIntervalChange(vType, sType.value, e.target.value)}
                                      style={{
                                        flex: 1, padding: '8px 10px',
                                        background: D.inputBg, border: `1px solid ${D.inputBorder}`,
                                        borderRadius: 8, color: D.text, fontSize: '0.85rem', outline: 'none'
                                      }}
                                    />
                                    <span style={{ fontSize: '0.78rem', color: D.textFaint, fontWeight: 600 }}>km</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Service History logs Tab ── */}
                {displayTab === 'history' && (
                  <>
                    {/* Service Alerts strip moved to top */}

                    {/* Assigned Vehicle Compliance Documents (Driver only) */}
                    {isDriver && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 20,
                        marginBottom: 26,
                        animation: 'fadeSlideUp 0.4s ease 0.2s both'
                      }}>
                        {myVehicle ? (
                          <>
                            {/* Compliance Card */}
                            <div style={{
                              background: D.surface,
                              border: `1px solid ${D.border}`,
                              borderRadius: 20,
                              padding: '24px 28px',
                              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 16
                            }}>
                              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>
                                Compliance & Expiries
                              </h3>
                              <p style={{ margin: '-10px 0 0', fontSize: '0.78rem', color: D.textSub }}>
                                Assigned Vehicle: {myVehicle.manufacturer} {myVehicle.model} ({myVehicle.registrationNo})
                              </p>

                              {/* Insurance Card */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: D.text }}>Insurance Expiry</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: D.textSub }}>
                                      {myVehicle.insuranceExpiryDate ? new Date(myVehicle.insuranceExpiryDate).toLocaleDateString() : 'Not Set'}
                                    </p>
                                  </div>
                                  {myVehicle.insuranceExpiryDate ? (() => {
                                    const diff = Math.ceil((new Date(myVehicle.insuranceExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                                    const isExpired = diff < 0
                                    const isExpiring = diff <= 30
                                    return (
                                      <span style={{
                                        background: isExpired ? 'rgba(239,68,68,0.15)' : isExpiring ? 'rgba(245,158,11,0.15)' : D.greenDim,
                                        color: isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : D.green,
                                        border: `1px solid ${isExpired ? '#ef444450' : isExpiring ? '#f59e0b50' : D.green + '50'}`,
                                        padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800
                                      }}>
                                        {isExpired ? 'Expired' : `${diff} days left`}
                                      </span>
                                    )
                                  })() : <span style={{ color: D.textFaint, fontSize: '0.75rem' }}>—</span>}
                                </div>
                                {myVehicle.insuranceExpiryDate ? (() => {
                                  const TOTAL_DAYS = 365
                                  const diff = Math.ceil((new Date(myVehicle.insuranceExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                                  const safePct = Math.max(0, Math.min(100, (diff / TOTAL_DAYS) * 100))
                                  const r = Math.round(239 - (239 - 16) * (safePct / 100))
                                  const g = Math.round(68 + (185 - 68) * (safePct / 100))
                                  const b = Math.round(68 + (129 - 68) * (safePct / 100))
                                  const barColor = diff < 0 ? '#ef4444' : `rgb(${r},${g},${b})`
                                  const displayPct = diff < 0 ? 100 : safePct
                                  return (
                                    <div>
                                      <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div style={{
                                          width: `${Math.min(displayPct, 100)}%`,
                                          height: '100%',
                                          background: barColor,
                                          borderRadius: 999,
                                          transition: 'width 0.6s ease, background 0.6s ease',
                                          boxShadow: `0 0 8px ${barColor}80`
                                        }} />
                                      </div>
                                    </div>
                                  )
                                })() : null}
                              </div>

                              {/* License Card */}
                              <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: D.text }}>License Expiry</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: D.textSub }}>
                                      {myVehicle.licenseExpiryDate ? new Date(myVehicle.licenseExpiryDate).toLocaleDateString() : 'Not Set'}
                                    </p>
                                  </div>
                                  {myVehicle.licenseExpiryDate ? (() => {
                                    const diff = Math.ceil((new Date(myVehicle.licenseExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                                    const isExpired = diff < 0
                                    const isExpiring = diff <= 30
                                    return (
                                      <span style={{
                                        background: isExpired ? 'rgba(239,68,68,0.15)' : isExpiring ? 'rgba(245,158,11,0.15)' : D.greenDim,
                                        color: isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : D.green,
                                        border: `1px solid ${isExpired ? '#ef444450' : isExpiring ? '#f59e0b50' : D.green + '50'}`,
                                        padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800
                                      }}>
                                        {isExpired ? 'Expired' : `${diff} days left`}
                                      </span>
                                    )
                                  })() : <span style={{ color: D.textFaint, fontSize: '0.75rem' }}>—</span>}
                                </div>
                                {myVehicle.licenseExpiryDate ? (() => {
                                  const TOTAL_DAYS = 365
                                  const diff = Math.ceil((new Date(myVehicle.licenseExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                                  const safePct = Math.max(0, Math.min(100, (diff / TOTAL_DAYS) * 100))
                                  const r = Math.round(239 - (239 - 16) * (safePct / 100))
                                  const g = Math.round(68 + (185 - 68) * (safePct / 100))
                                  const b = Math.round(68 + (129 - 68) * (safePct / 100))
                                  const barColor = diff < 0 ? '#ef4444' : `rgb(${r},${g},${b})`
                                  const displayPct = diff < 0 ? 100 : safePct
                                  return (
                                    <div>
                                      <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div style={{
                                          width: `${Math.min(displayPct, 100)}%`,
                                          height: '100%',
                                          background: barColor,
                                          borderRadius: 999,
                                          transition: 'width 0.6s ease, background 0.6s ease',
                                          boxShadow: `0 0 8px ${barColor}80`
                                        }} />
                                      </div>
                                    </div>
                                  )
                                })() : null}
                              </div>
                            </div>

                            {/* Original Documents Card */}
                            <div style={{
                              background: D.surface,
                              border: `1px solid ${D.border}`,
                              borderRadius: 20,
                              padding: '24px 28px',
                              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 16
                            }}>
                              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>
                                Original Documents & Papers
                              </h3>
                              <p style={{ margin: '-10px 0 0', fontSize: '0.78rem', color: D.textSub }}>
                                Click to download original papers
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                                {/* Insurance Doc */}
                                {(() => {
                                  const path = myVehicle.insuranceDocumentPath
                                  const originalFilename = path ? path.substring(path.lastIndexOf('_') + 1) : null
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: D.bg, padding: '12px 14px', borderRadius: 12, border: `1px solid ${D.border}` }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.text }}>Insurance Certificate</span>
                                        {path ? (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.green, background: D.greenDim, padding: '2px 6px', borderRadius: 4 }}>Uploaded</span>
                                        ) : (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub }}>No File</span>
                                        )}
                                      </div>
                                      {path && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                          <button
                                            onClick={() => downloadDocument(myVehicle.id, 'insurance', originalFilename)}
                                            style={{
                                              background: 'none', border: 'none', padding: 0, margin: 0,
                                              color: D.blue, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                                              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%'
                                            }}
                                          >
                                            <FileText size={13} /> {originalFilename}
                                          </button>
                                          <button
                                            onClick={() => downloadDocument(myVehicle.id, 'insurance', originalFilename)}
                                            style={{ background: D.indigoDim, color: D.indigo, border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                          >
                                            <Download size={11} /> Download
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}

                                {/* License Doc */}
                                {(() => {
                                  const path = myVehicle.licenseDocumentPath
                                  const originalFilename = path ? path.substring(path.lastIndexOf('_') + 1) : null
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: D.bg, padding: '12px 14px', borderRadius: 12, border: `1px solid ${D.border}` }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.text }}>License & Road Tax</span>
                                        {path ? (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.green, background: D.greenDim, padding: '2px 6px', borderRadius: 4 }}>Uploaded</span>
                                        ) : (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub }}>No File</span>
                                        )}
                                      </div>
                                      {path && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                          <button
                                            onClick={() => downloadDocument(myVehicle.id, 'license', originalFilename)}
                                            style={{
                                              background: 'none', border: 'none', padding: 0, margin: 0,
                                              color: D.blue, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                                              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%'
                                            }}
                                          >
                                            <FileText size={13} /> {originalFilename}
                                          </button>
                                          <button
                                            onClick={() => downloadDocument(myVehicle.id, 'license', originalFilename)}
                                            style={{ background: D.indigoDim, color: D.indigo, border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                          >
                                            <Download size={11} /> Download
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}

                                {/* Registration Book Doc */}
                                {(() => {
                                  const path = myVehicle.registrationBookPath
                                  const originalFilename = path ? path.substring(path.lastIndexOf('_') + 1) : null
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: D.bg, padding: '12px 14px', borderRadius: 12, border: `1px solid ${D.border}` }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.text }}>Registration Book (V5)</span>
                                        {path ? (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.green, background: D.greenDim, padding: '2px 6px', borderRadius: 4 }}>Uploaded</span>
                                        ) : (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub }}>No File</span>
                                        )}
                                      </div>
                                      {path && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                          <button
                                            onClick={() => downloadDocument(myVehicle.id, 'registration', originalFilename)}
                                            style={{
                                              background: 'none', border: 'none', padding: 0, margin: 0,
                                              color: D.blue, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                                              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%'
                                            }}
                                          >
                                            <FileText size={13} /> {originalFilename}
                                          </button>
                                          <button
                                            onClick={() => downloadDocument(myVehicle.id, 'registration', originalFilename)}
                                            style={{ background: D.indigoDim, color: D.indigo, border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                          >
                                            <Download size={11} /> Download
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{
                            gridColumn: '1 / -1',
                            background: D.surface,
                            border: `1px solid ${D.border}`,
                            borderRadius: 20,
                            padding: '24px 28px',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                            textAlign: 'center',
                            color: D.textSub,
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}>
                            No vehicle is currently selected or assigned. Please use the search bar at the top of the page to find and select a vehicle.
                          </div>
                        )}
                      </div>
                    )}

                    {/* MAIN WORK ORDERS DIRECTORY — Full Width */}
                    <div style={{
                      background: D.surface, border: `1px solid ${D.border}`,
                      borderRadius: 20, overflow: 'hidden',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                      animation: 'fadeSlideUp 0.4s ease 0.44s both',
                    }}>
                      {/* Table header zone */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        flexWrap: 'wrap', gap: 14,
                        padding: '22px 26px 18px',
                        borderBottom: `1px solid ${D.border}`,
                        background: D.surfaceHi,
                      }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>Work Orders</h3>
                          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: D.textSub }}>Filter, track and export service records</p>
                        </div>

                        {/* Status pill filters */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            { val: 'ALL', label: 'All', color: '#6366f1' },
                            { val: 'Open', label: 'Open', color: '#3b82f6' },
                            { val: 'In Progress', label: 'In Progress', color: '#fbbf24' },
                            { val: 'Overdue', label: 'Overdue', color: '#ef4444' },
                            { val: 'Completed', label: 'Done', color: '#10b981' },
                          ].map(t => {
                            const isSel = filter === t.val
                            return (
                              <button
                                key={t.val}
                                onClick={() => setFilter(t.val)}
                                style={{
                                  padding: '7px 18px', borderRadius: 999,
                                  fontSize: '0.85rem', fontWeight: 800,
                                  background: isSel ? `${t.color}1f` : 'transparent',
                                  color: isSel ? t.color : D.textSub,
                                  border: isSel ? `1.5px solid ${t.color}50` : `1.5px solid ${D.border}`,
                                  cursor: 'pointer', transition: 'all 0.18s ease',
                                  boxShadow: isSel ? `0 0 10px ${t.color}1f` : 'none',
                                }}
                              >
                                {t.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Search + Export */}
                       <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '14px 26px', borderBottom: `1px solid ${D.border}` }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.textSub, opacity: 0.8 }} />
                          <input
                            type="text"
                            id="service-search"
                            placeholder="Search vehicle, task, garage, date, cost…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                              width: '100%', padding: '12px 36px 12px 38px',
                              background: D.inputBg, border: `1px solid ${search ? 'rgba(99,102,241,0.4)' : D.inputBorder}`,
                              borderRadius: 14, color: D.text, fontSize: '0.95rem', outline: 'none',
                              boxSizing: 'border-box', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.08)'; e.target.style.background = D.surface }}
                            onBlur={e => { e.target.style.borderColor = search ? 'rgba(99,102,241,0.4)' : D.inputBorder; e.target.style.boxShadow = 'none'; e.target.style.background = D.inputBg }}
                          />
                          {search && (
                            <X size={16} onClick={() => setSearch('')}
                              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: D.textSub, cursor: 'pointer' }} />
                          )}
                        </div>

                        {/* Vehicle Filter Dropdown */}
                        <div style={{ position: 'relative', minWidth: 160 }}>
                          <select
                            value={vehicleFilter}
                            onChange={e => setVehicleFilter(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 28px 12px 14px',
                              background: D.inputBg,
                              border: `1px solid ${vehicleFilter !== 'ALL' ? 'rgba(99,102,241,0.4)' : D.inputBorder}`,
                              borderRadius: 14,
                              color: D.text,
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              outline: 'none',
                              cursor: 'pointer',
                              appearance: 'none',
                              fontFamily: "'Outfit', sans-serif",
                              boxSizing: 'border-box',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = D.surface }}
                            onBlur={e => { e.target.style.borderColor = vehicleFilter !== 'ALL' ? 'rgba(99,102,241,0.4)' : D.inputBorder; e.target.style.background = D.inputBg }}
                          >
                            <option value="ALL" style={{ background: D.surfaceHi, color: D.text }}>All Vehicles</option>
                            {allVehicles
                              .filter(v => !v.isDeleted)
                              .map(v => (
                                <option key={v.id} value={v.registrationNo} style={{ background: D.surfaceHi, color: D.text }}>
                                  {v.registrationNo}
                                </option>
                              ))}
                          </select>
                          <div style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: D.textSub,
                            fontSize: '0.8rem'
                          }}>
                            ▾
                          </div>
                        </div>

                        {/* View Switcher */}
                        <div style={{ display: 'flex', background: D.surfaceHi, border: `1px solid ${D.border}`, borderRadius: 10, padding: 2, gap: 2 }}>
                          <button
                            onClick={() => setViewMode('grid')}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              padding: '6px 12px', borderRadius: 8,
                              background: viewMode === 'grid' ? 'rgba(99,102,241,0.15)' : 'transparent',
                              border: 'none',
                              color: viewMode === 'grid' ? '#a5b4fc' : D.textSub,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            title="Card View"
                          >
                            <LayoutGrid size={15} />
                          </button>
                          <button
                            onClick={() => setViewMode('table')}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              padding: '6px 12px', borderRadius: 8,
                              background: viewMode === 'table' ? 'rgba(99,102,241,0.15)' : 'transparent',
                              border: 'none',
                              color: viewMode === 'table' ? '#a5b4fc' : D.textSub,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            title="Table View"
                          >
                            <List size={15} />
                          </button>
                        </div>

                        {!isDriver && (
                          <button
                            onClick={handleExportPDF}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '10px 18px', borderRadius: 12,
                              background: D.surfaceHi, border: `1px solid ${D.border}`,
                              color: D.text, fontSize: '0.88rem', fontWeight: 800,
                              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.28)'; e.currentTarget.style.color = '#a5b4fc' }}
                            onMouseLeave={e => { e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Export PDF
                          </button>
                        )}

                        {!isDriver && (
                          <button
                            onClick={() => setDeletedDrawer(true)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '10px 18px', borderRadius: 12,
                              background: D.surfaceHi, border: `1px solid ${D.border}`,
                              color: D.textSub, fontSize: '0.88rem', fontWeight: 800,
                              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.28)'; e.currentTarget.style.color = '#f87171' }}
                            onMouseLeave={e => { e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub }}
                          >
                            <Archive size={15} />
                            Deleted Records
                          </button>
                        )}
                      </div>

                      {/* Conditionally Render Table or Card Grid based on viewMode */}
                      {viewMode === 'grid' ? (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                          gap: 20,
                          padding: '24px 26px',
                          background: D.bg,
                        }}>
                          {loading ? (
                            [1, 2, 3, 4].map(i => (
                              <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, height: 260, animation: 'pulse 1.5s infinite' }} />
                            ))
                          ) : filtered.length === 0 ? (
                            <div style={{ padding: '56px 20px', textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 14, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <ClipboardList size={22} color={D.textSub} />
                                </div>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: D.textSub, fontWeight: 600 }}>No matching work orders</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: D.textFaint }}>Try adjusting your search or filter.</p>
                              </div>
                            </div>
                          ) : (
                            filtered.map((s, index) => {
                              const vc = allVehicles.find(v => v.registrationNo === s.vehicleRegNumber)
                              const vehicleCurrentKm = vc ? vc.currentMileageKm : 0
                              const isLatest = checkIsLatest(s, services)
                              return (
                                <ServiceGridCard
                                  key={s.id}
                                  record={s}
                                  index={index}
                                  isDriver={isDriver}
                                  isAdmin={isAdmin}
                                  currentUsername={user?.userName}
                                  vehicleCurrentKm={vehicleCurrentKm}
                                  isLatest={isLatest}
                                  onEdit={openEditModal}
                                  onDelete={confirmDelete}
                                  onView={(rec) => setDetailModal({ isOpen: true, record: rec })}
                                  onViewAttachment={handleViewAttachment}
                                  D={D}
                                />
                              )
                            })
                          )}
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: D.surfaceHi, borderBottom: `1px solid ${D.border}` }}>
                                {['Work Order', 'Vehicle', 'Task', 'Garage', 'Due Date', 'Cost', 'Status', 'Docs'].map(h => (
                                  <th key={h} style={{
                                    padding: '16px 26px', fontSize: '0.85rem', fontWeight: 800,
                                    color: D.textSub, letterSpacing: '0.07em', textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                [1, 2, 3, 4].map(i => (
                                  <tr key={i} style={{ borderBottom: `1px solid ${D.border}` }}>
                                    <td colSpan="8" style={{ padding: '20px 26px' }}>
                                      <div style={{ height: 16, background: D.surfaceHi, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                                    </td>
                                  </tr>
                                ))
                              ) : filtered.length === 0 ? (
                                <tr>
                                  <td colSpan="8" style={{ padding: '56px 20px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                      <div style={{ width: 48, height: 48, borderRadius: 14, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ClipboardList size={22} color={D.textSub} />
                                      </div>
                                      <p style={{ margin: 0, fontSize: '0.95rem', color: D.textSub, fontWeight: 600 }}>No matching work orders</p>
                                      <p style={{ margin: 0, fontSize: '0.8rem', color: D.textFaint }}>Try adjusting your search or filter.</p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                filtered.map((s, rowIdx) => {
                                  const status = getTableStatus(s)
                                  const stConfig = {
                                    Overdue: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', dot: '#ef4444' },
                                    'In Progress': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', dot: '#fbbf24' },
                                    Open: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', dot: '#3b82f6' },
                                    Completed: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', dot: '#10b981' },
                                  }[status] || { color: D.textSub, bg: 'rgba(255,255,255,0.05)', border: D.border, dot: D.textSub }

                                  const vc = allVehicles.find(v => v.registrationNo === s.vehicleRegNumber)
                                  const vehicleLabel = vc && (vc.manufacturer || vc.model)
                                    ? `${vc.manufacturer || ''} ${vc.model || ''}`.trim()
                                    : null

                                  return (
                                    <tr
                                      key={s.id}
                                      className="svc-row-hover"
                                      onClick={() => setDetailModal({ isOpen: true, record: s })}
                                      style={{
                                        borderBottom: `1px solid ${D.border}`,
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease',
                                        animation: `fadeUp 0.3s ease ${rowIdx * 0.03}s both`,
                                      }}
                                    >
                                      <td style={{ padding: '20px 26px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: stConfig.dot, boxShadow: `0 0 5px ${stConfig.dot}`, flexShrink: 0 }} />
                                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>WO-{s.id}</span>
                                        </div>
                                      </td>

                                      <td style={{ padding: '20px 26px' }}>
                                        <div>
                                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text }}>{s.vehicleRegNumber}</div>
                                          {vehicleLabel && <div style={{ fontSize: '0.8rem', color: D.textSub, marginTop: 2 }}>{vehicleLabel}</div>}
                                        </div>
                                      </td>

                                      <td style={{ padding: '20px 26px', maxWidth: 170 }}>
                                        <div>
                                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 155 }}>
                                            {s.serviceType?.replace(/_/g, ' ')}
                                          </div>
                                          {s.serviceTypeDetail && (
                                            <div style={{ fontSize: '0.8rem', color: D.textSub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 155 }}>
                                              {s.serviceTypeDetail}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      <td style={{ padding: '20px 26px', maxWidth: 130 }}>
                                        <span style={{ fontSize: '0.88rem', color: D.textSub, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                                          {s.technicianWorkshop || '—'}
                                        </span>
                                      </td>

                                      <td style={{ padding: '20px 26px', fontSize: '0.88rem', color: D.textSub, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {s.serviceDate ? s.serviceDate.substring(0, 10) : '—'}
                                      </td>

                                      <td style={{ padding: '20px 26px', fontSize: '0.92rem', fontWeight: 800, color: D.text, whiteSpace: 'nowrap' }}>
                                        LKR {Number(s.serviceCost || 0).toLocaleString()}
                                      </td>

                                      <td style={{ padding: '20px 26px' }}>
                                        <span style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 5,
                                          fontSize: '0.78rem', fontWeight: 800,
                                          padding: '4px 10px', borderRadius: 999,
                                          background: stConfig.bg, color: stConfig.color,
                                          border: `1px solid ${stConfig.border}`,
                                          whiteSpace: 'nowrap',
                                        }}>
                                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: stConfig.dot, flexShrink: 0 }} />
                                          {status}
                                        </span>
                                      </td>

                                      <td style={{ padding: '20px 26px' }} onClick={e => e.stopPropagation()}>
                                        {s.attachmentPath ? (
                                          <button
                                            onClick={() => handleViewAttachment(s)}
                                            style={{
                                              display: 'inline-flex', alignItems: 'center', gap: 5,
                                              padding: '6px 12px',
                                              background: 'rgba(52,211,153,0.1)', color: '#34d399',
                                              border: '1px solid rgba(52,211,153,0.22)',
                                              borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                                              cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.22)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)' }}
                                          >
                                            <Paperclip size={12} /> View
                                          </button>
                                        ) : (
                                          !isDriver && !isAdmin ? (
                                            <button
                                              onClick={() => openEditModal(s.id)}
                                              style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '6px 12px',
                                                background: D.surfaceHi, border: `1px solid ${D.border}`,
                                                color: D.textSub, borderRadius: 8,
                                                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                                transition: 'all 0.15s',
                                              }}
                                              onMouseEnter={e => { e.currentTarget.style.color = D.text; e.currentTarget.style.borderColor = D.borderHi }}
                                              onMouseLeave={e => { e.currentTarget.style.color = D.textSub; e.currentTarget.style.borderColor = D.border }}
                                            >
                                              <Paperclip size={12} /> Attach
                                            </button>
                                          ) : (
                                            <span style={{ fontSize: '0.82rem', color: D.textFaint }}>—</span>
                                          )
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )
          })()}


        </div>{/* end page-body */}
      </div>{/* end main-content */}


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
                [1, 2, 3].map(i => (
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
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
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
                          ['Classification', r.serviceClassification === 'AD_HOC' ? '🛠️ Ad-hoc Repair / Breakdown' : '🟢 Routine Maintenance'],
                          r.nextServiceDue ? ['Next Service Due', new Date(r.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })] : null,
                          r.nextServiceMileageKm ? ['Next Service Mileage', `${Number(r.nextServiceMileageKm).toLocaleString()} km`] : null,
                        ].filter(Boolean).map(([label, value]) => (
                          <div key={label}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: value ? D.text : D.textSub }}>{value || '—'}</div>
                          </div>
                        ))}
                      </div>

                      {/* Parts Replaced */}
                      {r.partsReplaced && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            Parts Replaced <div style={{ flex: 1, height: 1, background: D.border }} />
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {r.partsReplaced.split(',').map((part, pi) => (
                              <span key={pi} style={{
                                background: D.surfaceHi, border: `1px solid ${D.border}`,
                                color: D.text, borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600
                              }}>
                                {part.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

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
                              <Calendar size={12} /> {r.serviceDate.substring(0, 10)}
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
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
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
        const visibleHistory = showAllEdits ? serviceHistory : serviceHistory.slice(0, 1)
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
              <div style={{ background: 'linear-gradient(135deg,#172554 0%,#1e3a8a 50%,#1e40af 100%)', padding: '22px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
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
                    <div style={{ color: '#60a5fa', fontSize: '0.85rem', marginTop: 4 }}>
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
                    ['Classification', r.serviceClassification === 'AD_HOC' ? '🛠️ Ad-hoc Repair / Breakdown' : '🟢 Routine Maintenance'],
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

                {/* Parts Replaced */}
                {r.partsReplaced && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Parts Replaced</span>
                      <div style={{ flex: 1, height: 1, background: D.border }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {r.partsReplaced.split(',').map((part, pi) => (
                        <span key={pi} style={{
                          background: D.surfaceHi, border: `1px solid ${D.border}`,
                          color: D.text, borderRadius: 8, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600
                        }}>
                          {part.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Bill Section */}
                {r.attachmentPath && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Document Attachment</span>
                      <div style={{ flex: 1, height: 1, background: D.border }} />
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: D.surfaceHi, border: `1px solid ${D.border}`,
                      borderRadius: 12, padding: '12px 18px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: 'rgba(16,185,129,0.1)',
                          border: '1px solid rgba(16,185,129,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#10b981'
                        }}>
                          <Paperclip size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: D.text }}>Service Bill / Invoice</div>
                          <div style={{ fontSize: '0.72rem', color: D.textSub }}>
                            {(() => {
                              const path = r.attachmentPath || '';
                              let filename = path.substring(path.lastIndexOf('/') + 1);
                              if (filename.length > 37 && filename.substring(8, 9) === '-' && filename.substring(13, 14) === '-') {
                                return filename.substring(37);
                              }
                              return filename || 'bill_document';
                            })()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAttachment(r)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 16px', borderRadius: 8, fontSize: '0.78rem',
                          fontWeight: 700, background: '#10b981', color: '#fff',
                          border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'translateY(0)' }}
                      >
                        <Eye size={14} /> View Bill
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Record Activity & Change History ───────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Record Activity</span>
                  <div style={{ flex: 1, height: 1, background: D.border }} />
                  {r.attachmentPath && (
                    <button
                      onClick={() => handleViewAttachment(r)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem',
                        color: '#10b981', background: 'rgba(16,185,129,0.1)',
                        padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.3)',
                        cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.color = '#10b981' }}
                    >
                      <Eye size={12} /> View Attached Bill
                    </button>
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
                    // Render each edit from newest → oldest (limited by default)
                    <>
                      {visibleHistory.map((entry, idx) => {
                        let fields = []
                        try { fields = JSON.parse(entry.changedFields || '[]') } catch (e) { /* ignore */ }
                        return (
                          <div key={entry.id} style={{ position: 'relative', marginBottom: idx < visibleHistory.length - 1 ? 14 : 4 }}>
                            {/* Timeline dot */}
                            <div style={{ position: 'absolute', left: -28, top: 6, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px ' + D.bg }}>
                              <Edit2 size={8} color="#fff" />
                            </div>

                            <div style={{ background: D.surfaceHi, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid #2563eb' }}>
                              {/* Edit header */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edited</span>
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
                      })}

                      {serviceHistory.length > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: 8 }}>
                          <button
                            onClick={() => setShowAllEdits(!showAllEdits)}
                            style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#a5b4fc',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)' }}
                          >
                            {showAllEdits ? 'Show Less ▴' : `Show all edits (${serviceHistory.length}) ▾`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 28px', borderTop: `1px solid ${D.border}`, display: 'flex', gap: 10, background: D.surfaceHi, flexShrink: 0 }}>
                 {/* Controller & Admin: show Edit + Delete */}
                 {!isDriver && !r._isPseudo && (
                   <>
                     <button
                       onClick={() => { closeDetail(); openEditModal(r.id) }}
                       style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(37, 99, 235,0.35)' }}
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
                 {/* Driver: only show Edit if they created this record */}
                 {isDriver && !r._isPseudo && r.createdBy === user?.userName && (
                   <button
                     onClick={() => { closeDetail(); openEditModal(r.id) }}
                     style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(37, 99, 235,0.35)' }}
                   >
                     <Edit2 size={15} /> Edit Record
                   </button>
                 )}
                 {r._isPseudo && (
                   <button
                     onClick={() => { closeDetail(); openAddModal({ vehicleRegNumber: r.vehicleRegNumber, serviceType: r.serviceType }) }}
                     style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(37, 99, 235,0.35)' }}
                   >
                     <Wrench size={15} /> Log Completed Service
                   </button>
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
          <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 640, maxHeight: '92vh', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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

            <form onSubmit={handleAddSubmit} style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Vehicle & Service Details</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* ── Custom Vehicle Selector (Add) ── */}
                <div style={{ position: 'relative' }} ref={vehicleSearchRef}>
                  <label style={fieldLabel}>Vehicle (License Plate) <span style={{ color: D.red }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Car size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.blue, pointerEvents: 'none', zIndex: 2, opacity: 0.8 }} />
                    <input
                      type="text"
                      value={vehicleSearch}
                      onChange={e => {
                        setVehicleSearch(e.target.value)
                        setVehicleDropdownVisible(true)
                        const match = allVehicles.find(v => (v.registrationNo || '').toLowerCase() === e.target.value.toLowerCase())
                        if (!match) {
                          setFormData(prev => ({ ...prev, vehicleRegNumber: '' }))
                          setPreviousMileage(null)
                        } else {
                          handleVehicleSelect({ target: { value: match.registrationNo } }, false)
                        }
                      }}
                      onFocus={() => setVehicleDropdownVisible(true)}
                      onBlur={e => { setTimeout(() => setVehicleDropdownVisible(false), 180); blurBorder(e, errors.vehicleRegNumber) }}
                      placeholder="Search or select vehicle…"
                      autoComplete="off"
                      style={{ ...fieldInput(errors.vehicleRegNumber), paddingLeft: 34, paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setVehicleDropdownVisible(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, display: 'flex', alignItems: 'center', padding: 2, zIndex: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: vehicleDropdownVisible ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </div>
                  {vehicleDropdownVisible && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                      background: D.surface, border: `1px solid ${D.borderHi}`,
                      borderRadius: 10, marginTop: 4,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                      overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
                    }}>
                      {(() => {
                        const q = vehicleSearch.toLowerCase()
                        const opts = allVehicles.filter(v =>
                          (v.registrationNo || '').toLowerCase().includes(q) ||
                          `${v.manufacturer || ''} ${v.model || ''}`.toLowerCase().includes(q)
                        )
                        if (opts.length === 0) return (
                          <div style={{ padding: '12px 16px', fontSize: '0.82rem', color: D.textSub, textAlign: 'center' }}>No vehicles found</div>
                        )
                        return opts.map(v => {
                          const isSelected = formData.vehicleRegNumber === v.registrationNo
                          const label = v.manufacturer || v.model
                            ? `${v.registrationNo} - ${v.manufacturer || ''} ${v.model || ''}`.trim()
                            : v.registrationNo
                          return (
                            <div
                              key={v.id}
                              onMouseDown={e => {
                                e.preventDefault()
                                setVehicleSearch(v.registrationNo)
                                setVehicleDropdownVisible(false)
                                handleVehicleSelect({ target: { value: v.registrationNo } }, false)
                              }}
                              style={{
                                padding: '10px 16px', cursor: 'pointer',
                                background: isSelected ? '#2563eb' : 'transparent',
                                color: isSelected ? '#ffffff' : D.text,
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                transition: 'all 0.1s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#2563eb'
                                e.currentTarget.style.color = '#ffffff'
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent'
                                  e.currentTarget.style.color = D.text
                                }
                              }}
                            >
                              {label}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
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
                  <input type="date" name="serviceDate" value={formData.serviceDate} onChange={handleAddChange} max={new Date().toISOString().split('T')[0]} style={fieldInput(errors.serviceDate)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceDate)} />
                  {errors.serviceDate && <p style={fieldError}>{errors.serviceDate}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                  <input type="number" name="currentMileageKm" value={formData.currentMileageKm} onChange={e => handleMileageChange(e, false)} placeholder="e.g. 45000" style={fieldInput(errors.currentMileageKm)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.currentMileageKm)} />
                  {errors.currentMileageKm ? (
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.red, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>⚠ {errors.currentMileageKm}</p>
                  ) : previousMileage != null && (
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.textFaint, fontWeight: 600 }}>Last reading: <span style={{ color: D.purple }}>{previousMileage.toLocaleString()} km</span></p>
                  )}
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Service Classification</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, serviceClassification: 'ROUTINE' }))}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8,
                        border: `1.5px solid ${formData.serviceClassification === 'ROUTINE' ? '#10b981' : D.inputBorder}`,
                        background: formData.serviceClassification === 'ROUTINE' ? 'rgba(16,185,129,0.1)' : D.inputBg,
                        color: formData.serviceClassification === 'ROUTINE' ? '#10b981' : D.textSub,
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <CheckCircle size={15} /> 🟢 Routine Maintenance
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, serviceClassification: 'AD_HOC' }))}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8,
                        border: `1.5px solid ${formData.serviceClassification === 'AD_HOC' ? '#ef4444' : D.inputBorder}`,
                        background: formData.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.1)' : D.inputBg,
                        color: formData.serviceClassification === 'AD_HOC' ? '#ef4444' : D.textSub,
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <AlertTriangle size={15} /> ⚠️ Ad-hoc Repair / Breakdown
                    </button>
                  </div>
                </div>

                {/* ── Driver Selector (Add) ── */}
                <div>
                  <label style={fieldLabel}><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={13} /> Driver <span style={{ color: D.textSub, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></span></label>
                  <select
                    name="driverUsername"
                    value={formData.driverUsername || ''}
                    onChange={handleAddChange}
                    style={{ ...fieldInput(false), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '18px', paddingRight: 38 }}
                    onFocus={focusBorder} onBlur={e => blurBorder(e, false)}
                  >
                    <option value="">No driver assigned</option>
                    {allDrivers.map(d => (
                      <option key={d.id || d.userName} value={d.userName}>
                        {d.firstName && d.lastName ? `${d.firstName} ${d.lastName} (${d.userName})` : d.userName}
                      </option>
                    ))}
                  </select>
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
                <button type="submit" disabled={formLoading} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: formLoading ? 'rgba(37, 99, 235,0.6)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: formLoading ? 'none' : '0 4px 16px rgba(37, 99, 235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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

      {/* ── Schedule Modal ───────────────────────────────────────────── */}
      {isScheduleModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
          <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 640, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: D.indigoDim, color: D.indigo, border: `1px solid ${D.indigo}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Schedule Future Service</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: D.textSub }}>Set a reminder or trigger-point for next service.</p>
                </div>
              </div>
              <button onClick={closeScheduleModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            {submitError && (
              <div style={{ margin: '20px 28px 0', background: D.redDim, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 16px', color: D.red, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} /> {submitError}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Schedule Criteria</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* ── Custom Vehicle Selector (Schedule) ── */}
                <div style={{ position: 'relative' }} ref={scheduleVehicleSearchRef}>
                  <label style={fieldLabel}>Vehicle (License Plate) <span style={{ color: D.red }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Car size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.blue, pointerEvents: 'none', zIndex: 2, opacity: 0.8 }} />
                    <input
                      type="text"
                      value={scheduleVehicleSearch}
                      onChange={e => {
                        setScheduleVehicleSearch(e.target.value)
                        setScheduleVehicleDropdownVisible(true)
                        const match = allVehicles.find(v => (v.registrationNo || '').toLowerCase() === e.target.value.toLowerCase())
                        if (match) {
                          setScheduleFormData(prev => ({ ...prev, vehicleRegNumber: match.registrationNo }))
                          if (scheduleErrors.vehicleRegNumber) setScheduleErrors(prev => ({ ...prev, vehicleRegNumber: undefined }))
                        } else {
                          setScheduleFormData(prev => ({ ...prev, vehicleRegNumber: '' }))
                        }
                      }}
                      onFocus={() => setScheduleVehicleDropdownVisible(true)}
                      onBlur={e => { setTimeout(() => setScheduleVehicleDropdownVisible(false), 180); blurBorder(e, scheduleErrors.vehicleRegNumber) }}
                      placeholder="Search or select vehicle…"
                      autoComplete="off"
                      style={{ ...fieldInput(scheduleErrors.vehicleRegNumber), paddingLeft: 34, paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setScheduleVehicleDropdownVisible(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, display: 'flex', alignItems: 'center', padding: 2, zIndex: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: scheduleVehicleDropdownVisible ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </div>
                  {scheduleVehicleDropdownVisible && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                      background: D.surface, border: `1px solid ${D.borderHi}`,
                      borderRadius: 10, marginTop: 4,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                      overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
                    }}>
                      {(() => {
                        const q = scheduleVehicleSearch.toLowerCase()
                        const opts = allVehicles.filter(v =>
                          (v.registrationNo || '').toLowerCase().includes(q) ||
                          `${v.manufacturer || ''} ${v.model || ''}`.toLowerCase().includes(q)
                        )
                        if (opts.length === 0) return (
                          <div style={{ padding: '12px 16px', fontSize: '0.82rem', color: D.textSub, textAlign: 'center' }}>No vehicles found</div>
                        )
                        return opts.map(v => {
                          const isSelected = scheduleFormData.vehicleRegNumber === v.registrationNo
                          const label = v.manufacturer || v.model
                            ? `${v.registrationNo} - ${v.manufacturer || ''} ${v.model || ''}`.trim()
                            : v.registrationNo
                          return (
                            <div
                              key={v.id}
                              onMouseDown={e => {
                                e.preventDefault()
                                setScheduleVehicleSearch(v.registrationNo)
                                setScheduleVehicleDropdownVisible(false)
                                setScheduleFormData(prev => ({ ...prev, vehicleRegNumber: v.registrationNo }))
                                if (scheduleErrors.vehicleRegNumber) setScheduleErrors(prev => ({ ...prev, vehicleRegNumber: undefined }))
                              }}
                              style={{
                                padding: '10px 16px', cursor: 'pointer',
                                background: isSelected ? '#2563eb' : 'transparent',
                                color: isSelected ? '#ffffff' : D.text,
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                transition: 'all 0.1s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#2563eb'
                                e.currentTarget.style.color = '#ffffff'
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent'
                                  e.currentTarget.style.color = D.text
                                }
                              }}
                            >
                              {label}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                  {scheduleErrors.vehicleRegNumber && <p style={fieldError}>{scheduleErrors.vehicleRegNumber}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Service Type <span style={{ color: D.red }}>*</span></label>
                  <select name="serviceType" value={scheduleFormData.serviceType} onChange={handleScheduleChange} style={{ ...fieldInput(scheduleErrors.serviceType), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '18px', paddingRight: 38 }} onFocus={focusBorder} onBlur={e => blurBorder(e, scheduleErrors.serviceType)}>
                    <option value="" disabled style={{ background: D.surfaceHi }}>Select service type</option>
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: D.surfaceHi }}>{t.label}</option>)}
                  </select>
                  {scheduleErrors.serviceType && <p style={fieldError}>{scheduleErrors.serviceType}</p>}
                </div>

                {scheduleFormData.serviceType === 'OTHER' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={fieldLabel}>Service Type Detail <span style={{ color: D.red }}>*</span></label>
                    <input type="text" name="serviceTypeDetail" value={scheduleFormData.serviceTypeDetail} onChange={handleScheduleChange} placeholder="Describe the service…" style={fieldInput(scheduleErrors.serviceTypeDetail)} onFocus={focusBorder} onBlur={e => blurBorder(e, scheduleErrors.serviceTypeDetail)} />
                    {scheduleErrors.serviceTypeDetail && <p style={fieldError}>{scheduleErrors.serviceTypeDetail}</p>}
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Scheduling Mode</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['date', 'mileage', 'both'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setScheduleFormData(prev => ({ ...prev, scheduleMode: mode }))
                          // Clear dynamic validation errors on mode change
                          setScheduleErrors(prev => ({ ...prev, scheduledDate: undefined, targetMileageKm: undefined }))
                        }}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10,
                          border: `1.5px solid ${scheduleFormData.scheduleMode === mode ? D.indigo : D.border}`,
                          background: scheduleFormData.scheduleMode === mode ? D.indigoDim : 'transparent',
                          color: scheduleFormData.scheduleMode === mode ? D.indigo : D.textSub,
                          fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        {mode === 'date' ? '📅 By Date' : mode === 'mileage' ? '🛣️ By Mileage' : '🔄 Both (Whichever first)'}
                      </button>
                    ))}
                  </div>
                </div>

                {(scheduleFormData.scheduleMode === 'date' || scheduleFormData.scheduleMode === 'both') && (
                  <div>
                    <label style={fieldLabel}>Scheduled Due Date <span style={{ color: D.red }}>*</span></label>
                    <input type="date" name="scheduledDate" value={scheduleFormData.scheduledDate} onChange={handleScheduleChange} style={fieldInput(scheduleErrors.scheduledDate)} onFocus={focusBorder} onBlur={e => blurBorder(e, scheduleErrors.scheduledDate)} />
                    {scheduleErrors.scheduledDate && <p style={fieldError}>{scheduleErrors.scheduledDate}</p>}
                  </div>
                )}

                {(scheduleFormData.scheduleMode === 'mileage' || scheduleFormData.scheduleMode === 'both') && (
                  <div>
                    <label style={fieldLabel}>Target Mileage (km) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="targetMileageKm" value={scheduleFormData.targetMileageKm} onChange={handleScheduleChange} placeholder="e.g. 55000" style={fieldInput(scheduleErrors.targetMileageKm)} onFocus={focusBorder} onBlur={e => blurBorder(e, scheduleErrors.targetMileageKm)} />
                    {scheduleErrors.targetMileageKm ? (
                      <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.red, fontWeight: 800 }}>⚠ {scheduleErrors.targetMileageKm}</p>
                    ) : (() => {
                      const vObj = allVehicles.find(v => v.registrationNo === scheduleFormData.vehicleRegNumber)
                      if (!vObj?.currentMileageKm) return null
                      return <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.textFaint, fontWeight: 600 }}>Vehicle's current: <span style={{ color: D.purple }}>{vObj.currentMileageKm.toLocaleString()} km</span></p>
                    })()}
                  </div>
                )}
                {/* ── Driver Selector (Schedule) ── */}
                <div>
                  <label style={fieldLabel}><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={13} /> Driver <span style={{ color: D.textSub, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></span></label>
                  <select
                    name="driverUsername"
                    value={scheduleFormData.driverUsername || ''}
                    onChange={handleScheduleChange}
                    style={{ ...fieldInput(false), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '18px', paddingRight: 38 }}
                    onFocus={focusBorder} onBlur={e => blurBorder(e, false)}
                  >
                    <option value="">No driver assigned</option>
                    {allDrivers.map(d => (
                      <option key={d.id || d.userName} value={d.userName}>
                        {d.firstName && d.lastName ? `${d.firstName} ${d.lastName} (${d.userName})` : d.userName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Optional Estimations</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div>
                  <label style={fieldLabel}>Estimated Cost (Rs.)</label>
                  <input type="number" name="estimatedCost" value={scheduleFormData.estimatedCost} onChange={handleScheduleChange} placeholder="e.g. 10000" style={fieldInput(false)} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                <div>
                  <label style={fieldLabel}>Preferred Workshop</label>
                  <input type="text" name="preferredWorkshop" value={scheduleFormData.preferredWorkshop} onChange={handleScheduleChange} placeholder="e.g. SpeedBay Center" style={fieldInput(false)} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Scheduling Notes / Notes</label>
                  <textarea name="description" value={scheduleFormData.description} onChange={handleScheduleChange} rows={2} placeholder="Add any details about this scheduled work…" style={{ ...fieldInput(false), resize: 'none', lineHeight: 1.5 }} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={formLoading} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: formLoading ? 'rgba(37, 99, 235,0.6)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: formLoading ? 'none' : '0 4px 16px rgba(37, 99, 235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {formLoading ? 'Scheduling...' : <><Check size={16} /> Schedule Service</>}
                </button>
                <button type="button" onClick={closeScheduleModal} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
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
          <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 640, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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

            <form onSubmit={handleEditSubmit} style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Vehicle & Service Details</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* ── Custom Vehicle Selector (Edit) ── */}
                <div style={{ position: 'relative' }} ref={editVehicleSearchRef}>
                  <label style={fieldLabel}>Vehicle (License Plate) <span style={{ color: D.red }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Car size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.blue, pointerEvents: 'none', zIndex: 2, opacity: 0.8 }} />
                    <input
                      type="text"
                      value={editVehicleSearch}
                      onChange={e => {
                        setEditVehicleSearch(e.target.value)
                        setEditVehicleDropdownVisible(true)
                        const match = allVehicles.find(v => (v.registrationNo || '').toLowerCase() === e.target.value.toLowerCase())
                        if (match) {
                          handleVehicleSelect({ target: { value: match.registrationNo } }, true)
                        } else {
                          setEditFormData(prev => ({ ...prev, vehicleRegNumber: '' }))
                          setPreviousMileage(null)
                        }
                      }}
                      onFocus={() => setEditVehicleDropdownVisible(true)}
                      onBlur={e => { setTimeout(() => setEditVehicleDropdownVisible(false), 180); blurBorder(e, errors.vehicleRegNumber) }}
                      placeholder="Search or select vehicle…"
                      autoComplete="off"
                      style={{ ...fieldInput(errors.vehicleRegNumber), paddingLeft: 34, paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setEditVehicleDropdownVisible(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, display: 'flex', alignItems: 'center', padding: 2, zIndex: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: editVehicleDropdownVisible ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </div>
                  {editVehicleDropdownVisible && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                      background: D.surface, border: `1px solid ${D.borderHi}`,
                      borderRadius: 10, marginTop: 4,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                      overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
                    }}>
                      {(() => {
                        const q = editVehicleSearch.toLowerCase()
                        const opts = allVehicles.filter(v =>
                          (v.registrationNo || '').toLowerCase().includes(q) ||
                          `${v.manufacturer || ''} ${v.model || ''}`.toLowerCase().includes(q)
                        )
                        if (opts.length === 0) return (
                          <div style={{ padding: '12px 16px', fontSize: '0.82rem', color: D.textSub, textAlign: 'center' }}>No vehicles found</div>
                        )
                        return opts.map(v => {
                          const isSelected = editFormData.vehicleRegNumber === v.registrationNo
                          const label = v.manufacturer || v.model
                            ? `${v.registrationNo} - ${v.manufacturer || ''} ${v.model || ''}`.trim()
                            : v.registrationNo
                          return (
                            <div
                              key={v.id}
                              onMouseDown={e => {
                                e.preventDefault()
                                setEditVehicleSearch(v.registrationNo)
                                setEditVehicleDropdownVisible(false)
                                handleVehicleSelect({ target: { value: v.registrationNo } }, true)
                              }}
                              style={{
                                padding: '10px 16px', cursor: 'pointer',
                                background: isSelected ? '#2563eb' : 'transparent',
                                color: isSelected ? '#ffffff' : D.text,
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                transition: 'all 0.1s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#2563eb'
                                e.currentTarget.style.color = '#ffffff'
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent'
                                  e.currentTarget.style.color = D.text
                                }
                              }}
                            >
                              {label}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
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
                  <input type="date" name="serviceDate" value={editFormData.serviceDate} onChange={handleEditChange} max={new Date().toISOString().split('T')[0]} style={fieldInput(errors.serviceDate)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.serviceDate)} />
                  {errors.serviceDate && <p style={fieldError}>{errors.serviceDate}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                  <input type="number" name="currentMileageKm" value={editFormData.currentMileageKm} onChange={e => handleMileageChange(e, true)} placeholder="e.g. 45000" style={fieldInput(errors.currentMileageKm)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.currentMileageKm)} />
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Service Classification</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, serviceClassification: 'ROUTINE' }))}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8,
                        border: `1.5px solid ${editFormData.serviceClassification === 'ROUTINE' ? '#10b981' : D.inputBorder}`,
                        background: editFormData.serviceClassification === 'ROUTINE' ? 'rgba(16,185,129,0.1)' : D.inputBg,
                        color: editFormData.serviceClassification === 'ROUTINE' ? '#10b981' : D.textSub,
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <CheckCircle size={15} /> 🟢 Routine Maintenance
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, serviceClassification: 'AD_HOC' }))}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8,
                        border: `1.5px solid ${editFormData.serviceClassification === 'AD_HOC' ? '#ef4444' : D.inputBorder}`,
                        background: editFormData.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.1)' : D.inputBg,
                        color: editFormData.serviceClassification === 'AD_HOC' ? '#ef4444' : D.textSub,
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <AlertTriangle size={15} /> ⚠️ Ad-hoc Repair / Breakdown
                    </button>
                  </div>
                </div>
                {/* ── Driver Selector (Edit) ── */}
                <div>
                  <label style={fieldLabel}><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={13} /> Driver <span style={{ color: D.textSub, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></span></label>
                  <select
                    name="driverUsername"
                    value={editFormData.driverUsername || ''}
                    onChange={handleEditChange}
                    style={{ ...fieldInput(false), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '18px', paddingRight: 38 }}
                    onFocus={focusBorder} onBlur={e => blurBorder(e, false)}
                  >
                    <option value="">No driver assigned</option>
                    {allDrivers.map(d => (
                      <option key={d.id || d.userName} value={d.userName}>
                        {d.firstName && d.lastName ? `${d.firstName} ${d.lastName} (${d.userName})` : d.userName}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Parts Replaced (comma-separated)</label>
                  <textarea name="partsReplaced" value={editFormData.partsReplaced} onChange={handleEditChange} rows={2} placeholder="e.g. Oil Filter, Air Filter, Brake Pads" style={{ ...fieldInput(false), resize: 'none', lineHeight: 1.5 }} onFocus={focusBorder} onBlur={e => blurBorder(e, false)} />
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
                <button type="submit" disabled={formLoading} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: formLoading ? 'rgba(37, 99, 235,0.6)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: formLoading ? 'none' : '0 4px 16px rgba(37, 99, 235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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

      {/* ── Attachment Lightbox Modal ─────────────────────────────────── */}
      {attachmentViewer.isOpen && (
        <div
          onClick={() => setAttachmentViewer(prev => ({ ...prev, isOpen: false }))}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Header controls */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 24, left: 24, right: 24,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              color: '#fff', zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Paperclip size={18} color="#10b981" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Attached Bill
                </h4>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                  {attachmentViewer.filename}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {/* Download button */}
              <a
                href={attachmentViewer.url}
                download={attachmentViewer.filename}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, color: '#fff', padding: '8px 16px', fontSize: '0.8rem',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: 6, textDecoration: 'none', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                Download
              </a>
              {/* Close button */}
              <button
                onClick={() => setAttachmentViewer(prev => ({ ...prev, isOpen: false }))}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, color: '#fff', padding: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', height: '100%',
              maxWidth: '85vw', maxHeight: '75vh', marginTop: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <img
              src={attachmentViewer.url}
              alt="Bill Attachment"
              style={{
                maxWidth: '100%', maxHeight: '100%', borderRadius: 16,
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                objectFit: 'contain', background: '#000',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Global Loading Spinner overlay for fetching attachment ── */}
      {attachmentViewer.loading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(3px)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.1s ease'
        }}>
          <div style={{
            background: D.surface, border: `1px solid ${D.border}`,
            borderRadius: 16, padding: '24px 32px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 12,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#10b981', animation: 'spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: D.text }}>Retrieving attachment...</span>
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
