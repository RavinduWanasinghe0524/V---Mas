import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD, useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { fuelAPI, vehicleAPI, tripAPI } from '../services/api'
import { addDriverNotification } from '../services/notificationService'
import { Fuel, CircleDollarSign, BarChart2, Car, Check, X, Plus, Loader2, Calendar, Gauge } from 'lucide-react'

import { computeLogsEfficiency, formatFuelType, getFuelLogType } from '../utils/fuelUtils'

// ── Shared fuel-type badge helper ──────────────────────────────────────
const fuelBadge = (ft, D) => {
  const clean = (ft || '').toUpperCase().replace('_', ' ');
  if (clean.includes('PETROL 92') || clean === 'PETROL') {
    return { color: D.gold, bg: D.goldDim };
  }
  if (clean.includes('PETROL 95') || clean === 'SUPER PETROL') {
    return { color: '#ea580c', bg: 'rgba(234,88,12,0.12)' };
  }
  if (clean.includes('AUTO DIESEL') || clean === 'DIESEL') {
    return { color: D.indigo, bg: D.indigoDim };
  }
  if (clean.includes('SUPER DIESEL')) {
    return { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' };
  }
  if (clean.includes('HYBRID')) {
    return { color: D.green, bg: D.greenDim };
  }
  if (clean.includes('ELECTRIC')) {
    return { color: D.blue, bg: D.blueDim };
  }
  return { color: D.textSub, bg: D.surfaceHi };
}

const approvalBadge = (status, D) => {
  const s = (status || 'APPROVED').toUpperCase()
  if (s === 'PENDING') return { label: 'Pending', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' }
  if (s === 'REJECTED') return { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' }
  return { label: 'Approved', bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' }
}



const FuelLogPage = () => {
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'
  const { user } = useAuth()

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${D.inputBorder}`,
    fontSize: '0.85rem',
    color: D.text,
    background: D.inputBg,
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: 6,
    fontSize: '0.78rem',
    fontWeight: 700,
    color: D.textSub,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  }

  const onFocus = e => {
    e.target.style.borderColor = D.indigo
    e.target.style.boxShadow = `0 0 0 3px ${D.indigoDim}`
  }
  const onBlur = e => {
    e.target.style.borderColor = D.inputBorder
    e.target.style.boxShadow = 'none'
  }
  
  // State for fuel logs
  const [myVehicleLogs, setMyVehicleLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [allVehicles, setAllVehicles] = useState([])
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [myAssignedVehicle, setMyAssignedVehicle] = useState(null)

  const [formData, setFormData] = useState({
    vehicleRegNumber: '',
    fuelType: 'Diesel',
    liters: '',
    costPerLiter: '',
    chargingCost: '',
    mileage: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [previousMileage, setPreviousMileage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Load fuel logs
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [logsRes, vehicleRes, tripsRes, myVehicleRes] = await Promise.allSettled([
          fuelAPI.getMyLogs(),
          vehicleAPI.getAllVehicles(),
          user?.role === 'DRIVER' ? tripAPI.getMyTrips() : Promise.resolve(null),
          user?.role === 'DRIVER' ? vehicleAPI.getMyVehicle() : Promise.resolve(null)
        ])
        
        let driverVeh = null
        if (myVehicleRes && myVehicleRes.status === 'fulfilled' && myVehicleRes.value) {
          driverVeh = myVehicleRes.value.data?.data || null
          setMyAssignedVehicle(driverVeh)
        }

        if (logsRes.status === 'fulfilled') {
          const logs = (logsRes.value.data.data || []).filter(log => !log.isDeleted)
          const vehList = vehicleRes.status === 'fulfilled' ? (vehicleRes.value.data.data || []) : []
          computeLogsEfficiency(logs, vehList)
          // Sort newest-first so logs[0] is always the most recent entry
          const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))
          
          // Filter logs to show only the driver's assigned vehicle logs
          const filtered = (user?.role === 'DRIVER' && driverVeh)
            ? sorted.filter(log => log.vehicleRegNumber === driverVeh.registrationNo)
            : sorted
          setMyVehicleLogs(filtered)
        }
        
        if (vehicleRes.status === 'fulfilled') {
          const vList = vehicleRes.value.data.data || []
          setAllVehicles(vList)
        }

        if (tripsRes && tripsRes.status === 'fulfilled' && tripsRes.value) {
          const tripsList = tripsRes.value.data?.data || []
          const activeStartedTrip = tripsList.find(t => (t.status || '').toUpperCase() === 'STARTED')
          setActiveTrip(activeStartedTrip || null)
        }
      } catch (err) {
        console.error('Error loading fuel log data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  // Pre-fill active trip or assigned vehicle when opening modal
  useEffect(() => {
    if (showAddModal && allVehicles.length > 0) {
      let reg = null
      if (user?.role === 'DRIVER' && myAssignedVehicle) {
        reg = myAssignedVehicle.registrationNo
      } else if (activeTrip?.vehicleRegNumber) {
        reg = activeTrip.vehicleRegNumber
      }

      if (reg) {
        const selectedVehicle = allVehicles.find(v => v.registrationNo === reg)
        setSelectedVehicleInfo(selectedVehicle || null)
        
        const vehicleLogs = myVehicleLogs.filter(log => log.vehicleRegNumber === reg)
        const lastLogMil = vehicleLogs.length > 0 ? Number(vehicleLogs[0].mileage) : 0
        const vehicleMil = selectedVehicle?.currentMileageKm ? Number(selectedVehicle.currentMileageKm) : 0
        const baselineMil = Math.max(lastLogMil, vehicleMil) || null
        setPreviousMileage(baselineMil)

        setFormData(prev => ({
          ...prev,
          vehicleRegNumber: reg,
          fuelType: selectedVehicle?.fuelType ? getFuelLogType(selectedVehicle.fuelType) : prev.fuelType,
          mileage: baselineMil != null ? String(baselineMil) : '',
          chargingCost: '',
          liters: '',
          costPerLiter: '',
        }))
        setMileageError('')
      }
    }
  }, [showAddModal, activeTrip, allVehicles, myVehicleLogs, myAssignedVehicle, user])

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'vehicleRegNumber') {
        const selectedVehicle = allVehicles.find(v => v.registrationNo === value)
        setSelectedVehicleInfo(selectedVehicle || null)
        if (selectedVehicle?.fuelType) {
          updated.fuelType = getFuelLogType(selectedVehicle.fuelType)
        }
        // Reset EV charging cost when switching vehicles
        updated.chargingCost = ''

        // Connect baseline mileage with last fuel log and the live dynamic daily odometer reading
        const vehicleLogs = myVehicleLogs.filter(log => log.vehicleRegNumber === value)
        const lastLogMil = vehicleLogs.length > 0 ? Number(vehicleLogs[0].mileage) : 0
        const vehicleMil = selectedVehicle?.currentMileageKm ? Number(selectedVehicle.currentMileageKm) : 0

        const baselineMil = Math.max(lastLogMil, vehicleMil) || null
        setPreviousMileage(baselineMil)
        updated.mileage = baselineMil != null ? String(baselineMil) : ''
        setMileageError('')
      }
      return updated
    })
  }

  // Mileage validation error
  const [mileageError, setMileageError] = useState('')

  const handleMileageChange = (e) => {
    const val = e.target.value
    setFormData(prev => ({ ...prev, mileage: val }))
    if (previousMileage != null && val !== '' && parseFloat(val) < previousMileage) {
      setMileageError(`Must be ≥ previous reading (${previousMileage.toFixed(1)} km)`)
    } else {
      setMileageError('')
    }
  }

  // Handle form submit
  const handleAddFuelLog = async (e) => {
    e.preventDefault()

    if (previousMileage != null && parseFloat(formData.mileage) < previousMileage) {
      setMileageError(`Must be ≥ previous reading (${previousMileage.toFixed(1)} km)`)
      return
    }

    const isEV = false
    setSubmitting(true)
    const prevMilDrv = previousMileage
    
    try {
      const payload = {
        vehicleRegNumber: formData.vehicleRegNumber,
        fuelType: formData.fuelType,
        liters: parseFloat(formData.liters),
        costPerLiter: parseFloat(formData.costPerLiter),
        mileage: parseFloat(formData.mileage),
        date: formData.date
      }
      
      await fuelAPI.addFuelLog(payload)
      
      // Reload driver's own logs via the correct endpoint
      const logsRes = await fuelAPI.getMyLogs()
      const rawLogs = (logsRes.data.data || []).filter(log => !log.isDeleted)
      computeLogsEfficiency(rawLogs, allVehicles)
      // Sort newest-first so the latest mileage is always at index 0
      const updatedLogs = [...rawLogs].sort((a, b) => new Date(b.date) - new Date(a.date))
      setMyVehicleLogs(updatedLogs)

      // Update previous mileage hint & pre-fill for next entry for the current vehicle
      const vehicleLogs = updatedLogs.filter(log => log.vehicleRegNumber === formData.vehicleRegNumber)
      const newLastMil = vehicleLogs.length > 0 ? vehicleLogs[0].mileage : null
      setPreviousMileage(newLastMil)

      // Reset form — pre-fill mileage with latest reading
      const selectedVehicle = allVehicles.find(v => v.registrationNo === formData.vehicleRegNumber)
      setFormData({
        vehicleRegNumber: formData.vehicleRegNumber,
        fuelType: selectedVehicle?.fuelType
          ? getFuelLogType(selectedVehicle.fuelType)
          : formData.fuelType,
        liters: '',
        costPerLiter: '',
        chargingCost: '',
        mileage: newLastMil != null ? String(newLastMil) : '',
        date: new Date().toISOString().split('T')[0]
      })
      setShowAddModal(false)

      // Notify the driver via the bell
      addDriverNotification(
        isEV
          ? `⚡ Charging log added — Rs.${Math.round(formData.chargingCost).toLocaleString()} for ${payload.vehicleRegNumber} (${payload.mileage} km on ${payload.date})`
          : `⛽ Fuel log added — ${payload.liters} L @ Rs.${payload.costPerLiter}/L for ${payload.vehicleRegNumber} (${payload.mileage} km on ${payload.date})`,
        'FUEL_ADD',
        '/fuel-log'
      )
      // ── Low efficiency alert for driver (non-EV only) ─────────────────
      if (!isEV && prevMilDrv != null && payload.mileage > prevMilDrv && payload.liters > 0) {
        const eff = (payload.mileage - prevMilDrv) / payload.liters
        if (eff < 5) {
          addDriverNotification(
            `⚠️ Low Efficiency Alert: Your fill-up for ${payload.vehicleRegNumber} recorded only ${eff.toFixed(2)} km/L (Poor). Please report this to your controller.`,
            'FUEL_LOW_EFF',
            '/fuel-analysis'
          )
        }
      }
    } catch (error) {
      console.error('Error adding fuel log:', error)
      alert('Failed to add fuel log: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate statistics
  const totalLiters = myVehicleLogs.reduce((sum, log) => sum + log.liters, 0)
  const totalCost = myVehicleLogs.reduce((sum, log) => sum + log.totalCost, 0)
  const avgEfficiency = myVehicleLogs.filter(log => log.fuelEfficiency).length > 0
    ? myVehicleLogs.filter(log => log.fuelEfficiency).reduce((sum, log) => sum + log.fuelEfficiency, 0) / myVehicleLogs.filter(log => log.fuelEfficiency).length
    : 0
  const lastMileage = myVehicleLogs.length > 0 ? myVehicleLogs[0].mileage : 0

  if (loading) {
    return (
      <div className="app-shell" style={{ background: D.bg }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="Fuel Log" subtitle="Home / Fuel Log" onMenuToggle={() => setSidebarOpen(o => !o)} />
          <div className="page-body" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
            <div style={{ color:D.indigo, fontSize:'1rem', fontWeight:600 }}>Loading fuel logs...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Fuel Log" subtitle="Home / Fuel Log" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body">

          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)',
            borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
             boxShadow: isDark
               ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px var(--primary-glow), inset 0 1px 0 rgba(255,255,255,0.04)'
               : '0 16px 48px rgba(0,0,0,0.15), 0 8px 32px var(--primary-glow)',
             border: '1px solid var(--border-strong)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
          }}>
            {/* decorative circles */}
            {[['80%', '-20px', '220px', 'rgba(255,255,255,0.02)'], ['20%', '60%', '150px', 'rgba(255,255,255,0.02)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.01)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            {/* Neon radial glow for dark */}
            {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  My Fuel Log
                </h1>
                <p style={{ margin: '6px 0 0', color: '#f8fafc', fontSize: '0.88rem', fontWeight: 500 }}>
                  Keep track of your fill-ups, mileage, fuel efficiency and costs.
                </p>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
            {[
              { label: 'Total Fuel (L)', value: totalLiters.toFixed(1), icon: <Fuel size={24}/>, colorDim: D.purpleDim, colorHex: D.purple },
              { label: 'Total Spent', value: `Rs. ${Math.round(totalCost).toLocaleString()}`, icon: <CircleDollarSign size={24}/>, colorDim: D.greenDim, colorHex: D.green },
              { label: 'Avg Efficiency', value: avgEfficiency > 0 ? `${avgEfficiency.toFixed(2)} km/L` : 'N/A', icon: <BarChart2 size={24}/>, colorDim: D.indigoDim, colorHex: D.indigo },
              { label: 'Last Mileage', value: lastMileage > 0 ? `${lastMileage.toFixed(0)} km` : 'N/A', icon: <Car size={24}/>, colorDim: D.goldDim, colorHex: D.gold },
            ].map(s => (
              <div key={s.label} style={{
                background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`,
                padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default',
                boxShadow: '0 4px 24px rgba(0,0,0,0.25)'
              }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = s.colorHex + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${s.colorHex}20` }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: s.colorDim, color: s.colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.colorHex}30`, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Fuel Log Button */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 24px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 8px 24px rgba(37, 99, 235,0.3)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(37, 99, 235,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235,0.3)' }}
            >
              <Plus size={20} strokeWidth={3}/> Add New Fuel Log
            </button>
          </div>

          {/* ADD FUEL LOG MODAL (Moved to bottom of file) */}

          {/* Fuel Logs Table */}
          <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 32px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '1.1rem' }}>Fuel Log History</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: D.textSub }}>Recent fuel logs for your vehicle</p>
              </div>
              <div style={{ fontSize: '0.9rem', color: D.textSub, fontWeight: 700, background: D.surface, padding: '8px 16px', borderRadius: 12, border: `1px solid ${D.border}` }}>
                <span style={{ color: D.purple }}>{myVehicleLogs.length}</span> {myVehicleLogs.length === 1 ? 'Entry' : 'Entries'}
              </div>
            </div>
            
            <div style={{ maxHeight: 600, overflowY: 'auto', padding: '24px 32px 40px' }}>
              {myVehicleLogs.length === 0 ? (
                <div style={{ padding: '80px 0', textAlign: 'center' }}>
                  <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                    <Fuel size={36} opacity={0.3} />
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>No Fuel Logs Yet</h4>
                  <p style={{ margin: '10px 0 20px', color: D.textSub, fontSize: '1rem', fontWeight: 500 }}>Start tracking your vehicle's fuel consumption by adding your first log entry.</p>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(37, 99, 235,0.3)' }}
                  >
                    + Add Your First Fuel Log
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  {myVehicleLogs.map((log, i) => {
                    const statusBadge = log.fuelEfficiency ? (
                      log.fuelEfficiency > 10 ? { label: 'Excellent', bg: D.greenDim, color: D.green, border: 'rgba(74,222,128,0.3)' } :
                      log.fuelEfficiency > 7 ? { label: 'Good', bg: D.blueDim, color: D.blue, border: 'rgba(96,165,250,0.3)' } :
                      log.fuelEfficiency > 5 ? { label: 'Average', bg: D.goldDim, color: D.gold, border: 'rgba(251,191,36,0.3)' } :
                      { label: 'Poor', bg: D.redDim, color: D.red, border: 'rgba(248,113,113,0.3)' }
                    ) : { label: 'N/A', bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border };
                    
                    return (
                      <div key={log.id} className="fuel-log-row" style={{
                        background: D.surface, borderRadius: 20, border: `1px solid ${D.border}`,
                        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }} onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>
                        
                        <div style={{ width: 140, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', color: D.text, fontWeight: 800 }}>
                            <Calendar size={18} color={D.textSub} strokeWidth={2.5} /> {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                             {(() => { const fb = fuelBadge(log.fuelType, D); return <span style={{ fontSize: '0.75rem', color: fb.color, fontWeight: 800, textTransform: 'uppercase', background: fb.bg, padding: '3px 10px', borderRadius: 6, border: `1px solid ${fb.color}30`, display: 'flex', alignItems: 'center', gap: 4 }}>{formatFuelType(log.fuelType)}</span> })()}
                             {(() => { const ab = approvalBadge(log.status, D); return <span style={{ fontSize: '0.75rem', color: ab.color, fontWeight: 800, textTransform: 'uppercase', background: ab.bg, padding: '3px 10px', borderRadius: 6, border: `1px solid ${ab.border}`, display: 'flex', alignItems: 'center', gap: 4 }}>{ab.label}</span> })()}
                          </div>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 40 }}>
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Volume</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{log.liters.toFixed(1)} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>L</span></div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Cost/L</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: D.textSub }}>Rs. {(log.costPerLiter || 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Cost</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: D.green }}>Rs. {log.totalCost.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mileage</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>{log.mileage.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>km</span></div>
                          </div>
                        </div>
                        
                        <div style={{ width: 140, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 12, background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`, boxShadow: `0 4px 12px ${statusBadge.color}15` }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{statusBadge.label}</span>
                            {log.fuelEfficiency && <span style={{ fontWeight: 950, fontSize: '1rem' }}>{log.fuelEfficiency.toFixed(1)}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── ADD FUEL LOG MODAL ────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={() => { if (!submitting) setShowAddModal(false) }}>
          <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Plus size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Record Fuel Entry</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600, opacity: 0.9 }}>Enter the latest fill-up data for analysis</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
            </div>

            <form onSubmit={handleAddFuelLog} style={{ padding: '36px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 40 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  {activeTrip && (
                    <div style={{
                      marginBottom: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      fontSize: '0.8rem',
                      color: D.textSub,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ color: D.indigo, fontWeight: 700 }}>⚠️ Active Trip:</span>
                      You are currently on an active trip. You can only log fuel for the vehicle assigned to this trip ({activeTrip.vehicleRegNumber}).
                    </div>
                  )}
                  {user?.role === 'DRIVER' && !myAssignedVehicle && !activeTrip && (
                    <div style={{
                      marginBottom: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      fontSize: '0.8rem',
                      color: D.red,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      ⚠️ You do not have an assigned vehicle. Please contact your controller to assign a vehicle to you before logging fuel.
                    </div>
                  )}
                  {user?.role === 'DRIVER' && myAssignedVehicle && !activeTrip && (
                    <div style={{
                      marginBottom: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      fontSize: '0.8rem',
                      color: D.green,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      📝 Logging fuel for your assigned vehicle ({myAssignedVehicle.registrationNo}).
                    </div>
                  )}
                  <label style={labelStyle}>Vehicle <span style={{ color: D.red }}>*</span></label>
                  <select
                    name="vehicleRegNumber"
                    value={formData.vehicleRegNumber}
                    onChange={handleInputChange}
                    required
                    style={{ ...inputStyle, cursor: (activeTrip || (user?.role === 'DRIVER' && myAssignedVehicle)) ? 'not-allowed' : 'pointer' }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    disabled={!!activeTrip || (user?.role === 'DRIVER' && !!myAssignedVehicle)}
                  >
                    {activeTrip ? (
                      (() => {
                        const v = allVehicles.find(veh => veh.registrationNo === activeTrip.vehicleRegNumber);
                        return (
                          <option value={activeTrip.vehicleRegNumber} style={{ background: D.surfaceHi }}>
                            {activeTrip.vehicleRegNumber} {v ? `— ${v.manufacturer} ${v.model}` : ''}
                          </option>
                        );
                      })()
                    ) : user?.role === 'DRIVER' && myAssignedVehicle ? (
                      <option value={myAssignedVehicle.registrationNo} style={{ background: D.surfaceHi }}>
                        {myAssignedVehicle.registrationNo} — {myAssignedVehicle.manufacturer} {myAssignedVehicle.model}
                      </option>
                    ) : (
                      <>
                        <option value="" style={{ background: D.surfaceHi }}>— Select a vehicle —</option>
                        {allVehicles.map(v => (
                          <option key={v.id} value={v.registrationNo} style={{ background: D.surfaceHi }}>
                            {v.registrationNo} — {v.manufacturer} {v.model} {v.currentMileageKm ? `(${v.currentMileageKm.toLocaleString()} km)` : ''}
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  {/* Live vehicle info card — shown when a vehicle is selected */}
                  {selectedVehicleInfo && (
                    <div style={{
                      marginTop: 10,
                      background: D.bg,
                      border: `1px solid ${D.border}`,
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap'
                    }}>
                      {/* Current mileage */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 140 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: D.blueDim, color: D.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.blue}30`, flexShrink: 0 }}>
                          <Gauge size={17} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Mileage</div>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: D.text }}>
                            {selectedVehicleInfo.currentMileageKm != null
                              ? <>{selectedVehicleInfo.currentMileageKm.toLocaleString()} <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 600 }}>km</span></>
                              : <span style={{ color: D.textFaint, fontSize: '0.82rem' }}>Not recorded</span>}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ width: 1, height: 36, background: D.border }} />

                      {/* Vehicle info */}
                      <div style={{ flex: 2, minWidth: 160 }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Vehicle</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: D.text }}>
                          {selectedVehicleInfo.manufacturer} {selectedVehicleInfo.model}
                          {selectedVehicleInfo.year && <span style={{ color: D.textSub, fontWeight: 500 }}> ({selectedVehicleInfo.year})</span>}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ flexShrink: 0 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          background: selectedVehicleInfo.status === 'ACTIVE' ? D.greenDim
                                    : selectedVehicleInfo.status === 'AVAILABLE' ? D.blueDim
                                    : selectedVehicleInfo.status === 'SERVICE' ? D.orangeDim
                                    : D.redDim,
                          color: selectedVehicleInfo.status === 'ACTIVE' ? D.green
                               : selectedVehicleInfo.status === 'AVAILABLE' ? D.blue
                               : selectedVehicleInfo.status === 'SERVICE' ? D.orange
                               : D.red,
                        }}>
                          {selectedVehicleInfo.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>


                <div>
                  <label style={labelStyle}>Transaction Date <span style={{ color: D.red }}>*</span></label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>

                <div>
                  <label style={labelStyle}>Fuel Type</label>
                  <div style={{
                    ...inputStyle,
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: D.surfaceHi,
                    cursor: 'default',
                    color: formData.vehicleRegNumber ? D.text : D.textFaint,
                    border: `1px solid ${D.border}`
                  }}>
                    {formData.vehicleRegNumber ? (
                      <>
                        {(() => {
                          const fb = fuelBadge(formData.fuelType, D);
                          return (
                            <span style={{
                              background: fb.bg,
                              color: fb.color,
                              fontWeight: 800, fontSize: '0.78rem', padding: '3px 10px',
                              borderRadius: 6, textTransform: 'uppercase'
                            }}>
                              {formatFuelType(formData.fuelType)}
                            </span>
                          );
                        })()}
                        <span style={{ fontSize: '0.78rem', color: D.textSub }}>Set at vehicle registration — cannot be changed</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.82rem', fontStyle: 'italic' }}>Auto-filled when vehicle is selected</span>
                    )}
                  </div>
                </div>
                
                
                <>
                  <div>
                    <label style={labelStyle}>Volume Dispensed (L) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="liters" value={formData.liters} onChange={handleInputChange} step="0.01" min="0" required placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Unit Price (LKR/L) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="costPerLiter" value={formData.costPerLiter} onChange={handleInputChange} step="0.01" min="0" required placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </>
                
                <div>
                  <label style={labelStyle}>Odometer Reading (km) <span style={{ color: D.red }}>*</span></label>
                  <input type="number" name="mileage" value={formData.mileage} onChange={handleMileageChange} step="0.1" required placeholder="0.0" style={{ ...inputStyle, ...(mileageError ? { borderColor: D.red, boxShadow: `0 0 0 4px ${D.red}20` } : {}) }} onFocus={onFocus} onBlur={onBlur} />
                  {mileageError ? (
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.red, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>⚠ {mileageError}</p>
                  ) : selectedVehicleInfo ? (
                    <div style={{ margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {selectedVehicleInfo.currentMileageKm != null && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: D.textFaint, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Gauge size={12} style={{ color: D.blue }} />
                          Vehicle registered mileage: <span style={{ color: D.blue, fontWeight: 800 }}>{selectedVehicleInfo.currentMileageKm.toLocaleString()} km</span>
                        </p>
                      )}
                      {previousMileage != null && previousMileage !== selectedVehicleInfo.currentMileageKm && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: D.textFaint, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: D.purple }}>↑</span>
                          Last fuel log reading: <span style={{ color: D.purple, fontWeight: 800 }}>{previousMileage.toLocaleString()} km</span>
                        </p>
                      )}
                    </div>
                  ) : previousMileage != null ? (
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: D.textFaint, fontWeight: 600 }}>Last reading: <span style={{ color: D.purple }}>{previousMileage.toLocaleString()} km</span></p>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20 }}>
                <button
                  type="submit"
                  disabled={submitting || (user?.role === 'DRIVER' && !myAssignedVehicle && !activeTrip)}
                  style={{
                    flex: 2,
                    padding: '16px',
                    borderRadius: 18,
                    border: 'none',
                    background: (submitting || (user?.role === 'DRIVER' && !myAssignedVehicle && !activeTrip))
                      ? 'rgba(37, 99, 235,0.3)'
                      : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff',
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    cursor: (submitting || (user?.role === 'DRIVER' && !myAssignedVehicle && !activeTrip)) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: (submitting || (user?.role === 'DRIVER' && !myAssignedVehicle && !activeTrip)) ? 'none' : '0 10px 25px rgba(37, 99, 235,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10
                  }}
                  onMouseEnter={e => { if(!submitting && !(user?.role === 'DRIVER' && !myAssignedVehicle && !activeTrip)) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(37, 99, 235,0.5)' } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = (submitting || (user?.role === 'DRIVER' && !myAssignedVehicle && !activeTrip)) ? 'none' : '0 10px 25px rgba(37, 99, 235,0.4)' }}
                >
                  {submitting ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
                  {submitting ? 'Processing Entry...' : 'Complete Fuel Entry'}
                </button>
                <button type="button" disabled={submitting} onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '16px', borderRadius: 18, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub, fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = D.border} onMouseLeave={e => e.currentTarget.style.background = D.surfaceHi}>Discard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default FuelLogPage
