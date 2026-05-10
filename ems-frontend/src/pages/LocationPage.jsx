import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useD } from '../context/ThemeContext'
import { MapPin, Car, Circle, ParkingSquare, Radio, Clock, Zap } from 'lucide-react'

const vehicles = [
  { id: 1, reg: 'WP-CAB-1234', driver: 'Kamal Perera',   status: 'MOVING',  speed: 58,   location: 'Colombo 07, Rosmead Pl', lat: 6.902, lng: 79.875, lastUpdate: '2 min ago' },
  { id: 2, reg: 'WP-CAB-5678', driver: 'Nimal Silva',    status: 'IDLE',    speed: 0,    location: 'Nugegoda, High Level Rd', lat: 6.871, lng: 79.896, lastUpdate: '5 min ago' },
  { id: 3, reg: 'SP-7890',     driver: 'ÔÇö',              status: 'PARKED',  speed: 0,    location: 'Kandy City Centre',       lat: 7.291, lng: 80.636, lastUpdate: '1 hr ago'  },
  { id: 4, reg: 'WP-CAB-9012', driver: 'Sunil Fernando', status: 'MOVING',  speed: 72,   location: 'Galle Road, Dehiwala',   lat: 6.848, lng: 79.867, lastUpdate: '1 min ago' },
]


