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
import { Check, X, Clock, RefreshCw, AlertCircle, Users, UserCheck, UserPlus, ShieldCheck, Phone, IdCard, Shield, Car, BarChart2, Star, Activity, CheckCircle, RotateCcw, Archive, Trash2, User, FileText, Upload, Search, UserCog, Mail, ClipboardList, Eye, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const onFocus = e => {
  e.target.style.borderColor = 'var(--primary)'
  e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'
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

  const isOrangeProfile = isController && !isAdmin

  const roleTheme = isOrangeProfile ? {
    primary: isDark ? '#fbbf24' : '#d97706',
    bgLight: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)',
    borderLight: isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)',
    btnBorder: isDark ? 'rgba(245,158,11,0.5)' : '#fde68a',
    btnBg: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb',
    btnBgHover: isDark ? 'rgba(245,158,11,0.22)' : '#fef3c7',
    editBg: isDark ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#d97706,#b45309)',
    editHover: isDark ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
    shadow: 'rgba(245,158,11,0.35)',
  } : {
    primary: isDark ? '#a78bfa' : '#7c3aed',
    bgLight: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
    borderLight: isDark ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.2)',
    btnBorder: isDark ? 'rgba(124,58,237,0.5)' : '#ddd6fe',
    btnBg: isDark ? 'rgba(124,58,237,0.12)' : '#f5f3ff',
    btnBgHover: isDark ? 'rgba(124,58,237,0.22)' : '#ede9fe',
    editBg: isDark ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    editHover: isDark ? 'linear-gradient(135deg,#a78bfa,#8b5cf6)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    shadow: 'rgba(124,58,237,0.35)',
  }

  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [showAllPending, setShowAllPending] = useState(false)
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
  const [attachmentViewer, setAttachmentViewer] = useState({
    isOpen: false,
    url: '',
    type: '',
    filename: '',
    loading: false
  })
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
  const [userToDelete, setUserToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'approve'|'reject', id, username }

  const loadDeletedUsers = useCallback(async () => {
    setDeletedLoading(true)
    try {
      const res = await userAPI.getDeletedUsers()
      let data = res.data.data || []
      if (isController) {
        data = data.filter(u => u.role !== 'ADMIN')
      }
      setDeletedUsers(data)
    } catch (err) {
      console.error('Error loading deleted users:', err)
    } finally {
      setDeletedLoading(false)
    }
  }, [isController])

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
  const controllersCount = users.filter(u => u.role === 'CONTROLLER').length
  const driversCount = users.filter(u => u.role === 'DRIVER').length
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
      let userList = Array.isArray(data) ? data : []
      if (isController) {
        userList = userList.filter(u => u.role !== 'ADMIN')
      }
      setUsers(userList)
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

  const handleApprove = (id, username) => {
    setConfirmAction({ type: 'approve', id, username })
  }

  const handleReject = (id, username) => {
    setConfirmAction({ type: 'reject', id, username })
  }

  const executeConfirmAction = async () => {
    if (!confirmAction) return
    const { type, id, username } = confirmAction
    setConfirmAction(null)
    setError('')
    setActionMsg('')
    try {
      if (type === 'approve') {
        await userAPI.approveUser(id)
        setActionMsg(`${username} has been approved.`)
      } else {
        await userAPI.rejectUser(id)
        setActionMsg(`${username}'s account has been rejected.`)
      }
      setTimeout(() => setActionMsg(''), 4000)
      loadPending()
      if (isAdmin || isController) loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || (type === 'approve' ? 'Failed to approve user' : 'Failed to reject user'))
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

  const confirmDelete = async () => {
    if (!userToDelete) return
    setError('')
    setActionMsg('')
    setDeleting(true)
    try {
      await userAPI.deleteUser(userToDelete.id)
      setActionMsg('User has been deleted successfully.')
      setTimeout(() => setActionMsg(''), 4000)
      if (isAdmin || isController) loadUsers()
      loadPending()
      setUserToDelete(null)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete user')
    } finally {
      setDeleting(false)
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

  const renderUserCard = (u, i) => {
    const metrics = getDriverMetrics(u, [])
    const initials = u.userName
      ? u.userName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : 'U'

    const userStatus = (u.accountStatus || 'ACTIVE').toUpperCase()

    const statusBadge = {
      ACTIVE: { label: 'Active', bg: 'linear-gradient(135deg,#10b981,#059669)', shadow: 'rgba(16,185,129,0.45)' },
      PENDING: { label: 'Pending', bg: 'linear-gradient(135deg,#fbbf24,#d97706)', shadow: 'rgba(251,191,36,0.45)' },
      INACTIVE: { label: 'Inactive', bg: 'linear-gradient(135deg,#ef4444,#b91c1c)', shadow: 'rgba(239,68,68,0.45)' },
      SUSPENDED: { label: 'Suspended', bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', shadow: 'rgba(139,92,246,0.45)' },
    }
    const badge = statusBadge[userStatus] || statusBadge.ACTIVE

    const hoverGlow = {
      ACTIVE: 'rgba(16,185,129,0.2)',
      PENDING: 'rgba(251,191,36,0.2)',
      INACTIVE: 'rgba(239,68,68,0.18)',
      SUSPENDED: 'rgba(139,92,246,0.2)',
    }[userStatus] || 'rgba(99,102,241,0.2)'

    const friendlyRole = u.role === 'ADMIN' ? 'Fleet Administrator' : u.role === 'CONTROLLER' ? 'Fleet Controller' : 'Fleet Driver'
    const accessLevel = u.role === 'ADMIN' ? 'Full Access' : u.role === 'CONTROLLER' ? 'High Access' : 'Standard'

    return (
      <div key={u.id} style={{
        background: D.surface,
        border: `1px solid ${D.border}`,
        borderRadius: 24,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.35)' : '0 4px 24px rgba(0,0,0,0.1)',
        transition: 'all 0.32s cubic-bezier(0.4,0,0.2,1)',
        animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
        cursor: 'default',
        position: 'relative',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-8px)'
          e.currentTarget.style.boxShadow = `0 20px 48px ${hoverGlow}, 0 6px 20px rgba(0,0,0,0.15)`
          e.currentTarget.style.borderColor = roleTheme.borderLight
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = isDark ? '0 4px 24px rgba(0,0,0,0.35)' : '0 4px 24px rgba(0,0,0,0.1)'
          e.currentTarget.style.borderColor = D.border
        }}
      >
        {/* ── Avatar / Hero Area (Edge-to-Edge) ── */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 140,
          background: isDark
            ? 'linear-gradient(160deg,rgba(30,41,59,0.95) 0%,rgba(15,23,42,0.9) 100%)'
            : 'linear-gradient(160deg,#f0f4ff 0%,#e8eeff 100%)',
          borderBottom: `1px solid ${D.border}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Decorative background circles */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: badge.shadow.replace('0.45', '0.08'), pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -10, width: 90, height: 90, borderRadius: '50%', background: badge.shadow.replace('0.45', '0.05'), pointerEvents: 'none' }} />

          {/* Profile picture or initials avatar */}
          {u.profilePicture ? (
            <img
              src={u.profilePicture}
              alt={u.userName}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1, position: 'relative' }}
              onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=6366f1&color=ffffff&bold=true` }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: badge.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '1.6rem', fontWeight: 900,
              border: `3px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)'}`,
              boxShadow: `0 8px 24px ${badge.shadow}`,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.02em',
              zIndex: 1, position: 'relative',
            }}>
              {initials}
            </div>
          )}
        </div>

        {/* ── User Identity Section ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px 0' }}>
          <div style={{ fontSize: '1.18rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em', textAlign: 'center', lineHeight: 1.2, marginBottom: 8 }}>
            {u.userName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{
              background: roleTheme.bgLight,
              border: `1px solid ${roleTheme.borderLight}`,
              borderRadius: 6, padding: '2px 9px',
              fontSize: '0.72rem', fontWeight: 800, color: roleTheme.primary, letterSpacing: '0.03em',
            }}>
              {friendlyRole}
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 9px', borderRadius: 6,
              background: badge.shadow.replace('0.45', '0.1'),
              fontSize: '0.72rem', fontWeight: 800,
              color: badge.bg.includes('#10b981') ? '#059669' : badge.bg.includes('#fbbf24') ? '#d97706' : badge.bg.includes('#ef4444') ? '#dc2626' : '#7c3aed',
            }}>
              <Activity size={11} style={{ flexShrink: 0 }} />
              {badge.label}
            </span>
          </div>
        </div>

        {/* ── Info Rows ── */}
        <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>

          {/* Email row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 12,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
          }}>
            <Mail size={13} style={{ color: roleTheme.primary, flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: D.textSub, flex: 1 }}>Email</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }} title={u.email}>
              {u.email || 'N/A'}
            </span>
          </div>

          {/* Phone row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 12,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
          }}>
            <Phone size={13} style={{ color: roleTheme.primary, flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: D.textSub, flex: 1 }}>Phone</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.text }}>
              {u.phoneNumber || metrics.phone || 'N/A'}
            </span>
          </div>

          {/* License (Driver) or NIC (Others) row */}
          {u.role === 'DRIVER' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 12,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            }}>
              <ClipboardList size={13} style={{ color: roleTheme.primary, flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: D.textSub, flex: 1 }}>License</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.text }}>
                {u.licenseNumber || metrics.license || 'N/A'}
              </span>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 12,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            }}>
              <IdCard size={13} style={{ color: roleTheme.primary, flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: D.textSub, flex: 1 }}>NIC</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: D.text }}>
                {u.nic || 'N/A'}
              </span>
            </div>
          )}
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ padding: '16px 20px 20px', display: 'flex', gap: 10, marginTop: 'auto' }}>
          {u.accountStatus === 'PENDING' ? (
            <>
              <button onClick={e => { e.stopPropagation(); handleApprove(u.id, u.userName) }}
                style={{ flex: 1, padding: '11px 14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.22s', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.35)' }}>
                <Check size={14} /> Approve
              </button>
              <button onClick={e => { e.stopPropagation(); handleReject(u.id, u.userName) }}
                style={{ flex: 1, padding: '11px 14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#ef4444,#b91c1c)', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.22s', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.35)' }}>
                <X size={14} /> Reject
              </button>
            </>
          ) : (
            <>
              {/* Profile — outline style */}
              <button
                onClick={e => { e.stopPropagation(); openProfile(u) }}
                title="View Profile"
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: 14,
                  border: `2px solid ${roleTheme.btnBorder}`,
                  background: roleTheme.btnBg,
                  color: roleTheme.primary,
                  cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.22s', fontFamily: 'inherit', letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = roleTheme.btnBgHover
                  e.currentTarget.style.borderColor = roleTheme.primary
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 4px 14px ${roleTheme.shadow}`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = roleTheme.btnBg
                  e.currentTarget.style.borderColor = roleTheme.btnBorder
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Eye size={14} /> Profile
              </button>

              {/* Edit — solid filled (hide for non-editable admins) */}
              {(!isController || u.role !== 'ADMIN') && (
                <button
                  onClick={e => { e.stopPropagation(); handleEdit(u) }}
                  title="Edit User"
                  style={{
                    flex: 1, padding: '11px 14px', borderRadius: 14, border: 'none',
                    background: roleTheme.editBg,
                    color: '#fff',
                    cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.22s', fontFamily: 'inherit', letterSpacing: '0.01em',
                    boxShadow: `0 4px 14px ${roleTheme.shadow}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = roleTheme.editHover
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = `0 6px 20px ${roleTheme.shadow}`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = roleTheme.editBg
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = `0 4px 14px ${roleTheme.shadow}`
                  }}
                >
                  <Edit2 size={14} /> Edit
                </button>
              )}

              {/* Delete icon button */}
              {(!isController || u.role !== 'ADMIN') && (
                <button
                  onClick={e => { e.stopPropagation(); setUserToDelete(u) }}
                  title="Delete User"
                  style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    border: '1px solid rgba(248,113,113,0.3)',
                    background: 'rgba(248,113,113,0.08)',
                    color: D.red, cursor: 'pointer', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.22s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = D.red; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  const renderGroup = (title, items) => {
    if (items.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: `2px solid ${D.border}`, paddingBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{title}</h3>
          <span style={{ background: D.surfaceHi, color: D.textSub, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>{items.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {items.map((u, i) => renderUserCard(u, i))}
        </div>
      </div>
    )
  }

  const renderGroupedUsers = () => {
    if (roleFilter === 'ALL') {
      const admins = filteredUsers.filter(u => u.role === 'ADMIN')
      const controllers = filteredUsers.filter(u => u.role === 'CONTROLLER')
      const drivers = filteredUsers.filter(u => u.role === 'DRIVER')

      return (
        <>
          {renderGroup("Administrators", admins)}
          {renderGroup("Controllers", controllers)}
          {renderGroup("Drivers", drivers)}
        </>
      )
    } else {
      const activeItems = filteredUsers.filter(u => u.accountStatus === 'ACTIVE')
      const pendingItems = filteredUsers.filter(u => u.accountStatus === 'PENDING')
      const suspendedItems = filteredUsers.filter(u => u.accountStatus === 'SUSPENDED')
      const inactiveItems = filteredUsers.filter(u => u.accountStatus === 'INACTIVE')

      // Capitalize role name for title
      const roleTitle = roleFilter.charAt(0) + roleFilter.slice(1).toLowerCase() + 's'

      return (
        <>
          {renderGroup(`Active ${roleTitle}`, activeItems)}
          {renderGroup(`Pending ${roleTitle}`, pendingItems)}
          {renderGroup(`Suspended ${roleTitle}`, suspendedItems)}
          {renderGroup(`Inactive ${roleTitle}`, inactiveItems)}
        </>
      )
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
          <Topbar title="System User Management" subtitle="Admin / User Management" onMenuToggle={() => setSidebarOpen(o => !o)} />
          <style>{`
            .user-profile-btn-active {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
              color: #ffffff !important;
              border: none !important;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35) !important;
            }
            .user-profile-btn-active:hover {
              background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
              box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5) !important;
              transform: translateY(-1px) !important;
            }
            .user-profile-btn-pending {
              background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important;
              color: #ffffff !important;
              border: none !important;
              box-shadow: 0 4px 12px rgba(251, 191, 36, 0.35) !important;
            }
            .user-profile-btn-pending:hover {
              background: linear-gradient(135deg, #d97706 0%, #fbbf24 100%) !important;
              box-shadow: 0 6px 16px rgba(251, 191, 36, 0.5) !important;
              transform: translateY(-1px) !important;
            }
            .user-profile-btn-inactive {
              background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%) !important;
              color: #ffffff !important;
              border: none !important;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35) !important;
            }
            .user-profile-btn-inactive:hover {
              background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%) !important;
              box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5) !important;
              transform: translateY(-1px) !important;
            }
            .user-profile-btn-suspended {
              background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%) !important;
              color: #ffffff !important;
              border: none !important;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35) !important;
            }
            .user-profile-btn-suspended:hover {
              background: linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%) !important;
              box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5) !important;
              transform: translateY(-1px) !important;
            }
          `}</style>
          <div className="page-body">

            {/* Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)',
              borderRadius: 28, padding: '40px', marginBottom: 32, position: 'relative', overflow: 'hidden',
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.7), 0 0 80px var(--primary-glow), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 16px 48px rgba(0,0,0,0.15), 0 8px 32px var(--primary-glow)',
              border: '1px solid var(--border-strong)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
            }}>
              {/* decorative circles */}
              {[['80%', '-20px', '220px', 'rgba(59,130,246,0.04)'], ['20%', '60%', '150px', 'rgba(99,102,241,0.04)'], ['55%', '80%', '100px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
                <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
              ))}
              {/* Neon radial glow for dark */}
              {isDark && <div style={{ position: 'absolute', top: '50%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
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
                  <p style={{ margin: '6px 0 0', color: '#f8fafc', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} />
                    {isAdmin ? 'Manage system users, roles, permissions & access approvals across the platform' : 'Review and process pending driver account requests'}
                  </p>
                </div>
              </div>
              {(isAdmin || isController) && (
                <button onClick={handleCreate} style={{
                  position: 'relative', padding: '12px 26px', borderRadius: 999, border: 'none', background: '#fff', color: '#1e3a8a', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap'
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }}>
                  <UserPlus size={19} strokeWidth={2.8} /> Create New User
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
                  <div style={{ padding: '24px 32px 28px' }}>
                    {pendingLoad ? (
                      <div style={{ textAlign: 'center', color: D.textSub, padding: 20 }}>Loading...</div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                          {(showAllPending ? pendingUsers : pendingUsers.slice(0, 1)).map((u, i) => (
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

                        {pendingUsers.length > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                            <button
                              onClick={() => setShowAllPending(!showAllPending)}
                              style={{
                                padding: '10px 24px',
                                borderRadius: 12,
                                border: `1.5px solid ${showAllPending ? D.border : D.gold + '60'}`,
                                background: showAllPending ? 'transparent' : D.goldDim,
                                color: showAllPending ? D.textSub : D.gold,
                                fontSize: '0.84rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                transition: 'all 0.2s ease',
                                boxShadow: showAllPending ? 'none' : `0 4px 14px ${D.goldDim}`
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = showAllPending ? D.surfaceHi : D.gold;
                                e.currentTarget.style.color = showAllPending ? D.text : '#000';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = showAllPending ? 'transparent' : D.goldDim;
                                e.currentTarget.style.color = showAllPending ? D.textSub : D.gold;
                              }}
                            >
                              {showAllPending ? (
                                <>
                                  <ChevronUp size={16} /> Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={16} /> See More ({pendingUsers.length - 1} More Pending {pendingUsers.length - 1 === 1 ? 'Account' : 'Accounts'})
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* All Users List */}
              <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>


                {/* Search, Filter, and Action Toolbar */}
                <div style={{ padding: '20px 32px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: D.surface }}>
                  {/* Left Controls: Search & Filters */}
                  <div className="users-filter-row" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 300, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '2 1 350px', maxWidth: '500px', minWidth: 220 }}>
                      <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.textSub, pointerEvents: 'none' }} />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                          padding: '10px 16px 10px 38px', height: '40px', borderRadius: 12, border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'all 0.2s'
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.boxShadow = `0 0 0 3px ${D.purple}20` }}
                        onBlur={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
                      />
                    </div>

                    {/* User Status Filter Dropdown */}
                    <div style={{ position: 'relative', minWidth: 165, flexShrink: 0 }}>
                      {/* Colored status dot */}
                      <div style={{
                        position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                        width: 8, height: 8, borderRadius: '50%', pointerEvents: 'none',
                        background: statusFilter === 'ALL'       ? '#6366f1'
                                  : statusFilter === 'ACTIVE'    ? '#10b981'
                                  : statusFilter === 'PENDING'   ? '#f59e0b'
                                  : statusFilter === 'INACTIVE'  ? '#ef4444'
                                  :                                '#94a3b8',
                        boxShadow: `0 0 6px ${
                          statusFilter === 'ALL'       ? '#6366f180'
                        : statusFilter === 'ACTIVE'    ? '#10b98180'
                        : statusFilter === 'PENDING'   ? '#f59e0b80'
                        : statusFilter === 'INACTIVE'  ? '#ef444480'
                        :                                '#94a3b880'}`,
                        transition: 'background 0.2s ease, box-shadow 0.2s ease',
                      }} />
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 32px 10px 28px', height: '40px',
                          background: statusFilter !== 'ALL'
                            ? (statusFilter === 'ACTIVE'    ? 'rgba(16,185,129,0.08)'
                             : statusFilter === 'PENDING'   ? 'rgba(245,158,11,0.08)'
                             : statusFilter === 'INACTIVE'  ? 'rgba(239,68,68,0.08)'
                             : 'rgba(148,163,184,0.08)')
                            : 'rgba(255,255,255,0.05)',
                          border: `1.5px solid ${
                            statusFilter === 'ALL'       ? D.border
                          : statusFilter === 'ACTIVE'    ? 'rgba(16,185,129,0.4)'
                          : statusFilter === 'PENDING'   ? 'rgba(245,158,11,0.4)'
                          : statusFilter === 'INACTIVE'  ? 'rgba(239,68,68,0.4)'
                          : 'rgba(148,163,184,0.4)'}`,
                          borderRadius: 12,
                          color: statusFilter === 'ALL'       ? D.textSub
                               : statusFilter === 'ACTIVE'    ? '#10b981'
                               : statusFilter === 'PENDING'   ? '#d97706'
                               : statusFilter === 'INACTIVE'  ? '#ef4444'
                               : '#94a3b8',
                          fontSize: '0.8rem', fontWeight: 700, outline: 'none',
                          cursor: 'pointer', appearance: 'none', fontFamily: 'inherit',
                          boxSizing: 'border-box', transition: 'all 0.2s ease',
                          boxShadow: statusFilter !== 'ALL' ? `0 4px 12px ${
                            statusFilter === 'ACTIVE'    ? 'rgba(16,185,129,0.15)'
                          : statusFilter === 'PENDING'   ? 'rgba(245,158,11,0.15)'
                          : statusFilter === 'INACTIVE'  ? 'rgba(239,68,68,0.15)'
                          : 'rgba(148,163,184,0.1)'}` : 'none',
                        }}
                        onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'}
                        onBlur={e => e.target.style.boxShadow = statusFilter !== 'ALL' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'}
                      >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PENDING">Pending</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: D.textSub, fontSize: '0.75rem' }}>▾</div>
                    </div>

                    <select
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
                      style={{
                        padding: '10px 18px', height: '40px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800,
                        border: `1px solid ${D.border}`,
                        background: 'rgba(255,255,255,0.05)',
                        color: D.textSub,
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value="ALL">All Roles</option>
                      {!isController && <option value="ADMIN">Admin</option>}
                      <option value="CONTROLLER">Controller</option>
                      <option value="DRIVER">Driver</option>
                    </select>

                    {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                      <button
                        onClick={() => { setSearchTerm(''); setRoleFilter('ALL'); setStatusFilter('ALL'); }}
                        style={{
                          padding: '10px 20px', height: '40px', borderRadius: 12, border: `1px solid ${D.red}40`, background: D.redDim, color: D.red, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s ease', animation: 'fadeIn 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = D.red; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = D.redDim; e.currentTarget.style.color = D.red }}
                      >
                        <RotateCcw size={14} /> Clear
                      </button>
                    )}
                  </div>

                  {/* Right Controls: Action Buttons */}
                  <div className="service-action-btns" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'nowrap' }}>
                    <button onClick={handleExportCSV} style={{
                      padding: '10px 14px', height: '40px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.03)', color: D.textSub, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap'
                    }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = D.text }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = D.textSub }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span className="btn-label-hide-sm">Export CSV</span>
                    </button>
                    <button onClick={handleExportPDF} style={{
                      padding: '10px 14px', height: '40px', borderRadius: 12, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.03)', color: D.textSub, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap'
                    }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = D.text }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = D.textSub }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span className="btn-label-hide-sm">Export PDF</span>
                    </button>
                    <button
                      onClick={() => setDeletedDrawer(true)}
                      title="Deleted Users"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 14px', height: '40px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.03)', border: `1px solid ${D.border}`,
                        color: D.textSub, fontSize: '0.8rem', fontWeight: 800,
                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.28)'; e.currentTarget.style.color = '#f87171' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textSub }}
                    >
                      <Archive size={14} />
                      <span className="btn-label-hide-sm">Deleted Users</span>
                    </button>
                    <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: D.textSub, cursor: 'pointer', padding: 8, borderRadius: 8, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'} title="Refresh users list">
                      <RefreshCw size={18} />
                    </button>
                  </div>
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
                    renderGroupedUsers()
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
              <div style={{
                background: isOrangeProfile
                  ? 'linear-gradient(135deg, #b45309 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
                padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {u.profilePicture ? (
                    <img src={u.profilePicture} alt={u.userName} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=${isOrangeProfile ? 'd97706' : '7c3aed'}&color=fff&bold=true`; }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0 }}>
                      {initials}
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {u.userName}
                    </h3>
                    <p style={{ margin: '4px 0 0', color: isOrangeProfile ? '#fef3c7' : '#e9d5ff', fontSize: '0.85rem', fontWeight: 600 }}>
                      {u.email}
                    </p>
                  </div>
                </div>
                <button onClick={closeProfile} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}><X size={20} /></button>
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
                                const path = u.licenseDocumentPath || ''
                                const lowerPath = path.toLowerCase()
                                const rawBlob = res.data instanceof Blob ? res.data : new Blob([res.data])
                                let contentType = rawBlob.type || res.headers['content-type'] || res.headers.get?.('content-type')
                                if (!contentType || contentType === 'application/octet-stream') {
                                  if (lowerPath.endsWith('.pdf')) contentType = 'application/pdf'
                                  else if (lowerPath.endsWith('.png')) contentType = 'image/png'
                                  else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) contentType = 'image/jpeg'
                                  else if (lowerPath.endsWith('.gif')) contentType = 'image/gif'
                                  else if (lowerPath.endsWith('.webp')) contentType = 'image/webp'
                                  else if (lowerPath.endsWith('.avif')) contentType = 'image/avif'
                                  else if (lowerPath.endsWith('.svg')) contentType = 'image/svg+xml'
                                  else contentType = 'image/jpeg' // default fallback
                                }
                                const blob = rawBlob.type === contentType ? rawBlob : new Blob([rawBlob], { type: contentType })
                                const url = window.URL.createObjectURL(blob)
                                if (contentType.includes('pdf')) {
                                  window.open(url, '_blank')
                                } else {
                                  const filename = path.substring(path.lastIndexOf('/') + 1)
                                  setAttachmentViewer({
                                    isOpen: true,
                                    url,
                                    type: contentType,
                                    filename: filename.includes('_') ? filename.substring(filename.indexOf('_') + 1) : filename,
                                    loading: false
                                  })
                                }
                              } catch (err) {
                                let errMsg = "Failed to load document."
                                if (err.response?.data instanceof Blob) {
                                  try {
                                    const text = await err.response.data.text()
                                    const errorObj = JSON.parse(text)
                                    errMsg = errorObj.message || errMsg
                                  } catch (e) { }
                                } else if (err.response?.data?.message) {
                                  errMsg = err.response.data.message
                                }
                                alert(errMsg)
                              }
                            }}
                            style={{
                              background: 'none', border: 'none', color: roleTheme.primary,
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
                {u.accountStatus === 'PENDING' ? (
                  <>
                    <button onClick={() => { closeProfile(); handleApprove(u.id, u.userName); }} style={{ padding: '10px 20px', borderRadius: 9999, border: 'none', background: D.green, color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', boxShadow: `0 4px 12px ${D.green}30` }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <Check size={16} /> Approve
                    </button>
                    <button onClick={() => { closeProfile(); handleReject(u.id, u.userName); }} style={{ padding: '10px 20px', borderRadius: 9999, border: 'none', background: D.red, color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', boxShadow: `0 4px 12px ${D.red}30` }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <X size={16} /> Reject
                    </button>
                  </>
                ) : (
                  (!isController || u.role !== 'ADMIN') && (
                    <button onClick={() => { closeProfile(); handleEdit(u); }} style={{ padding: '10px 20px', borderRadius: 9999, border: 'none', background: roleTheme.editBg, color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 12px ${roleTheme.shadow}` }}
                      onMouseEnter={e => { e.currentTarget.style.background = roleTheme.editHover; e.currentTarget.style.transform = 'translateY(-1px)' }} onMouseLeave={e => { e.currentTarget.style.background = roleTheme.editBg; e.currentTarget.style.transform = 'translateY(0)' }}>
                      Edit Details
                    </button>
                  )
                )}
                <button onClick={closeProfile} style={{ padding: '10px 20px', borderRadius: 9999, border: `1.5px solid ${roleTheme.btnBorder}`, background: roleTheme.btnBg, color: roleTheme.primary, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = roleTheme.primary; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = roleTheme.btnBg; e.currentTarget.style.color = roleTheme.primary }}>
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
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 45%, var(--primary-light) 100%)',
              padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0
                }}>
                  <Users size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                    {editingUser ? `Refining details for ${editingUser.userName}` : 'Register a new account in the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: 9, color: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                <X size={20} />
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
                                const path = editingUser.licenseDocumentPath || ''
                                const lowerPath = path.toLowerCase()
                                const rawBlob = res.data instanceof Blob ? res.data : new Blob([res.data])
                                let contentType = rawBlob.type || res.headers['content-type'] || res.headers.get?.('content-type')
                                if (!contentType || contentType === 'application/octet-stream') {
                                  if (lowerPath.endsWith('.pdf')) contentType = 'application/pdf'
                                  else if (lowerPath.endsWith('.png')) contentType = 'image/png'
                                  else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) contentType = 'image/jpeg'
                                  else if (lowerPath.endsWith('.gif')) contentType = 'image/gif'
                                  else if (lowerPath.endsWith('.webp')) contentType = 'image/webp'
                                  else if (lowerPath.endsWith('.avif')) contentType = 'image/avif'
                                  else if (lowerPath.endsWith('.svg')) contentType = 'image/svg+xml'
                                  else contentType = 'image/jpeg' // default fallback
                                }
                                const blob = rawBlob.type === contentType ? rawBlob : new Blob([rawBlob], { type: contentType })
                                const url = window.URL.createObjectURL(blob)
                                if (contentType.includes('pdf')) {
                                  window.open(url, '_blank')
                                } else {
                                  const filename = path.substring(path.lastIndexOf('/') + 1)
                                  setAttachmentViewer({
                                    isOpen: true,
                                    url,
                                    type: contentType,
                                    filename: filename.includes('_') ? filename.substring(filename.indexOf('_') + 1) : filename,
                                    loading: false
                                  })
                                }
                              } catch (err) {
                                let errMsg = "Failed to load document."
                                if (err.response?.data instanceof Blob) {
                                  try {
                                    const text = await err.response.data.text()
                                    const errorObj = JSON.parse(text)
                                    errMsg = errorObj.message || errMsg
                                  } catch (e) { }
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
                <button type="submit" style={{ flex: 1, padding: '14px 24px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, transition: 'all 0.25s', boxShadow: '0 8px 24px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px var(--primary-glow)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--primary-glow)' }}
                >
                  <Check size={18} /> {editingUser ? 'Save Changes' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 0.4, padding: '14px 24px', borderRadius: 16, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = D.surfaceHi}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Delete (Archive) Confirmation Modal ──────────────────── */}
      {userToDelete && (
        <div onClick={() => !deleting && setUserToDelete(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', padding: '36px 32px', textAlign: 'center', animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
            <button
              type="button"
              onClick={() => !deleting && setUserToDelete(null)}
              disabled={deleting}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: 8,
                color: D.textSub,
                cursor: deleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={18} />
            </button>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: D.redDim, border: `1px solid ${D.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.red, margin: '0 auto 20px' }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Are you sure to delete "{userToDelete.userName}"?
            </h3>
            <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.6 }}>
              This account will be moved to Deleted Users. It will be removed from the active list but can be restored at any time.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
                style={{
                  flex: 1,
                  maxWidth: 170,
                  padding: '11px 20px',
                  borderRadius: 12,
                  border: `1px solid ${D.border}`,
                  background: 'transparent',
                  color: D.text,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  maxWidth: 170,
                  padding: '11px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: D.red,
                  color: '#fff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isDark ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(239,68,68,0.2)',
                  fontFamily: 'inherit',
                  opacity: deleting ? 0.7 : 1
                }}
                onMouseEnter={e => { if (!deleting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isDark ? '0 6px 16px rgba(239,68,68,0.4)' : '0 6px 16px rgba(239,68,68,0.3)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(239,68,68,0.2)' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve / Reject Confirmation Modal ───────────────────── */}
      {confirmAction && (
        <div
          onClick={() => setConfirmAction(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, animation: 'fadeIn 0.2s ease' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, borderRadius: 28, border: `1px solid ${D.border}`, boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)' : '0 32px 80px rgba(0,0,0,0.25)', padding: '40px 36px 32px', textAlign: 'center', animation: 'scaleIn 0.28s cubic-bezier(0.16,1,0.3,1)' }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              style={{ position: 'absolute', top: 18, right: 18, background: 'transparent', border: 'none', borderRadius: 10, padding: 8, color: D.textSub, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={18} />
            </button>

            {/* Icon */}
            <div style={{ width: 72, height: 72, borderRadius: 22, background: confirmAction.type === 'approve' ? D.greenDim : D.redDim, border: `1px solid ${confirmAction.type === 'approve' ? D.green : D.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: confirmAction.type === 'approve' ? D.green : D.red, margin: '0 auto 22px' }}>
              {confirmAction.type === 'approve' ? <UserCheck size={32} /> : <X size={32} />}
            </div>

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(confirmAction.username)}&background=2563eb&color=fff&bold=true`}
                alt={confirmAction.username}
                style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${D.border}` }}
              />
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: D.text }}>{confirmAction.username}</span>
            </div>

            <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900, color: D.text, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              {confirmAction.type === 'approve' ? 'Approve Account?' : 'Reject Account?'}
            </h3>
            <p style={{ margin: '0 0 30px', fontSize: '0.9rem', color: D.textSub, lineHeight: 1.65 }}>
              {confirmAction.type === 'approve'
                ? <>Activating <strong style={{ color: D.text }}>{confirmAction.username}</strong>'s account will grant them full system access based on their assigned role.</>
                : <>Rejecting <strong style={{ color: D.text }}>{confirmAction.username}</strong>'s request will set their account to <strong style={{ color: D.red }}>Inactive</strong>. They will not be able to log in.</>}
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                style={{ flex: 1, maxWidth: 160, padding: '12px 20px', borderRadius: 14, border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmAction}
                style={{
                  flex: 1, maxWidth: 200, padding: '12px 20px', borderRadius: 14, border: 'none',
                  background: confirmAction.type === 'approve'
                    ? 'linear-gradient(135deg,#10b981,#059669)'
                    : 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800,
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  boxShadow: confirmAction.type === 'approve' ? '0 6px 20px rgba(16,185,129,0.35)' : '0 6px 20px rgba(239,68,68,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = confirmAction.type === 'approve' ? '0 10px 28px rgba(16,185,129,0.45)' : '0 10px 28px rgba(239,68,68,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = confirmAction.type === 'approve' ? '0 6px 20px rgba(16,185,129,0.35)' : '0 6px 20px rgba(239,68,68,0.35)' }}
              >
                {confirmAction.type === 'approve' ? <><Check size={16} /> Approve</> : <><X size={16} /> Reject</>}
              </button>
            </div>
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

      {/* ── Attachment Lightbox Modal ─────────────────────────────────── */}
      {attachmentViewer.isOpen && (
        <div
          onClick={() => setAttachmentViewer(prev => ({ ...prev, isOpen: false }))}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '24px',
          }}
        >
          {/* Header controls */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 24, left: 24, right: 24,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              color: '#fff', zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={18} color="#10b981" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  License Document
                </h4>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                  {attachmentViewer.filename}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {/* Download button */}
              <a
                href={attachmentViewer.url}
                download={attachmentViewer.filename}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, color: '#fff', padding: '8px 16px', fontSize: '0.8rem',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: 6, textDecoration: 'none', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                Download
              </a>
              {/* Close button */}
              <button
                onClick={() => setAttachmentViewer(prev => ({ ...prev, isOpen: false }))}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, color: '#fff', padding: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', height: '100%',
              maxWidth: '85vw', maxHeight: '75vh', marginTop: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <img
              src={attachmentViewer.url}
              alt="License Attachment"
              style={{
                maxWidth: '100%', maxHeight: '100%', borderRadius: 16,
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                objectFit: 'contain', background: '#000',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default UsersPage
