import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD, useTheme } from '../context/ThemeContext'
import api, { vehicleAPI, userAPI, serviceAPI, fuelAPI } from '../services/api'
import { getAlertLevel, computeMileageProgress, computeDateAlert, ALERT_COLORS, fmtKmRemaining, fmtDaysRemaining } from '../utils/serviceAlertUtils'
import { getDriverMetrics } from '../utils/driverUtils'
import { Car, CheckCircle, Wrench, Circle, Search, Edit2, Trash2, AlertTriangle, AlertCircle, X, Check, BellRing, Gauge, Calendar, Eye, Fuel, User, Clock, ArrowUpRight, Info, Plus, FileText, Upload, Download, Phone, IdCard, Shield, Star } from 'lucide-react'

const onFocus = e => {
  e.target.style.borderColor = 'rgba(37, 99, 235,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = ''
  e.target.style.boxShadow = 'none'
}


const StatBadge = ({ label, value, icon, colorDim, colorHex, D }) => (
  <div style={{
    background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
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
  const { theme } = useTheme()
  const isDark = theme === 'blue'

  const statusColors = {
    ACTIVE: { bg: D.greenDim, color: D.green, border: `${D.green}50` },
    AVAILABLE: { bg: D.blueDim, color: D.blue, border: `${D.blue}50` },
    SERVICE: { bg: D.orangeDim, color: D.orange, border: `${D.orange}50` },
    INACTIVE: { bg: D.redDim, color: D.red, border: `${D.red}50` },
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
  const [drivers, setDrivers] = useState([])
  const [fuelStats, setFuelStats] = useState([])

  const [driverDetailsUser, setDriverDetailsUser] = useState(null)
  const [isDriverDetailsOpen, setIsDriverDetailsOpen] = useState(false)
  const [activeAssigningVehicleId, setActiveAssigningVehicleId] = useState(null)

  const handleInlineAssignDriver = async (vehicleId, driverId) => {
    try {
      await vehicleAPI.assignDriver(vehicleId, driverId)
      const response = await vehicleAPI.getAllVehicles()
      const updatedList = response.data.data || []
      setVehicles(updatedList)
      
      const updatedVeh = updatedList.find(v => v.id === vehicleId)
      if (selectedProfileVehicle && selectedProfileVehicle.id === vehicleId && updatedVeh) {
        setSelectedProfileVehicle(updatedVeh)
      }
    } catch (err) {
      console.error("Failed to assign driver inline:", err)
      alert(err.response?.data?.message || "Failed to assign driver.")
    }
  }

  const handleInlineUnassignDriver = async (vehicleId) => {
    try {
      await vehicleAPI.unassignDriver(vehicleId)
      const response = await vehicleAPI.getAllVehicles()
      const updatedList = response.data.data || []
      setVehicles(updatedList)
      
      const updatedVeh = updatedList.find(v => v.id === vehicleId)
      if (selectedProfileVehicle && selectedProfileVehicle.id === vehicleId && updatedVeh) {
        setSelectedProfileVehicle(updatedVeh)
      }
    } catch (err) {
      console.error("Failed to unassign driver inline:", err)
      alert(err.response?.data?.message || "Failed to unassign driver.")
    }
  }

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

  const [uploadingDoc, setUploadingDoc] = useState({ type: '', loading: false })

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
      alert("Failed to download document. Please try again.")
    }
  }

  const handleDocumentUpload = async (vehicleId, docType, file) => {
    if (!file) return
    setUploadingDoc({ type: docType, loading: true })
    try {
      const res = await vehicleAPI.uploadDocument(vehicleId, docType, file)
      setVehicles(prev => prev.map(v => v.id === vehicleId ? res.data.data : v))
      setSelectedProfileVehicle(res.data.data)
    } catch (err) {
      console.error("Failed to upload document:", err)
      alert(err.response?.data?.message || "Failed to upload document.")
    } finally {
      setUploadingDoc({ type: '', loading: false })
    }
  }

  const renderDocBlock = (docType, label, path) => {
    const isUploading = uploadingDoc.type === docType && uploadingDoc.loading
    const originalFilename = path ? path.substring(path.lastIndexOf('_') + 1) : null

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6, background: D.bg,
        padding: '12px 14px', borderRadius: 12, border: `1px solid ${D.border}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.text }}>{label}</span>
          {path ? (
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.green, background: D.greenDim, padding: '2px 6px', borderRadius: 4 }}>Uploaded</span>
          ) : (
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textFaint }}>No File</span>
          )}
        </div>

        {path ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <button
              onClick={() => downloadDocument(selectedProfileVehicle.id, docType, originalFilename)}
              style={{
                background: 'none', border: 'none', padding: 0, margin: 0,
                color: D.blue, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%'
              }}
              title="Download File"
            >
              <FileText size={12} style={{ flexShrink: 0 }} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{originalFilename}</span>
            </button>
            {!isDriver && (
              <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="file"
                  onChange={e => handleDocumentUpload(selectedProfileVehicle.id, docType, e.target.files[0])}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                <span style={{ color: D.textSub, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'underline' }}>
                  {isUploading ? 'Uploading...' : 'Update'}
                </span>
              </label>
            )}
          </div>
        ) : (
          <div>
            {!isDriver ? (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 10px', borderRadius: 8, border: `1px dashed ${D.border}`,
                background: D.surface, cursor: 'pointer', color: D.textSub, fontSize: '0.7rem', fontWeight: 700,
                transition: 'all 0.2s', marginTop: 4
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = D.blue; e.currentTarget.style.color = D.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub }}
              >
                <input
                  type="file"
                  onChange={e => handleDocumentUpload(selectedProfileVehicle.id, docType, e.target.files[0])}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload size={12} /> Upload File (Image / PDF)
                  </>
                )}
              </label>
            ) : (
              <span style={{ fontSize: '0.7rem', color: D.textFaint, fontStyle: 'italic', marginTop: 4, display: 'block' }}>No documents uploaded.</span>
            )}
          </div>
        )}
      </div>
    )
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
        const [vehicleRes, serviceRes, driverRes, fuelStatsRes] = await Promise.all([
          vehicleAPI.getAllVehicles(),
          serviceAPI.getAllServices(),
          isAdmin || !isDriver ? userAPI.getAllDrivers().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
          fuelAPI.getVehicleStats().catch(() => ({ data: { data: [] } }))
        ])
        setVehicles(vehicleRes.data.data || [])
        setServiceRecords(serviceRes.data.data || [])
        setDrivers(driverRes.data?.data || [])
        setFuelStats(fuelStatsRes.data?.data || [])
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
        licenseExpiryDate: editFormData.licenseExpiryDate || null,
        status: editFormData.status
      })
      // Assign / re-assign driver if changed
      if (editFormData.driverId) {
        await vehicleAPI.assignDriver(editingVehicle.id, editFormData.driverId)
      } else {
        await vehicleAPI.unassignDriver(editingVehicle.id)
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

            {/* Hero Banner — Dynamic design */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, #030712 0%, #0a1628 30%, #0f2345 60%, #1a3a7a 85%, #1e40af 100%)'
                : 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
              borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 16px 48px rgba(0,0,0,0.4)',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(37, 99, 235, 0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}>
              {/* Decorative circles */}
              {[['80%', '-20px', '220px', 'rgba(59,130,246,0.04)'], ['20%', '60%', '150px', 'rgba(99,102,241,0.04)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
                <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
              ))}
              {/* Neon radial glow for dark */}
              {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(8px)', border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.15)', boxShadow: isDark ? '0 0 20px rgba(59,130,246,0.3), 0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)' }}>
                  <Car size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Vehicle Fleet</h1>
                    {vehicles.length > 0 && (
                      <span style={{ background: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.15)', color: '#dbeafe', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)', border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.2)' }}>
                        {vehicles.length} vehicles
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 0', color: isDark ? '#93c5fd' : '#60a5fa', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Manage and monitor all fleet vehicles in the system.
                  </p>
                </div>
              </div>
              {!isDriver && (
                <button onClick={openModal} style={{
                  position: 'relative', padding: '14px 28px', borderRadius: 16, border: 'none',
                  background: '#fff', color: '#1e3a8a', fontSize: '0.95rem', fontWeight: 800,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}>
                  <Plus size={20} strokeWidth={3} /> Add Vehicle
                </button>
              )}
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
                    const date = computeDateAlert(record)
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
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
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
                          background: filter === s ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.05)',
                          color: filter === s ? '#fff' : D.textSub,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          boxShadow: filter === s ? '0 4px 12px rgba(37, 99, 235,0.3)' : 'none',
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                    {filtered.map((v, i) => {
                      const s = statusColors[v.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
                      const alertInfo = vehicleAlerts[v.registrationNo]
                      const ac = alertInfo ? (ALERT_COLORS[alertInfo.level] || ALERT_COLORS.OK) : null

                      // Expiry checks
                      const today = new Date()
                      const insExpiry = v.insuranceExpiryDate ? new Date(v.insuranceExpiryDate) : null
                      const licExpiry = v.licenseExpiryDate ? new Date(v.licenseExpiryDate) : null

                      const insDiff = insExpiry ? Math.ceil((insExpiry - today) / (1000 * 60 * 60 * 24)) : null
                      const licDiff = licExpiry ? Math.ceil((licExpiry - today) / (1000 * 60 * 60 * 24)) : null

                      const isInsAlert = insDiff !== null && insDiff <= 30
                      const isLicAlert = licDiff !== null && licDiff <= 30

                      const isInsExpired = insDiff !== null && insDiff < 0
                      const isLicExpired = licDiff !== null && licDiff < 0

                      const initials = v.manufacturer
                        ? (v.manufacturer.includes(' ')
                            ? v.manufacturer.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            : v.manufacturer.substring(0, 2).toUpperCase())
                        : 'V'

                      const driver = drivers.find(d => String(d.id) === String(v.driverId))

                      return (
                        <div key={v.id} style={{
                          background: D.surface, border: `1px solid ${D.border}`, borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          cursor: 'pointer'
                        }}
                          onClick={() => openProfile(v)}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)' }}>

                          {/* Header row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              {/* Avatar */}
                              <div style={{ flexShrink: 0 }}>
                                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', fontWeight: 800, border: `2px solid ${D.border}` }}>
                                  {initials}
                                </div>
                              </div>
                              {/* Name and Subtitle */}
                              <div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openProfile(v); }}
                                  style={{
                                    background: 'none', border: 'none', padding: 0, margin: 0,
                                    fontSize: '1.05rem', fontWeight: 955, color: D.blue, letterSpacing: '0.02em',
                                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                                    transition: 'color 0.15s ease', display: 'flex', alignItems: 'center', gap: 6
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                                  onMouseLeave={e => e.currentTarget.style.color = D.blue}
                                >
                                  {v.registrationNo ?? 'N/A'}
                                  {(isInsExpired || isLicExpired) ? (
                                    <AlertCircle size={14} style={{ color: D.red }} title={isInsExpired ? "Insurance Expired" : "License Expired"} />
                                  ) : (isInsAlert || isLicAlert) ? (
                                    <AlertTriangle size={14} style={{ color: D.orange }} title={isInsAlert ? "Insurance Expiring Soon" : "License Expiring Soon"} />
                                  ) : null}
                                </button>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: D.textSub, fontWeight: 500 }}>
                                  {v.manufacturer ?? 'N/A'} {v.model ?? ''}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div style={{
                              padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                              background: s.bg, color: s.color, border: `1px solid ${s.border || (s.color + '30')}`,
                              textTransform: 'uppercase', letterSpacing: '0.02em', flexShrink: 0
                            }}>
                              {v.status ?? 'N/A'}
                            </div>
                          </div>

                          {/* Stats Cards Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            <div style={{
                              background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                              border: `1px solid ${D.border}`, borderRadius: 16, padding: '14px 6px', textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: D.text }}>
                                {v.currentMileageKm ? v.currentMileageKm.toLocaleString() : '0'}
                              </div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mileage</div>
                            </div>

                            <div style={{
                              background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                              border: `1px solid ${D.border}`, borderRadius: 16, padding: '14px 6px', textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: D.text }}>
                                {v.fuelType ?? 'N/A'}
                              </div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuel</div>
                            </div>

                            <div style={{
                              background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                              border: `1px solid ${D.border}`, borderRadius: 16, padding: '14px 6px', textAlign: 'center'
                            }}>
                            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: ac ? ac.color : D.text }}>
                                {ac ? ac.label : 'OK'}
                              </div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</div>
                            </div>
                          </div>

                          {/* Details section */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }} onClick={e => e.stopPropagation()}>
                              <User size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                              <span>Driver: </span>
                              {driver ? (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDriverDetailsUser(driver);
                                    setIsDriverDetailsOpen(true);
                                  }}
                                  style={{
                                    color: D.blue,
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    textDecoration: 'underline',
                                    transition: 'color 0.2s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                                  onMouseLeave={e => e.currentTarget.style.color = D.blue}
                                >
                                  {driver.userName}
                                </span>
                              ) : !isDriver ? (
                                activeAssigningVehicleId === v.id ? (
                                  <select
                                    value=""
                                    onChange={async (e) => {
                                      const drvId = e.target.value;
                                      if (drvId) {
                                        await handleInlineAssignDriver(v.id, drvId);
                                      }
                                      setActiveAssigningVehicleId(null);
                                    }}
                                    onBlur={() => setActiveAssigningVehicleId(null)}
                                    autoFocus
                                    style={{
                                      background: D.inputBg,
                                      color: D.text,
                                      border: `1px solid ${D.purple}`,
                                      borderRadius: 8,
                                      fontSize: '0.75rem',
                                      padding: '2px 6px',
                                      outline: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">Select Driver...</option>
                                    {drivers
                                      .filter(d => !vehicles.some(veh => String(veh.driverId) === String(d.id)))
                                      .map(d => (
                                        <option key={d.id} value={d.id}>{d.userName}</option>
                                      ))
                                    }
                                  </select>
                                ) : (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveAssigningVehicleId(v.id);
                                    }}
                                    style={{
                                      color: D.blue,
                                      cursor: 'pointer',
                                      fontWeight: 800,
                                      background: D.blueDim,
                                      padding: '2px 8px',
                                      borderRadius: 99,
                                      fontSize: '0.72rem',
                                      border: `1px solid ${D.blue}30`,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = D.blue; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = D.blueDim; e.currentTarget.style.color = D.blue; }}
                                  >
                                    + Assign Driver
                                  </span>
                                )
                              ) : (
                                <span style={{ color: D.textFaint, fontStyle: 'italic' }}>Unassigned</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }}>
                              <FileText size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                              <span>Chassis: {v.chassisNumber || 'N/A'}</span>
                            </div>
                            {/* Compliance Expiries info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: isInsExpired ? D.red : isInsAlert ? D.orange : D.textSub, fontWeight: 600 }}>
                                <Calendar size={14} style={{ flexShrink: 0 }} />
                                <span>
                                  Insurance: {v.insuranceExpiryDate ? new Date(v.insuranceExpiryDate).toLocaleDateString() : 'N/A'}
                                  {isInsExpired ? ' (Expired)' : isInsAlert ? ` (${insDiff}d left)` : ''}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: isLicExpired ? D.red : isLicAlert ? D.orange : D.textSub, fontWeight: 600 }}>
                                <Clock size={14} style={{ flexShrink: 0 }} />
                                <span>
                                  License: {v.licenseExpiryDate ? new Date(v.licenseExpiryDate).toLocaleDateString() : 'N/A'}
                                  {isLicExpired ? ' (Expired)' : isLicAlert ? ` (${licDiff}d left)` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          {!isDriver ? (
                            <div style={{ borderTop: `1px solid ${D.border}`, margin: '8px 0 0', paddingTop: '16px', display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
                              <button onClick={(e) => { e.stopPropagation(); openProfile(v); }} title="Profile" style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.blue, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}
                                onMouseEnter={e => { e.currentTarget.style.background = D.blue; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = D.blue }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = D.blue; e.currentTarget.style.borderColor = D.border }}>
                                <Eye size={14} /> Profile
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(v); }} title="Edit" style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 99, 235,0.15)'; e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.color = '#60a5fa' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text }}>
                                <Edit2 size={14} /> Edit
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openDeleteModal(v); }} title="Delete" style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}
                                onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = D.red }}>
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          ) : (
                            <div style={{ borderTop: `1px solid ${D.border}`, margin: '8px 0 0', paddingTop: '16px', display: 'flex', width: '100%' }}>
                              <button onClick={(e) => { e.stopPropagation(); openProfile(v); }} style={{ width: '100%', padding: '8px 16px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.blue, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 800, transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = D.blue; e.currentTarget.style.background = D.blue }} onMouseLeave={e => { e.currentTarget.style.color = D.blue; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
                                <Eye size={14} /> View Details
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
                }
              </div>
            </div>

          </div>
        </div>

        {/* ── Add Modal ──────────────────────────────────────────────── */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={closeModal}>
            <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Plus size={24} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Add New Vehicle</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600, opacity: 0.9 }}>Register a new vehicle in the system.</p>
                  </div>
                </div>
                <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '36px' }}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
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
                    <label style={labelStyle}>Assign Driver</label>
                    <select name="driverId" value={formData.driverId} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>No Driver (Unassigned)</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id} style={{ background: D.surfaceHi }}>
                          {d.userName} ({d.fullName || d.email})
                        </option>
                      ))}
                    </select>
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
                  <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(37, 99, 235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
              <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Edit2 size={24} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>Edit Vehicle</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600, opacity: 0.9 }}>Refining details for {editingVehicle?.registrationNo}</p>
                  </div>
                </div>
                <button onClick={closeEditModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
              </div>

              <form onSubmit={handleEditSubmit} style={{ padding: '36px' }}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
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
                    <label style={labelStyle}>Assign Driver</label>
                    <select name="driverId" value={editFormData.driverId} onChange={handleEditChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>No Driver (Unassigned)</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id} style={{ background: D.surfaceHi }}>
                          {d.userName} ({d.fullName || d.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Vehicle Status</label>
                    <select name="status" value={editFormData.status} onChange={handleEditChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="AVAILABLE" style={{ background: D.surfaceHi }}>Available</option>
                      <option value="ACTIVE" style={{ background: D.surfaceHi }}>Active</option>
                      <option value="SERVICE" style={{ background: D.surfaceHi }}>In Service (Maintenance)</option>
                      <option value="INACTIVE" style={{ background: D.surfaceHi }}>Inactive</option>
                    </select>
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
                  <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(37, 99, 235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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

      {/* ── Vehicle Profile Modal ── */}
      {isProfileOpen && selectedProfileVehicle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.25s ease' }}>
          {/* Backdrop */}
          <div onClick={closeProfile} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', transition: 'opacity 0.2s ease' }} />

          {/* Modal Container */}
          <div style={{
            position: 'relative',
            width: '92%',
            maxWidth: 680,
            maxHeight: '88vh',
            background: D.surface,
            borderRadius: 32,
            boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
            border: `1px solid ${D.border}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden'
          }}>
            {/* Header section */}
            <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  flexShrink: 0
                }}>
                  <Car size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.35rem', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                    {selectedProfileVehicle.registrationNo}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedProfileVehicle.manufacturer} {selectedProfileVehicle.model}
                  </p>
                </div>
              </div>
              <button onClick={closeProfile} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={22} /></button>
            </div>

            {/* Status & Badges row */}
            <div style={{ padding: '12px 32px', background: D.surface, display: 'flex', gap: 10, borderBottom: `1px solid ${D.border}` }}>
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
            <div style={{ display: 'flex', padding: '16px 32px 10px', background: D.surface, gap: 8, borderBottom: `1px solid ${D.border}` }}>
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
                    background: profileActiveTab === tab ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.04)',
                    color: profileActiveTab === tab ? '#fff' : D.textSub,
                    boxShadow: profileActiveTab === tab ? '0 4px 10px rgba(37, 99, 235,0.25)' : 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'services' ? 'Services' : 'Fuel & Usage'}
                </button>
              ))}
            </div>

            {/* Drawer Content Area (Scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: D.bg }}>
              {profileActiveTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Specs Grid */}
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Manufacturer', value: selectedProfileVehicle.manufacturer || 'N/A', icon: <Car size={14} color={D.blue} /> },
                      { label: 'Model', value: selectedProfileVehicle.model || 'N/A', icon: <Car size={14} color={D.blue} /> },
                      { label: 'Year', value: selectedProfileVehicle.year || 'N/A', icon: <Calendar size={14} color={D.purple} /> },
                      { label: 'Current Mileage', value: selectedProfileVehicle.currentMileageKm ? `${selectedProfileVehicle.currentMileageKm.toLocaleString()} km` : 'N/A', icon: <Gauge size={14} color={D.green} /> },
                      {
                        label: 'Driver',
                        value: (() => {
                          const profileDriver = drivers.find(d => String(d.id) === String(selectedProfileVehicle.driverId))
                          return profileDriver ? (
                            <span
                              onClick={() => {
                                setDriverDetailsUser(profileDriver);
                                setIsDriverDetailsOpen(true);
                              }}
                              style={{
                                color: D.blue,
                                cursor: 'pointer',
                                fontWeight: 800,
                                textDecoration: 'underline',
                                transition: 'color 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={e => e.currentTarget.style.color = D.blue}
                            >
                              {profileDriver.userName}
                            </span>
                          ) : 'Unassigned'
                        })(),
                        icon: <User size={14} color={D.blue} />
                      }
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
                  </div>

                  {/* Expiry / Compliance Section */}
                  <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={15} color={D.purple} /> Compliance & Expiries
                    </h4>

                    {/* Insurance Card */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: D.text }}>Insurance Expiry</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: D.textSub }}>
                            {selectedProfileVehicle.insuranceExpiryDate ? new Date(selectedProfileVehicle.insuranceExpiryDate).toLocaleDateString() : 'Not Set'}
                          </p>
                        </div>
                        {selectedProfileVehicle.insuranceExpiryDate ? (() => {
                          const diff = Math.ceil((new Date(selectedProfileVehicle.insuranceExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
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
                      {/* Insurance Expiry Progress Bar */}
                      {selectedProfileVehicle.insuranceExpiryDate ? (() => {
                        const TOTAL_DAYS = 365
                        const diff = Math.ceil((new Date(selectedProfileVehicle.insuranceExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                        const safePct = Math.max(0, Math.min(100, (diff / TOTAL_DAYS) * 100))
                        // more days remaining = green, fewer days = red
                        const r = Math.round(239 - (239 - 16) * (safePct / 100))
                        const g = Math.round(68 + (185 - 68) * (safePct / 100))
                        const b = Math.round(68 + (129 - 68) * (safePct / 100))
                        const barColor = diff < 0 ? '#ef4444' : `rgb(${r},${g},${b})`
                        const displayPct = diff < 0 ? 100 : 100 - safePct
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.65rem', color: D.textSub }}>
                              <span style={{ color: barColor, fontWeight: 700 }}>
                                {diff < 0 ? `Expired ${Math.abs(diff)}d ago` : diff <= 30 ? `Expiring in ${diff} day${diff !== 1 ? 's' : ''}` : `${diff} days until expiry`}
                              </span>
                              <span>Valid up to {new Date(selectedProfileVehicle.insuranceExpiryDate).toLocaleDateString()}</span>
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
                            {selectedProfileVehicle.licenseExpiryDate ? new Date(selectedProfileVehicle.licenseExpiryDate).toLocaleDateString() : 'Not Set'}
                          </p>
                        </div>
                        {selectedProfileVehicle.licenseExpiryDate ? (() => {
                          const diff = Math.ceil((new Date(selectedProfileVehicle.licenseExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
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
                      {/* License Expiry Progress Bar */}
                      {selectedProfileVehicle.licenseExpiryDate ? (() => {
                        const TOTAL_DAYS = 365
                        const diff = Math.ceil((new Date(selectedProfileVehicle.licenseExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                        const safePct = Math.max(0, Math.min(100, (diff / TOTAL_DAYS) * 100))
                        // pct=100 → green, pct=0 → red
                        const r = Math.round(239 - (239 - 16) * (safePct / 100))
                        const g = Math.round(68 + (185 - 68) * (safePct / 100))
                        const b = Math.round(68 + (129 - 68) * (safePct / 100))
                        const barColor = diff < 0 ? '#ef4444' : `rgb(${r},${g},${b})`
                        const displayPct = diff < 0 ? 100 : 100 - safePct
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.65rem', color: D.textSub }}>
                              <span style={{ color: barColor, fontWeight: 700 }}>
                                {diff < 0 ? `Expired ${Math.abs(diff)}d ago` : diff <= 30 ? `Expiring in ${diff} day${diff !== 1 ? 's' : ''}` : `${diff} days until expiry`}
                              </span>
                              <span>Valid up to {new Date(selectedProfileVehicle.licenseExpiryDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )
                      })() : null}
                    </div>

                    {/* Document Attachments */}
                    <div style={{ borderTop: `1px solid ${D.border}`, marginTop: 12, paddingTop: 16 }}>
                      <h5 style={{ margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Original Documents & Papers</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Insurance Doc */}
                        {renderDocBlock('insurance', 'Insurance Certificate', selectedProfileVehicle.insuranceDocumentPath)}
                        {/* License Doc */}
                        {renderDocBlock('license', 'License & Road Tax', selectedProfileVehicle.licenseDocumentPath)}
                        {/* Registration Book Doc */}
                        {renderDocBlock('registration', 'Registration Book (V5)', selectedProfileVehicle.registrationBookPath)}
                      </div>
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

                    // ── Build date-based progress bar colour ─────────────────
                    // Always show the date bar if there is a nextServiceDue, regardless of alert level
                    const allRecords = serviceRecords.filter(r => r.vehicleRegNumber === selectedProfileVehicle.registrationNo)
                    const latestWithDue = allRecords
                      .filter(r => r.nextServiceDue)
                      .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate))[0]

                    const getDateBar = (record) => {
                      if (!record?.nextServiceDue) return null
                      const today = new Date(); today.setHours(0, 0, 0, 0)
                      const dueDate = new Date(record.nextServiceDue); dueDate.setHours(0, 0, 0, 0)
                      const serviceDate = record.serviceDate ? new Date(record.serviceDate) : null
                      const totalWindow = serviceDate
                        ? Math.max(1, Math.ceil((dueDate - serviceDate) / (1000 * 60 * 60 * 24)))
                        : 180
                      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
                      const elapsed = totalWindow - daysLeft
                      const rawPct = Math.max(0, Math.min(100, (elapsed / totalWindow) * 100))
                      // 0% → green, 80% → yellow, 100% → red
                      let barColor
                      if (rawPct <= 50) {
                        // green → yellow
                        const t = rawPct / 50
                        const r2 = Math.round(16 + (245 - 16) * t)
                        const g2 = Math.round(185 + (158 - 185) * t)
                        const b2 = Math.round(129 + (11 - 129) * t)
                        barColor = `rgb(${r2},${g2},${b2})`
                      } else {
                        // yellow → red
                        const t = (rawPct - 50) / 50
                        const r2 = Math.round(245 + (239 - 245) * t)
                        const g2 = Math.round(158 + (68 - 158) * t)
                        const b2 = Math.round(11 + (68 - 11) * t)
                        barColor = `rgb(${r2},${g2},${b2})`
                      }
                      if (daysLeft < 0) barColor = '#ef4444'
                      return { daysLeft, rawPct, barColor, totalWindow, dueDate }
                    }

                    if (alertInfo) {
                      const ac = ALERT_COLORS[alertInfo.level] || ALERT_COLORS.OK
                      const mileage = computeMileageProgress(alertInfo.record, alertInfo.vehicleKm)
                      const dateBar = getDateBar(alertInfo.record)
                      return (
                        <div style={{
                          background: D.surface,
                          border: `1px solid ${ac.border}`,
                          borderRadius: 16,
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16,
                          boxShadow: `0 4px 20px ${ac.bg}`
                        }}>
                          {/* Title row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: ac.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${ac.border}` }}>
                                <Wrench size={16} style={{ color: ac.color }} />
                              </div>
                              <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: D.text, display: 'block' }}>Next Service Target</span>
                                <span style={{ fontSize: '0.68rem', color: D.textSub }}>
                                  {alertInfo.record.serviceType?.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                            <span style={{ background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
                              {ac.label}
                            </span>
                          </div>

                          {/* Date bar */}
                          {dateBar && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={12} /> Service Date Countdown
                                </span>
                                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: dateBar.barColor }}>
                                  {dateBar.daysLeft < 0
                                    ? `${Math.abs(dateBar.daysLeft)}d overdue`
                                    : dateBar.daysLeft === 0
                                      ? 'Due today'
                                      : `${dateBar.daysLeft} days left`}
                                </span>
                              </div>
                              {/* Track */}
                              <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{
                                  width: `${Math.min(dateBar.rawPct, 100)}%`,
                                  height: '100%',
                                  background: `linear-gradient(90deg, #10b981, ${dateBar.barColor})`,
                                  borderRadius: 999,
                                  transition: 'width 0.7s ease, background 0.7s ease',
                                  boxShadow: `0 0 10px ${dateBar.barColor}80`
                                }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: D.textSub }}>
                                <span>Service Date</span>
                                <span style={{ color: dateBar.barColor, fontWeight: 700 }}>
                                  Due: {new Date(alertInfo.record.nextServiceDue).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Mileage bar */}
                          {mileage && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${D.border}`, paddingTop: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Gauge size={12} /> Mileage Progress
                                </span>
                                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: ac.color }}>
                                  {fmtKmRemaining(mileage.remaining)}
                                </span>
                              </div>
                              <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{
                                  width: `${Math.min(mileage.pct, 100)}%`,
                                  height: '100%',
                                  background: `linear-gradient(90deg, #10b981, ${ac.color})`,
                                  borderRadius: 999,
                                  transition: 'width 0.7s ease',
                                  boxShadow: `0 0 10px ${ac.color}80`
                                }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: D.textSub }}>
                                <span>Current: {alertInfo.vehicleKm?.toLocaleString()} km</span>
                                <span style={{ color: ac.color, fontWeight: 700 }}>Target: {alertInfo.record.nextServiceMileageKm?.toLocaleString()} km</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // No alert, but maybe there's still a nextServiceDue to show
                    const dateBar = getDateBar(latestWithDue)
                    if (dateBar) {
                      return (
                        <div style={{ background: D.surface, border: `1px solid ${D.green}40`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: D.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.green}30` }}>
                                <Wrench size={16} style={{ color: D.green }} />
                              </div>
                              <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: D.text, display: 'block' }}>Next Service Date</span>
                                <span style={{ fontSize: '0.68rem', color: D.textSub }}>
                                  {latestWithDue.serviceType?.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                            <span style={{ background: D.greenDim, color: D.green, border: `1px solid ${D.green}40`, fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>On Track</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={12} /> Service Date Countdown
                              </span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: dateBar.barColor }}>
                                {dateBar.daysLeft} days left
                              </span>
                            </div>
                            <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{
                                width: `${Math.min(dateBar.rawPct, 100)}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, #10b981, ${dateBar.barColor})`,
                                borderRadius: 999,
                                transition: 'width 0.7s ease',
                                boxShadow: `0 0 10px ${dateBar.barColor}80`
                              }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: D.textSub }}>
                              <span>Service Date</span>
                              <span style={{ color: dateBar.barColor, fontWeight: 700 }}>Due: {new Date(latestWithDue.nextServiceDue).toLocaleDateString()}</span>
                            </div>
                          </div>
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
                          {records.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate)).map(rec => (
                            <div key={rec.id} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12 }}>
                              <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: D.purpleDim,
                                color: D.purple,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
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
                      {/* Fuel Efficiency aggregate stats */}
                      {(() => {
                        const vStat = fuelStats.find(s => s.vehicleRegNumber === selectedProfileVehicle.registrationNo)
                        if (!vStat) return null

                        const effColor = vStat.efficiencyStatus === 'Good' ? D.green
                          : vStat.efficiencyStatus === 'Moderate' ? D.orange
                            : D.red
                        const effBg = vStat.efficiencyStatus === 'Good' ? D.greenDim
                          : vStat.efficiencyStatus === 'Moderate' ? D.orangeDim
                            : D.redDim

                        return (
                          <div style={{
                            background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 20px',
                            display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: D.textSub }}>Fuel Efficiency Analytics</span>
                              <span style={{ background: effBg, color: effColor, border: `1px solid ${effColor}30`, fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>
                                {vStat.efficiencyStatus}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: D.text }}>{vStat.fuelEfficiency?.toFixed(1) || '0.0'}</span>
                              <span style={{ fontSize: '0.88rem', color: D.textSub, fontWeight: 700 }}>km / Liter</span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min((vStat.fuelEfficiency || 0) * 6.6, 100)}%`, height: '100%', background: effColor }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: D.textSub }}>
                              <span>Total spent: Rs. {Math.round(vStat.totalSpending || 0).toLocaleString()}</span>
                              <span>Fleet threshold: 5.0 km/L</span>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Stats Widgets */}
                      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                            {profileFuelLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(log => (
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

      {/* ── Driver Details Modal ── */}
      {isDriverDetailsOpen && driverDetailsUser && (() => {
        const metrics = getDriverMetrics(driverDetailsUser, vehicles)
        const initials = driverDetailsUser.userName
          ? driverDetailsUser.userName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : 'D'

        let dutyStyles = {
          bg: 'rgba(255,255,255,0.05)',
          color: D.textSub,
          border: `1px solid ${D.border}`
        }
        if (metrics.status === 'On Duty' || metrics.status === 'Active') {
          dutyStyles = {
            bg: 'rgba(52, 211, 153, 0.12)',
            color: '#34d399',
            border: '1px solid rgba(52, 211, 153, 0.25)'
          }
        } else if (metrics.status === 'On Leave' || metrics.status === 'Pending') {
          dutyStyles = {
            bg: 'rgba(251, 191, 36, 0.12)',
            color: '#fbbf24',
            border: '1px solid rgba(251, 191, 36, 0.25)'
          }
        } else if (metrics.status === 'Suspended' || metrics.status === 'Inactive') {
          dutyStyles = {
            bg: 'rgba(248, 113, 113, 0.12)',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.25)'
          }
        }

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, animation: 'fadeIn 0.25s ease' }} onClick={() => setIsDriverDetailsOpen(false)}>
            <div style={{ background: D.surface, borderRadius: 32, width: '90%', maxWidth: 480, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              {/* Header Banner */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {driverDetailsUser.profilePicture ? (
                    <img src={driverDetailsUser.profilePicture} alt={driverDetailsUser.userName} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 800, border: '2px solid rgba(255,255,255,0.2)' }}>
                      {initials}
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{driverDetailsUser.userName}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>Driver Profile & Stats</p>
                  </div>
                </div>
                <button onClick={() => setIsDriverDetailsOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}><X size={18} /></button>
              </div>

              {/* Content body */}
              <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Duty status row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: D.textSub, fontWeight: 700 }}>Duty Status</span>
                  <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, background: dutyStyles.bg, color: dutyStyles.color, border: dutyStyles.border, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {metrics.status}
                  </span>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { value: metrics.trips, label: 'Trips' },
                    { value: `${metrics.rating}★`, label: 'Rating', color: '#fbbf24' },
                    { value: metrics.safety, label: 'Safety', color: '#34d399' }
                  ].map((st, idx) => (
                    <div key={idx} style={{ background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)', border: `1px solid ${D.border}`, borderRadius: 16, padding: '14px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: st.color || D.text }}>{st.value}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{st.label}</div>
                    </div>
                  ))}
                </div>

                {/* Detailed Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: D.surfaceHi, padding: 18, borderRadius: 20, border: `1px solid ${D.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: D.text, fontWeight: 600 }}>
                    <span style={{ color: D.textSub, width: 80, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> Phone:</span>
                    <span>{metrics.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: D.text, fontWeight: 600 }}>
                    <span style={{ color: D.textSub, width: 80, display: 'flex', alignItems: 'center', gap: 4 }}><IdCard size={12} /> License:</span>
                    <span>{metrics.license}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: D.text, fontWeight: 600 }}>
                    <span style={{ color: D.textSub, width: 80, display: 'flex', alignItems: 'center', gap: 4 }}><Car size={12} /> Vehicle:</span>
                    <span style={{ fontWeight: 800, color: metrics.assignedVehicleId ? D.blue : D.text }}>{metrics.vehicle}</span>
                  </div>
                </div>

                {/* Quick Actions (only for Admin/Controller) */}
                {!isDriver && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {metrics.assignedVehicleId ? (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Unassign driver ${driverDetailsUser.userName} from vehicle ${metrics.vehicle}?`)) {
                            await handleInlineUnassignDriver(metrics.assignedVehicleId)
                            setIsDriverDetailsOpen(false)
                          }
                        }}
                        style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${D.red}30`, background: D.redDim, color: D.red, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red; }}
                      >
                        Unassign Vehicle
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        setIsDriverDetailsOpen(false)
                        if (metrics.assignedVehicleId) {
                          const veh = vehicles.find(v => v.id === metrics.assignedVehicleId)
                          if (veh) openEditModal(veh)
                        }
                      }}
                      style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      {metrics.assignedVehicleId ? 'Change Assignment' : 'Close'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

    </>
  )
}

export default VehiclesPage
