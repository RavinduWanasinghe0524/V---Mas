import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { serviceAPI, vehicleAPI, notificationAPI, userAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { addControllerNotification, addDriverNotification } from '../services/notificationService'
import { computeMileageProgress, computeDateAlert, getAlertLevel, ALERT_COLORS, fmtKmRemaining, fmtDaysRemaining } from '../utils/serviceAlertUtils'
import { Settings, Droplet, Circle, RotateCcw, Thermometer, Battery, Search, Wrench, Car, Calendar, MapPin, Edit2, Trash2, ClipboardList, CheckCircle, CircleDollarSign, X, Check, AlertTriangle, Paperclip, User, Eye, Archive, Clock, Gauge, BellRing, MoreVertical, ShieldAlert, Wallet, Sparkles } from 'lucide-react'
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
  OIL_CHANGE:           { intervalKm: 5000,  intervalMonths: 3 },
  ENGINE_TUNE_UP:       { intervalKm: 10000, intervalMonths: 6 },
  BRAKE_SERVICE:        { intervalKm: 20000, intervalMonths: 12 },
  TIRE_ROTATION:        { intervalKm: 10000, intervalMonths: 6 },
  TRANSMISSION_SERVICE: { intervalKm: 40000, intervalMonths: 24 },
  AC_SERVICE:           { intervalKm: 20000, intervalMonths: 12 },
  BATTERY_REPLACEMENT:  { intervalKm: 60000, intervalMonths: 36 },
  GENERAL_INSPECTION:   { intervalKm: 10000, intervalMonths: 6 },
  OTHER:                { intervalKm: 5000,  intervalMonths: 3 }
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
  const date    = computeDateAlert(record)

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

  const overdue  = alertRecords.filter(r => r._alertLevel === 'OVERDUE')
  const dueSoon  = alertRecords.filter(r => r._alertLevel === 'DUE_SOON')

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
          const date    = computeDateAlert(r)
          
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

  // Drivers may edit only records they personally created; Admin is view-only
  const canEdit = !isDriver && !isAdmin || (!isAdmin && record.createdBy === currentUsername)

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
          {/* Classification badge */}
          <span style={{
            padding: '2px 10px', borderRadius: 999,
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: record.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            color: record.serviceClassification === 'AD_HOC' ? '#ef4444' : '#10b981',
            border: `1px solid ${record.serviceClassification === 'AD_HOC' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
          }}>
            {record.serviceClassification === 'AD_HOC' ? '🛠️ Ad-hoc Repair' : '🟢 Routine'}
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
            <span 
              onClick={e => { e.stopPropagation(); onViewAttachment(record) }}
              title="Click to view attached bill"
              style={{ 
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', 
                color: '#10b981', background: 'rgba(16,185,129,0.1)', 
                padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.transform = 'scale(1.03)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Paperclip size={11} /> Bill attached · <span style={{ textDecoration: 'underline', fontWeight: 700 }}>View</span>
            </span>
          )}
        </div>

        {record.description && (
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: D.textSub, fontStyle: 'italic' }}>
            {record.description}
          </p>
        )}
        {/* Parts Replaced */}
        {record.partsReplaced && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Parts:</span>
            {record.partsReplaced.split(',').map((part, pi) => (
              <span key={pi} style={{
                background: D.surfaceHi, border: `1px solid ${D.border}`,
                color: D.text, borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 600
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
        <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Rs. {Number(record.serviceCost || 0).toLocaleString()}
        </div>
      </div>

      {/* Actions — stop propagation so clicking buttons doesn't also open the detail modal */}
      {canEdit && (
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
          {!isDriver && (
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

  // Drivers may edit only records they personally created; Admin is view-only
  const canEdit = !isDriver && !isAdmin || (!isAdmin && record.createdBy === currentUsername)

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
          <div style={{ color: D.indigo, fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>
            {record.serviceType?.replace(/_/g, ' ') || 'Service'}
          </div>
          <div style={{ color: D.textSub, fontSize: '0.8rem' }}>
            {record.vehicleRegNumber || '—'}
            {record.serviceTypeDetail ? ` - ${record.serviceTypeDetail}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
            background: sc.bg, color: sc.color,
            border: `1px solid ${sc.border}`,
            textTransform: 'uppercase'
          }}>
            {sc.label}
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
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
        <div style={{ color: D.textSub, fontSize: '0.82rem', lineHeight: 1.6 }}>
          {record.description}
        </div>
      )}

      {/* Parts Replaced */}
      {record.partsReplaced && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Parts:</span>
          {record.partsReplaced.split(',').map((part, pi) => (
            <span key={pi} style={{
              background: D.surfaceHi, border: `1px solid ${D.border}`,
              color: D.text, borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 600
            }}>
              {part.trim()}
            </span>
          ))}
        </div>
      )}

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
      </div>
      {/* Service progress meter */}
      {isLatest && <ServiceProgressMeter record={record} vehicleCurrentKm={vehicleCurrentKm} D={D} />}

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
          <span 
            onClick={e => { e.stopPropagation(); onViewAttachment(record) }}
            title="Click to view attached bill"
            style={{ 
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', 
              color: '#10b981', background: 'rgba(16,185,129,0.1)', 
              padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.2)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Paperclip size={11} /> Bill attached · <span style={{ textDecoration: 'underline', fontWeight: 700 }}>View</span>
          </span>
        )}
      </div>

      {/* Actions — stop propagation so clicking buttons doesn't also open the detail modal */}
      {canEdit && (
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
          {!isDriver && (
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


/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
const ServicePage = () => {
  const D = useD()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDriver = user?.role === 'DRIVER'
  const isAdmin  = user?.role === 'ADMIN'

  const [services, setServices] = useState([])
  const [stats, setStats] = useState(null)
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
    if (detailModal.isOpen && detailModal.record?.id) {
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
        }).catch(() => {}) // non-fatal

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
      // Fetch all vehicles and drivers for dropdown selection for all roles.
      // For DRIVER role, userAPI.getAllDrivers() returns 403 Forbidden, so we resolve to null instead.
      const requests = [
        serviceAPI.getAllServices(),
        serviceAPI.getServiceStats(),
        vehicleAPI.getAllVehicles(),
        !isDriver ? userAPI.getAllDrivers() : Promise.resolve(null)
      ]
      const [servRes, statsRes, vehicleRes, driversRes] = await Promise.all(requests)
      const loadedServices = servRes.data.data || []
      const loadedVehicles = vehicleRes?.data.data || []
      setServices(loadedServices)
      setStats(statsRes.data.data)
      if (vehicleRes) setAllVehicles(loadedVehicles)
      if (!isDriver && driversRes) {
        setAllDrivers(driversRes.data.data || driversRes.data || [])
      } else if (isDriver && user) {
        setAllDrivers([user])
      }

      // ── Compute alert records and fire notifications ──
      const vehicleKmMap = {}
      loadedVehicles.forEach(v => { vehicleKmMap[v.registrationNo] = v.currentMileageKm })

      // Find the LATEST record per vehicle + service type (based on chronological date / mileage / ID)
      const latestServiceMap = {}
      for (const s of loadedServices) {
        const key = `${s.vehicleRegNumber}_${s.serviceType}`
        const existing = latestServiceMap[key]
        if (!existing) {
          latestServiceMap[key] = s
        } else {
          const dateExisting = existing.serviceDate ? new Date(existing.serviceDate).getTime() : 0
          const dateNew = s.serviceDate ? new Date(s.serviceDate).getTime() : 0
          
          if (dateNew > dateExisting) {
            latestServiceMap[key] = s
          } else if (dateNew === dateExisting) {
            const milExisting = Number(existing.currentMileageKm || 0)
            const milNew = Number(s.currentMileageKm || 0)
            if (milNew > milExisting) {
              latestServiceMap[key] = s
            } else if (milNew === milExisting) {
              if (s.id && existing.id && s.id > existing.id) {
                latestServiceMap[key] = s
              }
            }
          }
        }
      }

      const alerts = []
      for (const record of Object.values(latestServiceMap)) {
        const vehicleKm = vehicleKmMap[record.vehicleRegNumber]
        const level = getAlertLevel(record, vehicleKm)
        if (level === 'DUE_SOON' || level === 'OVERDUE') {
          alerts.push({ ...record, _alertLevel: level, _vehicleCurrentKm: vehicleKm })
          // Fire backend notification once per record per session
          if (!notifiedRef.current.has(record.id)) {
            notifiedRef.current.add(record.id)
            const mileageInfo = computeMileageProgress(record, vehicleKm)
            const dateInfo    = computeDateAlert(record)
            let msg = `${level === 'OVERDUE' ? '🔴 OVERDUE' : '🟡 Due Soon'}: Vehicle ${record.vehicleRegNumber} — ${record.serviceType?.replace(/_/g, ' ')}.`
            if (mileageInfo) msg += ` ${fmtKmRemaining(mileageInfo.remaining)}.`
            if (dateInfo)    msg += ` ${fmtDaysRemaining(dateInfo.daysRemaining)}.`
            notificationAPI.create({
              vehicleRegNumber: `VEH-${record.vehicleRegNumber}`,
              message: msg,
              type: level === 'OVERDUE' ? 'OVERDUE_SERVICE' : 'SERVICE_DUE'
            }).catch(() => {}) // non-fatal
          }
        }
      }
      setAlertRecords(alerts)
    } catch (err) {
      console.error('Error loading service data', err)
    } finally {
      setLoading(false)
    }
  }, [isDriver])

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
          title={isDriver ? 'Service History' : 'Service'}
          subtitle={`Home / ${isDriver ? 'Service History' : 'Service'}`}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />

        <div className="page-body" style={{ padding: '28px 32px' }}>

          {/* 1. HERO BANNER */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            {/* Decorative mesh overlays */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: 16,
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <Wrench size={32} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
                    Maintenance Center, {user?.userName || 'User'}!
                  </h1>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '3px 12px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    Service & Repairs
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.9rem' }}>
                  Schedule services, manage work orders and minimise fleet downtime.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700, opacity: 0.9 }}>
                    Live - {liveTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side actions */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 }}>
              {!isAdmin && (
                <button
                  onClick={openScheduleModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    borderRadius: 12,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(4px)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)' }}
                >
                  <Clock size={16} /> Schedule
                </button>
              )}

              {!isAdmin && (
                <button
                  onClick={() => openAddModal()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    borderRadius: 12,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#1d4ed8',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,255,255,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)' }}
                >
                  + New Work Order
                </button>
              )}
            </div>
          </div>

          {/* 2. MAINTENANCE OVERVIEW HEADING */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
              Maintenance Overview
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: D.textSub }}>
              Service health at a glance
            </p>
          </div>

          {/* 3. 5 KPI CARDS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
            
            {/* CARD 1: OPEN ORDERS */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: D.blueDim, color: D.blue }}>
                <ClipboardList size={18} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Orders</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>{openOrdersCount}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: D.textFaint }}>Awaiting / in progress</p>
              </div>
            </div>

            {/* CARD 2: DUE THIS WEEK */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: D.purpleDim, color: D.purple }}>
                <Calendar size={18} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due This Week</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>{dueThisWeekCount}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: D.textFaint }}>Scheduled services</p>
              </div>
            </div>

            {/* CARD 3: OVERDUE */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: D.redDim, color: D.red }}>
                <ShieldAlert size={18} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>{overdueCount}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: D.textFaint }}>Needs attention</p>
              </div>
            </div>

            {/* CARD 4: MTD COST */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: D.goldDim, color: D.gold }}>
                <Wallet size={18} />
              </div>
              {costTrendPercent !== 0 && (
                <div style={{
                  position: 'absolute', top: 20, right: 20,
                  fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                  background: costTrendPercent < 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: costTrendPercent < 0 ? '#10b981' : '#ef4444',
                  border: `1px solid ${costTrendPercent < 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}>
                  {costTrendPercent < 0 ? '▼' : '▲'} {Math.abs(costTrendPercent)}%
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>MTD Cost</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`LKR ${mtdCost.toLocaleString()}`}>
                  LKR {mtdCost.toLocaleString()}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: D.textFaint }}>Month to date</p>
              </div>
            </div>

            {/* CARD 5: AVG DOWNTIME */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: D.tealDim, color: D.teal }}>
                <Clock size={18} />
              </div>
              {downtimeTrendPercent !== 0 && (
                <div style={{
                  position: 'absolute', top: 20, right: 20,
                  fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                  background: downtimeTrendPercent < 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: downtimeTrendPercent < 0 ? '#10b981' : '#ef4444',
                  border: `1px solid ${downtimeTrendPercent < 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}>
                  {downtimeTrendPercent < 0 ? '▼' : '▲'} {Math.abs(downtimeTrendPercent)}%
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Downtime</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>{avgDowntime} hrs</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: D.textFaint }}>Per service</p>
              </div>
            </div>

          </div>

          {/* 4. CHARTS SECTION */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 28 }}>
            
            {/* LEFT: DOWNTIME TREND */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>Downtime Trend</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: D.textSub }}>Total hours off-road per month</p>
              </div>
              <div style={{ flex: 1, minHeight: 180, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 24, paddingTop: 10 }}>
                {(() => {
                  const trendData = getDowntimeTrendData()
                  const maxHours = Math.max(...trendData.map(d => d.hours), 60)
                  return (
                    <div style={{ width: '100%', height: '100%' }}>
                      <svg width="100%" height="160" viewBox="0 0 500 160" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        {/* Horizontal Gridlines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(f => (
                          <line
                            key={f}
                            x1="0" y1={140 - f * 140}
                            x2="500" y2={140 - f * 140}
                            stroke={D.border}
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                        ))}
                        {/* Vertical bars */}
                        {trendData.map((d, idx) => {
                          const slotW = 500 / 6
                          const barW = 28
                          const x = idx * slotW + (slotW - barW) / 2
                          const barH = (d.hours / maxHours) * 140
                          const y = 140 - barH
                          return (
                            <g key={idx}>
                              <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={barH}
                                rx="4"
                                fill="url(#barGrad)"
                                style={{ transition: 'all 0.5s ease' }}
                              >
                                <title>{d.hours} hours off-road</title>
                              </rect>
                              <text
                                x={x + barW / 2}
                                y="156"
                                textAnchor="middle"
                                fill={D.textSub}
                                fontSize="10"
                                fontWeight="700"
                              >
                                {d.label}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                      {/* Left axis values */}
                      <div style={{ position: 'absolute', left: 4, top: 4, fontSize: '0.62rem', color: D.textFaint, fontWeight: 700 }}>{Math.round(maxHours)}h</div>
                      <div style={{ position: 'absolute', left: 4, top: 74, fontSize: '0.62rem', color: D.textFaint, fontWeight: 700 }}>{Math.round(maxHours / 2)}h</div>
                      <div style={{ position: 'absolute', left: 4, top: 134, fontSize: '0.62rem', color: D.textFaint, fontWeight: 700 }}>0h</div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* RIGHT: BY SERVICE TYPE */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>By Service Type</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: D.textSub }}>Share of work orders</p>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {/* Custom Donut Chart */}
                {(() => {
                  const segments = getServiceTypeShare()
                  const r = 46
                  const circ = 2 * Math.PI * r
                  let accumulatedPercent = 0
                  return (
                    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: 130, height: 130 }}>
                        <svg width="130" height="130" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r={r}
                            fill="transparent"
                            stroke="rgba(255,255,255,0.03)"
                            strokeWidth="11"
                          />
                          {segments.map((seg) => {
                            const strokeLength = (seg.pct / 100) * circ
                            const strokeOffset = circ - strokeLength
                            const rotation = (accumulatedPercent / 100) * 360 - 90
                            accumulatedPercent += seg.pct
                            if (seg.pct === 0) return null
                            return (
                              <circle
                                key={seg.name}
                                cx="60"
                                cy="60"
                                r={r}
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="11"
                                strokeDasharray={circ}
                                strokeDashoffset={strokeOffset}
                                transform={`rotate(${rotation} 60 60)`}
                                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                              >
                                <title>{seg.name}: {seg.count} ({seg.pct}%)</title>
                              </circle>
                            )
                          })}
                        </svg>
                        {/* Center count info */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: D.text, fontFamily: "'Outfit', sans-serif" }}>{total}</span>
                          <span style={{ fontSize: '0.62rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                        </div>
                      </div>
                      {/* Labels */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px 14px', flexWrap: 'wrap', marginTop: 12 }}>
                        {segments.map(seg => (
                          <div key={seg.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: D.textSub }}>
                            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: seg.color }} />
                            <span>{seg.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

          </div>

          {/* 5. SIDE-BY-SIDE MAIN ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.3fr 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* LEFT: WORK ORDERS LIST TABLE */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Heading */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>Work Orders</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: D.textSub }}>Filter, track and export</p>
                </div>
              </div>

              {/* Filtering, Search & Export Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Left Status pill filters */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', border: `1px solid ${D.border}`, padding: '4px', borderRadius: 10 }}>
                  {[
                    { val: 'ALL', label: 'All' },
                    { val: 'Open', label: 'Open' },
                    { val: 'In Progress', label: 'In Progress' },
                    { val: 'Overdue', label: 'Overdue' },
                    { val: 'Completed', label: 'Completed' }
                  ].map(t => {
                    const isSel = filter === t.val
                    return (
                      <button
                        key={t.val}
                        onClick={() => setFilter(t.val)}
                        style={{
                          background: isSel ? 'rgba(255,255,255,0.06)' : 'transparent',
                          color: isSel ? D.text : D.textSub,
                          border: isSel ? `1px solid ${D.borderHi}` : '1px solid transparent',
                          borderRadius: 8,
                          padding: '6px 14px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>

                {/* Right search and export */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end', minWidth: 260 }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 280 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: D.textSub, opacity: 0.8 }} />
                    <input
                      type="text"
                      placeholder="Search work orders..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 30px',
                        background: D.inputBg,
                        border: `1px solid ${search ? D.purple : D.inputBorder}`,
                        borderRadius: 10,
                        color: D.text,
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease'
                      }}
                      onFocus={e => e.target.style.borderColor = D.purple}
                      onBlur={e => e.target.style.borderColor = search ? D.purple : D.inputBorder}
                    />
                    {search && (
                      <X size={14} onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: D.textSub, cursor: 'pointer' }} />
                    )}
                  </div>

                  {/* Export button */}
                  <button
                    onClick={handleExportPDF}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${D.border}`,
                      borderRadius: 10,
                      color: D.text,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export
                  </button>
                </div>

              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                      {['WORK ORDER', 'VEHICLE', 'TASK', 'GARAGE', 'DUE', 'COST', 'STATUS', 'DOCUMENTS'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 800, color: D.textSub, letterSpacing: '0.05em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [1,2,3,4].map(i => (
                        <tr key={i} style={{ borderBottom: `1px solid ${D.border}` }}>
                          <td colSpan="8" style={{ padding: '20px', textAlign: 'center' }}>
                            <div style={{ height: 18, background: D.surfaceHi, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                          </td>
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: '48px 20px', textAlign: 'center', color: D.textSub, fontSize: '0.85rem', fontWeight: 500 }}>
                          No matching work orders found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map(s => {
                        const status = getTableStatus(s)
                        
                        // Status styling config
                        const stConfig = {
                          Overdue: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)' },
                          'In Progress': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.2)' },
                          Open: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.2)' },
                          Completed: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)' }
                        }[status] || { color: D.textSub, bg: 'rgba(255,255,255,0.05)', border: D.border }

                        // Status dot mapping
                        const dotColor = status === 'Overdue' ? '#ef4444' : status === 'In Progress' ? '#fbbf24' : status === 'Completed' ? '#10b981' : '#3b82f6'

                        // Find vehicle details
                        const vc = allVehicles.find(v => v.registrationNo === s.vehicleRegNumber)
                        const vehicleLabel = vc && (vc.manufacturer || vc.model) ? `${vc.manufacturer || ''} ${vc.model || ''}` : '—'

                        return (
                          <tr
                            key={s.id}
                            onClick={() => setDetailModal({ isOpen: true, record: s })}
                            style={{
                              borderBottom: `1px solid ${D.border}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {/* WORK ORDER */}
                            <td style={{ padding: '16px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: D.text }}>
                                  WO-{s.id}
                                </span>
                              </div>
                            </td>

                            {/* VEHICLE */}
                            <td style={{ padding: '16px 14px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: D.text }}>
                                  {s.vehicleRegNumber}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: D.textSub, marginTop: 2 }}>
                                  {vehicleLabel}
                                </span>
                              </div>
                            </td>

                            {/* TASK */}
                            <td style={{ padding: '16px 14px', maxWidth: 180 }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {s.serviceType?.replace(/_/g, ' ')}
                                </span>
                                {s.serviceTypeDetail && (
                                  <span style={{ fontSize: '0.72rem', color: D.textSub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.serviceTypeDetail}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* GARAGE */}
                            <td style={{ padding: '16px 14px', fontSize: '0.82rem', color: D.textSub }}>
                              {s.technicianWorkshop || '—'}
                            </td>

                            {/* DUE */}
                            <td style={{ padding: '16px 14px', fontSize: '0.82rem', color: D.textSub, fontWeight: 600 }}>
                              {s.serviceDate ? s.serviceDate.substring(0, 10) : '—'}
                            </td>

                            {/* COST */}
                            <td style={{ padding: '16px 14px', fontSize: '0.82rem', fontWeight: 800, color: D.text }}>
                              LKR {Number(s.serviceCost || 0).toLocaleString()}
                            </td>

                            {/* STATUS */}
                            <td style={{ padding: '16px 14px' }}>
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '4px 10px',
                                borderRadius: 6,
                                background: stConfig.bg,
                                color: stConfig.color,
                                border: `1px solid ${stConfig.border}`
                              }}>
                                {status}
                              </span>
                            </td>

                            {/* DOCUMENTS */}
                            <td style={{ padding: '16px 14px' }} onClick={e => e.stopPropagation()}>
                              {s.attachmentPath ? (
                                <button
                                  onClick={() => handleViewAttachment(s)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '6px 12px',
                                    background: 'rgba(16,185,129,0.08)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 8,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.18)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
                                >
                                  <Paperclip size={11} /> View
                                </button>
                              ) : (
                                !isDriver && !isAdmin ? (
                                  <button
                                    onClick={() => openEditModal(s.id)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      padding: '6px 12px',
                                      background: 'rgba(255,255,255,0.03)',
                                      color: D.textSub,
                                      border: `1px solid ${D.border}`,
                                      borderRadius: 8,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = D.text }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = D.textSub }}
                                  >
                                    <Paperclip size={11} /> Attach
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: D.textFaint }}>No Bill</span>
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

              {/* Table Footer Count indicator */}
              {!loading && filtered.length > 0 && (
                <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: D.textSub }}>
                    Showing <strong style={{ color: D.text }}>{filtered.length}</strong> of <strong style={{ color: D.text }}>{services.length}</strong> records
                  </span>
                  
                  {/* Deleted drawer activator link for admin/controller */}
                  {!isDriver && (
                    <button
                      onClick={() => setDeletedDrawer(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: D.red,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      <Archive size={12} /> Deleted Records ({deletedRecords.length})
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT: SERVICE ALERTS PANEL */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>Service Alerts</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: D.textSub }}>Upcoming & overdue</p>
                </div>
                {alertRecords.length > 0 && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: alertRecords.some(r => r._alertLevel === 'OVERDUE') ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
                    color: alertRecords.some(r => r._alertLevel === 'OVERDUE') ? '#ef4444' : '#fbbf24',
                    border: `1px solid ${alertRecords.some(r => r._alertLevel === 'OVERDUE') ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}`
                  }}>
                    {alertRecords.length} active
                  </span>
                )}
              </div>

              {/* Alert list cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                {alertRecords.length === 0 ? (
                  <div style={{ padding: '32px 12px', textAlign: 'center', color: D.textFaint }}>
                    <CheckCircle size={32} style={{ color: D.green, opacity: 0.8, marginBottom: 8, marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>All vehicles healthy</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem' }}>No upcoming or overdue service risks detected.</p>
                  </div>
                ) : (
                  alertRecords.map(r => {
                    const isOverdue = r._alertLevel === 'OVERDUE'
                    const cardBorder = isOverdue ? 'rgba(239,68,68,0.35)' : 'rgba(251,191,36,0.35)'
                    const iconColor = isOverdue ? '#ef4444' : '#fbbf24'
                    const tagLabel = isOverdue ? 'URGENT' : 'UPCOMING'

                    return (
                      <div
                        key={r.id}
                        onClick={() => setDetailModal({ isOpen: true, record: r })}
                        style={{
                          background: D.bg,
                          border: `1px solid ${cardBorder}`,
                          borderRadius: 12,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = iconColor
                          e.currentTarget.style.boxShadow = `0 4px 12px ${iconColor}10`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = cardBorder
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
                            border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}`,
                            color: iconColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Wrench size={14} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: D.text }}>
                                {isOverdue ? 'Service Overdue Risk' : 'Service Due Soon'}
                              </span>
                              <span style={{
                                fontSize: '0.55rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
                                color: iconColor
                              }}>
                                {tagLabel}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: D.textSub, lineHeight: 1.4 }}>
                              <strong style={{ color: D.text }}>{r.vehicleRegNumber}</strong> · {r.serviceType?.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 2, borderTop: `1px solid ${D.border}`, paddingTop: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', color: iconColor, fontWeight: 700 }}>
                            {isOverdue ? 'Needs Attention' : 'Due Soon'}
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setDetailModal({ isOpen: true, record: r })
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              color: D.text,
                              border: `1px solid ${D.border}`,
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

            </div>

          </div>

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
                    // Render each edit from newest → oldest
                    serviceHistory.map((entry, idx) => {
                      let fields = []
                      try { fields = JSON.parse(entry.changedFields || '[]') } catch (e) { /* ignore */ }
                      return (
                        <div key={entry.id} style={{ position: 'relative', marginBottom: idx < serviceHistory.length - 1 ? 14 : 4 }}>
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
                    })
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 28px', borderTop: `1px solid ${D.border}`, display: 'flex', gap: 10, background: D.surfaceHi, flexShrink: 0 }}>
                {/* Controller only: show Edit + Delete; Admin is view-only */}
                {!isDriver && !isAdmin && (
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
                 {isDriver && r.createdBy === user?.userName && (
                   <button
                     onClick={() => { closeDetail(); openEditModal(r.id) }}
                     style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(37, 99, 235,0.35)' }}
                   >
                     <Edit2 size={15} /> Edit Record
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
                        const match = allVehicles.find(v => v.registrationNo.toLowerCase() === e.target.value.toLowerCase())
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
                          v.registrationNo.toLowerCase().includes(q) ||
                          `${v.manufacturer} ${v.model}`.toLowerCase().includes(q)
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
                        const match = allVehicles.find(v => v.registrationNo.toLowerCase() === e.target.value.toLowerCase())
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
                          v.registrationNo.toLowerCase().includes(q) ||
                          `${v.manufacturer} ${v.model}`.toLowerCase().includes(q)
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
                        const match = allVehicles.find(v => v.registrationNo.toLowerCase() === e.target.value.toLowerCase())
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
                          v.registrationNo.toLowerCase().includes(q) ||
                          `${v.manufacturer} ${v.model}`.toLowerCase().includes(q)
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
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
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
