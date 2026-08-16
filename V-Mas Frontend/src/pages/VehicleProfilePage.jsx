import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD, useTheme } from '../context/ThemeContext'
import api, { vehicleAPI, serviceAPI, fuelAPI, userAPI } from '../services/api'
import { computeLogsEfficiency, formatFuelType } from '../utils/fuelUtils'
import {
  Car, Wrench, Gauge, Fuel, User, Clock, ChevronLeft,
  FileText, Upload, Download, UserCheck, UserX, X,
  RotateCcw, AlertTriangle
} from 'lucide-react'

export default function VehicleProfilePage() {
  const { regNo } = useParams()
  const navigate = useNavigate()
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isController = user?.role === 'CONTROLLER' || isAdmin

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [fuelLogs, setFuelLogs] = useState([])
  const [fuelStats, setFuelStats] = useState([])
  const [loadingFuel, setLoadingFuel] = useState(false)
  const [serviceRecords, setServiceRecords] = useState([])
  const [assignDriverModal, setAssignDriverModal] = useState(false)
  const [allDrivers, setAllDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState('')
  const [driverBusy, setDriverBusy] = useState(false)
  const [driverError, setDriverError] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState({ type: '', loading: false })
  const [pendingUpload, setPendingUpload] = useState(null)
  const [imgViewer, setImgViewer] = useState({ open: false, url: '', filename: '' })
  const [odometerOpen, setOdometerOpen] = useState(false)
  const [newMileage, setNewMileage] = useState('')
  const [mileageError, setMileageError] = useState('')

  const inp = (extra = {}) => ({
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem',
    color: D.text, background: D.inputBg, outline: 'none', fontFamily: 'inherit',
    ...extra
  })
  const lbl = { display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.02em' }

  const SC = {
    ACTIVE: { bg: D.greenDim, color: D.green, border: D.green + '50' },
    AVAILABLE: { bg: D.blueDim, color: D.blue, border: D.blue + '50' },
    SERVICE: { bg: D.orangeDim, color: D.orange, border: D.orange + '50' },
    INACTIVE: { bg: D.redDim, color: D.red, border: D.red + '50' },
  }

  // Normalize string helper (removes unicode dashes and trims)
  const normalizeReg = str => (str || '').replace(/[\u2010-\u2015\u2212]/g, '-').trim().toUpperCase()

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const targetReg = normalizeReg(decodeURIComponent(regNo || ''))

    if (!targetReg) {
      setError('No registration number specified.')
      setLoading(false)
      return
    }

    try {
      // Parallel fetch with full error protection on each request
      const [vRes, sRes, fRes] = await Promise.all([
        vehicleAPI.getAllVehicles().catch(err => {
          console.warn('vehicleAPI.getAllVehicles warning:', err)
          return null
        }),
        serviceAPI.getAllServices().catch(() => ({ data: { data: [] } })),
        fuelAPI.getVehicleStats().catch(() => ({ data: { data: [] } }))
      ])

      let found = null

      // Check vehicles list
      if (vRes) {
        const rawVehicles = vRes.data?.data || vRes.data || []
        const list = Array.isArray(rawVehicles) ? rawVehicles : []
        found = list.find(v => normalizeReg(v.registrationNo) === targetReg)
      }

      // If not found in the list, try fallback endpoints if available
      if (!found && vehicleAPI.getVehicleByRegNo) {
        try {
          const direct = await vehicleAPI.getVehicleByRegNo(targetReg)
          const dData = direct?.data?.data || direct?.data
          if (dData && (dData.registrationNo || dData.id)) {
            found = dData
          }
        } catch (_) {
          // Ignore direct lookup failure
        }
      }

      if (!found) {
        setError(`Vehicle "${regNo}" was not found.`)
        setLoading(false)
        return
      }

      setVehicle(found)

      const rawServices = sRes?.data?.data || sRes?.data || []
      setServiceRecords(Array.isArray(rawServices) ? rawServices : [])

      const rawFuel = fRes?.data?.data || fRes?.data || []
      setFuelStats(Array.isArray(rawFuel) ? rawFuel : [])
    } catch (err) {
      console.error('Error loading vehicle profile:', err)
      setError('Failed to load vehicle data. Please check your connection or try again.')
    } finally {
      setLoading(false)
    }
  }, [regNo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (activeTab !== 'fuel' || !vehicle?.registrationNo) return
    setLoadingFuel(true)
    fuelAPI.getLogsByVehicle(vehicle.registrationNo)
      .then(r => {
        const raw = r.data?.data || r.data || []
        const logs = Array.isArray(raw) ? raw : []
        setFuelLogs(computeLogsEfficiency(logs, [vehicle]))
      })
      .catch(() => setFuelLogs([]))
      .finally(() => setLoadingFuel(false))
  }, [activeTab, vehicle])

  // ── Driver assignment ──────────────────────────────────────────────────────
  const openAssignModal = async () => {
    setSelectedDriver(vehicle?.driverUsername || '')
    setDriverError('')
    setAssignDriverModal(true)
    try {
      const r = await userAPI.getAllDrivers()
      const list = r.data?.data || r.data || []
      setAllDrivers((Array.isArray(list) ? list : []).filter(u => (u.accountStatus || 'ACTIVE') === 'ACTIVE'))
    } catch (_) {
      try {
        const r2 = await userAPI.getAllUsers()
        const list2 = r2.data?.data || r2.data || []
        setAllDrivers((Array.isArray(list2) ? list2 : []).filter(u => u.role === 'DRIVER'))
      } catch {
        setAllDrivers([])
      }
    }
  }

  const doAssign = async () => {
    setDriverBusy(true)
    setDriverError('')
    try {
      const r = await vehicleAPI.assignDriver(vehicle.id, selectedDriver || null)
      const updated = r.data?.data || r.data
      setVehicle(updated)
      setAssignDriverModal(false)
    } catch (e) {
      setDriverError(e.response?.data?.message || 'Failed to assign driver.')
    } finally {
      setDriverBusy(false)
    }
  }

  const doUnassign = async () => {
    setDriverBusy(true)
    try {
      const r = await vehicleAPI.unassignDriver(vehicle.id)
      const updated = r.data?.data || r.data
      setVehicle(updated)
    } catch (_) {
      /* ignore */
    } finally {
      setDriverBusy(false)
    }
  }

  // ── Odometer update ────────────────────────────────────────────────────────
  const submitOdometer = async e => {
    e.preventDefault()
    const v = parseFloat(newMileage)
    if (isNaN(v) || v < 0) {
      setMileageError('Enter a valid mileage.')
      return
    }
    try {
      const payload = {
        ...vehicle,
        currentMileageKm: v
      }
      const r = await vehicleAPI.updateVehicle(vehicle.id, payload)
      const updated = r.data?.data || r.data
      setVehicle(updated)
      setOdometerOpen(false)
      setNewMileage('')
    } catch (e) {
      setMileageError(e.response?.data?.message || 'Failed to update mileage.')
    }
  }

  // ── Documents ──────────────────────────────────────────────────────────────
  const viewDoc = async docType => {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/vehicles/${vehicle.id}/document/${docType}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })
      const pathKey = docType === 'registration' ? 'registrationBookPath' : `${docType}DocumentPath`
      const path = vehicle[pathKey] || vehicle[`${docType}Path`] || ''
      const lowerPath = path.toLowerCase()
      const rawBlob = res.data instanceof Blob ? res.data : new Blob([res.data])
      let ct = rawBlob.type || res.headers['content-type'] || ''
      if (!ct || ct === 'application/octet-stream') {
        if (lowerPath.endsWith('.pdf')) ct = 'application/pdf'
        else if (lowerPath.endsWith('.png')) ct = 'image/png'
        else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) ct = 'image/jpeg'
        else ct = docType === 'registration' ? 'application/pdf' : 'image/jpeg'
      }
      const url = URL.createObjectURL(new Blob([rawBlob], { type: ct }))
      if (ct.includes('pdf')) {
        window.open(url, '_blank')
      } else {
        const fn = path ? path.substring(path.lastIndexOf('/') + 1) : `${docType}_document`
        setImgViewer({ open: true, url, filename: fn.includes('_') ? fn.substring(fn.indexOf('_') + 1) : fn })
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to view document.')
    }
  }

  const dlDoc = async (docType, filename) => {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/vehicles/${vehicle.id}/document/${docType}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `${docType}_document`
      a.click()
      URL.revokeObjectURL(url)
    } catch (_) {
      alert('Download failed.')
    }
  }

  const uploadDoc = async (docType, file, expiry) => {
    setUploadingDoc({ type: docType, loading: true })
    try {
      const r = await vehicleAPI.uploadDocument(vehicle.id, docType, file, expiry)
      const updated = r.data?.data || r.data
      setVehicle(updated)
    } catch (e) {
      alert(e.response?.data?.message || 'Upload failed.')
    } finally {
      setUploadingDoc({ type: '', loading: false })
    }
  }

  const onFileSelect = (docType, file) => {
    if (!file) return
    if (docType === 'registration') {
      uploadDoc(docType, file)
      return
    }
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    setPendingUpload({ docType, file, expiryDate: d.toISOString().split('T')[0] })
  }

  // ── Sub-components ─────────────────────────────────────────────────────────
  const DocBlock = ({ docType, label, path }) => {
    const busy = uploadingDoc.type === docType && uploadingDoc.loading
    const fn = path ? path.substring(path.lastIndexOf('_') + 1) : null
    const displayFn = fn && fn.includes('/') ? fn.substring(fn.lastIndexOf('/') + 1) : fn
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: D.bg, padding: '12px 14px', borderRadius: 12, border: `1px solid ${D.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: D.text }}>{label}</span>
          {path
            ? <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.green, background: D.greenDim, padding: '2px 6px', borderRadius: 4 }}>Uploaded</span>
            : <span style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textFaint }}>No File</span>}
        </div>
        {path ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <button onClick={() => viewDoc(docType)} style={{ background: 'none', border: 'none', color: D.blue, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <FileText size={12} />{displayFn || 'View Document'}
            </button>
            {isController && <>
              <button onClick={() => dlDoc(docType, displayFn)} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer' }} title="Download document"><Download size={12} /></button>
              <label style={{ cursor: 'pointer' }}>
                <input type="file" onChange={e => onFileSelect(docType, e.target.files[0])} style={{ display: 'none' }} disabled={busy} />
                <span style={{ color: D.textSub, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'underline' }}>{busy ? 'Uploading…' : 'Update'}</span>
              </label>
            </>}
          </div>
        ) : isController ? (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, border: `1px dashed ${D.border}`, background: D.surface, cursor: 'pointer', color: D.textSub, fontSize: '0.7rem', fontWeight: 700, marginTop: 4 }}>
            <input type="file" onChange={e => onFileSelect(docType, e.target.files[0])} style={{ display: 'none' }} disabled={busy} />
            {busy ? 'Uploading…' : <><Upload size={12} /> Upload File</>}
          </label>
        ) : <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: D.textFaint, fontStyle: 'italic' }}>Not uploaded yet.</p>}
      </div>
    )
  }

  const ExpiryRow = ({ label, date, diff }) => {
    if (!date) return (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, color: D.text, fontSize: '0.85rem' }}>{label}</span>
        <span style={{ color: D.textFaint, fontSize: '0.8rem' }}>Not Set</span>
      </div>
    )
    const exp = diff < 0, exp2 = diff <= 30
    const pct = Math.max(0, Math.min(100, (diff / 365) * 100))
    const r = Math.round(239 - (239 - 16) * (pct / 100))
    const g = Math.round(68 + (185 - 68) * (pct / 100))
    const b = Math.round(68 + (129 - 68) * (pct / 100))
    const bc = exp ? '#ef4444' : `rgb(${r},${g},${b})`
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: D.text }}>{label}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: D.textSub }}>{new Date(date).toLocaleDateString()}</p>
          </div>
          <span style={{ background: exp ? 'rgba(239,68,68,0.15)' : exp2 ? 'rgba(245,158,11,0.15)' : D.greenDim, color: exp ? '#ef4444' : exp2 ? '#f59e0b' : D.green, padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800 }}>
            {exp ? 'Expired' : `${diff} days left`}
          </span>
        </div>
        <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${exp ? 100 : pct}%`, height: '100%', background: bc, borderRadius: 999, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${bc}80` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: D.textSub }}>
          <span style={{ color: bc, fontWeight: 700 }}>{exp ? `Expired ${Math.abs(diff)}d ago` : exp2 ? `Expiring in ${diff}d` : `${diff} days`}</span>
          <span>Until {new Date(date).toLocaleDateString()}</span>
        </div>
      </div>
    )
  }

  const Shell = ({ children }) => (
    <div className="app-shell" style={{ background: D.bg, minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Vehicle Profile" subtitle={`Home / Vehicles / ${regNo || ''}`} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ padding: '28px 32px 48px' }}>
          {children}
        </div>
      </div>
    </div>
  )

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, color: D.textSub }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${D.border}`, borderTopColor: D.blue, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading vehicle profile…</span>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </Shell>
  )

  if (error || !vehicle) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 18, textAlign: 'center', padding: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.border}` }}>
          <Car size={40} style={{ color: D.textSub, opacity: 0.6 }} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: D.text, margin: '0 0 6px' }}>{error || 'Vehicle not found'}</h3>
          <p style={{ fontSize: '0.85rem', color: D.textSub, margin: 0, maxWidth: 400 }}>
            Unable to retrieve profile information for &ldquo;{regNo}&rdquo;. Please verify the registration number or try again.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => fetchData()}
            style={{ padding: '10px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: D.surface, color: D.text, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = D.blue }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = D.border }}
          >
            <RotateCcw size={15} /> Try Again
          </button>
          <button
            onClick={() => navigate('/vehicles')}
            style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
          >
            <ChevronLeft size={16} /> Back to Vehicles
          </button>
        </div>
      </div>
    </Shell>
  )

  const sc = SC[vehicle.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
  const today = new Date()
  const insDiff = vehicle.insuranceExpiryDate ? Math.ceil((new Date(vehicle.insuranceExpiryDate) - today) / 864e5) : null
  const licDiff = vehicle.licenseExpiryDate ? Math.ceil((new Date(vehicle.licenseExpiryDate) - today) / 864e5) : null

  // ── Render ─────────────────────────────────────────────────────────────────
  // Derived sidebar data
  const targetReg = vehicle ? normalizeReg(vehicle.registrationNo) : ''
  const sidebarFuelStat = fuelStats.find(x => normalizeReg(x.vehicleRegNumber) === targetReg)
  const sidebarServiceRec = serviceRecords
    .filter(r => normalizeReg(r.vehicleRegNumber) === targetReg && !r.deleted)
    .sort((a, b) => new Date(b.serviceDate || b.createdAt || 0) - new Date(a.serviceDate || a.createdAt || 0))[0] || null

  return (
    <Shell>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}'}</style>

      {/* ── Gradient Banner Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 50%, #3b82f6 100%)',
        borderRadius: 24, padding: '28px 36px', marginBottom: 28,
        position: 'relative', overflow: 'hidden',
        boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5), 0 0 60px var(--primary-glow)' : '0 8px 32px rgba(0,0,0,0.15)',
        border: '1px solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap'
      }}>
        {[['85%', '-30px', '200px', 'rgba(255,255,255,0.03)'], ['10%', '70%', '130px', 'rgba(255,255,255,0.04)'], ['50%', '85%', '90px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
          <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, position: 'relative' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {vehicle.vehicleImage
              ? <img src={vehicle.vehicleImage} alt={vehicle.registrationNo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Car size={28} color='rgba(255,255,255,0.8)' />}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              {vehicle.manufacturer} {vehicle.model}
            </h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>{vehicle.registrationNo}</span>
              {vehicle.year && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', fontWeight: 600 }}>{vehicle.year}</span>}
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '2px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{formatFuelType(vehicle.fuelType) || 'UNKNOWN'}</span>
              <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: '2px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{vehicle.status}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/vehicles')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', backdropFilter: 'blur(8px)', transition: 'all 0.2s', position: 'relative', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          <ChevronLeft size={16} /> Back to Vehicles
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>


            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: 8 }}>
              {['overview', 'services', 'fuel'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === tab ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'transparent', color: activeTab === tab ? '#fff' : D.textSub, boxShadow: activeTab === tab ? '0 4px 12px rgba(37,99,235,0.28)' : 'none', transition: 'all 0.2s' }}>
                  {tab === 'overview' ? 'Overview' : tab === 'services' ? 'Services' : 'Fuel & Usage'}
                </button>
              ))}
            </div>

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.3s ease both' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                  {[
                    { label: 'Manufacturer', value: vehicle.manufacturer || 'N/A' },
                    { label: 'Model', value: vehicle.model || 'N/A' },
                    { label: 'Year', value: vehicle.year || 'N/A' },
                    { label: 'Mileage', value: vehicle.currentMileageKm != null ? `${vehicle.currentMileageKm.toLocaleString()} km` : 'N/A', click: isController ? () => { setNewMileage(vehicle.currentMileageKm != null ? String(vehicle.currentMileageKm) : ''); setMileageError(''); setOdometerOpen(true) } : null },
                    { label: 'Tank Capacity', value: vehicle.fuelCapacity ? `${vehicle.fuelCapacity} L` : 'N/A' },
                    { label: 'Chassis No', value: vehicle.chassisNumber || vehicle.chassisNo || 'N/A' },
                    { label: 'Engine No', value: vehicle.engineNumber || vehicle.engineNo || 'N/A' },
                    { label: 'Vehicle Type', value: vehicle.vehicleType ? (vehicle.vehicleType.charAt(0) + vehicle.vehicleType.slice(1).toLowerCase()) : 'N/A' },
                  ].map((item, i) => (
                    <div key={i} onClick={item.click} title={item.click ? 'Update Mileage' : ''}
                      style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: item.click ? 'pointer' : 'default', transition: 'all 0.2s' }}
                      onMouseEnter={e => { if (item.click) { e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.background = D.purpleDim } }}
                      onMouseLeave={e => { if (item.click) { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface } }}>
                      <span style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</span>
                      <span style={{ fontSize: '0.88rem', color: D.text, fontWeight: 700, wordBreak: 'break-all', lineHeight: 1.4 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* ── Quick Stats row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {[{
                    icon: <Fuel size={16} color={D.green} />, label: 'Total Fuel Cost',
                    value: sidebarFuelStat ? `Rs. ${Math.round(sidebarFuelStat.totalSpending || 0).toLocaleString()}` : '—',
                    accent: D.green, dim: D.greenDim
                  }, {
                    icon: <Gauge size={16} color={D.blue} />, label: 'Avg Efficiency',
                    value: sidebarFuelStat ? `${sidebarFuelStat.fuelEfficiency?.toFixed(1) || '0.0'} km/L` : '—',
                    accent: D.blue, dim: D.blueDim
                  }, {
                    icon: <Car size={16} color={D.purple} />, label: 'Tank Capacity',
                    value: vehicle.fuelCapacity ? `${vehicle.fuelCapacity} L` : '—',
                    accent: D.purple, dim: D.purpleDim
                  }].map((s, i) => (
                    <div key={i} style={{ background: s.dim, border: `1px solid ${s.accent}22`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{s.label}</div>
                        <div style={{ fontSize: '1.05rem', color: D.text, fontWeight: 800, marginTop: 2 }}>{s.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Driver Assignment ── */}
                {(isAdmin || isController) && (
                  <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={15} color={D.orange} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned Driver</span>
                      </div>
                      {vehicle.driverUsername && <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: D.greenDim, color: D.green }}>ACTIVE</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      {vehicle.driverUsername ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={20} color='#fff' />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: D.text }}>{vehicle.driverUsername}</div>
                            <div style={{ fontSize: '0.72rem', color: D.textSub }}>Current Driver</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: D.surfaceHi, border: `1px dashed ${D.border}` }}>
                          <User size={18} color={D.textFaint} />
                          <span style={{ fontSize: '0.85rem', color: D.textSub, fontStyle: 'italic' }}>No driver assigned</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {vehicle.driverUsername && (
                          <button onClick={doUnassign} disabled={driverBusy} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <UserX size={14} /> Unassign
                          </button>
                        )}
                        <button onClick={openAssignModal} disabled={driverBusy} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <UserCheck size={14} /> {vehicle.driverUsername ? 'Change Driver' : 'Assign Driver'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Compliance & Expiries ── */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color={D.purple} /> Compliance & Expiries
                  </h4>
                  <ExpiryRow label="Insurance Expiry" date={vehicle.insuranceExpiryDate} diff={insDiff} />
                  <ExpiryRow label="License Expiry" date={vehicle.licenseExpiryDate} diff={licDiff} />
                </div>

                {/* ── Recent Service preview ── */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Wrench size={15} color={D.orange} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Service</span>
                    </div>
                    <button onClick={() => setActiveTab('services')} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: D.blue, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>View All →</button>
                  </div>
                  {sidebarServiceRec ? (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: D.surfaceHi, borderRadius: 12, border: `1px solid ${D.border}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: D.orangeDim, color: D.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={18} /></div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: D.text }}>{sidebarServiceRec.serviceType}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>{sidebarServiceRec.serviceDate ? new Date(sidebarServiceRec.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.75rem', color: D.textSub, flexWrap: 'wrap' }}>
                          {sidebarServiceRec.currentMileageKm != null && <span>At <strong style={{ color: D.text }}>{sidebarServiceRec.currentMileageKm.toLocaleString()} km</strong></span>}
                          {sidebarServiceRec.nextServiceDue && <span>Next: <strong style={{ color: D.text }}>{new Date(sidebarServiceRec.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px', borderRadius: 12, background: D.surfaceHi, border: `1px dashed ${D.border}` }}>
                      <Wrench size={20} style={{ opacity: 0.3, color: D.textFaint }} />
                      <span style={{ fontSize: '0.85rem', color: D.textSub }}>No service records yet</span>
                    </div>
                  )}
                </div>

                {/* ── Documents ── */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={15} color={D.purple} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documents & Papers</span>
                  </div>
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <DocBlock docType="insurance" label="Insurance Certificate" path={vehicle.insuranceDocumentPath} />
                    <DocBlock docType="license" label="License & Road Tax" path={vehicle.licenseDocumentPath} />
                    <DocBlock docType="registration" label="Registration Book (V5)" path={vehicle.registrationBookPath} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Services ── */}
            {activeTab === 'services' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.3s ease both' }}>
                {(() => {
                  const recs = serviceRecords.filter(r => normalizeReg(r.vehicleRegNumber) === targetReg && !r.deleted)
                  if (!recs.length) return (
                    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '48px 20px', textAlign: 'center' }}>
                      <Wrench size={40} style={{ margin: '0 auto 12px', opacity: 0.3, color: D.textFaint }} />
                      <p style={{ margin: 0, fontWeight: 700, color: D.textSub }}>No service records found</p>
                    </div>
                  )
                  return recs.sort((a, b) => new Date(b.serviceDate || b.createdAt || 0) - new Date(a.serviceDate || a.createdAt || 0)).map(rec => (
                    <div key={rec.id} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: D.orangeDim, color: D.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={18} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: D.text }}>{rec.serviceType}</p>
                            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: D.textSub }}>{rec.serviceDate ? new Date(rec.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                          </div>
                          {rec.nextServiceDue && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.textSub, background: D.surfaceHi, padding: '3px 10px', borderRadius: 8 }}>Next: {new Date(rec.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        </div>
                        {rec.description && <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: D.textSub }}>{rec.description}</p>}
                        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.75rem', color: D.textSub, flexWrap: 'wrap' }}>
                          {rec.currentMileageKm != null && <span>Odometer: <strong style={{ color: D.text }}>{rec.currentMileageKm.toLocaleString()} km</strong></span>}
                          {rec.nextServiceMileageKm != null && <span>Next at: <strong style={{ color: D.text }}>{rec.nextServiceMileageKm.toLocaleString()} km</strong></span>}
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

            {/* ── Fuel & Usage ── */}
            {activeTab === 'fuel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.3s ease both' }}>
                {loadingFuel ? (
                  <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: D.textSub }}>
                    <div style={{ width: 32, height: 32, border: `3px solid ${D.border}`, borderTopColor: D.blue, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Loading fuel data…</span>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const s = fuelStats.find(x => normalizeReg(x.vehicleRegNumber) === targetReg)
                      if (!s) return null
                      const ec = s.efficiencyStatus === 'Good' ? D.green : s.efficiencyStatus === 'Moderate' ? D.orange : D.red
                      const eb = s.efficiencyStatus === 'Good' ? D.greenDim : s.efficiencyStatus === 'Moderate' ? D.orangeDim : D.redDim
                      return (
                        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: D.textSub }}>Fuel Efficiency Analytics</span>
                            <span style={{ background: eb, color: ec, padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>{s.efficiencyStatus}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: D.text }}>{s.fuelEfficiency?.toFixed(1) || '0.0'}</span>
                            <span style={{ fontSize: '0.95rem', color: D.textSub, fontWeight: 700 }}>km / Liter</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min((s.fuelEfficiency || 0) * 6.6, 100)}%`, height: '100%', background: ec, borderRadius: 999, transition: 'width 0.8s ease', boxShadow: `0 0 10px ${ec}80` }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: D.textSub }}>
                            <span>Total spent: Rs. {Math.round(s.totalSpending || 0).toLocaleString()}</span>
                            <span>Fleet threshold: 5.0 km/L</span>
                          </div>
                        </div>
                      )
                    })()}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {(() => {
                        const tc = fuelLogs.reduce((s, l) => s + (l.totalCost || 0), 0)
                        const tl = fuelLogs.reduce((s, l) => s + (l.liters || 0), 0)
                        const ap = fuelLogs.length > 0 ? fuelLogs.reduce((s, l) => s + (l.pricePerLiter || 0), 0) / fuelLogs.length : 0
                        return (
                          <>
                            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '0.67rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Fuel size={12} color={D.green} /> Fuel Cost</span>
                              <span style={{ fontSize: '1.2rem', color: D.text, fontWeight: 800 }}>Rs. {Math.round(tc).toLocaleString()}</span>
                              <span style={{ fontSize: '0.7rem', color: D.textSub }}>Across {fuelLogs.length} fill-ups</span>
                            </div>
                            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '0.67rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Gauge size={12} color={D.blue} /> Total Liters</span>
                              <span style={{ fontSize: '1.2rem', color: D.text, fontWeight: 800 }}>{tl.toFixed(1)} L</span>
                              <span style={{ fontSize: '0.7rem', color: D.textSub }}>Avg: Rs. {ap.toFixed(1)}/L</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuel Log History</h4>
                      {fuelLogs.length === 0
                        ? <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
                          <Fuel size={32} style={{ margin: '0 auto 10px', opacity: 0.3, color: D.textFaint }} />
                          <p style={{ margin: 0, fontWeight: 700, color: D.textSub }}>No fuel logs found</p>
                        </div>
                        : fuelLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(log => (
                          <div key={log.id} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: D.greenDim, color: D.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Fuel size={16} /></div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 750, color: D.text }}>{log.liters ? `${log.liters.toFixed(1)} Liters` : '—'}</p>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>Rs. {log.totalCost ? log.totalCost.toLocaleString() : '—'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.72rem', color: D.textSub }}>
                                <span>Date: {new Date(log.date).toLocaleDateString()}</span>
                                <span>Odometer: {log.currentMileageKm ? `${log.currentMileageKm.toLocaleString()} km` : '—'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>{/* end LEFT COLUMN */}

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 90 }}>

            {/* Quick Stats */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.07)' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gauge size={15} color={D.blue} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Stats</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{
                  icon: <Fuel size={14} color={D.green} />, label: 'Total Fuel Cost',
                  value: sidebarFuelStat ? `Rs. ${Math.round(sidebarFuelStat.totalSpending || 0).toLocaleString()}` : '—',
                  accent: D.green, accentDim: D.greenDim
                }, {
                  icon: <Gauge size={14} color={D.blue} />, label: 'Avg Efficiency',
                  value: sidebarFuelStat ? `${sidebarFuelStat.fuelEfficiency?.toFixed(1) || '0.0'} km/L` : '—',
                  accent: D.blue, accentDim: D.blueDim
                }, {
                  icon: <Car size={14} color={D.purple} />, label: 'Current Mileage',
                  value: vehicle.currentMileageKm != null ? `${vehicle.currentMileageKm.toLocaleString()} km` : '—',
                  accent: D.purple, accentDim: D.purpleDim
                }].map((stat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: stat.accentDim, border: `1px solid ${stat.accent}22` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${stat.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{stat.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{stat.label}</div>
                      <div style={{ fontSize: '0.95rem', color: D.text, fontWeight: 800 }}>{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Driver */}
            {(isAdmin || isController) && (
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.07)' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={15} color={D.orange} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned Driver</span>
                  </div>
                  {vehicle.driverUsername && <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: D.greenDim, color: D.green }}>ACTIVE</span>}
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {vehicle.driverUsername ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={20} color='#fff' />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: D.text }}>{vehicle.driverUsername}</div>
                        <div style={{ fontSize: '0.72rem', color: D.textSub }}>Current Driver</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 12px', borderRadius: 12, background: D.surfaceHi, border: `1px dashed ${D.border}` }}>
                      <User size={18} color={D.textFaint} />
                      <span style={{ fontSize: '0.82rem', color: D.textSub, fontStyle: 'italic' }}>No driver assigned</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {vehicle.driverUsername && (
                      <button onClick={doUnassign} disabled={driverBusy} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <UserX size={13} /> Unassign
                      </button>
                    )}
                    <button onClick={openAssignModal} disabled={driverBusy} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <UserCheck size={13} /> {vehicle.driverUsername ? 'Change' : 'Assign'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Service */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.07)' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={15} color={D.orange} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Service</span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {sidebarServiceRec ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: D.orangeDim, color: D.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={16} /></div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: D.text }}>{sidebarServiceRec.serviceType}</p>
                      <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: D.textSub }}>{sidebarServiceRec.serviceDate ? new Date(sidebarServiceRec.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                      {sidebarServiceRec.currentMileageKm != null && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: D.textFaint }}>At {sidebarServiceRec.currentMileageKm.toLocaleString()} km</p>}
                      {sidebarServiceRec.nextServiceDue && (
                        <div style={{ marginTop: 8, padding: '5px 10px', borderRadius: 8, background: D.surfaceHi, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={11} color={D.textSub} />
                          <span style={{ fontSize: '0.7rem', color: D.textSub, fontWeight: 700 }}>Next: {new Date(sidebarServiceRec.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 8 }}>
                    <Wrench size={28} style={{ opacity: 0.25, color: D.textFaint }} />
                    <p style={{ margin: 0, fontSize: '0.8rem', color: D.textSub, fontWeight: 700 }}>No service records</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.07)' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={15} color={D.purple} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documents</span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DocBlock docType="insurance" label="Insurance Certificate" path={vehicle.insuranceDocumentPath} />
                <DocBlock docType="license" label="License & Road Tax" path={vehicle.licenseDocumentPath} />
                <DocBlock docType="registration" label="Registration Book (V5)" path={vehicle.registrationBookPath} />
              </div>
            </div>

          </div>{/* end RIGHT SIDEBAR */}

        </div>{/* end 2-col grid */}

      {/* ── Modals ── */}
      {odometerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250 }} onClick={() => setOdometerOpen(false)}>
          <div style={{ background: D.surface, borderRadius: 24, width: '92%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${D.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg,#172554,#1e3a8a)', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gauge size={20} /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Update Odometer</h3><p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#60a5fa' }}>{vehicle.registrationNo}</p></div>
              </div>
              <button onClick={() => setOdometerOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={submitOdometer} style={{ padding: '24px 28px' }}>
              <label style={lbl}>Current Mileage (KM)</label>
              <input type="number" value={newMileage} onChange={e => setNewMileage(e.target.value)} required style={inp({ marginBottom: mileageError ? 6 : 20 })} placeholder="Enter new mileage…" />
              {mileageError && <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: D.red }}>{mileageError}</p>}
              <button type="submit" style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>Update Mileage</button>
            </form>
          </div>
        </div>
      )}

      {assignDriverModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250 }} onClick={() => setAssignDriverModal(false)}>
          <div style={{ background: D.surface, borderRadius: 24, width: '92%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${D.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg,#172554,#1e3a8a)', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCheck size={20} /></div><h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Assign Driver</h3></div>
              <button onClick={() => setAssignDriverModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <label style={lbl}>Select Driver</label>
              <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} style={inp({ marginBottom: 16 })}>
                <option value="">— Unassign —</option>
                {allDrivers.map(d => <option key={d.id} value={d.username || d.userName}>{d.username || d.userName} ({d.firstName} {d.lastName})</option>)}
              </select>
              {driverError && <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: D.red }}>{driverError}</p>}
              <button onClick={doAssign} disabled={driverBusy} style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: driverBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{driverBusy ? 'Assigning…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {imgViewer.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400 }} onClick={() => setImgViewer(s => ({ ...s, open: false }))}>
          <button onClick={() => setImgViewer(s => ({ ...s, open: false }))} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
          <img src={imgViewer.url} alt={imgViewer.filename} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {pendingUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div style={{ background: D.surface, borderRadius: 20, width: '92%', maxWidth: 400, padding: 28, border: `1px solid ${D.border}` }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: D.text }}>Set Expiry Date</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: D.textSub }}>Confirm expiry for <strong>{pendingUpload.docType}</strong>:</p>
            <input type="date" value={pendingUpload.expiryDate} onChange={e => setPendingUpload(p => ({ ...p, expiryDate: e.target.value }))} style={inp({ marginBottom: 20 })} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPendingUpload(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { const { docType, file, expiryDate } = pendingUpload; setPendingUpload(null); uploadDoc(docType, file, expiryDate) }} style={{ flex: 2, padding: 10, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Upload</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}