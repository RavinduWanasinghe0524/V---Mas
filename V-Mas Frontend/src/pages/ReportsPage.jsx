import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD, useTheme } from '../context/ThemeContext'
import {
  Car, Fuel, Wrench, Users, DollarSign,
  FileText, Calendar, Download, ClipboardList, BarChart2, Loader2, Database, TrendingUp,
  AlertCircle, CheckCircle, X, Search, Sliders, Palette
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { vehicleAPI, fuelAPI, serviceAPI, userAPI } from '../services/api'
import { generateStyledExcel } from '../utils/excelExport'

const recentReports = [
  { name: 'Vehicle-Summary-May-2026.pdf',   generated: '2026-05-20', format: 'PDF',  size: '245 KB' },
  { name: 'Fuel-Consumption-Apr-2026.xlsx',  generated: '2026-05-01', format: 'Excel', size: '118 KB' },
  { name: 'User-Activity-Q2-2026.pdf',      generated: '2026-05-15', format: 'PDF',  size: '312 KB' },
  { name: 'Service-Summary-Apr-2026.pdf',   generated: '2026-05-02', format: 'PDF',  size: '198 KB' },
]

const SectionHeader = ({ title, D, icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, marginTop: 16 }}>
    {icon && <div style={{ color: D.indigo, display: 'flex', alignItems: 'center' }}>{icon}</div>}
    <h2 style={{ margin: 0, fontSize: '1.25rem', color: D.text, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{title}</h2>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
  </div>
)

const ReportsPage = () => {
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'
  const reportTypes = [
    { id: 'master-report',      icon: <Database size={22} strokeWidth={1.5} />,    title: 'Comprehensive Master Report',   desc: 'Complete export of all system data including vehicles, fuel, services, and users.',    category: 'System',      color: D.red,    bg: D.redDim    },
    { id: 'vehicle-summary',    icon: <Car size={22} strokeWidth={1.5} />,         title: 'Vehicle Summary Report',        desc: 'Overview of all fleet vehicles including status, mileage, and assignments.',           category: 'Fleet',       color: D.indigo, bg: D.indigoDim },
    { id: 'fuel-report',        icon: <Fuel size={22} strokeWidth={1.5} />,        title: 'Fuel Consumption Report',       desc: 'Detailed fuel usage breakdown per vehicle, driver, and time period.',                   category: 'Fuel',        color: D.gold,   bg: D.goldDim   },
    { id: 'fuel-efficiency',    icon: <TrendingUp size={22} strokeWidth={1.5} />,  title: 'Fuel Efficiency Report',        desc: 'Computed km/L efficiency per vehicle by comparing fill-up records with distance covered.', category: 'Fuel',     color: D.teal,   bg: D.tealDim   },
    { id: 'service-report',     icon: <Wrench size={22} strokeWidth={1.5} />,      title: 'Service & Maintenance Report',  desc: 'Summary of all service records, costs, and upcoming maintenance schedules.',            category: 'Maintenance', color: D.green,  bg: D.greenDim  },
    { id: 'user-report',        icon: <Users size={22} strokeWidth={1.5} />,       title: 'User Activity Report',          desc: 'User registration, role distribution, login history, and account statuses.',            category: 'Users',       color: D.orange, bg: D.orangeDim },
    { id: 'cost-report',        icon: <DollarSign size={22} strokeWidth={1.5} />,  title: 'Cost Analysis Report',          desc: 'Full cost breakdown including fuel, maintenance, and operational expenses.',             category: 'Finance',     color: D.blue,   bg: D.blueDim   },
  ]
  const [generating, setGenerating] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [recentSearch, setRecentSearch] = useState('')
  const [pdfTheme, setPdfTheme] = useState('indigo')
  const [reportsList, setReportsList] = useState(recentReports)
  const [activeCategory, setActiveCategory] = useState('All')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const pdfThemeColors = {
    indigo: { primary: [37, 99, 235] },
    emerald: { primary: [5, 150, 105] },
    crimson: { primary: [220, 38, 38] },
    charcoal: { primary: [55, 65, 81] }
  }

  const filteredRecentReports = reportsList.filter(r =>
    r.name.toLowerCase().includes(recentSearch.toLowerCase()) ||
    r.format.toLowerCase().includes(recentSearch.toLowerCase())
  )

  const handleGenerate = async (id) => {
    setError('')
    setSuccessMsg('')
    setGenerating(id)
    try {
      const themeColors = pdfThemeColors[pdfTheme] || pdfThemeColors.indigo
      const headerColor = themeColors.primary
      const doc = new jsPDF()

      const addHeader = (title) => {
        doc.setFontSize(20)
        doc.setTextColor(40, 40, 40)
        doc.text(title, 14, 22)
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)
      }

      const addPageFooters = () => {
        const totalPages = doc.internal.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i)
          const pageWidth = doc.internal.pageSize.getWidth()
          const pageHeight = doc.internal.pageSize.getHeight()
          doc.setFontSize(8)
          doc.setTextColor(150)
          doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
          doc.text('V-Mas Fleet Management System', 14, pageHeight - 10)
          doc.text(new Date().toLocaleDateString(), pageWidth - 14, pageHeight - 10, { align: 'right' })
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
        const tableData = vehData.map(v => [
          v.registrationNo || 'N/A',
          v.manufacturer || 'N/A',
          v.model || 'N/A',
          v.status || 'N/A',
          v.currentMileageKm != null ? `${v.currentMileageKm} km` : '0 km',
          v.fuelType || 'N/A',
          v.fuelCapacity != null ? `${v.fuelCapacity} L` : '0 L'
        ])
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Reg No', 'Manufacturer', 'Model', 'Status', 'Mileage', 'Fuel Type', 'Capacity']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: headerColor }
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
        if (startDate) {
          filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) >= new Date(startDate))
        }
        if (endDate) {
          filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) <= new Date(endDate))
        }
        const tableData = filteredFuel.map(f => [
          f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
          f.vehicleRegNumber || 'N/A',
          f.driverUsername || 'N/A',
          f.fuelType || 'N/A',
          f.liters != null ? `${f.liters} L` : '0 L',
          f.totalCost != null ? `Rs. ${Number(f.totalCost).toLocaleString()}` : 'Rs. 0'
        ])
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Date', 'Vehicle', 'Driver', 'Type', 'Liters', 'Total Cost']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: headerColor }
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
        if (startDate) {
          filteredServices = filteredServices.filter(s => s.serviceDate && new Date(s.serviceDate) >= new Date(startDate))
        }
        if (endDate) {
          filteredServices = filteredServices.filter(s => s.serviceDate && new Date(s.serviceDate) <= new Date(endDate))
        }
        const tableData = filteredServices.map(s => [
          s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : 'N/A',
          s.vehicleRegNumber || 'N/A',
          s.serviceType ? String(s.serviceType).replace(/_/g, ' ') : 'N/A',
          s.serviceClassification || 'N/A',
          s.serviceCost != null ? `Rs. ${Number(s.serviceCost).toLocaleString()}` : 'Rs. 0'
        ])
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Date', 'Vehicle Reg', 'Service Type', 'Classification', 'Cost']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: headerColor }
        })
      }

      if (id === 'user-report' || id === 'master-report') {
        if (id === 'user-report') addHeader('User Activity Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.text('User Directory', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: usrRes } = await userAPI.getAllUsers()
        const tableData = (usrRes.data || []).map(u => [
          u.userName || 'N/A',
          u.email || 'N/A',
          u.role || 'N/A',
          u.accountStatus || 'ACTIVE'
        ])
        autoTable(doc, {
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Username', 'Email', 'Role', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: headerColor }
        })
      }

      if (id === 'fuel-efficiency' || id === 'master-report') {
        if (id === 'fuel-efficiency') addHeader('Fuel Efficiency Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.setTextColor(40, 40, 40)
          doc.text('Fuel Efficiency', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: effApiRes } = await fuelAPI.getFuelEfficiencyReport()
        const report = effApiRes.data || effApiRes

        // ── Fleet Summary block ──────────────────────────────────────────────
        let y = id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 25 : 50) : 38
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text('Fleet Summary', 14, y); y += 7

        const summaryItems = [
          ['Fleet Average Efficiency', report.fleetAverageEfficiency != null ? `${Number(report.fleetAverageEfficiency).toFixed(2)} km/L` : 'Insufficient Data'],
          ['Total Vehicles',           String(report.totalVehicles ?? 0)],
          ['Good Efficiency (≥10 km/L)', String(report.goodEfficiencyCount ?? 0)],
          ['Moderate (5–9.99 km/L)',   String(report.moderateEfficiencyCount ?? 0)],
          ['Low Efficiency (<5 km/L)', String(report.lowEfficiencyCount ?? 0)],
        ]
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: summaryItems,
          theme: 'grid',
          headStyles: { fillColor: headerColor },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { cellWidth: 60 } },
          margin: { left: 14, right: 14 },
        })

        // ── Per-vehicle table ────────────────────────────────────────────────
        const afterSummary = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 40
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text('Per-Vehicle Efficiency Breakdown', 14, afterSummary)

        const vehicles = report.vehicles || []
        const vehicleRows = vehicles.map(v => [
          v.vehicleRegNumber || 'N/A',
          v.latestEfficiency    != null ? `${Number(v.latestEfficiency).toFixed(2)} km/L`    : 'N/A',
          v.averageEfficiency   != null ? `${Number(v.averageEfficiency).toFixed(2)} km/L`   : 'N/A',
          v.efficiencyStatus    || 'N/A',
          v.totalLiters         != null ? `${Number(v.totalLiters).toFixed(1)} L`            : 'N/A',
          v.totalCost           != null ? `Rs. ${Number(v.totalCost).toLocaleString()}` : 'N/A',
          v.costPerKm           != null ? `Rs. ${Number(v.costPerKm).toFixed(2)}/km`         : 'N/A',
          v.fillUps             != null ? String(v.fillUps.length)         : '0',
        ])

        autoTable(doc, {
          startY: afterSummary + 5,
          head: [['Reg No', 'Latest km/L', 'Avg km/L', 'Status', 'Total Liters', 'Total Cost', 'Cost/km', 'Fill-ups']],
          body: vehicleRows,
          theme: 'striped',
          headStyles: { fillColor: headerColor, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
              const status = data.cell.raw
              if (status === 'Low Efficiency') data.cell.styles.textColor = [220, 38, 38]
              else if (status === 'Moderate')  data.cell.styles.textColor = [180, 120, 0]
              else if (status === 'Good')      data.cell.styles.textColor = [5, 150, 105]
            }
          }
        })
      }

      if (id === 'cost-report' || id === 'master-report') {
        if (id === 'cost-report') addHeader('Cost Analysis Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.setTextColor(40, 40, 40)
          doc.text('Cost Analysis', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data: fuelLogsApiRes } = await fuelAPI.getAllFuelLogs()
        const { data: servicesApiRes } = await serviceAPI.getAllServices()

        let fuelLogs = fuelLogsApiRes.data || []
        let services = servicesApiRes.data || []
        if (startDate) {
          fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) >= new Date(startDate))
          services = services.filter(s => s.serviceDate && new Date(s.serviceDate) >= new Date(startDate))
        }
        if (endDate) {
          fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) <= new Date(endDate))
          services = services.filter(s => s.serviceDate && new Date(s.serviceDate) <= new Date(endDate))
        }

        const totalFuelCost = fuelLogs.reduce((sum, f) => sum + (Number(f.totalCost) || 0), 0)
        const totalServiceCost = services.reduce((sum, s) => sum + (Number(s.serviceCost) || 0), 0)
        const grandTotal = totalFuelCost + totalServiceCost

        let y = id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 25 : 50) : 38
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text('Operational Expenses Summary', 14, y); y += 7

        const summaryItems = [
          ['Total Fuel Expenses', `Rs. ${totalFuelCost.toLocaleString()}`],
          ['Total Maintenance / Service Expenses', `Rs. ${totalServiceCost.toLocaleString()}`],
          ['Total Fleet Operational Expenses', `Rs. ${grandTotal.toLocaleString()}`],
        ]

        autoTable(doc, {
          startY: y,
          head: [['Cost Category', 'Amount']],
          body: summaryItems,
          theme: 'grid',
          headStyles: { fillColor: headerColor },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { cellWidth: 50 } },
          margin: { left: 14, right: 14 },
        })

        const afterSummary = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 35
        
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text('Fuel Expenditure Breakdown (Top 5 Transactions)', 14, afterSummary)

        const topFuelRows = [...fuelLogs]
          .sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0))
          .slice(0, 5)
          .map(f => [
            f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
            f.vehicleRegNumber || 'N/A',
            f.driverUsername || 'N/A',
            f.liters ? `${Number(f.liters).toFixed(1)} L` : '0 L',
            f.totalCost != null ? `Rs. ${Number(f.totalCost).toLocaleString()}` : 'Rs. 0'
          ])

        autoTable(doc, {
          startY: afterSummary + 5,
          head: [['Date', 'Vehicle', 'Driver', 'Volume', 'Cost']],
          body: topFuelRows,
          theme: 'striped',
          headStyles: { fillColor: headerColor, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        })

        const afterFuel = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : afterSummary + 50

        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text('Maintenance Expenditure Breakdown (Top 5 Transactions)', 14, afterFuel)

        const topServiceRows = [...services]
          .sort((a, b) => (Number(b.serviceCost) || 0) - (Number(a.serviceCost) || 0))
          .slice(0, 5)
          .map(s => [
            s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : 'N/A',
            s.vehicleRegNumber || 'N/A',
            s.serviceType ? String(s.serviceType).replace(/_/g, ' ') : 'N/A',
            s.serviceClassification || 'N/A',
            s.serviceCost != null ? `Rs. ${Number(s.serviceCost).toLocaleString()}` : 'Rs. 0'
          ])

        autoTable(doc, {
          startY: afterFuel + 5,
          head: [['Date', 'Vehicle', 'Service Type', 'Classification', 'Cost']],
          body: topServiceRows,
          theme: 'striped',
          headStyles: { fillColor: headerColor, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        })
      }

      if (id === 'master-report') {
        doc.setPage(1)
        addHeader('Comprehensive Master Report')
      }

      addPageFooters()

      const filename = `${id}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      setSuccessMsg(`Report "${filename}" generated and downloaded successfully.`)
      setTimeout(() => setSuccessMsg(''), 5000)

      const newReport = {
        name: filename,
        generated: new Date().toISOString().split('T')[0],
        format: 'PDF',
        size: id === 'master-report' ? '450 KB' : '120 KB'
      }
      setReportsList(prev => [newReport, ...prev.filter(r => r.name !== filename)])
    } catch (err) {
      console.error('Error generating PDF:', err)
      const reportName = reportTypes.find(r => r.id === id)?.title || id
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError(`Permission denied: You do not have access to generate the "${reportName}" report.`)
      } else if (err.response?.status === 404) {
        setError(`Data not found: The data required for "${reportName}" could not be retrieved from the server.`)
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error: Unable to reach the server. Please check your connection and try again.')
      } else {
        setError(err.message || `Failed to generate "${reportName}". Please try again later.`)
      }
    } finally {
      setGenerating(null)
    }
  }

  const handleGenerateExcel = async (id) => {
    setError('')
    setSuccessMsg('')
    setGenerating(id)
    try {
      let vehicles = []
      let fuelLogs = []
      let services = []
      let users    = []
      let effReport = null

      const needsVehicles    = ['vehicle-summary', 'master-report'].includes(id)
      const needsFuel        = ['fuel-report', 'fuel-efficiency', 'cost-report', 'master-report'].includes(id)
      const needsServices    = ['service-report', 'cost-report', 'master-report'].includes(id)
      const needsUsers       = ['user-report', 'master-report'].includes(id)
      const needsEfficiency  = ['fuel-efficiency', 'master-report'].includes(id)

      const fetches = []
      if (needsVehicles)   fetches.push(vehicleAPI.getAllVehicles().then(r => { vehicles  = r.data?.data || [] }))
      if (needsFuel)       fetches.push(fuelAPI.getAllFuelLogs().then(r   => { fuelLogs  = r.data?.data || [] }))
      if (needsServices)   fetches.push(serviceAPI.getAllServices().then(r => { services  = r.data?.data || [] }))
      if (needsUsers)      fetches.push(userAPI.getAllUsers().then(r      => { users     = r.data?.data || [] }))
      if (needsEfficiency) fetches.push(fuelAPI.getFuelEfficiencyReport().then(r => { effReport = r.data?.data || r.data || null }))

      await Promise.all(fetches)

      const filename = await generateStyledExcel(id, {
        vehicles,
        fuelLogs,
        services,
        users,
        effReport,
        startDate,
        endDate,
      })

      setSuccessMsg(`Excel report "${filename}" generated and downloaded successfully.`)
      setTimeout(() => setSuccessMsg(''), 5000)

      const newReport = {
        name: filename,
        generated: new Date().toISOString().split('T')[0],
        format: 'Excel',
        size: id === 'master-report' ? '420 KB' : '95 KB'
      }
      setReportsList(prev => [newReport, ...prev.filter(r => r.name !== filename)])
    } catch (err) {
      console.error('Error generating Excel report:', err)
      const reportName = reportTypes.find(r => r.id === id)?.title || id
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError(`Permission denied: You do not have access to generate the "${reportName}" Excel report.`)
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error: Unable to reach the server. Please check your connection and try again.')
      } else {
        setError(err.response?.data?.message || `Failed to generate "${reportName}" Excel report. Please try again.`)
      }
    } finally {
      setGenerating(null)
    }
  }

  const handleDeleteRecent = (name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from recent downloads?`)) return
    setReportsList(reportsList.filter(r => r.name !== name))
    setSuccessMsg(`Successfully removed "${name}" from recent reports.`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const handleClearAllRecent = () => {
    if (reportsList.length === 0) return
    if (!window.confirm('Are you sure you want to clear all recent reports history? This cannot be undone.')) return
    setReportsList([])
    setSuccessMsg('Successfully cleared all recent reports history.')
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const handleRedownloadRecent = (name, format) => {
    const matchedType = reportTypes.find(t => name.toLowerCase().startsWith(t.id.toLowerCase()))
    const targetId = matchedType ? matchedType.id : null

    if (!targetId) {
      let fallbackId = 'vehicle-summary'
      if (name.toLowerCase().includes('fuel')) fallbackId = 'fuel-report'
      else if (name.toLowerCase().includes('user')) fallbackId = 'user-report'
      else if (name.toLowerCase().includes('service')) fallbackId = 'service-report'
      
      if (format === 'PDF') {
        handleGenerate(fallbackId)
      } else {
        handleGenerateExcel(fallbackId)
      }
      return
    }

    if (format === 'PDF') {
      handleGenerate(targetId)
    } else {
      handleGenerateExcel(targetId)
    }
  }

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: 10,
    border: `1.5px solid ${D.inputBorder}`,
    fontSize: '0.85rem',
    color: D.text,
    background: D.inputBg,
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  }

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Dynamic inline stylesheets for advanced visual styling */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(37, 99, 235, 0.15); }
          50% { box-shadow: 0 0 30px rgba(37, 99, 235, 0.35); }
        }
        .reports-hero-banner {
          background: ${isDark
            ? 'linear-gradient(135deg, #030712 0%, #0a1628 30%, #0f2345 60%, #1a3a7a 85%, #1e40af 100%)'
            : 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)'};
          border: ${isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(37, 99, 235, 0.2)'};
          box-shadow: ${isDark
            ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 16px 48px rgba(0,0,0,0.4)'};
        }
        .custom-card {
          background: ${D.surface};
          border: 1.5px solid ${D.border};
          box-shadow: ${D.bg === '#f5f5fb' ? '0 10px 30px rgba(29, 78, 216, 0.05)' : '0 10px 30px rgba(0, 0, 0, 0.25)'};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-card:hover {
          transform: translateY(-4px);
          border-color: ${D.borderHi};
          box-shadow: ${D.bg === '#f5f5fb' ? '0 15px 35px rgba(29, 78, 216, 0.1)' : '0 15px 35px rgba(37, 99, 235, 0.12)'};
        }
        .custom-tab {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-tab:hover {
          transform: translateY(-1px);
        }
        .reports-grid-btn {
          transition: all 0.2s ease;
        }
        .reports-grid-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .palette-option {
          transition: all 0.2s ease;
        }
        .palette-option:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .recent-reports-row {
          transition: all 0.2s ease;
        }
        .recent-reports-row:hover {
          background: ${D.bg === '#f5f5fb' ? 'rgba(37, 99, 235, 0.04)' : 'rgba(37, 99, 235, 0.08)'} !important;
        }
      `}</style>

      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Reports & Analytics" subtitle="Dashboard / Reports" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ padding: '32px' }}>

          {/* Hero Banner */}
          <div className="reports-hero-banner" style={{
            borderRadius: 24,
            padding: '38px 44px',
            marginBottom: 32,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
          }}>
            {/* Decorative background visual circles */}
            {[['85%','-30px','200px','rgba(255,255,255,0.03)'],['15%','55%','140px','rgba(255,255,255,0.04)'],['60%','80%','100px','rgba(255,255,255,0.02)']].map(([t,l,s,bg],i) => (
              <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
            ))}
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 280 }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 20,
                width: 68,
                height: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
              }}>
                <BarChart2 size={34} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.9rem',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  Reports and Analytics
                </h1>
                <p style={{ margin: '6px 0 0', color: '#93c5fd', fontSize: '0.92rem', fontWeight: 500 }}>
                  Generate comprehensive exports of system databases, track fleet efficiency, and analyze operational expenditures.
                </p>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {successMsg && (
            <div style={{
              padding: '16px 20px',
              borderRadius: 16,
              background: D.greenDim,
              color: D.green,
              border: `1.5px solid ${D.green}30`,
              marginBottom: 28,
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              animation: 'fadeIn 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
              <CheckCircle size={18} /> {successMsg}
            </div>
          )}
          {error && (
            <div style={{
              padding: '16px 20px',
              borderRadius: 16,
              background: D.redDim,
              color: D.red,
              border: `1.5px solid ${D.red}30`,
              marginBottom: 28,
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              animation: 'fadeIn 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, marginBottom: 36 }}>
            {[
              { label: 'Reports Downloaded', value: (reportsList.length + 38).toString(), icon: <FileText size={22} strokeWidth={1.5} />, colorDim: D.tealDim, colorHex: D.teal },
              { label: 'Generated This Month', value: '15',    icon: <Calendar size={22} strokeWidth={1.5} />, colorDim: D.blueDim,   colorHex: D.blue   },
              { label: 'Available Report Schemes', value: reportTypes.length.toString(), icon: <ClipboardList size={22} strokeWidth={1.5} />, colorDim: D.indigoDim, colorHex: D.indigo },
              { label: 'Active PDF Palette', value: pdfTheme.charAt(0).toUpperCase() + pdfTheme.slice(1), icon: <Palette size={22} strokeWidth={1.5} />, colorDim: D.goldDim, colorHex: D.gold },
            ].map(s => (
              <div key={s.label} style={{
                background: D.surface,
                borderRadius: 20,
                border: `1.5px solid ${D.border}`,
                padding: '22px 24px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: D.bg === '#f5f5fb' ? '0 4px 15px rgba(29,78,216,0.04)' : '0 4px 20px rgba(0,0,0,0.2)',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = D.borderHi;
                e.currentTarget.style.boxShadow = D.bg === '#f5f5fb' ? '0 10px 25px rgba(29,78,216,0.08)' : `0 10px 25px ${s.colorDim}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = D.border;
                e.currentTarget.style.boxShadow = D.bg === '#f5f5fb' ? '0 4px 15px rgba(29,78,216,0.04)' : '0 4px 20px rgba(0,0,0,0.2)';
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: '1.65rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.1 }}>{s.value}</p>
                  </div>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: s.colorDim,
                    color: s.colorHex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${s.colorHex}25`,
                    boxShadow: `0 4px 10px ${s.colorDim}`
                  }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Configuration and Filtering Controls Panel */}
          <div style={{
            background: D.surface,
            borderRadius: 22,
            border: `1.5px solid ${D.border}`,
            padding: '24px 32px',
            marginBottom: 36,
            boxShadow: D.bg === '#f5f5fb' ? '0 10px 25px rgba(29,78,216,0.04)' : '0 10px 30px rgba(0,0,0,0.2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
            alignItems: 'center'
          }}>
            
            {/* Color Palette customization options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Palette size={18} style={{ color: D.indigo }} />
                <span style={{ fontWeight: 800, color: D.text, fontSize: '0.9rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>PDF Export Color Scheme</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: D.textSub }}>Branding color applied to generated tables and title bars</p>
              
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                  { id: 'indigo',   name: 'Royal Blue', color: '#2563eb' },
                  { id: 'emerald',  name: 'Emerald',    color: '#059669' },
                  { id: 'crimson',  name: 'Crimson',    color: '#dc2626' },
                  { id: 'charcoal', name: 'Charcoal',   color: '#4b5563' },
                ].map(t => {
                  const isSelected = pdfTheme === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setPdfTheme(t.id)}
                      className="palette-option"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: isSelected ? `2.5px solid ${t.color}` : `1.5px solid ${D.border}`,
                        background: isSelected ? `${t.color}15` : D.bg,
                        color: isSelected ? t.color : D.textSub,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.76rem',
                        outline: 'none',
                        boxShadow: isSelected ? `0 4px 12px ${t.color}18` : 'none'
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, display: 'inline-block' }}></span>
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sliders size={18} style={{ color: D.indigo }} />
                <span style={{ fontWeight: 800, color: D.text, fontSize: '0.9rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Temporal Filter Window</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: D.textSub }}>Optional date range filters applied on fuel and maintenance lists</p>
              
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = D.indigo; e.target.style.boxShadow = `0 0 0 3px ${D.indigoDim}` }}
                  onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                />
                <span style={{ color: D.textSub, fontSize: '0.8rem', fontWeight: 600 }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = D.indigo; e.target.style.boxShadow = `0 0 0 3px ${D.indigoDim}` }}
                  onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `1px solid ${D.red}40`,
                      background: D.redDim,
                      color: D.red,
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = D.redDim}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Section: Generate Reports */}
          <SectionHeader title="Available Reports Directory" D={D} icon={<ClipboardList size={20} />} />

          {/* Category Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 14,
            marginBottom: 28,
            borderBottom: `1.5px solid ${D.border}`,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {['All', 'System', 'Fleet', 'Fuel', 'Maintenance', 'Users', 'Finance'].map(cat => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="custom-tab"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 20,
                    background: isActive ? `linear-gradient(135deg, ${D.indigo}, ${D.purple})` : D.surface,
                    color: isActive ? '#fff' : D.textSub,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? `0 6px 16px ${D.indigoDim}` : 'none',
                    border: `1.5px solid ${isActive ? 'transparent' : D.border}`,
                    outline: 'none'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = D.surfaceHi;
                      e.currentTarget.style.color = D.text;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = D.surface;
                      e.currentTarget.style.color = D.textSub;
                    }
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Grid of Report Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 24, marginBottom: 44 }}>
            {reportTypes.filter(r => activeCategory === 'All' || r.category.toLowerCase() === activeCategory.toLowerCase()).map(r => (
              <div
                key={r.id}
                className="custom-card"
                style={{
                  borderRadius: 20,
                  padding: '26px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Glowing top backdrop accent dot */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: r.bg, filter: 'blur(20px)', opacity: 0.8, pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, position: 'relative' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: r.bg,
                    color: r.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${r.color}25`,
                    boxShadow: `0 4px 12px ${r.bg}`
                  }}>
                    {r.icon}
                  </div>
                  <span style={{
                    background: r.bg,
                    color: r.color,
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    border: `1px solid ${r.color}20`
                  }}>
                    {r.category}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: D.text, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.title}</h3>
                <p style={{ margin: '0 0 24px', fontSize: '0.84rem', color: D.textSub, lineHeight: 1.5, flex: 1 }}>{r.desc}</p>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto', position: 'relative' }}>
                  <button
                    onClick={() => handleGenerate(r.id)}
                    disabled={generating !== null}
                    className="reports-grid-btn"
                    style={{
                      flex: 1.8,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: 'none',
                      background: generating === r.id ? D.surfaceHi : r.color,
                      color: generating === r.id ? r.color : '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: generating !== null ? 'not-allowed' : 'pointer',
                      boxShadow: generating === r.id ? 'none' : `0 4px 14px ${r.bg}`,
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    {generating === r.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        Download PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleGenerateExcel(r.id)}
                    disabled={generating !== null}
                    className="reports-grid-btn"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: `1px solid ${r.color}35`,
                      background: r.bg,
                      color: r.color,
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: generating !== null ? 'not-allowed' : 'pointer',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                    onMouseEnter={e => { if (generating === null) { e.currentTarget.style.background = r.color; e.currentTarget.style.color = '#fff' } }}
                    onMouseLeave={e => { if (generating === null) { e.currentTarget.style.background = r.bg; e.currentTarget.style.color = r.color } }}
                  >
                    Excel
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Section: Recent Reports */}
          <SectionHeader title="Recent Download Actions" D={D} icon={<FileText size={20} />} />
          <p style={{ margin: '-16px 0 20px', fontSize: '0.8rem', color: D.textSub, display: 'flex', alignItems: 'center', gap: 6 }}>
            Recently compiled logs and downloads. Click download to fetch the latest data state instantly.
          </p>

          <div style={{
            background: D.surface,
            borderRadius: 22,
            border: `1.5px solid ${D.border}`,
            overflow: 'hidden',
            boxShadow: D.bg === '#f5f5fb' ? '0 10px 25px rgba(29,78,216,0.03)' : '0 10px 30px rgba(0,0,0,0.25)',
            marginBottom: 20
          }}>
            {/* Search and action controls header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: `1px solid ${D.border}`,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              background: D.surfaceHi
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.textSub, pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Filter recent report downloads by filename..."
                  value={recentSearch}
                  onChange={e => setRecentSearch(e.target.value)}
                  style={{ ...inputStyle, width: '100%', paddingLeft: 38 }}
                  onFocus={e => { e.target.style.borderColor = D.indigo; e.target.style.boxShadow = `0 0 0 3px ${D.indigoDim}` }}
                  onBlur={e => { e.target.style.borderColor = D.inputBorder; e.target.style.boxShadow = 'none' }}
                />
              </div>
              {recentSearch && (
                <button
                  onClick={() => setRecentSearch('')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: `1px solid ${D.red}40`,
                    background: D.redDim,
                    color: D.red,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = D.redDim }}
                >
                  <X size={14} /> Clear Search
                </button>
              )}
              {reportsList.length > 0 && (
                <button
                  onClick={handleClearAllRecent}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: `1px solid ${D.red}30`,
                    background: 'transparent',
                    color: D.red,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = D.redDim }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Clear History
                </button>
              )}
            </div>

            {/* Showing status bar */}
            <div style={{
              padding: '10px 24px',
              fontSize: '0.76rem',
              color: D.textSub,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `1px solid ${D.border}`,
              background: D.surfaceHi,
              fontWeight: 600
            }}>
              <span>Showing <strong>{filteredRecentReports.length}</strong> of <strong>{reportsList.length}</strong> generated downloads</span>
              {recentSearch && (
                <span style={{ color: D.indigo, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.indigo }}></span>
                  Filtered view active
                </span>
              )}
            </div>

            {/* Recent table */}
            {filteredRecentReports.length === 0 ? (
              <div style={{ textAlign: 'center', color: D.textSub, padding: '48px 20px', fontSize: '0.85rem', fontWeight: 500 }}>
                No downloads found matching "{recentSearch}"
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead style={{ background: D.surfaceHi }}>
                    <tr>
                      {['Report File Name', 'Generation Date', 'Export Format', 'Estimated Size', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '14px 20px',
                          fontWeight: 800,
                          color: D.textSub,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          borderBottom: `1px solid ${D.border}`,
                          whiteSpace: 'nowrap'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentReports.map((r, i) => (
                      <tr key={r.name} className="recent-reports-row" style={{
                        borderBottom: `1px solid ${D.border}`,
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                      }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: D.text }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={16} style={{ color: D.textFaint }} />
                            <span>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', color: D.textSub, fontWeight: 500 }}>{r.generated}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            background: r.format === 'PDF' ? D.redDim : D.greenDim,
                            color: r.format === 'PDF' ? D.red : D.green,
                            border: `1px solid ${r.format === 'PDF' ? D.red : D.green}25`,
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {r.format}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: D.textSub, fontWeight: 500 }}>{r.size}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleRedownloadRecent(r.name, r.format)}
                              disabled={generating !== null}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: `1.5px solid ${D.border}`,
                                background: D.surface,
                                color: D.text,
                                fontSize: '0.74rem',
                                cursor: generating !== null ? 'not-allowed' : 'pointer',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                transition: 'all 0.15s',
                                outline: 'none'
                              }}
                              onMouseEnter={e => { if (generating === null) { e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.borderColor = D.indigo; e.currentTarget.style.color = D.indigo } }}
                              onMouseLeave={e => { if (generating === null) { e.currentTarget.style.background = D.surface; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text } }}
                            >
                              <Download size={12} />
                              Re-download
                            </button>
                            <button
                              onClick={() => handleDeleteRecent(r.name)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1.5px solid transparent',
                                background: D.redDim,
                                color: D.red,
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                fontWeight: 800,
                                transition: 'all 0.15s',
                                outline: 'none'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                            >
                              Delete
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
