import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD, useTheme } from '../context/ThemeContext'
import api, { vehicleAPI, serviceAPI, fuelAPI, userAPI } from '../services/api'
import { getAlertLevel, computeMileageProgress, computeDateAlert, ALERT_COLORS, fmtKmRemaining, fmtDaysRemaining } from '../utils/serviceAlertUtils'
import { Car, CheckCircle, Wrench, Circle, Search, Edit2, Trash2, AlertTriangle, AlertCircle, X, Check, BellRing, Gauge, Calendar, Eye, Fuel, User, Clock, ArrowUpRight, Info, Plus, FileText, Upload, Download, Phone, IdCard, Shield, Star, Zap, LayoutGrid, List, Archive, RotateCcw, UserCheck, UserX, ChevronDown } from 'lucide-react'
import { generateStyledExcel } from '../utils/excelExport'
import { computeLogsEfficiency, formatFuelType } from '../utils/fuelUtils'

const onFocus = e => {
  e.target.style.borderColor = 'rgba(37, 99, 235,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = ''
  e.target.style.boxShadow = 'none'
}


const StatBadge = ({ label, value, icon, colorDim, colorHex, D, total, isActive, onClick }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? colorDim : D.surface,
        borderRadius: 20,
        border: isActive ? `2px solid ${colorHex}` : `1px solid ${D.border}`,
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive ? `0 8px 24px ${colorHex}25` : `0 4px 24px rgba(0,0,0,0.2)`,
        transform: isActive ? 'translateY(-4px)' : 'translateY(0)'
      }}
      onMouseEnter={e => {
        if (!isActive && onClick) {
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.borderColor = colorHex + '55'
          e.currentTarget.style.boxShadow = `0 16px 40px ${colorHex}25, 0 4px 12px rgba(0,0,0,0.25)`
        }
      }}
      onMouseLeave={e => {
        if (!isActive && onClick) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = D.border
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)'
        }
      }}
    >
      {/* Top gradient accent bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${colorHex}00 0%, ${colorHex} 40%, ${colorHex}cc 100%)`,
      }} />

      {/* Card body: horizontal flex */}
      <div style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Left column: Glowing icon bubble */}
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: colorDim,
          color: colorHex,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${colorHex}30`,
          boxShadow: `0 0 14px ${colorHex}18`,
          flexShrink: 0,
        }}>
          {icon}
        </div>

        {/* Right column: Info & metrics */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 800,
              color: D.textSub,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {label}
            </span>
            {/* Percentage pill */}
            {total > 0 && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 800,
                color: colorHex,
                background: colorDim,
                border: `1px solid ${colorHex}25`,
                padding: '2px 8px',
                borderRadius: 999,
                letterSpacing: '0.02em',
              }}>
                {pct}%
              </span>
            )}
          </div>

          {/* Big number */}
          <div style={{
            fontSize: '1.7rem', fontWeight: 900,
            color: D.text,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: total > 0 ? 8 : 0,
          }}>
            {value}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div style={{ height: 4, borderRadius: 999, background: `${colorHex}18`, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 999,
                background: `linear-gradient(90deg, ${colorHex}99, ${colorHex})`,
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


const getVehicleMilestones = (vehicle, services, intervals) => {
  if (!vehicle || !intervals) return []
  const vehicleIntervals = intervals.filter(i => i.vehicleType === vehicle.vehicleType)

  return vehicleIntervals.map(interval => {
    // Find completed services for this vehicle and service type
    const completed = services.filter(s =>
      s.vehicleRegNumber === vehicle.registrationNo &&
      s.serviceType === interval.serviceType &&
      !s.deleted &&
      s.serviceDate &&
      new Date(s.serviceDate) <= new Date()
    )

    let lastServiceMileage = vehicle.initialMileageKm != null ? Number(vehicle.initialMileageKm) : Number(vehicle.currentMileageKm || 0)
    let lastRecord = null
    if (completed.length > 0) {
      completed.sort((a, b) => Number(b.currentMileageKm || 0) - Number(a.currentMileageKm || 0))
      lastServiceMileage = Number(completed[0].currentMileageKm || 0)
      lastRecord = completed[0]
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
      status,
      record: lastRecord || {
        vehicleRegNumber: vehicle.registrationNo,
        serviceType: interval.serviceType,
        currentMileageKm: 0,
        nextServiceMileageKm: interval.intervalKm,
        serviceDate: null,
        nextServiceDue: null,
        description: 'Initial service milestone'
      }
    }
  })
}

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
  const [fuelFilter, setFuelFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('vmas_vehicles_view_mode') || 'grid')

  useEffect(() => {
    localStorage.setItem('vmas_vehicles_view_mode', viewMode)
  }, [viewMode])
  const { user, isAdmin, isController, isDriver } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // True only when the Add modal was opened via the dashboard "Register Vehicle" Quick Command,
  // so that adding/cancelling/closing returns to the controller dashboard.
  const [fromQuickCommand, setFromQuickCommand] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()



  const [addError, setAddError] = useState('')
  const [editError, setEditError] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [serviceRecords, setServiceRecords] = useState([])
  const [fuelStats, setFuelStats] = useState([])
  const [intervals, setIntervals] = useState([])

  // ── Driver-specific lookup vehicle states ───────────────────────
  const [selectedDriverVehicle, setSelectedDriverVehicle] = useState(null)
  const [driverVehicleSearch, setDriverVehicleSearch] = useState('')
  const [driverVehicleDropdownVisible, setDriverVehicleDropdownVisible] = useState(false)
  const driverVehicleSearchRef = useRef(null)

  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false)
  const [odometerVehicle, setOdometerVehicle] = useState(null)
  const [newOdometerValue, setNewOdometerValue] = useState('')
  const [odometerError, setOdometerError] = useState('')

  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false)
  const [fuelModalVehicle, setFuelModalVehicle] = useState(null)
  const [newFuelValue, setNewFuelValue] = useState('')
  const [fuelModalError, setFuelModalError] = useState('')

  const [deletedDrawer, setDeletedDrawer] = useState(false)
  const [attachmentViewer, setAttachmentViewer] = useState({
    isOpen: false,
    url: '',
    type: '',
    filename: '',
    loading: false
  })
  const [deletedVehicles, setDeletedVehicles] = useState([])
  const [deletedLoading, setDeletedLoading] = useState(false)
  const [restoringId, setRestoringId] = useState(null)
  const [deletedDetail, setDeletedDetail] = useState(null)

  const handleOdometerSubmit = async (e) => {
    e.preventDefault()
    setOdometerError('')
    if (!newOdometerValue || isNaN(newOdometerValue) || Number(newOdometerValue) < 0) {
      setOdometerError('Please enter a valid mileage (positive number).')
      return
    }
    try {
      await vehicleAPI.updateVehicle(odometerVehicle.id, {
        model: odometerVehicle.model,
        registrationNo: odometerVehicle.registrationNo,
        chassisNumber: odometerVehicle.chassisNumber,
        manufacturer: odometerVehicle.manufacturer,
        year: odometerVehicle.year,
        fuelType: odometerVehicle.fuelType?.toUpperCase(),
        currentMileageKm: Number(newOdometerValue),
        fuelCapacity: odometerVehicle.fuelCapacity ? Number(odometerVehicle.fuelCapacity) : null,
        insuranceExpiryDate: odometerVehicle.insuranceExpiryDate || null,
        licenseExpiryDate: odometerVehicle.licenseExpiryDate || null,
        status: odometerVehicle.status
      })
      const response = await vehicleAPI.getAllVehicles()
      const updatedList = response.data.data || []
      setVehicles(updatedList)

      const updatedVeh = updatedList.find(v => v.id === odometerVehicle.id)
      if (selectedProfileVehicle && selectedProfileVehicle.id === odometerVehicle.id && updatedVeh) {
        setSelectedProfileVehicle(updatedVeh)
      }

      setIsOdometerModalOpen(false)
      setOdometerVehicle(null)
      setNewOdometerValue('')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update mileage.'
      setOdometerError(msg)
      console.error('Error updating odometer:', err)
    }
  }

  const openOdometerModal = (e, vehicle) => {
    e.stopPropagation()
    setOdometerVehicle(vehicle)
    setNewOdometerValue(vehicle.currentMileageKm || '')
    setOdometerError('')
    setIsOdometerModalOpen(true)
  }

  const openFuelModal = (e, vehicle) => {
    e.stopPropagation()
    setFuelModalVehicle(vehicle)
    setNewFuelValue(vehicle.fuelType?.toUpperCase() || '')
    setFuelModalError('')
    setIsFuelModalOpen(true)
  }

  const handleFuelSubmit = async (e) => {
    e.preventDefault()
    setFuelModalError('')
    if (!newFuelValue) {
      setFuelModalError('Please select a fuel type.')
      return
    }
    try {
      await vehicleAPI.updateVehicle(fuelModalVehicle.id, {
        model: fuelModalVehicle.model,
        registrationNo: fuelModalVehicle.registrationNo,
        chassisNumber: fuelModalVehicle.chassisNumber,
        manufacturer: fuelModalVehicle.manufacturer,
        year: fuelModalVehicle.year,
        fuelType: newFuelValue.toUpperCase(),
        currentMileageKm: fuelModalVehicle.currentMileageKm,
        fuelCapacity: fuelModalVehicle.fuelCapacity ? Number(fuelModalVehicle.fuelCapacity) : null,
        insuranceExpiryDate: fuelModalVehicle.insuranceExpiryDate || null,
        licenseExpiryDate: fuelModalVehicle.licenseExpiryDate || null,
        status: fuelModalVehicle.status
      })
      const response = await vehicleAPI.getAllVehicles()
      const updatedList = response.data.data || []
      setVehicles(updatedList)

      const updatedVeh = updatedList.find(v => v.id === fuelModalVehicle.id)
      if (selectedProfileVehicle && selectedProfileVehicle.id === fuelModalVehicle.id && updatedVeh) {
        setSelectedProfileVehicle(updatedVeh)
      }

      setIsFuelModalOpen(false)
      setFuelModalVehicle(null)
      setNewFuelValue('')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update fuel type.'
      setFuelModalError(msg)
      console.error('Error updating fuel type:', err)
    }
  }


  // --- VEHICLE PROFILE STATE ---
  const [selectedProfileVehicle, setSelectedProfileVehicle] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileActiveTab, setProfileActiveTab] = useState('overview')
  const [profileFuelLogs, setProfileFuelLogs] = useState([])
  const [loadingProfileFuel, setLoadingProfileFuel] = useState(false)

  // Driver Assignment state
  const [assignDriverModal, setAssignDriverModal] = useState(false)
  const [allDrivers, setAllDrivers] = useState([])
  const [selectedAssignDriver, setSelectedAssignDriver] = useState('')
  const [assignDriverBusy, setAssignDriverBusy] = useState(false)
  const [assignDriverError, setAssignDriverError] = useState('')

  const handleExportExcel = async () => {
    try {
      await generateStyledExcel('vehicle-summary', { vehicles: filtered })
    } catch (err) {
      console.error("Failed to export Excel:", err)
      alert("Failed to export Excel report.")
    }
  }

  const openProfile = async (vehicle, initialTab = 'overview') => {
    setSelectedProfileVehicle(vehicle)
    setProfileActiveTab(initialTab)
    setIsProfileOpen(true)
    setLoadingProfileFuel(true)
    try {
      const res = await fuelAPI.getLogsByVehicle(vehicle.registrationNo)
      const rawLogs = res.data.data || []
      const logsWithEff = computeLogsEfficiency(rawLogs, vehicles)
      setProfileFuelLogs(logsWithEff)
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
    setAssignDriverModal(false)
    setAssignDriverError('')
    setSelectedAssignDriver('')
  }

  const openAssignDriverModal = async () => {
    setAssignDriverError('')
    setSelectedAssignDriver(selectedProfileVehicle?.driverUsername || '')
    if (allDrivers.length === 0) {
      try {
        const res = await userAPI.getAllDrivers()
        setAllDrivers((res.data.data || []).filter(d => (d.accountStatus || 'ACTIVE') === 'ACTIVE'))
      } catch { /* ignore */ }
    }
    setAssignDriverModal(true)
  }

  const handleAssignDriver = async () => {
    if (!selectedProfileVehicle) return
    setAssignDriverBusy(true)
    setAssignDriverError('')
    try {
      const updated = await vehicleAPI.assignDriver(selectedProfileVehicle.id, selectedAssignDriver || null)
      // Refresh the selected vehicle with returned data
      const updatedVehicle = updated.data.data
      setSelectedProfileVehicle(updatedVehicle)
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v))
      setAssignDriverModal(false)
    } catch (err) {
      setAssignDriverError(err.response?.data?.message || 'Failed to update driver assignment')
    } finally {
      setAssignDriverBusy(false)
    }
  }

  const handleUnassignDriver = async () => {
    if (!selectedProfileVehicle) return
    setAssignDriverBusy(true)
    try {
      const updated = await vehicleAPI.unassignDriver(selectedProfileVehicle.id)
      const updatedVehicle = updated.data.data
      setSelectedProfileVehicle(updatedVehicle)
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v))
    } catch (err) {
      console.error('Unassign driver failed:', err)
    } finally {
      setAssignDriverBusy(false)
    }
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
      const lowerFilename = (filename || '').toLowerCase()
      const rawBlob = res.data instanceof Blob ? res.data : new Blob([res.data])
      let contentType = rawBlob.type || res.headers['content-type'] || res.headers.get?.('content-type')
      if (!contentType || contentType === 'application/octet-stream') {
        if (lowerFilename.endsWith('.pdf')) contentType = 'application/pdf'
        else if (lowerFilename.endsWith('.png')) contentType = 'image/png'
        else if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) contentType = 'image/jpeg'
        else if (lowerFilename.endsWith('.gif')) contentType = 'image/gif'
        else if (lowerFilename.endsWith('.webp')) contentType = 'image/webp'
        else if (lowerFilename.endsWith('.avif')) contentType = 'image/avif'
        else if (lowerFilename.endsWith('.svg')) contentType = 'image/svg+xml'
        else contentType = docType === 'registration' ? 'application/pdf' : 'image/jpeg'
      }
      const blob = rawBlob.type === contentType ? rawBlob : new Blob([rawBlob], { type: contentType })
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
      let errMsg = "Failed to download document. Please try again."
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const errorObj = JSON.parse(text)
          errMsg = errorObj.message || errMsg
        } catch (e) { }
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message
      }
      alert(errMsg)
    }
  }

  const viewDocumentOnline = async (id, docType) => {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/vehicles/${id}/document/${docType}`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const vehicle = vehicles.find(v => v.id === id)
      let path = ''
      if (vehicle) {
        if (docType === 'insurance') path = vehicle.insuranceDocumentPath || ''
        else if (docType === 'license') path = vehicle.licenseDocumentPath || ''
        else if (docType === 'registration') path = vehicle.registrationBookPath || ''
      }
      const lowerPath = path.toLowerCase()
      const rawBlob = res.data instanceof Blob ? res.data : new Blob([res.data])
      let contentType = rawBlob.type || res.headers['content-type'] || res.headers.get?.('content-type')
      if (!contentType || contentType === 'application/octet-stream') {
        if (lowerPath.endsWith('.pdf')) contentType = 'application/pdf'
        else if (lowerPath.endsWith('.png')) contentType = 'image/png'
        else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) contentType = 'image/jpeg'
        else if (lowerPath.endsWith('.gif')) contentType = 'image/gif'
        else if (lowerPath.endsWith('.webp')) contentType = 'image/webp'
        else if (lowerPath.endsWith('.avif')) contentType = 'image/avif'
        else if (lowerPath.endsWith('.svg')) contentType = 'image/svg+xml'
        else contentType = docType === 'registration' ? 'application/pdf' : 'image/jpeg'
      }
      const blob = rawBlob.type === contentType ? rawBlob : new Blob([rawBlob], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      if (contentType.includes('pdf')) {
        window.open(url, '_blank')
      } else {
        const filename = path.substring(path.lastIndexOf('/') + 1)
        setAttachmentViewer({
          isOpen: true,
          url,
          type: contentType,
          filename: filename.includes('_') ? filename.substring(filename.indexOf('_') + 1) : filename,
          loading: false
        })
      }
    } catch (err) {
      console.error("Failed to view document online:", err)
      let errMsg = "Failed to view document. Please try again."
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const errorObj = JSON.parse(text)
          errMsg = errorObj.message || errMsg
        } catch (e) { }
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message
      }
      alert(errMsg)
    }
  }

  const handleDocumentUpload = async (vehicleId, docType, file, expiryDate) => {
    if (!file) return
    setUploadingDoc({ type: docType, loading: true })
    try {
      const res = await vehicleAPI.uploadDocument(vehicleId, docType, file, expiryDate)
      setVehicles(prev => prev.map(v => v.id === vehicleId ? res.data.data : v))
      setSelectedProfileVehicle(res.data.data)
    } catch (err) {
      console.error("Failed to upload document:", err)
      alert(err.response?.data?.message || "Failed to upload document.")
    } finally {
      setUploadingDoc({ type: '', loading: false })
    }
  }

  const onProfileFileSelect = (vehicleId, docType, file) => {
    if (!file) return
    if (docType === 'registration') {
      handleDocumentUpload(vehicleId, docType, file)
      return
    }
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    const defaultExpiry = nextYear.toISOString().split('T')[0]
    setPendingUpload({
      vehicleId,
      docType,
      file,
      expiryDate: defaultExpiry
    })
  }

  const confirmPendingUpload = async () => {
    if (!pendingUpload) return
    const { vehicleId, docType, file, expiryDate } = pendingUpload
    setPendingUpload(null)
    await handleDocumentUpload(vehicleId, docType, file, expiryDate)
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', maxWidth: '70%' }}>
              <button
                onClick={() => viewDocumentOnline(selectedProfileVehicle.id, docType)}
                style={{
                  background: 'none', border: 'none', padding: 0, margin: 0,
                  color: D.blue, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                  textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                }}
                title="View File Online"
              >
                <FileText size={12} style={{ flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{originalFilename}</span>
              </button>
              {isController && (
                <button
                  onClick={() => downloadDocument(selectedProfileVehicle.id, docType, originalFilename)}
                  style={{
                    background: 'none', border: 'none', padding: 0, margin: 0,
                    color: D.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = D.blue}
                  onMouseLeave={e => e.currentTarget.style.color = D.textSub}
                  title="Download File"
                >
                  <Download size={12} />
                </button>
              )}
            </div>
            {isController && (
              <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="file"
                  onChange={e => onProfileFileSelect(selectedProfileVehicle.id, docType, e.target.files[0])}
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
            {isController ? (
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
                  onChange={e => onProfileFileSelect(selectedProfileVehicle.id, docType, e.target.files[0])}
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
    if (!loading) {
      if (vehicles.length > 0 && location.state?.openVehicleProfile) {
        const v = vehicles.find(veh => veh.registrationNo === location.state.openVehicleProfile)
        if (v) {
          openProfile(v)
          navigate(location.pathname, { replace: true, state: {} })
        }
      } else if (location.state?.openAddVehicle && isController) {
        openModal()
        if (location.state?.fromOneClick) setFromQuickCommand(true)
        navigate(location.pathname, { replace: true, state: {} })
      }
    }
  }, [loading, vehicles, location.state, navigate, location.pathname])
  const [formData, setFormData] = useState({
    model: '',
    registrationNo: '',
    chassisNumber: '',
    engineNumber: '',
    manufacturer: '',
    year: '',
    fuelType: '',
    currentMileageKm: '',
    insuranceExpiryDate: '',
    licenseExpiryDate: '',
    fuelCapacity: '',
    vehicleType: 'CAR',
    vehicleImage: ''
  })
  const [editFormData, setEditFormData] = useState({
    model: '',
    registrationNo: '',
    chassisNumber: '',
    engineNumber: '',
    manufacturer: '',
    year: '',
    fuelType: '',
    currentMileageKm: '',
    insuranceExpiryDate: '',
    licenseExpiryDate: '',
    fuelCapacity: '',
    vehicleType: 'CAR',
    vehicleImage: ''
  })

  // Document upload file states
  const [insuranceFile, setInsuranceFile] = useState(null)
  const [licenseFile, setLicenseFile] = useState(null)
  const [editInsuranceFile, setEditInsuranceFile] = useState(null)
  const [editLicenseFile, setEditLicenseFile] = useState(null)

  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen || isProfileOpen || isOdometerModalOpen || deletedDrawer) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen, isProfileOpen, isOdometerModalOpen, deletedDrawer])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (driverVehicleSearchRef.current && !driverVehicleSearchRef.current.contains(e.target)) {
        setDriverVehicleDropdownVisible(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehicleRes, serviceRes, fuelStatsRes, intervalsRes] = await Promise.all([
          vehicleAPI.getAllVehicles().catch(err => {
            console.error('Failed to load vehicles:', err);
            return { data: { data: [] } };
          }),
          serviceAPI.getAllServices().catch(err => {
            console.error('Failed to load services:', err);
            return { data: { data: [] } };
          }),
          fuelAPI.getVehicleStats().catch(() => ({ data: { data: [] } })),
          serviceAPI.getAllIntervals().catch(() => ({ data: { data: [] } }))
        ])
        const loadedVehicles = vehicleRes.data.data || []
        setVehicles(loadedVehicles)
        setServiceRecords(serviceRes.data.data || [])
        setFuelStats(fuelStatsRes.data?.data || [])
        setIntervals(intervalsRes.data?.data || [])

      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [isAdmin, isDriver, user])

  const handleAddInsuranceFileChange = (file) => {
    setInsuranceFile(file)
    if (file) {
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      setFormData(prev => ({ ...prev, insuranceExpiryDate: nextYear.toISOString().split('T')[0] }))
    }
  }

  const handleAddLicenseFileChange = (file) => {
    setLicenseFile(file)
    if (file) {
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      setFormData(prev => ({ ...prev, licenseExpiryDate: nextYear.toISOString().split('T')[0] }))
    }
  }

  const handleEditInsuranceFileChange = (file) => {
    setEditInsuranceFile(file)
    if (file) {
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      setEditFormData(prev => ({ ...prev, insuranceExpiryDate: nextYear.toISOString().split('T')[0] }))
    }
  }

  const handleEditLicenseFileChange = (file) => {
    setEditLicenseFile(file)
    if (file) {
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      setEditFormData(prev => ({ ...prev, licenseExpiryDate: nextYear.toISOString().split('T')[0] }))
    }
  }

  const openModal = () => {
    if (isController) setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setAddError('')
    setFormData({
      model: '',
      registrationNo: '',
      chassisNumber: '',
      engineNumber: '',
      manufacturer: '',
      year: '',
      fuelType: '',
      driverId: '',
      currentMileageKm: '',
      insuranceExpiryDate: '',
      licenseExpiryDate: '',
      fuelCapacity: '',
      vehicleType: 'CAR',
      vehicleImage: ''
    })
    setInsuranceFile(null)
    setLicenseFile(null)
    // When opened from the dashboard Quick Command, return to the controller dashboard
    // after adding, cancelling, or closing. Normal Fleet-page usage stays on the page.
    if (fromQuickCommand) {
      setFromQuickCommand(false)
      navigate('/dashboard')
    }
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
      const vehiclePayload = {
        ...formData,
        year: formData.year ? Number(formData.year) : undefined,
        currentMileageKm: formData.currentMileageKm ? Number(formData.currentMileageKm) : undefined,
        fuelCapacity: formData.fuelCapacity ? Number(formData.fuelCapacity) : null,
        insuranceExpiryDate: formData.insuranceExpiryDate || null,
        licenseExpiryDate: formData.licenseExpiryDate || null,
      }
      const saveRes = await vehicleAPI.registerVehicle(vehiclePayload)
      const saved = saveRes.data.data

      const uploadPromises = []
      if (saved?.id) {
        if (insuranceFile) {
          uploadPromises.push(vehicleAPI.uploadDocument(saved.id, 'insurance', insuranceFile, formData.insuranceExpiryDate))
        }
        if (licenseFile) {
          uploadPromises.push(vehicleAPI.uploadDocument(saved.id, 'license', licenseFile, formData.licenseExpiryDate))
        }
      }
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises)
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

  const handleVehicleImageChange = (e, isEdit = false) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (isEdit) {
          setEditFormData(prev => ({ ...prev, vehicleImage: reader.result }))
        } else {
          setFormData(prev => ({ ...prev, vehicleImage: reader.result }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle)
    setEditFormData({
      model: vehicle.model || '',
      registrationNo: vehicle.registrationNo || '',
      chassisNumber: vehicle.chassisNumber || '',
      engineNumber: vehicle.engineNumber || '',
      manufacturer: vehicle.manufacturer || '',
      year: vehicle.year || '',
      fuelType: vehicle.fuelType?.toUpperCase() || '',
      currentMileageKm: vehicle.currentMileageKm || '',
      insuranceExpiryDate: vehicle.insuranceExpiryDate || '',
      licenseExpiryDate: vehicle.licenseExpiryDate || '',
      fuelCapacity: vehicle.fuelCapacity || '',
      status: vehicle.status || '',
      vehicleType: vehicle.vehicleType || 'CAR',
      vehicleImage: vehicle.vehicleImage || ''
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
      engineNumber: '',
      manufacturer: '',
      year: '',
      fuelType: '',
      driverId: '',
      currentMileageKm: '',
      insuranceExpiryDate: '',
      licenseExpiryDate: '',
      fuelCapacity: '',
      status: '',
      vehicleType: 'CAR',
      vehicleImage: ''
    })
    setEditInsuranceFile(null)
    setEditLicenseFile(null)
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
        engineNumber: editFormData.engineNumber,
        manufacturer: editFormData.manufacturer,
        year: editFormData.year ? Number(editFormData.year) : null,
        fuelType: editFormData.fuelType ? editFormData.fuelType.toUpperCase() : null,
        fuelCapacity: editFormData.fuelCapacity ? Number(editFormData.fuelCapacity) : null,
        currentMileageKm: editFormData.currentMileageKm ? Number(editFormData.currentMileageKm) : null,
        insuranceExpiryDate: editFormData.insuranceExpiryDate || null,
        licenseExpiryDate: editFormData.licenseExpiryDate || null,
        status: editFormData.status,
        vehicleType: editFormData.vehicleType,
        vehicleImage: editFormData.vehicleImage || null
      })

      const uploadPromises = []
      if (editInsuranceFile) {
        uploadPromises.push(vehicleAPI.uploadDocument(editingVehicle.id, 'insurance', editInsuranceFile, editFormData.insuranceExpiryDate))
      }
      if (editLicenseFile) {
        uploadPromises.push(vehicleAPI.uploadDocument(editingVehicle.id, 'license', editLicenseFile, editFormData.licenseExpiryDate))
      }

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises)
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
      closeProfile()
    } catch (err) {
      console.error('Error deleting vehicle:', err)
    }
  }

  const loadDeletedVehicles = useCallback(async () => {
    setDeletedLoading(true)
    try {
      const res = await vehicleAPI.getDeletedVehicles()
      setDeletedVehicles(res.data.data || [])
    } catch (err) {
      console.error('Error loading deleted vehicles:', err)
    } finally {
      setDeletedLoading(false)
    }
  }, [])

  useEffect(() => {
    if (deletedDrawer) loadDeletedVehicles()
  }, [deletedDrawer, loadDeletedVehicles])

  const restoreVehicle = async (id) => {
    setRestoringId(id)
    try {
      await vehicleAPI.restoreVehicle(id)
      const response = await vehicleAPI.getAllVehicles()
      setVehicles(response.data.data || [])
      setDeletedVehicles(prev => prev.filter(v => v.id !== id))
      setDeletedDetail(null)
    } catch (err) {
      console.error('Error restoring vehicle:', err)
      alert(err.response?.data?.message || 'Failed to restore vehicle.')
    } finally {
      setRestoringId(null)
    }
  }


  const loggedInUsername = user?.userName || user?.username
  const filtered = vehicles.filter(v => {
    if (isDriver) {
      return v.driverUsername && loggedInUsername && v.driverUsername.toLowerCase() === loggedInUsername.toLowerCase()
    }
    const matchSearch = v.reg?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()) ||
      v.registrationNo?.toLowerCase().includes(search.toLowerCase()) ||
      v.manufacturer?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || v.status === filter
    const matchFuel = fuelFilter === 'ALL' || v.fuelType?.toUpperCase() === fuelFilter
    return matchSearch && matchFilter && matchFuel
  })

  const targetVehicles = isDriver
    ? vehicles.filter(v => v.driverUsername && loggedInUsername && v.driverUsername.toLowerCase() === loggedInUsername.toLowerCase())
    : vehicles

  const counts = {
    ACTIVE: targetVehicles.filter(v => v.status === 'ACTIVE').length,
    AVAILABLE: targetVehicles.filter(v => v.status === 'AVAILABLE').length,
    SERVICE: targetVehicles.filter(v => v.status === 'SERVICE').length,
    INACTIVE: targetVehicles.filter(v => v.status === 'INACTIVE').length,
  }

  // ── Compute service due alerts per vehicle ──
  const alertVehicles = []
  const vehicleAlerts = {}
  targetVehicles.forEach(v => {
    if (v.isDeleted) return
    const milestones = getVehicleMilestones(v, serviceRecords, intervals)
    const alertMilestones = milestones.filter(m => m.status === 'OVERDUE' || m.status === 'DUE_SOON')

    alertMilestones.forEach(m => {
      alertVehicles.push({
        reg: v.registrationNo,
        record: m.record,
        level: m.status,
        vehicleKm: v.currentMileageKm || 0,
        remainingKm: m.remainingKm
      })
    })

    if (alertMilestones.length > 0) {
      const sorted = [...alertMilestones].sort((a, b) => {
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1
        if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1
        return a.remainingKm - b.remainingKm
      })
      const worstMilestone = sorted[0]
      vehicleAlerts[v.registrationNo] = {
        record: worstMilestone.record,
        level: worstMilestone.status,
        vehicleKm: v.currentMileageKm || 0
      }
    }
  })

  // Sort: OVERDUE first, then sort by smallest remaining km (most urgent first)
  alertVehicles.sort((a, b) => {
    if (a.level === 'OVERDUE' && b.level !== 'OVERDUE') return -1
    if (a.level !== 'OVERDUE' && b.level === 'OVERDUE') return 1
    return a.remainingKm - b.remainingKm
  })



  return (
    <>
      <div className="app-shell" style={{ background: D.bg }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="Vehicles" subtitle="Home / Vehicles" onMenuToggle={() => setSidebarOpen(o => !o)} />
          <style>{`
            @keyframes pulseBar {
              0%,100% { opacity: 1; } 50% { opacity: 0.55; }
            }
          `}</style>
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
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={handleExportExcel} style={{
                    position: 'relative', padding: '14px 24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(255, 255, 255, 0.08)', color: '#fff', fontSize: '0.95rem', fontWeight: 800,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(8px)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)', whiteSpace: 'nowrap'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}>
                    <Download size={18} /> Export Excel
                  </button>
                  {isController && (
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
              )}

            </div>

            {/* Service Due Alert Strip */}
            {alertVehicles.length > 0 && (
              <div style={{
                background: D.surface,
                border: `1px solid ${alertVehicles.some(a => a.level === 'OVERDUE') ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                borderRadius: 20,
                marginBottom: 28,
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Outfit', sans-serif" }}>Vehicle Service Alerts</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: D.textSub }}>Upcoming & overdue milestones</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {alertVehicles.filter(a => a.level === 'OVERDUE').length > 0 && (
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: 999,
                      }}>
                        {alertVehicles.filter(a => a.level === 'OVERDUE').length} Overdue
                      </span>
                    )}
                    {alertVehicles.filter(a => a.level === 'DUE_SOON').length > 0 && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: 999,
                      }}>
                        {alertVehicles.filter(a => a.level === 'DUE_SOON').length} Due Soon
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, padding: '10px 4px', overflowX: 'auto', scrollbarWidth: 'thin' }}>
                  {alertVehicles.map(({ reg, record, level, vehicleKm }, idx) => {
                    const isOverdue = level === 'OVERDUE'
                    const accentColor = isOverdue ? '#f87171' : '#fbbf24'
                    const accentBg = isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)'
                    const accentBorder = isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)'
                    const mileage = computeMileageProgress(record, vehicleKm)
                    const date = computeDateAlert(record)

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
                      <div key={`${reg}-${record.serviceType}-${idx}`} style={{
                        flexShrink: 0, minWidth: 290, maxWidth: 320,
                        background: D.surfaceHi, border: `1px solid ${accentBorder}`,
                        borderRadius: 16, padding: '20px',
                        display: 'flex', flexDirection: 'column', gap: 16,
                        boxShadow: `0 4px 20px ${isOverdue ? 'rgba(239, 68, 68, 0.04)' : 'rgba(251, 191, 36, 0.04)'}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative', overflow: 'hidden'
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
                            {reg}
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
                            {record.serviceType?.replace(/_/g, ' ')}
                          </h4>
                          {record.description && record.description !== 'Initial service milestone.' && (
                            <p style={{ margin: 0, fontSize: '0.78rem', color: D.textSub, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {record.description}
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
                          {!isDriver && !isAdmin && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                navigate('/service', {
                                  state: {
                                    logServicePrefill: {
                                      vehicleRegNumber: reg,
                                      serviceType: record.serviceType
                                    }
                                  }
                                })
                              }}
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
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              const vehObj = vehicles.find(v => v.registrationNo === reg);
                              if (vehObj) openProfile(vehObj);
                            }}
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
                            View Profile
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stats row */}
            {!isDriver && (
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
                <StatBadge label="Total Vehicles" value={vehicles.length} icon={<Car size={22} />} colorDim={D.purpleDim} colorHex={D.purple} D={D} total={0} isActive={filter === 'ALL'} onClick={() => setFilter('ALL')} />
                <StatBadge label="Active" value={counts.ACTIVE} icon={<CheckCircle size={22} />} colorDim={D.greenDim} colorHex={D.green} D={D} total={vehicles.length} isActive={filter === 'ACTIVE'} onClick={() => setFilter('ACTIVE')} />
                <StatBadge label="In Service" value={counts.SERVICE} icon={<Wrench size={22} />} colorDim={D.orangeDim} colorHex={D.orange} D={D} total={vehicles.length} isActive={filter === 'SERVICE'} onClick={() => setFilter('SERVICE')} />
                <StatBadge label="Available" value={counts.AVAILABLE} icon={<Circle size={22} />} colorDim={D.blueDim} colorHex={D.blue} D={D} total={vehicles.length} isActive={filter === 'AVAILABLE'} onClick={() => setFilter('AVAILABLE')} />
              </div>
            )}

            {/* Toolbar & List Container */}
            <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              <div style={{ padding: '22px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: D.surfaceHi, flexWrap: 'wrap' }}>
                {!isDriver && (
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
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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

                      <select
                        value={fuelFilter}
                        onChange={e => setFuelFilter(e.target.value)}
                        style={{
                          padding: '10px 18px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800,
                          border: `1px solid ${D.border}`,
                          background: 'rgba(255,255,255,0.05)',
                          color: D.textSub,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = D.blue; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      >
                        <option value="ALL" style={{ background: D.surface, color: D.text }}>All Fuel Types</option>
                        <option value="PETROL" style={{ background: D.surface, color: D.text }}>Petrol 92 Octane</option>
                        <option value="SUPER_PETROL" style={{ background: D.surface, color: D.text }}>Petrol 95 Octane</option>
                        <option value="DIESEL" style={{ background: D.surface, color: D.text }}>Auto Diesel</option>
                        <option value="SUPER_DIESEL" style={{ background: D.surface, color: D.text }}>Super Diesel</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="vehicles-toolbar-right">
                  {/* View Toggler */}
                  <div style={{
                    display: 'flex', background: 'rgba(255,255,255,0.03)', border: `1px solid ${D.border}`,
                    borderRadius: 12, padding: 3, gap: 2
                  }}>
                    <button
                      onClick={() => setViewMode('grid')}
                      title="Grid View"
                      style={{
                        background: viewMode === 'grid' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                        color: viewMode === 'grid' ? '#fff' : D.textSub,
                        border: 'none', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      title="List View"
                      style={{
                        background: viewMode === 'table' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                        color: viewMode === 'table' ? '#fff' : D.textSub,
                        border: 'none', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      <List size={15} />
                    </button>
                  </div>

                  {/* Vehicle Count Badge */}
                  <div style={{ fontSize: '0.9rem', color: D.textSub, fontWeight: 700, background: D.surface, padding: '8px 16px', borderRadius: 12, border: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>
                    <span style={{ color: D.purple }}>{filtered.length}</span> Vehicles
                  </div>

                  {/* Deleted Vehicles Button */}
                  {isController && (
                    <button
                      onClick={() => setDeletedDrawer(true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 12,
                        background: D.surfaceHi, border: `1px solid ${D.border}`,
                        color: D.textSub, fontSize: '0.78rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.28)'; e.currentTarget.style.color = '#f87171' }}
                      onMouseLeave={e => { e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub }}
                    >
                      <Archive size={13} />
                      Deleted Vehicles
                    </button>
                  )}
                </div>
              </div>

              {/* Data List */}
              <div className="vehicles-data-list" style={{ padding: '24px 32px 40px' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '100px 0', textAlign: 'center' }}>
                    <div style={{ background: D.surfaceHi, width: 90, height: 90, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: D.textSub, border: `1px solid ${D.border}` }}>
                      <Search size={36} opacity={0.3} />
                    </div>
                    <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.2rem' }}>
                      {'No matching vehicles'}
                    </h3>
                    <p style={{ margin: '10px 0 0', color: D.textSub, fontSize: '1rem', fontWeight: 500 }}>
                      {'Adjust your search terms or filters to find what you\'re looking for.'}
                    </p>
                  </div>
                ) : viewMode === 'table' ? (
                  <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.01)', borderRadius: 16, border: `1px solid ${D.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${D.border}`, background: D.surfaceHi }}>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Reg Number</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Make / Model</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Status</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Odometer</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Fuel Type</th>
                          <th style={{ padding: '16px 20px', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((v, i) => {
                          const s = statusColors[v.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }

                          const today = new Date()
                          const insExpiry = v.insuranceExpiryDate ? new Date(v.insuranceExpiryDate) : null
                          const licExpiry = v.licenseExpiryDate ? new Date(v.licenseExpiryDate) : null
                          const insDiff = insExpiry ? Math.ceil((insExpiry - today) / (1000 * 60 * 60 * 24)) : null
                          const licDiff = licExpiry ? Math.ceil((licExpiry - today) / (1000 * 60 * 60 * 24)) : null
                          const isInsExpired = insDiff !== null && insDiff < 0
                          const isLicExpired = licDiff !== null && licDiff < 0
                          const isInsAlert = insDiff !== null && insDiff <= 30
                          const isLicAlert = licDiff !== null && licDiff <= 30

                          const rowAlertBorder = (isInsExpired || isLicExpired)
                            ? `left 3px solid ${D.red}`
                            : (isInsAlert || isLicAlert)
                              ? `left 3px solid ${D.orange}`
                              : 'none'

                          return (
                            <tr
                              key={v.id}
                              style={{
                                borderBottom: `1px solid ${D.border}`,
                                transition: 'background 0.2s ease',
                                cursor: 'default',
                                background: D.surface
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = D.surfaceHi }}
                              onMouseLeave={e => { e.currentTarget.style.background = D.surface }}
                            >
                              <td style={{ padding: '14px 20px', fontWeight: 700, borderLeft: rowAlertBorder }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {v.vehicleImage ? (
                                    <img src={v.vehicleImage} alt={v.registrationNo} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: `1px solid ${D.border}` }} />
                                  ) : (
                                    <div style={{ width: 32, height: 32, borderRadius: 6, background: D.indigoDim, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.border}`, color: D.indigo }}>
                                      <Car size={14} />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: D.blue, textDecoration: 'underline' }}>{v.registrationNo ?? 'N/A'}</span>
                                    {(isInsExpired || isLicExpired) ? (
                                      <AlertCircle size={13} style={{ color: D.red }} title={isInsExpired ? "Insurance Expired" : "License Expired"} />
                                    ) : (isInsAlert || isLicAlert) ? (
                                      <AlertTriangle size={13} style={{ color: D.orange }} title={isInsAlert ? "Insurance Expiring Soon" : "License Expiring Soon"} />
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '14px 20px', color: D.text, fontWeight: 600 }}>
                                {v.manufacturer ?? 'N/A'} {v.model ?? ''}
                              </td>
                              <td style={{ padding: '14px 20px' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                                  background: s.bg, color: s.color, border: `1px solid ${s.border || (s.color + '30')}`,
                                  textTransform: 'uppercase', letterSpacing: '0.02em', display: 'inline-block'
                                }}>
                                  {v.status ?? 'N/A'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 20px' }}>
                                <div
                                  onClick={(e) => {
                                    if (!isController) return;
                                    e.stopPropagation();
                                    openOdometerModal(e, v);
                                  }}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '4px 8px', borderRadius: 8, border: `1px solid transparent`,
                                    cursor: isController ? 'pointer' : 'default',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={e => {
                                    if (!isController) return;
                                    e.currentTarget.style.borderColor = D.purple;
                                    e.currentTarget.style.background = D.purpleDim;
                                  }}
                                  onMouseLeave={e => {
                                    if (!isController) return;
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                  title={isController ? "Quick Update Mileage" : ""}
                                >
                                  <span style={{ fontWeight: 750, color: D.text }}>
                                    {v.currentMileageKm ? `${v.currentMileageKm.toLocaleString()} km` : '0 km'}
                                  </span>
                                  {isController && <Edit2 size={10} style={{ opacity: 0.6 }} />}
                                </div>
                              </td>
                              <td style={{ padding: '14px 20px', fontWeight: 600, color: D.textSub }}>
                                {formatFuelType(v.fuelType)}
                              </td>
                              <td style={{ padding: '14px 20px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'inline-flex', gap: 8 }}>
                                  <button
                                    onClick={() => openProfile(v)}
                                    style={{
                                      background: 'none', border: 'none', padding: '4px 8px', borderRadius: 6,
                                      color: D.blue, cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                                      display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = D.blueDim }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                                  >
                                    <Eye size={13} />
                                  </button>
                                  {isController && (
                                    <button
                                      onClick={() => openEditModal(v)}
                                      style={{
                                        background: 'none', border: 'none', padding: '4px 8px', borderRadius: 6,
                                        color: D.text, cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                                        display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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


                      const cardAlertClass = (isInsExpired || isLicExpired)
                        ? 'pulse-warning-red'
                        : (isInsAlert || isLicAlert)
                          ? 'pulse-warning-orange'
                          : ''

                      const defaultBorderColor = (isInsExpired || isLicExpired)
                        ? 'rgba(239, 68, 68, 0.5)'
                        : (isInsAlert || isLicAlert)
                          ? 'rgba(245, 158, 11, 0.5)'
                          : D.border

                      return (
                        <div key={v.id}
                          className={cardAlertClass}
                          style={{
                            background: D.surface, border: `1px solid ${defaultBorderColor}`, borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            cursor: 'default'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = defaultBorderColor; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)' }}>

                          {/* Header row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              {/* Avatar */}
                              <div style={{ flexShrink: 0 }}>
                                {v.vehicleImage ? (
                                  <img src={v.vehicleImage} alt={v.registrationNo} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${D.border}` }} />
                                ) : (
                                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', fontWeight: 800, border: `2px solid ${D.border}` }}>
                                    {initials}
                                  </div>
                                )}
                              </div>
                              {/* Name and Subtitle */}
                              <div>
                                <div
                                  style={{
                                    fontSize: '1.05rem', fontWeight: 955, color: D.blue, letterSpacing: '0.02em',
                                    display: 'flex', alignItems: 'center', gap: 6
                                  }}
                                >
                                  {v.registrationNo ?? 'N/A'}
                                  {(isInsExpired || isLicExpired) ? (
                                    <AlertCircle size={14} style={{ color: D.red }} title={isInsExpired ? "Insurance Expired" : "License Expired"} />
                                  ) : (isInsAlert || isLicAlert) ? (
                                    <AlertTriangle size={14} style={{ color: D.orange }} title={isInsAlert ? "Insurance Expiring Soon" : "License Expiring Soon"} />
                                  ) : null}
                                </div>
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
                            <div
                              onClick={(e) => {
                                if (!isController) return;
                                e.stopPropagation();
                                openOdometerModal(e, v);
                              }}
                              style={{
                                background: isDark ? 'rgba(168, 85, 247, 0.04)' : 'rgba(168, 85, 247, 0.02)',
                                border: isDark ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid rgba(168, 85, 247, 0.1)',
                                borderRadius: 16, padding: '14px 6px', textAlign: 'center',
                                position: 'relative', cursor: isController ? 'pointer' : 'default', transition: 'all 0.25s ease',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                              }}
                              onMouseEnter={e => {
                                if (!isController) return;
                                e.currentTarget.style.borderColor = '#a855f7';
                                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.08)';
                                e.currentTarget.style.transform = 'scale(1.03)';
                              }}
                              onMouseLeave={e => {
                                if (!isController) return;
                                e.currentTarget.style.borderColor = isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)';
                                e.currentTarget.style.background = isDark ? 'rgba(168, 85, 247, 0.03)' : 'rgba(168, 85, 247, 0.02)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title={isController ? "Quick Update Odometer" : ""}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Gauge size={11} style={{ color: '#a855f7', opacity: 0.8 }} />
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mileage</span>
                              </div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: D.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                {v.currentMileageKm ? v.currentMileageKm.toLocaleString() : '0'}
                                {isController && <Edit2 size={10} style={{ opacity: 0.6, color: '#a855f7' }} />}
                              </div>
                            </div>

                            <div
                              onClick={(e) => {
                                if (!isController) return;
                                e.stopPropagation();
                                openFuelModal(e, v);
                              }}
                              style={{
                                background: isDark ? 'rgba(245, 158, 11, 0.04)' : 'rgba(245, 158, 11, 0.02)',
                                border: isDark ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(245, 158, 11, 0.1)',
                                borderRadius: 16, padding: '14px 6px', textAlign: 'center',
                                position: 'relative', cursor: isController ? 'pointer' : 'default', transition: 'all 0.25s ease',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                              }}
                              onMouseEnter={e => {
                                if (!isController) return;
                                e.currentTarget.style.borderColor = '#f59e0b';
                                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)';
                                e.currentTarget.style.transform = 'scale(1.03)';
                              }}
                              onMouseLeave={e => {
                                if (!isController) return;
                                e.currentTarget.style.borderColor = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)';
                                e.currentTarget.style.background = isDark ? 'rgba(245, 158, 11, 0.04)' : 'rgba(245, 158, 11, 0.02)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title={isController ? "Quick Update Fuel Type" : ""}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Fuel size={11} style={{ color: '#f59e0b', opacity: 0.8 }} />
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fuel</span>
                              </div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: D.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                {formatFuelType(v.fuelType)}
                                {isController && <Edit2 size={10} style={{ opacity: 0.6, color: '#f59e0b' }} />}
                              </div>
                            </div>

                            <div
                              onClick={(e) => { e.stopPropagation(); openProfile(v, 'services'); }}
                              style={{
                                background: ac ? (ac.label === 'Overdue' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)') : 'rgba(16, 185, 129, 0.04)',
                                border: `1px solid ${ac ? (ac.label === 'Overdue' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)') : 'rgba(16, 185, 129, 0.15)'}`,
                                borderRadius: 16, padding: '14px 6px', textAlign: 'center',
                                position: 'relative', cursor: 'pointer', transition: 'all 0.25s ease',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = ac ? ac.color : '#10b981';
                                e.currentTarget.style.background = ac ? (ac.label === 'Overdue' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)') : 'rgba(16, 185, 129, 0.08)';
                                e.currentTarget.style.transform = 'scale(1.03)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = ac ? (ac.label === 'Overdue' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)') : 'rgba(16, 185, 129, 0.15)';
                                e.currentTarget.style.background = ac ? (ac.label === 'Overdue' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)') : 'rgba(16, 185, 129, 0.04)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="View Service Target"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Wrench size={11} style={{ color: ac ? ac.color : '#10b981', opacity: 0.8 }} />
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: ac ? ac.color : '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Service</span>
                              </div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: ac ? ac.color : D.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                {ac ? ac.label : 'OK'}
                                <ArrowUpRight size={10} style={{ opacity: 0.6, color: ac ? ac.color : '#10b981' }} />
                              </div>
                            </div>
                          </div>

                          {/* Details section */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: D.textSub, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`Chassis: ${v.chassisNumber || 'N/A'}`}>
                              <FileText size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Chassis: {v.chassisNumber || 'N/A'}</span>
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

                          {/* Driver chip — shown for admins & controllers */}
                          {!isDriver && v.driverUsername && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: D.green, fontWeight: 700 }}>
                              <UserCheck size={13} style={{ flexShrink: 0, color: D.green }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.driverUsername}</span>
                              <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, background: D.greenDim, border: `1px solid ${D.green}30`, color: D.green, flexShrink: 0 }}>ASSIGNED</span>
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div style={{ borderTop: `1px solid ${D.border}`, margin: '8px 0 0', paddingTop: '16px', display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
                            <button onClick={(e) => { e.stopPropagation(); openProfile(v); }} title="Profile" style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.blue, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}
                              onMouseEnter={e => { e.currentTarget.style.background = D.blue; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = D.blue }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = D.blue; e.currentTarget.style.borderColor = D.border }}>
                              <Eye size={14} /> {isDriver ? 'View Details' : 'Profile'}
                            </button>
                            {isController && (
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(v); }} title="Edit" style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: 'inherit' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 99, 235,0.15)'; e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.color = '#60a5fa' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text }}>
                                <Edit2 size={14} /> Edit
                              </button>
                            )}
                          </div>
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
            <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
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

              <form onSubmit={handleSubmit} style={{ padding: '36px', overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 20, background: D.surfaceHi, padding: '16px 20px', borderRadius: 20, border: `1px solid ${D.border}`, marginBottom: 8 }}>
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 16, overflow: 'hidden', background: D.bg, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {formData.vehicleImage ? (
                        <img src={formData.vehicleImage} alt="Vehicle Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Car size={32} style={{ color: D.textSub, opacity: 0.5 }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={labelStyle}>Vehicle Image</span>
                      <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: D.textSub }}>Upload a photo of this vehicle (PNG, JPG).</p>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: D.blueDim, color: D.blue, border: `1px solid ${D.blue}30`, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = D.blue; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = D.blueDim; e.currentTarget.style.color = D.blue }}
                      >
                        <Upload size={12} /> {formData.vehicleImage ? 'Change Photo' : 'Upload Photo'}
                        <input type="file" accept="image/*" onChange={e => handleVehicleImageChange(e, false)} style={{ display: 'none' }} />
                      </label>
                      {formData.vehicleImage && (
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, vehicleImage: '' }))} style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
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
                    <label style={labelStyle}>Chassis Number</label>
                    <input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 17-digit chassis number" />
                  </div>
                  <div>
                    <label style={labelStyle}>Engine Number</label>
                    <input type="text" name="engineNumber" value={formData.engineNumber} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. Engine serial number" />
                  </div>
                  <div>
                    <label style={labelStyle}>Year <span style={{ color: D.red }}>*</span></label>
                    <input type="number" min={1985} name="year" value={formData.year} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 2020" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type <span style={{ color: D.red }}>*</span></label>
                    <select name="fuelType" value={formData.fuelType} onChange={handleChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Fuel Type</option>
                      <option value="PETROL" style={{ background: D.surfaceHi }}>Petrol 92 Octane</option>
                      <option value="SUPER_PETROL" style={{ background: D.surfaceHi }}>Petrol 95 Octane</option>
                      <option value="DIESEL" style={{ background: D.surfaceHi }}>Auto Diesel</option>
                      <option value="SUPER_DIESEL" style={{ background: D.surfaceHi }}>Super Diesel</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Vehicle Type <span style={{ color: D.red }}>*</span></label>
                    <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Vehicle Type</option>
                      <option value="CAR" style={{ background: D.surfaceHi }}>Car</option>
                      <option value="VAN" style={{ background: D.surfaceHi }}>Van</option>
                      <option value="LORRY" style={{ background: D.surfaceHi }}>Lorry</option>
                      <option value="BUS" style={{ background: D.surfaceHi }}>Bus</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="currentMileageKm" value={formData.currentMileageKm} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 15000" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Tank Capacity (Liters)</label>
                    <input type="number" name="fuelCapacity" value={formData.fuelCapacity} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 50" />
                  </div>



                  <div>
                    <label style={labelStyle}>Insurance Expiry</label>
                    <input type="date" name="insuranceExpiryDate" value={formData.insuranceExpiryDate} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>License Expiry</label>
                    <input type="date" name="licenseExpiryDate" value={formData.licenseExpiryDate} onChange={handleChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  {isController && (
                    <>
                      <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${D.border}`, paddingTop: 16, marginTop: 8 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents & Attachments</h4>
                      </div>

                      <div>
                        <label style={labelStyle}>Insurance Document</label>
                        <div style={{
                          position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8, border: `1px dashed ${D.border}`,
                          background: D.inputBg, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = D.blue}
                          onMouseLeave={e => e.currentTarget.style.borderColor = D.border}
                        >
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={e => handleAddInsuranceFileChange(e.target.files[0])}
                            style={{
                              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                              opacity: 0, cursor: 'pointer'
                            }}
                          />
                          <Upload size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: insuranceFile ? D.text : D.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                            {insuranceFile ? insuranceFile.name : 'Upload Insurance (Image / PDF)'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>License Document</label>
                        <div style={{
                          position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8, border: `1px dashed ${D.border}`,
                          background: D.inputBg, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = D.blue}
                          onMouseLeave={e => e.currentTarget.style.borderColor = D.border}
                        >
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={e => handleAddLicenseFileChange(e.target.files[0])}
                            style={{
                              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                              opacity: 0, cursor: 'pointer'
                            }}
                          />
                          <Upload size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: licenseFile ? D.text : D.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                            {licenseFile ? licenseFile.name : 'Upload License (Image / PDF)'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
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
            <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
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

              <form onSubmit={handleEditSubmit} style={{ padding: '36px', overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 20, background: D.surfaceHi, padding: '16px 20px', borderRadius: 20, border: `1px solid ${D.border}`, marginBottom: 8 }}>
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 16, overflow: 'hidden', background: D.bg, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {editFormData.vehicleImage ? (
                        <img src={editFormData.vehicleImage} alt="Vehicle Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Car size={32} style={{ color: D.textSub, opacity: 0.5 }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={labelStyle}>Vehicle Image</span>
                      <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: D.textSub }}>Upload a photo of this vehicle (PNG, JPG).</p>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: D.blueDim, color: D.blue, border: `1px solid ${D.blue}30`, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = D.blue; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = D.blueDim; e.currentTarget.style.color = D.blue }}
                      >
                        <Upload size={12} /> {editFormData.vehicleImage ? 'Change Photo' : 'Upload Photo'}
                        <input type="file" accept="image/*" onChange={e => handleVehicleImageChange(e, true)} style={{ display: 'none' }} />
                      </label>
                      {editFormData.vehicleImage && (
                        <button type="button" onClick={() => setEditFormData(prev => ({ ...prev, vehicleImage: '' }))} style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
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
                    <label style={labelStyle}>Chassis Number</label>
                    <input type="text" name="chassisNumber" value={editFormData.chassisNumber} onChange={handleEditChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Engine Number</label>
                    <input type="text" name="engineNumber" value={editFormData.engineNumber} onChange={handleEditChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Year</label>
                    <input type="number" min={1985} name="year" value={editFormData.year} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type</label>
                    <select name="fuelType" value={editFormData.fuelType} onChange={handleEditChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Fuel Type</option>
                      <option value="PETROL" style={{ background: D.surfaceHi }}>Petrol 92 Octane</option>
                      <option value="SUPER_PETROL" style={{ background: D.surfaceHi }}>Petrol 95 Octane</option>
                      <option value="DIESEL" style={{ background: D.surfaceHi }}>Auto Diesel</option>
                      <option value="SUPER_DIESEL" style={{ background: D.surfaceHi }}>Super Diesel</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Vehicle Type</label>
                    <select name="vehicleType" value={editFormData.vehicleType} onChange={handleEditChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Vehicle Type</option>
                      <option value="CAR" style={{ background: D.surfaceHi }}>Car</option>
                      <option value="VAN" style={{ background: D.surfaceHi }}>Van</option>
                      <option value="LORRY" style={{ background: D.surfaceHi }}>Lorry</option>
                      <option value="BUS" style={{ background: D.surfaceHi }}>Bus</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Current Mileage (km)</label>
                    <input type="number" name="currentMileageKm" value={editFormData.currentMileageKm} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Tank Capacity (Liters)</label>
                    <input type="number" name="fuelCapacity" value={editFormData.fuelCapacity} onChange={handleEditChange} style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 50" />
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

                  <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${D.border}`, paddingTop: 16, marginTop: 8 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents & Attachments</h4>
                  </div>

                  <div>
                    <label style={labelStyle}>Insurance Document</label>
                    {editingVehicle?.insuranceDocumentPath && !editInsuranceFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.surfaceHi, width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', maxWidth: '70%' }}>
                          <button
                            type="button"
                            onClick={() => viewDocumentOnline(editingVehicle.id, 'insurance')}
                            style={{
                              background: 'none', border: 'none', padding: 0, margin: 0,
                              color: D.blue, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                            }}
                            title="View File Online"
                          >
                            <FileText size={14} style={{ flexShrink: 0 }} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {editingVehicle.insuranceDocumentPath.substring(editingVehicle.insuranceDocumentPath.lastIndexOf('_') + 1)}
                            </span>
                          </button>
                          {isController && (
                            <button
                              type="button"
                              onClick={() => downloadDocument(editingVehicle.id, 'insurance', editingVehicle.insuranceDocumentPath.substring(editingVehicle.insuranceDocumentPath.lastIndexOf('_') + 1))}
                              style={{
                                background: 'none', border: 'none', padding: 0, margin: 0,
                                color: D.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center',
                                transition: 'color 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = D.blue}
                              onMouseLeave={e => e.currentTarget.style.color = D.textSub}
                              title="Download File"
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                        {isController && (
                          <label style={{ cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => handleEditInsuranceFileChange(e.target.files[0])}
                              style={{ display: 'none' }}
                            />
                            <span style={{ color: D.textSub, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline' }}>
                              Replace
                            </span>
                          </label>
                        )}
                      </div>
                    ) : (
                      isController ? (
                        <div style={{
                          position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8, border: `1px dashed ${D.border}`,
                          background: D.inputBg, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = D.blue}
                          onMouseLeave={e => e.currentTarget.style.borderColor = D.border}
                        >
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={e => handleEditInsuranceFileChange(e.target.files[0])}
                            style={{
                              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                              opacity: 0, cursor: 'pointer'
                            }}
                          />
                          <Upload size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: editInsuranceFile ? D.text : D.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                            {editInsuranceFile ? editInsuranceFile.name : 'Upload Insurance (Image / PDF)'}
                          </span>
                          {editInsuranceFile && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditInsuranceFile(null); }}
                              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: D.red, cursor: 'pointer', zIndex: 10 }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: D.textFaint, fontStyle: 'italic', display: 'block', marginTop: 4 }}>No document uploaded.</span>
                      )
                    )}
                  </div>

                  <div>
                    <label style={labelStyle}>License Document</label>
                    {editingVehicle?.licenseDocumentPath && !editLicenseFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.surfaceHi, width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', maxWidth: '70%' }}>
                          <button
                            type="button"
                            onClick={() => viewDocumentOnline(editingVehicle.id, 'license')}
                            style={{
                              background: 'none', border: 'none', padding: 0, margin: 0,
                              color: D.blue, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                            }}
                            title="View File Online"
                          >
                            <FileText size={14} style={{ flexShrink: 0 }} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {editingVehicle.licenseDocumentPath.substring(editingVehicle.licenseDocumentPath.lastIndexOf('_') + 1)}
                            </span>
                          </button>
                          {isController && (
                            <button
                              type="button"
                              onClick={() => downloadDocument(editingVehicle.id, 'license', editingVehicle.licenseDocumentPath.substring(editingVehicle.licenseDocumentPath.lastIndexOf('_') + 1))}
                              style={{
                                background: 'none', border: 'none', padding: 0, margin: 0,
                                color: D.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center',
                                transition: 'color 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = D.blue}
                              onMouseLeave={e => e.currentTarget.style.color = D.textSub}
                              title="Download File"
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                        {isController && (
                          <label style={{ cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => handleEditLicenseFileChange(e.target.files[0])}
                              style={{ display: 'none' }}
                            />
                            <span style={{ color: D.textSub, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline' }}>
                              Replace
                            </span>
                          </label>
                        )}
                      </div>
                    ) : (
                      isController ? (
                        <div style={{
                          position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8, border: `1px dashed ${D.border}`,
                          background: D.inputBg, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = D.blue}
                          onMouseLeave={e => e.currentTarget.style.borderColor = D.border}
                        >
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={e => handleEditLicenseFileChange(e.target.files[0])}
                            style={{
                              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                              opacity: 0, cursor: 'pointer'
                            }}
                          />
                          <Upload size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: editLicenseFile ? D.text : D.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                            {editLicenseFile ? editLicenseFile.name : 'Upload License (Image / PDF)'}
                          </span>
                          {editLicenseFile && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditLicenseFile(null); }}
                              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: D.red, cursor: 'pointer', zIndex: 10 }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: D.textFaint, fontStyle: 'italic', display: 'block', marginTop: 4 }}>No document uploaded.</span>
                      )
                    )}
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

        {/* ── Document Upload Expiry Confirmation Modal ─────────────── */}
        {pendingUpload && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400, animation: 'fadeIn 0.25s ease' }}>
            <div style={{ background: D.surface, borderRadius: 28, padding: 32, width: '90%', maxWidth: 440, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: D.blueDim || 'rgba(37,99,235,0.1)', color: D.blue, border: `1px solid ${D.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Calendar size={28} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontWeight: 900, color: D.text, fontSize: '1.25rem', fontFamily: "'Plus Jakarta Sans',sans-serif", textAlign: 'center', letterSpacing: '-0.01em' }}>
                Set Document Expiry Date
              </h3>
              <p style={{ margin: '0 0 24px', color: D.textSub, fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.5 }}>
                Configure the expiry date for the uploaded <strong style={{ textTransform: 'capitalize' }}>{pendingUpload.docType}</strong> document.
              </p>

              <div style={{ marginBottom: 24 }}>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: D.surfaceHi, border: `1px solid ${D.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>File Selected</div>
                  <div style={{ fontSize: '0.85rem', color: D.text, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{pendingUpload.file.name}</div>
                </div>

                <label style={labelStyle}>Expiry Date</label>
                <input
                  type="date"
                  value={pendingUpload.expiryDate}
                  onChange={e => setPendingUpload(prev => ({ ...prev, expiryDate: e.target.value }))}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setPendingUpload(null)}
                  style={{ flex: 0.4, padding: '12px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPendingUpload}
                  style={{ flex: 1, padding: '12px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(37,99,235,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.3)' }}
                >
                  <Upload size={16} /> Confirm & Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Modal ───────────────────────────────────────────── */}
        {/* ── Assign Driver Modal ── */}
        {assignDriverModal && selectedProfileVehicle && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, animation: 'fadeIn 0.2s ease' }}
            onClick={() => { setAssignDriverModal(false); setAssignDriverError('') }}>
            <div style={{ background: D.surface, borderRadius: 28, padding: 36, width: '90%', maxWidth: 440, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(37,99,235,0.35)' }}>
                  <UserCheck size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    {selectedProfileVehicle.driverUsername ? 'Change Assigned Driver' : 'Assign Driver'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: D.textSub }}>
                    Vehicle: <strong style={{ color: D.text }}>{selectedProfileVehicle.registrationNo}</strong>
                  </p>
                </div>
              </div>

              {/* Current Driver Info */}
              {selectedProfileVehicle.driverUsername && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: D.greenDim, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.82rem', color: D.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCheck size={14} /> Currently: {selectedProfileVehicle.driverUsername}
                </div>
              )}

              {/* Driver Dropdown */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Select Driver
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedAssignDriver}
                    onChange={e => setSelectedAssignDriver(e.target.value)}
                    style={{
                      width: '100%', padding: '11px 38px 11px 14px', borderRadius: 10,
                      border: `1px solid ${D.inputBorder}`, background: D.inputBg, color: D.text,
                      fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'pointer',
                      appearance: 'none', fontFamily: 'inherit'
                    }}>
                    <option value="">— Select a driver —</option>
                    {allDrivers.map(d => (
                      <option key={d.id} value={d.userName}>
                        👤 {d.userName}{d.firstName ? ` (${d.firstName} ${d.lastName || ''})`.trim() : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: D.textSub, pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Error */}
              {assignDriverError && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: D.redDim, border: `1px solid ${D.red}40`, color: D.red, fontSize: '0.82rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={14} /> {assignDriverError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setAssignDriverModal(false); setAssignDriverError('') }}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={handleAssignDriver} disabled={assignDriverBusy}
                  style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff', fontWeight: 800, cursor: assignDriverBusy ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontFamily: 'inherit', boxShadow: '0 6px 16px rgba(37,99,235,0.35)', opacity: assignDriverBusy ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <UserCheck size={16} /> {assignDriverBusy ? 'Saving…' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, animation: 'fadeIn 0.25s ease' }} onClick={closeDeleteModal}>
            <div style={{ background: D.surface, borderRadius: 32, padding: 40, width: '90%', maxWidth: 460, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: D.redDim, color: D.red, border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <AlertTriangle size={36} />
              </div>
              <h3 style={{ margin: '0 0 12px', fontWeight: 900, color: D.text, fontSize: '1.4rem', fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>Confirm Deletion</h3>
              <p style={{ margin: '0 0 32px', color: D.textSub, fontSize: '0.95rem', lineHeight: 1.6 }}>
                Are you sure you want to delete vehicle <strong style={{ color: D.text }}>{deletingVehicle?.registrationNo}</strong> ({deletingVehicle?.manufacturer} {deletingVehicle?.model})? This record will be moved to the archive and can be restored at any time.
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

        {/* ── Deleted Vehicles Drawer ─────────────────────────────────── */}
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
                      Deleted Vehicles
                    </h2>
                    <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                      Soft-deleted vehicles are preserved — not permanently removed
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
                    {deletedVehicles.length} vehicle{deletedVehicles.length !== 1 ? 's' : ''} deleted
                  </span>
                  <span style={{ fontSize: '0.75rem', color: D.textSub }}>
                    These fleet records are preserved for audit purposes
                  </span>
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deletedLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, height: 90, animation: 'pulse 1.5s ease infinite' }} />
                  ))
                ) : deletedVehicles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: D.textSub }}>
                    <div style={{ opacity: 0.4, display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Archive size={44} /></div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>No deleted vehicles found.</p>
                    <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Deleted vehicles will appear here.</p>
                  </div>
                ) : deletedDetail ? (
                  /* ── Inner Detail View ───────────────────────────────── */
                  (() => {
                    const v = deletedDetail
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
                            id={`restore-veh-btn-${v.id}`}
                            onClick={() => restoreVehicle(v.id)}
                            disabled={restoringId === v.id}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 7,
                              padding: '8px 20px', borderRadius: 8,
                              background: restoringId === v.id ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.12)',
                              color: '#10b981',
                              border: '1px solid rgba(16,185,129,0.3)',
                              cursor: restoringId === v.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.82rem', fontWeight: 700,
                              transition: 'all 0.15s',
                              opacity: restoringId === v.id ? 0.7 : 1,
                            }}
                            onMouseEnter={e => { if (restoringId !== v.id) { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' } }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.color = '#10b981' }}
                          >
                            {restoringId === v.id ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                Restoring…
                              </>
                            ) : (
                              <>
                                <RotateCcw size={14} /> Restore Vehicle
                              </>
                            )}
                          </button>
                        </div>

                        {/* Vehicle header card */}
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
                            <Car size={26} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: D.text }}>
                              {v.registrationNo}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: D.textSub, marginTop: 2 }}>
                              {v.manufacturer} {v.model}
                            </div>
                          </div>
                          <span style={{
                            padding: '4px 12px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.25)', letterSpacing: '0.05em',
                            textTransform: 'uppercase', flexShrink: 0,
                          }}>DELETED</span>
                        </div>

                        {/* Deletion info */}
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
                                <User size={14} /> {v.deletedBy || '—'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>Deleted At</div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Clock size={14} />
                                {v.deletedAt ? new Date(v.deletedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Specs */}
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                          Vehicle Specs <div style={{ flex: 1, height: 1, background: D.border }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
                          {[
                            ['Manufacturer', v.manufacturer],
                            ['Model', v.model],
                            ['Year', v.year],
                            ['Fuel Type', formatFuelType(v.fuelType)],
                            ['Mileage', v.currentMileageKm ? `${v.currentMileageKm.toLocaleString()} km` : '0 km'],
                            ['Chassis No', v.chassisNumber],
                            ['Engine No', v.engineNumber],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: val ? D.text : D.textSub }}>{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  /* ── Deleted Vehicles List ────────────────────────────── */
                  deletedVehicles.map((v, i) => (
                    <div
                      key={v.id}
                      onClick={() => setDeletedDetail(v)}
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
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                      }}>
                        <Car size={20} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: D.text }}>
                            {v.registrationNo}
                          </span>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                            textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }}>DELETED</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: D.textSub }}>
                            {v.manufacturer} {v.model}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: D.textSub }}>
                            <User size={12} /> by {v.deletedBy || 'unknown'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); restoreVehicle(v.id) }}
                        disabled={restoringId === v.id}
                        style={{
                          background: 'none', padding: '6px 12px', borderRadius: 8,
                          color: '#10b981', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                          display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s ease',
                          border: '1px solid rgba(16,185,129,0.2)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                      >
                        {restoringId === v.id ? 'Restoring...' : 'Restore'}
                      </button>
                    </div>
                  ))
                )}
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
                {selectedProfileVehicle.vehicleImage ? (
                  <img src={selectedProfileVehicle.vehicleImage} alt={selectedProfileVehicle.registrationNo} style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                ) : (
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
                )}
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
            <div className="modal-tabs" style={{ display: 'flex', padding: '16px 32px 10px', background: D.surface, gap: 8, borderBottom: `1px solid ${D.border}` }}>
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
                      {
                        label: 'Current Mileage',
                        value: (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {selectedProfileVehicle.currentMileageKm ? `${selectedProfileVehicle.currentMileageKm.toLocaleString()} km` : 'N/A'}
                            {isController && <Edit2 size={12} style={{ opacity: 0.6 }} />}
                          </span>
                        ),
                        icon: <Gauge size={14} color={D.green} />,
                        onClick: isController ? (e) => openOdometerModal(e, selectedProfileVehicle) : undefined
                      },
                      { label: 'Tank Capacity', value: selectedProfileVehicle.fuelCapacity ? `${selectedProfileVehicle.fuelCapacity} Liters` : 'N/A', icon: <Fuel size={14} color={D.gold} /> },
                      { label: 'Chassis Number', value: selectedProfileVehicle.chassisNumber || 'N/A', icon: <Shield size={14} color={D.blue} /> },
                      { label: 'Engine Number', value: selectedProfileVehicle.engineNumber || 'N/A', icon: <IdCard size={14} color={D.purple} /> }
                    ].map((item, idx) => (
                      <div key={idx}
                        onClick={item.onClick}
                        style={{
                          background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
                          cursor: item.onClick ? 'pointer' : 'default',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                          if (item.onClick) {
                            e.currentTarget.style.borderColor = D.purple;
                            e.currentTarget.style.background = D.purpleDim;
                          }
                        }}
                        onMouseLeave={e => {
                          if (item.onClick) {
                            e.currentTarget.style.borderColor = D.border;
                            e.currentTarget.style.background = D.surface;
                          }
                        }}
                        title={item.onClick ? "Quick Update Mileage" : ""}
                      >
                        <span style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {item.icon} {item.label}
                        </span>
                        <span
                          title={typeof item.value === 'string' ? item.value : undefined}
                          style={{
                            fontSize: '0.88rem',
                            color: D.text,
                            fontWeight: 700,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ── Assigned Driver Section ── */}
                  {(isAdmin || isController) && (
                    <div style={{
                      background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
                      padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: selectedProfileVehicle.driverUsername ? D.greenDim : D.surfaceHi,
                          color: selectedProfileVehicle.driverUsername ? D.green : D.textFaint,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1px solid ${selectedProfileVehicle.driverUsername ? D.green + '40' : D.border}`,
                          flexShrink: 0
                        }}>
                          {selectedProfileVehicle.driverUsername ? <UserCheck size={18} /> : <User size={18} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Assigned Driver</div>
                          {selectedProfileVehicle.driverUsername ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text }}>👤 {selectedProfileVehicle.driverUsername}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30` }}>ASSIGNED</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: D.textSub, fontStyle: 'italic' }}>No driver assigned</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {selectedProfileVehicle.driverUsername && (
                          <button onClick={handleUnassignDriver} disabled={assignDriverBusy}
                            style={{
                              padding: '8px 14px', borderRadius: 10, border: `1px solid ${D.red}40`,
                              background: D.redDim, color: D.red, fontSize: '0.8rem', fontWeight: 700,
                              cursor: assignDriverBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                              display: 'inline-flex', alignItems: 'center', gap: 6, opacity: assignDriverBusy ? 0.6 : 1
                            }}>
                            <UserX size={14} /> Unassign
                          </button>
                        )}
                        <button onClick={openAssignDriverModal} disabled={assignDriverBusy}
                          style={{
                            padding: '8px 16px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#fff',
                            fontSize: '0.8rem', fontWeight: 700, cursor: assignDriverBusy ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 12px rgba(59,130,246,0.3)', opacity: assignDriverBusy ? 0.6 : 1
                          }}>
                          <UserCheck size={14} /> {selectedProfileVehicle.driverUsername ? 'Change Driver' : 'Assign Driver'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Estimated Range Card */}
                  {(() => {
                    const capacity = Number(selectedProfileVehicle.fuelCapacity)
                    if (!capacity || isNaN(capacity)) return null;

                    const vStat = fuelStats.find(s => s.vehicleRegNumber === selectedProfileVehicle.registrationNo)
                    // If no efficiency data exists, assume a baseline of 10.0 km/L
                    const avgEfficiency = vStat && vStat.fuelEfficiency ? vStat.fuelEfficiency : 10.0
                    const estRange = avgEfficiency * capacity

                    return (
                      <div style={{
                        background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 20px',
                        display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, background: D.blueDim, color: D.blue,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.blue}30`, flexShrink: 0
                        }}>
                          <Zap size={22} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: D.textSub }}>Estimated Driving Range</span>
                          <h4 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 900, color: D.text }}>
                            ~{Math.round(estRange).toLocaleString()} km
                          </h4>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: D.textSub, maxWidth: 180 }}>
                          Based on avg efficiency: <strong style={{ color: D.text }}>{avgEfficiency.toFixed(1)} km/L</strong> and <strong style={{ color: D.text }}>{capacity}L</strong> capacity.
                        </div>
                      </div>
                    )
                  })()}

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
                          {records.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate) || (b.id || 0) - (a.id || 0)).map(rec => (
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

                      {/* Fuel Efficiency Trend Chart */}
                      {(() => {
                        const logsWithEff = profileFuelLogs
                          .filter(log => log.fuelEfficiency !== null && log.fuelEfficiency !== undefined)
                          .sort((a, b) => new Date(a.date) - new Date(b.date));
                        const trendLogs = logsWithEff.slice(-5);

                        if (trendLogs.length === 0) return null;

                        const maxEff = Math.max(...trendLogs.map(l => l.fuelEfficiency), 8);

                        return (
                          <div style={{
                            background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '18px 20px',
                            display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}>
                            <h5 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Recent Fuel Efficiency Trend (km/L)
                            </h5>

                            <div style={{
                              height: 120, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
                              paddingTop: 10, paddingBottom: 5, borderBottom: `1px solid ${D.border}`, margin: '10px 0'
                            }}>
                              {/* Grid line & fleet threshold indicator */}
                              <div style={{ position: 'absolute', left: 0, right: 0, top: `${100 - (5.0 / maxEff) * 100}%`, borderTop: `1px dashed ${D.red}`, opacity: 0.6, zIndex: 1 }} title="Fleet Threshold (5.0 km/L)" />

                              {trendLogs.map((log, idx) => {
                                const heightPct = (log.fuelEfficiency / maxEff) * 100;
                                const barColor = log.fuelEfficiency >= 10 ? D.green : log.fuelEfficiency >= 7 ? D.blue : log.fuelEfficiency >= 5 ? D.orange : D.red;

                                return (
                                  <div key={log.id || idx} style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${100 / trendLogs.length - 15}%`,
                                    height: '100%', justifyContent: 'flex-end', position: 'relative', zIndex: 2
                                  }}>
                                    {/* Bar value */}
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: barColor, marginBottom: 4 }}>
                                      {log.fuelEfficiency.toFixed(1)}
                                    </span>

                                    {/* Visual bar */}
                                    <div style={{
                                      width: '100%', height: `${heightPct}%`, background: barColor, borderRadius: '4px 4px 0 0',
                                      minHeight: 4, transition: 'height 0.5s ease', boxShadow: `0 2px 8px ${barColor}30`
                                    }} />

                                    {/* X-axis label */}
                                    <span style={{ fontSize: '0.62rem', color: D.textSub, marginTop: 6, whiteSpace: 'nowrap' }}>
                                      {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: D.textSub }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.green }} /> Excellent (≥10)
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.blue }} /> Good (7-10)
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.orange }} /> Avg (5-7)
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.red }} /> Poor (&lt;5)
                              </span>
                            </div>
                          </div>
                        );
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

            {/* Footer */}
            {isController && (
              <div style={{ padding: '16px 32px', borderTop: `1px solid ${D.border}`, display: 'flex', gap: 10, background: D.surfaceHi, flexShrink: 0 }}>
                <button
                  onClick={() => { closeProfile(); openEditModal(selectedProfileVehicle); }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(37, 99, 235,0.35)' }}
                >
                  <Edit2 size={15} /> Edit Vehicle
                </button>
                <button
                  onClick={() => openDeleteModal(selectedProfileVehicle)}
                  style={{ flex: 0.6, padding: '10px 0', borderRadius: 10, border: `1px solid rgba(239,68,68,0.3)`, background: D.redDim, color: D.red, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}



      {/* ── Odometer Quick Update Modal ────────────────────────────── */}
      {isOdometerModalOpen && odometerVehicle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, animation: 'fadeIn 0.25s ease' }} onClick={() => { setIsOdometerModalOpen(false); setOdometerVehicle(null); }}>
          <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 440, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <Gauge size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Update Odometer</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>{odometerVehicle.registrationNo}</p>
                </div>
              </div>
              <button onClick={() => { setIsOdometerModalOpen(false); setOdometerVehicle(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleOdometerSubmit} style={{ padding: '28px 32px' }}>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Current Mileage (KM)</label>
                <input
                  type="number"
                  value={newOdometerValue}
                  onChange={e => setNewOdometerValue(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Enter new mileage..."
                  autoFocus
                />
                <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: D.textSub }}>
                  Previous: <strong style={{ color: D.text }}>{odometerVehicle.currentMileageKm?.toLocaleString() || '0'} km</strong>
                </p>
              </div>

              {odometerError && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: D.red, fontSize: '0.8rem', fontWeight: 600 }}>
                  ⚠ {odometerError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(37, 99, 235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={16} /> Save Mileage
                </button>
                <button type="button" onClick={() => { setIsOdometerModalOpen(false); setOdometerVehicle(null); }} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Fuel Quick Update Modal ────────────────────────────── */}
      {isFuelModalOpen && fuelModalVehicle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, animation: 'fadeIn 0.25s ease' }} onClick={() => { setIsFuelModalOpen(false); setFuelModalVehicle(null); }}>
          <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 440, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <Fuel size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Update Fuel Type</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>{fuelModalVehicle.registrationNo}</p>
                </div>
              </div>
              <button onClick={() => { setIsFuelModalOpen(false); setFuelModalVehicle(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleFuelSubmit} style={{ padding: '28px 32px' }}>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Fuel Type</label>
                <select
                  value={newFuelValue}
                  onChange={e => setNewFuelValue(e.target.value)}
                  required
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  autoFocus
                >
                  <option value="" style={{ background: D.surfaceHi }}>Select Fuel Type</option>
                  <option value="PETROL" style={{ background: D.surfaceHi }}>Petrol 92 Octane</option>
                  <option value="SUPER_PETROL" style={{ background: D.surfaceHi }}>Petrol 95 Octane</option>
                  <option value="DIESEL" style={{ background: D.surfaceHi }}>Auto Diesel</option>
                  <option value="SUPER_DIESEL" style={{ background: D.surfaceHi }}>Super Diesel</option>
                </select>
                <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: D.textSub }}>
                  Previous: <strong style={{ color: D.text }}>{fuelModalVehicle.fuelType || 'N/A'}</strong>
                </p>
              </div>

              {fuelModalError && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: D.red, fontSize: '0.8rem', fontWeight: 600 }}>
                  ⚠ {fuelModalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(37, 99, 235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={16} /> Save Fuel Type
                </button>
                <button type="button" onClick={() => { setIsFuelModalOpen(false); setFuelModalVehicle(null); }} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.5); }
          50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.8); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.5); }
        }
        @keyframes pulse-orange {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); border-color: rgba(245, 158, 11, 0.5); }
          50% { box-shadow: 0 0 12px 4px rgba(245, 158, 11, 0.25); border-color: rgba(245, 158, 11, 0.8); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); border-color: rgba(245, 158, 11, 0.5); }
        }
        .pulse-warning-red {
          animation: pulse-red 2s infinite ease-in-out !important;
        }
        .pulse-warning-orange {
          animation: pulse-orange 2s infinite ease-in-out !important;
        }
      `}</style>

      {/* ── Attachment Lightbox Modal ─────────────────────────────────── */}
      {attachmentViewer.isOpen && (
        <div
          onClick={() => setAttachmentViewer(prev => ({ ...prev, isOpen: false }))}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '24px',
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
              <FileText size={18} color="#10b981" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Vehicle Document
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
            }}
          >
            <img
              src={attachmentViewer.url}
              alt="Vehicle Document"
              style={{
                maxWidth: '100%', maxHeight: '100%', borderRadius: 16,
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                objectFit: 'contain', background: '#000',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default VehiclesPage
