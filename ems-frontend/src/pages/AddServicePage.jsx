import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { serviceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Wrench, AlertTriangle, ArrowLeft, Check, Save, Plus } from 'lucide-react'

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
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.15)',
}

/* ─── Shared field styles ─────────────── */
const fieldLabel = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: D.textSub,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  marginBottom: 6,
}
const fieldInput = (hasError) => ({
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${hasError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: 8,
  color: D.text,
  fontSize: '0.85rem',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
})
const fieldError = { color: D.red, fontSize: '0.72rem', marginTop: 4 }

const AddServicePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [formData, setFormData]     = useState(initialForm)
  const [loading, setLoading]       = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)
  const [errors, setErrors]         = useState({})
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!isEditing) return
    serviceAPI.getServiceById(id)
      .then(res => {
        const s = res.data?.data || res.data
        setFormData({
          vehicleRegNumber:   s.vehicleRegNumber   || '',
          serviceType:        s.serviceType        || '',
          serviceTypeDetail:  s.serviceTypeDetail   || '',
          serviceDate:        s.serviceDate ? s.serviceDate.substring(0, 10) : '',
          currentMileageKm:   s.currentMileageKm   || '',
          serviceCost:        s.serviceCost         || '',
          technicianWorkshop: s.technicianWorkshop  || '',
          nextServiceDue:     s.nextServiceDue ? s.nextServiceDue.substring(0, 10) : '',
          description:        s.description         || '',
        })
      })
      .catch(() => navigate('/service'))
      .finally(() => setLoadingData(false))
  }, [id])

  const validate = () => {
    const e = {}
    if (!formData.vehicleRegNumber.trim()) e.vehicleRegNumber = 'Required'
    if (!formData.serviceType)             e.serviceType       = 'Required'
    if (formData.serviceType === 'OTHER' && !formData.serviceTypeDetail.trim())
                                           e.serviceTypeDetail = 'Required for Other'
    if (!formData.serviceDate)             e.serviceDate       = 'Required'
    if (!formData.currentMileageKm)        e.currentMileageKm  = 'Required'
    if (!formData.serviceCost)             e.serviceCost       = 'Required'
    if (!formData.technicianWorkshop.trim()) e.technicianWorkshop = 'Required'
    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setSubmitError(null)
    try {
      isEditing
        ? await serviceAPI.updateService(id, formData)
        : await serviceAPI.createService(formData)
      navigate('/service')
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save service record.')
      setLoading(false)
    }
  }

  const focusBorder  = (e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }
  const blurBorder   = (e, hasErr) => { e.target.style.borderColor = hasErr ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }

  if (loadingData) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="Service" subtitle="Home / Service" />
          <div className="page-body" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
            <div style={{ color:D.indigo, fontSize:'1rem', fontWeight:600 }}>Loading record…</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell dark-theme-wrapper" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar
          title={isEditing ? 'Edit Service Record' : 'Add Service Record'}
          subtitle={`Home / Service / ${isEditing ? 'Edit' : 'Add'}`}
        />

        <div className="page-body">

          {/* ── Back button ─────────────────────────────────────── */}
          <button
            onClick={() => navigate('/service')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${D.border}`,
              color: D.text, fontSize: '0.83rem', fontWeight: 600,
              cursor: 'pointer', marginBottom: 24, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          >
            <ArrowLeft size={16} /> Back to Service History
          </button>

          {/* ── Main card — full width of page-body ─────────────── */}
          <div style={{
            background: D.surface,
            border: `1px solid ${D.border}`,
            borderRadius: 16,
            padding: '36px 40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>

            {/* Header */}
            <div style={{ marginBottom: 32, borderBottom: `1px solid ${D.border}`, paddingBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: D.indigoDim, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: D.indigo, flexShrink:0,
                  border: `1px solid rgba(129,140,248,0.3)`,
                }}><Wrench size={20} /></div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: D.text, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {isEditing ? 'Edit Service Record' : 'Add Service Record'}
                  </h1>
                  <p style={{ margin: '3px 0 0', color: D.textSub, fontSize: '0.85rem' }}>
                    {isEditing ? 'Update the details of this service or maintenance record.' : 'Log a new service or maintenance record for a vehicle.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {submitError && (
              <div style={{
                background: D.redDim, border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 8, padding: '10px 16px', marginBottom: 24,
                color: D.red, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <AlertTriangle size={18} /> {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>

              {/* Section label */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:D.textSub }}>Vehicle & Service Details</span>
                <div style={{ flex:1, height:1, background:D.border }} />
              </div>

              {/* Row 1 — Vehicle + Service Type */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                <div>
                  <label style={fieldLabel}>Vehicle (License Plate) *</label>
                  <input
                    type="text" name="vehicleRegNumber"
                    value={formData.vehicleRegNumber} onChange={handleChange}
                    placeholder="e.g. KA-01-AB-1234"
                    style={fieldInput(errors.vehicleRegNumber)}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, errors.vehicleRegNumber)}
                  />
                  {errors.vehicleRegNumber && <p style={fieldError}>{errors.vehicleRegNumber}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Service Type *</label>
                  <select
                    name="serviceType" value={formData.serviceType} onChange={handleChange}
                    style={{
                      ...fieldInput(errors.serviceType), cursor:'pointer',
                      appearance:'none',
                      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', backgroundSize:'18px', paddingRight:38,
                    }}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, errors.serviceType)}
                  >
                    <option value="" disabled style={{ background: D.surfaceHi }}>Select service type</option>
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: D.surfaceHi }}>{t.label}</option>)}
                  </select>
                  {errors.serviceType && <p style={fieldError}>{errors.serviceType}</p>}
                </div>
              </div>

              {/* Other detail */}
              {formData.serviceType === 'OTHER' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={fieldLabel}>Service Type Detail *</label>
                  <input
                    type="text" name="serviceTypeDetail"
                    value={formData.serviceTypeDetail} onChange={handleChange}
                    placeholder="Describe the service…"
                    style={fieldInput(errors.serviceTypeDetail)}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, errors.serviceTypeDetail)}
                  />
                  {errors.serviceTypeDetail && <p style={fieldError}>{errors.serviceTypeDetail}</p>}
                </div>
              )}

              {/* Row 2 — Date + Mileage */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                <div>
                  <label style={fieldLabel}>Service Date *</label>
                  <input
                    type="date" name="serviceDate"
                    value={formData.serviceDate} onChange={handleChange}
                    style={fieldInput(errors.serviceDate)}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, errors.serviceDate)}
                  />
                  {errors.serviceDate && <p style={fieldError}>{errors.serviceDate}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Current Mileage (km) *</label>
                  <input
                    type="number" name="currentMileageKm"
                    value={formData.currentMileageKm} onChange={handleChange}
                    placeholder="e.g. 45000"
                    style={fieldInput(errors.currentMileageKm)}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, errors.currentMileageKm)}
                  />
                  {errors.currentMileageKm && <p style={fieldError}>{errors.currentMileageKm}</p>}
                </div>
              </div>

              {/* Row 3 — Cost + Workshop */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                <div>
                  <label style={fieldLabel}>Service Cost (Rs.) *</label>
                  <input
                    type="number" step="0.01" name="serviceCost"
                    value={formData.serviceCost} onChange={handleChange}
                    placeholder="e.g. 8500"
                    style={fieldInput(errors.serviceCost)}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, errors.serviceCost)}
                  />
                  {errors.serviceCost && <p style={fieldError}>{errors.serviceCost}</p>}
                </div>
                <div>
                  <label style={fieldLabel}>Technician / Workshop *</label>
                  <input
                    type="text" name="technicianWorkshop"
                    value={formData.technicianWorkshop} onChange={handleChange}
                    placeholder="e.g. Auto Care Center"
                    style={fieldInput(errors.technicianWorkshop)}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, errors.technicianWorkshop)}
                  />
                  {errors.technicianWorkshop && <p style={fieldError}>{errors.technicianWorkshop}</p>}
                </div>
              </div>

              {/* Section label */}
              <div style={{ display:'flex', alignItems:'center', gap:10, margin:'28px 0 20px' }}>
                <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:D.textSub }}>Optional Details</span>
                <div style={{ flex:1, height:1, background:D.border }} />
              </div>

              {/* Row 4 — Next Service + Description */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:32 }}>
                <div>
                  <label style={fieldLabel}>Next Service Due <span style={{ fontWeight:400, color:D.textFaint, textTransform: 'none' }}>(Optional)</span></label>
                  <input
                    type="date" name="nextServiceDue"
                    value={formData.nextServiceDue} onChange={handleChange}
                    style={fieldInput(false)}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, false)}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Description / Notes <span style={{ fontWeight:400, color:D.textFaint, textTransform: 'none' }}>(Optional)</span></label>
                  <textarea
                    name="description" value={formData.description} onChange={handleChange}
                    rows={3} placeholder="Any additional notes…"
                    style={{ ...fieldInput(false), resize:'none', lineHeight:1.5 }}
                    onFocus={focusBorder}
                    onBlur={e => blurBorder(e, false)}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display:'flex', gap:12, justifyContent:'flex-end', borderTop:`1px solid ${D.border}`, paddingTop:24 }}>
                <button
                  type="button" onClick={() => navigate('/service')}
                  style={{
                    padding:'10px 24px', borderRadius:8,
                    border:`1px solid ${D.border}`, background:'rgba(255,255,255,0.05)',
                    color:D.text, fontSize:'0.875rem', fontWeight:600, cursor:'pointer',
                    transition:'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  style={{
                    padding:'10px 28px', borderRadius:8, border:'none', display: 'flex', alignItems: 'center', gap: 8,
                    background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    color:'#fff', fontSize:'0.875rem', fontWeight:700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
                    transition:'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform='translateY(-1px)' }}}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
                >
                  {loading ? 'Saving…' : isEditing ? <><Save size={16}/> Save Changes</> : <><Plus size={16}/> Add Record</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
      {/* ── Dark theme overrides for sidebar/topbar ─────────── */}
      <style>{`
        .dark-theme-wrapper .topbar { background: #161b27 !important; border-bottom-color: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .topbar-title { color: #e2e8f0 !important; }
        .dark-theme-wrapper .topbar-breadcrumb { color: #475569 !important; }
        .dark-theme-wrapper .topbar-user { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; color: #e2e8f0 !important; }
        .dark-theme-wrapper .topbar-user:hover { background: rgba(99,102,241,0.15) !important; border-color: rgba(99,102,241,0.4) !important; }
        .dark-theme-wrapper .topbar-name { color: #e2e8f0 !important; }
        .dark-theme-wrapper .sidebar { background: #111827 !important; border-right-color: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-header { border-bottom-color: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-title { color: #f1f5f9 !important; }
        .dark-theme-wrapper .sidebar-subtitle { color: #475569 !important; }
        .dark-theme-wrapper .nav-section-label { color: #334155 !important; }
        .dark-theme-wrapper .nav-item { color: #64748b !important; }
        .dark-theme-wrapper .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: #cbd5e1 !important; }
        .dark-theme-wrapper .nav-item.active { background: rgba(99,102,241,0.18) !important; color: #a5b4fc !important; }
        .dark-theme-wrapper .sidebar-divider { background: rgba(255,255,255,0.07) !important; }
        .dark-theme-wrapper .sidebar-logout-btn { color: rgba(255,255,255,0.4) !important; }
        .dark-theme-wrapper .sidebar-logout-btn:hover { color: #f87171 !important; }
        .dark-theme-wrapper .sidebar-user-card { background: rgba(255,255,255,0.03) !important; }
        .dark-theme-wrapper .sidebar-footer { border-top-color: rgba(255,255,255,0.07) !important; }
        
        /* Input date icon inverted */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
}

export default AddServicePage
