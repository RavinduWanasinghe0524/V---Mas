import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import TripActionModal from '../components/TripActionModal'
import { useD, useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { tripAPI, userAPI, vehicleAPI, serviceAPI, notificationAPI } from '../services/api'
import {
  MapPin, Navigation, Car, User, Calendar, Plus, Loader2,
  Play, X, CheckCircle, Ban, Clock, MoreVertical, ClipboardList, Wrench, Fuel, AlertTriangle, UserCheck,
  Trash2, Archive, Paperclip, Check, FileText, Eye, Gauge, DollarSign, Edit2, ChevronDown, ChevronUp,
  Filter
} from 'lucide-react'

// ── Helpers to parse job type from purpose field ──────────────────────────
const getJobType = (purposeText) => {
  const p = purposeText || ''
  if (p.startsWith('[Service]')) return 'SERVICE'
  if (p.startsWith('[Fuel]')) return 'FUEL'
  return 'TRIP'
}

const getCleanPurpose = (purposeText) => {
  const p = purposeText || ''
  return p.replace(/^\[(Service|Fuel|Trip)\]\s*/i, '').replace(/\[Access:(YES|NO)\]\s*/i, '')
}

const hasDriverServiceAccess = (trip) => {
  if (!trip) return false
  if (trip.allowDriverServiceLog === false) return false
  if (trip.purpose?.includes('[Access:NO]')) return false
  return true
}

const hasAnyServiceRecordForTrip = (trip, allServices) => {
  if (!trip || !trip.vehicleRegNumber) return false
  const tripReg = (trip.vehicleRegNumber || '').replace(/^VEH-/i, '').trim().toUpperCase()
  const cleanP = getCleanPurpose(trip.purpose)
  const matchedType = SERVICE_TYPES.find(t => t.label.toLowerCase() === cleanP.toLowerCase())?.value

  return (allServices || []).some(serv => {
    if (!serv || serv.isDeleted || serv.deleted) return false
    const servReg = (serv.vehicleRegNumber || '').replace(/^VEH-/i, '').trim().toUpperCase()
    if (servReg !== tripReg) return false

    if (matchedType) {
      return serv.serviceType === matchedType
    }
    if (cleanP && serv.serviceTypeDetail) {
      return serv.serviceTypeDetail.toLowerCase() === cleanP.toLowerCase()
    }
    return serv.createdBy && trip.driverUsername && serv.createdBy.toLowerCase() === trip.driverUsername.toLowerCase()
  })
}

// ── Helpers for checking overdue services (sync with ServicePage) ────────
const getStatus = (s) => {
  if (!s.serviceDate) return 'SCHEDULED'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const scheduled = new Date(s.serviceDate)
  scheduled.setHours(0, 0, 0, 0)
  return scheduled > today ? 'SCHEDULED' : 'COMPLETED'
}

const getVehicleMilestones = (vehicle, services, intervals) => {
  if (!vehicle || !intervals) return []
  const vehicleIntervals = intervals.filter(i => i.vehicleType === vehicle.vehicleType)
  
  return vehicleIntervals.map(interval => {
    const completed = services.filter(s =>
      s.vehicleRegNumber === vehicle.registrationNo &&
      s.serviceType === interval.serviceType &&
      getStatus(s) === 'COMPLETED'
    )
    
    let lastServiceMileage = vehicle.initialMileageKm != null ? Number(vehicle.initialMileageKm) : Number(vehicle.currentMileageKm || 0)
    if (completed.length > 0) {
      completed.sort((a, b) => Number(b.currentMileageKm || 0) - Number(a.currentMileageKm || 0))
      lastServiceMileage = Number(completed[0].currentMileageKm || 0)
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
      status
    }
  })
}

const isServiceOverdueForVehicle = (vehicle, serviceType, services, intervals) => {
  if (!vehicle) return false

  // 1. Check mileage milestones
  if (intervals && intervals.length > 0) {
    const milestones = getVehicleMilestones(vehicle, services, intervals)
    const m = milestones.find(ms => ms.serviceType === serviceType)
    if (m && m.status === 'OVERDUE') return true
  }

  // 2. Check date-based overdue scheduled tasks
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdueDate = services.some(s => 
    s.vehicleRegNumber === vehicle.registrationNo &&
    s.serviceType === serviceType &&
    getStatus(s) === 'SCHEDULED' &&
    s.serviceDate &&
    new Date(s.serviceDate) < today
  )

  return isOverdueDate
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

// ── Status → badge styling ────────────────────────────────────────────────
const statusBadge = (status) => {
  const s = (status || 'ASSIGNED').toUpperCase()
  switch (s) {
    case 'STARTED':   return { label: 'In Progress', bg: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'rgba(56,189,248,0.28)' }
    case 'DECLINED':  return { label: 'Declined',    bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.28)' }
    case 'COMPLETED': return { label: 'Completed',   bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.28)' }
    case 'CANCELLED': return { label: 'Cancelled',   bg: 'rgba(148,163,184,0.14)', color: '#94a3b8', border: 'rgba(148,163,184,0.28)' }
    default:          return { label: 'Assigned',    bg: 'rgba(251,191,36,0.12)', color: '#f59e0b', border: 'rgba(251,191,36,0.28)' }
  }
}

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const up = (s) => (s || '').toUpperCase()

const TripsPage = () => {
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'
  const { user, isAdmin, isController } = useAuth()
  const canManage = isAdmin || isController

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [trips, setTrips] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [allServices, setAllServices] = useState([])
  const [allIntervals, setAllIntervals] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [banner, setBanner] = useState(null) // { type: 'success'|'error', text }

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [activeTab, setActiveTab] = useState('TRIP') // 'TRIP' | 'SERVICE' | 'FUEL'
  const emptyForm = { driverUsername: '', vehicleRegNumber: '', origin: '', destination: '', purpose: '', scheduledDate: '', allowDriverServiceLog: true, status: '' }
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [editingTripId, setEditingTripId] = useState(null)

  const [tripToCancel, setTripToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [driverModal, setDriverModal] = useState(null) // { action, trip }

  const [deletedDrawer, setDeletedDrawer] = useState(false)
  const [deletedTrips, setDeletedTrips] = useState([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [deletedDetail, setDeletedDetail] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [deleteConfirmTrip, setDeleteConfirmTrip] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')
  const [filterJobType, setFilterJobType] = useState('all')

  // ── Service Log Modal (driver: log service details for a SERVICE job) ─
  const emptyServiceLog = {
    vehicleRegNumber: '', serviceType: '', serviceTypeDetail: '',
    serviceDate: '', currentMileageKm: '', serviceCost: '',
    technicianWorkshop: '', description: '', nextServiceDue: '', nextServiceMileageKm: '',
  }
  const [serviceLogModal, setServiceLogModal] = useState(null) // trip object when open
  const [serviceLogForm, setServiceLogForm] = useState(emptyServiceLog)
  const [serviceLogFile, setServiceLogFile] = useState(null)
  const [serviceLogSubmitting, setServiceLogSubmitting] = useState(false)
  const [serviceLogError, setServiceLogError] = useState(null)
  const [vehicleCurrentMileage, setVehicleCurrentMileage] = useState(null) // fetched on modal open
  const [pendingDetailModal, setPendingDetailModal] = useState(null) // service record object when viewing details
  const [expandedServices, setExpandedServices] = useState({}) // { [serviceId]: boolean }

  const toggleServiceExpand = (id) => {
    setExpandedServices(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const flash = (type, text) => {
    setBanner({ type, text })
    setTimeout(() => setBanner(null), 4000)
  }

  const loadDeletedTrips = async () => {
    try {
      setLoadingDeleted(true)
      const res = await tripAPI.getDeletedTrips()
      setDeletedTrips(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load deleted jobs:', err)
      flash('error', 'Failed to load deleted jobs')
    } finally {
      setLoadingDeleted(false)
    }
  }

  useEffect(() => {
    if (deletedDrawer) {
      loadDeletedTrips()
    }
  }, [deletedDrawer])

  const handleDeleteTrip = async (tripId) => {
    setDeletingId(tripId)
    try {
      await tripAPI.deleteTrip(tripId)
      flash('success', 'Job deleted successfully')
      setDeleteConfirmTrip(null)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to delete job')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRestoreTrip = async (tripId) => {
    setRestoringId(tripId)
    try {
      await tripAPI.restoreTrip(tripId)
      flash('success', 'Job restored successfully')
      loadTrips()
      if (deletedDrawer) {
        loadDeletedTrips()
      }
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to restore job')
    } finally {
      setRestoringId(null)
    }
  }

  const loadTrips = useCallback(async () => {
    try {
      const res = canManage ? await tripAPI.getAllTrips() : await tripAPI.getMyTrips()
      setTrips(res.data.data || [])
    } catch (err) {
      console.error('Error loading jobs:', err)
      flash('error', 'Could not load jobs')
    } finally {
      setLoading(false)
    }
  }, [canManage])

  useEffect(() => {
    loadTrips()
    serviceAPI.getAllServices()
      .then(res => setAllServices(res.data.data || []))
      .catch(err => console.error('Error loading services:', err))
    vehicleAPI.getAllVehicles()
      .then(res => setVehicles((res.data.data || []).filter(v => !v.deleted && !v.isDeleted)))
      .catch(err => console.error('Error loading vehicles:', err))

    if (canManage) {
      userAPI.getAllDrivers()
        .then(res => setDrivers((res.data.data || []).filter(d => (d.accountStatus || 'ACTIVE') === 'ACTIVE')))
        .catch(err => console.error('Error loading drivers:', err))
      serviceAPI.getAllIntervals()
        .then(res => setAllIntervals(res.data.data || []))
        .catch(err => console.error('Error loading intervals:', err))
    }
  }, [loadTrips, canManage])

  // Lock body scroll while a modal is open
  useEffect(() => {
    const open = showAssignModal || !!tripToCancel || !!driverModal || !!pendingDetailModal || !!serviceLogModal || !!deleteConfirmTrip || deletedDrawer
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showAssignModal, tripToCancel, driverModal, pendingDetailModal, serviceLogModal, deleteConfirmTrip, deletedDrawer])

  // ── Controller: assign a job ──────────────────────────────────────────
  const handleAssign = async (e) => {
    e.preventDefault()
    if (!form.driverUsername || !form.vehicleRegNumber || !form.destination.trim()) {
      flash('error', 'Driver, vehicle and destination/location are required')
      return
    }
    if (!form.scheduledDate) {
      flash('error', 'Scheduled Date is required')
      return
    }
    if (activeTab === 'SERVICE' && !form.purpose) {
      flash('error', 'Service Description is required')
      return
    }
    setSubmitting(true)
    try {
      const accessTag = form.allowDriverServiceLog ? '[Access:YES]' : '[Access:NO]'
      const prefix = activeTab === 'SERVICE' ? '[Service] ' : activeTab === 'FUEL' ? '[Fuel] ' : '[Trip] '
      const finalPurpose = `${prefix}${accessTag} ${(form.purpose || '').trim()}`

      const payload = {
        ...form,
        purpose: finalPurpose,
        allowDriverServiceLog: form.allowDriverServiceLog,
        scheduledDate: form.scheduledDate || null
      }

      if (editingTripId) {
        await tripAPI.updateTrip(editingTripId, payload)
        flash('success', `${activeTab === 'SERVICE' ? 'Service' : activeTab === 'FUEL' ? 'Fuel' : 'Trip'} job updated successfully`)
      } else {
        await tripAPI.assignTrip(payload)
        flash('success', `${activeTab === 'SERVICE' ? 'Service' : activeTab === 'FUEL' ? 'Fuel' : 'Trip'} job assigned successfully`)
      }
      setForm(emptyForm)
      setEditingTripId(null)
      setShowAssignModal(false)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || `Failed to ${editingTripId ? 'update' : 'assign'} job`)
    } finally {
      setSubmitting(false)
    }
  }

  const closeAssignModal = () => { if (!submitting) { setShowAssignModal(false); setForm(emptyForm); setEditingTripId(null); } }

  // When a vehicle is selected in the modal, auto-fill the assigned driver (but allow override)
  const handleVehicleChange = (regNo) => {
    const selected = vehicles.find(v => v.registrationNo === regNo)
    setForm(prev => ({
      ...prev,
      vehicleRegNumber: regNo,
      // Auto-fill driver only if the vehicle has one and the driver field is currently empty OR
      // was previously auto-filled (i.e. no manual override)
      driverUsername: selected?.driverUsername || prev.driverUsername
    }))
  }

  const confirmCancel = async () => {
    if (!tripToCancel) return
    setCancelling(true)
    try {
      await tripAPI.cancelTrip(tripToCancel.id)
      flash('success', 'Job cancelled')
      setTripToCancel(null)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to cancel job')
    } finally {
      setCancelling(false)
    }
  }

  // ── Driver: act on a job (confirmed via TripActionModal) ───────────────
  const runDriverAction = async (reason) => {
    if (!driverModal) return
    const { action, trip } = driverModal
    setBusyId(trip.id)
    try {
      if (action === 'start') { await tripAPI.startTrip(trip.id); flash('success', 'Job accepted successfully!') }
      if (action === 'complete') { await tripAPI.completeTrip(trip.id); flash('success', 'Job completed') }
      if (action === 'decline') { await tripAPI.declineTrip(trip.id, reason || ''); flash('success', 'Job declined') }
      setDriverModal(null)
      loadTrips()
    } catch (err) {
      flash('error', err.response?.data?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  // ── Driver: open service log modal for a SERVICE job ───────────────────
  const openServiceLog = async (trip) => {
    const todayStr = (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    })()
    // Derive service type from purpose: e.g. "[Service] Oil Change" → 'OIL_CHANGE'
    const cleanPurpose = getCleanPurpose(trip.purpose)
    const matchedType = SERVICE_TYPES.find(t => t.label.toLowerCase() === cleanPurpose.toLowerCase())

    // Find vehicle from vehicles state array to pre-fill current mileage
    const targetVeh = vehicles.find(v => (v.registrationNo || '').replace(/^VEH-/i, '').toUpperCase() === (trip.vehicleRegNumber || '').replace(/^VEH-/i, '').toUpperCase())
    let currentKm = targetVeh?.currentMileageKm ?? targetVeh?.initialMileageKm ?? null
    let prefillMileage = currentKm != null ? String(currentKm) : ''

    if (currentKm == null) {
      try {
        const vRes = await vehicleAPI.getMyVehicle()
        const v = vRes?.data?.data
        if (v && (v.registrationNo || '').replace(/^VEH-/i, '').toUpperCase() === (trip.vehicleRegNumber || '').replace(/^VEH-/i, '').toUpperCase()) {
          currentKm = v.currentMileageKm ?? null
          if (currentKm != null) prefillMileage = String(currentKm)
        }
      } catch { /* non-fatal */ }
    }

    setVehicleCurrentMileage(currentKm)
    setServiceLogForm({
      ...emptyServiceLog,
      vehicleRegNumber: trip.vehicleRegNumber || '',
      serviceType: matchedType ? matchedType.value : '',
      serviceDate: todayStr,
      driverUsername: trip.driverUsername || '',
      currentMileageKm: prefillMileage,
    })
    setServiceLogFile(null)
    setServiceLogError(null)
    setServiceLogModal(trip)
  }

  const closeServiceLog = () => {
    if (serviceLogSubmitting) return
    setServiceLogModal(null)
    setServiceLogForm(emptyServiceLog)
    setServiceLogFile(null)
    setServiceLogError(null)
  }

  // ── Driver: open service log modal for editing an existing PENDING record ─
  const openEditServiceLog = (pendingRecord, trip) => {
    setServiceLogForm({
      id: pendingRecord.id,
      vehicleRegNumber: pendingRecord.vehicleRegNumber || '',
      serviceType: pendingRecord.serviceType || '',
      serviceTypeDetail: pendingRecord.serviceTypeDetail || '',
      serviceDate: pendingRecord.serviceDate ? pendingRecord.serviceDate.split('T')[0] : '',
      currentMileageKm: pendingRecord.currentMileageKm ? String(pendingRecord.currentMileageKm) : '',
      serviceCost: pendingRecord.serviceCost ? String(pendingRecord.serviceCost) : '',
      technicianWorkshop: pendingRecord.technicianWorkshop || '',
      description: pendingRecord.description || '',
      nextServiceDue: pendingRecord.nextServiceDue ? pendingRecord.nextServiceDue.split('T')[0] : '',
      nextServiceMileageKm: pendingRecord.nextServiceMileageKm ? String(pendingRecord.nextServiceMileageKm) : '',
      driverUsername: pendingRecord.createdBy || user?.userName || '',
    })
    setVehicleCurrentMileage(pendingRecord.currentMileageKm || null)
    setServiceLogFile(null)
    setServiceLogError(null)
    setServiceLogModal(trip || { id: pendingRecord.id, vehicleRegNumber: pendingRecord.vehicleRegNumber })
  }

  const handleServiceLogSubmit = async (e) => {
    e.preventDefault()
    if (!serviceLogForm.serviceType) { setServiceLogError('Service type is required.'); return }
    if (!serviceLogForm.serviceDate) { setServiceLogError('Service date is required.'); return }
    if (!serviceLogForm.currentMileageKm) { setServiceLogError('Current mileage is required.'); return }
    if (!serviceLogForm.serviceCost) { setServiceLogError('Service cost is required.'); return }
    if (!serviceLogForm.technicianWorkshop) { setServiceLogError('Technician / Workshop is required.'); return }
    setServiceLogSubmitting(true)
    setServiceLogError(null)
    try {
      const cleanDate = (d) => {
        if (!d || !String(d).trim()) return null
        return String(d).split('T')[0]
      }

      const payload = {
        vehicleRegNumber: (serviceLogForm.vehicleRegNumber || '').replace(/^VEH-/i, '').trim(),
        serviceType: serviceLogForm.serviceType,
        serviceTypeDetail: serviceLogForm.serviceType === 'OTHER' ? (serviceLogForm.serviceTypeDetail || null) : null,
        serviceDate: cleanDate(serviceLogForm.serviceDate),
        currentMileageKm: Number(serviceLogForm.currentMileageKm),
        serviceCost: Number(serviceLogForm.serviceCost),
        technicianWorkshop: (serviceLogForm.technicianWorkshop || '').trim(),
        description: serviceLogForm.description && serviceLogForm.description.trim() ? serviceLogForm.description.trim() : null,
        nextServiceDue: cleanDate(serviceLogForm.nextServiceDue),
        nextServiceMileageKm: serviceLogForm.nextServiceMileageKm ? Number(serviceLogForm.nextServiceMileageKm) : null,
        driverUsername: serviceLogForm.driverUsername || user?.userName || null,
        status: canManage ? 'APPROVED' : 'PENDING', // Controller submissions are auto-approved (APPROVED), driver submissions require approval (PENDING)
      }

      let res;
      if (serviceLogForm.id) {
        res = await serviceAPI.updateService(serviceLogForm.id, payload)
      } else {
        res = await serviceAPI.createService(payload)
      }

      // Upload attachment if provided
      if (serviceLogFile && (res.data?.data?.id || serviceLogForm.id)) {
        try { await serviceAPI.uploadAttachment(serviceLogForm.id || res.data.data.id, serviceLogFile) } catch { /* non-fatal */ }
      }

      // Notify controllers of new submission or update
      // Notify controllers of new submission or update
      try {
        const isUpdate = !!serviceLogForm.id
        const approvalMsg = isUpdate
          ? `Driver ${user?.userName} updated the pending service details for ${payload.vehicleRegNumber} (${payload.serviceType}) — awaiting your approval.`
          : `Driver ${user?.userName} logged service details for ${payload.vehicleRegNumber} (${payload.serviceType}) from Job #${serviceLogModal?.id} — awaiting your approval.`

        await notificationAPI.create({ vehicleRegNumber: `VEH-${payload.vehicleRegNumber}`, message: approvalMsg, type: 'INFO' })
      } catch { /* non-fatal */ }

      // Automatically complete the job if submitted from an assigned/started job
      if (serviceLogModal?.id && (serviceLogModal.status === 'STARTED' || serviceLogModal.status === 'ASSIGNED')) {
        try {
          await tripAPI.completeTrip(serviceLogModal.id)
        } catch (err) {
          console.error("Auto-complete job error:", err)
        }
      }

      closeServiceLog()
      flash('success', serviceLogForm.id ? 'Pending service details updated & controller notified!' : 'Service details submitted & job completed!')
      loadTrips()
      serviceAPI.getAllServices()
        .then(sRes => setAllServices(sRes.data.data || []))
        .catch(() => { })
    } catch (err) {
      setServiceLogError(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Failed to submit service details.')
    } finally {
      setServiceLogSubmitting(false)
    }
  }

  // ── Controller: Approve / Reject / Delete Service Record from Job Management ──
  const handleApproveServiceInTrips = async (serviceId) => {
    try {
      setBusyId(serviceId)
      await serviceAPI.approveService(serviceId)
      flash('success', 'Service record approved successfully!')
      const res = await serviceAPI.getAllServices()
      setAllServices(res.data.data || [])
      setPendingDetailModal(null)
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to approve service record')
    } finally {
      setBusyId(null)
    }
  }

  const handleRejectServiceInTrips = async (serviceId) => {
    try {
      setBusyId(serviceId)
      await serviceAPI.rejectService(serviceId)
      flash('error', 'Service record rejected successfully')
      const res = await serviceAPI.getAllServices()
      setAllServices(res.data.data || [])
      setPendingDetailModal(null)
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to reject service record')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteServiceInTrips = async (serviceId) => {
    try {
      setBusyId(serviceId)
      await serviceAPI.deleteService(serviceId)
      flash('success', 'Service record deleted')
      const res = await serviceAPI.getAllServices()
      setAllServices(res.data.data || [])
      setPendingDetailModal(null)
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to delete service record')
    } finally {
      setBusyId(null)
    }
  }

  const handleViewAttachmentInTrips = async (record) => {
    try {
      const res = await serviceAPI.getAttachmentBlob(record.id)
      const path = record.attachmentPath || ''
      const isPdf = path.toLowerCase().endsWith('.pdf')
      const blob = new Blob([res.data], { type: isPdf ? 'application/pdf' : 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      flash('error', 'Failed to load attachment. File may not exist.')
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────
  const stat = {
    total: trips.length,
    assigned: trips.filter(t => up(t.status) === 'ASSIGNED').length,
    started: trips.filter(t => up(t.status) === 'STARTED').length,
    completed: trips.filter(t => up(t.status) === 'COMPLETED').length,
  }
  const uniqueDrivers = [...new Set(trips.map(t => t.driverUsername).filter(Boolean))]
  const filteredTrips = trips.filter(t => {
    if (filterStatus !== 'all' && up(t.status) !== filterStatus) return false
    if (canManage && filterDriver !== 'all' && t.driverUsername !== filterDriver) return false
    if (filterJobType !== 'all' && getJobType(t.purpose) !== filterJobType) return false
    return true
  })

  // ── Style helpers (match Fuel Management) ───────────────────────────────
  const card = { background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }
  const inputStyle = { width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem', color: D.text, background: D.inputBg, outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 800, color: D.textSub, marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }
  const filterStyle = { ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer', width: '100%' }
  const onFocus = e => { e.target.style.borderColor = D.purple; e.target.style.boxShadow = `0 0 0 4px ${D.purpleDim}` }
  const onBlur = e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }

  const statCards = [
    { label: 'Total Jobs', value: stat.total, icon: <ClipboardList size={24} />, color: D.blue, bg: D.blueDim },
    { label: 'Awaiting Response', value: stat.assigned, icon: <Clock size={24} />, color: D.gold, bg: D.goldDim },
    { label: 'In Progress', value: stat.started, icon: <Navigation size={24} />, color: D.indigo, bg: D.indigoDim },
    { label: 'Completed', value: stat.completed, icon: <CheckCircle size={24} />, color: D.green, bg: D.greenDim },
  ]

  // Find selected vehicle and determine overdue services
  const selectedVehicle = vehicles.find(v => v.registrationNo === form.vehicleRegNumber)
  const sortedServiceTypes = [...SERVICE_TYPES].map(type => {
    const isOverdue = isServiceOverdueForVehicle(selectedVehicle, type.value, allServices, allIntervals)
    return { ...type, isOverdue }
  }).sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0))

  if (loading) return (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Jobs" subtitle={canManage ? 'Home / Job Assignments' : 'Home / My Jobs'} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 80, color: D.textSub }}>
          <Loader2 size={20} className="spin" /> Loading jobs…
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Jobs" subtitle={canManage ? 'Home / Job Assignments' : 'Home / My Jobs'} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body">

          {banner && (
            <div style={{
              marginBottom: 20, padding: '12px 18px', borderRadius: 14, fontWeight: 600, fontSize: '0.85rem',
              background: banner.type === 'success' ? D.greenDim : D.redDim,
              color: banner.type === 'success' ? D.green : D.red,
              border: `1px solid ${banner.type === 'success' ? D.green : D.red}40`,
            }}>{banner.text}</div>
          )}

          {/* ── Hero Banner ───────────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)',
            borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px var(--primary-glow), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 16px 48px rgba(0,0,0,0.15), 0 8px 32px var(--primary-glow)',
            border: '1px solid var(--border-strong)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          }}>
            {[['80%', '-20px', '220px', 'rgba(255,255,255,0.02)'], ['20%', '60%', '150px', 'rgba(255,255,255,0.02)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.01)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {canManage ? 'Fleet Job Management' : 'My Assigned Jobs'}
                </h1>
                <p style={{ margin: '4px 0 0', color: '#f8fafc', fontSize: '0.9rem', fontWeight: 500 }}>
                  {canManage ? 'Assign jobs & vehicles, track driver progress' : 'Start, decline or complete the jobs assigned to you'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Quick Action Cards (Controller only) ──────────────────── */}
          {canManage && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 36 }}>
              {[
                { type: 'TRIP', label: 'Trip Assignment', desc: 'Assign driver and vehicle for transport trips', icon: <Navigation size={22} />, color: D.blue, bg: D.blueDim },
                { type: 'SERVICE', label: 'Service Assignment', desc: 'Dispatch driver for maintenance & services', icon: <Wrench size={22} />, color: D.gold, bg: D.goldDim },
                { type: 'FUEL', label: 'Fuel Assignment', desc: 'Assign driver to fill up gas before trip or when low', icon: <Fuel size={22} />, color: D.green, bg: D.greenDim },
              ].map(act => (
                <div key={act.type} onClick={() => { setActiveTab(act.type); setShowAssignModal(true) }}
                  style={{
                    background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, padding: '24px',
                    display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = act.color + '60';
                    e.currentTarget.style.boxShadow = `0 12px 28px ${act.color}15`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = D.border;
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                  }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: act.bg, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${act.color}30` }}>
                    {act.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginBottom: 4 }}>{act.label}</div>
                    <div style={{ fontSize: '0.78rem', color: D.textSub, lineHeight: 1.4 }}>{act.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}


          {/* ── Controls & List ───────────────────────────────────────── */}
          <div style={{ ...card, padding: 0 }}>
            <div style={{ padding: '22px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: D.surfaceHi, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
                {/* Status filter */}
                <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 160 }}>
                  <ClipboardList size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.blue, pointerEvents: 'none', opacity: 0.8 }} />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...filterStyle, paddingLeft: 38 }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="all">All Statuses</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="STARTED">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DECLINED">Declined</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                </div>
                {/* Job Type filter */}
                <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 160 }}>
                  <Filter size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.indigo, pointerEvents: 'none', opacity: 0.8 }} />
                  <select value={filterJobType} onChange={e => setFilterJobType(e.target.value)} style={{ ...filterStyle, paddingLeft: 38 }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="all">All Job Types</option>
                    <option value="TRIP">Trip Assignment</option>
                    <option value="SERVICE">Service Assignment</option>
                    <option value="FUEL">Fuel Assignment</option>
                  </select>
                  <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                </div>
                {/* Driver filter (controller only) */}
                {canManage && (
                  <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 160 }}>
                    <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.purple, pointerEvents: 'none', opacity: 0.8 }} />
                    <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)} style={{ ...filterStyle, paddingLeft: 38 }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="all">All Drivers</option>
                      {uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <MoreVertical size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canManage && (
                  <button
                    onClick={() => setDeletedDrawer(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 12,
                      background: D.surface, border: `1px solid ${D.border}`,
                      color: D.textSub, fontSize: '0.8rem', fontWeight: 800,
                      cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.28)'; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.background = D.surface; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub }}
                  >
                    <Archive size={13} />
                    Deleted Jobs
                  </button>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: D.text, padding: '10px 16px', borderRadius: 12, background: D.surface, border: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>
                  {filteredTrips.length} Job{filteredTrips.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Job rows */}
            {filteredTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: D.textSub }}>
                <ClipboardList size={40} color={D.textFaint} style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 700, color: D.text, marginBottom: 4 }}>No jobs found</div>
                <div style={{ fontSize: '0.85rem' }}>{canManage ? 'Assign a job with the buttons above.' : 'You have no assigned jobs right now.'}</div>
              </div>
            ) : (
              filteredTrips.map((trip, i) => {
                const type = getJobType(trip.purpose)
                const cleanPurpose = getCleanPurpose(trip.purpose)
                const badge = statusBadge(trip.status)
                const s = up(trip.status)
                const busy = busyId === trip.id

                const typeConfig = {
                  TRIP: { icon: <Navigation size={20} color={D.blue} />, bg: D.blueDim, label: 'Trip' },
                  SERVICE: { icon: <Wrench size={20} color={D.gold} />, bg: D.goldDim, label: 'Service' },
                  FUEL: { icon: <Fuel size={20} color={D.green} />, bg: D.greenDim, label: 'Fuel' },
                }[type] || { icon: <Navigation size={20} color={D.blue} />, bg: D.blueDim, label: 'Trip' }

                const jobServices = (allServices || []).filter(serv => {
                  if (!serv || serv.deleted || serv.isDeleted) return false
                  const servReg = (serv.vehicleRegNumber || '').replace(/^VEH-/i, '').trim().toUpperCase()
                  const tripReg = (trip.vehicleRegNumber || '').replace(/^VEH-/i, '').trim().toUpperCase()
                  if (servReg !== tripReg) return false

                  const cleanP = getCleanPurpose(trip.purpose)
                  const matchedType = SERVICE_TYPES.find(t => t.label.toLowerCase() === cleanP.toLowerCase())?.value

                  if (type === 'SERVICE') {
                    if (matchedType) {
                      return serv.serviceType === matchedType
                    }
                    if (cleanP && serv.serviceTypeDetail) {
                      return serv.serviceTypeDetail.toLowerCase() === cleanP.toLowerCase()
                    }
                    return serv.createdBy && trip.driverUsername && serv.createdBy.toLowerCase() === trip.driverUsername.toLowerCase()
                  }
                  return false
                })

                const isAnyServiceExpanded = jobServices.length > 0 && jobServices.some(s => expandedServices[s.id])

                return (
                  <div key={trip.id} style={{ display: 'flex', flexDirection: 'column', padding: '20px 32px', borderBottom: i < filteredTrips.length - 1 ? `1px solid ${D.border}` : 'none', transition: 'background 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.background = D.surfaceHi}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                      {/* Route + meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 260px', minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: typeConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {typeConfig.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: typeConfig.bg, color: typeConfig.icon.props.color, border: `1px solid ${typeConfig.icon.props.color}30`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {typeConfig.label}
                            </span>
                            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {type === 'TRIP' && trip.origin ? `${trip.origin} → ` : ''}{trip.destination}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: D.textSub, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Car size={13} /> {trip.vehicleRegNumber}</span>
                            {canManage && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={13} /> {trip.driverUsername}</span>}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {fmtDate(trip.scheduledDate)}</span>
                            {cleanPurpose && <span style={{ color: D.textSub, fontWeight: 500 }}>· {cleanPurpose}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '5px 12px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{badge.label}</span>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'center' }}>
                        {/* View Service Details Button directly on Job Row when service record exists */}
                        {jobServices.length > 0 && (
                          <ActionBtn
                            onClick={() => {
                              const next = !isAnyServiceExpanded
                              setExpandedServices(prev => {
                                const copy = { ...prev }
                                jobServices.forEach(s => { copy[s.id] = next })
                                return copy
                              })
                            }}
                            disabled={busy}
                            bg={isAnyServiceExpanded ? D.surfaceHi : 'rgba(16,185,129,0.12)'}
                            color={isAnyServiceExpanded ? D.text : '#059669'}
                            border="1px solid rgba(16,185,129,0.35)"
                            icon={isAnyServiceExpanded ? <ChevronUp size={14} /> : <Wrench size={14} />}
                          >
                            {isAnyServiceExpanded ? 'Hide Service Details' : 'View Service Details'}
                          </ActionBtn>
                        )}

                        {/* Driver */}
                        {!canManage && s === 'ASSIGNED' && (
                          <>
                            <ActionBtn onClick={() => setDriverModal({ action: 'start', trip })} disabled={busy} bg="linear-gradient(135deg,#059669,#10b981)" color="#fff" icon={<Play size={14} />}>Accept</ActionBtn>
                            <ActionBtn onClick={() => setDriverModal({ action: 'decline', trip })} disabled={busy} bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<X size={14} />}>Decline</ActionBtn>
                          </>
                        )}
                        {!canManage && s === 'STARTED' && (
                          <>
                            {/* Service jobs: show 'Log Service' button if controller granted access */}
                            {hasDriverServiceAccess(trip) && (
                              <ActionBtn
                                onClick={() => openServiceLog(trip)}
                                disabled={busy}
                                bg="linear-gradient(135deg,#f59e0b,#d97706)"
                                color="#fff"
                                icon={<FileText size={14} />}
                              >
                                Log Service
                              </ActionBtn>
                            )}
                            <ActionBtn onClick={() => setDriverModal({ action: 'complete', trip })} disabled={busy} bg="linear-gradient(135deg,var(--primary-dark),var(--primary))" color="#fff" icon={<CheckCircle size={14} />}>Complete</ActionBtn>
                          </>
                        )}
                        {/* Controller */}
                        {canManage && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {/* Controller: Add Service Record ONLY if no service record has been entered for this job yet */}
                            {type === 'SERVICE' && !hasAnyServiceRecordForTrip(trip, allServices) && (
                              <ActionBtn
                                onClick={() => openServiceLog(trip)}
                                disabled={busy}
                                bg="linear-gradient(135deg,#f59e0b,#d97706)"
                                color="#fff"
                                icon={<Wrench size={14} />}
                              >
                                Add Service Record
                              </ActionBtn>
                            )}

                            {(s === 'ASSIGNED' || s === 'DECLINED' || s === 'STARTED') && (
                              <ActionBtn
                                onClick={() => {
                                  const jobType = getJobType(trip.purpose)
                                  setActiveTab(jobType)
                                  setEditingTripId(trip.id)
                                  setForm({
                                    driverUsername: trip.driverUsername || '',
                                    vehicleRegNumber: trip.vehicleRegNumber || '',
                                    origin: trip.origin || '',
                                    destination: trip.destination || '',
                                    purpose: getCleanPurpose(trip.purpose) || '',
                                    scheduledDate: trip.scheduledDate ? trip.scheduledDate.split('T')[0] : '',
                                    allowDriverServiceLog: hasDriverServiceAccess(trip),
                                    status: trip.status
                                  })
                                  setShowAssignModal(true)
                                }}
                                disabled={busy}
                                bg="linear-gradient(135deg, var(--primary-dark), var(--primary))"
                                color="#fff"
                                icon={<Edit2 size={14} />}
                              >
                                Edit
                              </ActionBtn>
                            )}

                            {(s === 'DECLINED' || s === 'COMPLETED' || s === 'CANCELLED') && (
                              <span style={{ fontSize: '0.76rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
                                {s === 'DECLINED' && trip.declineReason ? `Reason: ${trip.declineReason}` : <><Clock size={13} /> Closed</>}
                              </span>
                            )}
                            {s === 'ASSIGNED' && (
                              <ActionBtn onClick={() => setTripToCancel(trip)} disabled={busy} bg={D.redDim} color={D.red} border={`1px solid ${D.red}40`} icon={<Ban size={14} />}>Cancel</ActionBtn>
                            )}
                            <ActionBtn onClick={() => setDeleteConfirmTrip(trip)} disabled={busy} bg="rgba(239,68,68,0.1)" color="#ef4444" border="1px solid rgba(239,68,68,0.2)" icon={<Trash2 size={14} />}>Delete</ActionBtn>
                          </div>
                        )}
                        {!canManage && (s === 'DECLINED' || s === 'COMPLETED' || s === 'CANCELLED') && (
                          <span style={{ fontSize: '0.76rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {s === 'DECLINED' && trip.declineReason ? `Reason: ${trip.declineReason}` : <><Clock size={13} /> Closed</>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Service Record Cards */}
                    {jobServices.map(serv => {
                      const typeLabel = serv.serviceTypeDetail || SERVICE_TYPES.find(t => t.value === serv.serviceType)?.label || serv.serviceType
                      const vehicleObj = vehicles.find(v => v.registrationNo === serv.vehicleRegNumber)
                      const isDriverAuthor = serv.createdBy && trip.driverUsername && serv.createdBy.toLowerCase() === trip.driverUsername.toLowerCase()
                      const isCurrentUserAuthor = serv.createdBy && user?.userName && serv.createdBy.toLowerCase() === user.userName.toLowerCase()
                      const isPending = serv.status === 'PENDING'

                      // Controller view or Driver view who created the record: show full details when expanded
                      const showFullDetails = canManage || isDriverAuthor || isCurrentUserAuthor
                      const isExpanded = !!expandedServices[serv.id]

                      if (!isExpanded) return null

                      return (
                        <div key={serv.id} style={{
                          marginTop: 16, borderRadius: 20, padding: '16px 24px',
                          background: isDark
                            ? (isPending ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)')
                            : (isPending ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)'),
                          border: isPending
                            ? '1.5px solid rgba(245,158,11,0.3)'
                            : '1.5px solid rgba(16,185,129,0.3)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                          display: 'flex', flexDirection: 'column', gap: isExpanded ? 14 : 0
                        }}>
                          {/* Title & Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: isPending ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)',
                                border: isPending ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isPending ? '#d97706' : '#059669', flexShrink: 0
                              }}>
                                <Wrench size={18} />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: isPending ? '#d97706' : D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                                  {typeLabel}
                                </h4>
                                <div style={{ fontSize: '0.76rem', color: D.textSub, marginTop: 2 }}>
                                  <strong>{serv.vehicleRegNumber}</strong> {vehicleObj?.model ? `— ${vehicleObj.model}` : ''}
                                  {serv.createdBy && <span> · By <strong>{serv.createdBy}</strong></span>}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {isPending ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#d97706', border: '1px solid rgba(245,158,11,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={11} /> PENDING APPROVAL
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle size={11} /> {showFullDetails ? 'APPROVED' : 'COMPLETED BY CONTROLLER'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expanded Content Body */}
                          {isExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
                              {showFullDetails ? (
                                <>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                                    <div style={{ background: D.surfaceHi, borderRadius: 12, padding: '10px 14px', border: `1px solid ${D.border}` }}>
                                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Calendar size={12} color="#d97706" /> Service Date
                                      </div>
                                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: D.text }}>
                                        {fmtDate(serv.serviceDate)}
                                      </div>
                                    </div>

                                    <div style={{ background: D.surfaceHi, borderRadius: 12, padding: '10px 14px', border: `1px solid ${D.border}` }}>
                                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Gauge size={12} color="#d97706" /> Mileage
                                      </div>
                                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: D.text }}>
                                        {Number(serv.currentMileageKm || 0).toLocaleString()} km
                                      </div>
                                    </div>

                                    <div style={{ background: D.surfaceHi, borderRadius: 12, padding: '10px 14px', border: `1px solid ${D.border}` }}>
                                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <DollarSign size={12} color="#d97706" /> Cost / Price
                                      </div>
                                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: D.text }}>
                                        Rs. {Number(serv.serviceCost || 0).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Workshop */}
                                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Wrench size={14} color="#d97706" /> <strong>Technician/Workshop:</strong> {serv.technicianWorkshop || 'N/A'}
                                  </div>

                                  {/* Service Record Description / Notes entered by driver */}
                                  {serv.description && (
                                    <div style={{ background: D.surfaceHi, padding: '12px 16px', borderRadius: 12, border: `1px solid ${D.border}` }}>
                                      <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                                        Description / Notes
                                      </div>
                                      <div style={{ fontSize: '0.85rem', color: D.text, lineHeight: 1.5 }}>
                                        {serv.description}
                                      </div>
                                    </div>
                                  )}

                                  {/* Next Service Due */}
                                  {(serv.nextServiceDue || serv.nextServiceMileageKm) && (
                                    <div style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Calendar size={13} color="#3b82f6" />
                                      <span>
                                        Next Service Due: <strong>{serv.nextServiceDue ? fmtDate(serv.nextServiceDue) : 'N/A'}</strong>
                                        {serv.nextServiceMileageKm ? ` at ${Number(serv.nextServiceMileageKm).toLocaleString()} km` : ''}
                                      </span>
                                    </div>
                                  )}

                                  {/* Attachment button if uploaded */}
                                  {serv.attachmentPath && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                                      <button
                                        type="button"
                                        onClick={() => handleViewAttachmentInTrips(serv)}
                                        style={{
                                          padding: '6px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.12)',
                                          border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6',
                                          fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                                        }}
                                      >
                                        <Paperclip size={13} /> View Receipt Attachment
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                /* Basic / Enough Service Details for Driver when Controller filled record */
                                <div style={{ background: D.surfaceHi, padding: '14px 16px', borderRadius: 14, border: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: D.text }}>
                                      Service Date: <strong>{fmtDate(serv.serviceDate)}</strong>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: D.textSub }}>
                                      Vehicle: <strong>{serv.vehicleRegNumber}</strong>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: D.textSub, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle size={13} color="#10b981" /> Service record details completed by Fleet Controller.
                                  </div>
                                </div>
                              )}

                              {/* Actions (Controller vs Driver) */}
                              {canManage ? (
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6, borderTop: `1px solid ${D.border}` }}>
                                  {isPending && (
                                    <>
                                      <button
                                        onClick={() => handleApproveServiceInTrips(serv.id)}
                                        disabled={busyId === serv.id}
                                        style={{
                                          padding: '9px 20px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.4)',
                                          background: 'rgba(16,185,129,0.12)', color: '#059669',
                                          fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                          display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.color = '#059669'; }}
                                      >
                                        {busyId === serv.id ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                                        Approve
                                      </button>

                                      <button
                                        onClick={() => handleRejectServiceInTrips(serv.id)}
                                        disabled={busyId === serv.id}
                                        style={{
                                          padding: '9px 20px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                                          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                          fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                          display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                                      >
                                        {busyId === serv.id ? <Loader2 size={15} className="spin" /> : <X size={15} />}
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => setPendingDetailModal(serv)}
                                    style={{
                                      padding: '9px 20px', borderRadius: 12, border: 'none',
                                      background: '#d97706', color: '#ffffff',
                                      fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                      boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
                                      display: 'flex', alignItems: 'center', gap: 6
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#b45309'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#d97706'}
                                  >
                                    <Eye size={15} /> Details
                                  </button>

                                  <button
                                    onClick={() => handleDeleteServiceInTrips(serv.id)}
                                    disabled={busyId === serv.id}
                                    style={{
                                      padding: '9px 20px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                                      background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                      fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                      display: 'flex', alignItems: 'center', gap: 6
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                                  >
                                    {busyId === serv.id ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 6, borderTop: `1px solid ${D.border}` }}>
                                  {isPending ? (
                                    <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 700, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <Clock size={14} /> Submitted &amp; awaiting Fleet Controller approval.
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <CheckCircle size={14} /> Service record completed.
                                    </div>
                                  )}
                                  {isPending && (isDriverAuthor || isCurrentUserAuthor) && (
                                    <button
                                      onClick={() => openEditServiceLog(serv, trip)}
                                      style={{
                                        padding: '8px 16px', borderRadius: 10, border: 'none',
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#ffffff', fontSize: '0.82rem', fontWeight: 800,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                        boxShadow: '0 4px 12px rgba(245,158,11,0.35)', transition: 'all 0.15s'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                                    >
                                      <Edit2 size={14} /> Edit Pending Details
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Assign Job Modal (popup) ───────────────────────────────── */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, animation: 'fadeIn 0.25s ease' }} onClick={closeAssignModal}>
          <div style={{ background: D.surface, borderRadius: 24, width: '92%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)',
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', top: 0, zIndex: 2, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0
                }}>
                  {{
                    TRIP: <Navigation size={18} />,
                    SERVICE: <Wrench size={18} />,
                    FUEL: <Fuel size={18} />,
                  }[activeTab] || <ClipboardList size={18} />}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                    {editingTripId ? 'Edit' : 'Assign'} a {activeTab === 'TRIP' ? 'Trip' : activeTab === 'SERVICE' ? 'Service Job' : 'Fuel Job'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                    {editingTripId ? 'Update details for this assignment' : (activeTab === 'TRIP' ? 'Assign a trip and a vehicle to a driver' : activeTab === 'SERVICE' ? 'Assign driver to perform vehicle service' : 'Assign driver to fill up gas for a vehicle')}
                  </p>
                </div>
              </div>
              <button
                onClick={closeAssignModal}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: 9, color: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssign} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Driver *</label>
                  <select style={inputStyle} value={form.driverUsername} onChange={e => setForm(f => ({ ...f, driverUsername: e.target.value }))} onFocus={onFocus} onBlur={onBlur} disabled={form.status === 'STARTED'}>
                    <option value="">Select driver…</option>
                    {drivers.map(d => <option key={d.id} value={d.userName}>{d.userName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Vehicle *</label>
                  <select style={inputStyle} value={form.vehicleRegNumber} onChange={e => handleVehicleChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} disabled={form.status === 'STARTED'}>
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => <option key={v.id} value={v.registrationNo}>{v.registrationNo}{v.model ? ` — ${v.model}` : ''}{v.driverUsername ? ` 👤 ${v.driverUsername}` : ''}</option>)}
                  </select>
                  {/* Show auto-fill hint */}
                  {form.vehicleRegNumber && vehicles.find(v => v.registrationNo === form.vehicleRegNumber)?.driverUsername && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: D.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserCheck size={11} /> Driver auto-filled from vehicle assignment
                    </p>
                  )}
                </div>
                
                {activeTab === 'TRIP' && (
                  <div>
                    <label style={labelStyle}>Origin</label>
                    <input style={inputStyle} placeholder="e.g. Colombo" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} onFocus={onFocus} onBlur={onBlur} disabled={form.status === 'STARTED'} />
                  </div>
                )}
                
                <div style={{ gridColumn: activeTab === 'TRIP' ? 'auto' : 'span 2' }}>
                  <label style={labelStyle}>
                    {activeTab === 'TRIP' ? 'Destination *' : activeTab === 'SERVICE' ? 'Service Center / Location *' : 'Fuel Station / Location *'}
                  </label>
                  <input style={inputStyle} 
                    placeholder={activeTab === 'TRIP' ? 'e.g. Kandy' : activeTab === 'SERVICE' ? 'e.g. Toyota Service Center, Colombo' : 'e.g. Lanka IOC Station, Kandy'} 
                    value={form.destination} 
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} 
                    onFocus={onFocus} 
                    onBlur={onBlur} 
                  />
                </div>
                
                <div>
                  <label style={labelStyle}>Scheduled Date *</label>
                  <input type="date" style={inputStyle} value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} onFocus={onFocus} onBlur={onBlur} disabled={form.status === 'STARTED'} />
                </div>
                
                <div>
                  <label style={labelStyle}>
                    {activeTab === 'TRIP' ? 'Purpose' : activeTab === 'SERVICE' ? 'Service Description *' : 'Instructions'}
                  </label>
                  {activeTab === 'SERVICE' ? (
                    <select style={inputStyle} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} onFocus={onFocus} onBlur={onBlur} disabled={form.status === 'STARTED'}>
                      <option value="">Select service type…</option>
                      {sortedServiceTypes.map(t => (
                        <option key={t.value} value={t.label} style={{ color: t.isOverdue ? '#ef4444' : 'inherit', fontWeight: t.isOverdue ? 'bold' : 'normal' }}>
                          {t.isOverdue ? `⚠️ [OVERDUE] ${t.label}` : t.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input style={inputStyle} 
                      placeholder={activeTab === 'TRIP' ? 'e.g. Cargo delivery' : 'e.g. Fill full tank Octane 95 before trip'} 
                      value={form.purpose} 
                      onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} 
                      onFocus={onFocus} 
                      onBlur={onBlur} 
                      disabled={form.status === 'STARTED'}
                    />
                  )}
                </div>

                {/* Controller access grant toggle for Service Record Details */}
                <div style={{
                  gridColumn: '1 / -1', padding: '14px 18px', borderRadius: 16,
                  background: form.allowDriverServiceLog ? 'rgba(16,185,129,0.08)' : D.surfaceHi,
                  border: `1.5px solid ${form.allowDriverServiceLog ? 'rgba(16,185,129,0.3)' : D.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: form.allowDriverServiceLog ? 'rgba(16,185,129,0.18)' : D.border,
                      color: form.allowDriverServiceLog ? '#10b981' : D.textSub,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Wrench size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>
                        Grant Access for Driver Service Details Entry
                      </div>
                      <div style={{ fontSize: '0.74rem', color: D.textSub, marginTop: 2 }}>
                        Allow driver to add service record cost, date &amp; workshop details. Driver can also skip if not needed.
                      </div>
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, minWidth: 44, minHeight: 24, cursor: form.status === 'STARTED' ? 'not-allowed' : 'pointer', flexShrink: 0, margin: 0, padding: 0, boxSizing: 'border-box' }}>
                    <input
                      type="checkbox"
                      checked={form.allowDriverServiceLog}
                      onChange={e => { if (form.status !== 'STARTED') setForm(f => ({ ...f, allowDriverServiceLog: e.target.checked })) }}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0, padding: 0 }}
                      disabled={form.status === 'STARTED'}
                    />
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999,
                      background: form.allowDriverServiceLog ? '#10b981' : D.border,
                      transition: 'background 0.2s ease', boxSizing: 'border-box'
                    }} />
                    <div style={{
                      position: 'absolute', top: '4px', left: form.allowDriverServiceLog ? '24px' : '4px',
                      width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      boxSizing: 'border-box'
                    }} />
                  </label>
                </div>

                {/* Overdue alert banner inside the form */}
                {activeTab === 'SERVICE' && selectedVehicle && sortedServiceTypes.some(t => t.isOverdue) && (
                  <div style={{
                    gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.82rem', fontWeight: 600,
                  }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    This vehicle has overdue service milestones! Please prioritize them (marked with ⚠️).
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button type="button" disabled={submitting} onClick={closeAssignModal}
                  style={{ flex: 1, padding: '13px', borderRadius: 14, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, fontSize: '0.95rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = D.surfaceHi }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >Discard</button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px var(--primary-glow)', opacity: submitting ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {submitting ? <Loader2 size={17} className="spin" /> : (editingTripId ? <Edit2 size={17} /> : <Plus size={17} strokeWidth={3} />)}
                  {submitting ? (editingTripId ? 'Updating…' : 'Assigning…') : (editingTripId ? 'Update Details' : `Assign ${activeTab === 'TRIP' ? 'Trip' : activeTab === 'SERVICE' ? 'Service' : 'Fuel'}`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Driver action confirmation ──────────────────────────────── */}
      <TripActionModal
        action={driverModal?.action}
        trip={driverModal?.trip}
        busy={busyId === driverModal?.trip?.id}
        hasServiceAccess={hasDriverServiceAccess(driverModal?.trip)}
        hasPendingLog={driverModal?.trip ? (allServices || []).some(s => s && s.status === 'PENDING' && (s.vehicleRegNumber || '').replace(/^VEH-/i, '').trim().toUpperCase() === (driverModal.trip.vehicleRegNumber || '').replace(/^VEH-/i, '').trim().toUpperCase()) : false}
        onOpenServiceLog={openServiceLog}
        onClose={() => setDriverModal(null)}
        onConfirm={runDriverAction}
      />

      {/* ── Cancel Job Confirmation Modal ──────────────────────────── */}
      {tripToCancel && (
        <div onClick={() => !cancelling && setTripToCancel(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', padding: '36px 32px', textAlign: 'center', animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
            <button type="button" onClick={() => !cancelling && setTripToCancel(null)} disabled={cancelling}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', borderRadius: 10, padding: 8, color: D.textSub, cursor: cancelling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = D.surfaceHi }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: D.redDim, border: `1px solid ${D.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.red, margin: '0 auto 20px' }}>
              <Ban size={28} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Cancel job to "{tripToCancel.destination}"?
            </h3>
            <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.6 }}>
              This job assigned to <strong style={{ color: D.text }}>{tripToCancel.driverUsername}</strong> will be cancelled and the driver notified. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => setTripToCancel(null)} disabled={cancelling}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = D.surfaceHi }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Keep Job
              </button>
              <button type="button" onClick={confirmCancel} disabled={cancelling}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: 'none', background: D.red, color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', fontFamily: 'inherit', opacity: cancelling ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {cancelling && <Loader2 size={15} className="spin" />}
                {cancelling ? 'Cancelling…' : 'Cancel Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Job Confirmation Modal ──────────────────────────── */}
      {deleteConfirmTrip && (
        <div onClick={() => !deletingId && setDeleteConfirmTrip(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', padding: '36px 32px', textAlign: 'center', animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
            <button type="button" onClick={() => !deletingId && setDeleteConfirmTrip(null)} disabled={!!deletingId}
              style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', borderRadius: 10, padding: 8, color: D.textSub, cursor: deletingId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { if (!deletingId) e.currentTarget.style.background = D.surfaceHi }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: D.redDim, border: `1px solid ${D.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.red, margin: '0 auto 20px' }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Delete job to "{deleteConfirmTrip.destination}"?
            </h3>
            <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.6 }}>
              This will soft-delete the job. You can find and restore it from the **Deleted Jobs** tab.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeleteConfirmTrip(null)} disabled={!!deletingId}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: deletingId ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!deletingId) e.currentTarget.style.background = D.surfaceHi }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Cancel
              </button>
              <button type="button" onClick={() => handleDeleteTrip(deleteConfirmTrip.id)} disabled={!!deletingId}
                style={{ flex: 1, maxWidth: 170, padding: '11px 20px', borderRadius: 12, border: 'none', background: D.red, color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: deletingId ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', fontFamily: 'inherit', opacity: deletingId ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {deletingId && <Loader2 size={15} className="spin" />}
                {deletingId ? 'Deleting…' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deleted Jobs Drawer ─────────────────────────────────── */}
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
                    Deleted Jobs
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                    Soft-deleted jobs are preserved — not permanently removed
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

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
              {loadingDeleted ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: D.indigo }}>
                  <Loader2 className="spin" size={28} />
                </div>
              ) : deletedTrips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: D.textSub }}>
                  <ClipboardList size={40} opacity={0.3} style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, color: D.text }}>No deleted jobs found</div>
                  <div style={{ fontSize: '0.85rem' }}>Deleted jobs will appear here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {deletedTrips.map(trip => {
                    const type = getJobType(trip.purpose)
                    const cleanPurpose = getCleanPurpose(trip.purpose)
                    const s = up(trip.status)
                    const isRestoring = restoringId === trip.id

                    return (
                      <div key={trip.id} style={{
                        background: D.surface, border: `1px solid ${D.border}`,
                        borderRadius: 16, padding: '18px 22px', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', gap: 16
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: D.text }}>{trip.destination}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: D.surfaceHi, color: D.textSub, border: `1px solid ${D.border}` }}>
                              {type}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: D.textSub }}>
                            Driver: <strong>{trip.driverUsername}</strong> | Vehicle: <strong>{trip.vehicleRegNumber}</strong>
                          </div>
                          {cleanPurpose && (
                            <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4, fontStyle: 'italic' }}>
                              "{cleanPurpose}"
                            </div>
                          )}
                          {trip.deletedBy && (
                            <div style={{ fontSize: '0.72rem', color: D.red, marginTop: 6, fontWeight: 600 }}>
                              Deleted by {trip.deletedBy} on {fmtDate(trip.deletedAt)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRestoreTrip(trip.id)}
                          disabled={isRestoring}
                          style={{
                            background: D.indigoDim, color: D.indigo, border: 'none',
                            padding: '8px 14px', borderRadius: 10, fontSize: '0.78rem',
                            fontWeight: 800, cursor: isRestoring ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { if (!isRestoring) e.currentTarget.style.background = D.indigo; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { if (!isRestoring) e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.color = D.indigo; }}
                        >
                          {isRestoring ? <Loader2 size={13} className="spin" /> : <UserCheck size={13} />}
                          Restore
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Service Log Modal (driver submits service details for approval) ─── */}
      {serviceLogModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20, animation: 'fadeIn 0.2s ease' }}
          onClick={closeServiceLog}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: D.surface, borderRadius: 24, width: '94%', maxWidth: 600, maxHeight: '92vh', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.28s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #92400e 0%, #b45309 45%, #d97706 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                    {serviceLogForm.id ? 'Edit Pending Service Details' : 'Log Service Details'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>
                    Job #{serviceLogModal?.id} · {serviceLogModal?.vehicleRegNumber} — Awaiting controller approval
                  </p>
                </div>
              </div>
              <button onClick={closeServiceLog} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* Amber approval notice */}
            <div style={{ margin: '16px 24px 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1.5px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Clock size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: '0.76rem', color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                These details will be submitted for Fleet Controller review and committed only after approval.
              </span>
            </div>

            {/* Error */}
            {serviceLogError && (
              <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} /> {serviceLogError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleServiceLogSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 24px' }} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* Vehicle (read-only) */}
                <div>
                  <label style={labelStyle}>Vehicle (License Plate)</label>
                  <input
                    value={serviceLogForm.vehicleRegNumber}
                    readOnly
                    style={{ ...inputStyle, background: D.surfaceHi, color: D.textSub, cursor: 'default' }}
                  />
                </div>

                {/* Service Type */}
                <div>
                  <label style={labelStyle}>Service Type *</label>
                  <select
                    value={serviceLogForm.serviceType}
                    onChange={e => setServiceLogForm(f => ({ ...f, serviceType: e.target.value }))}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                    onFocus={onFocus} onBlur={onBlur}
                  >
                    <option value="">Select type…</option>
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {serviceLogForm.serviceType === 'OTHER' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Service Type Detail *</label>
                    <input
                      value={serviceLogForm.serviceTypeDetail}
                      onChange={e => setServiceLogForm(f => ({ ...f, serviceTypeDetail: e.target.value }))}
                      placeholder="Describe the service…"
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                )}

                {/* Date */}
                <div>
                  <label style={labelStyle}>Service Date *</label>
                  <input
                    type="date"
                    value={serviceLogForm.serviceDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setServiceLogForm(f => ({ ...f, serviceDate: e.target.value }))}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>

                {/* Mileage */}
                <div>
                  <label style={labelStyle}>
                    Current Mileage (km) *
                    {vehicleCurrentMileage != null && (
                      <span style={{ marginLeft: 6, color: '#10b981', fontWeight: 800, fontSize: '0.74rem' }}>
                        (Current: {Number(vehicleCurrentMileage).toLocaleString()} km)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={serviceLogForm.currentMileageKm}
                    onChange={e => setServiceLogForm(f => ({ ...f, currentMileageKm: e.target.value }))}
                    placeholder={vehicleCurrentMileage != null ? `Current: ${vehicleCurrentMileage} km` : 'e.g. 45000'}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                  {vehicleCurrentMileage != null && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.74rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Gauge size={13} /> Current Odometer: <strong>{Number(vehicleCurrentMileage).toLocaleString()} km</strong>
                    </p>
                  )}
                </div>

                {/* Cost */}
                <div>
                  <label style={labelStyle}>Service Cost (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceLogForm.serviceCost}
                    onChange={e => setServiceLogForm(f => ({ ...f, serviceCost: e.target.value }))}
                    placeholder="e.g. 8500"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>

                {/* Workshop */}
                <div>
                  <label style={labelStyle}>Technician / Workshop *</label>
                  <input
                    value={serviceLogForm.technicianWorkshop}
                    onChange={e => setServiceLogForm(f => ({ ...f, technicianWorkshop: e.target.value }))}
                    placeholder="e.g. Auto Care Center"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>

                {/* Notes */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Notes / Description</label>
                  <textarea
                    value={serviceLogForm.description}
                    onChange={e => setServiceLogForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Any additional notes about the service…"
                    style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>

                {/* Optional: Next service due */}
                <div>
                  <label style={labelStyle}>Next Service Due (Date)</label>
                  <input type="date" value={serviceLogForm.nextServiceDue} onChange={e => setServiceLogForm(f => ({ ...f, nextServiceDue: e.target.value }))} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Next Service Due (km)</label>
                  <input type="number" value={serviceLogForm.nextServiceMileageKm} onChange={e => setServiceLogForm(f => ({ ...f, nextServiceMileageKm: e.target.value }))} placeholder="e.g. 50000" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>

                {/* Attachment */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Paperclip size={12} /> Bill / Receipt Attachment <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: D.textSub }}>(optional)</span></span></label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    border: `1.5px dashed ${serviceLogFile ? '#10b981' : D.inputBorder}`,
                    borderRadius: 12, padding: '10px 14px',
                    background: serviceLogFile ? 'rgba(16,185,129,0.06)' : D.inputBg,
                    transition: 'all 0.15s',
                  }}>
                    <Paperclip size={15} color={serviceLogFile ? '#10b981' : D.textSub} />
                    <span style={{ fontSize: '0.8rem', color: serviceLogFile ? '#10b981' : D.textSub, flex: 1 }}>
                      {serviceLogFile ? serviceLogFile.name : 'Click to attach a bill, invoice or photo (PDF, JPG, PNG — max 10MB)'}
                    </span>
                    {serviceLogFile && (
                      <button type="button" onClick={e => { e.preventDefault(); setServiceLogFile(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 0, display: 'flex' }}>
                        <X size={14} />
                      </button>
                    )}
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setServiceLogFile(e.target.files[0] || null)} />
                  </label>
                </div>

              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={serviceLogSubmitting} style={{
                  flex: 1, padding: '13px', borderRadius: 14, border: 'none',
                  background: serviceLogSubmitting ? 'rgba(0,0,0,0.3)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff', cursor: serviceLogSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.92rem', fontWeight: 800, boxShadow: serviceLogSubmitting ? 'none' : '0 6px 20px rgba(245,158,11,0.4)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit',
                  opacity: serviceLogSubmitting ? 0.7 : 1,
                }}>
                  {serviceLogSubmitting ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  {serviceLogSubmitting ? 'Saving…' : serviceLogForm.id ? 'Save & Notify Controller' : 'Submit for Approval'}
                </button>
                <button type="button" onClick={closeServiceLog} disabled={serviceLogSubmitting} style={{
                  flex: 0.5, padding: '13px', borderRadius: 14, border: `1px solid ${D.border}`,
                  background: 'transparent', color: D.text, cursor: serviceLogSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.92rem', fontWeight: 800, fontFamily: 'inherit', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { if (!serviceLogSubmitting) e.currentTarget.style.background = D.surfaceHi }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Pending Service Details Modal (Controller) ─── */}
      {pendingDetailModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 20, animation: 'fadeIn 0.2s ease' }}
          onClick={() => setPendingDetailModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: D.surface, borderRadius: 24, width: '94%', maxWidth: 580, maxHeight: '90vh', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.28s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #92400e 0%, #b45309 45%, #d97706 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {pendingDetailModal.serviceTypeDetail || SERVICE_TYPES.find(t => t.value === pendingDetailModal.serviceType)?.label || pendingDetailModal.serviceType}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                    Vehicle: {pendingDetailModal.vehicleRegNumber} — {pendingDetailModal.status === 'PENDING' ? 'Pending Controller Approval' : 'Service Record Details'}
                  </p>
                </div>
              </div>
              <button onClick={() => setPendingDetailModal(null)} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: D.surfaceHi, padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase' }}>Vehicle</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginTop: 3 }}>{pendingDetailModal.vehicleRegNumber}</div>
                </div>
                <div style={{ background: D.surfaceHi, padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase' }}>Submitted By</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginTop: 3 }}>{pendingDetailModal.createdBy || 'Driver'}</div>
                </div>
                <div style={{ background: D.surfaceHi, padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase' }}>Service Date</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginTop: 3 }}>{fmtDate(pendingDetailModal.serviceDate)}</div>
                </div>
                <div style={{ background: D.surfaceHi, padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase' }}>Mileage</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginTop: 3 }}>{Number(pendingDetailModal.currentMileageKm || 0).toLocaleString()} km</div>
                </div>
                <div style={{ background: D.surfaceHi, padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase' }}>Service Cost</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginTop: 3 }}>Rs. {Number(pendingDetailModal.serviceCost || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: D.surfaceHi, padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase' }}>Technician / Workshop</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: D.text, marginTop: 3 }}>{pendingDetailModal.technicianWorkshop || 'N/A'}</div>
                </div>
              </div>

              {pendingDetailModal.description && (
                <div style={{ background: D.surfaceHi, padding: '14px 16px', borderRadius: 14, border: `1px solid ${D.border}` }}>
                  <div style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Notes / Description</div>
                  <div style={{ fontSize: '0.88rem', color: D.text, lineHeight: 1.5 }}>{pendingDetailModal.description}</div>
                </div>
              )}

              {/* Attachment button */}
              {pendingDetailModal.attachmentPath && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', padding: '14px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Paperclip size={18} color="#3b82f6" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>Receipt / Invoice Attachment</div>
                      <div style={{ fontSize: '0.75rem', color: D.textSub }}>File attached with record</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleViewAttachmentInTrips(pendingDetailModal)}
                    style={{ padding: '8px 14px', borderRadius: 10, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={14} /> View File
                  </button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {canManage && (
              <div style={{ padding: '16px 24px', background: D.surfaceHi, borderTop: `1px solid ${D.border}`, display: 'flex', gap: 12 }}>
                <button
                  onClick={() => handleApproveServiceInTrips(pendingDetailModal.id)}
                  disabled={busyId === pendingDetailModal.id}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {busyId === pendingDetailModal.id ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  Approve Record
                </button>
                <button
                  onClick={() => handleRejectServiceInTrips(pendingDetailModal.id)}
                  disabled={busyId === pendingDetailModal.id}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {busyId === pendingDetailModal.id ? <Loader2 size={16} className="spin" /> : <X size={16} />}
                  Reject Record
                </button>
                <button
                  onClick={() => setPendingDetailModal(null)}
                  style={{ flex: 0.5, padding: '11px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  )
}

const ActionBtn = ({ children, onClick, disabled, bg, color, border, icon }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 10, border: border || 'none',
    background: bg, color, fontSize: '0.81rem', fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit', transition: 'all 0.15s',
  }}>
    {disabled ? <Loader2 size={14} className="spin" /> : icon}
    {children}
  </button>
)

export default TripsPage
