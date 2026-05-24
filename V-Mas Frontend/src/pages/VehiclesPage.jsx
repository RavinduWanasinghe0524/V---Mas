import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { vehicleAPI, userAPI, serviceAPI } from '../services/api'
import { getAlertLevel, computeMileageProgress, computeDateAlert, ALERT_COLORS, fmtKmRemaining, fmtDaysRemaining } from '../utils/serviceAlertUtils'
import { Car, CheckCircle, Wrench, Circle, Search, Edit2, Trash2, AlertTriangle, AlertCircle, X, Check, BellRing, Gauge, Calendar } from 'lucide-react'

const onFocus = e => {
  e.target.style.borderColor = 'rgba(99,102,241,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = ''
  e.target.style.boxShadow = 'none'
}


const StatBadge = ({ label, value, icon, colorDim, colorHex, D }) => (
  <div style={{
    background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
    padding: '20px 22px', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    flex: 1, minWidth: 200, cursor: 'default'
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = D.borderHi; e.currentTarget.style.boxShadow = `0 8px 24px ${colorDim}` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</p>
        <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{value}</p>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: `0 4px 12px ${colorDim}`, flexShrink: 0, border: `1px solid ${colorHex}30` }}>
        {icon}
      </div>
    </div>
  </div>
)

const VehiclesPage = () => {
  const D = useD()

  const statusColors = {
    ACTIVE:    { bg: D.greenDim,  color: D.green,  border: `${D.green}50`  },
    AVAILABLE: { bg: D.blueDim,   color: D.blue,   border: `${D.blue}50`   },
    SERVICE:   { bg: D.orangeDim, color: D.orange, border: `${D.orange}50` },
    INACTIVE:  { bg: D.redDim,    color: D.red,    border: `${D.red}50`    },
  }
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem',
    color: D.text, background: D.inputBg, outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit',
  }
  const labelStyle = {
    display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 700,
    color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.02em',
  }

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const { user, isAdmin, isDriver } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [addError, setAddError] = useState('')
  const [editError, setEditError] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [serviceRecords, setServiceRecords] = useState([])
  const [formData, setFormData] = useState({
    model: '',
    registrationNo: '',
    manufacturer: '',
    year: '',
    fuelType: '',
    driverId: '',
    currentMileageKm: '',
    insuranceExpiryDate: '',
    licenseExpiryDate: ''
  })
  const [editFormData, setEditFormData] = useState({
    model: '',
    registrationNo: '',
    manufacturer: '',
    year: '',
    fuelType: '',
    driverId: '',
    currentMileageKm: '',
    insuranceExpiryDate: '',
    licenseExpiryDate: ''
  })

  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehicleRes, serviceRes] = await Promise.all([
          vehicleAPI.getAllVehicles(),
          serviceAPI.getAllServices(),
        ])
        setVehicles(vehicleRes.data.data || [])
        setServiceRecords(serviceRes.data.data || [])
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [isAdmin, isDriver])

  const openModal = () => setIsModalOpen(true)

  const closeModal = () => {
    setIsModalOpen(false)
    setAddError('')
    setFormData({
      model: '',
      registrationNo: '',
      chassisNumber: '',
      manufacturer: '',
      year: '',
      fuelType: '',
      driverId: '',
      currentMileageKm: '',
      insuranceExpiryDate: '',
      licenseExpiryDate: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAddError('')

    const regRegex = /^([A-Z]{2}-[A-Z]{2,3}-\d{4}|[A-Z]{2,3}-\d{4}|\d{2,3}-\d{4})$/;
    if (!regRegex.test(formData.registrationNo)) {
      setAddError('Invalid registration format. Use WP-WS-3445, WP-ABN-3445, 24-2345, 112-2345, or ABC-1234')
      return;
    }

    try {
      const { driverId, ...rest } = formData
      const vehiclePayload = {
        ...rest,
        year: rest.year ? Number(rest.year) : undefined,
        currentMileageKm: rest.currentMileageKm ? Number(rest.currentMileageKm) : undefined,
        insuranceExpiryDate: rest.insuranceExpiryDate || null,
        licenseExpiryDate: rest.licenseExpiryDate || null,
      }
      const saveRes = await vehicleAPI.registerVehicle(vehiclePayload)
      const saved = saveRes.data.data
      if (driverId && saved?.id) {
        await vehicleAPI.assignDriver(saved.id, driverId)
      }
      const response = await vehicleAPI.getAllVehicles()
      setVehicles(response.data.data || [])
      closeModal()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to add vehicle.'
      setAddError(msg)
      console.error('Error adding vehicle:', err)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle)
    setEditFormData({
      model: vehicle.model || '',
      registrationNo: vehicle.registrationNo || '',
      manufacturer: vehicle.manufacturer || '',
      year: vehicle.year || '',
      fuelType: vehicle.fuelType?.toUpperCase() || '',
      driverId: vehicle.driverId || '',
      currentMileageKm: vehicle.currentMileageKm || '',
      insuranceExpiryDate: vehicle.insuranceExpiryDate || '',
      licenseExpiryDate: vehicle.licenseExpiryDate || ''
    })
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingVehicle(null)
    setEditError('')
    setEditFormData({
      model: '',
      registrationNo: '',
      manufacturer: '',
      year: '',
      fuelType: '',
      driverId: '',
      currentMileageKm: '',
      insuranceExpiryDate: '',
      licenseExpiryDate: ''
    })
  }

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditError('')

    const regRegex = /^([A-Z]{2}-[A-Z]{2,3}-\d{4}|[A-Z]{2,3}-\d{4}|\d{2,3}-\d{4})$/;
    if (!regRegex.test(editFormData.registrationNo)) {
      setEditError('Invalid registration format. Use WP-WS-3445, WP-ABN-3445, 24-2345, 112-2345, or ABC-1234')
      return;
    }

    try {
      await vehicleAPI.updateVehicle(editingVehicle.id, {
        model: editFormData.model,
        registrationNo: editFormData.registrationNo,
        manufacturer: editFormData.manufacturer,
        year: editFormData.year,
        fuelType: editFormData.fuelType.toUpperCase(),
        currentMileageKm: editFormData.currentMileageKm,
        insuranceExpiryDate: editFormData.insuranceExpiryDate || null,
        licenseExpiryDate: editFormData.licenseExpiryDate || null
      })
      // Assign / re-assign driver if changed
      if (editFormData.driverId) {
        await vehicleAPI.assignDriver(editingVehicle.id, editFormData.driverId)
      }
      const response = await vehicleAPI.getAllVehicles()
      setVehicles(response.data.data || [])
      closeEditModal()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update vehicle.'
      setEditError(msg)
      console.error('Error updating vehicle:', err)
    }
  }

  const openDeleteModal = (vehicle) => {
    setDeletingVehicle(vehicle)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingVehicle(null)
  }

  const handleDeleteConfirm = async () => {
    try {
      if (!deletingVehicle) return
      await vehicleAPI.deleteVehicle(deletingVehicle.id)
      const response = await vehicleAPI.getAllVehicles()
      setVehicles(response.data.data || [])
      closeDeleteModal()
    } catch (err) {
      console.error('Error deleting vehicle:', err)
    }
  }


  const filtered = vehicles.filter(v => {
    const matchSearch = v.reg?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()) ||
      v.registrationNo?.toLowerCase().includes(search.toLowerCase()) ||
      v.manufacturer?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || v.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    ACTIVE: vehicles.filter(v => v.status === 'ACTIVE').length,
    AVAILABLE: vehicles.filter(v => v.status === 'AVAILABLE').length,
    SERVICE: vehicles.filter(v => v.status === 'SERVICE').length,
    INACTIVE: vehicles.filter(v => v.status === 'INACTIVE').length,
  }

  // ── Compute service due alerts per vehicle ──
  // Find the most recent service record per vehicle (highest mileage = most recent)
  const vehicleAlerts = vehicles.reduce((acc, v) => {
    const records = serviceRecords.filter(r => r.vehicleRegNumber === v.registrationNo)
    if (records.length === 0) return acc
    // Pick the record with a next-service target (highest service km)
    const relevant = records
      .filter(r => r.nextServiceMileageKm || r.nextServiceDue)
      .sort((a, b) => Number(b.currentMileageKm || 0) - Number(a.currentMileageKm || 0))
    if (relevant.length === 0) return acc
    const record = relevant[0]
    const level = getAlertLevel(record, v.currentMileageKm)
    acc[v.registrationNo] = { record, level, vehicleKm: v.currentMileageKm }
    return acc
  }, {})

  const alertVehicles = Object.entries(vehicleAlerts)
    .filter(([, info]) => info.level === 'DUE_SOON' || info.level === 'OVERDUE')
    .map(([reg, info]) => ({ reg, ...info }))



  return (
    <>
      <div className="app-shell" style={{ background: D.bg }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="Vehicles" subtitle="Home / Vehicles" onMenuToggle={() => setSidebarOpen(o => !o)} />
          <div className="page-body">

            {/* Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
              borderRadius: 20,
              padding: '32px 36px',
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              border: `1px solid ${D.border}`
            }}>
              {/* decorative circles */}
              {[['80%', '−20px', '180px', 'rgba(255,255,255,0.03)'], ['20%', '60%', '120px', 'rgba(255,255,255,0.04)'], ['55%', '80%', '90px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
                <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
              ))}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Car size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Vehicle Fleet
                  </h1>
                  <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                    Manage and monitor all fleet vehicles in the system.
                  </p>
                </div>
              </div>
            </div>

            {/* Service Due Alert Strip */}
            {alertVehicles.length > 0 && (
              <div style={{
                background: D.surface,
                border: `1px solid ${alertVehicles.some(a => a.level === 'OVERDUE') ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`,
                borderRadius: 16,
                marginBottom: 20,
                overflow: 'hidden',
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{
                  padding: '14px 20px',
                  borderBottom: `1px solid ${D.border}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: alertVehicles.some(a => a.level === 'OVERDUE') ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
                }}>
                  <BellRing size={16} style={{ color: alertVehicles.some(a => a.level === 'OVERDUE') ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: D.text }}>Vehicle Service Alerts</span>
                  {alertVehicles.filter(a => a.level === 'OVERDUE').length > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999 }}>
                      {alertVehicles.filter(a => a.level === 'OVERDUE').length} Overdue
                    </span>
                  )}
                  {alertVehicles.filter(a => a.level === 'DUE_SOON').length > 0 && (
                    <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999 }}>
                      {alertVehicles.filter(a => a.level === 'DUE_SOON').length} Due Soon
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, padding: '14px 16px', overflowX: 'auto', scrollbarWidth: 'thin' }}>
                  {alertVehicles.map(({ reg, record, level, vehicleKm }) => {
                    const ac = ALERT_COLORS[level]
                    const mileage = computeMileageProgress(record, vehicleKm)
                    const date    = computeDateAlert(record)
                    return (
                      <div key={reg} style={{
                        flexShrink: 0, minWidth: 220, maxWidth: 250,
                        background: D.bg, border: `1px solid ${ac.border}`,
                        borderRadius: 12, padding: '12px 14px',
                        display: 'flex', flexDirection: 'column', gap: 8,
                        boxShadow: `0 2px 12px ${ac.bg}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: ac.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${ac.border}` }}>
                            <Car size={16} style={{ color: ac.color }} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: D.text }}>{reg}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: D.textSub }}>{record.serviceType?.replace(/_/g, ' ')}</p>
                          </div>
                          <span style={{ marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>{ac.label}</span>
                        </div>
                        {mileage && (
                          <div>
                            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                              <div style={{ width: `${Math.min(mileage.pct, 100)}%`, height: '100%', background: ac.color, borderRadius: 999 }} />
                            </div>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: ac.color, fontWeight: 700 }}>{fmtKmRemaining(mileage.remaining)}</p>
                          </div>
                        )}
                        {date && (
                          <p style={{ margin: 0, fontSize: '0.68rem', color: ac.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} /> {fmtDaysRemaining(date.daysRemaining)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <StatBadge label="Total Vehicles" value={vehicles.length} icon={<Car size={20} />} colorDim={D.purpleDim} colorHex={D.purple} D={D} />
              <StatBadge label="Active" value={counts.ACTIVE} icon={<CheckCircle size={20} />} colorDim={D.greenDim} colorHex={D.green} D={D} />
              <StatBadge label="In Service" value={counts.SERVICE} icon={<Wrench size={20} />} colorDim={D.orangeDim} colorHex={D.orange} D={D} />
              <StatBadge label="Available" value={counts.AVAILABLE} icon={<Circle size={20} />} colorDim={D.blueDim} colorHex={D.blue} D={D} />
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', background: D.surface, padding: '14px 18px', borderRadius: 14, border: `1px solid ${D.border}` }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.textSub, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}><Search size={16} /></span>
                <input
                  type="text"
                  placeholder="Search by reg, make or model…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 36 }}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['ALL', 'ACTIVE', 'AVAILABLE', 'SERVICE', 'INACTIVE'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      padding: '8px 16px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700,
                      border: filter === s ? 'none' : `1px solid ${D.border}`,
                      background: filter === s ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.05)',
                      color: filter === s ? '#fff' : D.textSub,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: filter === s ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                    }}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              {!isDriver && (
                <button
                  onClick={openModal}
                  style={{
                    padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)' }}
                >
                  + Add Vehicle
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: D.surfaceHi }}>
                    <tr>
                      {['Reg. No.', 'Make / Model', 'Year', 'Fuel Type', 'Mileage (km)', 'Next Service', 'Status', ...(isAdmin ? ['Last Modified'] : []), ...(!isDriver ? ['Actions'] : [])].map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} style={{ padding: '60px 32px', textAlign: 'center', color: D.textSub }}>
                          <div style={{ marginBottom: 12, opacity: 0.3, display: 'flex', justifyContent: 'center' }}><Car size={48} /></div>
                          <p style={{ fontWeight: 700, fontSize: '1rem', color: D.text, margin: '0 0 6px' }}>No vehicles found.</p>
                          <p style={{ margin: 0, fontSize: '0.85rem' }}>Try adjusting your search or filters.</p>
                        </td>
                      </tr>
                    ) : filtered.map((v, i) => {
                      const s = statusColors[v.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
                      return (
                        <tr key={v.id} style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: D.blue }}>{v.registrationNo ?? 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: D.text, fontWeight: 600 }}>{v.manufacturer ?? 'N/A'} {v.model ?? 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: D.textSub }}>{v.year ?? 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: D.textSub }}>{v.fuelType ?? 'N/A'}</td>

                          <td style={{ padding: '14px 16px', color: D.textSub }}>{v.currentMileageKm ? `${v.currentMileageKm} km` : 'N/A'}</td>
                          {/* Next Service Status */}
                          <td style={{ padding: '14px 16px' }}>
                            {(() => {
                              const info = vehicleAlerts[v.registrationNo]
                              if (!info) return <span style={{ color: D.textFaint, fontSize: '0.75rem' }}>—</span>
                              const ac = ALERT_COLORS[info.level] || ALERT_COLORS.OK
                              const mileage = computeMileageProgress(info.record, info.vehicleKm)
                              const date    = computeDateAlert(info.record)
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, display: 'inline-block', width: 'fit-content' }}>
                                    {ac.label}
                                  </span>
                                  {mileage && (
                                    <div style={{ minWidth: 100 }}>
                                      <div style={{ height: 4, background: 'rgba(128,128,128,0.2)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(mileage.pct, 100)}%`, height: '100%', background: ac.color, borderRadius: 999 }} />
                                      </div>
                                      <span style={{ fontSize: '0.62rem', color: ac.color, fontWeight: 700 }}>{fmtKmRemaining(mileage.remaining)}</span>
                                    </div>
                                  )}
                                  {date && !mileage && (
                                    <span style={{ fontSize: '0.62rem', color: ac.color, fontWeight: 700 }}>{fmtDaysRemaining(date.daysRemaining)}</span>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', border: `1px solid ${s.border}` }}>
                              {v.status ?? 'N/A'}
                            </span>
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                              {v.updatedBy ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: D.purple }}>{v.updatedBy}</span>
                                  <span style={{ fontSize: '0.7rem', color: D.textSub }}>
                                    {v.updatedAt ? new Date(v.updatedAt).toLocaleString() : ''}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: D.textFaint, fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>
                          )}
                          {!isDriver && (
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => openEditModal(v)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#a5b4fc' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text }}>
                                  <Edit2 size={14} style={{ marginRight: 6 }} /> Edit
                                </button>
                                <button onClick={() => openDeleteModal(v)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}>
                                  <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* ── Add Modal ──────────────────────────────────────────────── */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 540, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
              <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: D.purpleDim, color: D.purple, border: `1px solid ${D.purple}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={20} />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Add New Vehicle</h3>
                </div>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={labelStyle}>Manufacturer <span style={{ color: D.red }}>*</span></label>
                    <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. Toyota" />
                  </div>
                  <div>
                    <label style={labelStyle}>Model <span style={{ color: D.red }}>*</span></label>
                    <input type="text" name="model" value={formData.model} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. Hilux" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Registration Number <span style={{ color: D.red }}>*</span></label>
                    <input type="text" name="registrationNo" value={formData.registrationNo} onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value.toUpperCase() })} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. WP-CAB-1234, 24-2345, 112-2345" />
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: D.textFaint }}>Format: WP-WS-3445, WP-ABN-3445, 24-2345, 112-2345, ABC-1234</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Year <span style={{ color: D.red }}>*</span></label>
                    <input type="number" min={1985} name="year" value={formData.year} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 2020" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type <span style={{ color: D.red }}>*</span></label>
                    <select name="fuelType" value={formData.fuelType} onChange={handleChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Fuel Type</option>
                      <option value="PETROL" style={{ background: D.surfaceHi }}>Petrol</option>
                      <option value="DIESEL" style={{ background: D.surfaceHi }}>Diesel</option>
                      <option value="ELECTRIC" style={{ background: D.surfaceHi }}>Electric</option>
                      <option value="HYBRID" style={{ background: D.surfaceHi }}>Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="currentMileageKm" value={formData.currentMileageKm} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 15000" />
                  </div>

                  <div>
                    <label style={labelStyle}>Insurance Expiry</label>
                    <input type="date" name="insuranceExpiryDate" value={formData.insuranceExpiryDate} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>License Expiry</label>
                    <input type="date" name="licenseExpiryDate" value={formData.licenseExpiryDate} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
                {addError && (
                  <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: D.red, fontSize: '0.83rem', fontWeight: 600 }}>
                    ⚠ {addError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Check size={16} /> Add Vehicle
                  </button>
                  <button type="button" onClick={closeModal} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Modal ─────────────────────────────────────────────── */}
        {isEditModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 540, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
              <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: D.indigoDim, color: D.indigo, border: `1px solid ${D.indigo}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Edit Vehicle</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: D.textSub }}>{editingVehicle?.registrationNo}</p>
                  </div>
                </div>
                <button onClick={closeEditModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleEditSubmit} style={{ padding: '24px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={labelStyle}>Manufacturer</label>
                    <input type="text" name="manufacturer" value={editFormData.manufacturer} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Model</label>
                    <input type="text" name="model" value={editFormData.model} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Registration Number</label>
                    <input type="text" name="registrationNo" value={editFormData.registrationNo} onChange={(e) => setEditFormData({ ...editFormData, registrationNo: e.target.value.toUpperCase() })} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: D.textFaint }}>Format: WP-WS-3445, WP-ABN-3445, 24-2345, 112-2345, ABC-1234</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Year</label>
                    <input type="number" min={1985} name="year" value={editFormData.year} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type</label>
                    <select name="fuelType" value={editFormData.fuelType} onChange={handleEditChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Fuel Type</option>
                      <option value="PETROL" style={{ background: D.surfaceHi }}>Petrol</option>
                      <option value="DIESEL" style={{ background: D.surfaceHi }}>Diesel</option>
                      <option value="ELECTRIC" style={{ background: D.surfaceHi }}>Electric</option>
                      <option value="HYBRID" style={{ background: D.surfaceHi }}>Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Current Mileage (km)</label>
                    <input type="number" name="currentMileageKm" value={editFormData.currentMileageKm} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  <div>
                    <label style={labelStyle}>Insurance Expiry</label>
                    <input type="date" name="insuranceExpiryDate" value={editFormData.insuranceExpiryDate} onChange={handleEditChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>License Expiry</label>
                    <input type="date" name="licenseExpiryDate" value={editFormData.licenseExpiryDate} onChange={handleEditChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
                {editError && (
                  <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: D.red, fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={14} /> {editError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Check size={16} /> Save Changes
                  </button>
                  <button type="button" onClick={closeEditModal} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Delete Modal ───────────────────────────────────────────── */}
        {isDeleteModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: D.surface, borderRadius: 20, padding: 36, width: '90%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: D.redDim, color: D.red, border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontWeight: 800, color: D.text, fontSize: '1.1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Confirm Deletion</h3>
              <p style={{ margin: '0 0 24px', color: D.textSub, fontSize: '0.9rem', lineHeight: 1.6 }}>
                Are you sure you want to delete vehicle <strong style={{ color: D.text }}>{deletingVehicle?.registrationNo}</strong> ({deletingVehicle?.manufacturer} {deletingVehicle?.model})? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={closeDeleteModal} style={{ flex: 1, padding: '10px 20px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.15s' }}>Cancel</button>
                <button type="button" onClick={handleDeleteConfirm} style={{ flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none', background: D.red, color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                  <Trash2 size={16} style={{ marginRight: 6 }} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  )
}

export default VehiclesPage
