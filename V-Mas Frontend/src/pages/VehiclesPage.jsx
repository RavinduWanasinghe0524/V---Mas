import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { vehicleAPI, userAPI, serviceAPI, fuelAPI } from '../services/api'
import { getAlertLevel, computeMileageProgress, computeDateAlert, ALERT_COLORS, fmtKmRemaining, fmtDaysRemaining } from '../utils/serviceAlertUtils'
import { Car, CheckCircle, Wrench, Circle, Search, Edit2, Trash2, AlertTriangle, AlertCircle, X, Check, BellRing, Gauge, Calendar, Eye, Fuel, User, Clock, ArrowUpRight, Info, Plus } from 'lucide-react'

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
    background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden', padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default'
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = colorHex + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${colorHex}20` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, background: colorDim, color: colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colorHex}30`, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{value}</div>
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
  const location = useLocation()
  const navigate = useNavigate()



  const [addError, setAddError] = useState('')
  const [editError, setEditError] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [serviceRecords, setServiceRecords] = useState([])

  // --- VEHICLE PROFILE STATE ---
  const [selectedProfileVehicle, setSelectedProfileVehicle] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileActiveTab, setProfileActiveTab] = useState('overview')
  const [profileFuelLogs, setProfileFuelLogs] = useState([])
  const [loadingProfileFuel, setLoadingProfileFuel] = useState(false)

  const openProfile = async (vehicle) => {
    setSelectedProfileVehicle(vehicle)
    setProfileActiveTab('overview')
    setIsProfileOpen(true)
    setLoadingProfileFuel(true)
    try {
      const res = await fuelAPI.getLogsByVehicle(vehicle.registrationNo)
      setProfileFuelLogs(res.data.data || [])
    } catch (err) {
      console.error('Error fetching fuel logs for profile:', err)
      setProfileFuelLogs([])
    } finally {
      setLoadingProfileFuel(false)
    }
  }

  const closeProfile = () => {
    setIsProfileOpen(false)
    setSelectedProfileVehicle(null)
    setProfileFuelLogs([])
  }

  useEffect(() => {
    if (!loading && vehicles.length > 0 && location.state?.openVehicleProfile) {
      const v = vehicles.find(veh => veh.registrationNo === location.state.openVehicleProfile)
      if (v) {
        openProfile(v)
        navigate(location.pathname, { replace: true, state: {} })
      }
    }
  }, [loading, vehicles, location.state, navigate, location.pathname])

  const [formData, setFormData] = useState({
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
  const [editFormData, setEditFormData] = useState({
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

  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen || isProfileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen, isProfileOpen])

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
      chassisNumber: vehicle.chassisNumber || '',
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
        chassisNumber: editFormData.chassisNumber,
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
              borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`
            }}>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 20, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Car size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Vehicle Fleet</h1>
                      <p style={{ margin: '6px 0 0', color: '#a5b4fc', fontSize: '1rem', fontWeight: 500, opacity: 0.9 }}>Manage and monitor all fleet vehicles in the system.</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                  {!isDriver && (
                    <button onClick={openModal} style={{ 
                      padding: '14px 28px', borderRadius: 16, border: 'none', 
                      background: '#fff', color: '#312e81', cursor: 'pointer', 
                      fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 10,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.3)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}>
                      <Plus size={20} strokeWidth={3} /> Add Vehicle
                    </button>
                  )}
                </div>
              </div>
              {/* decoration */}
              <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(165,180,252,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
              <StatBadge label="Total Vehicles" value={vehicles.length} icon={<Car size={24} />} colorDim={D.purpleDim} colorHex={D.purple} D={D} />
              <StatBadge label="Active" value={counts.ACTIVE} icon={<CheckCircle size={24} />} colorDim={D.greenDim} colorHex={D.green} D={D} />
              <StatBadge label="In Service" value={counts.SERVICE} icon={<Wrench size={24} />} colorDim={D.orangeDim} colorHex={D.orange} D={D} />
              <StatBadge label="Available" value={counts.AVAILABLE} icon={<Circle size={24} />} colorDim={D.blueDim} colorHex={D.blue} D={D} />
            </div>

            {/* Toolbar & List Container */}
            <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              <div style={{ padding: '22px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: D.surfaceHi, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.textSub, pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Search by reg, make or model…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 38 }}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['ALL', 'ACTIVE', 'AVAILABLE', 'SERVICE', 'INACTIVE'].map(s => (
                      <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                          padding: '10px 18px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800,
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
                </div>
                <div style={{ fontSize: '0.9rem', color: D.textSub, fontWeight: 700, background: D.surface, padding: '8px 16px', borderRadius: 12, border: `1px solid ${D.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ color: D.purple }}>{filtered.length}</span> Vehicles
                </div>
              </div>

              {/* Data List */}
              <div style={{ padding: '24px 32px 40px' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '100px 0', textAlign: 'center' }}>
                    <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                      <Search size={36} opacity={0.3} />
                    </div>
                    <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>No matching vehicles</h3>
                    <p style={{ margin: '10px 0 0', color: D.textSub, fontSize: '1rem', fontWeight: 500 }}>Adjust your search terms or filters to find what you're looking for.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                    {filtered.map((v, i) => {
                      const s = statusColors[v.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
                      const alertInfo = vehicleAlerts[v.registrationNo]
                      const ac = alertInfo ? (ALERT_COLORS[alertInfo.level] || ALERT_COLORS.OK) : null
                      return (
                        <div key={v.id} style={{
                          background: D.surface, borderRadius: 20, border: `1px solid ${D.border}`,
                          padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }} onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>
                          
                          {/* Reg No & Fuel Type */}
                          <div style={{ width: 140, flexShrink: 0 }}>
                            <button
                              onClick={() => openProfile(v)}
                              style={{
                                background: 'none', border: 'none', padding: 0, margin: 0,
                                fontSize: '1.1rem', fontWeight: 950, color: D.blue, letterSpacing: '0.02em',
                                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                              onMouseLeave={e => e.currentTarget.style.color = D.blue}
                            >
                              {v.registrationNo ?? 'N/A'}
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                              <span style={{ fontSize: '0.72rem', color: D.textSub, fontWeight: 800, textTransform: 'uppercase', background: D.surfaceHi, padding: '2px 8px', borderRadius: 6, border: `1px solid ${D.border}` }}>
                                {v.fuelType ?? 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Make, Model, Year, Mileage */}
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 48 }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Vehicle</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>
                                {v.manufacturer ?? 'N/A'} {v.model ?? ''} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{v.year ? `(${v.year})` : ''}</span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mileage</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: D.text }}>
                                {v.currentMileageKm ? v.currentMileageKm.toLocaleString() : '0'} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>km</span>
                              </div>
                            </div>
                          </div>

                          {/* Next Service Status */}
                          <div style={{ width: 140, flexShrink: 0 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Service Due</div>
                            {ac ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>{ac.label}</span>
                              </div>
                            ) : (
                              <span style={{ color: D.textFaint, fontSize: '0.75rem', fontWeight: 600 }}>Up to date</span>
                            )}
                          </div>

                          {/* Status */}
                          <div style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
                            <span style={{ display: 'inline-block', background: s.bg, color: s.color, padding: '6px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', border: `1px solid ${s.border}` }}>
                              {v.status ?? 'N/A'}
                            </span>
                          </div>

                          {/* Actions */}
                          {!isDriver && (
                            <div style={{ display: 'flex', gap: 10, marginLeft: 16 }}>
                              <button onClick={() => openProfile(v)} title="Profile" style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`, background: D.surface, color: D.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.25s' }} onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = D.blue; e.currentTarget.style.background = D.blue }} onMouseLeave={e => { e.currentTarget.style.color = D.blue; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface }}>
                                <Eye size={18} />
                              </button>
                              <button onClick={() => openEditModal(v)} title="Edit" style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`, background: D.surface, color: D.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.25s' }} onMouseEnter={e => { e.currentTarget.style.color = D.purple; e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.background = D.purpleDim }} onMouseLeave={e => { e.currentTarget.style.color = D.textSub; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface }}>
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => openDeleteModal(v)} title="Delete" style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`, background: D.surface, color: D.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.25s' }} onMouseEnter={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.borderColor = D.red }} onMouseLeave={e => { e.currentTarget.style.background = D.surface; e.currentTarget.style.borderColor = D.border }}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Add Modal ──────────────────────────────────────────────── */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={closeModal}>
            <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Plus size={24} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Add New Vehicle</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600, opacity: 0.9 }}>Register a new vehicle in the system.</p>
                  </div>
                </div>
                <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '36px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
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
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Chassis Number</label>
                    <input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. JT164B623" />
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={closeEditModal}>
            <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Edit2 size={24} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Edit Vehicle</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600, opacity: 0.9 }}>Refining details for {editingVehicle?.registrationNo}</p>
                  </div>
                </div>
                <button onClick={closeEditModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
              </div>

              <form onSubmit={handleEditSubmit} style={{ padding: '36px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
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
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Chassis Number</label>
                    <input type="text" name="chassisNumber" value={editFormData.chassisNumber} onChange={handleEditChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, animation: 'fadeIn 0.25s ease' }} onClick={closeDeleteModal}>
            <div style={{ background: D.surface, borderRadius: 32, padding: 40, width: '90%', maxWidth: 460, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: D.redDim, color: D.red, border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <AlertTriangle size={36} />
              </div>
              <h3 style={{ margin: '0 0 12px', fontWeight: 900, color: D.text, fontSize: '1.4rem', fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>Confirm Deletion</h3>
              <p style={{ margin: '0 0 32px', color: D.textSub, fontSize: '0.95rem', lineHeight: 1.6 }}>
                Are you sure you want to delete vehicle <strong style={{ color: D.text }}>{deletingVehicle?.registrationNo}</strong> ({deletingVehicle?.manufacturer} {deletingVehicle?.model})? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 16 }}>
                <button type="button" onClick={closeDeleteModal} style={{ flex: 1, padding: '14px 24px', borderRadius: 16, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>Cancel</button>
                <button type="button" onClick={handleDeleteConfirm} style={{ flex: 1, padding: '14px 24px', borderRadius: 16, border: 'none', background: D.red, color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(239,68,68,0.5)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.4)' }}>
                  <Trash2 size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Vehicle Profile Side Drawer ── */}
      {isProfileOpen && selectedProfileVehicle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease' }}>
          {/* Backdrop */}
          <div onClick={closeProfile} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', transition: 'opacity 0.2s ease' }} />
          
          {/* Drawer Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            height: '100vh',
            background: D.surface,
            borderLeft: `1px solid ${D.border}`,
            boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden'
          }}>
            {/* Header section */}
            <div style={{ padding: '24px 28px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                  flexShrink: 0
                }}>
                  <Car size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                    {selectedProfileVehicle.registrationNo}
                  </h3>
                  <p style={{ margin: '2px 0 0', color: D.textSub, fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedProfileVehicle.manufacturer} {selectedProfileVehicle.model}
                  </p>
                </div>
              </div>
              <button onClick={closeProfile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(90deg)'} onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}>
                <X size={22} />
              </button>
            </div>

            {/* Status & Badges row */}
            <div style={{ padding: '12px 28px', background: D.surface, display: 'flex', gap: 10, borderBottom: `1px solid ${D.border}` }}>
              {(() => {
                const s = statusColors[selectedProfileVehicle.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
                return (
                  <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', border: `1px solid ${s.border}` }}>
                    {selectedProfileVehicle.status}
                  </span>
                )
              })()}
              <span style={{ background: D.blueDim, color: D.blue, padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', border: `1px solid ${D.blue}30` }}>
                {selectedProfileVehicle.fuelType || 'UNKNOWN'}
              </span>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', padding: '16px 28px 10px', background: D.surface, gap: 8, borderBottom: `1px solid ${D.border}` }}>
              {['overview', 'services', 'fuel'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setProfileActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: profileActiveTab === tab ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.04)',
                    color: profileActiveTab === tab ? '#fff' : D.textSub,
                    boxShadow: profileActiveTab === tab ? '0 4px 10px rgba(99,102,241,0.25)' : 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'services' ? 'Services' : 'Fuel & Usage'}
                </button>
              ))}
            </div>

            {/* Drawer Content Area (Scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: D.bg }}>
              {profileActiveTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Specs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Manufacturer', value: selectedProfileVehicle.manufacturer || 'N/A', icon: <Car size={14} color={D.blue} /> },
                      { label: 'Model', value: selectedProfileVehicle.model || 'N/A', icon: <Car size={14} color={D.blue} /> },
                      { label: 'Year', value: selectedProfileVehicle.year || 'N/A', icon: <Calendar size={14} color={D.purple} /> },
                      { label: 'Current Mileage', value: selectedProfileVehicle.currentMileageKm ? `${selectedProfileVehicle.currentMileageKm.toLocaleString()} km` : 'N/A', icon: <Gauge size={14} color={D.green} /> }
                    ].map((item, idx) => (
                      <div key={idx} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {item.icon} {item.label}
                        </span>
                        <span style={{ fontSize: '0.88rem', color: D.text, fontWeight: 700 }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Info size={14} color={D.orange} /> Chassis Number
                      </span>
                      <span style={{ fontSize: '0.88rem', color: D.text, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {selectedProfileVehicle.chassisNumber || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Expiry / Compliance Section */}
                  <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={15} color={D.purple} /> Compliance & Expiries
                    </h4>
                    
                    {/* Insurance Card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: D.text }}>Insurance Expiry</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: D.textSub }}>
                          {selectedProfileVehicle.insuranceExpiryDate ? new Date(selectedProfileVehicle.insuranceExpiryDate).toLocaleDateString() : 'Not Set'}
                        </p>
                      </div>
                      {selectedProfileVehicle.insuranceExpiryDate ? (() => {
                        const diff = Math.ceil((new Date(selectedProfileVehicle.insuranceExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                        const isExpiring = diff <= 30
                        return (
                          <span style={{
                            background: isExpiring ? 'rgba(239,68,68,0.1)' : D.greenDim,
                            color: isExpiring ? '#ef4444' : D.green,
                            border: `1px solid ${isExpiring ? '#ef444450' : D.green + '50'}`,
                            padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800
                          }}>
                            {diff < 0 ? 'Expired' : `${diff} days left`}
                          </span>
                        )
                      })() : <span style={{ color: D.textFaint, fontSize: '0.75rem' }}>—</span>}
                    </div>

                    {/* License Card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: D.text }}>License Expiry</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: D.textSub }}>
                          {selectedProfileVehicle.licenseExpiryDate ? new Date(selectedProfileVehicle.licenseExpiryDate).toLocaleDateString() : 'Not Set'}
                        </p>
                      </div>
                      {selectedProfileVehicle.licenseExpiryDate ? (() => {
                        const diff = Math.ceil((new Date(selectedProfileVehicle.licenseExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                        const isExpiring = diff <= 30
                        return (
                          <span style={{
                            background: isExpiring ? 'rgba(239,68,68,0.1)' : D.greenDim,
                            color: isExpiring ? '#ef4444' : D.green,
                            border: `1px solid ${isExpiring ? '#ef444450' : D.green + '50'}`,
                            padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800
                          }}>
                            {diff < 0 ? 'Expired' : `${diff} days left`}
                          </span>
                        )
                      })() : <span style={{ color: D.textFaint, fontSize: '0.75rem' }}>—</span>}
                    </div>
                  </div>

                  {/* Driver Card */}
                  <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '18px 20px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '0.8rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={15} color={D.blue} /> Active Assignee
                    </h4>
                    {selectedProfileVehicle.driverUsername ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: D.blueDim,
                          color: D.blue,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          border: `1px solid ${D.blue}30`
                        }}>
                          {selectedProfileVehicle.driverUsername.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: D.text }}>
                            {selectedProfileVehicle.driverUsername}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: D.textSub }}>Driver / Assignee</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: D.textFaint, fontSize: '0.8rem', fontStyle: 'italic', padding: '6px 0' }}>
                        <Info size={14} /> No driver currently assigned.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {profileActiveTab === 'services' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Next Service Due block */}
                  {(() => {
                    const alertInfo = vehicleAlerts[selectedProfileVehicle.registrationNo]
                    if (alertInfo) {
                      const ac = ALERT_COLORS[alertInfo.level] || ALERT_COLORS.OK
                      const mileage = computeMileageProgress(alertInfo.record, alertInfo.vehicleKm)
                      const date    = computeDateAlert(alertInfo.record)
                      return (
                        <div style={{
                          background: ac.bg,
                          border: `1px solid ${ac.border}`,
                          borderRadius: 16,
                          padding: '16px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          boxShadow: `0 4px 16px ${ac.bg}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: ac.color }}>Next Service Target</span>
                            <span style={{ background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>
                              {ac.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text }}>
                              {alertInfo.record.nextServiceMileageKm ? `${alertInfo.record.nextServiceMileageKm.toLocaleString()} km` : '—'}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: D.textSub }}>
                              Due Date: {alertInfo.record.nextServiceDue ? new Date(alertInfo.record.nextServiceDue).toLocaleDateString() : '—'}
                            </p>
                          </div>
                          {mileage && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(mileage.pct, 100)}%`, height: '100%', background: ac.color }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, color: ac.color }}>
                                <span>{mileage.pct}% Threshold reached</span>
                                <span>{fmtKmRemaining(mileage.remaining)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 20px', color: D.textSub, fontSize: '0.8rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Info size={14} /> No upcoming service scheduled.
                      </div>
                    )
                  })()}

                  {/* Service Records Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Past Maintenance History
                    </h4>
                    {(() => {
                      const records = serviceRecords.filter(r => r.vehicleRegNumber === selectedProfileVehicle.registrationNo)
                      if (records.length === 0) {
                        return (
                          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '36px 20px', textAlign: 'center', color: D.textFaint }}>
                            <Wrench size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.85rem', color: D.textSub }}>No service records found</p>
                            <p style={{ margin: 0, fontSize: '0.75rem' }}>History will populate here once services are added.</p>
                          </div>
                        )
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {records.sort((a,b) => new Date(b.serviceDate) - new Date(a.serviceDate)).map(rec => (
                            <div key={rec.id} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12 }}>
                              <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: D.purpleDim,
                                color: D.purple,
                                display: 'flex',
                                alignItems: 'center',
                                justify: 'center',
                                flexShrink: 0,
                                border: `1px solid ${D.purple}20`
                              }}>
                                <Wrench size={15} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 750, color: D.text, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {rec.serviceType?.replace(/_/g, ' ')}
                                  </p>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: D.green }}>
                                    {rec.serviceCost ? `Rs. ${Number(rec.serviceCost).toLocaleString()}` : '—'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: D.textSub }}>
                                  <span>Date: {new Date(rec.serviceDate).toLocaleDateString()}</span>
                                  <span>Mileage: {rec.currentMileageKm ? `${rec.currentMileageKm.toLocaleString()} km` : '—'}</span>
                                </div>
                                {rec.partsReplaced && (
                                  <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: D.textSub, background: D.surfaceHi, padding: '4px 8px', borderRadius: 6, fontStyle: 'italic' }}>
                                    Parts: {rec.partsReplaced}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {profileActiveTab === 'fuel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {loadingProfileFuel ? (
                    <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', color: D.textSub }}>
                      <div style={{ width: 32, height: 32, border: `3px solid ${D.border}`, borderTopColor: D.blue, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Loading fuel data…</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Stats Widgets */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {(() => {
                          const totalCost = profileFuelLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0)
                          const totalLiters = profileFuelLogs.reduce((sum, log) => sum + (log.liters || 0), 0)
                          const avgPrice = profileFuelLogs.length > 0 ? profileFuelLogs.reduce((sum, log) => sum + (log.pricePerLiter || 0), 0) / profileFuelLogs.length : 0
                          return (
                            <>
                              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Fuel size={12} color={D.green} /> Fuel Cost
                                </span>
                                <span style={{ fontSize: '1.15rem', color: D.text, fontWeight: 800 }}>
                                  Rs. {Math.round(totalCost).toLocaleString()}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: D.textSub }}>Across {profileFuelLogs.length} fill-ups</span>
                              </div>
                              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Gauge size={12} color={D.blue} /> Total Liters
                                </span>
                                <span style={{ fontSize: '1.15rem', color: D.text, fontWeight: 800 }}>
                                  {totalLiters.toFixed(1)} L
                                </span>
                                <span style={{ fontSize: '0.68rem', color: D.textSub }}>Avg Price: Rs. {avgPrice.toFixed(1)}/L</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>

                      {/* Fuel Logs Timeline */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Fuel log history
                        </h4>
                        {profileFuelLogs.length === 0 ? (
                          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '36px 20px', textAlign: 'center', color: D.textFaint }}>
                            <Fuel size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.85rem', color: D.textSub }}>No fuel logs found</p>
                            <p style={{ margin: 0, fontSize: '0.75rem' }}>Logs added by drivers or controllers will appear here.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {profileFuelLogs.sort((a,b) => new Date(b.date) - new Date(a.date)).map(log => (
                              <div key={log.id} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: D.greenDim,
                                  color: D.green,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  border: `1px solid ${D.green}20`
                                }}>
                                  <Fuel size={15} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 750, color: D.text }}>
                                      {log.liters ? `${log.liters.toFixed(1)} Liters` : '—'}
                                    </p>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: D.text }}>
                                      Rs. {log.totalCost ? log.totalCost.toLocaleString() : '—'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: D.textSub }}>
                                    <span>Date: {new Date(log.date).toLocaleDateString()}</span>
                                    <span>Odometer: {log.currentMileageKm ? `${log.currentMileageKm.toLocaleString()} km` : '—'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </>
    )
  }

export default VehiclesPage