const LocationPage = () => {
  const D = useD()
  const statusColors = {
    MOVING: { bg: D.greenDim,  color: D.green,  dot: '#10b981' },
    IDLE:   { bg: D.goldDim,   color: D.gold,   dot: '#f59e0b' },
    PARKED: { bg: D.indigoDim, color: D.indigo, dot: '#6366f1' },
  }
  const [selected, setSelected] = useState(null)

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="Location" subtitle="Home / Location" />
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
            {[['80%','ÔêÆ20px','180px','rgba(255,255,255,0.03)'],['20%','60%','120px','rgba(255,255,255,0.04)'],['55%','80%','90px','rgba(255,255,255,0.02)']].map(([t,l,s,bg],i) => (
              <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display:'flex', alignItems:'center', justifyContent:'center', color: '#fff', backdropFilter:'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <MapPin size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Live Location Tracking
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                  Real-time GPS tracking for all fleet vehicles. Monitor routes and locations.
                </p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Moving',  value: vehicles.filter(v => v.status === 'MOVING').length,  icon: <Car size={20} />, colorDim: D.greenDim, colorHex: D.green },
              { label: 'Idle',    value: vehicles.filter(v => v.status === 'IDLE').length,    icon: <Circle size={20} />, colorDim: D.goldDim, colorHex: D.gold },
              { label: 'Parked',  value: vehicles.filter(v => v.status === 'PARKED').length,  icon: <ParkingSquare size={20} />, colorDim: D.indigoDim, colorHex: D.indigo },
              { label: 'Tracked', value: vehicles.length,                                      icon: <Radio size={20} />, colorDim: D.purpleDim, colorHex: D.purple },
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

          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
            {/* Vehicle list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: '0 0 4px', fontWeight: 700, color: D.text, fontSize: '0.95rem' }}>Fleet Vehicles</h3>
              {vehicles.map(v => {
                const sc = statusColors[v.status]
                const isSelected = selected?.id === v.id
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelected(v)}
                    style={{
                      background: D.surface, borderRadius: 14,
                      border: `1px solid ${isSelected ? 'rgba(99,102,241,0.5)' : D.border}`,
                      padding: '16px', cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 0 2px rgba(99,102,241,0.2)' : '0 4px 20px rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                    }}
                    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = D.surfaceHi }}
                    onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = D.surface }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: isSelected ? '#a5b4fc' : D.text, fontSize: '0.95rem' }}>{v.reg}</div>
                        <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4 }}>{v.driver}</div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${sc.color}30` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block', boxShadow: `0 0 6px ${sc.dot}` }} />
                        {v.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: D.textSub, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ color: D.text, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {v.location}</span>
                      {v.speed > 0 && <span style={{ color: D.text, display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} /> {v.speed} km/h</span>}
                      <span style={{ color: D.textFaint, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {v.lastUpdate}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Map placeholder */}
            <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', overflow: 'hidden', minHeight: 440 }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem' }}>
                    {selected ? `Tracking: ${selected.reg}` : 'Interactive Map'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: D.textSub }}>
                    {selected ? selected.location : 'Select a vehicle to focus on it'}
                  </p>
                </div>
                {selected && (
                  <button onClick={() => setSelected(null)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                    Clear
                  </button>
                )}
              </div>

              {/* Stylized dark map */}
              <div style={{ position: 'relative', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0d1117 100%)', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

                {/* Grid lines for map feel */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <g key={i}>
                      <line x1={`${i * 11}%`} y1="0" x2={`${i * 11}%`} y2="100%" stroke="#6366f1" strokeWidth="1" />
                      <line x1="0" y1={`${i * 11}%`} x2="100%" y2={`${i * 11}%`} stroke="#6366f1" strokeWidth="1" />
                    </g>
                  ))}
                  <circle cx="50%" cy="50%" r="30%" stroke="#4338ca" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="4 4" />
                  <circle cx="50%" cy="50%" r="45%" stroke="#4338ca" strokeWidth="1" fill="none" opacity="0.1" />
                </svg>

                {/* Pins */}
                <div style={{ position: 'relative', width: '100%', height: 300 }}>
                  {vehicles.map(v => {
                    const sc = statusColors[v.status]
                    const isHighlighted = !selected || selected.id === v.id
                    // Normalize lat/lng to container (rough mapping)
                    const left = ((v.lng - 79.5) / 1.5) * 85 + 8
                    const top  = ((8.0 - v.lat)  / 2.0) * 85 + 5
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelected(v)}
                        style={{
                          position: 'absolute',
                          left: `${left}%`, top: `${top}%`,
                          cursor: 'pointer',
                          opacity: isHighlighted ? 1 : 0.15,
                          transition: 'all 0.3s ease',
                          transform: `translate(-50%, -50%) ${isHighlighted && selected?.id === v.id ? 'scale(1.1)' : 'scale(1)'}`,
                          zIndex: isHighlighted ? 2 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            background: sc.dot, color: '#fff', borderRadius: '50% 50% 50% 0', width: 28, height: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.85rem', boxShadow: `0 0 15px ${sc.dot}80`,
                            transform: 'rotate(-45deg)',
                            border: selected?.id === v.id ? '2px solid #fff' : `1px solid ${D.border}`,
                          }}>
                            <Car size={16} style={{ transform: 'rotate(45deg)' }} />
                          </div>
                          <div style={{ background: 'rgba(15,23,42,0.85)', borderRadius: 6, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 700, color: D.text, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: `1px solid ${D.borderHi}`, backdropFilter: 'blur(4px)' }}>
                            {v.reg}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ position: 'absolute', bottom: 16, right: 16, fontSize: '0.72rem', color: '#a5b4fc', background: 'rgba(15,23,42,0.7)', border: `1px solid rgba(99,102,241,0.2)`, padding: '6px 12px', borderRadius: 8, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={12} /> Live positions ÔÇö updates every 30s
                </div>
              </div>

              {/* Selected vehicle info */}
              {selected && (
                <div style={{ padding: '16px 20px', borderTop: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.83rem' }}>
                  {[
                    ['Vehicle',  selected.reg],
                    ['Driver',   selected.driver],
                    ['Location', selected.location],
                    ['Speed',    selected.speed > 0 ? `${selected.speed} km/h` : 'Stationary'],
                    ['Updated',  selected.lastUpdate],
                  ].map(([k, vv]) => (
                    <div key={k}>
                      <div style={{ color: D.textSub, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                      <div style={{ color: D.text, fontWeight: 600, marginTop: 4 }}>{vv}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default LocationPage
