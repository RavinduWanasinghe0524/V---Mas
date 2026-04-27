import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

import { useAuth } from '../context/AuthContext'
import { vehicleAPI, employeeAPI } from '../services/api'

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
  green:     '#4ade80',
  greenDim:  'rgba(74,222,128,0.15)',
  blue:      '#60a5fa',
  blueDim:   'rgba(96,165,250,0.15)',
  orange:    '#f97316',
  orangeDim: 'rgba(249,115,22,0.15)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.15)',
  purple:    '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.15)',
}

const statusColors = {
  ACTIVE:    { bg: D.greenDim,  color: D.green,  border: 'rgba(74,222,128,0.3)' },
  AVAILABLE: { bg: D.blueDim,   color: D.blue,   border: 'rgba(96,165,250,0.3)' },
  SERVICE:   { bg: D.orangeDim, color: D.orange, border: 'rgba(249,115,22,0.3)' },
  INACTIVE:  { bg: D.redDim,    color: D.red,    border: 'rgba(248,113,113,0.3)' },
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1px solid rgba(255,255,255,0.1)`,
  fontSize: '0.85rem',
  color: D.text,
  background: 'rgba(255,255,255,0.05)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: '0.78rem',
  fontWeight: 700,
  color: D.textSub,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
}

const onFocus = e => {
  e.target.style.borderColor = 'rgba(99,102,241,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
  e.target.style.boxShadow = 'none'
}

const StatBadge = ({ label, value, icon, colorDim, colorHex }) => (
  <div style={{
    background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`,
    padding: '20px 22px', transition: 'all 0.25s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    flex: 1, minWidth: 200, cursor: 'default'
  }}
  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=D.borderHi; e.currentTarget.style.boxShadow=`0 8px 24px ${colorDim}` }}
  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=D.border; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</p>
        <p style={{ fontSize: '1.55rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>{value}</p>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: `0 4px 12px ${colorDim}`, flexShrink: 0, border: `1px solid ${colorHex}30` }}>
        {icon}
      </div>
    </div>
  </div>
)

const VehiclesPage = () => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const [employees, setEmployees] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [formData, setFormData] = useState({
    model: '',
    registrationNo: '',
    manufacturer: '',
    year: '',
    fuelType: '',
    driverId: '',
    currentMileageKm: ''
  })
  const [editFormData, setEditFormData] = useState({
    model: '',
    registrationNo: '',
    manufacturer: '',
    year: '',
    fuelType: '',
    driverId: '',
    currentMileageKm: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isAdmin) {
          const vehicleResponse = await vehicleAPI.getAllVehicles();
          setVehicles(vehicleResponse.data.data || [])
          const employeeResponse = await employeeAPI.getAllEmployees();
          setEmployees(employeeResponse.data.data || [])
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [isAdmin])

  const openModal = () => setIsModalOpen(true)

  const closeModal = () => {
    setIsModalOpen(false)
    setFormData({
      model: '',
      registrationNo: '',
      chassisNumber: '',
      manufacturer: '',
      year: '',
      fuelType: '',
      driverId: '',
      currentMileageKm: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await vehicleAPI.registerVehicle(formData)
      // Reload vehicles
      const response = await vehicleAPI.getAllVehicles();
      setVehicles(response.data.data || [])
      closeModal()
    } catch (err) {
      console.error('Error adding vehicle:', err)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle)
    setEditFormData({
      model: vehicle.model || '',
      registrationNo: vehicle.registrationNo || '',
      manufacturer: vehicle.manufacturer || '',
      year: vehicle.year || '',
      fuelType: vehicle.fuelType?.toUpperCase() || '',
      driverId: vehicle.driverId || '',
      currentMileageKm: vehicle.currentMileageKm || ''
    })
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingVehicle(null)
    setEditFormData({
      model: '',
      registrationNo: '',
      manufacturer: '',
      year: '',
      fuelType: '',
      driverId: '',
      currentMileageKm: ''
    })
  }

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await vehicleAPI.updateVehicle(editingVehicle.id, {
        model: editFormData.model,
        registrationNo: editFormData.registrationNo,
        manufacturer: editFormData.manufacturer,
        year: editFormData.year,
        fuelType: editFormData.fuelType.toUpperCase(),
        driverId: editFormData.driverId,
        currentMileageKm: editFormData.currentMileageKm
      })
      // Reload vehicles
      const response = await vehicleAPI.getAllVehicles()
      setVehicles(response.data.data || [])
      closeEditModal()
    } catch (err) {
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
    } catch (err) {
      console.error('Error deleting vehicle:', err)
    }
  }


  const filtered = vehicles.filter(v => {
    const matchSearch = v.reg?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()) ||
      v.registrationNo?.toLowerCase().includes(search.toLowerCase()) ||
      v.manufacturer?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || v.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    ACTIVE: vehicles.filter(v => v.status === 'ACTIVE').length,
    AVAILABLE: vehicles.filter(v => v.status === 'AVAILABLE').length,
    SERVICE: vehicles.filter(v => v.status === 'SERVICE').length,
    INACTIVE: vehicles.filter(v => v.status === 'INACTIVE').length,
  }

  return (
    <>
      <div className="app-shell dark-theme-wrapper" style={{ background: D.bg }}>
        <Sidebar />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="Vehicles" subtitle="Home / Vehicles" />
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
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display:'flex', alignItems:'center', justifyContent:'center', fontSize: '2rem', backdropFilter:'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  🚗
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Vehicle Fleet
                  </h1>
                  <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                    Manage and monitor all fleet vehicles in the system.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <StatBadge label="Total Vehicles" value={vehicles.length} icon="🚗" colorDim={D.purpleDim} colorHex={D.purple} />
              <StatBadge label="Active" value={counts.ACTIVE} icon="✅" colorDim={D.greenDim} colorHex={D.green} />
              <StatBadge label="In Service" value={counts.SERVICE} icon="🔧" colorDim={D.orangeDim} colorHex={D.orange} />
              <StatBadge label="Available" value={counts.AVAILABLE} icon="🟢" colorDim={D.blueDim} colorHex={D.blue} />
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', background: D.surface, padding: '14px 18px', borderRadius: 14, border: `1px solid ${D.border}` }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search by reg, make or model…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 36 }}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['ALL', 'ACTIVE', 'AVAILABLE', 'SERVICE', 'INACTIVE'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      padding: '8px 16px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700,
                      border: filter === s ? 'none' : `1px solid ${D.border}`,
                      background: filter === s ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.05)',
                      color: filter === s ? '#fff' : D.textSub,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: filter === s ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                    }}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <button 
                onClick={openModal}
                style={{
                  padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)' }}
              >
                + Add Vehicle
              </button>
            </div>

            {/* Table */}
            <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: D.surfaceHi }}>
                    <tr>
                      {['Reg. No.', 'Make / Model', 'Year', 'Fuel Type', 'Driver', 'Mileage (km)', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '60px 32px', textAlign: 'center', color: D.textSub }}>
                          <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.3 }}>🚗</div>
                          <p style={{ fontWeight: 700, fontSize: '1rem', color: D.text, margin: '0 0 6px' }}>No vehicles found.</p>
                          <p style={{ margin: 0, fontSize: '0.85rem' }}>Try adjusting your search or filters.</p>
                        </td>
                      </tr>
                    ) : filtered.map((v, i) => {
                      const s = statusColors[v.status] || { bg: 'rgba(255,255,255,0.05)', color: D.textSub, border: D.border }
                      return (
                        <tr key={v.id} style={{ borderBottom: `1px solid ${D.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: D.blue }}>{v.registrationNo ?? 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: D.text, fontWeight: 600 }}>{v.manufacturer ?? 'N/A'} {v.model ?? 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: D.textSub }}>{v.year ?? 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: D.textSub }}>{v.fuelType ?? 'N/A'}</td>
                          <td style={{ padding: '14px 16px', color: D.text }}>{v.driverName ?? '—'}</td>
                          <td style={{ padding: '14px 16px', color: D.textSub }}>{v.currentMileageKm ? `${v.currentMileageKm} km` : 'N/A'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', border: `1px solid ${s.border}` }}>
                              {v.status ?? 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => openEditModal(v)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'; e.currentTarget.style.color='#a5b4fc' }}
                                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor=D.border; e.currentTarget.style.color=D.text }}>
                                ✏️ Edit
                              </button>
                              <button onClick={() => openDeleteModal(v)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background='rgba(248,113,113,0.2)' }}
                                onMouseLeave={e => { e.currentTarget.style.background='rgba(248,113,113,0.1)' }}>
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* ── Add Modal ──────────────────────────────────────────────── */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 540, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
              <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: D.purpleDim, border: `1px solid ${D.purple}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🚗</div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Add New Vehicle</h3>
                </div>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: D.textSub, padding: 4 }}>✕</button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
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
                    <input type="text" name="registrationNo" value={formData.registrationNo} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. WP-CAB-1234" />
                  </div>
                  <div>
                    <label style={labelStyle}>Year <span style={{ color: D.red }}>*</span></label>
                    <input type="number" min={1985} name="year" value={formData.year} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 2020" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type <span style={{ color: D.red }}>*</span></label>
                    <select name="fuelType" value={formData.fuelType} onChange={handleChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Fuel Type</option>
                      <option value="Petrol" style={{ background: D.surfaceHi }}>Petrol</option>
                      <option value="Diesel" style={{ background: D.surfaceHi }}>Diesel</option>
                      <option value="Electric" style={{ background: D.surfaceHi }}>Electric</option>
                      <option value="Hybrid" style={{ background: D.surfaceHi }}>Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Current Mileage (km) <span style={{ color: D.red }}>*</span></label>
                    <input type="number" name="currentMileageKm" value={formData.currentMileageKm} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 15000" />
                  </div>
                  <div>
                    <label style={labelStyle}>Assign Driver <span style={{ color: D.textFaint, fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                    <select name="driverId" value={formData.driverId} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Unassigned</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id} style={{ background: D.surfaceHi }}>{emp.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                    ✓ Add Vehicle
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 540, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
              <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: D.indigoDim, border: `1px solid ${D.indigo}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✏️</div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Edit Vehicle</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: D.textSub }}>{editingVehicle?.registrationNo}</p>
                  </div>
                </div>
                <button onClick={closeEditModal} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: D.textSub, padding: 4 }}>✕</button>
              </div>

              <form onSubmit={handleEditSubmit} style={{ padding: '24px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
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
                    <input type="text" name="registrationNo" value={editFormData.registrationNo} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Year</label>
                    <input type="number" min={1985} name="year" value={editFormData.year} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fuel Type</label>
                    <select name="fuelType" value={editFormData.fuelType} onChange={handleEditChange} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Select Fuel Type</option>
                      <option value="PETROL" style={{ background: D.surfaceHi }}>Petrol</option>
                      <option value="DIESEL" style={{ background: D.surfaceHi }}>Diesel</option>
                      <option value="ELECTRIC" style={{ background: D.surfaceHi }}>Electric</option>
                      <option value="HYBRID" style={{ background: D.surfaceHi }}>Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Current Mileage (km)</label>
                    <input type="number" name="currentMileageKm" value={editFormData.currentMileageKm} onChange={handleEditChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Assign Driver</label>
                    <select name="driverId" value={editFormData.driverId} onChange={handleEditChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" style={{ background: D.surfaceHi }}>Unassigned</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id} style={{ background: D.surfaceHi }}>{emp.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                    ✓ Save Changes
                  </button>
                  <button type="button" onClick={closeEditModal} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Delete Modal ───────────────────────────────────────────── */}
        {isDeleteModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: D.surface, borderRadius: 20, padding: 36, width: '90%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: D.redDim, border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>⚠️</div>
              <h3 style={{ margin: '0 0 10px', fontWeight: 800, color: D.text, fontSize: '1.1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Confirm Deletion</h3>
              <p style={{ margin: '0 0 24px', color: D.textSub, fontSize: '0.9rem', lineHeight: 1.6 }}>
                Are you sure you want to delete vehicle <strong style={{ color: D.text }}>{deletingVehicle?.registrationNo}</strong> ({deletingVehicle?.manufacturer} {deletingVehicle?.model})? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={closeDeleteModal} style={{ flex: 1, padding: '10px 20px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.15s' }}>Cancel</button>
                <button type="button" onClick={handleDeleteConfirm} style={{ flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none', background: D.red, color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        )}
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
    </>
  )
}

export default VehiclesPage
