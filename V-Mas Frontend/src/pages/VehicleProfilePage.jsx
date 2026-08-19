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
  RotateCcw, AlertTriangle, Activity, Settings
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

  // Status color map
  const SC = {
    ACTIVE:    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    AVAILABLE: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
    SERVICE:   { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
    INACTIVE:  { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  }

  // Controller accent colour (amber/orange)
  const A = {
    grad:   'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
    solid:  '#f59e0b',
    dim:    'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
    text:   '#f59e0b',
  }

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
      const [vRes, sRes, fRes] = await Promise.all([
        vehicleAPI.getAllVehicles().catch(err => { console.warn('vehicleAPI.getAllVehicles warning:', err); return null }),
        serviceAPI.getAllServices().catch(() => ({ data: { data: [] } })),
        fuelAPI.getVehicleStats().catch(() => ({ data: { data: [] } }))
      ])

      let found = null
      if (vRes) {
        const rawVehicles = vRes.data?.data || vRes.data || []
        const list = Array.isArray(rawVehicles) ? rawVehicles : []
        found = list.find(v => normalizeReg(v.registrationNo) === targetReg)
      }

      if (!found && vehicleAPI.getVehicleByRegNo) {
        try {
          const direct = await vehicleAPI.getVehicleByRegNo(targetReg)
          const dData = direct?.data?.data || direct?.data
          if (dData && (dData.registrationNo || dData.id)) found = dData
        } catch (_) {}
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

  useEffect(() => { fetchData() }, [fetchData])

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
      } catch { setAllDrivers([]) }
    }
  }

  const doAssign = async () => {
    setDriverBusy(true); setDriverError('')
    try {
      const r = await vehicleAPI.assignDriver(vehicle.id, selectedDriver || null)
      setVehicle(r.data?.data || r.data)
      setAssignDriverModal(false)
    } catch (e) {
      setDriverError(e.response?.data?.message || 'Failed to assign driver.')
    } finally { setDriverBusy(false) }
  }

  const doUnassign = async () => {
    setDriverBusy(true)
    try {
      const r = await vehicleAPI.unassignDriver(vehicle.id)
      setVehicle(r.data?.data || r.data)
    } catch (_) {}
    finally { setDriverBusy(false) }
  }

  // ── Odometer ───────────────────────────────────────────────────────────────
  const submitOdometer = async e => {
    e.preventDefault()
    const v = parseFloat(newMileage)
    if (isNaN(v) || v < 0) { setMileageError('Enter a valid mileage.'); return }
    try {
      const r = await vehicleAPI.updateVehicle(vehicle.id, { ...vehicle, currentMileageKm: v })
      setVehicle(r.data?.data || r.data)
      setOdometerOpen(false); setNewMileage('')
    } catch (e) { setMileageError(e.response?.data?.message || 'Failed to update mileage.') }
  }

  // ── Documents ──────────────────────────────────────────────────────────────
  const viewDoc = async docType => {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/vehicles/${vehicle.id}/document/${docType}`, { responseType: 'blob', headers: { Authorization: `Bearer ${token}` } })
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
    } catch (e) { alert(e.response?.data?.message || 'Failed to view document.') }
  }

  const dlDoc = async (docType, filename) => {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/vehicles/${vehicle.id}/document/${docType}`, { responseType: 'blob', headers: { Authorization: `Bearer ${token}` } })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = filename || `${docType}_document`; a.click()
      URL.revokeObjectURL(url)
    } catch (_) { alert('Download failed.') }
  }

  const uploadDoc = async (docType, file, expiry) => {
    setUploadingDoc({ type: docType, loading: true })
    try {
      const r = await vehicleAPI.uploadDocument(vehicle.id, docType, file, expiry)
      setVehicle(r.data?.data || r.data)
    } catch (e) { alert(e.response?.data?.message || 'Upload failed.') }
    finally { setUploadingDoc({ type: '', loading: false }) }
  }

  const onFileSelect = (docType, file) => {
    if (!file) return
    if (docType === 'registration') { uploadDoc(docType, file); return }
    const d = new Date(); d.setFullYear(d.getFullYear() + 1)
    setPendingUpload({ docType, file, expiryDate: d.toISOString().split('T')[0] })
  }

  // ── Shell ──────────────────────────────────────────────────────────────────
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, color: D.textSub }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${D.border}`, borderTopColor: A.solid, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading vehicle profile…</span>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </Shell>
  )

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !vehicle) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 18, textAlign: 'center', padding: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.border}` }}>
          <Car size={40} style={{ color: D.textSub, opacity: 0.6 }} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: D.text, margin: '0 0 6px' }}>{error || 'Vehicle not found'}</h3>
          <p style={{ fontSize: '0.85rem', color: D.textSub, margin: 0, maxWidth: 400 }}>Unable to retrieve profile for &ldquo;{regNo}&rdquo;.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={fetchData} style={{ padding: '10px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: D.surface, color: D.text, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={15} /> Try Again
          </button>
          <button onClick={() => navigate('/vehicles')} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: A.grad, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ChevronLeft size={16} /> Back to Vehicles
          </button>
        </div>
      </div>
    </Shell>
  )

  // ── Derived ────────────────────────────────────────────────────────────────
  const sc = SC[vehicle.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
  const today = new Date()
  const insDiff = vehicle.insuranceExpiryDate ? Math.ceil((new Date(vehicle.insuranceExpiryDate) - today) / 864e5) : null
  const licDiff = vehicle.licenseExpiryDate   ? Math.ceil((new Date(vehicle.licenseExpiryDate)   - today) / 864e5) : null
  const targetReg = normalizeReg(vehicle.registrationNo)
  const sidebarFuelStat = fuelStats.find(x => normalizeReg(x.vehicleRegNumber) === targetReg)
  const sidebarServiceRec = serviceRecords
    .filter(r => normalizeReg(r.vehicleRegNumber) === targetReg && !r.deleted)
    .sort((a, b) => new Date(b.serviceDate || b.createdAt || 0) - new Date(a.serviceDate || a.createdAt || 0))[0] || null

  // ── Sub-components ─────────────────────────────────────────────────────────

  // Stat card
  const StatCard = ({ icon, label, value, accent, accentDim, onClick, clickHint }) => (
    <div
      onClick={onClick}
      title={clickHint || ''}
      style={{
        background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16,
        padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
        cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s',
        flex: 1, minWidth: 0,
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-1px)' }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.transform = 'translateY(0)' }}}
    >
      <div style={{ width: 46, height: 46, borderRadius: 13, background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accent}30` }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  )

  // Section header
  const SectionHeader = ({ icon, title, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${D.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      {action}
    </div>
  )

  // Card wrapper
  const Card = ({ children, style = {} }) => (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 18, padding: '20px 22px', ...style }}>
      {children}
    </div>
  )

  // Expiry row
  const ExpiryRow = ({ label, date, diff }) => {
    if (!date) return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
        <span style={{ fontWeight: 700, color: D.text, fontSize: '0.85rem' }}>{label}</span>
        <span style={{ color: D.textFaint, fontSize: '0.78rem', background: D.surfaceHi, padding: '3px 10px', borderRadius: 8 }}>Not Set</span>
      </div>
    )
    const expired = diff < 0, soon = diff <= 30
    const pct = Math.max(0, Math.min(100, (diff / 365) * 100))
    const barColor = expired ? '#ef4444' : soon ? '#f59e0b' : '#22c55e'
    const badgeBg  = expired ? 'rgba(239,68,68,0.12)'  : soon ? 'rgba(245,158,11,0.12)'  : 'rgba(34,197,94,0.12)'
    const badgeCol = expired ? '#ef4444' : soon ? '#f59e0b' : '#22c55e'
    return (
      <div style={{ padding: '10px 0', borderBottom: `1px solid ${D.border}30` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: D.text }}>{label}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: D.textSub }}>{new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <span style={{ background: badgeBg, color: badgeCol, padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, border: `1px solid ${badgeCol}30` }}>
            {expired ? `Expired ${Math.abs(diff)}d ago` : `${diff} days left`}
          </span>
        </div>
        <div style={{ height: 6, background: `${D.border}`, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${expired ? 100 : pct}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${barColor}60` }} />
        </div>
      </div>
    )
  }

  // Doc block
  const DocBlock = ({ docType, label, path }) => {
    const busy = uploadingDoc.type === docType && uploadingDoc.loading
    const fn = path ? path.substring(path.lastIndexOf('_') + 1) : null
    const displayFn = fn && fn.includes('/') ? fn.substring(fn.lastIndexOf('/') + 1) : fn
    const hasDoc = Boolean(path)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 12,
        background: hasDoc ? D.surfaceHi : D.bg,
        border: `1px solid ${hasDoc ? D.border : D.border + '60'}`,
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: hasDoc ? A.dim : D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={15} color={hasDoc ? A.text : D.textFaint} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: D.text }}>{label}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: hasDoc ? D.green : D.textFaint, fontWeight: 600 }}>
              {hasDoc ? (displayFn || 'Uploaded') : 'Not uploaded'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {hasDoc ? (<>
            <button onClick={() => viewDoc(docType)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.surface, color: D.text, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FileText size={11} /> View
            </button>
            {isController && <>
              <button onClick={() => dlDoc(docType, displayFn)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.surface, color: D.textSub, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} title="Download">
                <Download size={13} />
              </button>
              <label style={{ cursor: 'pointer' }}>
                <input type="file" onChange={e => onFileSelect(docType, e.target.files[0])} style={{ display: 'none' }} disabled={busy} />
                <span style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.surface, color: D.textSub, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                  {busy ? '…' : <Upload size={13} />}
                </span>
              </label>
            </>}
          </>) : isController ? (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: A.dim, color: A.text, border: `1px solid ${A.border}`, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              <input type="file" onChange={e => onFileSelect(docType, e.target.files[0])} style={{ display: 'none' }} disabled={busy} />
              {busy ? 'Uploading…' : <><Upload size={12} /> Upload</>}
            </label>
          ) : null}
        </div>
      </div>
    )
  }

  // Tabs config
  const TABS = [
    { id: 'overview',  label: 'Overview',    icon: <Activity size={14} /> },
    { id: 'services',  label: 'Services',    icon: <Wrench size={14} /> },
    { id: 'fuel',      label: 'Fuel & Usage', icon: <Fuel size={14} /> },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* ── HERO BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #92400e 0%, #b45309 35%, #d97706 65%, #f59e0b 100%)',
        borderRadius: 22, padding: '26px 32px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(180,83,9,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
      }}>
        {/* Background orbs */}
        {[['80%','-20px','180px'],['5%','75%','100px'],['45%','90%','70px']].map(([t,l,s],i) => (
          <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
        ))}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
          {/* Left: icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
              {vehicle.vehicleImage
                ? <img src={vehicle.vehicleImage} alt={vehicle.registrationNo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
                : <Car size={30} color="rgba(255,255,255,0.9)" />}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                {vehicle.manufacturer} {vehicle.model}
              </h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', padding: '3px 10px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', backdropFilter: 'blur(4px)' }}>
                  {vehicle.registrationNo}
                </span>
                {vehicle.year && (
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', fontWeight: 600 }}>{vehicle.year}</span>
                )}
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {formatFuelType(vehicle.fuelType) || 'UNKNOWN'}
                </span>
                <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {vehicle.status}
                </span>
              </div>
            </div>
          </div>

          {/* Right: back button */}
          <button
            onClick={() => navigate('/vehicles')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', backdropFilter: 'blur(8px)', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            <ChevronLeft size={16} /> Back to Vehicles
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ROW ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard
          icon={<Gauge size={20} color={A.text} />}
          label="Current Mileage"
          value={vehicle.currentMileageKm != null ? `${vehicle.currentMileageKm.toLocaleString()} km` : '—'}
          accent={A.solid} accentDim={A.dim}
          onClick={isController ? () => { setNewMileage(vehicle.currentMileageKm != null ? String(vehicle.currentMileageKm) : ''); setMileageError(''); setOdometerOpen(true) } : null}
          clickHint={isController ? 'Click to update mileage' : ''}
        />
        <StatCard
          icon={<Activity size={20} color="#60a5fa" />}
          label="Avg Efficiency"
          value={sidebarFuelStat ? `${sidebarFuelStat.fuelEfficiency?.toFixed(1) || '0.0'} km/L` : '—'}
          accent="#3b82f6" accentDim="rgba(59,130,246,0.1)"
        />
        <StatCard
          icon={<Fuel size={20} color="#22c55e" />}
          label="Tank Capacity"
          value={vehicle.fuelCapacity ? `${vehicle.fuelCapacity} L` : '—'}
          accent="#22c55e" accentDim="rgba(34,197,94,0.1)"
        />
        <StatCard
          icon={<Settings size={20} color="#a78bfa" />}
          label="Total Fuel Cost"
          value={sidebarFuelStat ? `Rs. ${Math.round(sidebarFuelStat.totalSpending || 0).toLocaleString()}` : '—'}
          accent="#a78bfa" accentDim="rgba(167,139,250,0.1)"
        />
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: 7 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 11,
              fontSize: '0.84rem', fontWeight: 700, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.22s',
              background: activeTab === tab.id ? A.grad : 'transparent',
              color: activeTab === tab.id ? '#fff' : D.textSub,
              boxShadow: activeTab === tab.id ? '0 4px 14px rgba(180,83,9,0.28)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          OVERVIEW TAB
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, animation: 'fadeUp 0.3s ease both' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Vehicle Details */}
            <Card>
              <SectionHeader icon={<Car size={15} color={A.text} />} title="Vehicle Details" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Manufacturer', value: vehicle.manufacturer || 'N/A' },
                  { label: 'Model',        value: vehicle.model || 'N/A' },
                  { label: 'Year',         value: vehicle.year || 'N/A' },
                  { label: 'Vehicle Type', value: vehicle.vehicleType ? (vehicle.vehicleType.charAt(0) + vehicle.vehicleType.slice(1).toLowerCase()) : 'N/A' },
                  { label: 'Chassis No',   value: vehicle.chassisNumber || vehicle.chassisNo || 'N/A' },
                  { label: 'Engine No',    value: vehicle.engineNumber  || vehicle.engineNo  || 'N/A' },
                  { label: 'Fuel Type',    value: formatFuelType(vehicle.fuelType) || 'N/A' },
                  { label: 'Fuel Capacity',value: vehicle.fuelCapacity ? `${vehicle.fuelCapacity} L` : 'N/A' },
                ].map((item, i) => (
                  <div key={i} style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.63rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: '0.86rem', color: D.text, fontWeight: 700, wordBreak: 'break-all', lineHeight: 1.4 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Assigned Driver */}
            {(isAdmin || isController) && (
              <Card>
                <SectionHeader
                  icon={<User size={15} color={A.text} />}
                  title="Assigned Driver"
                  action={vehicle.driverUsername && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>ACTIVE</span>
                  )}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  {vehicle.driverUsername ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#d97706,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={22} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.97rem', fontWeight: 800, color: D.text }}>{vehicle.driverUsername}</div>
                        <div style={{ fontSize: '0.72rem', color: D.textSub, marginTop: 2 }}>Current Driver</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: D.bg, border: `1px dashed ${D.border}`, flex: 1 }}>
                      <User size={18} color={D.textFaint} />
                      <span style={{ fontSize: '0.85rem', color: D.textSub, fontStyle: 'italic' }}>No driver assigned</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {vehicle.driverUsername && (
                      <button onClick={doUnassign} disabled={driverBusy} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                        <UserX size={14} /> Unassign
                      </button>
                    )}
                    <button onClick={openAssignModal} disabled={driverBusy} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: A.grad, color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(180,83,9,0.25)', transition: 'all 0.2s' }}>
                      <UserCheck size={14} /> {vehicle.driverUsername ? 'Change Driver' : 'Assign Driver'}
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Service */}
            <Card>
              <SectionHeader
                icon={<Wrench size={15} color="#fb923c" />}
                title="Recent Service"
                action={
                  <button onClick={() => setActiveTab('services')} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    View All →
                  </button>
                }
              />
              {sidebarServiceRec ? (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: D.bg, borderRadius: 13, border: `1px solid ${D.border}` }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(251,146,60,0.12)', color: '#fb923c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wrench size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: D.text }}>{sidebarServiceRec.serviceType}</p>
                    <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: D.textSub }}>
                      {sidebarServiceRec.serviceDate ? new Date(sidebarServiceRec.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.74rem', color: D.textSub, flexWrap: 'wrap' }}>
                      {sidebarServiceRec.currentMileageKm != null && <span>At <strong style={{ color: D.text }}>{sidebarServiceRec.currentMileageKm.toLocaleString()} km</strong></span>}
                      {sidebarServiceRec.nextServiceDue && <span>Next: <strong style={{ color: D.text }}>{new Date(sidebarServiceRec.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 16px', borderRadius: 12, background: D.bg, border: `1px dashed ${D.border}` }}>
                  <Wrench size={20} style={{ opacity: 0.3, color: D.textFaint }} />
                  <span style={{ fontSize: '0.85rem', color: D.textSub }}>No service records yet</span>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Compliance & Expiries */}
            <Card>
              <SectionHeader icon={<Clock size={15} color="#a78bfa" />} title="Compliance & Expiries" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <ExpiryRow label="Insurance Expiry" date={vehicle.insuranceExpiryDate} diff={insDiff} />
                <ExpiryRow label="License Expiry"   date={vehicle.licenseExpiryDate}   diff={licDiff} />
              </div>
              {(insDiff !== null && insDiff <= 30 || licDiff !== null && licDiff <= 30) && (
                <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>One or more documents are expiring soon. Please renew them promptly.</span>
                </div>
              )}
            </Card>

            {/* Documents */}
            <Card>
              <SectionHeader icon={<FileText size={15} color="#60a5fa" />} title="Documents & Papers" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <DocBlock docType="insurance"    label="Insurance Certificate"  path={vehicle.insuranceDocumentPath} />
                <DocBlock docType="license"      label="License & Road Tax"     path={vehicle.licenseDocumentPath} />
                <DocBlock docType="registration" label="Registration Book (V5)" path={vehicle.registrationBookPath} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SERVICES TAB
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.3s ease both' }}>
          {(() => {
            const recs = serviceRecords
              .filter(r => normalizeReg(r.vehicleRegNumber) === targetReg && !r.deleted)
              .sort((a, b) => new Date(b.serviceDate || b.createdAt || 0) - new Date(a.serviceDate || a.createdAt || 0))
            if (!recs.length) return (
              <Card style={{ padding: '52px 20px', textAlign: 'center' }}>
                <Wrench size={40} style={{ margin: '0 auto 14px', opacity: 0.25, color: D.textFaint }} />
                <p style={{ margin: 0, fontWeight: 700, color: D.textSub, fontSize: '0.9rem' }}>No service records found</p>
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: D.textFaint }}>Service history for this vehicle will appear here.</p>
              </Card>
            )
            return recs.map(rec => (
              <Card key={rec.id} style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(251,146,60,0.12)', color: '#fb923c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wrench size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: D.text }}>{rec.serviceType}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: D.textSub }}>
                          {rec.serviceDate ? new Date(rec.serviceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                      {rec.nextServiceDue && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.textSub, background: D.bg, padding: '4px 12px', borderRadius: 8, border: `1px solid ${D.border}`, alignSelf: 'flex-start' }}>
                          Next: {new Date(rec.nextServiceDue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {rec.description && <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: D.textSub, lineHeight: 1.5 }}>{rec.description}</p>}
                    <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: '0.74rem', color: D.textSub, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${D.border}30` }}>
                      {rec.currentMileageKm != null && <span>Odometer: <strong style={{ color: D.text }}>{rec.currentMileageKm.toLocaleString()} km</strong></span>}
                      {rec.nextServiceMileageKm != null && <span>Next at: <strong style={{ color: D.text }}>{rec.nextServiceMileageKm.toLocaleString()} km</strong></span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FUEL & USAGE TAB
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'fuel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.3s ease both' }}>
          {loadingFuel ? (
            <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: D.textSub }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${D.border}`, borderTopColor: A.solid, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Loading fuel data…</span>
            </div>
          ) : (<>
            {/* Efficiency analytics */}
            {(() => {
              const s = fuelStats.find(x => normalizeReg(x.vehicleRegNumber) === targetReg)
              if (!s) return null
              const ec = s.efficiencyStatus === 'Good' ? '#22c55e' : s.efficiencyStatus === 'Moderate' ? '#f59e0b' : '#f87171'
              const eb = s.efficiencyStatus === 'Good' ? 'rgba(34,197,94,0.12)' : s.efficiencyStatus === 'Moderate' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'
              return (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: D.textSub, letterSpacing: '0.05em' }}>Fuel Efficiency Analytics</span>
                    <span style={{ background: eb, color: ec, padding: '4px 12px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800, border: `1px solid ${ec}30` }}>{s.efficiencyStatus}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 900, color: D.text }}>{s.fuelEfficiency?.toFixed(1) || '0.0'}</span>
                    <span style={{ fontSize: '1rem', color: D.textSub, fontWeight: 700 }}>km / Liter</span>
                  </div>
                  <div style={{ height: 8, background: D.bg, borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ width: `${Math.min((s.fuelEfficiency || 0) * 6.6, 100)}%`, height: '100%', background: ec, borderRadius: 999, transition: 'width 1s ease', boxShadow: `0 0 10px ${ec}60` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: D.textSub }}>
                    <span>Total spent: Rs. {Math.round(s.totalSpending || 0).toLocaleString()}</span>
                    <span>Fleet threshold: 5.0 km/L</span>
                  </div>
                </Card>
              )
            })()}

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {(() => {
                const tc = fuelLogs.reduce((s, l) => s + (l.totalCost || 0), 0)
                const tl = fuelLogs.reduce((s, l) => s + (l.liters || 0), 0)
                const ap = fuelLogs.length > 0 ? fuelLogs.reduce((s, l) => s + (l.pricePerLiter || 0), 0) / fuelLogs.length : 0
                return (<>
                  <Card style={{ padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <Fuel size={12} color="#22c55e" /> Total Fuel Cost
                    </div>
                    <div style={{ fontSize: '1.3rem', color: D.text, fontWeight: 800 }}>Rs. {Math.round(tc).toLocaleString()}</div>
                    <div style={{ fontSize: '0.72rem', color: D.textSub, marginTop: 3 }}>Across {fuelLogs.length} fill-ups</div>
                  </Card>
                  <Card style={{ padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.65rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <Gauge size={12} color="#60a5fa" /> Total Liters
                    </div>
                    <div style={{ fontSize: '1.3rem', color: D.text, fontWeight: 800 }}>{tl.toFixed(1)} L</div>
                    <div style={{ fontSize: '0.72rem', color: D.textSub, marginTop: 3 }}>Avg price: Rs. {ap.toFixed(1)}/L</div>
                  </Card>
                </>)
              })()}
            </div>

            {/* Fuel log list */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuel Log History</h4>
              {fuelLogs.length === 0 ? (
                <Card style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <Fuel size={36} style={{ margin: '0 auto 12px', opacity: 0.25, color: D.textFaint }} />
                  <p style={{ margin: 0, fontWeight: 700, color: D.textSub }}>No fuel logs found</p>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {fuelLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(log => (
                    <Card key={log.id} style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(34,197,94,0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Fuel size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: D.text }}>{log.liters ? `${log.liters.toFixed(1)} Liters` : '—'}</p>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: D.text }}>Rs. {log.totalCost ? log.totalCost.toLocaleString() : '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.72rem', color: D.textSub }}>
                            <span>{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span>Odometer: {log.currentMileageKm ? `${log.currentMileageKm.toLocaleString()} km` : '—'}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>)}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Odometer Modal */}
      {odometerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250 }} onClick={() => setOdometerOpen(false)}>
          <div style={{ background: D.surface, borderRadius: 24, width: '92%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${D.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ background: A.grad, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gauge size={20} /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Update Odometer</h3><p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>{vehicle.registrationNo}</p></div>
              </div>
              <button onClick={() => setOdometerOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={submitOdometer} style={{ padding: '24px 28px' }}>
              <label style={lbl}>Current Mileage (KM)</label>
              <input type="number" value={newMileage} onChange={e => setNewMileage(e.target.value)} required style={inp({ marginBottom: mileageError ? 6 : 20 })} placeholder="Enter new mileage…" />
              {mileageError && <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: '#f87171' }}>{mileageError}</p>}
              <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: A.grad, color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(180,83,9,0.3)' }}>Update Mileage</button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {assignDriverModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250 }} onClick={() => setAssignDriverModal(false)}>
          <div style={{ background: D.surface, borderRadius: 24, width: '92%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${D.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ background: A.grad, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCheck size={20} /></div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Assign Driver</h3>
              </div>
              <button onClick={() => setAssignDriverModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <label style={lbl}>Select Driver</label>
              <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} style={inp({ marginBottom: 16 })}>
                <option value="">— Unassign —</option>
                {allDrivers.map(d => <option key={d.id} value={d.username || d.userName}>{d.username || d.userName} ({d.firstName} {d.lastName})</option>)}
              </select>
              {driverError && <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#f87171' }}>{driverError}</p>}
              <button onClick={doAssign} disabled={driverBusy} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: A.grad, color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: driverBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(180,83,9,0.3)', opacity: driverBusy ? 0.7 : 1 }}>
                {driverBusy ? 'Assigning…' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {imgViewer.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400 }} onClick={() => setImgViewer(s => ({ ...s, open: false }))}>
          <button onClick={() => setImgViewer(s => ({ ...s, open: false }))} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
          <img src={imgViewer.url} alt={imgViewer.filename} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Expiry date confirm modal */}
      {pendingUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div style={{ background: D.surface, borderRadius: 20, width: '92%', maxWidth: 400, padding: 28, border: `1px solid ${D.border}` }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: D.text }}>Set Expiry Date</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: D.textSub }}>Confirm expiry for <strong>{pendingUpload.docType}</strong>:</p>
            <input type="date" value={pendingUpload.expiryDate} onChange={e => setPendingUpload(p => ({ ...p, expiryDate: e.target.value }))} style={inp({ marginBottom: 20 })} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPendingUpload(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${D.border}`, background: D.bg, color: D.textSub, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { const { docType, file, expiryDate } = pendingUpload; setPendingUpload(null); uploadDoc(docType, file, expiryDate) }} style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: A.grad, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Upload</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}