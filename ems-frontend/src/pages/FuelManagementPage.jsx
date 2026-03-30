import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { fuelAPI } from '../services/api'

const FuelManagementPage = () => {
  const { user } = useAuth()
  
  // State
  const [allLogs, setAllLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'add', or 'deleted'
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFuelType, setFilterFuelType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Form state
  const [formData, setFormData] = useState({
    vehicleRegNumber: '',
    fuelType: 'Diesel',
    liters: '',
    costPerLiter: '',
    mileage: '',
    date: new Date().toISOString().split('T')[0],
    driverUsername: ''
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Edit/Delete states
  const [editingLog, setEditingLog] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingLog, setDeletingLog] = useState(null)

  // Statistics
  const [stats, setStats] = useState({
    totalLogs: 0,
    totalFuel: 0,
    totalCost: 0,
    avgEfficiency: 0,
    vehicleCount: 0
  })

  // Load all fuel logs
  useEffect(() => {
    loadAllLogs()
  }, [])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [allLogs, searchTerm, filterFuelType, filterStatus, activeTab])

  const loadAllLogs = async () => {
    try {
      setLoading(true)
      // Use the dedicated controller endpoint: GET /api/fuel/all
      const res = await fuelAPI.getAllFuelLogs()
      const logs = res.data.data || []
      // Stats use only active (non-deleted) logs
      const activeLogs = logs.filter(l => !l.isDeleted)
      const vehicleCount = [...new Set(activeLogs.map(l => l.vehicleRegNumber))].length
      setAllLogs(logs)
      calculateStats(activeLogs, vehicleCount)
    } catch (error) {
      console.error('Error loading fuel logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (logs, vehicleCount) => {
    const totalFuel = logs.reduce((sum, log) => sum + log.liters, 0)
    const totalCost = logs.reduce((sum, log) => sum + log.totalCost, 0)
    const logsWithEfficiency = logs.filter(log => log.fuelEfficiency && log.fuelEfficiency > 0)
    const avgEfficiency = logsWithEfficiency.length > 0
      ? logsWithEfficiency.reduce((sum, log) => sum + log.fuelEfficiency, 0) / logsWithEfficiency.length
      : 0
    
    setStats({
      totalLogs: logs.length,
      totalFuel,
      totalCost,
      avgEfficiency,
      vehicleCount
    })
  }

  const applyFilters = () => {
    let filtered = [...allLogs]

    // For the deleted tab, only show soft-deleted logs
    if (activeTab === 'deleted') {
      setFilteredLogs(filtered.filter(log => log.isDeleted))
      return
    }

    // For the 'all' tab, hide soft-deleted logs
    filtered = filtered.filter(log => !log.isDeleted)

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.vehicleRegNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Fuel type filter
    if (filterFuelType !== 'all') {
      filtered = filtered.filter(log => log.fuelType === filterFuelType)
    }

    // Status filter (based on efficiency)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => {
        if (!log.fuelEfficiency) return filterStatus === 'na'
        if (filterStatus === 'excellent') return log.fuelEfficiency > 10
        if (filterStatus === 'good') return log.fuelEfficiency > 7 && log.fuelEfficiency <= 10
        if (filterStatus === 'average') return log.fuelEfficiency > 5 && log.fuelEfficiency <= 7
        if (filterStatus === 'poor') return log.fuelEfficiency <= 5
        return true
      })
    }

    setFilteredLogs(filtered)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (editingLog) {
      setEditingLog(prev => ({ ...prev, [name]: value }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleAddFuelLog = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const payload = {
        vehicleRegNumber: formData.vehicleRegNumber,
        fuelType: formData.fuelType,
        liters: parseFloat(formData.liters),
        costPerLiter: parseFloat(formData.costPerLiter),
        mileage: parseFloat(formData.mileage),
        date: formData.date,
        driverUsername: formData.driverUsername || undefined
      }
      
      // Use controller-scoped add endpoint: POST /api/fuel/controller/add
      await fuelAPI.controllerAddLog(payload)
      
      // Reset form and reload
      setFormData({
        vehicleRegNumber: '',
        fuelType: 'Diesel',
        liters: '',
        costPerLiter: '',
        mileage: '',
        date: new Date().toISOString().split('T')[0],
        driverUsername: ''
      })
      setActiveTab('all')
      await loadAllLogs()
      
      alert('✅ Fuel log added successfully!')
    } catch (error) {
      console.error('Error adding fuel log:', error)
      alert('❌ Failed to add fuel log: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (log) => {
    setEditingLog({
      ...log,
      date: log.date.split('T')[0]
    })
  }

  const handleCancelEdit = () => {
    setEditingLog(null)
  }

  const handleSaveEdit = async () => {
    if (!editingLog) return
    setSubmitting(true)
    try {
      const payload = {
        vehicleRegNumber: editingLog.vehicleRegNumber,
        fuelType: editingLog.fuelType,
        liters: parseFloat(editingLog.liters),
        costPerLiter: parseFloat(editingLog.costPerLiter),
        mileage: parseFloat(editingLog.mileage),
        date: editingLog.date,
        driverUsername: editingLog.driverUsername || undefined
      }
      // Use controller update endpoint: PUT /api/fuel/controller/{id}
      await fuelAPI.controllerUpdateLog(editingLog.id, payload)
      setEditingLog(null)
      await loadAllLogs()
      alert('✅ Fuel log updated successfully!')
    } catch (error) {
      console.error('Error updating fuel log:', error)
      alert('❌ Failed to update: ' + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (log) => {
    setDeletingLog(log)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingLog) return
    try {
      // Use controller delete endpoint: DELETE /api/fuel/controller/{id}
      await fuelAPI.controllerDeleteLog(deletingLog.id)
      setShowDeleteModal(false)
      setDeletingLog(null)
      await loadAllLogs()
      alert('✅ Fuel log deleted successfully!')
    } catch (error) {
      console.error('Error deleting fuel log:', error)
      alert('❌ Failed to delete: ' + (error.response?.data?.message || error.message))
      setShowDeleteModal(false)
      setDeletingLog(null)
    }
  }

  const getEfficiencyBadge = (efficiency) => {
    if (!efficiency) return { text: 'N/A', class: 'badge-secondary' }
    if (efficiency > 10) return { text: 'Excellent', class: 'badge-success' }
    if (efficiency > 7) return { text: 'Good', class: 'badge-primary' }
    if (efficiency > 5) return { text: 'Average', class: 'badge-warning' }
    return { text: 'Poor', class: 'badge-danger' }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Topbar title="Fuel Management" subtitle="Home / Fuel Management" />
          <div className="page-body">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <span>Loading fuel data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Fuel Management" subtitle="Home / Fuel Management" />
        <div className="page-body">

          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="welcome-text">
              <h1>Fuel Management ⛽</h1>
              <p>Monitor, manage, and analyze fuel consumption across the entire fleet.</p>
            </div>
            <div className="welcome-icon">⛽</div>
          </div>

          {/* Tabs */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #f0f0f0' }}>
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'all' ? '3px solid #6366f1' : '3px solid transparent',
                  color: activeTab === 'all' ? '#6366f1' : '#6b7280',
                  fontWeight: activeTab === 'all' ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '-2px'
                }}
              >
                📊 All Fuel Logs
              </button>
              <button
                onClick={() => setActiveTab('add')}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'add' ? '3px solid #6366f1' : '3px solid transparent',
                  color: activeTab === 'add' ? '#6366f1' : '#6b7280',
                  fontWeight: activeTab === 'add' ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '-2px'
                }}
              >
                ➕ Add Fuel Log
              </button>
              <button
                onClick={() => setActiveTab('deleted')}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'deleted' ? '3px solid #ef4444' : '3px solid transparent',
                  color: activeTab === 'deleted' ? '#ef4444' : '#6b7280',
                  fontWeight: activeTab === 'deleted' ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '-2px'
                }}
              >
                🗑️ Deleted Logs
                <span style={{
                  marginLeft: 8,
                  background: activeTab === 'deleted' ? '#ef4444' : '#e5e7eb',
                  color: activeTab === 'deleted' ? '#fff' : '#6b7280',
                  borderRadius: 10,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 7px'
                }}>
                  {allLogs.filter(l => l.isDeleted).length}
                </span>
              </button>
            </div>
          </div>

          {/* All Fuel Logs tab */}
          {activeTab === 'all' && (
            <>
              <div className="stats-grid" style={{ marginBottom: 24 }}>
                {[
                  { label: 'Total Logs', value: stats.totalLogs.toLocaleString(), icon: '📋', color: 'icon-purple' },
                  { label: 'Total Fuel (L)', value: stats.totalFuel.toFixed(1), icon: '⛽', color: 'icon-orange' },
                  { label: 'Total Cost (LKR)', value: `Rs. ${Math.round(stats.totalCost).toLocaleString()}`, icon: '💰', color: 'icon-green' },
                  { label: 'Avg Efficiency', value: stats.avgEfficiency > 0 ? `${stats.avgEfficiency.toFixed(2)} km/L` : 'N/A', icon: '📊', color: 'icon-indigo' },
                  { label: 'Vehicles', value: stats.vehicleCount.toLocaleString(), icon: '🚗', color: 'icon-blue' },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div><p className="stat-card-label">{s.label}</p><p className="stat-card-value">{s.value}</p></div>
                      <div className={`stat-card-icon ${s.color}`}>{s.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <input
                    type="text"
                    placeholder="🔍 Search by vehicle registration..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1.5px solid #d1d5db',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <select
                    value={filterFuelType}
                    onChange={(e) => setFilterFuelType(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1.5px solid #d1d5db',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      minWidth: 150
                    }}
                  >
                    <option value="all">All Fuel Types</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1.5px solid #d1d5db',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      minWidth: 150
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="average">Average</option>
                    <option value="poor">Poor</option>
                    <option value="na">N/A</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterFuelType('all')
                    setFilterStatus('all')
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Clear Filters
                </button>
              </div>

              {/* Fuel Logs Table */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>
                    Fleet Fuel Logs ({filteredLogs.length})
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                    Manage and monitor all fuel entries
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {filteredLogs.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: '3rem', marginBottom: 12 }}>⛽</div>
                      <p style={{ fontWeight: 600, marginBottom: 6 }}>No fuel logs found</p>
                      <p style={{ fontSize: '0.85rem' }}>Try adjusting your filters or add a new fuel log.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ background: '#f9fafb' }}>
                        <tr style={{ borderBottom: '1.5px solid #f0f0f0' }}>
                          {['Vehicle', 'Date', 'Fuel Type', 'Liters', 'Cost/L', 'Total Cost', 'Mileage', 'Efficiency', 'Record Status', 'Actions'].map(h => (
                            <th key={h} style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 700,
                              color: '#374151',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log, i) => (
                          <tr key={log.id} style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: i % 2 === 0 ? '#fff' : '#fafafa',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                          >
                            <td style={{ padding: '14px 16px', fontWeight: 600, color: '#6366f1' }}>
                              {log.vehicleRegNumber}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#374151' }}>
                              {new Date(log.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: log.fuelType === 'Diesel' ? '#eef2ff' : '#fff7ed',
                                color: log.fuelType === 'Diesel' ? '#6366f1' : '#f59e0b'
                              }}>
                                {log.fuelType}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#374151', fontWeight: 600 }}>{log.liters.toFixed(2)} L</td>
                            <td style={{ padding: '14px 16px', color: '#6b7280' }}>Rs. {log.costPerLiter.toFixed(2)}</td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>Rs. {log.totalCost.toLocaleString()}</td>
                            <td style={{ padding: '14px 16px', color: '#6b7280' }}>{log.mileage.toFixed(1)} km</td>
                            <td style={{ padding: '14px 16px' }}>
                              {log.fuelEfficiency ? (
                                <span style={{
                                  fontWeight: 700,
                                  color: log.fuelEfficiency > 10 ? '#10b981' : log.fuelEfficiency > 5 ? '#6366f1' : '#f59e0b'
                                }}>
                                  {log.fuelEfficiency.toFixed(2)} km/L
                                </span>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>
                            {/* Record Status column */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {log.isUpdated ? (
                                  <span title={log.updatedAt ? `Updated: ${new Date(log.updatedAt).toLocaleString()}` : 'Updated'} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '3px 9px',
                                    borderRadius: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background: '#eef2ff',
                                    color: '#6366f1',
                                    border: '1px solid #c7d2fe',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    ✏️ Updated
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '3px 9px',
                                    borderRadius: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: '#f0fdf4',
                                    color: '#16a34a',
                                    border: '1px solid #bbf7d0',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    ✅ Original
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => handleEditClick(log)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #d1d5db',
                                    background: '#fff',
                                    color: '#6366f1',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(log)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #fecaca',
                                    background: '#fff',
                                    color: '#ef4444',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                                >
                                  🗑️ Delete
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
            </>
          )}

          {/* Deleted Logs tab */}
          {activeTab === 'deleted' && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#ef4444', fontSize: '0.95rem' }}>
                    🗑️ Soft-Deleted Fuel Logs ({filteredLogs.length})
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                    These records have been marked as deleted. They are retained for audit purposes.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗑️</div>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>No deleted logs</p>
                    <p style={{ fontSize: '0.85rem' }}>No fuel logs have been deleted yet.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#fef2f2' }}>
                      <tr style={{ borderBottom: '1.5px solid #fecaca' }}>
                        {['Vehicle', 'Fuel Type', 'Liters', 'Total Cost', 'Date', 'Driver', 'Deleted At'].map(h => (
                          <th key={h} style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 700,
                            color: '#991b1b',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, i) => (
                        <tr key={log.id} style={{
                          borderBottom: '1px solid #fee2e2',
                          background: i % 2 === 0 ? '#fff5f5' : '#fff',
                          opacity: 0.85
                        }}>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: '#dc2626' }}>
                            {log.vehicleRegNumber}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: '#fee2e2',
                              color: '#dc2626'
                            }}>
                              {log.fuelType}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6b7280' }}>{log.liters.toFixed(2)} L</td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#374151' }}>Rs. {log.totalCost.toLocaleString()}</td>
                          <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                            {new Date(log.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6b7280' }}>{log.driverUsername || '—'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            {log.deletedAt ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 20,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                whiteSpace: 'nowrap'
                              }}>
                                🗑️ {new Date(log.deletedAt).toLocaleString()}
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Add Fuel Log Form */}
          {activeTab === 'add' && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: 28 }}>
              <h3 style={{ margin: '0 0 20px', fontWeight: 700, color: '#111827', fontSize: '1rem' }}>Add New Fuel Log Entry</h3>
              
              <form onSubmit={handleAddFuelLog}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Vehicle Registration Number *
                    </label>
                    <input 
                      type="text" 
                      name="vehicleRegNumber" 
                      value={formData.vehicleRegNumber} 
                      onChange={handleInputChange}
                      required 
                      placeholder="e.g., WP-CAB-1234"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Fuel Type *
                    </label>
                    <select 
                      name="fuelType" 
                      value={formData.fuelType} 
                      onChange={handleInputChange}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Diesel">⛽ Diesel</option>
                      <option value="Petrol">⛽ Petrol</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Liters *
                    </label>
                    <input 
                      type="number" 
                      name="liters" 
                      value={formData.liters} 
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g., 45.5"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Cost per Liter (LKR) *
                    </label>
                    <input 
                      type="number" 
                      name="costPerLiter" 
                      value={formData.costPerLiter} 
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g., 380.00"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Current Mileage (km) *
                    </label>
                    <input 
                      type="number" 
                      name="mileage" 
                      value={formData.mileage} 
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      required
                      placeholder="e.g., 15250.5"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Date *
                    </label>
                    <input 
                      type="date" 
                      name="date" 
                      value={formData.date} 
                      onChange={handleInputChange}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Driver Username <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input 
                      type="text" 
                      name="driverUsername" 
                      value={formData.driverUsername} 
                      onChange={handleInputChange}
                      placeholder="e.g., driver1 (leave blank if unassigned)"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Adding...' : '✓ Add Fuel Log'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('all')}
                    className="btn btn-secondary"
                    style={{ flex: 0.3 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Modal */}
          {editingLog && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                maxWidth: 600,
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 20px', fontWeight: 700, color: '#111827' }}>Edit Fuel Log</h3>
                
                <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Vehicle Registration
                    </label>
                    <input 
                      type="text" 
                      name="vehicleRegNumber" 
                      value={editingLog.vehicleRegNumber} 
                      readOnly
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem',
                        background: '#f9fafb'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Liters
                    </label>
                    <input 
                      type="number" 
                      name="liters" 
                      value={editingLog.liters} 
                      onChange={handleInputChange}
                      step="0.01"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Cost per Liter (LKR)
                    </label>
                    <input 
                      type="number" 
                      name="costPerLiter" 
                      value={editingLog.costPerLiter} 
                      onChange={handleInputChange}
                      step="0.01"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Fuel Type
                    </label>
                    <select 
                      name="fuelType" 
                      value={editingLog.fuelType} 
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Diesel">⛽ Diesel</option>
                      <option value="Petrol">⛽ Petrol</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Mileage (km)
                    </label>
                    <input 
                      type="number" 
                      name="mileage" 
                      value={editingLog.mileage} 
                      onChange={handleInputChange}
                      step="0.1"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Date
                    </label>
                    <input 
                      type="date" 
                      name="date" 
                      value={editingLog.date} 
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Driver Username <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input 
                      type="text" 
                      name="driverUsername" 
                      value={editingLog.driverUsername || ''} 
                      onChange={handleInputChange}
                      placeholder="e.g., driver1"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1.5px solid #d1d5db', 
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="btn btn-secondary"
                    style={{ flex: 0.3 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                maxWidth: 450,
                width: '90%',
                boxShadow: '0 20px 25px rgba(0,0,0,0.1)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
                  <h3 style={{ margin: '0 0 8px', fontWeight: 700, color: '#111827' }}>Delete Fuel Log?</h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                    Are you sure you want to delete this fuel log for <strong>{deletingLog?.vehicleRegNumber}</strong>? This action cannot be undone.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={() => {
                      setShowDeleteModal(false)
                      setDeletingLog(null)
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmDelete}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default FuelManagementPage
