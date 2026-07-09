import { useState, useEffect } from 'react'
import { useD } from '../context/ThemeContext'
import { X, Play, CheckCircle, Ban, Loader2 } from 'lucide-react'

const META = {
  start:    { verb: 'Start',    Icon: Play,        color: '#10b981', confirm: 'Start Trip' },
  decline:  { verb: 'Decline',  Icon: Ban,         color: '#ef4444', confirm: 'Decline Trip' },
  complete: { verb: 'Complete', Icon: CheckCircle, color: '#3b82f6', confirm: 'Complete Trip' },
}

/**
 * Confirmation modal for a driver's trip action (start / decline / complete).
 * For "decline" it also captures an optional reason.
 *
 * Props: action ('start'|'decline'|'complete'), trip, busy, onClose, onConfirm(reason)
 */
const TripActionModal = ({ action, trip, busy, onClose, onConfirm }) => {
  const D = useD()
  const [reason, setReason] = useState('')

  // Reset the reason whenever a new action modal opens
  useEffect(() => { setReason('') }, [action, trip?.id])

  if (!action || !trip) return null
  const meta = META[action] || META.start
  const { Icon } = meta

  const body = {
    start: `You're about to start the trip to "${trip.destination}" with vehicle ${trip.vehicleRegNumber}. Your controller will be notified.`,
    decline: `Let your controller know why you can't take the trip to "${trip.destination}".`,
    complete: `Mark the trip to "${trip.destination}" as completed. Your controller will be notified.`,
  }[action]

  return (
    <div onClick={() => !busy && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, animation: 'tamFade 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', padding: '36px 32px', textAlign: 'center', animation: 'tamScale 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
        <button type="button" onClick={() => !busy && onClose()} disabled={busy}
          style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', borderRadius: 10, padding: 8, color: D.textSub, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--surface-hi)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <X size={18} />
        </button>

        <div style={{ width: 64, height: 64, borderRadius: 18, background: `${meta.color}22`, border: `1px solid ${meta.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, margin: '0 auto 20px' }}>
          <Icon size={28} />
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          {meta.verb} trip to "{trip.destination}"?
        </h3>
        <p style={{ margin: '0 0 22px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.6 }}>
          {body}
        </p>

        {action === 'decline' && (
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for declining (optional)…"
            rows={3}
            disabled={busy}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${D.inputBorder}`, background: D.inputBg, color: D.text, fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 24, boxSizing: 'border-box' }}
          />
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button type="button" onClick={onClose} disabled={busy}
            style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--surface-hi)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {action === 'decline' ? 'Keep Trip' : 'Not now'}
          </button>
          <button type="button" onClick={() => onConfirm(reason)} disabled={busy}
            style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: 'none', background: meta.color, color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: `0 4px 12px ${meta.color}55`, fontFamily: 'inherit', opacity: busy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {busy && <Loader2 size={15} style={{ animation: 'tamSpin 1s linear infinite' }} />}
            {busy ? 'Working…' : meta.confirm}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tamFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tamScale { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes tamSpin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default TripActionModal
