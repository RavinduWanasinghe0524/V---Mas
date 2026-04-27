import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { 
  Car, Fuel, Wrench, Users, MapPin, DollarSign, 
  FileText, Calendar, Download, ClipboardList, BarChart2 
} from 'lucide-react'

/* ── Dark palette ───────────────────────────────────────────── */
const D = {
  bg:        '#0d1117',
  surface:   '#161b27',
  surfaceHi: '#1e2535',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.13)',
  text:      '#e2e8f0',
  textSub:   '#64748b',
  textFaint: '#374151',
  indigo:    '#818cf8',
  indigoDim: 'rgba(129,140,248,0.15)',
  gold:      '#fbbf24',
  goldDim:   'rgba(251,191,36,0.15)',
  green:     '#4ade80',
  greenDim:  'rgba(74,222,128,0.15)',
  blue:      '#60a5fa',
  blueDim:   'rgba(96,165,250,0.15)',
  purple:    '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.15)',
  pink:      '#f472b6',
  pinkDim:   'rgba(244,114,182,0.15)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.15)'
}

const reportTypes = [
  {
    id: 'vehicle-summary',
    icon: <Car size={24} strokeWidth={1.5} />,
    title: 'Vehicle Summary Report',
    desc: 'Overview of all fleet vehicles including status, mileage, and assignments.',
    category: 'Fleet',
    color: D.indigo,
    bg: D.indigoDim,
  },
  {
    id: 'fuel-report',
    icon: <Fuel size={24} strokeWidth={1.5} />,
    title: 'Fuel Consumption Report',
    desc: 'Detailed fuel usage breakdown per vehicle, driver, and time period.',
    category: 'Fuel',
    color: D.gold,
    bg: D.goldDim,
  },
  {
    id: 'service-report',
    icon: <Wrench size={24} strokeWidth={1.5} />,
    title: 'Service & Maintenance Report',
    desc: 'Summary of all service records, costs, and upcoming maintenance schedules.',
    category: 'Maintenance',
    color: D.green,
    bg: D.greenDim,
  },
  {
    id: 'user-report',
    icon: <Users size={24} strokeWidth={1.5} />,
    title: 'User Activity Report',
    desc: 'User registration, role distribution, login history, and account statuses.',
    category: 'Users',
    color: D.blue,
    bg: D.blueDim,
  },
  {
    id: 'location-report',
    icon: <MapPin size={24} strokeWidth={1.5} />,
    title: 'Location & Route Report',
    desc: 'Vehicle location history, routes taken, and distance covered per vehicle.',
    category: 'Fleet',
    color: D.purple,
    bg: D.purpleDim,
  },
  {
    id: 'cost-report',
    icon: <DollarSign size={24} strokeWidth={1.5} />,
    title: 'Cost Analysis Report',
    desc: 'Full cost breakdown including fuel, maintenance, and operational expenses.',
    category: 'Finance',
    color: D.pink,
    bg: D.pinkDim,
  },
]

const recentReports = [
  { name: 'Vehicle Summary – Mar 2026',   generated: '2026-03-20', format: 'PDF',  size: '245 KB' },
  { name: 'Fuel Consumption – Feb 2026',  generated: '2026-03-01', format: 'Excel', size: '118 KB' },
  { name: 'User Activity – Q1 2026',      generated: '2026-03-15', format: 'PDF',  size: '312 KB' },
  { name: 'Service Summary – Feb 2026',   generated: '2026-03-02', format: 'PDF',  size: '198 KB' },
]

const SectionHeader = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, marginTop: 10 }}>
    <h2 style={{ margin: 0, fontSize: '1.15rem', color: D.text, fontWeight: 700 }}>{title}</h2>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
  </div>
)

const ReportsPage = () => {
  const [generating, setGenerating] = useState(null)

  const handleGenerate = (id) => {
    setGenerating(id)
    setTimeout(() => setGenerating(null), 1800)
  }

  return (
    <div className="app-shell dark-theme-wrapper" style={{ background: D.bg }}>
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
                  Generate comprehensive reports on fleet performance, fuel usage, and system activity.
                </p>
              </div>
            </div>
          </div>

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
          <SectionHeader title="Generate Reports" />
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
                    {generating === r.id ? '⏳ Generating…' : <><Download size={14} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}/> Generate PDF</>}
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
          <SectionHeader title="Recent Reports" />
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

      {/* ── Dark theme overrides for sidebar/topbar ─────────── */}
      <style>{`
        .dark-theme-wrapper .topbar { background: #161b27 !important; border-bottom-color: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .topbar-title { color: #e2e8f0 !important; }
        .dark-theme-wrapper .topbar-breadcrumb { color: #475569 !important; }
        .dark-theme-wrapper .topbar-user { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; }
        .dark-theme-wrapper .topbar-user:hover { background: rgba(99,102,241,0.15) !important; border-color: rgba(99,102,241,0.4) !important; }
        .dark-theme-wrapper .topbar-name { color: #e2e8f0 !important; }
        .dark-theme-wrapper .sidebar { background: #111827 !important; border-right-color: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-header { border-bottom-color: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-title { color: #f1f5f9 !important; }
        .dark-theme-wrapper .sidebar-subtitle { color: #475569 !important; }
        .dark-theme-wrapper .nav-section-label { color: #334155 !important; }
        .dark-theme-wrapper .nav-item { color: #64748b !important; }
        .dark-theme-wrapper .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: #cbd5e1 !important; }
        
        .dark-theme-wrapper .sidebar-divider { background: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-logout-btn { color: rgba(255,255,255,0.4) !important; }
        .dark-theme-wrapper .sidebar-logout-btn:hover { color: #f87171 !important; }
        .dark-theme-wrapper .sidebar-user-card { background: rgba(255,255,255,0.03) !important; }
        .dark-theme-wrapper .sidebar-footer { border-top-color: rgba(255,255,255,0.07) !important; }
      `}</style>
    </div>
  )
}

export default ReportsPage
