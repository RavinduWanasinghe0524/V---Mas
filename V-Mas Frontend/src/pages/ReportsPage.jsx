import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD } from '../context/ThemeContext'
import {
  Car, Fuel, Wrench, Users, MapPin, DollarSign,
  FileText, Calendar, Download, ClipboardList, BarChart2, Loader2, Database, TrendingUp,
  AlertCircle, CheckCircle, X
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { vehicleAPI, fuelAPI, serviceAPI, userAPI } from '../services/api'

const recentReports = [
  { name: 'Vehicle Summary – May 2026',   generated: '2026-05-20', format: 'PDF',  size: '245 KB' },
  { name: 'Fuel Consumption – Apr 2026',  generated: '2026-05-01', format: 'Excel', size: '118 KB' },
  { name: 'User Activity – Q2 2026',      generated: '2026-05-15', format: 'PDF',  size: '312 KB' },
  { name: 'Service Summary – Apr 2026',   generated: '2026-05-02', format: 'PDF',  size: '198 KB' },
]

const SectionHeader = ({ title, D }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, marginTop: 10 }}>
    <h2 style={{ margin: 0, fontSize: '1.15rem', color: D.text, fontWeight: 700 }}>{title}</h2>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
  </div>
)

const ReportsPage = () => {
  const D = useD()
  const reportTypes = [
    { id: 'master-report',      icon: <Database size={24} strokeWidth={1.5} />,    title: 'Comprehensive Master Report',   desc: 'Complete export of all system data including vehicles, fuel, services, and users.',    category: 'System',      color: D.red,    bg: D.redDim    },
    { id: 'vehicle-summary',    icon: <Car size={24} strokeWidth={1.5} />,         title: 'Vehicle Summary Report',        desc: 'Overview of all fleet vehicles including status, mileage, and assignments.',           category: 'Fleet',       color: D.indigo, bg: D.indigoDim },
    { id: 'fuel-report',        icon: <Fuel size={24} strokeWidth={1.5} />,        title: 'Fuel Consumption Report',       desc: 'Detailed fuel usage breakdown per vehicle, driver, and time period.',                   category: 'Fuel',        color: D.gold,   bg: D.goldDim   },
    { id: 'fuel-efficiency',    icon: <TrendingUp size={24} strokeWidth={1.5} />,  title: 'Fuel Efficiency Report',        desc: 'Computed km/L efficiency per vehicle by comparing fill-up records with distance covered.', category: 'Fuel',     color: D.green,  bg: D.greenDim  },
    { id: 'service-report',     icon: <Wrench size={24} strokeWidth={1.5} />,      title: 'Service & Maintenance Report',  desc: 'Summary of all service records, costs, and upcoming maintenance schedules.',            category: 'Maintenance', color: D.green,  bg: D.greenDim  },
    { id: 'user-report',        icon: <Users size={24} strokeWidth={1.5} />,       title: 'User Activity Report',          desc: 'User registration, role distribution, login history, and account statuses.',            category: 'Users',       color: D.blue,   bg: D.blueDim   },
    { id: 'cost-report',        icon: <DollarSign size={24} strokeWidth={1.5} />,  title: 'Cost Analysis Report',          desc: 'Full cost breakdown including fuel, maintenance, and operational expenses.',             category: 'Finance',     color: D.indigo, bg: D.indigoDim },
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
    indigo: { primary: [67, 56, 202] },
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
        const { data } = await vehicleAPI.getAllVehicles()
        const tableData = data.map(v => [
          v.registrationNumber, v.brand || 'N/A', v.model || 'N/A', v.status || 'N/A', v.mileage || 0, v.fuelType || 'N/A', v.fuelCapacity || 0
        ])
        doc.autoTable({
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Reg No', 'Brand', 'Model', 'Status', 'Mileage', 'Fuel Type', 'Capacity']],
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
        const { data } = await fuelAPI.getAllFuelLogs()
        let filteredFuel = data || []
        if (startDate) {
          filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) >= new Date(startDate))
        }
        if (endDate) {
          filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) <= new Date(endDate))
        }
        const tableData = filteredFuel.map(f => [
          f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
          f.vehicleRegNo || 'N/A',
          f.driverName || 'N/A',
          f.fuelType || 'N/A',
          f.liters || 0,
          f.cost ? `$${f.cost.toFixed(2)}` : '$0.00'
        ])
        doc.autoTable({
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Date', 'Vehicle', 'Driver', 'Type', 'Liters', 'Cost']],
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
        const { data } = await serviceAPI.getAllServices()
        let filteredServices = data || []
        if (startDate) {
          filteredServices = filteredServices.filter(s => s.date && new Date(s.date) >= new Date(startDate))
        }
        if (endDate) {
          filteredServices = filteredServices.filter(s => s.date && new Date(s.date) <= new Date(endDate))
        }
        const tableData = filteredServices.map(s => [
          s.date ? new Date(s.date).toLocaleDateString() : 'N/A',
          s.vehicleRegNo || 'N/A',
          s.serviceType || 'N/A',
          s.status || 'N/A',
          s.cost ? `$${s.cost.toFixed(2)}` : '$0.00'
        ])
        doc.autoTable({
          startY: id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 45) : 40,
          head: [['Date', 'Vehicle Reg', 'Service Type', 'Status', 'Cost']],
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
        const { data } = await userAPI.getAllUsers()
        const tableData = data.map(u => [
          u.userName || 'N/A',
          u.email || 'N/A',
          u.role || 'N/A',
          u.accountStatus || 'ACTIVE'
        ])
        doc.autoTable({
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
        const { data: res } = await fuelAPI.getFuelEfficiencyReport()
        const report = res.data || res

        // ── Fleet Summary block ───────────────────────────────────────────
        let y = id === 'master-report' ? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 25 : 50) : 38
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text('Fleet Summary', 14, y); y += 7

        const summaryItems = [
          ['Fleet Average Efficiency', report.fleetAverageEfficiency != null ? `${report.fleetAverageEfficiency} km/L` : 'Insufficient Data'],
          ['Total Vehicles',           String(report.totalVehicles ?? 0)],
          ['Good Efficiency (≥10 km/L)', String(report.goodEfficiencyCount ?? 0)],
          ['Moderate (5–9.99 km/L)',   String(report.moderateEfficiencyCount ?? 0)],
          ['Low Efficiency (<5 km/L)', String(report.lowEfficiencyCount ?? 0)],
        ]
        doc.autoTable({
          startY: y,
          head: [['Metric', 'Value']],
          body: summaryItems,
          theme: 'grid',
          headStyles: { fillColor: headerColor },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { cellWidth: 60 } },
          margin: { left: 14, right: 14 },
        })

        // ── Per-vehicle table ────────────────────────────────────────────
        const afterSummary = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 40
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text('Per-Vehicle Efficiency Breakdown', 14, afterSummary)

        const vehicles = report.vehicles || []
        const vehicleRows = vehicles.map(v => [
          v.vehicleRegNumber || 'N/A',
          v.latestEfficiency    != null ? `${v.latestEfficiency} km/L`    : 'N/A',
          v.averageEfficiency   != null ? `${v.averageEfficiency} km/L`   : 'N/A',
          v.efficiencyStatus    || 'N/A',
          v.totalLiters         != null ? `${v.totalLiters} L`            : 'N/A',
          v.totalCost           != null ? `Rs. ${v.totalCost.toLocaleString()}` : 'N/A',
          v.costPerKm           != null ? `Rs. ${v.costPerKm}/km`         : 'N/A',
          v.fillUps             != null ? String(v.fillUps.length)         : '0',
        ])

        doc.autoTable({
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
        const { data: fuelLogsRes } = await fuelAPI.getAllFuelLogs()
        const { data: servicesRes } = await serviceAPI.getAllServices()

        let fuelLogs = fuelLogsRes || []
        let services = servicesRes || []
        if (startDate) {
          fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) >= new Date(startDate))
          services = services.filter(s => s.date && new Date(s.date) >= new Date(startDate))
        }
        if (endDate) {
          fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) <= new Date(endDate))
          services = services.filter(s => s.date && new Date(s.date) <= new Date(endDate))
        }

        const totalFuelCost = fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0)
        const totalServiceCost = services.reduce((sum, s) => sum + (s.cost || 0), 0)
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

        doc.autoTable({
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
          .sort((a, b) => (b.cost || 0) - (a.cost || 0))
          .slice(0, 5)
          .map(f => [
            f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
            f.vehicleRegNo || 'N/A',
            f.driverName || 'N/A',
            f.liters ? `${f.liters} L` : '0 L',
            f.cost ? `Rs. ${f.cost.toLocaleString()}` : 'Rs. 0'
          ])

        doc.autoTable({
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
          .sort((a, b) => (b.cost || 0) - (a.cost || 0))
          .slice(0, 5)
          .map(s => [
            s.date ? new Date(s.date).toLocaleDateString() : 'N/A',
            s.vehicleRegNo || 'N/A',
            s.serviceType || 'N/A',
            s.status || 'N/A',
            s.cost ? `Rs. ${s.cost.toLocaleString()}` : 'Rs. 0'
          ])

        doc.autoTable({
          startY: afterFuel + 5,
          head: [['Date', 'Vehicle', 'Service Type', 'Status', 'Cost']],
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
        setError(err.response?.data?.message || `Failed to generate "${reportName}". Please try again later.`)
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
      let csvContent = ''
      let headers = []
      let rows = []
      const filename = `${id}-${new Date().toISOString().split('T')[0]}.csv`

      if (id === 'master-report') {
        const { data: vData } = await vehicleAPI.getAllVehicles()
        const { data: fuelRes } = await fuelAPI.getAllFuelLogs()
        const { data: serviceRes } = await serviceAPI.getAllServices()
        const { data: uData } = await userAPI.getAllUsers()
        const { data: effRes } = await fuelAPI.getFuelEfficiencyReport()
        const effReport = effRes.data || effRes

        let fData = fuelRes || []
        let sData = serviceRes || []
        if (startDate) {
          fData = fData.filter(f => f.date && new Date(f.date) >= new Date(startDate))
          sData = sData.filter(s => s.date && new Date(s.date) >= new Date(startDate))
        }
        if (endDate) {
          fData = fData.filter(f => f.date && new Date(f.date) <= new Date(endDate))
          sData = sData.filter(s => s.date && new Date(s.date) <= new Date(endDate))
        }

        headers = []
        rows = [
          ['Comprehensive Master Report'],
          [],
          ['--- Vehicle Summary ---'],
          ['Reg No', 'Brand', 'Model', 'Status', 'Mileage', 'Fuel Type', 'Capacity'],
          ...vData.map(v => [v.registrationNumber, v.brand || 'N/A', v.model || 'N/A', v.status || 'N/A', v.mileage || 0, v.fuelType || 'N/A', v.fuelCapacity || 0]),
          [],
          ['--- Fuel Consumption ---'],
          ['Date', 'Vehicle', 'Driver', 'Type', 'Liters', 'Cost'],
          ...fData.map(f => [f.date ? new Date(f.date).toLocaleDateString() : 'N/A', f.vehicleRegNo || 'N/A', f.driverName || 'N/A', f.fuelType || 'N/A', f.liters || 0, f.cost || 0]),
          [],
          ['--- Service & Maintenance ---'],
          ['Date', 'Vehicle Reg', 'Service Type', 'Status', 'Cost'],
          ...sData.map(s => [s.date ? new Date(s.date).toLocaleDateString() : 'N/A', s.vehicleRegNo || 'N/A', s.serviceType || 'N/A', s.status || 'N/A', s.cost || 0]),
          [],
          ['--- User Activity ---'],
          ['Username', 'Email', 'Role', 'Status'],
          ...uData.map(u => [u.userName || 'N/A', u.email || 'N/A', u.role || 'N/A', u.accountStatus || 'ACTIVE']),
          [],
          ['--- Fuel Efficiency ---'],
          ['Reg No', 'Latest km/L', 'Avg km/L', 'Status', 'Total Liters', 'Total Cost', 'Cost/km', 'Fill-ups'],
          ...(effReport.vehicles || []).map(v => [v.vehicleRegNumber || 'N/A', v.latestEfficiency != null ? v.latestEfficiency : 'N/A', v.averageEfficiency != null ? v.averageEfficiency : 'N/A', v.efficiencyStatus || 'N/A', v.totalLiters || 'N/A', v.totalCost || 'N/A', v.costPerKm || 'N/A', v.fillUps ? v.fillUps.length : 0]),
          [],
          ['--- Operational Expenses Summary ---'],
          ['Cost Category', 'Amount'],
          ['Total Fuel Expenses', fData.reduce((sum, f) => sum + (f.cost || 0), 0)],
          ['Total Maintenance Expenses', sData.reduce((sum, s) => sum + (s.cost || 0), 0)],
          ['Total Expenses', fData.reduce((sum, f) => sum + (f.cost || 0), 0) + sData.reduce((sum, s) => sum + (s.cost || 0), 0)]
        ]
      } else if (id === 'vehicle-summary') {
        const { data } = await vehicleAPI.getAllVehicles()
        headers = ['Reg No', 'Brand', 'Model', 'Status', 'Mileage', 'Fuel Type', 'Capacity']
        rows = data.map(v => [
          v.registrationNumber, v.brand || 'N/A', v.model || 'N/A', v.status || 'N/A', v.mileage || 0, v.fuelType || 'N/A', v.fuelCapacity || 0
        ])
      } else if (id === 'fuel-report') {
        const { data } = await fuelAPI.getAllFuelLogs()
        let filteredFuel = data || []
        if (startDate) {
          filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) >= new Date(startDate))
        }
        if (endDate) {
          filteredFuel = filteredFuel.filter(f => f.date && new Date(f.date) <= new Date(endDate))
        }
        headers = ['Date', 'Vehicle', 'Driver', 'Type', 'Liters', 'Cost']
        rows = filteredFuel.map(f => [
          f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
          f.vehicleRegNo || 'N/A',
          f.driverName || 'N/A',
          f.fuelType || 'N/A',
          f.liters || 0,
          f.cost || 0
        ])
      } else if (id === 'service-report') {
        const { data } = await serviceAPI.getAllServices()
        let filteredServices = data || []
        if (startDate) {
          filteredServices = filteredServices.filter(s => s.date && new Date(s.date) >= new Date(startDate))
        }
        if (endDate) {
          filteredServices = filteredServices.filter(s => s.date && new Date(s.date) <= new Date(endDate))
        }
        headers = ['Date', 'Vehicle Reg', 'Service Type', 'Status', 'Cost']
        rows = filteredServices.map(s => [
          s.date ? new Date(s.date).toLocaleDateString() : 'N/A',
          s.vehicleRegNo || 'N/A',
          s.serviceType || 'N/A',
          s.status || 'N/A',
          s.cost || 0
        ])
      } else if (id === 'user-report') {
        const { data } = await userAPI.getAllUsers()
        headers = ['Username', 'Email', 'Role', 'Status']
        rows = data.map(u => [
          u.userName || 'N/A',
          u.email || 'N/A',
          u.role || 'N/A',
          u.accountStatus || 'ACTIVE'
        ])
      } else if (id === 'fuel-efficiency') {
        const { data: effRes } = await fuelAPI.getFuelEfficiencyReport()
        const report = effRes.data || effRes
        headers = []
        rows = [
          ['Fleet Summary'],
          ['Metric', 'Value'],
          ['Fleet Average Efficiency', report.fleetAverageEfficiency != null ? report.fleetAverageEfficiency : 'N/A'],
          ['Total Vehicles', report.totalVehicles || 0],
          ['Good Efficiency', report.goodEfficiencyCount || 0],
          ['Moderate Efficiency', report.moderateEfficiencyCount || 0],
          ['Low Efficiency', report.lowEfficiencyCount || 0],
          [],
          ['Per-Vehicle Efficiency Breakdown'],
          ['Reg No', 'Latest km/L', 'Avg km/L', 'Status', 'Total Liters', 'Total Cost', 'Cost/km', 'Fill-ups'],
          ...(report.vehicles || []).map(v => [
            v.vehicleRegNumber || 'N/A',
            v.latestEfficiency != null ? v.latestEfficiency : 'N/A',
            v.averageEfficiency != null ? v.averageEfficiency : 'N/A',
            v.efficiencyStatus || 'N/A',
            v.totalLiters || 'N/A',
            v.totalCost || 'N/A',
            v.costPerKm || 'N/A',
            v.fillUps ? v.fillUps.length : 0
          ])
        ]
      } else if (id === 'cost-report') {
        const { data: fuelLogsRes } = await fuelAPI.getAllFuelLogs()
        const { data: servicesRes } = await serviceAPI.getAllServices()
        let fuelLogs = fuelLogsRes || []
        let services = servicesRes || []
        if (startDate) {
          fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) >= new Date(startDate))
          services = services.filter(s => s.date && new Date(s.date) >= new Date(startDate))
        }
        if (endDate) {
          fuelLogs = fuelLogs.filter(f => f.date && new Date(f.date) <= new Date(endDate))
          services = services.filter(s => s.date && new Date(s.date) <= new Date(endDate))
        }
        headers = []
        rows = [
          ['Operational Expenses Summary'],
          ['Cost Category', 'Amount'],
          ['Total Fuel Expenses', fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0)],
          ['Total Maintenance Expenses', services.reduce((sum, s) => sum + (s.cost || 0), 0)],
          ['Total Fleet Operational Expenses', fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0) + services.reduce((sum, s) => sum + (s.cost || 0), 0)],
          [],
          ['Fuel Expenditure Breakdown'],
          ['Date', 'Vehicle', 'Driver', 'Volume', 'Cost'],
          ...[...fuelLogs].sort((a, b) => (b.cost || 0) - (a.cost || 0)).map(f => [
            f.date ? new Date(f.date).toLocaleDateString() : 'N/A',
            f.vehicleRegNo || 'N/A',
            f.driverName || 'N/A',
            f.liters || 0,
            f.cost || 0
          ]),
          [],
          ['Maintenance Expenditure Breakdown'],
          ['Date', 'Vehicle', 'Service Type', 'Status', 'Cost'],
          ...[...services].sort((a, b) => (b.cost || 0) - (a.cost || 0)).map(s => [
            s.date ? new Date(s.date).toLocaleDateString() : 'N/A',
            s.vehicleRegNo || 'N/A',
            s.serviceType || 'N/A',
            s.status || 'N/A',
            s.cost || 0
          ])
        ]
      } else {
        setError('Excel export for this category is under development.')
        setTimeout(() => setError(''), 4000)
        return
      }

      csvContent = headers.length > 0 
        ? [
            headers.join(','),
            ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
          ].join('\n')
        : rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccessMsg(`Excel (CSV) report "${filename}" generated and downloaded successfully.`)
      setTimeout(() => setSuccessMsg(''), 5000)

      const newReport = {
        name: filename,
        generated: new Date().toISOString().split('T')[0],
        format: 'Excel',
        size: id === 'master-report' ? '280 KB' : '85 KB'
      }
      setReportsList(prev => [newReport, ...prev.filter(r => r.name !== filename)])
    } catch (err) {
      console.error('Error generating Excel:', err)
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

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Reports" subtitle="Dashboard / Reports" onMenuToggle={() => setSidebarOpen(o => !o)} />
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
            {[['80%','−20px','180px','rgba(255,255,255,0.03)'],['20%','60%','120px','rgba(255,255,255,0.04)'],['55%','80%','90px','rgba(255,255,255,0.02)']].map(([t,l,s,bg],i) => (
              <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display:'flex', alignItems:'center', justifyContent:'center', color: '#fff', backdropFilter:'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <BarChart2 size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Reports and Analytics Dashboard
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                  Generate and download comprehensive reports on fleet performance, fuel consumption, maintenance costs, and system-wide activity.
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {successMsg && (
            <div style={{ padding: '14px 20px', borderRadius: 12, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 24, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease' }}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}
          {error && (
            <div style={{ padding: '14px 20px', borderRadius: 12, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 24, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
            {[
              { label: 'Reports Generated', value: '42',    icon: <FileText size={20} strokeWidth={1.5} />, colorDim: D.purpleDim, colorHex: D.purple },
              { label: 'This Month',        value: '15',    icon: <Calendar size={20} strokeWidth={1.5} />, colorDim: D.blueDim,   colorHex: D.blue   },
              { label: 'Total Downloads',   value: '145',   icon: <Download size={20} strokeWidth={1.5} />, colorDim: D.greenDim,  colorHex: D.green  },
              { label: 'Report Types',      value: reportTypes.length.toString(), icon: <ClipboardList size={20} strokeWidth={1.5} />, colorDim: D.indigoDim, colorHex: D.indigo },
            ].map(s => (
              <div key={s.label} style={{
                background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
                padding: '20px 22px', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=D.borderHi; e.currentTarget.style.boxShadow=`0 8px 24px ${s.colorDim}` }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=D.border; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{s.value}</p>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.colorDim, color: s.colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${s.colorDim}`, flexShrink: 0, border: `1px solid ${s.colorHex}30` }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Generate Reports */}
          <SectionHeader title="Generate Reports" D={D} />

          {/* Export Theme Selection */}
          <div style={{
            background: D.surface,
            borderRadius: 12,
            border: `1px solid ${D.border}`,
            padding: '12px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: '0.85rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: D.text }}>PDF Export Palette:</span>
              <span style={{ fontSize: '0.75rem', color: D.textSub }}>Select branding color for tables</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'indigo',   name: 'Indigo',   color: '#4338ca' },
                { id: 'emerald',  name: 'Emerald',  color: '#059669' },
                { id: 'crimson',  name: 'Crimson',  color: '#dc2626' },
                { id: 'charcoal', name: 'Charcoal', color: '#374151' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setPdfTheme(t.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: pdfTheme === t.id ? `2px solid ${t.color}` : `1px solid ${D.border}`,
                    background: pdfTheme === t.id ? `${t.color}15` : D.bg,
                    color: pdfTheme === t.id ? t.color : D.textSub,
                    fontWeight: pdfTheme === t.id ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }}></span>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filters */}
          <div style={{
            background: D.surface,
            borderRadius: 12,
            border: `1px solid ${D.border}`,
            padding: '12px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: '0.85rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} style={{ color: D.indigo }} />
              <span style={{ fontWeight: 600, color: D.text }}>Report Date Range (Optional):</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${D.border}`,
                  background: D.bg,
                  color: D.text,
                  fontSize: '0.75rem',
                  outline: 'none'
                }}
              />
              <span style={{ color: D.textSub, fontSize: '0.75rem' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${D.border}`,
                  background: D.bg,
                  color: D.text,
                  fontSize: '0.75rem',
                  outline: 'none'
                }}
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${D.red}40`,
                    background: D.redDim,
                    color: D.red,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = D.redDim}
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 24,
            borderBottom: `1px solid ${D.border}`,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {['All', 'System', 'Fleet', 'Fuel', 'Maintenance', 'Users', 'Finance'].map(cat => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: isActive ? D.indigo : D.surface,
                    color: isActive ? '#fff' : D.textSub,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? `0 4px 12px ${D.indigoDim}` : 'none',
                    border: `1px solid ${isActive ? D.indigo : D.border}`,
                    transition: 'all 0.2s ease'
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 36 }}>
            {reportTypes.filter(r => activeCategory === 'All' || r.category.toLowerCase() === activeCategory.toLowerCase()).map(r => (
              <div key={r.id} style={{
                background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
                padding: '24px', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', height: '100%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = D.borderHi; e.currentTarget.style.background = D.surfaceHi; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${r.color}30`, boxShadow: `0 4px 12px ${r.bg}` }}>
                    {r.icon}
                  </div>
                  <span style={{ background: r.bg, color: r.color, fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${r.color}30` }}>
                    {r.category}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: D.text, fontWeight: 700 }}>{r.title}</h3>
                <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: D.textSub, lineHeight: 1.5, flex: 1 }}>{r.desc}</p>
                
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button
                    onClick={() => handleGenerate(r.id)}
                    disabled={generating === r.id}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 10, border: 'none',
                      background: generating === r.id ? D.surfaceHi : r.color,
                      color: generating === r.id ? r.color : '#fff',
                      fontSize: '0.8rem', fontWeight: 700, cursor: generating === r.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease', boxShadow: generating === r.id ? 'none' : `0 4px 14px ${r.bg}`
                    }}
                  >
                    {generating === r.id ? <><Loader2 size={14} className="animate-spin" style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}/> Generating…</> : <><Download size={14} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}/> Download PDF</>}
                  </button>
                  <button
                    onClick={() => handleGenerateExcel(r.id)}
                    disabled={generating === r.id}
                    style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${r.color}40`, background: r.bg, color: r.color, fontSize: '0.8rem', fontWeight: 700, cursor: generating === r.id ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (generating !== r.id) { e.currentTarget.style.background = r.color; e.currentTarget.style.color = '#fff' } }}
                    onMouseLeave={e => { if (generating !== r.id) { e.currentTarget.style.background = r.bg; e.currentTarget.style.color = r.color } }}>
                    Excel
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Reports */}
          <SectionHeader title="Recent Reports" D={D} />
          <p style={{ margin: '-12px 0 16px', fontSize: '0.8rem', color: D.textSub }}>Previously generated reports are listed below for quick re-download.</p>
          <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            {/* Search and filter row */}
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: D.surfaceHi }}>
              <input
                type="text"
                placeholder="Search recent reports by name or format..."
                value={recentSearch}
                onChange={e => setRecentSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${D.border}`,
                  background: D.bg,
                  color: D.text,
                  fontSize: '0.8rem',
                  outline: 'none',
                  flex: 1,
                  minWidth: 200
                }}
              />
              {recentSearch && (
                <button
                  onClick={() => setRecentSearch('')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `1px solid ${D.red}40`,
                    background: D.redDim,
                    color: D.red,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(248,113,113,0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = D.redDim;
                  }}
                >
                  <X size={14} /> Clear Search
                </button>
              )}
              {reportsList.length > 0 && (
                <button
                  onClick={handleClearAllRecent}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `1px solid ${D.red}40`,
                    background: 'transparent',
                    color: D.red,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = D.redDim;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Clear All History
                </button>
              )}
            </div>

            {/* Recent reports list count status indicator */}
            <div style={{
              padding: '10px 24px',
              fontSize: '0.78rem',
              color: D.textSub,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `1px solid ${D.border}`,
              background: D.surfaceHi,
              fontWeight: 500
            }}>
              <span>Showing <strong>{filteredRecentReports.length}</strong> of <strong>{reportsList.length}</strong> recent reports</span>
              {recentSearch && (
                <span style={{ color: D.purple, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.purple }}></span>
                  Active search results
                </span>
              )}
            </div>

            {filteredRecentReports.length === 0 ? (
              <div style={{ textAlign: 'center', color: D.textSub, padding: 40 }}>
                No recent reports found matching "{recentSearch}"
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: D.surfaceHi }}>
                  <tr>
                    {['Report Name', 'Generated Date', 'Format', 'Size', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecentReports.map((r, i) => (
                    <tr key={r.name} style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: D.text, display: 'flex', alignItems: 'center' }}>
                        <FileText size={16} style={{ marginRight: 10, color: D.textSub }} />{r.name}
                      </td>
                      <td style={{ padding: '14px 16px', color: D.textSub }}>{r.generated}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: r.format === 'PDF' ? D.redDim : D.greenDim, color: r.format === 'PDF' ? D.red : D.green, border: `1px solid ${r.format === 'PDF' ? D.red : D.green}30`, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                          {r.format}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: D.textSub }}>{r.size}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleRedownloadRecent(r.name, r.format)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'; e.currentTarget.style.color='#a5b4fc' }}
                            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor=D.border; e.currentTarget.style.color=D.text }}>
                            <Download size={12} strokeWidth={2} style={{ marginRight: 4 }} /> Download
                          </button>
                          <button
                            onClick={() => handleDeleteRecent(r.name)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(248,113,113,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='rgba(248,113,113,0.1)' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}

export default ReportsPage
