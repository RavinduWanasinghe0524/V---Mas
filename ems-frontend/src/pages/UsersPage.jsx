import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { userAPI } from '../services/api'
import { Check, X, Clock, RefreshCw, AlertCircle, Users, UserCheck } from 'lucide-react'

const onFocus = e => {
  e.target.style.borderColor = 'rgba(99,102,241,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = ''
  e.target.style.boxShadow = 'none'
}

// ── Role badge helper ────────────────────────────────────────────────
const RoleBadge = ({ role, D }) => {
  const cfg = {
    ADMIN:      { label: 'Admin',      bg: D.purpleDim, color: D.purple, border: `1px solid ${D.purple}30` },
    CONTROLLER: { label: 'Controller', bg: D.blueDim,   color: D.blue,   border: `1px solid ${D.blue}30` },
    DRIVER:     { label: 'Driver',     bg: D.greenDim,  color: D.green,  border: `1px solid ${D.green}30` },
  }
  const { label, bg, color, border } = cfg[role] || cfg.DRIVER
  return <span style={{ background: bg, color, border, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
}

// ── Status badge helper ──────────────────────────────────────────────
const StatusBadge = ({ status, D }) => {
  const cfg = {
    ACTIVE:    { label: 'Active',    bg: D.greenDim, color: D.green,  border: `1px solid ${D.green}30` },
    PENDING:   { label: 'Pending',   bg: D.goldDim,  color: D.gold,   border: `1px solid ${D.gold}30` },
    INACTIVE:  { label: 'Inactive',  bg: D.surfaceHi, color: D.textSub, border: `1px solid ${D.border}` },
    SUSPENDED: { label: 'Suspended', bg: D.redDim,   color: D.red,    border: `1px solid ${D.red}30` },
  }
  const { label, bg, color, border } = cfg[status] || cfg.ACTIVE
  return <span style={{ background: bg, color, border, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
}


const UsersPage = () => {
  const D = useD()
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${D.inputBorder}`, fontSize: '0.85rem',
    color: D.text, background: D.inputBg, outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit',
  }
  const labelStyle = {
    display: 'block', marginBottom: 6, fontSize: '0.78rem', fontWeight: 700,
    color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.02em',
  }
  const { isAdmin, isController } = useAuth()

  const [users,        setUsers]        = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [pendingLoad,  setPendingLoad]  = useState(true)
  const [error,        setError]        = useState('')
  const [actionMsg,    setActionMsg]    = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editingUser,  setEditingUser]  = useState(null)
  const [formData,     setFormData]     = useState({
    userName: '', email: '', password: '', role: 'DRIVER', accountStatus: 'ACTIVE', profilePicture: ''
  })

  useEffect(() => {
    if (isAdmin || isController) {
      if (isAdmin) loadUsers()
      loadPending()
    }
  }, [isAdmin, isController])

  const loadUsers = async () => {
    try {
      setError('')
      const res = await userAPI.getAllUsers()
      setUsers(res.data.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadPending = async () => {
    setPendingLoad(true)
    try {
      const res = await userAPI.getPendingUsers()
      setPendingUsers(res.data.data || [])
    } catch {
      setPendingUsers([])
    } finally {
      setPendingLoad(false)
    }
  }

  const handleApprove = async (id, username) => {
    try {
      await userAPI.approveUser(id)
      setActionMsg(`${username} has been approved.`)
      setTimeout(() => setActionMsg(''), 4000)
      loadPending()
      loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to approve user')
    }
  }

  const handleReject = async (id, username) => {
    if (!window.confirm(`Reject "${username}"? Their account will be set to Inactive.`)) return
    try {
      await userAPI.rejectUser(id)
      setActionMsg(`${username}'s account has been rejected.`)
      setTimeout(() => setActionMsg(''), 4000)
      loadPending()
      loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reject user')
    }
  }

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({ userName: '', email: '', password: '', role: 'DRIVER', accountStatus: 'ACTIVE', profilePicture: '' })
    setShowModal(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      userName: user.userName, email: user.email, password: '',
      role: user.role, accountStatus: user.accountStatus || 'ACTIVE',
      profilePicture: user.profilePicture || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await userAPI.deleteUser(id)
      loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      const submitData = { ...formData }
      if (!submitData.profilePicture)
        submitData.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(submitData.userName)}&background=6366f1&color=fff&bold=true`
      if (editingUser) {
        if (!submitData.password) delete submitData.password
        await userAPI.updateUser(editingUser.id, submitData)
      } else {
        await userAPI.createUser(submitData)
      }
      setShowModal(false)
      loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Operation failed')
    }
  }

  if (!isAdmin && !isController) {
    return (
      <div className="app-shell" style={{ background: D.bg }}>
        <Sidebar />
        <div className="main-content" style={{ background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: D.red, background: D.redDim, padding: '16px 24px', borderRadius: 12, border: `1px solid ${D.red}30` }}>
            Access Denied: Admin or Controller privileges required
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="app-shell" style={{ background: D.bg }}>
        <Sidebar />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="User Management" subtitle="Home / Users" />
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
              border: `1px solid ${D.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
            }}>
              {/* decorative circles */}
              {[['80%','−20px','180px','rgba(255,255,255,0.03)'],['20%','60%','120px','rgba(255,255,255,0.04)'],['55%','80%','90px','rgba(255,255,255,0.02)']].map(([t,l,s,bg],i) => (
                <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
              ))}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display:'flex', alignItems:'center', justifyContent:'center', color: '#fff', backdropFilter:'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Users size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    User Management
                  </h1>
                  <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                    {isAdmin ? 'Manage system users, roles, and access approvals' : 'Review and process pending driver account requests'}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={handleCreate} style={{
                  position: 'relative', padding: '10px 22px', borderRadius: 10, border: 'none', background: '#fff', color: '#4338ca', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 14px rgba(0,0,0,0.2)' }}>
                  <Users size={16} /> Add User
                </button>
              )}
            </div>

            {/* Messages */}
            {actionMsg && (
              <div style={{ padding: '14px 20px', borderRadius: 12, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 24, fontSize: '0.85rem', fontWeight: 600, animation: 'fadeIn 0.3s ease' }}>
                {actionMsg}
              </div>
            )}
            {error && (
              <div style={{ padding: '14px 20px', borderRadius: 12, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 24, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Pending Approvals Section */}
            <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, marginBottom: 32, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: D.goldDim, border: `1px solid ${D.gold}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.gold }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem' }}>Pending Approvals</h3>
                  </div>
                  {!pendingLoad && pendingUsers.length > 0 && (
                    <span style={{ background: D.gold, color: '#000', padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800 }}>{pendingUsers.length}</span>
                  )}
                </div>
                <button onClick={loadPending} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 4 }} title="Refresh pending list">
                  <RefreshCw size={16} />
                </button>
              </div>

              <div style={{ padding: '24px' }}>
                {pendingLoad ? (
                  <div style={{ textAlign: 'center', color: D.textSub, padding: 20 }}>Loading pending accounts...</div>
                ) : pendingUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: D.textSub, padding: 40 }}>
                    <UserCheck size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 700, color: D.text }}>No accounts awaiting approval</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>New self-registered accounts will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {pendingUsers.map(u => (
                      <div key={u.id} style={{ background: D.bg, border: `1px solid ${D.borderHi}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=6366f1&color=fff&bold=true`} alt={u.userName} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem' }}>{u.userName}</p>
                            <p style={{ margin: '2px 0 6px', fontSize: '0.75rem', color: D.textSub }}>{u.email}</p>
                            <RoleBadge role={u.role} D={D} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleApprove(u.id, u.userName)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: D.greenDim, color: D.green, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(74,222,128,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background=D.greenDim}>
                            <Check size={14} /> Approve
                          </button>
                          <button onClick={() => handleReject(u.id, u.userName)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: D.redDim, color: D.red, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background=D.redDim}>
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* All Users Section (Admin Only) */}
            {isAdmin && (
              <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: D.blueDim, border: `1px solid ${D.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.blue }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 700, color: D.text, fontSize: '0.95rem' }}>All Users</h3>
                    </div>
                    {!loading && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', color: D.text, padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800 }}>{users.length}</span>
                    )}
                  </div>
                  <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 4 }} title="Refresh users list">
                    <RefreshCw size={16} />
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', color: D.textSub, padding: 40 }}>Loading users...</div>
                  ) : users.length === 0 ? (
                    <div style={{ textAlign: 'center', color: D.textSub, padding: 40 }}>No users found.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ background: D.surfaceHi }}>
                        <tr>
                          {['User', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: D.textSub, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, i) => (
                          <tr key={u.id} style={{ borderBottom: `1px solid ${D.border}`, background: u.accountStatus === 'PENDING' ? D.goldDim : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'), transition: 'background 0.15s' }}
                              onMouseEnter={e => { if(u.accountStatus !== 'PENDING') e.currentTarget.style.background='rgba(99,102,241,0.08)' }}
                              onMouseLeave={e => { if(u.accountStatus !== 'PENDING') e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=6366f1&color=fff&bold=true`} alt={u.userName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                <div>
                                  <p style={{ margin: 0, fontWeight: 700, color: D.text }}>{u.userName}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: D.textSub }}>ID #{u.id}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', color: D.text }}>{u.email}</td>
                            <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} D={D} /></td>
                            <td style={{ padding: '12px 16px' }}><StatusBadge status={u.accountStatus} D={D} /></td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {u.accountStatus === 'PENDING' && (
                                  <>
                                    <button onClick={() => handleApprove(u.id, u.userName)} style={{ padding: '5px 8px', borderRadius: 8, border: 'none', background: D.green, color: '#fff', cursor: 'pointer' }}><Check size={14} /></button>
                                    <button onClick={() => handleReject(u.id, u.userName)} style={{ padding: '5px 8px', borderRadius: 8, border: 'none', background: D.red, color: '#fff', cursor: 'pointer' }}><X size={14} /></button>
                                  </>
                                )}
                                <button onClick={() => handleEdit(u)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'; e.currentTarget.style.color='#a5b4fc' }}
                                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor=D.border; e.currentTarget.style.color=D.text }}>
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(u.id)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s' }}
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
            )}
          </div>
        </div>
      </div>

        {/* ── Modal ─────────────────────────────────────────────────── */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: D.surface, borderRadius: 20, width: '90%', maxWidth: 540, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.2s ease', overflow: 'hidden' }}>
              <div style={{ padding: '22px 28px 16px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: D.purpleDim, border: `1px solid ${D.purple}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.purple }}>
                    <Users size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.05rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={labelStyle}>Username</label>
                    <input type="text" name="userName" value={formData.userName} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Password {editingUser && <span style={{ color: D.textFaint, fontWeight: 400, textTransform: 'none' }}>(leave empty to keep)</span>}</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required={!editingUser} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} disabled={isController} style={{ ...inputStyle, cursor: isController ? 'not-allowed' : 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="DRIVER" style={{ background: D.surfaceHi }}>Driver</option>
                      {isAdmin && <option value="CONTROLLER" style={{ background: D.surfaceHi }}>Controller</option>}
                      {isAdmin && <option value="ADMIN" style={{ background: D.surfaceHi }}>Admin</option>}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Account Status</label>
                    <select name="accountStatus" value={formData.accountStatus} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="ACTIVE" style={{ background: D.surfaceHi }}>Active</option>
                      <option value="INACTIVE" style={{ background: D.surfaceHi }}>Inactive</option>
                      <option value="PENDING" style={{ background: D.surfaceHi }}>Pending</option>
                      <option value="SUSPENDED" style={{ background: D.surfaceHi }}>Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Profile Picture URL <span style={{ color: D.textFaint, fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                    <input type="url" name="profilePicture" value={formData.profilePicture} onChange={handleChange} placeholder="https://..." style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Check size={16}/> {editingUser ? 'Save Changes' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex: 0.4, padding: '11px 24px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </>
  )
}

export default UsersPage
