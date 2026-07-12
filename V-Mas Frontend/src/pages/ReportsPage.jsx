import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD, useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  Car, Fuel, Wrench, Users, DollarSign,
  FileText, Calendar, Download, ClipboardList, BarChart2, Loader2, Database, TrendingUp, Gauge,
  AlertCircle, CheckCircle, X, Search, Sliders, Palette,
  Eye, RefreshCw, Activity, FileSpreadsheet,
  Clock, LayoutGrid, List
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { vehicleAPI, fuelAPI, serviceAPI, userAPI } from '../services/api'
import { generateStyledExcel } from '../utils/excelExport'
import { formatFuelType } from '../utils/fuelUtils'

// ── Helper: relative time ─────────────────────────────────────────────────────
const getTimeAgo = (dateStr) => {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, D, icon, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, marginTop: 16 }}>
    {icon && <div style={{ color: D.indigo, display: 'flex', alignItems: 'center' }}>{icon}</div>}
    <h2 style={{ margin: 0, fontSize: '1.2rem', color: D.text, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{title}</h2>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }} />
    {action}
  </div>
)

// ── Skeleton shimmer card ────────────────────────────────────────────────────
const SkeletonCard = ({ D }) => (
  <div style={{
    background: D.surface, borderRadius: 20, border: `1.5px solid ${D.border}`,
    padding: '26px', height: 220, position: 'relative', overflow: 'hidden'
  }}>
    <style>{`
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
    `}</style>
    <div style={{
      position: 'absolute', inset: 0,
      background: `linear-gradient(90deg, transparent, ${D.surfaceHi}80, transparent)`,
      animation: 'shimmer 1.5s infinite'
    }} />
    {[48, 140, 100, 80].map((w, i) => (
      <div key={i} style={{
        height: i === 0 ? 48 : 14, width: i === 0 ? 48 : `${w}px`,
        borderRadius: i === 0 ? 14 : 6, background: D.surfaceHi, marginBottom: 16
      }} />
    ))}
  </div>
)

// ── Recent reports initial state ─────────────────────────────────────────────
const recentReports = [
  { name: 'Vehicle-Summary-May-2026.pdf',   generated: '2026-05-20', format: 'PDF',   size: '245 KB' },
  { name: 'Fuel-Consumption-Apr-2026.xlsx',  generated: '2026-05-01', format: 'Excel', size: '118 KB' },
  { name: 'User-Activity-Q2-2026.pdf',       generated: '2026-05-15', format: 'PDF',   size: '312 KB' },
  { name: 'Service-Summary-Apr-2026.pdf',    generated: '2026-05-02', format: 'PDF',   size: '198 KB' },
]

// ── Role-based report access ─────────────────────────────────────────────────
const ROLE_ACCESS = {
  ADMIN:      ['master-report', 'vehicle-summary', 'fuel-report', 'fuel-efficiency', 'service-report', 'user-report', 'cost-report', 'driver-performance', 'vehicle-documents', 'maintenance-schedule', 'vehicle-mileage'],
  CONTROLLER: ['vehicle-summary', 'fuel-report', 'fuel-efficiency', 'service-report', 'cost-report', 'driver-performance', 'vehicle-documents', 'maintenance-schedule', 'vehicle-mileage'],
  DRIVER:     ['fuel-report', 'fuel-efficiency'],
}

