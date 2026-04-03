import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { serviceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const statusColors = {
  SCHEDULED:   { bg: '#dbeafe', color: '#1e40af' },
  COMPLETED:   { bg: '#d1fae5', color: '#065f46' },
}

const ServicePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDriver = user?.role === 'DRIVER'

  const [services, setServices] = useState([])
  const [stats, setStats]       = useState(null)
  const [filter, setFilter]     = useState('ALL')
  const [search, setSearch]     = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [servicesRes, statsRes] = await Promise.all([
        serviceAPI.getAllServices(),
        serviceAPI.getServiceStats(),
      ])
      setServices(servicesRes.data.data || [])
      setStats(statsRes.data.data)
    } catch (err) {
      console.error('Error loading service data', err)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service record?')) {
      try {
        await serviceAPI.deleteService(id)
        loadData()
      } catch (err) {
        console.error('Error deleting service', err)
        alert('Failed to delete service record.')
      }
    }
  }

  const getStatus = (s) => {
    const today = new Date()
    const scheduled = new Date(s.serviceDate)
    return scheduled > today ? 'SCHEDULED' : 'COMPLETED'
  }

  const filtered = services.filter(s => {
    if (filter !== 'ALL' && getStatus(s) !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.vehicleRegNumber?.toLowerCase().includes(q) ||
        s.serviceType?.toLowerCase().includes(q) ||
        s.technicianWorkshop?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isDriver ? 'Service History' : 'Service'}
          subtitle={`Home / ${isDriver ? 'Service History' : 'Service'}`}
        />
        <div className="page-body">

          {/* Welcome banner */}
          <div className="welcome-banner">
            <div className="welcome-text">
              <h1>{isDriver ? 'Service History 🔧' : 'Service & Maintenance 🔧'}</h1>
              <p>
                {isDriver
                  ? 'View past service and maintenance history.'
                  : 'Track and manage all vehicle service appointments and maintenance records.'}
              </p>
            </div>
            <div className="welcome-icon">🔧</div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p className="stat-card-label">Total Records</p>
                    <p className="stat-card-value">{stats.totalServiceRecords}</p>
                  </div>
                  <div className="stat-card-icon icon-blue">📋</div>
                </div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p className="stat-card-label">Total Cost (LKR)</p>
                    <p className="stat-card-value">{(stats.totalServiceCost || 0).toLocaleString()}</p>
                  </div>
                  <div className="stat-card-icon icon-purple">💰</div>
                </div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p className="stat-card-label">Scheduled</p>
                    <p className="stat-card-value">{services.filter(s => getStatus(s) === 'SCHEDULED').length}</p>
                  </div>
                  <div className="stat-card-icon icon-blue">🗓️</div>
                </div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p className="stat-card-label">Completed</p>
                    <p className="stat-card-value">{services.filter(s => getStatus(s) === 'COMPLETED').length}</p>
                  </div>
                  <div className="stat-card-icon icon-green">✅</div>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar: filters + search + add */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {['ALL', 'SCHEDULED', 'COMPLETED'].map(s => (
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
                {s.replace('_', ' ')}
              </button>
            ))}

            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by plate / type / workshop…"
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem',
                border: '1.5px solid #e5e7eb', outline: 'none', minWidth: 220,
              }}
            />

            {/* Add button — visible to ADMIN & CONTROLLER only */}
            {!isDriver && (
              <button
                onClick={() => navigate('/service/add')}
                className="btn btn-primary btn-sm"
                style={{ marginLeft: 'auto', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                + Add Service Record
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1.5px solid #f0f0f0' }}>
                  {['#', 'License Plate', 'Service Type', 'Workshop', 'Date', 'Mileage (km)', 'Cost (LKR)', 'Status', ...(isDriver ? [] : ['Actions'])].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isDriver ? 8 : 9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                      No records found.
                    </td>
                  </tr>
                ) : filtered.map((s, i) => {
                  const status = getStatus(s)
                  const sc = statusColors[status] || statusColors.COMPLETED
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.12s' }}>
                      <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '0.78rem' }}>{i + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#6366f1' }}>{s.vehicleRegNumber || '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{s.serviceType?.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.technicianWorkshop || '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{s.serviceDate ? s.serviceDate.substring(0, 10) : '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.currentMileageKm?.toLocaleString() || '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600 }}>{(s.serviceCost || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {status}
                        </span>
                      </td>
                      {!isDriver && (
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => navigate(`/service/edit/${s.id}`)}
                              style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                              ✏ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff5f5', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div style={{ marginTop: 12, fontSize: '0.78rem', color: '#9ca3af', textAlign: 'right' }}>
            Showing {filtered.length} of {services.length} records
          </div>

        </div>
      </div>
    </div>
  )
}

export default ServicePage
