import { useEffect, useState, useCallback } from 'react'
import { vehicleAPI, userAPI } from '../services/api'
import { useD } from '../context/ThemeContext'
import { Truck, UserCheck, X, RefreshCw, AlertCircle, Check } from 'lucide-react'

const DriverAssignmentTab = () => {
  const D = useD()
  const [vehicles, setVehicles]   = useState([])
  const [drivers,  setDrivers]    = useState([])
  const [loading,  setLoading]    = useState(true)
  const [saving,   setSaving]     = useState(null)   // vehicleId being saved
  const [toast,    setToast]      = useState(null)   // { msg, type }
  const [selected, setSelected]   = useState({})     // { [vehicleId]: driverId }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vRes, dRes] = await Promise.all([
        vehicleAPI.getAllVehicles(),
        userAPI.getAllDrivers(),
      ])
      const vList = vRes.data.data || []
      setVehicles(vList)
      setDrivers(dRes.data.data || [])
      // seed selected map from current assignments
      const init = {}
      vList.forEach(v => { init[v.id] = v.assigneeId ?? '' })
      setSelected(init)
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAssign = async (vehicleId) => {
    const driverId = selected[vehicleId]
    setSaving(vehicleId)
    try {
      if (!driverId) {
        await vehicleAPI.unassignDriver(vehicleId)
        showToast('Driver unassigned successfully')
      } else {
        await vehicleAPI.assignDriver(vehicleId, driverId)
        showToast('Driver assigned successfully')
      }
      load()
    } catch (e) {
      showToast(e.response?.data?.message || 'Assignment failed', 'error')
    } finally {
      setSaving(null)
    }
  }

  const s = {
    card: {
      background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'box-shadow 0.2s',
    },
    label: {
      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: D.textSub, marginBottom: 4,
    },
    select: {
      width: '100%', padding: '9px 12px', borderRadius: 8,
      border: `1px solid ${D.inputBorder}`, background: D.inputBg,
      color: D.text, fontSize: '0.85rem', outline: 'none', cursor: 'pointer',
    },
    btn: (active) => ({
      padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem',
      border: 'none', cursor: active ? 'pointer' : 'not-allowed',
      background: active ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : D.surfaceHi,
      color: active ? '#fff' : D.textSub, transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', gap: 6,
      opacity: active ? 1 : 0.5,
    }),
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: D.textSub }}>
      Loading vehicles &amp; drivers…
    </div>
  )

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === 'error' ? D.redDim : D.greenDim,
          color: toast.type === 'error' ? D.red : D.green,
          border: `1px solid ${toast.type === 'error' ? D.red+'44' : D.green+'44'}`,
          borderRadius: 10, padding: '12px 20px', fontWeight: 700,
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', animation: 'fadeIn 0.2s ease',
        }}>
          {toast.type === 'error' ? <AlertCircle size={16}/> : <Check size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, color: D.text, fontWeight: 800, fontSize: '1rem' }}>
            Driver Assignment
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: D.textSub }}>
            Assign or change the driver for each vehicle
          </p>
        </div>
        <button onClick={load} title="Refresh"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 6 }}>
          <RefreshCw size={16}/>
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: D.textSub }}>
          <Truck size={40} style={{ opacity: 0.25, marginBottom: 12 }}/>
          <p style={{ margin: 0, fontWeight: 700 }}>No vehicles registered yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {vehicles.map(v => {
            const currentDriver = drivers.find(d => d.id === v.assigneeId)
            const isSaving = saving === v.id
            const changed = String(selected[v.id] ?? '') !== String(v.assigneeId ?? '')

            return (
              <div key={v.id} style={s.card}>
                {/* Vehicle info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: D.indigoDim, border: `1px solid ${D.indigo}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.indigo,
                  }}>
                    <Truck size={20}/>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: D.text, fontSize: '0.95rem' }}>
                      {v.registrationNo}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: D.textSub, marginTop: 2 }}>
                      {v.make} {v.model} · {v.year}
                    </div>
                  </div>
                  {/* Assignment status pill */}
                  <span style={{
                    marginLeft: 'auto', flexShrink: 0,
                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 999,
                    background: currentDriver ? D.greenDim : D.surfaceHi,
                    color: currentDriver ? D.green : D.textSub,
                    border: `1px solid ${currentDriver ? D.green+'44' : D.border}`,
                  }}>
                    {currentDriver ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>

                {/* Current driver banner */}
                {currentDriver && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: D.greenDim, border: `1px solid ${D.green}33`,
                    borderRadius: 8, padding: '8px 12px',
                  }}>
                    <img
                      src={currentDriver.profilePicture ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDriver.userName)}&background=10b981&color=fff&bold=true`}
                      alt={currentDriver.userName}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: D.green }}>
                        {currentDriver.userName}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: D.green, opacity: 0.75 }}>
                        Current driver
                      </div>
                    </div>
                    <UserCheck size={15} style={{ marginLeft: 'auto', color: D.green }}/>
                  </div>
                )}

                {/* Driver select dropdown */}
                <div>
                  <div style={s.label}>Assign Driver</div>
                  <select
                    value={selected[v.id] ?? ''}
                    onChange={e => setSelected(prev => ({ ...prev, [v.id]: e.target.value ? Number(e.target.value) : '' }))}
                    style={s.select}
                  >
                    <option value="">— No driver (unassign) —</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.userName} {d.id === v.assigneeId ? '(current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Save button */}
                <button
                  onClick={() => handleAssign(v.id)}
                  disabled={!changed || isSaving}
                  style={s.btn(changed && !isSaving)}
                >
                  {isSaving ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  ) : <Check size={14}/>}
                  {isSaving ? 'Saving…' : changed ? 'Save Assignment' : 'No Changes'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DriverAssignmentTab
