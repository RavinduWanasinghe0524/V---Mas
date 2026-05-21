import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD } from '../context/ThemeContext'
import {
  Car, Fuel, Wrench, Users, MapPin, DollarSign,
  FileText, Calendar, Download, ClipboardList, BarChart2, Loader2, Database, TrendingUp,
  AlertCircle, CheckCircle
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { vehicleAPI, fuelAPI, serviceAPI, userAPI } from '../services/api'

const recentReports = [
  { name: 'Vehicle Summary – Mar 2026',   generated: '2026-03-20', format: 'PDF',  size: '245 KB' },
  { name: 'Fuel Consumption – Feb 2026',  generated: '2026-03-01', format: 'Excel', size: '118 KB' },
  { name: 'User Activity – Q1 2026',      generated: '2026-03-15', format: 'PDF',  size: '312 KB' },
  { name: 'Service Summary – Feb 2026',   generated: '2026-03-02', format: 'PDF',  size: '198 KB' },
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
    { id: 'location-report',    icon: <MapPin size={24} strokeWidth={1.5} />,      title: 'Location & Route Report',       desc: 'Vehicle location history, routes taken, and distance covered per vehicle.',             category: 'Fleet',       color: D.purple, bg: D.purpleDim },
    { id: 'cost-report',        icon: <DollarSign size={24} strokeWidth={1.5} />,  title: 'Cost Analysis Report',          desc: 'Full cost breakdown including fuel, maintenance, and operational expenses.',             category: 'Finance',     color: D.indigo, bg: D.indigoDim },
  ]
  const [generating, setGenerating] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleGenerate = async (id) => {
    setError('')
    setSuccessMsg('')
    setGenerating(id)
    try {
      const doc = new jsPDF()

      const addHeader = (title) => {
        doc.setFontSize(20)
        doc.setTextColor(40, 40, 40)
        doc.text(title, 14, 22)
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)
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
          headStyles: { fillColor: [67, 56, 202] }
        })
      }

      if (id === 'fuel-report' || id === 'master-report') {
        if (id === 'fuel-report') addHeader('Fuel Consumption Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.text('Fuel Records', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data } = await fuelAPI.getAllFuelLogs()
        const tableData = data.map(f => [
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
          headStyles: { fillColor: [217, 119, 6] }
        })
      }

      if (id === 'service-report' || id === 'master-report') {
        if (id === 'service-report') addHeader('Service & Maintenance Report')
        if (id === 'master-report') {
          doc.setFontSize(14)
          doc.text('Service & Maintenance Records', 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 40)
        }
        const { data } = await serviceAPI.getAllServices()
        const tableData = data.map(s => [
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
          headStyles: { fillColor: [5, 150, 105] }
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
          headStyles: { fillColor: [37, 99, 235] }
        })
      }

      if (id === 'fuel-efficiency') {
        addHeader('Fuel Efficiency Report')
        const { data: res } = await fuelAPI.getFuelEfficiencyReport()
        const report = res.data || res

        // ── Fleet Summary block ───────────────────────────────────────────
        let y = 38
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
          headStyles: { fillColor: [5, 150, 105] },
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
          headStyles: { fillColor: [5, 150, 105], fontSize: 8 },
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

      if (id === 'cost-report') {
        addHeader('Cost Analysis Report')
        const { data: fuelLogs } = await fuelAPI.getAllFuelLogs()
        const { data: services } = await serviceAPI.getAllServices()

        const totalFuelCost = fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0)
        const totalServiceCost = services.reduce((sum, s) => sum + (s.cost || 0), 0)
        const grandTotal = totalFuelCost + totalServiceCost

        let y = 38
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
          headStyles: { fillColor: [67, 56, 202] },
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
          headStyles: { fillColor: [217, 119, 6], fontSize: 9 },
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
          headStyles: { fillColor: [5, 150, 105], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        })
      }

      if (id === 'location-report') {
        addHeader('Location & Route Report')
        doc.setFontSize(12)
        doc.text('This feature is currently under development.', 14, 40)
      }

      if (id === 'master-report') {
        doc.setPage(1)
        addHeader('Comprehensive Master Report')
      }

      const filename = `${id}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      setSuccessMsg(`Report "${filename}" generated and downloaded successfully.`)
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError(err.response?.data?.message || 'Failed to generate report. Make sure you have the required permissions.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Reports" subtitle="Home / Reports" />
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
                  Reports & Analytics
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
              { label: 'Reports Generated', value: '38',    icon: <FileText size={20} strokeWidth={1.5} />, colorDim: D.purpleDim, colorHex: D.purple },
              { label: 'This Month',        value: '12',    icon: <Calendar size={20} strokeWidth={1.5} />, colorDim: D.blueDim,   colorHex: D.blue   },
              { label: 'Total Downloads',   value: '127',   icon: <Download size={20} strokeWidth={1.5} />, colorDim: D.greenDim,  colorHex: D.green  },
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 36 }}>
            {reportTypes.map(r => (
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
                    {generating === r.id ? <><Loader2 size={14} className="animate-spin" style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}/> Generating…</> : <><Download size={14} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}/> Generate PDF</>}
                  </button>
                  <button style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${r.color}40`, background: r.bg, color: r.color, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = r.color; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = r.bg; e.currentTarget.style.color = r.color }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ background: D.surfaceHi }}>
                <tr>
                  {['Report Name', 'Generated Date', 'Format', 'Size', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r, i) => (
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
                        <button style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'; e.currentTarget.style.color='#a5b4fc' }}
                          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor=D.border; e.currentTarget.style.color=D.text }}>
                          <Download size={12} strokeWidth={2} style={{ marginRight: 4 }} /> Download
                        </button>
                        <button style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
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
          </div>

        </div>
      </div>

    </div>
  )
}

export default ReportsPage
