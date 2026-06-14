/**
 * UsersPage Component
 * 
 * Provides administrative interface for system-wide user management.
 * Features:
 * - View registered users and filtering by role/search terms.
 * - Create, update (edit), and delete user accounts.
 * - Process self-registered driver approvals/rejections with real-time feedback.
 * - Dynamic role badges and account status indicators.
 */

import { useEffect, useState, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD, useTheme } from '../context/ThemeContext'
import { userAPI } from '../services/api'
import { Check, X, Clock, RefreshCw, AlertCircle, Users, UserCheck, UserPlus, ShieldCheck, Phone, IdCard, Shield } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const onFocus = e => {
  e.target.style.borderColor = 'rgba(37, 99, 235,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = ''
  e.target.style.boxShadow = 'none'
}

// ── Role badge helper ────────────────────────────────────────────────
const RoleBadge = ({ role, D }) => {
  const cfg = {
    ADMIN: { label: 'Admin', bg: D.purpleDim, color: D.purple, border: `1px solid ${D.purple}30` },
    CONTROLLER: { label: 'Controller', bg: D.blueDim, color: D.blue, border: `1px solid ${D.blue}30` },
    DRIVER: { label: 'Driver', bg: D.greenDim, color: D.green, border: `1px solid ${D.green}30` },
  }
  const { label, bg, color, border } = cfg[role] || cfg.DRIVER
  return <span style={{ background: bg, color, border, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
}

// ── Status badge helper ──────────────────────────────────────────────
const StatusBadge = ({ status, D }) => {
  const cfg = {
    ACTIVE: { label: 'Active', bg: D.greenDim, color: D.green, border: `1px solid ${D.green}30` },
    PENDING: { label: 'Pending', bg: D.goldDim, color: D.gold, border: `1px solid ${D.gold}30` },
    INACTIVE: { label: 'Inactive', bg: D.surfaceHi, color: D.textSub, border: `1px solid ${D.border}` },
    SUSPENDED: { label: 'Suspended', bg: D.redDim, color: D.red, border: `1px solid ${D.red}30` },
  }
  const { label, bg, color, border } = cfg[status] || cfg.ACTIVE
  return <span style={{ background: bg, color, border, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
}

// ── Driver metrics helper (deterministic mock based on user details) ──
const getDriverMetrics = (u) => {
  if (!u) return {
    status: 'Off Duty',
    trips: 0,
    rating: '5.0',
    safety: '100%',
    vehicle: 'N/A',
    phone: 'N/A',
    license: 'N/A'
  }
  
  const id = u.id || 0
  
  let status = 'On Duty'
  if (u.role === 'DRIVER') {
    const statuses = ['On Duty', 'Off Duty', 'On Leave']
    status = statuses[id % 3]
  } else {
    const rawStatus = u.accountStatus || 'ACTIVE'
    status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
  }
  
  const trips = u.role === 'DRIVER' ? (id * 17) % 150 + 12 : 0
  const rating = u.role === 'DRIVER' ? (4.0 + (id % 10) / 10).toFixed(1) : '5.0'
  const safety = u.role === 'DRIVER' ? `${85 + (id % 15)}%` : '100%'
  const vehicle = u.role === 'DRIVER' ? `WP GA-${1000 + (id * 137) % 9000}` : 'N/A'
  const phone = `+94 7${((id * 3) % 3) === 0 ? '7' : ((id * 3) % 3) === 1 ? '8' : '1'} ${(1000000 + (id * 23871) % 9000000)}`
  const license = `B${9000000 - (id * 4321) % 5000000}`
  
  return {
    status,
    trips,
    rating,
    safety,
    vehicle,
    phone,
    license
  }
}


const UsersPage = () => {
  const D = useD()
  const { theme } = useTheme()
  const isDark = theme === 'blue'
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

  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingLoad, setPendingLoad] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    userName: '', email: '', password: '', role: 'DRIVER', accountStatus: 'ACTIVE', profilePicture: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 1024 * 1024) {
      setError('Image must be under 1 MB')
      setTimeout(() => setError(''), 4000)
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, profilePicture: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    const matchStatus = statusFilter === 'ALL' || u.accountStatus === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  const totalUsersCount = users.length
  const activeUsersCount = users.filter(u => u.accountStatus === 'ACTIVE').length
  const pendingUsersCount = pendingUsers.length
  const suspendedUsersCount = users.filter(u => u.accountStatus === 'SUSPENDED').length

  useEffect(() => {
    if (isAdmin || isController) {
      loadUsers()
      loadPending()
    }
  }, [isAdmin, isController])

  const loadUsers = async () => {
    try {
      setError('')
      const res = await userAPI.getAllUsers()
      const data = res.data?.data || res.data || []
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const loadPending = async () => {
    setPendingLoad(true)
    try {
      const res = await userAPI.getPendingUsers()
      const data = res.data?.data || res.data || []
      setPendingUsers(Array.isArray(data) ? data : [])
    } catch {
      setPendingUsers([])
    } finally {
      setPendingLoad(false)
    }
  }

  const handleApprove = async (id, username) => {
    if (!window.confirm(`Approve user "${username}" and activate their account?`)) return
    setError('')
    setActionMsg('')
    try {
      await userAPI.approveUser(id)
      setActionMsg(`${username} has been approved.`)
      setTimeout(() => setActionMsg(''), 4000)
      loadPending()
      if (isAdmin) loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to approve user')
    }
  }

  const handleReject = async (id, username) => {
    if (!window.confirm(`Reject "${username}"? Their account will be set to Inactive.`)) return
    setError('')
    setActionMsg('')
    try {
      await userAPI.rejectUser(id)
      setActionMsg(`${username}'s account has been rejected.`)
      setTimeout(() => setActionMsg(''), 4000)
      loadPending()
      if (isAdmin) loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reject user')
    }
  }

  const handleCreate = () => {
    setError('')
    setActionMsg('')
    setEditingUser(null)
    setFormData({ userName: '', email: '', password: '', role: 'DRIVER', accountStatus: 'ACTIVE', profilePicture: '' })
    setShowModal(true)
  }

  const handleEdit = (user) => {
    setError('')
    setActionMsg('')
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
    setError('')
    setActionMsg('')
    try {
      await userAPI.deleteUser(id)
      setActionMsg('User has been deleted successfully.')
      setTimeout(() => setActionMsg(''), 4000)
      if (isAdmin) loadUsers()
      loadPending()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      setError('No users to export')
      setTimeout(() => setError(''), 4000)
      return
    }
    setError('')
    try {
      const headers = ['ID', 'Username', 'Email', 'Role', 'Status']
      const rows = filteredUsers.map(u => [
        u.id,
        u.userName,
        u.email,
        u.role,
        u.accountStatus
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setActionMsg('Users exported to CSV successfully.')
      setTimeout(() => setActionMsg(''), 4000)
    } catch {
      setError('Failed to export CSV')
      setTimeout(() => setError(''), 4000)
    }
  }

  const handleExportPDF = () => {
    if (filteredUsers.length === 0) {
      setError('No users to export')
      setTimeout(() => setError(''), 4000)
      return
    }
    setError('')
    try {
      const doc = new jsPDF()

      // Branding Header Banner in Indigo
      doc.setFillColor(67, 56, 202)
      doc.rect(0, 0, 210, 38, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('V-MAS System Users Report', 14, 22)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Users: ${filteredUsers.length}`, 14, 30)

      const tableData = filteredUsers.map(u => [
        u.id,
        u.userName,
        u.email,
        u.role,
        u.accountStatus || 'ACTIVE'
      ])

      autoTable(doc, {
        startY: 46,
        head: [['ID', 'Username', 'Email', 'Role', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [67, 56, 202], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      })

      doc.save(`users_report_${new Date().toISOString().split('T')[0]}.pdf`)
      setActionMsg('Users exported to PDF successfully.')
      setTimeout(() => setActionMsg(''), 4000)
    } catch {
      setError('Failed to export PDF')
      setTimeout(() => setError(''), 4000)
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')

    // Client-side validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (editingUser && formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    try {
      const submitData = { ...formData }
      if (!submitData.profilePicture)
        submitData.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(submitData.userName)}&background=2563eb&color=fff&bold=true`
      if (editingUser) {
        if (!submitData.password) delete submitData.password
        await userAPI.updateUser(editingUser.id, submitData)
        setActionMsg(`User "${submitData.userName}" has been updated successfully.`)
      } else {
        await userAPI.createUser(submitData)
        setActionMsg(`User "${submitData.userName}" has been created successfully.`)
      }
      setTimeout(() => setActionMsg(''), 4000)
      setShowModal(false)
      if (isAdmin) loadUsers()
      loadPending()
    } catch (e) {
      setError(e.response?.data?.message || 'Operation failed')
    }
  }

  if (!isAdmin && !isController) {
    return (
      <div className="app-shell" style={{ background: D.bg }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content" style={{ background: D.bg }}>
          <Topbar title="User Management" subtitle="Dashboard / User Management" onMenuToggle={() => setSidebarOpen(o => !o)} />
          <div className="page-body">

            {/* Hero Banner */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, #030712 0%, #0a1628 30%, #0f2345 60%, #1a3a7a 85%, #1e40af 100%)'
                : 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
              borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 16px 48px rgba(0,0,0,0.4)',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : `1px solid ${D.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
            }}>
              {/* decorative circles */}
              {[['80%', '-20px', '220px', 'rgba(59,130,246,0.04)'], ['20%', '60%', '150px', 'rgba(99,102,241,0.04)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
                <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
              ))}
              {/* Neon radial glow for dark */}
              {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(8px)', border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.15)', boxShadow: isDark ? '0 0 20px rgba(59,130,246,0.3), 0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)' }}>
                  <Users size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      User Management
                    </h1>
                    {isAdmin && users.length > 0 && (
                      <span style={{ background: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.15)', color: '#dbeafe', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(4px)', border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.2)' }}>
                        {users.length} users
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 0', color: isDark ? '#93c5fd' : '#60a5fa', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} />
                    {isAdmin ? 'Manage system users, roles, permissions & access approvals across the platform' : 'Review and process pending driver account requests'}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={handleCreate} style={{
                  position: 'relative', padding: '14px 28px', borderRadius: 16, border: 'none', background: '#fff', color: '#1e3a8a', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)' }}>
                  <UserPlus size={20} strokeWidth={3} /> Create New User
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

            {/* Interactive User Statistics Dashboard */}
            {isAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
                {[
                  { label: 'Total Users', count: totalUsersCount, icon: <Users size={24} />, color: D.blue, bg: D.blueDim },
                  { label: 'Active Users', count: activeUsersCount, icon: <UserCheck size={24} />, color: D.green, bg: D.greenDim },
                  { label: 'Pending Approvals', count: pendingUsersCount, icon: <Clock size={24} />, color: D.gold, bg: D.goldDim },
                  { label: 'Suspended', count: suspendedUsersCount, icon: <AlertCircle size={24} />, color: D.red, bg: D.redDim },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden', padding: '28px', display: 'flex', alignItems: 'center', gap: 24,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = card.color + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${card.color}20` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}
                  >
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${card.color}30`, flexShrink: 0 }}>
                      {card.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{card.label}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{card.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Pending Approvals */}
              {pendingUsers.length > 0 && (
                <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
                  <div style={{ padding: '22px 32px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: D.goldDim, border: `1px solid ${D.gold}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.gold }}>
                        <Clock size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.1rem' }}>Pending Approvals</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: D.textSub }}>Accounts awaiting access review</p>
                      </div>
                      {!pendingLoad && pendingUsers.length > 0 && (
                        <span style={{ background: D.gold, color: '#000', padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800, marginLeft: 8 }}>{pendingUsers.length}</span>
                      )}
                    </div>
                    <button onClick={loadPending} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 8, borderRadius: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><RefreshCw size={18} /></button>
                  </div>
                  <div style={{ padding: '32px' }}>
                    {pendingLoad ? (
                      <div style={{ textAlign: 'center', color: D.textSub, padding: 20 }}>Loading...</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                        {pendingUsers.map((u, i) => (
                          <div key={u.id} style={{
                            background: D.surface, border: `1px solid ${D.border}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = D.gold + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=2563eb&color=fff&bold=true`} alt={u.userName} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${D.border}` }} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=2563eb&color=fff&bold=true`; }} />
                              <div>
                                <p style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.05rem' }}>{u.userName}</p>
                                <p style={{ margin: '2px 0 8px', fontSize: '0.8rem', color: D.textSub }}>{u.email}</p>
                                <RoleBadge role={u.role} D={D} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <button onClick={() => handleApprove(u.id, u.userName)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: D.greenDim, color: D.green, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = D.green; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = D.greenDim; e.currentTarget.style.color = D.green }}>
                                <Check size={18} /> Approve
                              </button>
                              <button onClick={() => handleReject(u.id, u.userName)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: D.redDim, color: D.red, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}>
                                <X size={18} /> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Users List */}
              <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '22px 32px', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: D.blueDim, border: `1px solid ${D.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.blue }}>
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 800, color: D.text, fontSize: '1.1rem' }}>All Users</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: D.textSub }}>System user directory</p>
                    </div>
                    {!loading && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', color: D.text, padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800, marginLeft: 8 }}>{users.length}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleExportCSV} style={{
                      padding: '10px 16px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.03)', color: D.textSub, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                    }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = D.text }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = D.textSub }}>
                      Export CSV
                    </button>
                    <button onClick={handleExportPDF} style={{
                      padding: '10px 16px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.03)', color: D.textSub, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                    }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = D.text }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = D.textSub }}>
                      Export PDF
                    </button>
                    <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 8, borderRadius: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'} title="Refresh users list">
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                {/* Search and filter row */}
                <div style={{ padding: '20px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: D.surface }}>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      padding: '12px 16px', borderRadius: 12, border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '0.85rem', outline: 'none', flex: 1, minWidth: 200, transition: 'all 0.2s'
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.boxShadow = `0 0 0 3px ${D.purple}20` }}
                    onBlur={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{
                      padding: '12px 16px', borderRadius: 12, border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '0.85rem', outline: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="CONTROLLER">Controller</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                      padding: '12px 16px', borderRadius: 12, border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '0.85rem', outline: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>

                  {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                    <button
                      onClick={() => { setSearchTerm(''); setRoleFilter('ALL'); setStatusFilter('ALL'); }}
                      style={{
                        padding: '12px 20px', borderRadius: 12, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s ease', animation: 'fadeIn 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                    >
                      <X size={16} /> Reset Filters
                    </button>
                  )}
                </div>

                {/* Filter status sub-banner */}
                <div style={{
                  padding: '14px 32px', fontSize: '0.8rem', color: D.textSub, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${D.border}`, background: D.surfaceHi, fontWeight: 600
                }}>
                  <span>Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> total registered users</span>
                  {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                    <span style={{ color: D.purple, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.purple }}></span>
                      Active filters applied
                    </span>
                  )}
                </div>

                <div style={{ padding: '32px', background: D.bg }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', color: D.textSub, padding: 40 }}>Fetching user records...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', color: D.textSub, padding: 40 }}>No users found matching filters.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                      {filteredUsers.map((u, i) => {
                        const metrics = getDriverMetrics(u)
                        const initials = u.userName
                          ? u.userName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
                          : 'U'

                        // Duty status badge styles
                        let dutyStyles = {
                          bg: 'rgba(255,255,255,0.05)',
                          color: D.textSub,
                          border: `1px solid ${D.border}`
                        }
                        if (metrics.status === 'On Duty' || metrics.status === 'Active') {
                          dutyStyles = {
                            bg: 'rgba(52, 211, 153, 0.12)',
                            color: '#34d399',
                            border: '1px solid rgba(52, 211, 153, 0.25)'
                          }
                        } else if (metrics.status === 'On Leave' || metrics.status === 'Pending') {
                          dutyStyles = {
                            bg: 'rgba(251, 191, 36, 0.12)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.25)'
                          }
                        } else if (metrics.status === 'Suspended' || metrics.status === 'Inactive') {
                          dutyStyles = {
                            bg: 'rgba(248, 113, 113, 0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.25)'
                          }
                        }

                        // Deterministic/Custom stats based on role
                        let statsToShow = []
                        if (u.role === 'ADMIN') {
                          statsToShow = [
                            { value: 'Full', label: 'Access' },
                            { value: 'Admin', label: 'Role' },
                            { value: 'Active', label: 'Status' }
                          ]
                        } else if (u.role === 'CONTROLLER') {
                          statsToShow = [
                            { value: 'High', label: 'Access' },
                            { value: 'Controller', label: 'Role' },
                            { value: 'Active', label: 'Status' }
                          ]
                        } else {
                          statsToShow = [
                            { value: metrics.trips, label: 'Trips' },
                            { value: `${metrics.rating}★`, label: 'Rating', isRating: true },
                            { value: metrics.safety, label: 'Safety', isSafety: true }
                          ]
                        }

                        return (
                          <div key={u.id} style={{
                            background: D.surface, border: `1px solid ${D.border}`, borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)' }}>

                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                {/* Avatar */}
                                <div style={{ flexShrink: 0 }}>
                                  {u.profilePicture ? (
                                    <img src={u.profilePicture} alt={u.userName} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${D.border}` }} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=2563eb&color=fff&bold=true`; }} />
                                  ) : (
                                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', fontWeight: 800, border: `2px solid ${D.border}` }}>
                                      {initials}
                                    </div>
                                  )}
                                </div>
                                {/* Name and Subtitle */}
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>{u.userName}</h4>
                                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: D.textSub, fontWeight: 500 }}>
                                    {u.role === 'DRIVER' ? metrics.vehicle : u.role === 'ADMIN' ? 'System Administrator' : 'Fleet Controller'}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Duty Status Badge */}
                              <div style={{
                                padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                                background: dutyStyles.bg, color: dutyStyles.color, border: dutyStyles.border,
                                textTransform: 'uppercase', letterSpacing: '0.02em', flexShrink: 0
                              }}>
                                {metrics.status}
                              </div>
                            </div>

                            {/* Stats Cards Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                              {statsToShow.map((st, sidx) => {
                                let valColor = D.text
                                if (st.isRating) valColor = '#fbbf24'
                                if (st.isSafety) valColor = '#34d399'

                                return (
                                  <div key={sidx} style={{
                                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                                    border: `1px solid ${D.border}`, borderRadius: 16, padding: '14px 6px', textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: valColor }}>{st.value}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{st.label}</div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Contact & License Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }}>
                                <Phone size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                                <span>{metrics.phone}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }}>
                                {u.role === 'DRIVER' ? (
                                  <>
                                    <IdCard size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                                    <span>{metrics.license}</span>
                                  </>
                                ) : (
                                  <>
                                    <Shield size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                                    <span>User ID: #{u.id} · {u.email}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons Row */}
                            {(u.accountStatus === 'PENDING' || (!isController || u.role === 'DRIVER')) && (
                              <div style={{ borderTop: `1px solid ${D.border}`, margin: '8px 0 0', paddingTop: '16px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                {u.accountStatus === 'PENDING' && (
                                  <>
                                    <button onClick={() => handleApprove(u.id, u.userName)} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: D.green, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', boxShadow: `0 4px 12px ${D.green}30` }}
                                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                      <Check size={14} /> Approve
                                    </button>
                                    <button onClick={() => handleReject(u.id, u.userName)} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: D.red, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', boxShadow: `0 4px 12px ${D.red}30` }}
                                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                      <X size={14} /> Reject
                                    </button>
                                  </>
                                )}
                                {(!isController || u.role === 'DRIVER') && (
                                  <>
                                    <button onClick={() => handleEdit(u)} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 99, 235,0.15)'; e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.color = '#60a5fa' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text }}>
                                      Edit
                                    </button>
                                    <button onClick={() => handleDelete(u.id)} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = D.red }}>
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={() => setShowModal(false)}>
          <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600, opacity: 0.9 }}>
                    {editingUser ? `Refining details for ${editingUser.userName}` : 'Register a new account in the system'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 10, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '36px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
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
                  <select name="role" value={formData.role} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="DRIVER" style={{ background: D.surfaceHi }}>Driver</option>
                    {!isController && (
                      <>
                        <option value="CONTROLLER" style={{ background: D.surfaceHi }}>Controller</option>
                        <option value="ADMIN" style={{ background: D.surfaceHi }}>Admin</option>
                      </>
                    )}
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Profile Picture <span style={{ color: D.textFaint, fontWeight: 400, textTransform: 'none' }}>(optional — upload an image)</span></label>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <img
                      src={formData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.userName || 'U')}&background=2563eb&color=fff&size=128&bold=true`}
                      alt="preview"
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${D.surfaceHi}`, boxShadow: `0 0 0 1px ${D.border}`, flexShrink: 0 }}
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.userName || 'U')}&background=2563eb&color=fff&size=128&bold=true`
                      }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '10px 20px', borderRadius: 12,
                            border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)',
                            color: D.text, cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 800,
                            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 99, 235,0.15)'; e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.4)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = D.border }}
                        >
                          Upload Image
                        </button>
                        {formData.profilePicture && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))}
                            style={{
                              padding: '10px 16px', borderRadius: 12,
                              border: `1px solid ${D.red}40`, background: D.redDim,
                              color: D.red, cursor: 'pointer',
                              fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 800,
                              transition: 'all 0.15s'
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: D.textSub }}>JPG, PNG — max 1 MB. Image will be stored directly in the system.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button type="submit" style={{ flex: 1, padding: '14px 24px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, transition: 'all 0.25s', boxShadow: '0 8px 24px rgba(37, 99, 235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 99, 235,0.4)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235,0.3)' }}>
                  <Check size={18} /> {editingUser ? 'Save Changes' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 0.4, padding: '14px 24px', borderRadius: 16, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
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
