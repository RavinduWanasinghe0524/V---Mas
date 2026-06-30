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

import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD, useTheme } from '../context/ThemeContext'
import api, { userAPI } from '../services/api'
import { getDriverMetrics } from '../utils/driverUtils'
import { Check, X, Clock, RefreshCw, AlertCircle, Users, UserCheck, UserPlus, ShieldCheck, Phone, IdCard, Shield, Car, BarChart2, Star, Activity, CheckCircle, RotateCcw, Archive, Trash2, User, FileText, Upload, Search } from 'lucide-react'
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
    userName: '', email: '', password: '', role: 'DRIVER', accountStatus: 'ACTIVE', profilePicture: '',
    phoneNumber: '', gender: 'Male', nic: '', dateOfBirth: '', licenseNumber: '', licenseExpiryDate: '',
    dateJoined: '', experience: ''
  })
  const [licenseFile, setLicenseFile] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Pre-apply role/status filters when navigated here with them (e.g. dashboard stat cards & Driver Check-in).
  useEffect(() => {
    if (location.state?.roleFilter || location.state?.statusFilter) {
      if (location.state.roleFilter) setRoleFilter(location.state.roleFilter)
      if (location.state.statusFilter) setStatusFilter(location.state.statusFilter)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])
  const fileInputRef = useRef(null)

  const [selectedProfileUser, setSelectedProfileUser] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const openProfile = (user) => { setSelectedProfileUser(user); setIsProfileOpen(true); }
  const closeProfile = () => { setSelectedProfileUser(null); setIsProfileOpen(false); }

  const [deletedDrawer, setDeletedDrawer] = useState(false)
  const [deletedUsers, setDeletedUsers] = useState([])
  const [deletedLoading, setDeletedLoading] = useState(false)
  const [restoringId, setRestoringId] = useState(null)
  const [deletedDetail, setDeletedDetail] = useState(null)

  const loadDeletedUsers = useCallback(async () => {
    setDeletedLoading(true)
    try {
      const res = await userAPI.getDeletedUsers()
      setDeletedUsers(res.data.data || [])
    } catch (err) {
      console.error('Error loading deleted users:', err)
    } finally {
      setDeletedLoading(false)
    }
  }, [])

  useEffect(() => {
    if (deletedDrawer) loadDeletedUsers()
  }, [deletedDrawer, loadDeletedUsers])

  const restoreUser = async (id) => {
    setRestoringId(id)
    try {
      await userAPI.restoreUser(id)
      setActionMsg('User has been restored successfully.')
      setTimeout(() => setActionMsg(''), 4000)
      if (isAdmin || isController) loadUsers()
      setDeletedUsers(prev => prev.filter(u => u.id !== id))
      setDeletedDetail(null)
    } catch (err) {
      console.error('Error restoring user:', err)
      alert(err.response?.data?.message || 'Failed to restore user.')
    } finally {
      setRestoringId(null)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 1024 * 1024) {
      setError('Image must be under 1 MB')
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

  useEffect(() => {
    if (showModal || isProfileOpen || deletedDrawer) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showModal, isProfileOpen, deletedDrawer])

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
      if (isAdmin || isController) loadUsers()
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
      if (isAdmin || isController) loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reject user')
    }
  }

  const handleCreate = () => {
    setError('')
    setActionMsg('')
    setEditingUser(null)
    setFormData({
      userName: '', email: '', password: '', role: 'DRIVER', accountStatus: 'ACTIVE', profilePicture: '',
      phoneNumber: '', gender: 'Male', nic: '', dateOfBirth: '', licenseNumber: '', licenseExpiryDate: '',
      dateJoined: '', experience: ''
    })
    setLicenseFile(null)
    setShowModal(true)
  }

  const handleEdit = (user) => {
    setError('')
    setActionMsg('')
    setEditingUser(user)
    setFormData({
      userName: user.userName, email: user.email, password: '',
      role: user.role, accountStatus: user.accountStatus || 'ACTIVE',
      profilePicture: user.profilePicture || '',
      phoneNumber: user.phoneNumber || '',
      gender: user.gender || 'Male',
      nic: user.nic || '',
      dateOfBirth: user.dateOfBirth || '',
      licenseNumber: user.licenseNumber || '',
      licenseExpiryDate: user.licenseExpiryDate || '',
      dateJoined: user.dateJoined || '',
      experience: user.experience || ''
    })
    setLicenseFile(null)
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
      if (isAdmin || isController) loadUsers()
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
      
      let savedUser = null
      if (editingUser) {
        if (!submitData.password) delete submitData.password
        const res = await userAPI.updateUser(editingUser.id, submitData)
        savedUser = res.data?.data
        setActionMsg(`User "${submitData.userName}" has been updated successfully.`)
      } else {
        const res = await userAPI.createUser(submitData)
        savedUser = res.data?.data
        setActionMsg(`User "${submitData.userName}" has been created successfully.`)
      }

      if (formData.role === 'DRIVER' && licenseFile && savedUser && savedUser.id) {
        try {
          await userAPI.uploadDocument(savedUser.id, 'license', licenseFile, submitData.licenseExpiryDate)
        } catch (uploadErr) {
          console.error("Document upload failed:", uploadErr)
          alert("User details saved successfully, but the license document upload failed: " + (uploadErr.response?.data?.message || uploadErr.message))
        }
      }

      setTimeout(() => setActionMsg(''), 4000)
      setShowModal(false)
      if (isAdmin || isController) loadUsers()
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
              {(isAdmin || isController) && (
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
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
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
                    {/* Deleted Users Button */}
                    <button
                      onClick={() => setDeletedDrawer(true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 16px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.03)', border: `1px solid ${D.border}`,
                        color: D.textSub, fontSize: '0.8rem', fontWeight: 800,
                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.28)'; e.currentTarget.style.color = '#f87171' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub }}
                    >
                      <Archive size={14} />
                      Deleted Users
                    </button>
                    <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 8, borderRadius: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'} title="Refresh users list">
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                {/* Search and filter row */}
                <div style={{ padding: '20px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: D.surface }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: D.textSub }} />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{
                        padding: '12px 16px 12px 42px', borderRadius: 12, border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'all 0.2s'
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.boxShadow = `0 0 0 3px ${D.purple}20` }}
                      onBlur={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
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
<<<<<<< HEAD
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                      {filteredUsers.map((u, i) => {
                        const metrics = getDriverMetrics(u, [])
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
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', animation: `fadeUp 0.4s ease ${i * 0.05}s both`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            cursor: 'pointer'
                          }}
                            onClick={() => openProfile(u)}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '60'; e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.surface; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)' }}>

                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                {/* Avatar */}
                                <div style={{ flexShrink: 0 }}>
                                  {u.profilePicture ? (
                                    <img
                                      src={u.profilePicture}
                                      alt={u.userName}
                                      style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${D.border}`, transition: 'transform 0.2s ease', cursor: 'pointer' }}
                                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
                                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=2563eb&color=fff&bold=true`; }}
                                    />
                                  ) : (
                                    <div
                                      style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', fontWeight: 800, border: `2px solid ${D.border}`, transition: 'transform 0.2s ease', cursor: 'pointer' }}
                                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
                                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                      {initials}
                                    </div>
                                  )}
                                </div>
                                {/* Name and Subtitle */}
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>{u.userName}</h4>
                                  {u.role === 'DRIVER' ? (
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: D.textSub, fontWeight: 500 }}>
                                      Active Driver
                                    </p>
                                  ) : (
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: D.textSub, fontWeight: 500 }}>
                                      {u.role === 'ADMIN' ? 'System Administrator' : 'Fleet Controller'}
                                    </p>
                                  )}
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
                                let themeStyles = {}
                                let stIcon = null
                                
                                if (sidx === 0) {
                                  themeStyles = {
                                    bg: isDark ? 'rgba(59, 130, 246, 0.04)' : 'rgba(59, 130, 246, 0.02)',
                                    border: isDark ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid rgba(59, 130, 246, 0.1)',
                                    color: D.blue
                                  }
                                  stIcon = u.role === 'DRIVER' ? <BarChart2 size={11} style={{ color: D.blue }} /> : <ShieldCheck size={11} style={{ color: D.blue }} />
                                } else if (sidx === 1) {
                                  themeStyles = {
                                    bg: isDark ? 'rgba(245, 158, 11, 0.03)' : 'rgba(245, 158, 11, 0.02)',
                                    border: isDark ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(245, 158, 11, 0.1)',
                                    color: '#fbbf24'
                                  }
                                  stIcon = u.role === 'DRIVER' ? <Star size={11} style={{ color: '#fbbf24' }} /> : <Shield size={11} style={{ color: '#fbbf24' }} />
                                } else {
                                  themeStyles = {
                                    bg: isDark ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.02)',
                                    border: isDark ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.1)',
                                    color: '#10b981'
                                  }
                                  stIcon = u.role === 'DRIVER' ? <Activity size={11} style={{ color: '#10b981' }} /> : <CheckCircle size={11} style={{ color: '#10b981' }} />
                                }

                                return (
                                  <div key={sidx} style={{
                                    background: themeStyles.bg,
                                    border: themeStyles.border,
                                    borderRadius: 16, padding: '14px 6px', textAlign: 'center',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                      {stIcon}
                                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: themeStyles.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.label}</span>
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: st.isRating || st.isSafety ? themeStyles.color : D.text }}>{st.value}</div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Contact & License Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }}>
                                <Phone size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                                <span>{u.phoneNumber || metrics.phone}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: D.textSub, fontWeight: 600 }}>
                                {u.role === 'DRIVER' ? (
                                  <>
                                    <IdCard size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                                    <span>{u.licenseNumber || metrics.license}</span>
                                  </>
                                ) : (
                                  <>
                                    <Shield size={14} style={{ color: D.textSub, flexShrink: 0 }} />
                                    <span>NIC: {u.nic || 'N/A'} · Gender: {u.gender || 'N/A'}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons Row */}
                            {(u.accountStatus === 'PENDING' || (!isController || u.role !== 'ADMIN')) && (
                              <div style={{ borderTop: `1px solid ${D.border}`, margin: '8px 0 0', paddingTop: '16px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                {u.accountStatus === 'PENDING' && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handleApprove(u.id, u.userName); }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: D.green, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', boxShadow: `0 4px 12px ${D.green}30` }}
                                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <Check size={14} /> Approve
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleReject(u.id, u.userName); }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: D.red, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', boxShadow: `0 4px 12px ${D.red}30` }}
                                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <X size={14} /> Reject
                                    </button>
                                  </>
                                )}
                                {(!isController || u.role !== 'ADMIN') && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(u); }} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 99, 235,0.15)'; e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.color = '#60a5fa' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text }}>
                                      Edit
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(u.id); }} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: D.red, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}
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

      {/* User Profile Details Modal Popup */}
      {isProfileOpen && selectedProfileUser && (() => {
        const u = selectedProfileUser
        const metrics = getDriverMetrics(u, [])
        const initials = u.userName
          ? u.userName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : 'U'
          
        let dutyStyles = {
          bg: 'rgba(255,255,255,0.05)',
          color: D.textSub,
          border: `1px solid ${D.border}`
        }
        if (metrics.status === 'On Duty' || metrics.status === 'Active') {
          dutyStyles = { bg: 'rgba(52, 211, 153, 0.12)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.25)' }
        } else if (metrics.status === 'On Leave' || metrics.status === 'Pending') {
          dutyStyles = { bg: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.25)' }
        } else if (metrics.status === 'Suspended' || metrics.status === 'Inactive') {
          dutyStyles = { bg: 'rgba(248, 113, 113, 0.12)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.25)' }
        }

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.25s ease' }}>
            {/* Backdrop */}
            <div onClick={closeProfile} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }} />

            {/* Modal Container */}
            <div style={{
              position: 'relative',
              width: '92%',
              maxWidth: 500,
              maxHeight: '90vh',
              background: D.surface,
              borderRadius: 28,
              boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
              border: `1px solid ${D.border}`,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
              animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {u.profilePicture ? (
                    <img src={u.profilePicture} alt={u.userName} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=2563eb&color=fff&bold=true`; }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                      {initials}
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {u.userName}
                    </h3>
                    <p style={{ margin: '4px 0 0', color: '#93c5fd', fontSize: '0.85rem', fontWeight: 600 }}>
                      {u.email}
                    </p>
                  </div>
                </div>
                <button onClick={closeProfile} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}><X size={20} /></button>
              </div>

              {/* Status and Role badges row */}
              <div style={{ padding: '12px 32px', background: D.surface, display: 'flex', gap: 10, borderBottom: `1px solid ${D.border}` }}>
                <RoleBadge role={u.role} D={D} />
                <span style={{ background: dutyStyles.bg, color: dutyStyles.color, border: dutyStyles.border, padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {metrics.status}
                </span>
              </div>

              {/* Detail list */}
              <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
                {u.role === 'DRIVER' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.04)', border: `1px solid rgba(59, 130, 246, 0.15)`, borderRadius: 16, padding: '14px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: D.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <BarChart2 size={12} /> {metrics.trips}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trips</div>
                    </div>
                    <div style={{ background: 'rgba(251, 191, 36, 0.04)', border: `1px solid rgba(251, 191, 36, 0.15)`, borderRadius: 16, padding: '14px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Star size={12} fill="#fbbf24" style={{ stroke: 'none' }} /> {metrics.rating}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: `1px solid rgba(16, 185, 129, 0.15)`, borderRadius: 16, padding: '14px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Activity size={12} /> {metrics.safety}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: D.textSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safety</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>User ID</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>#{u.id}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>Account Status</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: u.accountStatus === 'ACTIVE' ? D.green : u.accountStatus === 'PENDING' ? D.gold : D.red }}>{u.accountStatus}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>Phone Number</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.phoneNumber || metrics.phone}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>Gender</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.gender || 'N/A'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>NIC Number</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.nic || 'N/A'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>Date of Birth</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.dateOfBirth || 'N/A'}</span>
                  </div>

                  {u.role === 'DRIVER' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>License Number</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.licenseNumber || metrics.license}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>License Expiry</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.licenseExpiryDate || 'N/A'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, paddingBottom: 10 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>Date Joined</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.dateJoined || 'N/A'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: u.licenseDocumentPath ? `1px solid ${D.border}` : 'none', paddingBottom: u.licenseDocumentPath ? 10 : 4 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>Experience</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: D.text }}>{u.experience || 'N/A'}</span>
                      </div>

                      {u.licenseDocumentPath && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: D.textSub }}>License Document</span>
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token')
                                const res = await api.get(`/users/${u.id}/document/license`, {
                                  responseType: 'blob',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                })
                                const blob = new Blob([res.data], { type: res.headers['content-type'] })
                                const url = window.URL.createObjectURL(blob)
                                window.open(url, '_blank')
                              } catch (err) {
                                let errMsg = "Failed to load document."
                                if (err.response?.data instanceof Blob) {
                                  try {
                                    const text = await err.response.data.text()
                                    const errorObj = JSON.parse(text)
                                    errMsg = errorObj.message || errMsg
                                  } catch (e) {}
                                } else if (err.response?.data?.message) {
                                  errMsg = err.response.data.message
                                }
                                alert(errMsg)
                              }
                            }}
                            style={{
                              background: 'none', border: 'none', color: D.blue,
                              fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'underline', padding: 0
                            }}
                          >
                            <FileText size={13} /> View License
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer / Actions */}
              <div style={{ borderTop: `1px solid ${D.border}`, padding: '18px 32px', background: D.surfaceHi, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                {(!isController || u.role !== 'ADMIN') && (
                  <button onClick={() => { closeProfile(); handleEdit(u); }} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    Edit Details
                  </button>
                )}
                <button onClick={closeProfile} style={{ padding: '10px 20px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)', color: D.text, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.25s ease' }} onClick={() => setShowModal(false)}>
          <div style={{ background: D.surface, borderRadius: 32, width: '92%', maxWidth: 680, maxHeight: '90vh', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', border: `1px solid ${D.border}`, animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
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

            <form onSubmit={handleSubmit} style={{ padding: '36px', overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 30px', marginBottom: 32 }}>
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
                    <option value="CONTROLLER" style={{ background: D.surfaceHi }}>Controller</option>
                    {!isController && (
                      <option value="ADMIN" style={{ background: D.surfaceHi }}>Admin</option>
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

                {/* Common Profile Fields for All Roles */}
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. +94 77 123 4567" />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="Male" style={{ background: D.surfaceHi }}>Male</option>
                    <option value="Female" style={{ background: D.surfaceHi }}>Female</option>
                    <option value="Other" style={{ background: D.surfaceHi }}>Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>NIC Number</label>
                  <input type="text" name="nic" value={formData.nic} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 199912345678 or 991234567V" />
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>

                {/* Driver-Specific Fields */}
                {formData.role === 'DRIVER' && (
                  <>
                    <div>
                      <label style={labelStyle}>License Number</label>
                      <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. B1234567" />
                    </div>
                    <div>
                      <label style={labelStyle}>License Expiry Date</label>
                      <input type="date" name="licenseExpiryDate" value={formData.licenseExpiryDate} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div>
                      <label style={labelStyle}>Date Joined</label>
                      <input type="date" name="dateJoined" value={formData.dateJoined} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div>
                      <label style={labelStyle}>Experience</label>
                      <input type="text" name="experience" value={formData.experience} onChange={handleChange} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 5 years" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>License Document</label>
                      {editingUser?.licenseDocumentPath && !licenseFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token')
                                const res = await api.get(`/users/${editingUser.id}/document/license`, {
                                  responseType: 'blob',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                })
                                const blob = new Blob([res.data], { type: res.headers['content-type'] })
                                const url = window.URL.createObjectURL(blob)
                                window.open(url, '_blank')
                              } catch (err) {
                                let errMsg = "Failed to load document."
                                if (err.response?.data instanceof Blob) {
                                  try {
                                    const text = await err.response.data.text()
                                    const errorObj = JSON.parse(text)
                                    errMsg = errorObj.message || errMsg
                                  } catch (e) {}
                                } else if (err.response?.data?.message) {
                                  errMsg = err.response.data.message
                                }
                                alert(errMsg)
                              }
                            }}
                            style={{
                              padding: '10px 20px', borderRadius: 12, border: `1px solid ${D.border}`,
                              background: 'rgba(255,255,255,0.05)', color: D.blue, cursor: 'pointer',
                              fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8
                            }}
                          >
                            <FileText size={14} /> View Current License
                          </button>
                          <label style={{ cursor: 'pointer' }}>
                            <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setLicenseFile(e.target.files[0])} />
                            <span style={{ color: D.textSub, fontSize: '0.8rem', fontWeight: 800, textDecoration: 'underline' }}>Change Document</span>
                          </label>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} id="user-license-file" onChange={e => setLicenseFile(e.target.files[0])} />
                          <button
                            type="button"
                            onClick={() => document.getElementById('user-license-file').click()}
                            style={{
                              padding: '10px 20px', borderRadius: 12,
                              border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)',
                              color: D.text, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800,
                              display: 'flex', alignItems: 'center', gap: 8
                            }}
                          >
                            <Upload size={14} /> Upload License Document
                          </button>
                          <span style={{ fontSize: '0.8rem', color: licenseFile ? D.text : D.textSub }}>
                            {licenseFile ? licenseFile.name : 'No file chosen (Image / PDF)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
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

              {error && (
                <div style={{ padding: '12px 18px', borderRadius: 12, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 20, fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

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
      {/* ── Deleted Users Drawer ─────────────────────────────────── */}
      {deletedDrawer && (
        <div
          onClick={() => { setDeletedDrawer(false); setDeletedDetail(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)', zIndex: 1200,
            animation: 'fadeIn 0.18s ease',
          }}
        >
          {/* Drawer panel */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 700,
              background: D.bg, display: 'flex', flexDirection: 'column',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
              animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)',
              borderLeft: `1px solid ${D.border}`,
            }}
          >
            {/* Drawer Header */}
            <div style={{
              background: 'linear-gradient(135deg,#7f1d1d 0%,#991b1b 45%,#dc2626 100%)',
              padding: '22px 28px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexShrink: 0, gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  <Archive size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    Deleted Users
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                    Soft-deleted users are preserved for audit logs and history
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setDeletedDrawer(false); setDeletedDetail(null) }}
                style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, cursor: 'pointer', color: '#fff',
                  padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Count badge */}
            {!deletedLoading && (
              <div style={{
                padding: '14px 28px', background: D.surface,
                borderBottom: `1px solid ${D.border}`,
                display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 14px', borderRadius: 999,
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: '0.78rem', fontWeight: 700,
                }}>
                  <Trash2 size={12} />
                  {deletedUsers.length} user{deletedUsers.length !== 1 ? 's' : ''} deleted
                </span>
                <span style={{ fontSize: '0.75rem', color: D.textSub }}>
                  These user accounts are inactive and blocked from login
                </span>
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deletedLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, height: 90, animation: 'pulse 1.5s ease infinite' }} />
                ))
              ) : deletedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: D.textSub }}>
                  <div style={{ opacity: 0.4, display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Archive size={44} /></div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>No deleted users found.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Soft-deleted accounts will be listed here.</p>
                </div>
              ) : deletedDetail ? (
                /* ── Inner Detail View ───────────────────────────────── */
                (() => {
                  const u = deletedDetail
                  return (
                    <div style={{ animation: 'fadeIn 0.15s ease' }}>
                      {/* Action row: Back + Restore */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <button
                          onClick={() => setDeletedDetail(null)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8,
                            background: D.surface, border: `1px solid ${D.border}`,
                            color: D.textSub, cursor: 'pointer', fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          ← Back to list
                        </button>

                        {/* Restore button */}
                        <button
                          id={`restore-user-btn-${u.id}`}
                          onClick={() => restoreUser(u.id)}
                          disabled={restoringId === u.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '8px 20px', borderRadius: 8,
                            background: restoringId === u.id ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.3)',
                            cursor: restoringId === u.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.82rem', fontWeight: 700,
                            transition: 'all 0.15s',
                            opacity: restoringId === u.id ? 0.7 : 1,
                          }}
                          onMouseEnter={e => { if (restoringId !== u.id) { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' } }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.color = '#10b981' }}
                        >
                          {restoringId === u.id ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                              Restoring…
                            </>
                          ) : (
                            <>
                              <RotateCcw size={14} /> Restore Account
                            </>
                          )}
                        </button>
                      </div>

                      {/* User header card */}
                      <div style={{
                        background: 'linear-gradient(135deg,rgba(127,29,29,0.15) 0%,rgba(239,68,68,0.08) 100%)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 14, padding: '20px 22px', marginBottom: 16,
                        display: 'flex', alignItems: 'center', gap: 16,
                      }}>
                        <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=ef4444&color=fff&bold=true`} alt={u.userName} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(239,68,68,0.25)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: D.text }}>
                            {u.userName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: D.textSub, marginTop: 2 }}>
                            {u.email}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 12px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                          background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.25)', letterSpacing: '0.05em',
                          textTransform: 'uppercase', flexShrink: 0,
                        }}>DELETED</span>
                      </div>

                      {/* Deletion info */}
                      <div style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 12, padding: '16px 20px', marginBottom: 16,
                      }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444', marginBottom: 10 }}>
                          🗑 Deletion Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>Deleted By</div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <User size={14} /> {u.deletedBy || '—'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>Deleted At</div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Clock size={14} />
                              {u.deletedAt ? new Date(u.deletedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.textSub, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Account Profile <div style={{ flex: 1, height: 1, background: D.border }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
                        {[
                          ['Username', u.userName],
                          ['Email Address', u.email],
                          ['Account Role', u.role],
                          ['Original Status', u.accountStatus || 'ACTIVE'],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.textSub, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: val ? D.text : D.textSub }}>{val || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()
              ) : (
                /* ── Deleted Users List ────────────────────────────── */
                deletedUsers.map((u, i) => (
                  <div
                    key={u.id}
                    onClick={() => setDeletedDetail(u)}
                    style={{
                      background: D.surface,
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 12,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      animation: `fadeUp 0.25s ease ${i * 0.04}s both`,
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = D.surfaceHi
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 6px 24px rgba(239,68,68,0.1)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = D.surface
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=ef4444&color=fff&bold=true`} alt={u.userName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(239,68,68,0.2)' }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: D.text }}>
                          {u.userName}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
                          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.2)',
                        }}>{u.role}</span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
                          background: 'rgba(239,68,68,0.08)', color: D.textSub,
                          border: `1px solid ${D.border}`,
                        }}>DELETED</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: D.textSub }}>
                          {u.email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: D.textSub }}>
                          <User size={12} /> by {u.deletedBy || 'unknown'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); restoreUser(u.id) }}
                      disabled={restoringId === u.id}
                      style={{
                        background: 'none', padding: '6px 12px', borderRadius: 8,
                        color: '#10b981', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                        display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s ease',
                        border: '1px solid rgba(16,185,129,0.2)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      {restoringId === u.id ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default UsersPage
