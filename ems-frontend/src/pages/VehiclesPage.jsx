import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

import { useAuth } from '../context/AuthContext'
import { vehicleAPI, employeeAPI } from '../services/api'

let vehicles = []

const statusColors = {
  ACTIVE: { bg: '#d1fae5', color: '#065f46' },
  AVAILABLE: { bg: '#dbeafe', color: '#1e40af' },
  SERVICE: { bg: '#fef3c7', color: '#92400e' },
  INACTIVE: { bg: '#fee2e2', color: '#991b1b' },
}

const StatBadge = ({ label, value, icon, color }) => (
  <div className="stat-card" style={{ flex: 1 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
      <div>
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
      </div>
      <div className={`stat-card-icon ${color}`}>{icon}</div>
    </div>
  </div>
)

const VehiclesPage = () => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
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


  const filtered = vehicles.filter(v => {
    const matchSearch = v.reg?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase())
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
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Topbar title="Vehicles" subtitle="Home / Vehicles" />
          <div className="page-body">

            {/* Welcome banner */}
            <div className="welcome-banner">
              <div className="welcome-text">
                <h1>Vehicle Fleet 🚗</h1>
                <p>Manage and monitor all fleet vehicles in the system.</p>
              </div>
              <div className="welcome-icon">🚗</div>
            </div>

            {/* Stats row */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <StatBadge label="Total Vehicles" value={vehicles.length} icon="🚗" color="icon-purple" />
              <StatBadge label="Active" value={counts.ACTIVE} icon="✅" color="icon-green" />
              <StatBadge label="In Service" value={counts.SERVICE} icon="🔧" color="icon-orange" />
              <StatBadge label="Available" value={counts.AVAILABLE} icon="🟢" color="icon-blue" />
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by reg, make or model…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8,
                  border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none',
                  fontFamily: 'inherit', color: '#374151', background: '#fff',
                }}
              />
              {['ALL', 'ACTIVE', 'AVAILABLE', 'SERVICE', 'INACTIVE'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                    border: filter === s ? 'none' : '1.5px solid #e5e7eb',
                    background: filter === s ? '#6366f1' : '#fff',
                    color: filter === s ? '#fff' : '#6b7280',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
              <button className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={openModal}>
                + Add Vehicle
              </button>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1.5px solid #f0f0f0' }}>
                    {['Reg. No.', 'Make / Model', 'Year', 'Fuel', 'Driver', 'Mileage (km)', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No vehicles found.</td>
                    </tr>
                  ) : filtered.map((v, i) => {
                    const s = statusColors[v.status] || {}
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#6366f1' }}>{v.registrationNo ?? 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: '#374151' }}>{v.manufacturer ?? 'N/A'} {v.model ?? 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{v.year ?? 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{v.fuel ?? 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: '#374151' }}>{v.driverName ?? 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{v.currentMileageKm ?? 'N/A'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {v.status ?? 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                            <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff5f5', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
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

      {
        isModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '90%', maxWidth: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginBottom: 20, color: '#374151' }}>Add New Vehicle</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Model</label>
                  <input type="text" name="model" value={formData.model} onChange={handleChange} required style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Registration Number</label>
                  <input type="text" name="registrationNo" value={formData.registrationNo} onChange={handleChange} required style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Chassis Number</label>
                  <input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} required style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} required style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Year</label>
                  <input type="number" min={1985} name="year" value={formData.year} onChange={handleChange} required style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Fuel Type</label>
                  <select name="fuelType" value={formData.fuelType} onChange={handleChange} required style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }}>
                    <option value="">Select Fuel Type</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Driver</label>
                  <select name="driverId" value={formData.driverId} onChange={handleChange} style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }}>
                    <option value="">Select Driver</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Current Mileage</label>
                  <input type="number" name="currentMileageKm" value={formData.currentMileageKm} onChange={handleChange} required style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#374151' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={closeModal} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Add Vehicle</button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </>
  )
}

export default VehiclesPage
