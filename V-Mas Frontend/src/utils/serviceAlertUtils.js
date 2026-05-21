/**
 * serviceAlertUtils.js
 *
 * Shared pure-function helpers for computing service-due alert status.
 * Used by ServicePage and VehiclesPage.
 *
 * Alert levels:
 *   'OK'        — No action needed yet
 *   'DUE_SOON'  — Mileage >= 80% of interval  OR  date within 14 days
 *   'OVERDUE'   — Mileage >= 100% (past next-service km)  OR  date in the past
 *   null        — Not enough data to compute
 */

/** How many km before nextServiceDue we start alerting */
const MILEAGE_ALERT_THRESHOLD = 100
/** How many days before nextServiceDue we start alerting */
const DATE_ALERT_DAYS = 7

// ─── Mileage ────────────────────────────────────────────────────────────────

/**
 * Compute mileage-based progress for a single service record.
 *
 * @param {object} record            – ServiceRecordDto
 * @param {number|null} vehicleKm    – vehicle.currentMileageKm (live)
 * @returns {{
 *   pct: number,        // 0-100+ (can exceed 100 if overdue)
 *   driven: number,     // km driven since last service
 *   interval: number,   // total km of the scheduled interval
 *   remaining: number,  // km remaining until next service (negative if overdue)
 *   level: 'OK'|'DUE_SOON'|'OVERDUE'|null
 * }|null}
 */
export function computeMileageProgress(record, vehicleKm) {
  const serviceKm = Number(record.currentMileageKm)
  const nextKm    = Number(record.nextServiceMileageKm)

  if (!record.nextServiceMileageKm || !record.currentMileageKm || vehicleKm == null) return null
  if (isNaN(serviceKm) || isNaN(nextKm) || nextKm <= serviceKm) return null

  const currentKm = Number(vehicleKm)
  const interval  = nextKm - serviceKm
  const driven    = Math.max(0, currentKm - serviceKm)
  const pct       = Math.min((driven / interval) * 100, 110) // clamp at 110% for display
  const remaining = nextKm - currentKm

  let level = 'OK'
  if (driven >= interval)                        level = 'OVERDUE'
  else if (remaining <= MILEAGE_ALERT_THRESHOLD) level = 'DUE_SOON'

  return { pct, driven, interval, remaining, level, serviceKm, nextKm }
}

// ─── Date ────────────────────────────────────────────────────────────────────

/**
 * Compute date-based alert info for a single service record.
 *
 * @param {object} record  – ServiceRecordDto with nextServiceDue field
 * @returns {{
 *   daysRemaining: number,   // negative = overdue
 *   level: 'OK'|'DUE_SOON'|'OVERDUE'|null
 * }|null}
 */
export function computeDateAlert(record) {
  if (!record.nextServiceDue) return null

  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate  = new Date(record.nextServiceDue)
  dueDate.setHours(0, 0, 0, 0)
  const diffMs   = dueDate - today
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  let level = 'OK'
  if (daysRemaining < 0)                   level = 'OVERDUE'
  else if (daysRemaining <= DATE_ALERT_DAYS) level = 'DUE_SOON'

  return { daysRemaining, level }
}

// ─── Combined ────────────────────────────────────────────────────────────────

/**
 * Returns the "worst" alert level across mileage + date.
 * Priority: OVERDUE > DUE_SOON > OK > null
 */
export function getAlertLevel(record, vehicleKm) {
  const mileage = computeMileageProgress(record, vehicleKm)
  const date    = computeDateAlert(record)
  const levels  = [mileage?.level, date?.level].filter(Boolean)

  if (levels.includes('OVERDUE'))  return 'OVERDUE'
  if (levels.includes('DUE_SOON')) return 'DUE_SOON'
  if (levels.includes('OK'))       return 'OK'
  return null
}

// ─── Colour helpers ──────────────────────────────────────────────────────────

export const ALERT_COLORS = {
  OK:       { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  label: 'Good'     },
  DUE_SOON: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)',  label: 'Due Soon' },
  OVERDUE:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',   label: 'Overdue'  },
}

/** Format remaining km as a human-readable string */
export function fmtKmRemaining(remaining) {
  if (remaining <= 0) return `${Math.abs(remaining).toLocaleString()} km overdue`
  return `${remaining.toLocaleString()} km remaining`
}

/** Format days remaining as a human-readable string */
export function fmtDaysRemaining(daysRemaining) {
  if (daysRemaining < 0) return `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`
  if (daysRemaining === 0) return 'Due today'
  return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
}
