import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { serviceAPI, vehicleAPI, notificationAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { addControllerNotification, addDriverNotification } from '../services/notificationService'
import { computeMileageProgress, computeDateAlert, getAlertLevel, ALERT_COLORS, fmtKmRemaining, fmtDaysRemaining } from '../utils/serviceAlertUtils'
import { Settings, Droplet, Circle, RotateCcw, Thermometer, Battery, Search, Wrench, Car, Calendar, MapPin, Edit2, Trash2, ClipboardList, CheckCircle, CircleDollarSign, X, Check, AlertTriangle, Paperclip, User, Eye, Archive, Clock, Gauge, BellRing } from 'lucide-react'

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
  UPCOMING: { label: 'Upcoming', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  OVERDUE: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
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
      border: `1px solid ${overdue.length > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`,
      borderRadius: 16,
      marginBottom: 20,
      overflow: 'hidden',
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${D.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
        background: overdue.length > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
      }}>
        <BellRing size={16} style={{ color: overdue.length > 0 ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: D.text }}>
          Service Alerts
        </span>
        {overdue.length > 0 && (
          <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999, marginLeft: 2 }}>
            {overdue.length} Overdue
          </span>
        )}
        {dueSoon.length > 0 && (
          <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999 }}>
            {dueSoon.length} Due Soon
          </span>
        )}
      </div>

      {/* Scroll strip of alert cards */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px', overflowX: 'auto', scrollbarWidth: 'thin' }}>
        {alertRecords.map(r => {
          const ac = ALERT_COLORS[r._alertLevel] || ALERT_COLORS.DUE_SOON
          const mileage = computeMileageProgress(r, r._vehicleCurrentKm)
          const date    = computeDateAlert(r)
          return (
            <div key={r.id} style={{
              flexShrink: 0,
              minWidth: 230,
              maxWidth: 260,
              background: D.bg,
              border: `1px solid ${ac.border}`,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: `0 2px 12px ${ac.bg}`,
            }}>
              {/* Vehicle + type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: ac.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${ac.border}` }}>
                  <Car size={16} style={{ color: ac.color }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: D.text }}>{r.vehicleRegNumber}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: D.textSub }}>{r.serviceType?.replace(/_/g, ' ')}</p>
                </div>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 800,
                  padding: '2px 7px', borderRadius: 999,
                  background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`
                }}>{ac.label}</span>
              </div>

              {/* Mileage progress */}
              {mileage && (
                <div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${Math.min(mileage.pct, 100)}%`, height: '100%', background: ac.color, borderRadius: 999 }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: ac.color, fontWeight: 700 }}>
                    {fmtKmRemaining(mileage.remaining)}
                  </p>
                </div>
              )}

              {/* Date countdown */}
              {date && (
                <p style={{ margin: 0, fontSize: '0.68rem', color: ac.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> {fmtDaysRemaining(date.daysRemaining)}
                </p>
              )}

              {/* Actions */}
              {onCompleteAlert && (
                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCompleteAlert(r); }}
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
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
const ServiceListCard = ({ record, index, isDriver, isAdmin, currentUsername, vehicleCurrentKm, onEdit, onDelete, onView, onViewAttachment, D }) => {
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
        <ServiceProgressMeter record={record} vehicleCurrentKm={vehicleCurrentKm} D={D} />
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
const ServiceGridCard = ({ record, index, isDriver, isAdmin, currentUsername, vehicleCurrentKm, onEdit, onDelete, onView, onViewAttachment, D }) => {
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
          <div style={{ color: D.blue, fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>
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

      {/* Description */}
      <div style={{ color: D.text, fontSize: '0.85rem' }}>
        {record.description || 'No description provided.'}
      </div>

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
      <ServiceProgressMeter record={record} vehicleCurrentKm={vehicleCurrentKm} D={D} />

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
  const [previousMileage, setPreviousMileage] = useState(null)

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
          e.currentMileageKm = `Must be ≥ previous reading (${maxEarlierMileage} km) from earlier records`
        } else if (minLaterMileage !== Infinity && inputMil > minLaterMileage) {
          e.currentMileageKm = `Must be ≤ subsequent reading (${minLaterMileage} km) from newer records`
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
    if (errors.vehicleRegNumber) setErrors(prev => ({ ...prev, vehicleRegNumber: undefined }))

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
    if (errors.currentMileageKm) setErrors(prev => ({ ...prev, currentMileageKm: undefined }))
  }

  const openAddModal = (prefill = {}) => {
    const isEvent = prefill && (prefill.nativeEvent || prefill.target)
    const actualPrefill = isEvent ? {} : prefill
    const regNo = actualPrefill.vehicleRegNumber || ''
    setFormData({
      ...initialForm,
      ...actualPrefill,
      vehicleRegNumber: regNo,
    })
    setErrors({})
    setSubmitError(null)
    setAddAttachmentFile(null)
    
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
        addControllerNotification(msg, 'WARNING')
        if (isDriver) addDriverNotification(msg, 'WARNING')
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
    })
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
      // Fetch all vehicles for dropdown selection for all roles
      const requests = [serviceAPI.getAllServices(), serviceAPI.getServiceStats(), vehicleAPI.getAllVehicles()]
      const [servRes, statsRes, vehicleRes] = await Promise.all(requests)
      const loadedServices = servRes.data.data || []
      const loadedVehicles = vehicleRes?.data.data || []
      setServices(loadedServices)
      setStats(statsRes.data.data)
      if (vehicleRes) setAllVehicles(loadedVehicles)

      // ── Compute alert records and fire notifications ──
      const vehicleKmMap = {}
      loadedVehicles.forEach(v => { vehicleKmMap[v.registrationNo] = v.currentMileageKm })

      // Find the LATEST record per vehicle + service type (based on ID / creation time)
      const latestServiceMap = {}
      for (const s of loadedServices) {
        const key = `${s.vehicleRegNumber}_${s.serviceType}`
        if (!latestServiceMap[key]) {
          latestServiceMap[key] = s
        } else {
          // Priority 1: id (since it's an auto-incrementing primary key, highest id = newest)
          if (s.id && latestServiceMap[key].id) {
            if (s.id > latestServiceMap[key].id) {
              latestServiceMap[key] = s
            }
          } 
          // Priority 2: Fallback to createdAt if id is missing for some reason
          else if (s.createdAt && latestServiceMap[key].createdAt) {
            if (new Date(s.createdAt).getTime() > new Date(latestServiceMap[key].createdAt).getTime()) {
              latestServiceMap[key] = s
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

  /* Derived counts */
  const completedServices = services.filter(s => getStatus(s) === 'COMPLETED')
  const totalRoutineCost = completedServices
    .filter(s => s.serviceClassification !== 'AD_HOC')
    .reduce((sum, s) => sum + Number(s.serviceCost || 0), 0)
  const totalAdHocCost = completedServices
    .filter(s => s.serviceClassification === 'AD_HOC')
    .reduce((sum, s) => sum + Number(s.serviceCost || 0), 0)

  const scheduled = services.filter(s => getStatus(s) === 'SCHEDULED').length
  const completed = completedServices.length
  const total = services.length
  const upcomingCount = alertRecords.filter(r => r._alertLevel === 'DUE_SOON').length
  const overdueCount = alertRecords.filter(r => r._alertLevel === 'OVERDUE').length

  /* Filtered and sorted list */
  const filtered = services.filter(s => {
    if (filter === 'UPCOMING') {
      if (!alertRecords.some(r => r.id === s.id && r._alertLevel === 'DUE_SOON')) return false
    } else if (filter === 'OVERDUE') {
      if (!alertRecords.some(r => r.id === s.id && r._alertLevel === 'OVERDUE')) return false
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

  const focusBorder = (e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }
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
                  {isDriver ? 'View your vehicle service and maintenance history.' : 'Add and track vehicle maintenance records.'}
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

              {/* Schedule button — hidden for admin (read-only monitor) */}
              {!isAdmin && (
                <button
                  id="schedule-service-btn"
                  onClick={openScheduleModal}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 22px', borderRadius: 14, fontSize: '0.875rem', fontWeight: 700,
                    background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)', transition: 'all 0.2s ease',
                    backdropFilter: 'blur(4px)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <Clock size={18} /> Schedule Service
                </button>
              )}

              {/* Add button — hidden for admin (read-only monitor) */}
              {!isAdmin && (
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
                  <Calendar size={18} /> Add New Service
                </button>
              )}
            </div>
          </div>

          {/* ── Service Due Alert Strip ───────────────────────────── */}
          {!loading && alertRecords.length > 0 && (
            <ServiceDueAlertStrip 
              alertRecords={alertRecords} 
              onCompleteAlert={isAdmin ? null : r => openAddModal({ 
                id: r.id, 
                vehicleRegNumber: r.vehicleRegNumber, 
                serviceType: r.serviceType,
                serviceTypeDetail: r.serviceTypeDetail || '',
                serviceDate: new Date().toISOString().split('T')[0], // pre-fill today
                technicianWorkshop: r.technicianWorkshop === 'Scheduled (TBD)' ? '' : r.technicianWorkshop,
                description: r.description || ''
              })}
              onViewAlert={r => setDetailModal({ isOpen: true, record: r })}
              D={D} 
            />
          )}

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

              {/* Routine Maintenance Costs */}
              <div style={statCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                    Rs.{totalRoutineCost.toLocaleString()}
                  </p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}><CheckCircle size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Routine Cost</p>
                <ProgressBar value={totalRoutineCost} max={totalRoutineCost + totalAdHocCost || 1} color="#10b981" D={D} />
              </div>

              {/* Ad-hoc Repair / Breakdown Costs */}
              <div style={statCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                    Rs.{totalAdHocCost.toLocaleString()}
                  </p>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#ef4444' }}><AlertTriangle size={28} /></span>
                </div>
                <p style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>Breakdown / Ad-hoc Cost</p>
                <ProgressBar value={totalAdHocCost} max={totalRoutineCost + totalAdHocCost || 1} color="#ef4444" D={D} />
              </div>
            </div>
          )}

          {/* ── Filter Bar ───────────────────────────────────────────── */}
          <div style={{
            background: D.surface,
            border: `1px solid ${D.border}`,
            borderRadius: 16, marginBottom: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            position: 'relative', zIndex: 40
          }}>

            {/* Row 1: pills + vehicle + actions */}
            <div style={{
              padding: '12px 18px',
              display: 'flex', alignItems: 'center',
              gap: 8, flexWrap: 'wrap',
              borderBottom: `1px solid ${D.border}`,
              background: D.surfaceHi,
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
            }}>

              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: D.textSub, flexShrink: 0, marginRight: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Filters</span>
              </div>
              <div style={{ width: 1, height: 18, background: D.border, flexShrink: 0 }} />

              {/* Status pills */}
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = key === 'ALL' ? total :
                              key === 'SCHEDULED' ? scheduled :
                              key === 'COMPLETED' ? completed :
                              key === 'UPCOMING' ? upcomingCount :
                              key === 'OVERDUE' ? overdueCount : 0
                const active = filter === key
                const pc = {
                  ALL:       { grad: 'linear-gradient(135deg,#3b82f6,#6366f1)', shadow: 'rgba(99,102,241,0.4)', dot: '#6366f1' },
                  SCHEDULED: { grad: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: 'rgba(245,158,11,0.4)',  dot: '#f59e0b' },
                  COMPLETED: { grad: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,0.4)',  dot: '#10b981' },
                  UPCOMING:  { grad: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: 'rgba(245,158,11,0.4)',  dot: '#f59e0b' },
                  OVERDUE:   { grad: 'linear-gradient(135deg,#dc2626,#ef4444)', shadow: 'rgba(239,68,68,0.4)',   dot: '#ef4444' },
                }[key] || { grad: 'linear-gradient(135deg,#3b82f6,#6366f1)', shadow: 'rgba(99,102,241,0.4)', dot: '#6366f1' }
                return (
                  <button
                    key={key}
                    id={`filter-${key.toLowerCase()}`}
                    onClick={() => setFilter(key)}
                    style={{
                      padding: '5px 11px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                      border: active ? 'none' : `1px solid ${D.border}`,
                      background: active ? pc.grad : 'transparent',
                      color: active ? '#fff' : D.textSub,
                      cursor: 'pointer', transition: 'all 0.18s ease',
                      boxShadow: active ? `0 2px 12px ${pc.shadow}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.color = D.text } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.textSub } }}
                  >
                    {key !== 'ALL' && !active && (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
                    )}
                    {cfg.label}
                    <span style={{
                      background: active ? 'rgba(255,255,255,0.22)' : D.surfaceHi,
                      color: active ? '#fff' : D.textSub,
                      borderRadius: 999, padding: '1px 6px',
                      fontSize: '0.67rem', fontWeight: 800,
                      border: active ? 'none' : `1px solid ${D.border}`,
                    }}>{count}</span>
                  </button>
                )
              })}

              <div style={{ width: 1, height: 18, background: D.border, flexShrink: 0 }} />

              {/* Vehicle dropdown */}
              <div style={{ position: 'relative', zIndex: 50 }}>
                <button
                  onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
                  style={{
                    padding: '5px 11px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                    border: vehicleFilter !== 'ALL' ? 'none' : `1px solid ${D.border}`,
                    background: vehicleFilter !== 'ALL' ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'transparent',
                    color: vehicleFilter !== 'ALL' ? '#fff' : D.textSub,
                    cursor: 'pointer', transition: 'all 0.18s ease',
                    boxShadow: vehicleFilter !== 'ALL' ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (vehicleFilter === 'ALL') { e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.color = D.text } }}
                  onMouseLeave={e => { if (vehicleFilter === 'ALL') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.textSub } }}
                >
                  <Car size={12} />
                  <span>{vehicleFilter === 'ALL' ? 'All Vehicles' : vehicleFilter}</span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ opacity: 0.7, transform: vehicleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {vehicleDropdownOpen && (
                  <>
                    <div onClick={() => setVehicleDropdownOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                      width: 290, background: D.surface,
                      border: `1px solid ${D.border}`, borderRadius: 14,
                      boxShadow: '0 16px 40px rgba(0,0,0,0.35)', zIndex: 999,
                      padding: 8, maxHeight: 320, overflowY: 'auto',
                      display: 'flex', flexDirection: 'column', gap: 3,
                    }}>
                      <div style={{ padding: '5px 8px 8px', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub, borderBottom: `1px solid ${D.border}`, marginBottom: 4 }}>
                        Select Vehicle
                      </div>
                      <div
                        onClick={() => { setVehicleFilter('ALL'); setVehicleDropdownOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', background: vehicleFilter === 'ALL' ? D.indigoDim : 'transparent', border: `1px solid ${vehicleFilter === 'ALL' ? D.borderHi : 'transparent'}`, transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (vehicleFilter !== 'ALL') e.currentTarget.style.background = D.surfaceHi }}
                        onMouseLeave={e => { if (vehicleFilter !== 'ALL') e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: D.indigoDim, color: D.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Car size={13} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: D.text }}>All Vehicles</div>
                          <div style={{ fontSize: '0.67rem', color: D.textSub }}>Entire fleet records</div>
                        </div>
                        {vehicleFilter === 'ALL' && <Check size={13} style={{ color: D.indigo }} />}
                      </div>
                      {allVehicles.map(v => {
                        const isSel = vehicleFilter === v.registrationNo
                        return (
                          <div
                            key={v.id}
                            onClick={() => { setVehicleFilter(v.registrationNo); setVehicleDropdownOpen(false) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', background: isSel ? D.indigoDim : 'transparent', border: `1px solid ${isSel ? D.borderHi : 'transparent'}`, transition: 'background 0.15s' }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = D.surfaceHi }}
                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                          >
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: D.indigoDim, color: D.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Car size={13} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: D.text }}>{v.registrationNo}</div>
                              <div style={{ fontSize: '0.67rem', color: D.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.manufacturer} {v.model}</div>
                            </div>
                            {isSel && <Check size={13} style={{ color: D.indigo, flexShrink: 0 }} />}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              <div style={{ flex: 1 }} />

              {/* Active filter badge + reset */}
              {(filter !== 'ALL' || vehicleFilter !== 'ALL' || search) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.2s ease' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 999,
                    background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.25)',
                    fontSize: '0.68rem', fontWeight: 700,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1' }} />
                    {[filter !== 'ALL', vehicleFilter !== 'ALL', !!search].filter(Boolean).length} active
                  </span>
                  <button
                    onClick={() => { setFilter('ALL'); setVehicleFilter('ALL'); setSearch('') }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                      background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  >
                    <X size={10} /> Reset all
                  </button>
                </div>
              )}

              {/* Deleted Records button */}
              {!isDriver && (
                <button
                  id="view-deleted-records-btn"
                  onClick={() => setDeletedDrawer(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 999,
                    fontSize: '0.72rem', fontWeight: 700,
                    background: 'rgba(239,68,68,0.07)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                    cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                >
                  <Archive size={12} /> Deleted Records
                </button>
              )}
            </div>

            {/* Row 2: Search */}
            <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.textSub, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Search size={14} />
                </span>
                <input
                  id="service-search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by vehicle, type, date, workshop, cost, mileage, user..."
                  style={{
                    width: '100%', padding: '8px 36px 8px 34px',
                    borderRadius: 10, fontSize: '0.82rem',
                    background: D.inputBg,
                    border: `1px solid ${search ? 'rgba(99,102,241,0.4)' : D.inputBorder}`,
                    color: D.text, outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: search ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = search ? 'rgba(99,102,241,0.4)' : D.inputBorder; e.target.style.boxShadow = search ? '0 0 0 3px rgba(99,102,241,0.08)' : 'none' }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = D.text}
                    onMouseLeave={e => e.currentTarget.style.color = D.textSub}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.73rem', color: D.textSub, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <strong style={{ color: D.text }}>{filtered.length}</strong>
                <span>/</span>
                <span>{services.length} records</span>
              </div>
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
                  {!isAdmin && (
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
              filtered.map((record, i) => {
                const vc = allVehicles.find(v => v.registrationNo === record.vehicleRegNumber)
                return (
                  <ServiceGridCard
                    key={record.id}
                    record={record}
                    index={i}
                    isDriver={isDriver}
                    isAdmin={isAdmin}
                    currentUsername={user?.userName}
                    vehicleCurrentKm={vc?.currentMileageKm}
                    onEdit={openEditModal}
                    onDelete={confirmDelete}
                    onView={r => setDetailModal({ isOpen: true, record: r })}
                    onViewAttachment={handleViewAttachment}
                    D={D}
                  />
                )
              })
            ) : (
              filtered.map((record, i) => {
                const vc = allVehicles.find(v => v.registrationNo === record.vehicleRegNumber)
                return (
                  <ServiceListCard
                    key={record.id}
                    record={record}
                    index={i}
                    isDriver={isDriver}
                    isAdmin={isAdmin}
                    currentUsername={user?.userName}
                    vehicleCurrentKm={vc?.currentMileageKm}
                    onEdit={openEditModal}
                    onDelete={confirmDelete}
                    onView={r => setDetailModal({ isOpen: true, record: r })}
                    onViewAttachment={handleViewAttachment}
                    D={D}
                  />
                )
              })
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
                {/* Controller only: show Edit + Delete; Admin is view-only */}
                {!isDriver && !isAdmin && (
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
                {/* Driver: only show Edit if they created this record */}
                {isDriver && r.createdBy === user?.userName && (
                  <button
                    onClick={() => { closeDetail(); openEditModal(r.id) }}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
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
                  <input type="text" list="vehiclesListAdd" name="vehicleRegNumber" value={formData.vehicleRegNumber} onChange={e => handleVehicleSelect(e, false)} placeholder="e.g. WP-CAB-1234" style={fieldInput(errors.vehicleRegNumber)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.vehicleRegNumber)} />
                  <datalist id="vehiclesListAdd">
                    {allVehicles.map(v => <option key={v.id} value={v.registrationNo} />)}
                  </datalist>
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

      {/* ── Schedule Modal ───────────────────────────────────────────── */}
      {isScheduleModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
          <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 640, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
            <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

            <form onSubmit={handleScheduleSubmit} style={{ padding: '24px 28px' }} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub }}>Schedule Criteria</span>
                <div style={{ flex: 1, height: 1, background: D.border }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={fieldLabel}>Vehicle (License Plate) <span style={{ color: D.red }}>*</span></label>
                  <input type="text" list="vehiclesListSchedule" name="vehicleRegNumber" value={scheduleFormData.vehicleRegNumber} onChange={handleScheduleChange} placeholder="e.g. WP-CAB-1234" style={fieldInput(scheduleErrors.vehicleRegNumber)} onFocus={focusBorder} onBlur={e => blurBorder(e, scheduleErrors.vehicleRegNumber)} />
                  <datalist id="vehiclesListSchedule">
                    {allVehicles.map(v => <option key={v.id} value={v.registrationNo} />)}
                  </datalist>
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
                <button type="submit" disabled={formLoading} style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: formLoading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: formLoading ? 'none' : '0 4px 16px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
                  <input type="text" list="vehiclesListEdit" name="vehicleRegNumber" value={editFormData.vehicleRegNumber} onChange={e => handleVehicleSelect(e, true)} placeholder="e.g. WP-CAB-1234" style={fieldInput(errors.vehicleRegNumber)} onFocus={focusBorder} onBlur={e => blurBorder(e, errors.vehicleRegNumber)} />
                  <datalist id="vehiclesListEdit">
                    {allVehicles.map(v => <option key={v.id} value={v.registrationNo} />)}
                  </datalist>
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