const ReportsPage = () => {
  const D = useD()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isDark = theme === 'blue'
  const userRole = user?.role || 'DRIVER'
  const allowedIds = ROLE_ACCESS[userRole] || ROLE_ACCESS.DRIVER

  // ── Report type definitions ──────────────────────────────────────────────
  const reportTypes = [
    { id: 'master-report',        icon: <Database size={22} strokeWidth={1.5} />,    title: 'Comprehensive Master Report',     desc: 'Complete export of all system data including vehicles, fuel, services, and users.',         category: 'System',       color: D.red,    bg: D.redDim    },
    { id: 'vehicle-summary',      icon: <Car size={22} strokeWidth={1.5} />,          title: 'Vehicle Summary Report',          desc: 'Overview of all fleet vehicles including status, mileage, and assignments.',                  category: 'Fleet',        color: D.indigo, bg: D.indigoDim },
    { id: 'fuel-report',          icon: <Fuel size={22} strokeWidth={1.5} />,         title: 'Fuel Consumption Report',         desc: 'Detailed fuel usage breakdown per vehicle, driver, and time period.',                          category: 'Fuel',         color: D.gold,   bg: D.goldDim   },
    { id: 'fuel-efficiency',      icon: <TrendingUp size={22} strokeWidth={1.5} />,   title: 'Fuel Efficiency Report',          desc: 'Computed km/L efficiency per vehicle by comparing fill-up records with distance covered.',     category: 'Fuel',         color: D.teal,   bg: D.tealDim   },
    { id: 'service-report',       icon: <Wrench size={22} strokeWidth={1.5} />,       title: 'Service & Maintenance Report',    desc: 'Summary of all service records, costs, and upcoming maintenance schedules.',                   category: 'Maintenance',  color: D.green,  bg: D.greenDim  },
    { id: 'user-report',          icon: <Users size={22} strokeWidth={1.5} />,        title: 'User Activity Report',            desc: 'User registration, role distribution, login history, and account statuses.',                    category: 'Users',        color: D.orange, bg: D.orangeDim },
    { id: 'cost-report',          icon: <DollarSign size={22} strokeWidth={1.5} />,   title: 'Cost Analysis Report',            desc: 'Full cost breakdown including fuel, maintenance, and operational expenses.',                    category: 'Finance',      color: D.blue,   bg: D.blueDim   },
    { id: 'driver-performance',   icon: <Users size={22} strokeWidth={1.5} />,        title: 'Driver Performance Report',       desc: 'Rank system drivers by their average fuel efficiency (km/L), liters spent, and logs.',          category: 'Users',        color: D.purple, bg: D.purpleDim },
    { id: 'vehicle-documents',    icon: <FileText size={22} strokeWidth={1.5} />,     title: 'Vehicle Documents & Renewals',   desc: 'Track vehicle compliance and renewal dates, including insurance and license validity.',          category: 'Fleet',        color: D.indigo, bg: D.indigoDim },
    { id: 'maintenance-schedule', icon: <Calendar size={22} strokeWidth={1.5} />,     title: 'Scheduled Maintenance Alerts',   desc: 'Lists upcoming and overdue scheduled maintenance records, tracking mileage/date.',              category: 'Maintenance',  color: D.green,  bg: D.greenDim  },
    { id: 'vehicle-mileage',      icon: <Gauge size={22} strokeWidth={1.5} />,        title: 'Vehicle Mileage Report',         desc: 'Track initial vs current mileage, total distance driven, and mileage utilisation per vehicle.', category: 'Fleet',        color: D.orange, bg: D.orangeDim },
  ].filter(r => allowedIds.includes(r.id))

  // ── State ────────────────────────────────────────────────────────────────
  const [generating, setGenerating]         = useState(null)
  const [error, setError]                   = useState('')
  const [successMsg, setSuccessMsg]         = useState('')
  const [recentSearch, setRecentSearch]     = useState('')
  const [pdfTheme, setPdfTheme]             = useState('indigo')
  const [reportsList, setReportsList]       = useState(recentReports)
  const [activeCategory, setActiveCategory] = useState('All')
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [startDate, setStartDate]           = useState('')
  const [endDate, setEndDate]               = useState('')
  const [formatPref, setFormatPref]         = useState('pdf')      // 'pdf' | 'excel' | 'both'
  const [recentFmtFilter, setRecentFmtFilter] = useState('all')   // 'all' | 'PDF' | 'Excel'
  const [viewMode, setViewMode]             = useState('grid')     // 'grid' | 'list'

  // Live stats
  const [liveStats, setLiveStats] = useState({
    vehicles: null, fuelLogs: null, services: null, users: null, loading: true
  })

  // Preview modal
  const [previewModal, setPreviewModal] = useState({
    open: false, reportId: null, title: '', rows: [], columns: [], loading: false, error: ''
  })

  // ── Fetch live stats on mount ────────────────────────────────────────────
  const fetchLiveStats = useCallback(async () => {
    setLiveStats(s => ({ ...s, loading: true }))
    try {
      const results = await Promise.allSettled([
        vehicleAPI.getAllVehicles(),
        fuelAPI.getAllFuelLogs(),
        serviceAPI.getAllServices(),
        userAPI.getAllUsers(),
      ])
      setLiveStats({
        vehicles: results[0].status === 'fulfilled' ? (results[0].value.data?.data?.length ?? 0) : '—',
        fuelLogs: results[1].status === 'fulfilled' ? (results[1].value.data?.data?.length ?? 0) : '—',
        services: results[2].status === 'fulfilled' ? (results[2].value.data?.data?.length ?? 0) : '—',
        users:    results[3].status === 'fulfilled' ? (results[3].value.data?.data?.length ?? 0) : '—',
        loading:  false,
      })
    } catch {
      setLiveStats({ vehicles: '—', fuelLogs: '—', services: '—', users: '—', loading: false })
    }
  }, [])

  useEffect(() => { fetchLiveStats() }, [fetchLiveStats])

  // ── Lock body scroll when preview modal is open ──────────────────────────
  useEffect(() => {
    if (previewModal.open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [previewModal.open])

  // ── Data count label per report ──────────────────────────────────────────
  const getDataBadge = (id) => {
    if (liveStats.loading) return null
    const map = {
      'master-report':        `${liveStats.vehicles}v · ${liveStats.fuelLogs}f · ${liveStats.services}s`,
      'vehicle-summary':      `${liveStats.vehicles} vehicles`,
      'fuel-report':          `${liveStats.fuelLogs} logs`,
      'fuel-efficiency':      `${liveStats.vehicles} vehicles`,
      'service-report':       `${liveStats.services} records`,
      'user-report':          `${liveStats.users} users`,
      'cost-report':          `${liveStats.fuelLogs}f + ${liveStats.services}s`,
      'driver-performance':   `${liveStats.fuelLogs} logs`,
      'vehicle-documents':    `${liveStats.vehicles} vehicles`,
      'maintenance-schedule': `${liveStats.services} records`,
      'fleet-tracking':       `${liveStats.vehicles} vehicles`,
    }
    return map[id] || null
  }

  // ── Preview modal handler ────────────────────────────────────────────────
  const handlePreview = async (id) => {
    const rt = reportTypes.find(r => r.id === id)
    setPreviewModal({ open: true, reportId: id, title: rt?.title || id, rows: [], columns: [], loading: true, error: '' })
    try {
      let columns = []
      let rows = []

      if (id === 'vehicle-summary' || id === 'master-report' || id === 'vehicle-documents' || id === 'fleet-tracking') {
        const { data } = await vehicleAPI.getAllVehicles()
        const vehicles = (data?.data || []).slice(0, 8)
        columns = ['Reg No', 'Manufacturer', 'Model', 'Status', 'Mileage', 'Fuel Type']
        rows = vehicles.map(v => [
          v.registrationNo || '—', v.manufacturer || '—', v.model || '—',
          v.status || '—', v.currentMileageKm ? `${v.currentMileageKm} km` : '0 km', v.fuelType ? formatFuelType(v.fuelType) : '—'
        ])
      } else if (id === 'fuel-report' || id === 'driver-performance' || id === 'fuel-efficiency') {
        const { data } = await fuelAPI.getAllFuelLogs()
        const logs = (data?.data || []).slice(0, 8)
        columns = ['Date', 'Vehicle', 'Driver', 'Type', 'Liters', 'Total Cost']
        rows = logs.map(f => [
          f.date ? new Date(f.date).toLocaleDateString() : '—',
          f.vehicleRegNumber || '—', f.driverUsername || '—', f.fuelType ? formatFuelType(f.fuelType) : '—',
          f.liters ? `${Number(f.liters).toFixed(1)} L` : '0 L',
          f.totalCost != null ? `Rs. ${Number(f.totalCost).toLocaleString()}` : 'Rs. 0'
        ])
      } else if (id === 'service-report' || id === 'maintenance-schedule') {
        const { data } = await serviceAPI.getAllServices()
        const svcs = (data?.data || []).slice(0, 8)
        columns = ['Date', 'Vehicle Reg', 'Service Type', 'Classification', 'Cost']
        rows = svcs.map(s => [
          s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : '—',
          s.vehicleRegNumber || '—',
          s.serviceType ? String(s.serviceType).replace(/_/g, ' ') : '—',
          s.serviceClassification || '—',
          s.serviceCost != null ? `Rs. ${Number(s.serviceCost).toLocaleString()}` : 'Rs. 0'
        ])
      } else if (id === 'user-report') {
        const { data } = await userAPI.getAllUsers()
        const users = (data?.data || []).slice(0, 8)
        columns = ['Username', 'Email', 'Role', 'Status']
        rows = users.map(u => [u.userName || '—', u.email || '—', u.role || '—', u.accountStatus || 'ACTIVE'])
      } else if (id === 'vehicle-mileage') {
        const { data } = await vehicleAPI.getAllVehicles()
        const vehicles = (data?.data || []).slice(0, 8)
        columns = ['Reg No', 'Vehicle', 'Type', 'Status', 'Initial km', 'Current km', 'Distance Driven', 'Mileage Level']
        rows = [...vehicles]
          .sort((a, b) => (b.currentMileageKm || 0) - (a.currentMileageKm || 0))
          .map(v => {
            const initial = v.initialMileageKm != null ? v.initialMileageKm : 0
            const current = v.currentMileageKm != null ? v.currentMileageKm : 0
            const driven  = Math.max(0, current - initial)
            const level   = current > 100000 ? 'High' : current > 50000 ? 'Moderate' : 'Low'
            return [
              v.registrationNo || '—',
              `${v.manufacturer || ''} ${v.model || ''}`.trim() || '—',
              v.vehicleType || '—',
              v.status || '—',
              `${initial.toLocaleString()} km`,
              `${current.toLocaleString()} km`,
              `${driven.toLocaleString()} km`,
              level,
            ]
          })
      } else if (id === 'cost-report') {
        const [fRes, sRes] = await Promise.all([fuelAPI.getAllFuelLogs(), serviceAPI.getAllServices()])
        const fuelLogs = fRes.data?.data || []
        const services = sRes.data?.data || []
        const totalFuelCost = fuelLogs.reduce((s, f) => s + (Number(f.totalCost) || 0), 0)
        const totalServiceCost = services.reduce((s, svc) => s + (Number(svc.serviceCost) || 0), 0)
        columns = ['Cost Category', 'Amount']
        rows = [
          ['Total Fuel Expenses', `Rs. ${totalFuelCost.toLocaleString()}`],
          ['Total Maintenance / Service Expenses', `Rs. ${totalServiceCost.toLocaleString()}`],
          ['Grand Total Operational Expenses', `Rs. ${(totalFuelCost + totalServiceCost).toLocaleString()}`],
        ]
      }

      setPreviewModal(p => ({ ...p, loading: false, columns, rows }))
    } catch (err) {
      setPreviewModal(p => ({ ...p, loading: false, error: 'Failed to load preview data. Please try again.' }))
    }
  }

  const closePrevModal = () => {
    document.body.style.overflow = ''
    setPreviewModal({ open: false, reportId: null, title: '', rows: [], columns: [], loading: false, error: '' })
  }

  // ── PDF theme config ─────────────────────────────────────────────────────
  const pdfThemeColors = {
    indigo:   { primary: [37, 99, 235] },
    emerald:  { primary: [5, 150, 105] },
    crimson:  { primary: [220, 38, 38] },
    charcoal: { primary: [55, 65, 81] }
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  const filteredRecentReports = reportsList.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(recentSearch.toLowerCase()) ||
                        r.format.toLowerCase().includes(recentSearch.toLowerCase())
    const matchFmt    = recentFmtFilter === 'all' || r.format === recentFmtFilter
    return matchSearch && matchFmt
  })

  const visibleReportTypes = reportTypes.filter(r =>
    activeCategory === 'All' || r.category.toLowerCase() === activeCategory.toLowerCase()
  )

  // ── Main PDF generator (all original logic preserved) ────────────────────
  const handleGenerate = async (id) => {
    setError(''); setSuccessMsg(''); setGenerating(id)
    try {
      const headerColor = (pdfThemeColors[pdfTheme] || pdfThemeColors.indigo).primary
      const doc = new jsPDF()

      const addHeader = (title) => {
        doc.setFontSize(20); doc.setTextColor(40, 40, 40)
        doc.text(title, 14, 22)
        doc.setFontSize(10); doc.setTextColor(100)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)
      }
      const addPageFooters = () => {
        const totalPages = doc.internal.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i)
          const pw = doc.internal.pageSize.getWidth()
          const ph = doc.internal.pageSize.getHeight()
          doc.setFontSize(8); doc.setTextColor(150)
          doc.text(`Page ${i} of ${totalPages}`, pw / 2, ph - 10, { align: 'center' })
          doc.text('V-Mas Fleet Management System', 14, ph - 10)
          doc.text(new Date().toLocaleDateString(), pw - 14, ph - 10, { align: 'right' })
        }
      }

      if (id === 'vehicle-summary' || id === 'master-report') {
        if (id === 'vehicle-summary') addHeader('Vehicle Summary Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.text('Vehicle Details', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: vRes } = await vehicleAPI.getAllVehicles()
        const vehData = vRes.data || []
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Reg No', 'Manufacturer', 'Model', 'Status', 'Mileage', 'Fuel Type', 'Capacity']],
          body: vehData.map(v => [
            v.registrationNo || 'N/A', v.manufacturer || 'N/A', v.model || 'N/A', v.status || 'N/A',
            v.currentMileageKm != null ? `${v.currentMileageKm} km` : '0 km',
            v.fuelType ? formatFuelType(v.fuelType) : 'N/A', v.fuelCapacity != null ? `${v.fuelCapacity} L` : '0 L'
          ]),
          theme: 'grid', headStyles: { fillColor: headerColor }
        })
      }

      if (id === 'fuel-report' || id === 'master-report') {
        if (id === 'fuel-report') addHeader('Fuel Consumption Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.text('Fuel Records', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: fuelRes } = await fuelAPI.getAllFuelLogs()
        let filteredFuel = fuelRes.data || []
        if (startDate) filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) >= new Date(startDate))
        if (endDate)   filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) <= new Date(endDate))
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Date', 'Vehicle', 'Driver', 'Type', 'Liters', 'Total Cost']],
          body: filteredFuel.map(f => [
            f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
            f.vehicleRegNumber || 'N/A', f.driverUsername || 'N/A', f.fuelType ? formatFuelType(f.fuelType) : 'N/A',
            f.liters != null ? `${f.liters} L` : '0 L',
            f.totalCost != null ? `Rs. ${Number(f.totalCost).toLocaleString()}` : 'Rs. 0'
          ]),
          theme: 'grid', headStyles: { fillColor: headerColor }
        })
      }

      if (id === 'service-report' || id === 'master-report') {
        if (id === 'service-report') addHeader('Service & Maintenance Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.text('Service & Maintenance Records', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: svcRes } = await serviceAPI.getAllServices()
        let filteredServices = svcRes.data || []
        if (startDate) filteredServices = filteredServices.filter(s => s.serviceDate && new Date(s.serviceDate) >= new Date(startDate))
        if (endDate)   filteredServices = filteredServices.filter(s => s.serviceDate && new Date(s.serviceDate) <= new Date(endDate))
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Date', 'Vehicle Reg', 'Service Type', 'Classification', 'Cost']],
          body: filteredServices.map(s => [
            s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : 'N/A',
            s.vehicleRegNumber || 'N/A',
            s.serviceType ? String(s.serviceType).replace(/_/g, ' ') : 'N/A',
            s.serviceClassification || 'N/A',
            s.serviceCost != null ? `Rs. ${Number(s.serviceCost).toLocaleString()}` : 'Rs. 0'
          ]),
          theme: 'grid', headStyles: { fillColor: headerColor }
        })
      }

      if (id === 'user-report' || id === 'master-report') {
        if (id === 'user-report') addHeader('User Activity Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.text('User Directory', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: usrRes } = await userAPI.getAllUsers()
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Username', 'Email', 'Role', 'Status']],
          body: (usrRes.data || []).map(u => [u.userName || 'N/A', u.email || 'N/A', u.role || 'N/A', u.accountStatus || 'ACTIVE']),
          theme: 'grid', headStyles: { fillColor: headerColor }
        })
      }

      if (id === 'fuel-efficiency' || id === 'master-report') {
        if (id === 'fuel-efficiency') addHeader('Fuel Efficiency Report')
        if (id === 'master-report') {
          doc.setFontSize(14); doc.setTextColor(40, 40, 40)
          doc.text('Fuel Efficiency', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: effApiRes } = await fuelAPI.getFuelEfficiencyReport()
        const report = effApiRes.data || effApiRes
        let y = id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 25 : 50) : 38
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Fleet Summary', 14, y); y += 7
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Fleet Average Efficiency', report.fleetAverageEfficiency != null ? `${Number(report.fleetAverageEfficiency).toFixed(2)} km/L` : 'Insufficient Data'],
            ['Total Vehicles', String(report.totalVehicles ?? 0)],
            ['Good Efficiency (≥10 km/L)', String(report.goodEfficiencyCount ?? 0)],
            ['Moderate (5–9.99 km/L)', String(report.moderateEfficiencyCount ?? 0)],
            ['Low Efficiency (<5 km/L)', String(report.lowEfficiencyCount ?? 0)],
          ],
          theme: 'grid', headStyles: { fillColor: headerColor },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { cellWidth: 60 } },
          margin: { left: 14, right: 14 }
        })
        const afterSummary = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 40
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Per-Vehicle Efficiency Breakdown', 14, afterSummary)
        const vehicles = report.vehicles || []
        autoTable(doc, {
          startY: afterSummary + 5,
          head: [['Reg No', 'Latest km/L', 'Avg km/L', 'Status', 'Total Liters', 'Total Cost', 'Cost/km', 'Fill-ups']],
          body: vehicles.map(v => [
            v.vehicleRegNumber || 'N/A',
            v.latestEfficiency  != null ? `${Number(v.latestEfficiency).toFixed(2)} km/L`  : 'N/A',
            v.averageEfficiency != null ? `${Number(v.averageEfficiency).toFixed(2)} km/L` : 'N/A',
            v.efficiencyStatus || 'N/A',
            v.totalLiters       != null ? `${Number(v.totalLiters).toFixed(1)} L`          : 'N/A',
            v.totalCost         != null ? `Rs. ${Number(v.totalCost).toLocaleString()}`     : 'N/A',
            v.costPerKm         != null ? `Rs. ${Number(v.costPerKm).toFixed(2)}/km`        : 'N/A',
            v.fillUps           != null ? String(v.fillUps.length)                          : '0',
          ]),
          theme: 'striped', headStyles: { fillColor: headerColor, fontSize: 8 },
          bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
              const s = data.cell.raw
              if (s === 'Low Efficiency') data.cell.styles.textColor = [220, 38, 38]
              else if (s === 'Moderate')  data.cell.styles.textColor = [180, 120, 0]
              else if (s === 'Good')      data.cell.styles.textColor = [5, 150, 105]
            }
          }
        })
      }

      if (id === 'cost-report' || id === 'master-report') {
        if (id === 'cost-report') addHeader('Cost Analysis Report')
        if (id === 'master-report') {
          doc.setFontSize(14); doc.setTextColor(40, 40, 40)
          doc.text('Cost Analysis', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: fuelLogsApiRes } = await fuelAPI.getAllFuelLogs()
        const { data: servicesApiRes } = await serviceAPI.getAllServices()
        let fuelLogs = fuelLogsApiRes.data || []
        let services = servicesApiRes.data || []
        if (startDate) { fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) >= new Date(startDate)); services = services.filter(s => s.serviceDate && new Date(s.serviceDate) >= new Date(startDate)) }
        if (endDate)   { fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) <= new Date(endDate));   services = services.filter(s => s.serviceDate && new Date(s.serviceDate) <= new Date(endDate)) }
        const totalFuelCost    = fuelLogs.reduce((sum, f) => sum + (Number(f.totalCost) || 0), 0)
        const totalServiceCost = services.reduce((sum, s) => sum + (Number(s.serviceCost) || 0), 0)
        const grandTotal = totalFuelCost + totalServiceCost
        let y = id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 25 : 50) : 38
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Operational Expenses Summary', 14, y); y += 7
        autoTable(doc, {
          startY: y, head: [['Cost Category', 'Amount']],
          body: [
            ['Total Fuel Expenses', `Rs. ${totalFuelCost.toLocaleString()}`],
            ['Total Maintenance / Service Expenses', `Rs. ${totalServiceCost.toLocaleString()}`],
            ['Total Fleet Operational Expenses', `Rs. ${grandTotal.toLocaleString()}`],
          ],
          theme: 'grid', headStyles: { fillColor: headerColor },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { cellWidth: 50 } }, margin: { left: 14, right: 14 }
        })
        const afterSummary = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 35
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Fuel Expenditure Breakdown (Top 5 Transactions)', 14, afterSummary)
        autoTable(doc, {
          startY: afterSummary + 5, head: [['Date', 'Vehicle', 'Driver', 'Volume', 'Cost']],
          body: [...fuelLogs].sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0)).slice(0, 5).map(f => [
            f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
            f.vehicleRegNumber || 'N/A', f.driverUsername || 'N/A',
            f.liters ? `${Number(f.liters).toFixed(1)} L` : '0 L',
            f.totalCost != null ? `Rs. ${Number(f.totalCost).toLocaleString()}` : 'Rs. 0'
          ]),
          theme: 'striped', headStyles: { fillColor: headerColor, fontSize: 9 }, bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 }
        })
        const afterFuel = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : afterSummary + 50
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Maintenance Expenditure Breakdown (Top 5 Transactions)', 14, afterFuel)
        autoTable(doc, {
          startY: afterFuel + 5, head: [['Date', 'Vehicle', 'Service Type', 'Classification', 'Cost']],
          body: [...services].sort((a, b) => (Number(b.serviceCost) || 0) - (Number(a.serviceCost) || 0)).slice(0, 5).map(s => [
            s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : 'N/A',
            s.vehicleRegNumber || 'N/A',
            s.serviceType ? String(s.serviceType).replace(/_/g, ' ') : 'N/A',
            s.serviceClassification || 'N/A',
            s.serviceCost != null ? `Rs. ${Number(s.serviceCost).toLocaleString()}` : 'Rs. 0'
          ]),
          theme: 'striped', headStyles: { fillColor: headerColor, fontSize: 9 }, bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 }
        })
      }

      if (id === 'driver-performance' || id === 'master-report') {
        if (id === 'driver-performance') addHeader('Driver Performance Report')
        if (id === 'master-report') {
          doc.setFontSize(14); doc.setTextColor(40, 40, 40)
          doc.text('Driver Performance Ranking', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: fuelRes } = await fuelAPI.getAllFuelLogs()
        const logs = fuelRes.data || []
        const drvMap = {}
        logs.forEach(l => {
          const drv = l.driverUsername || l.uploadedBy || 'Unassigned'
          if (!drvMap[drv]) drvMap[drv] = { count: 0, liters: 0, cost: 0, effSums: 0, effCount: 0 }
          drvMap[drv].count += 1; drvMap[drv].liters += l.liters || 0; drvMap[drv].cost += l.totalCost || 0
          if (l.fuelEfficiency && l.fuelEfficiency > 0) { drvMap[drv].effSums += l.fuelEfficiency; drvMap[drv].effCount += 1 }
        })
        const driverRanking = Object.entries(drvMap).map(([name, d]) => {
          const avgEff = d.effCount > 0 ? d.effSums / d.effCount : null
          const status = avgEff == null ? 'N/A' : avgEff > 10 ? 'Excellent' : avgEff > 7 ? 'Good' : avgEff > 5 ? 'Average' : 'Poor'
          return [name, d.count, `${d.liters.toFixed(1)} L`, `Rs. ${Number(d.cost).toLocaleString()}`, avgEff != null ? `${avgEff.toFixed(2)} km/L` : 'N/A', status, avgEff]
        }).sort((a, b) => (b[6] ?? -1) - (a[6] ?? -1))
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Driver Name', 'Logs Count', 'Total Liters', 'Total Spent', 'Avg km/L', 'Status']],
          body: driverRanking.map(r => [r[0], r[1], r[2], r[3], r[4], r[5]]),
          theme: 'grid', headStyles: { fillColor: headerColor },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
              const s = data.cell.raw
              if (s === 'Poor') data.cell.styles.textColor = [220, 38, 38]
              else if (s === 'Average') data.cell.styles.textColor = [180, 120, 0]
              else if (s === 'Good') data.cell.styles.textColor = [37, 99, 235]
              else if (s === 'Excellent') data.cell.styles.textColor = [5, 150, 105]
            }
          }
        })
      }

      if (id === 'vehicle-documents' || id === 'master-report') {
        if (id === 'vehicle-documents') addHeader('Vehicle Document & Renewal Report')
        if (id === 'master-report') {
          doc.setFontSize(14); doc.setTextColor(40, 40, 40)
          doc.text('Vehicle Documents & Compliance', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: vRes } = await vehicleAPI.getAllVehicles()
        const vehicles = vRes.data || []
        const today = new Date(); today.setHours(0,0,0,0)
        const tableData = vehicles.map(v => {
          const insExp = v.insuranceExpiryDate ? new Date(v.insuranceExpiryDate) : null
          const licExp = v.licenseExpiryDate ? new Date(v.licenseExpiryDate) : null
          let minDays = Infinity, warningText = 'Valid', statusLevel = 'OK'
          if (insExp) { const d = Math.ceil((insExp - today) / 86400000); if (d < minDays) minDays = d }
          if (licExp) { const d = Math.ceil((licExp - today) / 86400000); if (d < minDays) minDays = d }
          if (!insExp && !licExp) { warningText = 'No Documents'; statusLevel = 'NONE' }
          else if (minDays < 0) { warningText = `Expired (${Math.abs(minDays)} days ago)`; statusLevel = 'EXPIRED' }
          else if (minDays <= 30) { warningText = `Expiring soon (${minDays} days left)`; statusLevel = 'WARNING' }
          else { warningText = `Valid (${minDays} days left)`; statusLevel = 'OK' }
          return [v.registrationNo || 'N/A', `${v.manufacturer || ''} ${v.model || ''}`.trim() || 'N/A', v.status || 'N/A',
            v.insuranceExpiryDate ? new Date(v.insuranceExpiryDate).toLocaleDateString() : 'N/A',
            v.licenseExpiryDate ? new Date(v.licenseExpiryDate).toLocaleDateString() : 'N/A',
            warningText, statusLevel]
        })
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Reg No', 'Vehicle Model', 'Status', 'Insurance Expiry', 'License Expiry', 'Renewal Status']],
          body: tableData.map(r => [r[0], r[1], r[2], r[3], r[4], r[5]]),
          theme: 'grid', headStyles: { fillColor: headerColor },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
              const sl = tableData[data.row.index]?.[6]
              if (sl === 'EXPIRED') data.cell.styles.textColor = [220, 38, 38]
              else if (sl === 'WARNING') data.cell.styles.textColor = [180, 120, 0]
              else if (sl === 'OK') data.cell.styles.textColor = [5, 150, 105]
            }
          }
        })
      }

      if (id === 'maintenance-schedule' || id === 'master-report') {
        if (id === 'maintenance-schedule') addHeader('Scheduled Maintenance & Alerts Report')
        if (id === 'master-report') {
          doc.setFontSize(14); doc.setTextColor(40, 40, 40)
          doc.text('Scheduled & Pending Maintenance Alerts', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: svcRes } = await serviceAPI.getAllServices()
        const allSvc = svcRes.data || []
        const getTableStatusLocal = (s) => {
          if (!s) return 'Open'
          const today = new Date(); today.setHours(0, 0, 0, 0)
          const isCompleted = s.serviceDate && (() => { const d = new Date(s.serviceDate); d.setHours(0,0,0,0); return d <= today })()
          if (isCompleted) return 'Completed'
          if (!s.serviceDate) return 'Open'
          const targetDate = new Date(s.serviceDate); targetDate.setHours(0,0,0,0)
          if (targetDate < today) return 'Overdue'
          const diffDays = Math.ceil((targetDate - today) / 86400000)
          return diffDays <= 5 ? 'In Progress' : 'Open'
        }
        const scheduled = allSvc.filter(s => !s.deleted && ['Open', 'In Progress', 'Overdue'].includes(getTableStatusLocal(s)))
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Vehicle Reg', 'Service Type', 'Classification', 'Target Date', 'Workshop', 'Status']],
          body: scheduled.map(s => [
            s.vehicleRegNumber || 'N/A', String(s.serviceType || 'N/A').replace(/_/g, ' '),
            s.serviceClassification || 'N/A', s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : 'N/A',
            s.technicianWorkshop || 'N/A', getTableStatusLocal(s)
          ]),
          theme: 'grid', headStyles: { fillColor: headerColor },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
              const s = data.cell.raw
              if (s === 'Overdue') data.cell.styles.textColor = [220, 38, 38]
              else if (s === 'In Progress') data.cell.styles.textColor = [180, 120, 0]
              else if (s === 'Open') data.cell.styles.textColor = [37, 99, 235]
            }
          }
        })
      }

      if (id === 'fleet-tracking' || id === 'master-report') {
        if (id === 'fleet-tracking') addHeader('Live Fleet Location & Status Report')
        if (id === 'master-report') {
          doc.setFontSize(14); doc.setTextColor(40, 40, 40)
          doc.text('Live Fleet GPS Tracking & Utilization', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: vRes } = await vehicleAPI.getAllVehicles()
        const vehicles = vRes.data || []
        const liveTrackingData = [
          { reg: 'WP-CAB-1234', driver: 'Kamal Perera',   status: 'MOVING', speed: 58,  location: 'Colombo 07, Rosmead Pl',  lastUpdate: '2 min ago' },
          { reg: 'WP-CAB-5678', driver: 'Nimal Silva',    status: 'IDLE',   speed: 0,   location: 'Nugegoda, High Level Rd', lastUpdate: '5 min ago' },
          { reg: 'SP-7890',     driver: '—',              status: 'PARKED', speed: 0,   location: 'Kandy City Centre',        lastUpdate: '1 hr ago'  },
          { reg: 'WP-CAB-9012', driver: 'Sunil Fernando', status: 'MOVING', speed: 72,  location: 'Galle Road, Dehiwala',    lastUpdate: '1 min ago' },
        ]
        const trackedRegs = new Set(liveTrackingData.map(d => d.reg.toLowerCase()))
        const trackingRows = [...liveTrackingData.map(d => [d.reg, d.driver, d.status, d.location, d.speed > 0 ? `${d.speed} km/h` : 'Stationary', d.lastUpdate])]
        vehicles.forEach(v => {
          if (v.registrationNo && !trackedRegs.has(v.registrationNo.toLowerCase()))
            trackingRows.push([v.registrationNo, 'Unassigned', 'PARKED', 'Depot / Fleet Base', 'Stationary', 'Unknown'])
        })
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Reg Number', 'Driver', 'Live Status', 'Current Location', 'Speed', 'Last Updated']],
          body: trackingRows, theme: 'grid', headStyles: { fillColor: headerColor },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const s = data.cell.raw
              if (s === 'MOVING') data.cell.styles.textColor = [5, 150, 105]
              else if (s === 'IDLE') data.cell.styles.textColor = [180, 120, 0]
              else if (s === 'PARKED') data.cell.styles.textColor = [37, 99, 235]
            }
          }
        })
      }

      if (id === 'vehicle-mileage') {
        addHeader('Vehicle Mileage Report')
        const { data: vRes } = await vehicleAPI.getAllVehicles()
        const vehicles = vRes.data || []

        // ── Fleet mileage summary block ─────────────────────────────────────
        const totalKm     = vehicles.reduce((s, v) => s + (v.currentMileageKm || 0), 0)
        const avgKm       = vehicles.length > 0 ? Math.round(totalKm / vehicles.length) : 0
        const highMileage = vehicles.filter(v => (v.currentMileageKm || 0) > 100000).length
        const lowMileage  = vehicles.filter(v => (v.currentMileageKm || 0) <= 30000).length

        let y = 38
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Fleet Mileage Summary', 14, y); y += 7

        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Total Vehicles',             String(vehicles.length)],
            ['Total Fleet Distance (km)',   `${totalKm.toLocaleString()} km`],
            ['Average Mileage per Vehicle', `${avgKm.toLocaleString()} km`],
            ['High Mileage Vehicles (>100,000 km)', String(highMileage)],
            ['Low Mileage Vehicles (≤30,000 km)',   String(lowMileage)],
          ],
          theme: 'grid',
          headStyles: { fillColor: headerColor },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { cellWidth: 50 } },
          margin: { left: 14, right: 14 },
        })

        // ── Per-vehicle mileage breakdown ───────────────────────────────────
        const afterSummary = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 40
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Per-Vehicle Mileage Breakdown', 14, afterSummary)

        const mileageRows = [...vehicles]
          .sort((a, b) => (b.currentMileageKm || 0) - (a.currentMileageKm || 0))
          .map((v, rank) => {
            const initial  = v.initialMileageKm != null ? v.initialMileageKm : 0
            const current  = v.currentMileageKm != null ? v.currentMileageKm : 0
            const driven   = Math.max(0, current - initial)
            const status   = current > 100000 ? 'High' : current > 50000 ? 'Moderate' : 'Low'
            return [
              String(rank + 1),
              v.registrationNo || 'N/A',
              `${v.manufacturer || ''} ${v.model || ''}`.trim() || 'N/A',
              v.vehicleType || 'N/A',
              v.status || 'N/A',
              `${initial.toLocaleString()} km`,
              `${current.toLocaleString()} km`,
              `${driven.toLocaleString()} km`,
              status,
            ]
          })

        autoTable(doc, {
          startY: afterSummary + 5,
          head: [['#', 'Reg No', 'Vehicle', 'Type', 'Status', 'Initial km', 'Current km', 'Distance Driven', 'Mileage Level']],
          body: mileageRows,
          theme: 'striped',
          headStyles: { fillColor: headerColor, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          columnStyles: { 0: { cellWidth: 10 } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 8) {
              const level = data.cell.raw
              if (level === 'High')     data.cell.styles.textColor = [220, 38, 38]
              else if (level === 'Moderate') data.cell.styles.textColor = [180, 120, 0]
              else if (level === 'Low') data.cell.styles.textColor = [5, 150, 105]
            }
          },
        })
      }

      if (id === 'master-report') { doc.setPage(1); addHeader('Comprehensive Master Report') }
      addPageFooters()
      const filename = `${id}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      setSuccessMsg(`Report "${filename}" generated and downloaded successfully.`)
      setTimeout(() => setSuccessMsg(''), 5000)
      setReportsList(prev => [{ name: filename, generated: new Date().toISOString().split('T')[0], format: 'PDF', size: id === 'master-report' ? '450 KB' : '120 KB' }, ...prev.filter(r => r.name !== filename)])
    } catch (err) {
      const reportName = reportTypes.find(r => r.id === id)?.title || id
      if (err.response?.status === 401 || err.response?.status === 403) setError(`Permission denied: You do not have access to generate the "${reportName}" report.`)
      else if (err.response?.status === 404) setError(`Data not found: The data required for "${reportName}" could not be retrieved from the server.`)
      else if (err.code === 'ERR_NETWORK') setError('Network error: Unable to reach the server. Please check your connection and try again.')
      else setError(err.message || `Failed to generate "${reportName}". Please try again later.`)
    } finally { setGenerating(null) }
  }

  // ── Excel generator (all original logic preserved) ──────────────────────
  const handleGenerateExcel = async (id) => {
    setError(''); setSuccessMsg(''); setGenerating(id)
    try {
      let vehicles = [], fuelLogs = [], services = [], users = [], effReport = null
      const needsVehicles   = ['vehicle-summary', 'vehicle-documents', 'fleet-tracking', 'vehicle-mileage', 'master-report'].includes(id)
      const needsFuel       = ['fuel-report', 'fuel-efficiency', 'cost-report', 'driver-performance', 'master-report'].includes(id)
      const needsServices   = ['service-report', 'cost-report', 'maintenance-schedule', 'master-report'].includes(id)
      const needsUsers      = ['user-report', 'master-report'].includes(id)
      const needsEfficiency = ['fuel-efficiency', 'master-report'].includes(id)
      const fetches = []
      if (needsVehicles)   fetches.push(vehicleAPI.getAllVehicles().then(r => { vehicles  = r.data?.data || [] }))
      if (needsFuel)       fetches.push(fuelAPI.getAllFuelLogs().then(r    => { fuelLogs  = r.data?.data || [] }))
      if (needsServices)   fetches.push(serviceAPI.getAllServices().then(r => { services  = r.data?.data || [] }))
      if (needsUsers)      fetches.push(userAPI.getAllUsers().then(r       => { users     = r.data?.data || [] }))
      if (needsEfficiency) fetches.push(fuelAPI.getFuelEfficiencyReport().then(r => { effReport = r.data?.data || r.data || null }))
      await Promise.all(fetches)
      const filename = await generateStyledExcel(id, { vehicles, fuelLogs, services, users, effReport, startDate, endDate })
      setSuccessMsg(`Excel report "${filename}" generated and downloaded successfully.`)
      setTimeout(() => setSuccessMsg(''), 5000)
      setReportsList(prev => [{ name: filename, generated: new Date().toISOString().split('T')[0], format: 'Excel', size: id === 'master-report' ? '420 KB' : '95 KB' }, ...prev.filter(r => r.name !== filename)])
    } catch (err) {
      const reportName = reportTypes.find(r => r.id === id)?.title || id
      if (err.response?.status === 401 || err.response?.status === 403) setError(`Permission denied: You do not have access to generate the "${reportName}" Excel report.`)
      else if (err.code === 'ERR_NETWORK') setError('Network error: Unable to reach the server. Please check your connection and try again.')
      else setError(err.response?.data?.message || `Failed to generate "${reportName}" Excel report. Please try again.`)
    } finally { setGenerating(null) }
  }

  // ── Download dispatcher ──────────────────────────────────────────────────
  const handleDownload = async (id) => {
    if (formatPref === 'excel') return handleGenerateExcel(id)
    if (formatPref === 'both') { await handleGenerate(id); await handleGenerateExcel(id); return }
    return handleGenerate(id)
  }

  // ── Recent reports helpers ───────────────────────────────────────────────
  const handleDeleteRecent = (name) => {
    if (!window.confirm(`Remove "${name}" from recent downloads?`)) return
    setReportsList(prev => prev.filter(r => r.name !== name))
    setSuccessMsg(`Removed "${name}" from recent reports.`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }
  const handleClearAllRecent = () => {
    if (reportsList.length === 0) return
    if (!window.confirm('Clear all recent reports history?')) return
    setReportsList([])
    setSuccessMsg('Cleared all recent reports history.')
    setTimeout(() => setSuccessMsg(''), 4000)
  }
  const handleRedownload = (name, format) => {
    const matchedType = reportTypes.find(t => name.toLowerCase().startsWith(t.id.toLowerCase()))
    const fallbackId = (() => {
      if (name.toLowerCase().includes('fuel')) return 'fuel-report'
      if (name.toLowerCase().includes('user')) return 'user-report'
      if (name.toLowerCase().includes('service')) return 'service-report'
      return 'vehicle-summary'
    })()
    const targetId = matchedType?.id || fallbackId
    if (format === 'PDF') handleGenerate(targetId)
    else handleGenerateExcel(targetId)
  }

  // ── Shared input style ───────────────────────────────────────────────────
  const inputStyle = {
    padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${D.inputBorder}`, fontSize: '0.85rem',
    color: D.text, background: D.inputBg, outline: 'none',
    transition: 'all 0.2s ease', fontFamily: 'inherit',
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const statsConfig = [
    { label: 'Total Vehicles',     value: liveStats.loading ? '…' : String(liveStats.vehicles), icon: <Car size={20} strokeWidth={1.5} />,       colorDim: D.indigoDim, colorHex: D.indigo },
    { label: 'Fuel Log Entries',   value: liveStats.loading ? '…' : String(liveStats.fuelLogs), icon: <Fuel size={20} strokeWidth={1.5} />,       colorDim: D.goldDim,   colorHex: D.gold   },
    { label: 'Service Records',    value: liveStats.loading ? '…' : String(liveStats.services), icon: <Wrench size={20} strokeWidth={1.5} />,     colorDim: D.greenDim,  colorHex: D.green  },
    { label: 'System Users',       value: liveStats.loading ? '…' : String(liveStats.users),    icon: <Users size={20} strokeWidth={1.5} />,      colorDim: D.orangeDim, colorHex: D.orange },
    { label: 'Reports Available',  value: String(reportTypes.length),                             icon: <ClipboardList size={20} strokeWidth={1.5} />, colorDim: D.tealDim, colorHex: D.teal },
    { label: 'PDF Color Palette',  value: pdfTheme.charAt(0).toUpperCase() + pdfTheme.slice(1),  icon: <Palette size={20} strokeWidth={1.5} />,   colorDim: D.blueDim,   colorHex: D.blue   },
  ]

  // ── Categories ───────────────────────────────────────────────────────────
  const categoryList = ['All', ...Array.from(new Set(reportTypes.map(r => r.category)))]

  // ── Count by category ────────────────────────────────────────────────────
  const countByCategory = {}
  reportTypes.forEach(r => { countByCategory[r.category] = (countByCategory[r.category] || 0) + 1 })

  const pdfCount   = reportsList.filter(r => r.format === 'PDF').length
  const excelCount = reportsList.filter(r => r.format === 'Excel').length

  // ════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Inline styles & animations ── */}
      <style>{`
        @keyframes fadeInUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
        @keyframes shimmer   { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
        @keyframes pulse-ring { 0%,100% { box-shadow:0 0 0 0 rgba(37,99,235,0.2); } 50% { box-shadow:0 0 0 8px rgba(37,99,235,0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .rpt-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .rpt-card:hover { transform: translateY(-5px); border-color: ${D.borderHi} !important; box-shadow: 0 20px 50px rgba(0,0,0,0.3) !important; }
        .rpt-tab { transition: all 0.22s cubic-bezier(0.4,0,0.2,1); }
        .rpt-tab:hover { transform: translateY(-1px); }
        .rpt-btn { transition: all 0.18s ease; }
        .rpt-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .rpt-row { transition: background 0.18s ease; }
        .rpt-row:hover { background: ${isDark ? 'rgba(37,99,235,0.06)' : 'rgba(29,78,216,0.04)'} !important; }
        .palette-chip { transition: all 0.18s ease; }
        .palette-chip:hover { transform: scale(1.06); box-shadow: 0 6px 16px rgba(0,0,0,0.18); }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease; backdrop-filter:blur(4px); }
        .modal-box { background:${D.surface}; border-radius:24px; border:1.5px solid ${D.border}; width:100%; max-width:860px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; animation:fadeInUp 0.25s ease; box-shadow:0 40px 100px rgba(0,0,0,0.5); }
        .reports-hero { background: ${isDark ? 'linear-gradient(135deg,#030712 0%,#0a1628 30%,#0f2345 60%,var(--primary-dark) 85%,var(--primary) 100%)' : 'linear-gradient(135deg,var(--primary-dark) 0%,var(--primary) 45%,var(--primary-light) 100%)'}; border: 1px solid var(--border-strong); box-shadow:${isDark ? '0 20px 60px rgba(0,0,0,0.7),0 0 80px var(--primary-glow),inset 0 1px 0 rgba(255,255,255,0.04)' : '0 16px 48px rgba(0,0,0,0.15), 0 8px 32px var(--primary-glow)'}; }
        input[type='date']::-webkit-calendar-picker-indicator { filter: ${isDark ? 'invert(1) opacity(0.5)' : 'opacity(0.6)'}; cursor:pointer; }
      `}</style>

      {/* ── Preview Modal ── */}
      {previewModal.open && (
        <div className="modal-overlay" onClick={closePrevModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{
              padding: '22px 28px', borderBottom: `1px solid ${D.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: D.surfaceHi, flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: D.indigoDim, color: D.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Data Preview</div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 2 }}>{previewModal.title}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {!previewModal.loading && !previewModal.error && (
                  <>
                    <button
                      onClick={() => { closePrevModal(); handleGenerate(previewModal.reportId) }}
                      disabled={generating !== null}
                      className="rpt-btn"
                      style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: D.indigo, color: '#fff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={14} /> PDF
                    </button>
                    <button
                      onClick={() => { closePrevModal(); handleGenerateExcel(previewModal.reportId) }}
                      disabled={generating !== null}
                      className="rpt-btn"
                      style={{ padding: '9px 18px', borderRadius: 10, border: `1.5px solid ${D.green}40`, background: D.greenDim, color: D.green, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <FileSpreadsheet size={14} /> Excel
                    </button>
                  </>
                )}
                <button onClick={closePrevModal} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${D.border}`, background: D.bg, color: D.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {previewModal.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${D.indigoDim}`, borderTopColor: D.indigo, animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ color: D.textSub, fontSize: '0.88rem', margin: 0 }}>Loading preview data…</p>
                </div>
              ) : previewModal.error ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 12 }}>
                  <AlertCircle size={40} style={{ color: D.red }} />
                  <p style={{ color: D.red, fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>{previewModal.error}</p>
                </div>
              ) : previewModal.rows.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 12 }}>
                  <Database size={40} style={{ color: D.textFaint }} />
                  <p style={{ color: D.textSub, fontSize: '0.88rem', margin: 0 }}>No data available for preview.</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 24px 8px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi }}>
                    <span style={{ fontSize: '0.75rem', color: D.textSub, fontWeight: 700 }}>
                      Showing first <strong style={{ color: D.text }}>{previewModal.rows.length}</strong> rows — download for complete dataset
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                      <thead>
                        <tr style={{ background: D.surfaceHi }}>
                          {previewModal.columns.map(col => (
                            <th key={col} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 800, color: D.textSub, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1.5px solid ${D.border}`, whiteSpace: 'nowrap' }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewModal.rows.map((row, ri) => (
                          <tr key={ri} style={{ borderBottom: `1px solid ${D.border}`, background: ri % 2 === 0 ? 'transparent' : D.surfaceHi + '60' }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding: '11px 18px', color: ci === 0 ? D.text : D.textSub, fontWeight: ci === 0 ? 700 : 500, whiteSpace: 'nowrap' }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Reports & Analytics" subtitle="Dashboard / Reports" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ padding: '28px 32px' }}>

          {/* ═══ Hero Banner ═══════════════════════════════════════════════ */}
          <div className="reports-hero" style={{
            borderRadius: 24, padding: '36px 44px', marginBottom: 32,
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 24, animation: 'fadeInUp 0.4s ease'
          }}>
            {/* Decorative orbs */}
            {[['top', '-40px', '240px', '240px', 'rgba(99,179,237,0.06)'],
              ['bottom', 'auto', '-30px', '180px', 'rgba(255,255,255,0.03)'],
              ['top',    '40%',  '70%',  '120px', 'rgba(255,255,255,0.025)']
            ].map(([yKey, yVal, xVal, size, bg], i) => (
              <div key={i} style={{
                position: 'absolute', [yKey]: yVal, left: xVal, width: size, height: size,
                borderRadius: '50%', background: bg, filter: 'blur(30px)', pointerEvents: 'none'
              }} />
            ))}
            {/* Grid pattern */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)',
              backgroundSize: '40px 40px'
            }} />

            {/* Left: title block */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 22, flex: 1, minWidth: 260 }}>
              <div style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 20, width: 72, height: 72,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)', flexShrink: 0
              }}>
                <BarChart2 size={36} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.15 }}>
                  Reports & Analytics
                </h1>
                <p style={{ margin: '7px 0 0', color: '#93c5fd', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.5 }}>
                  Generate comprehensive exports, track efficiency, and analyze operational costs.
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  {[
                    { label: `${reportTypes.length} reports`, color: '#60a5fa' },
                    { label: userRole, color: '#34d399' },
                    { label: liveStats.loading ? 'Loading…' : `${liveStats.vehicles} vehicles`, color: '#fbbf24' },
                  ].map(b => (
                    <span key={b.label} style={{
                      padding: '4px 12px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.1)', color: b.color,
                      fontSize: '0.73rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)'
                    }}>{b.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Quick refresh */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
              <button
                onClick={fetchLiveStats}
                disabled={liveStats.loading}
                className="rpt-btn"
                style={{
                  padding: '11px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700,
                  fontSize: '0.82rem', cursor: liveStats.loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)',
                }}
              >
                <RefreshCw size={15} style={liveStats.loading ? { animation: 'spin 1s linear infinite' } : {}} />
                {liveStats.loading ? 'Refreshing…' : 'Refresh Data'}
              </button>
              <span style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                Live data from backend APIs
              </span>
            </div>
          </div>

          {/* ═══ Alert Messages ════════════════════════════════════════════ */}
          {successMsg && (
            <div style={{ padding: '14px 20px', borderRadius: 14, background: D.greenDim, color: D.green, border: `1.5px solid ${D.green}30`, marginBottom: 24, fontSize: '0.87rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeInUp 0.3s ease', boxShadow: `0 4px 20px ${D.greenDim}` }}>
              <CheckCircle size={17} /> {successMsg}
              <button onClick={() => setSuccessMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: D.green, cursor: 'pointer' }}><X size={14} /></button>
            </div>
          )}
          {error && (
            <div style={{ padding: '14px 20px', borderRadius: 14, background: D.redDim, color: D.red, border: `1.5px solid ${D.red}30`, marginBottom: 24, fontSize: '0.87rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeInUp 0.3s ease', boxShadow: `0 4px 20px ${D.redDim}` }}>
              <AlertCircle size={17} /> {error}
              <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: D.red, cursor: 'pointer' }}><X size={14} /></button>
            </div>
          )}

          {/* ═══ Live Stats Grid ═══════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 18, marginBottom: 32 }}>
            {statsConfig.map((s, idx) => (
              <div key={s.label} style={{
                background: D.surface, borderRadius: 18,
                border: `1.5px solid ${D.border}`, padding: '20px 22px',
                animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 14px rgba(29,78,216,0.04)',
                transition: 'all 0.25s ease', cursor: 'default'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = s.colorHex + '50' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '0.68rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: '1.55rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.1 }}>
                      {liveStats.loading && (s.label === 'Total Vehicles' || s.label === 'Fuel Log Entries' || s.label === 'Service Records' || s.label === 'System Users') ? (
                        <span style={{ fontSize: '1rem', color: D.textFaint }}>Loading…</span>
                      ) : s.value}
                    </p>
                  </div>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: s.colorDim, color: s.colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.colorHex}20`, boxShadow: `0 4px 10px ${s.colorDim}`, flexShrink: 0 }}>
                    {s.icon}
                  </div>
                </div>
                <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: D.surfaceHi, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '65%', background: `linear-gradient(90deg, ${s.colorHex}, ${s.colorDim})`, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>

          {/* ═══ Config Panel ══════════════════════════════════════════════ */}
          <div style={{
            background: D.surface, borderRadius: 22, border: `1.5px solid ${D.border}`,
            padding: '24px 32px', marginBottom: 36,
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 25px rgba(29,78,216,0.04)',
            animation: 'fadeInUp 0.4s ease 0.15s both'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 32 }}>

              {/* Export format */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Download size={16} style={{ color: D.indigo }} />
                  <span style={{ fontWeight: 800, color: D.text, fontSize: '0.88rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Export Format</span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.73rem', color: D.textSub }}>Choose which format(s) to download when clicking a report card</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { id: 'pdf',   icon: <FileText size={14} />,        label: 'PDF Only',   color: D.red    },
                    { id: 'excel', icon: <FileSpreadsheet size={14} />, label: 'Excel Only', color: D.green  },
                    { id: 'both',  icon: <Download size={14} />,        label: 'Both',       color: D.indigo },
                  ].map(f => {
                    const sel = formatPref === f.id
                    return (
                      <button key={f.id} onClick={() => setFormatPref(f.id)} className="palette-chip"
                        style={{
                          padding: '8px 14px', borderRadius: 10,
                          border: sel ? `2px solid ${f.color}` : `1.5px solid ${D.border}`,
                          background: sel ? `${f.color}18` : D.bg,
                          color: sel ? f.color : D.textSub,
                          fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, outline: 'none',
                          boxShadow: sel ? `0 4px 14px ${f.color}20` : 'none',
                        }}>{f.icon} {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* PDF palette */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Palette size={16} style={{ color: D.indigo }} />
                  <span style={{ fontWeight: 800, color: D.text, fontSize: '0.88rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>PDF Color Scheme</span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.73rem', color: D.textSub }}>Branding color applied to generated PDF table headers</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { id: 'indigo',   name: 'Royal Blue', color: '#2563eb' },
                    { id: 'emerald',  name: 'Emerald',    color: '#059669' },
                    { id: 'crimson',  name: 'Crimson',    color: '#dc2626' },
                    { id: 'charcoal', name: 'Charcoal',   color: '#4b5563' },
                  ].map(t => {
                    const sel = pdfTheme === t.id
                    return (
                      <button key={t.id} onClick={() => setPdfTheme(t.id)} className="palette-chip"
                        style={{
                          padding: '8px 14px', borderRadius: 10,
                          border: sel ? `2.5px solid ${t.color}` : `1.5px solid ${D.border}`,
                          background: sel ? `${t.color}18` : D.bg,
                          color: sel ? t.color : D.textSub,
                          fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 7, outline: 'none',
                          boxShadow: sel ? `0 4px 14px ${t.color}20` : 'none',
                        }}
                      >
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date filter */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Sliders size={16} style={{ color: D.indigo }} />
                  <span style={{ fontWeight: 800, color: D.text, fontSize: '0.88rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Date Range Filter</span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.73rem', color: D.textSub }}>Applied to fuel and maintenance reports</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = D.indigo; e.target.style.boxShadow = `0 0 0 3px ${D.indigoDim}` }}
                    onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                  />
                  <span style={{ color: D.textSub, fontSize: '0.8rem', fontWeight: 600 }}>—</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = D.indigo; e.target.style.boxShadow = `0 0 0 3px ${D.indigoDim}` }}
                    onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                  />
                  {(startDate || endDate) && (
                    <button onClick={() => { setStartDate(''); setEndDate('') }} className="rpt-btn"
                      style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Report Cards Section ══════════════════════════════════════ */}
          <SectionHeader
            title="Available Reports Directory"
            D={D}
            icon={<ClipboardList size={20} />}
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setViewMode('grid')} style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${viewMode === 'grid' ? D.indigo : D.border}`, background: viewMode === 'grid' ? D.indigoDim : 'transparent', color: viewMode === 'grid' ? D.indigo : D.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LayoutGrid size={15} />
                </button>
                <button onClick={() => setViewMode('list')} style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${viewMode === 'list' ? D.indigo : D.border}`, background: viewMode === 'list' ? D.indigoDim : 'transparent', color: viewMode === 'list' ? D.indigo : D.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <List size={15} />
                </button>
              </div>
            }
          />

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, marginBottom: 28, borderBottom: `1.5px solid ${D.border}`, scrollbarWidth: 'none' }}>
            {categoryList.map(cat => {
              const isActive = activeCategory === cat
              const count = cat === 'All' ? reportTypes.length : (countByCategory[cat] || 0)
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} className="rpt-tab"
                  style={{
                    padding: '7px 16px', borderRadius: 20, whiteSpace: 'nowrap',
                    background: isActive ? `linear-gradient(135deg,${D.indigo},${D.purple})` : D.surface,
                    color: isActive ? '#fff' : D.textSub, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                    border: `1.5px solid ${isActive ? 'transparent' : D.border}`, outline: 'none',
                    boxShadow: isActive ? `0 6px 16px ${D.indigoDim}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.color = D.text } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = D.surface; e.currentTarget.style.color = D.textSub } }}
                >
                  {cat}
                  <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : D.bg, borderRadius: 10, padding: '1px 7px', fontSize: '0.66rem', fontWeight: 800, color: isActive ? '#fff' : D.textFaint }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Grid view ── */}
          {viewMode === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 22, marginBottom: 44 }}>
              {visibleReportTypes.map((r, idx) => {
                const badge = getDataBadge(r.id)
                const isGen = generating === r.id
                return (
                  <div key={r.id} className="rpt-card"
                    style={{
                      background: D.surface, borderRadius: 20, border: `1.5px solid ${D.border}`,
                      padding: '26px', display: 'flex', flexDirection: 'column',
                      position: 'relative', overflow: 'hidden',
                      boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 8px 24px rgba(29,78,216,0.05)',
                      animation: `fadeInUp 0.4s ease ${idx * 0.04}s both`,
                    }}
                  >
                    {/* Glow blob */}
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: r.bg, filter: 'blur(22px)', opacity: 0.9, pointerEvents: 'none' }} />
                    {/* Generating overlay shimmer */}
                    {isGen && (
                      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,transparent,${D.surfaceHi}80,transparent)`, animation: 'shimmer 1.2s infinite', zIndex: 0 }} />
                    )}

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
                      <div style={{ width: 50, height: 50, borderRadius: 14, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${r.color}25`, boxShadow: `0 4px 14px ${r.bg}` }}>
                        {r.icon}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                        <span style={{ background: r.bg, color: r.color, fontSize: '0.64rem', fontWeight: 800, padding: '3px 10px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.07em', border: `1px solid ${r.color}20` }}>
                          {r.category}
                        </span>
                        {badge && (
                          <span style={{ background: D.surfaceHi, color: D.textSub, fontSize: '0.64rem', fontWeight: 700, padding: '3px 9px', borderRadius: 7, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Activity size={9} /> {badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: D.text, fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif", position: 'relative' }}>{r.title}</h3>
                    <p style={{ margin: '0 0 22px', fontSize: '0.82rem', color: D.textSub, lineHeight: 1.55, flex: 1, position: 'relative' }}>{r.desc}</p>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', position: 'relative' }}>
                      {/* Main download */}
                      <button
                        onClick={() => handleDownload(r.id)}
                        disabled={generating !== null}
                        className="rpt-btn"
                        style={{
                          flex: 2, padding: '10px 12px', borderRadius: 11, border: 'none',
                          background: isGen ? D.surfaceHi : r.color,
                          color: isGen ? r.color : '#fff',
                          fontSize: '0.78rem', fontWeight: 800,
                          cursor: generating !== null ? 'not-allowed' : 'pointer',
                          boxShadow: isGen ? 'none' : `0 4px 14px ${r.bg}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, outline: 'none',
                          opacity: generating !== null && !isGen ? 0.5 : 1,
                        }}
                      >
                        {isGen ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Download size={13} /> {formatPref === 'pdf' ? 'PDF' : formatPref === 'excel' ? 'Excel' : 'Download'}</>}
                      </button>

                      {/* Preview button */}
                      <button
                        onClick={() => handlePreview(r.id)}
                        disabled={generating !== null}
                        className="rpt-btn"
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 11,
                          border: `1.5px solid ${r.color}35`, background: r.bg, color: r.color,
                          fontSize: '0.78rem', fontWeight: 800,
                          cursor: generating !== null ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, outline: 'none',
                          opacity: generating !== null ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (generating === null) { e.currentTarget.style.background = r.color; e.currentTarget.style.color = '#fff' } }}
                        onMouseLeave={e => { if (generating === null) { e.currentTarget.style.background = r.bg; e.currentTarget.style.color = r.color } }}
                      >
                        <Eye size={13} /> Preview
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── List view ── */}
          {viewMode === 'list' && (
            <div style={{ background: D.surface, borderRadius: 20, border: `1.5px solid ${D.border}`, overflow: 'hidden', marginBottom: 44, boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 8px 24px rgba(29,78,216,0.05)', animation: 'fadeInUp 0.35s ease' }}>
              {visibleReportTypes.map((r, idx) => {
                const badge = getDataBadge(r.id)
                const isGen = generating === r.id
                return (
                  <div key={r.id} className="rpt-row"
                    style={{
                      padding: '18px 24px', borderBottom: idx < visibleReportTypes.length - 1 ? `1px solid ${D.border}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 18, background: 'transparent'
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${r.color}25`, flexShrink: 0, boxShadow: `0 4px 10px ${r.bg}` }}>
                      {r.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 800, color: D.text, fontSize: '0.9rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{r.title}</span>
                        <span style={{ background: r.bg, color: r.color, fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.category}</span>
                        {badge && <span style={{ background: D.surfaceHi, color: D.textSub, fontSize: '0.63rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 3 }}><Activity size={8} /> {badge}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.79rem', color: D.textSub, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handlePreview(r.id)} disabled={generating !== null} className="rpt-btn"
                        style={{ padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${D.border}`, background: D.bg, color: D.textSub, fontSize: '0.76rem', fontWeight: 700, cursor: generating !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, outline: 'none', opacity: generating !== null ? 0.5 : 1 }}
                        onMouseEnter={e => { if (generating === null) { e.currentTarget.style.borderColor = D.indigo; e.currentTarget.style.color = D.indigo; e.currentTarget.style.background = D.indigoDim } }}
                        onMouseLeave={e => { if (generating === null) { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub; e.currentTarget.style.background = D.bg } }}
                      >
                        <Eye size={13} /> Preview
                      </button>
                      <button
                        onClick={() => handleDownload(r.id)} disabled={generating !== null} className="rpt-btn"
                        style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: isGen ? D.surfaceHi : r.color, color: isGen ? r.color : '#fff', fontSize: '0.76rem', fontWeight: 800, cursor: generating !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, outline: 'none', opacity: generating !== null && !isGen ? 0.5 : 1, boxShadow: isGen ? 'none' : `0 4px 12px ${r.bg}` }}
                      >
                        {isGen ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Download size={12} /> Download</>}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ═══ Recent Downloads Section ══════════════════════════════════ */}
          <SectionHeader title="Recent Download History" D={D} icon={<Clock size={20} />} />

          {/* Format ratio badges */}
          {reportsList.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, marginTop: -10, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { label: 'All Downloads', val: 'all', count: reportsList.length, color: D.indigo, dim: D.indigoDim },
                { label: 'PDF',           val: 'PDF',  count: pdfCount,           color: D.red,    dim: D.redDim    },
                { label: 'Excel',         val: 'Excel', count: excelCount,         color: D.green,  dim: D.greenDim  },
              ].map(f => {
                const sel = recentFmtFilter === f.val
                return (
                  <button key={f.val} onClick={() => setRecentFmtFilter(f.val)} className="rpt-tab"
                    style={{ padding: '6px 14px', borderRadius: 18, border: `1.5px solid ${sel ? f.color : D.border}`, background: sel ? f.dim : 'transparent', color: sel ? f.color : D.textSub, fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {f.label}
                    <span style={{ background: sel ? f.color : D.surfaceHi, color: sel ? '#fff' : D.textFaint, borderRadius: 10, padding: '1px 7px', fontSize: '0.66rem', fontWeight: 800 }}>{f.count}</span>
                  </button>
                )
              })}
              <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: D.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={12} /> {pdfCount} PDF · <FileSpreadsheet size={12} /> {excelCount} Excel
              </span>
            </div>
          )}

          {/* Table card */}
          <div style={{
            background: D.surface, borderRadius: 22, border: `1.5px solid ${D.border}`,
            overflow: 'hidden', boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.25)' : '0 10px 25px rgba(29,78,216,0.03)',
            marginBottom: 20, animation: 'fadeInUp 0.4s ease 0.2s both'
          }}>
            {/* Search bar */}
            <div style={{ padding: '14px 22px', borderBottom: `1px solid ${D.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: D.surfaceHi }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: D.textSub, pointerEvents: 'none' }} />
                <input type="text" placeholder="Search report downloads…" value={recentSearch}
                  onChange={e => setRecentSearch(e.target.value)}
                  style={{ ...inputStyle, width: '100%', paddingLeft: 36, boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = D.indigo; e.target.style.boxShadow = `0 0 0 3px ${D.indigoDim}` }}
                  onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                />
              </div>
              {recentSearch && (
                <button onClick={() => setRecentSearch('')} className="rpt-btn"
                  style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <X size={13} /> Clear
                </button>
              )}
              {reportsList.length > 0 && (
                <button onClick={handleClearAllRecent} className="rpt-btn"
                  style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${D.red}30`, background: 'transparent', color: D.red, fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  onMouseEnter={e => e.currentTarget.style.background = D.redDim}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Clear History
                </button>
              )}
            </div>

            {/* Status bar */}
            <div style={{ padding: '8px 22px', fontSize: '0.73rem', color: D.textSub, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi + 'aa', fontWeight: 600 }}>
              <span>Showing <strong style={{ color: D.text }}>{filteredRecentReports.length}</strong> of <strong style={{ color: D.text }}>{reportsList.length}</strong> records</span>
              {recentSearch && <span style={{ color: D.indigo, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: D.indigo, display: 'inline-block' }} /> Filtered</span>}
            </div>

            {/* Empty state */}
            {filteredRecentReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `1px solid ${D.border}` }}>
                  <FileText size={28} style={{ color: D.textFaint }} />
                </div>
                <p style={{ margin: 0, color: D.textSub, fontSize: '0.9rem', fontWeight: 600 }}>
                  {recentSearch ? `No downloads match "${recentSearch}"` : 'No recent downloads yet'}
                </p>
                <p style={{ margin: '6px 0 0', color: D.textFaint, fontSize: '0.78rem' }}>Generate a report above to see it listed here</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead style={{ background: D.surfaceHi }}>
                    <tr>
                      {['Report File Name', 'Generated', 'Format', 'Size', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 20px', fontWeight: 800, color: D.textSub, fontSize: '0.69rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentReports.map((r, i) => (
                      <tr key={r.name} className="rpt-row" style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : D.surfaceHi + '50' }}>
                        <td style={{ padding: '13px 20px', fontWeight: 700, color: D.text }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            {r.format === 'PDF'
                              ? <FileText size={15} style={{ color: D.red, flexShrink: 0 }} />
                              : <FileSpreadsheet size={15} style={{ color: D.green, flexShrink: 0 }} />
                            }
                            <span style={{ fontSize: '0.83rem' }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '13px 20px', color: D.textSub, fontWeight: 500 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem' }}>{r.generated}</span>
                            <span style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: 2 }}>{getTimeAgo(r.generated)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '13px 20px' }}>
                          <span style={{
                            background: r.format === 'PDF' ? D.redDim : D.greenDim,
                            color: r.format === 'PDF' ? D.red : D.green,
                            border: `1px solid ${r.format === 'PDF' ? D.red : D.green}25`,
                            padding: '3px 10px', borderRadius: 7, fontSize: '0.7rem', fontWeight: 800
                          }}>{r.format}</span>
                        </td>
                        <td style={{ padding: '13px 20px', color: D.textSub, fontWeight: 500, fontSize: '0.82rem' }}>{r.size}</td>
                        <td style={{ padding: '13px 20px' }}>
                          <div style={{ display: 'flex', gap: 7 }}>
                            <button onClick={() => handleRedownload(r.name, r.format)} disabled={generating !== null} className="rpt-btn"
                              style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${D.border}`, background: D.surface, color: D.text, fontSize: '0.73rem', cursor: generating !== null ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, outline: 'none' }}
                              onMouseEnter={e => { if (generating === null) { e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.borderColor = D.indigo; e.currentTarget.style.color = D.indigo } }}
                              onMouseLeave={e => { if (generating === null) { e.currentTarget.style.background = D.surface; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text } }}
                            >
                              <Download size={11} /> Re-download
                            </button>
                            <button onClick={() => handleDeleteRecent(r.name)} className="rpt-btn"
                              style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid transparent', background: D.redDim, color: D.red, fontSize: '0.73rem', cursor: 'pointer', fontWeight: 700, outline: 'none' }}
                              onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default ReportsPage
