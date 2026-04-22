import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../services/api'
import './UsersPage.css'
import {
  Check, X, Clock, RefreshCw, AlertCircle, Users, UserCheck
} from 'lucide-react'

// ── Role badge helper ──────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = {
    ADMIN:      { label: 'Admin',      cls: 'badge badge-admin' },
    CONTROLLER: { label: 'Controller', cls: 'badge badge-controller' },
    DRIVER:     { label: 'Driver',     cls: 'badge badge-driver' },
  }
  const { label, cls } = cfg[role] || cfg.DRIVER
  return <span className={cls}>{label}</span>
}

// ── Status badge helper ────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    ACTIVE:    { label: 'Active',    cls: 'badge badge-active' },
    PENDING:   { label: 'Pending',   cls: 'badge badge-warning' },
    INACTIVE:  { label: 'Inactive',  cls: 'badge badge-inactive' },
    SUSPENDED: { label: 'Suspended', cls: 'badge badge-danger' },
  }
  const { label, cls } = cfg[status] || cfg.ACTIVE
  return <span className={cls}>{label}</span>
}


const UsersPage = () => {
  const { isAdmin } = useAuth()

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
    if (isAdmin) {
      loadUsers()
      loadPending()
    }
  }, [isAdmin])

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
      // endpoint may not exist yet — silently fail until backend is ready
      setPendingUsers([])
    } finally {
      setPendingLoad(false)
    }
  }

  const handleApprove = async (id, username) => {
    try {
      await userAPI.approveUser(id)
      setActionMsg(`✅  ${username} has been approved and can now sign in.`)
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
      setActionMsg(`❌  ${username}'s account has been rejected.`)
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
        submitData.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(submitData.userName)}`
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

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="error-message">Access Denied: Admin privileges required</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="users-outer">

        {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
        <div className="users-header-row">
          <div>
            <h1 className="users-page-title">User Management</h1>
            <p className="users-page-sub">Manage system users, roles, and access approvals</p>
          </div>
          <button className="users-add-btn" onClick={handleCreate}>
            <Users size={16} /> Add User
          </button>
        </div>

        {/* ── ACTION MESSAGE (approve/reject feedback) ─────────────────── */}
        {actionMsg && (
          <div className="users-action-msg">{actionMsg}</div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {error && (
          <div className="users-error">
            <AlertCircle size={15} />{error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PENDING APPROVALS SECTION
        ══════════════════════════════════════════════════════════════ */}
        <div className="users-section">
          <div className="users-section-header">
            <div className="users-section-title-row">
              <div className="users-section-icon pending-icon">
                <Clock size={16} />
              </div>
              <h2 className="users-section-title">Pending Approvals</h2>
              {!pendingLoad && (
                <span className={`users-pending-count ${pendingUsers.length > 0 ? 'has-pending' : ''}`}>
                  {pendingUsers.length}
                </span>
              )}
            </div>
            <button className="users-refresh-btn" onClick={loadPending} title="Refresh pending list">
              <RefreshCw size={14} />
            </button>
          </div>

          {pendingLoad ? (
            <div className="users-loading-row">
              <div className="users-spinner" />
              Loading pending accounts…
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="users-empty-pending">
              <UserCheck size={32} />
              <p>No accounts awaiting approval</p>
              <span>New self-registered accounts will appear here</span>
            </div>
          ) : (
            <div className="users-pending-list">
              {pendingUsers.map((u) => (
                <div key={u.id} className="users-pending-card">
                  <img
                    src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=6366f1&color=fff&size=64&bold=true`}
                    alt={u.userName}
                    className="users-pending-avatar"
                  />
                  <div className="users-pending-info">
                    <p className="users-pending-name">{u.userName}</p>
                    <p className="users-pending-email">{u.email}</p>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="users-pending-actions">
                    <button
                      className="users-approve-btn"
                      onClick={() => handleApprove(u.id, u.userName)}
                      title="Approve account"
                    >
                      <Check size={15} /> Approve
                    </button>
                    <button
                      className="users-reject-btn"
                      onClick={() => handleReject(u.id, u.userName)}
                      title="Reject account"
                    >
                      <X size={15} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ALL USERS TABLE
        ══════════════════════════════════════════════════════════════ */}
        <div className="users-section">
          <div className="users-section-header">
            <div className="users-section-title-row">
              <div className="users-section-icon all-icon">
                <Users size={16} />
              </div>
              <h2 className="users-section-title">All Users</h2>
              {!loading && (
                <span className="users-count-badge">{users.length}</span>
              )}
            </div>
            <button className="users-refresh-btn" onClick={loadUsers} title="Refresh user list">
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="users-loading-row">
              <div className="users-spinner" />Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="users-loading-row">No users found</div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.accountStatus === 'PENDING' ? 'users-row-pending' : ''}>
                      <td>
                        <div className="users-user-cell">
                          <img
                            src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=6366f1&color=fff&size=64&bold=true`}
                            alt={u.userName}
                            className="users-table-avatar"
                          />
                          <div>
                            <p className="users-table-name">{u.userName}</p>
                            <p className="users-table-id">ID #{u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="users-table-email">{u.email}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td><StatusBadge status={u.accountStatus} /></td>
                      <td>
                        <div className="users-table-actions">
                          {u.accountStatus === 'PENDING' && (
                            <>
                              <button className="users-approve-btn users-approve-sm"
                                onClick={() => handleApprove(u.id, u.userName)}>
                                <Check size={13} />
                              </button>
                              <button className="users-reject-btn users-reject-sm"
                                onClick={() => handleReject(u.id, u.userName)}>
                                <X size={13} />
                              </button>
                            </>
                          )}
                          <button className="users-edit-btn" onClick={() => handleEdit(u)}>Edit</button>
                          <button className="users-delete-btn" onClick={() => handleDelete(u.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── MODAL ──────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="users-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button className="users-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {error && <div className="users-error" style={{ marginBottom: '1rem' }}><AlertCircle size={14} />{error}</div>}

            <form onSubmit={handleSubmit} className="users-modal-form">
              <div className="users-form-row">
                <div className="users-form-group">
                  <label>Username</label>
                  <input type="text" name="userName" value={formData.userName} onChange={handleChange} required />
                </div>
                <div className="users-form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
              </div>

              <div className="users-form-row">
                <div className="users-form-group">
                  <label>Password {editingUser && <span className="users-optional">(leave empty to keep)</span>}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required={!editingUser} />
                </div>
                <div className="users-form-group">
                  <label>Role</label>
                  <select name="role" value={formData.role} onChange={handleChange}>
                    <option value="DRIVER">Driver</option>
                    <option value="CONTROLLER">Controller</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="users-form-row">
                <div className="users-form-group">
                  <label>Account Status</label>
                  <select name="accountStatus" value={formData.accountStatus} onChange={handleChange}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div className="users-form-group">
                  <label>Profile Picture URL <span className="users-optional">(optional)</span></label>
                  <input type="url" name="profilePicture" value={formData.profilePicture} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>

              <div className="users-modal-footer">
                <button type="button" className="users-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="users-modal-submit">
                  {editingUser ? 'Save Changes' : 'Create User'}
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
