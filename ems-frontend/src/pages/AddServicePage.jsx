import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { serviceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const SERVICE_TYPES = [
  { value: 'OIL_CHANGE',           label: 'Oil Change'           },
  { value: 'ENGINE_TUNE_UP',       label: 'Engine Tune Up'       },
  { value: 'BRAKE_SERVICE',        label: 'Brake Service'        },
  { value: 'TIRE_ROTATION',        label: 'Tire Rotation'        },
  { value: 'TRANSMISSION_SERVICE', label: 'Transmission Service' },
  { value: 'AC_SERVICE',           label: 'AC Service'           },
  { value: 'BATTERY_REPLACEMENT',  label: 'Battery Replacement'  },
  { value: 'GENERAL_INSPECTION',   label: 'General Inspection'   },
  { value: 'OTHER',                label: 'Other'                },
]

const initialForm = {
  vehicleRegNumber: '',
  serviceType: '',
  serviceTypeDetail: '',
  serviceDate: '',
  currentMileageKm: '',
  serviceCost: '',
  technicianWorkshop: '',
  nextServiceDue: '',
  description: '',
}

const AddServicePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (isEditing) {
      setLoadingData(true)
      serviceAPI.getServiceById(id)
        .then(res => {
          const s = res.data?.data || res.data
          setFormData({
            vehicleRegNumber:  s.vehicleRegNumber  || '',
            serviceType:       s.serviceType       || '',
            serviceTypeDetail: s.serviceTypeDetail  || '',
            serviceDate:       s.serviceDate ? s.serviceDate.substring(0, 10) : '',
            currentMileageKm:  s.currentMileageKm  || '',
            serviceCost:       s.serviceCost        || '',
            technicianWorkshop:s.technicianWorkshop || '',
            nextServiceDue:    s.nextServiceDue ? s.nextServiceDue.substring(0, 10) : '',
            description:       s.description        || '',
          })
        })
        .catch(() => navigate('/service'))
        .finally(() => setLoadingData(false))
    }
  }, [id])

  const validate = () => {
    const e = {}
    if (!formData.vehicleRegNumber.trim()) e.vehicleRegNumber = 'License plate is required'
    if (!formData.serviceType)            e.serviceType       = 'Service type is required'
    if (formData.serviceType === 'OTHER' && !formData.serviceTypeDetail.trim())
                                          e.serviceTypeDetail = 'Detail is required for Other'
    if (!formData.serviceDate)            e.serviceDate       = 'Service date is required'
    if (!formData.currentMileageKm)       e.currentMileageKm  = 'Mileage is required'
    if (!formData.serviceCost)            e.serviceCost       = 'Service cost is required'
    if (!formData.technicianWorkshop.trim()) e.technicianWorkshop = 'Technician/Workshop is required'
    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    setSubmitError(null)
    try {
      if (isEditing) {
        await serviceAPI.updateService(id, formData)
      } else {
        await serviceAPI.createService(formData)
      }
      navigate('/service')
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save service record.')
      setLoading(false)
    }
  }

  const labelStyle = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: '#94a3b8', marginBottom: 6, letterSpacing: '0.02em',
  }
  const inputStyle = (hasError) => ({
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: `1.5px solid ${hasError ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 10, color: '#f1f5f9', fontSize: '0.9rem',
    outline: 'none', transition: 'border 0.2s',
    fontFamily: 'inherit', boxSizing: 'border-box',
  })
  const errStyle = { color: '#f87171', fontSize: '0.72rem', marginTop: 4 }

  if (loadingData) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Topbar title="Service" subtitle="Home / Service" />
          <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ color: '#6366f1', fontSize: '1.1rem' }}>Loading…</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isEditing ? 'Edit Service Record' : 'Add Service Record'}
          subtitle={`Home / Service / ${isEditing ? 'Edit' : 'Add'}`}
        />

        <div className="page-body">
          {/* Back Button */}
          <button
            onClick={() => navigate('/service')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 10,
              background: 'rgba(15,23,42,0.85)', border: '1.5px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', marginBottom: 28, transition: 'all 0.18s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; e.currentTarget.style.borderColor = '#6366f1' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.85)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
          >
            ← Back to Service History
          </button>

          {/* Main Card */}
          <div style={{
            maxWidth: 760,
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.92) 100%)',
            border: '1.5px solid rgba(255,255,255,0.09)',
            borderRadius: 20,
            padding: '40px 44px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                {isEditing ? 'Edit Service Record' : 'Add Service Record'}
              </h1>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                {isEditing ? 'Update the service or maintenance record details.' : 'Log a new service or maintenance record'}
              </p>
            </div>

            {submitError && (
              <div style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 16px', marginBottom: 24,
                color: '#fca5a5', fontSize: '0.85rem',
              }}>
                ⚠ {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Row 1 — Vehicle + Service Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Vehicle *</label>
                  <input
                    type="text"
                    name="vehicleRegNumber"
                    value={formData.vehicleRegNumber}
                    onChange={handleChange}
                    placeholder="e.g. KA-01-AB-1234"
                    style={inputStyle(errors.vehicleRegNumber)}
                    onFocus={e => { if (!errors.vehicleRegNumber) e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { if (!errors.vehicleRegNumber) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                  {errors.vehicleRegNumber && <p style={errStyle}>{errors.vehicleRegNumber}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Service Type *</label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleChange}
                    style={{
                      ...inputStyle(errors.serviceType),
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '18px',
                      paddingRight: 40,
                    }}
                    onFocus={e => { if (!errors.serviceType) e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { if (!errors.serviceType) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  >
                    <option value="" disabled style={{ background: '#1e293b' }}>Select service type</option>
                    {SERVICE_TYPES.map(t => (
                      <option key={t.value} value={t.value} style={{ background: '#1e293b' }}>{t.label}</option>
                    ))}
                  </select>
                  {errors.serviceType && <p style={errStyle}>{errors.serviceType}</p>}
                </div>
              </div>

              {/* Service Type Detail (visible only for OTHER) */}
              {formData.serviceType === 'OTHER' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Service Type Detail *</label>
                  <input
                    type="text"
                    name="serviceTypeDetail"
                    value={formData.serviceTypeDetail}
                    onChange={handleChange}
                    placeholder="Describe the service…"
                    style={inputStyle(errors.serviceTypeDetail)}
                    onFocus={e => { if (!errors.serviceTypeDetail) e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { if (!errors.serviceTypeDetail) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                  {errors.serviceTypeDetail && <p style={errStyle}>{errors.serviceTypeDetail}</p>}
                </div>
              )}

              {/* Row 2 — Service Date + Mileage */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Service Date *</label>
                  <input
                    type="date"
                    name="serviceDate"
                    value={formData.serviceDate}
                    onChange={handleChange}
                    style={inputStyle(errors.serviceDate)}
                    onFocus={e => { if (!errors.serviceDate) e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { if (!errors.serviceDate) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                  {errors.serviceDate && <p style={errStyle}>{errors.serviceDate}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Current Mileage (km) *</label>
                  <input
                    type="number"
                    name="currentMileageKm"
                    value={formData.currentMileageKm}
                    onChange={handleChange}
                    placeholder="e.g. 45000"
                    style={inputStyle(errors.currentMileageKm)}
                    onFocus={e => { if (!errors.currentMileageKm) e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { if (!errors.currentMileageKm) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                  {errors.currentMileageKm && <p style={errStyle}>{errors.currentMileageKm}</p>}
                </div>
              </div>

              {/* Row 3 — Cost + Workshop */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Service Cost (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="serviceCost"
                    value={formData.serviceCost}
                    onChange={handleChange}
                    placeholder="e.g. 8500"
                    style={inputStyle(errors.serviceCost)}
                    onFocus={e => { if (!errors.serviceCost) e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { if (!errors.serviceCost) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                  {errors.serviceCost && <p style={errStyle}>{errors.serviceCost}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Technician/Workshop *</label>
                  <input
                    type="text"
                    name="technicianWorkshop"
                    value={formData.technicianWorkshop}
                    onChange={handleChange}
                    placeholder="e.g. Auto Care Center"
                    style={inputStyle(errors.technicianWorkshop)}
                    onFocus={e => { if (!errors.technicianWorkshop) e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { if (!errors.technicianWorkshop) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                  {errors.technicianWorkshop && <p style={errStyle}>{errors.technicianWorkshop}</p>}
                </div>
              </div>

              {/* Row 4 — Next Service Due + Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 36 }}>
                <div>
                  <label style={labelStyle}>Next Service Due <span style={{ color: '#475569', fontWeight: 400 }}>(Optional)</span></label>
                  <input
                    type="date"
                    name="nextServiceDue"
                    value={formData.nextServiceDue}
                    onChange={handleChange}
                    style={inputStyle(false)}
                    onFocus={e => { e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description / Notes <span style={{ color: '#475569', fontWeight: 400 }}>(Optional)</span></label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Any additional notes…"
                    style={{
                      ...inputStyle(false),
                      resize: 'none', lineHeight: 1.5,
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1' }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => navigate('/service')}
                  style={{
                    padding: '11px 28px', borderRadius: 10,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: '#94a3b8',
                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#a5b4fc' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#94a3b8' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '11px 32px', borderRadius: 10, border: 'none',
                    background: loading
                      ? 'rgba(99,102,241,0.5)'
                      : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.18s', boxShadow: loading ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {loading ? 'Saving…' : isEditing ? '✓ Save Changes' : '+ Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddServicePage
