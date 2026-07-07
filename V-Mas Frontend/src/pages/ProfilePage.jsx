import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD, useTheme } from '../context/ThemeContext'
import api, { profileAPI, fuelAPI, serviceAPI, vehicleAPI, userAPI } from '../services/api'
import { User, Key, ShieldCheck, Shield, Globe, Fuel, Ruler, Calendar, Car, Wrench, Edit2, AlertCircle, CheckCircle, Eye, EyeOff, Check, Trophy, Activity, Lock, Settings, LogOut, Zap, Bell, Clock, Share2, UserCheck, X, Sun, Moon, FileText, Upload } from 'lucide-react'
import { computeLogsEfficiency } from '../utils/fuelUtils'

const Toggle = ({ checked, onChange, color = '#2563eb' }) => (
  <div onClick={onChange} style={{ width: 46, height: 26, borderRadius: 13, cursor: 'pointer', background: checked ? color : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background 0.25s ease', flexShrink: 0, border: checked ? 'none' : '1px solid rgba(255,255,255,0.15)' }}>
    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: checked ? 23 : 3, transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 1px 5px rgba(0,0,0,0.35)' }} />
  </div>
)

const ALERT_TYPES = [
  { key: 'SERVICE', label: 'Service Due', icon: <Wrench size={13} /> },
  { key: 'INSURANCE', label: 'Insurance Expiry', icon: <Shield size={13} /> },
  { key: 'FUEL', label: 'Fuel Inefficiency', icon: <Fuel size={13} /> },
  { key: 'OVERDUE', label: 'Overdue Service', icon: <AlertCircle size={13} /> },
]



const onFocus = e => {
  e.target.style.borderColor = 'rgba(37, 99, 235,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = ''
  e.target.style.boxShadow = 'none'
}

const PremiumStatCard = ({ icon, label, value, suffix, colorHex, colorDim, D }) => (
  <div style={{ padding: 24, borderRadius: 14, background: D.surfaceHi, border: `2px solid ${colorHex}20`, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.2s ease', cursor: 'default' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = colorHex + '40'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${colorHex}15` }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = colorHex + '20'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
  >
    <div style={{ width: 52, height: 52, borderRadius: 14, background: colorDim, border: `2px solid ${colorHex}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colorHex, marginBottom: 14 }}>{icon}</div>
    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: D.text, marginBottom: 6 }}>{value}{suffix && <span style={{ fontSize: '0.8rem', color: colorHex, fontWeight: 700, marginLeft: 4 }}>{suffix}</span>}</div>
    <div style={{ fontSize: '0.8rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
  </div>
)

const ActivityItem = ({ label, timeAgo, color, D }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: 4, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: D.text }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: D.textSub, marginTop: 2 }}>{timeAgo}</div>
    </div>
  </div>
)

const Modal = ({ title, icon, onClose, children, D, maxWidth = 580 }) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
  >
    <div style={{ width: '100%', maxWidth, maxHeight: '90vh', background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', background: D.surfaceHi, borderBottom: `1px solid ${D.border}`, flexShrink: 0, borderRadius: '24px 24px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h2>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = D.text }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = D.textSub }}
        >
          <X size={20} />
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  </div>
)

const ProfilePage = () => {
  const D = useD()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'blue'
  const { user, updateUser } = useAuth()

  // State Hooks
  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({
    email: '', profilePicture: '', fullName: '', phone: '', address: '',
    gender: 'Male', nic: '', dateOfBirth: '', licenseNumber: '', licenseExpiryDate: '',
    licenseDocumentPath: '', dateJoined: '', experience: ''
  })
  const [licenseFile, setLicenseFile] = useState(null)
  const [attachmentViewer, setAttachmentViewer] = useState({
    isOpen: false,
    url: '',
    type: '',
    filename: '',
    loading: false
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const [fleetForm, setFleetForm] = useState({
    timezone: 'Asia/Colombo',
    fuelReportingPeriod: 'monthly',
  })
  const [fleetSaving, setFleetSaving] = useState(false)
  const [fleetSaved, setFleetSaved] = useState(false)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [activeModal, setActiveModal] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'PUBLIC',
    dataTracking: true,
    emailNotifications: true,
    systemAlerts: true,
    alertTypes: ['SERVICE', 'INSURANCE', 'FUEL', 'OVERDUE'],
    sessionTimeout: '30',
  })
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  // Refs
  const fileInputRef = useRef(null)
  // Guard: prevents the form from submitting immediately after entering edit mode.
  // When the DOM swaps "Edit Profile" → "Save Changes" at the same position,
  // the browser can fire a spurious click/submit on the new button.
  const justEnteredEditRef = useRef(false)

  // Styles
  const inputStyle = {
    width: '100%', padding: '14px 18px', borderRadius: 16,
    border: `1px solid ${D.inputBorder}`, fontSize: '0.95rem',
    color: D.text, background: D.inputBg, outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', fontFamily: 'inherit',
  }
  const labelStyle = {
    display: 'block', marginBottom: 10, fontSize: '0.75rem', fontWeight: 800,
    color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.08em',
  }

  // Handlers
  const closeModal = () => setActiveModal(null)

  const fleetKey = `vmas-fleet-settings-${user?.id || 'me'}`
  const privacyKey = `vmas-privacy-settings-${user?.id || 'me'}`

  // Load saved fleet settings (timezone, fuel reporting period) on open
  useEffect(() => {
    try {
      const saved = localStorage.getItem(fleetKey)
      if (saved) setFleetForm(prev => ({ ...prev, ...JSON.parse(saved) }))
    } catch { /* ignore malformed storage */ }
  }, [fleetKey])

  // Load saved privacy/notification settings on open
  useEffect(() => {
    try {
      const saved = localStorage.getItem(privacyKey)
      if (saved) setPrivacy(prev => ({ ...prev, ...JSON.parse(saved) }))
    } catch { /* ignore malformed storage */ }
  }, [privacyKey])

  const handleFleetSave = async () => {
    setFleetSaving(true)
    try {
      localStorage.setItem(fleetKey, JSON.stringify(fleetForm))
    } catch { /* ignore storage errors */ }
    await new Promise(r => setTimeout(r, 400))
    setFleetSaving(false)
    setFleetSaved(true)
    setTimeout(() => setFleetSaved(false), 3000)
  }

  const handlePrivacySave = async () => {
    setPrivacySaving(true)
    try {
      localStorage.setItem(privacyKey, JSON.stringify(privacy))
    } catch { /* ignore storage errors */ }
    await new Promise(r => setTimeout(r, 800))
    setPrivacySaving(false)
    setPrivacySaved(true)
    setTimeout(() => setPrivacySaved(false), 3000)
  }

  const handleNotifSave = async () => {
    setNotifSaving(true)
    try {
      localStorage.setItem(privacyKey, JSON.stringify(privacy))
      // Notify the Topbar to re-apply the alert-type filter immediately
      window.dispatchEvent(new Event('vmas-notif-settings-update'))
    } catch { /* ignore storage errors */ }
    await new Promise(r => setTimeout(r, 800))
    setNotifSaving(false)
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  const isSaving = profileLoading || pwLoading || notifSaving || fleetSaving;
  const handleSaveAll = (e) => {
    if (e) e.preventDefault();
    if (activeTab === 'profile') {
      if (isEditingProfile) {
        handleProfileSubmit({ preventDefault: () => {} })
      } else {
        setIsEditingProfile(true)
      }
    } else if (activeTab === 'security') {
      handlePasswordSubmit({ preventDefault: () => {} })
    } else if (activeTab === 'notifications') {
      handleNotifSave()
    } else if (activeTab === 'fleet') {
      handleFleetSave()
    }
  }

  const handleCancelProfileEdit = () => {
    setIsEditingProfile(false)
    setProfileError('')
    if (user) {
      setProfileForm({
        email: user.email || '',
        profilePicture: user.profilePicture || '',
        fullName: user.userName || '',
        phone: user.phoneNumber || '',
        address: user.address || '',
        gender: user.gender || 'Male',
        nic: user.nic || '',
        dateOfBirth: user.dateOfBirth || '',
        licenseNumber: user.licenseNumber || '',
        licenseExpiryDate: user.licenseExpiryDate || '',
        licenseDocumentPath: user.licenseDocumentPath || '',
        dateJoined: user.dateJoined || '',
        experience: user.experience || ''
      })
    }
    setLicenseFile(null)
  }
  const toggleAlertType = key => setPrivacy(p => ({
    ...p,
    alertTypes: p.alertTypes.includes(key) ? p.alertTypes.filter(k => k !== key) : [...p.alertTypes, key],
  }))

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const res = await profileAPI.getMyProfile()
        if (res.data?.data) {
          updateUser(res.data.data)
        }
      } catch (err) {
        console.error("Failed to fetch latest profile details:", err)
      }
    }
    fetchLatestProfile()
  }, [])

  useEffect(() => {
    // Only sync from user data when NOT actively editing,
    // to prevent resetting changes the user has typed.
    if (user && !isEditingProfile) {
      setProfileForm(prev => ({
        ...prev,
        email: user.email || '',
        profilePicture: user.profilePicture || '',
        fullName: user.userName || '',
        phone: user.phoneNumber || '',
        gender: user.gender || 'Male',
        nic: user.nic || '',
        dateOfBirth: user.dateOfBirth || '',
        licenseNumber: user.licenseNumber || '',
        licenseExpiryDate: user.licenseExpiryDate || '',
        licenseDocumentPath: user.licenseDocumentPath || '',
        dateJoined: user.dateJoined || '',
        experience: user.experience || ''
      }))
    }
  }, [user])

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [activeModal])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'DRIVER') {
          const res = await fuelAPI.getMyLogs()
          const logs = res.data?.data || []
          const avg = logs.length ? (logs.reduce((sum, l) => sum + (l.fuelEfficiency || 0), 0) / logs.length).toFixed(1) : 0
          const last = logs.length ? new Date(logs[logs.length - 1].date).toLocaleDateString() : 'N/A'
          setStats({ totalLogs: logs.length, avgEfficiency: avg, lastEntry: last })
        } else {
          const [vehicleRes, serviceRes] = await Promise.all([
            vehicleAPI.getAllVehicles().catch(err => {
              console.error('Failed to load vehicles:', err);
              return { data: { data: [] } };
            }),
            serviceAPI.getUpcomingServices().catch(err => {
              console.error('Failed to load upcoming services:', err);
              return { data: { data: [] } };
            })
          ])
          setStats({ totalVehicles: vehicleRes.data?.data?.length || 0, upcomingServices: serviceRes.data?.data?.length || 0 })
        }
      } catch {
        setStats(null)
      } finally {
        setStatsLoading(false)
      }
    }
    if (user) fetchStats()
  }, [user])

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 1024 * 1024) { setProfileError('Image must be under 1 MB'); return }
    const reader = new FileReader()
    reader.onloadend = () => setProfileForm(prev => ({ ...prev, profilePicture: reader.result }))
    reader.readAsDataURL(file)
  }

  // Enter edit mode and set a 500ms guard against spurious form submissions
  const handleEnterEditMode = () => {
    justEnteredEditRef.current = true
    setIsEditingProfile(true)
    setTimeout(() => { justEnteredEditRef.current = false }, 500)
  }

  const handleProfileSubmit = async e => {
    e.preventDefault()
    // Block submission if triggered within 500ms of entering edit mode (spurious click guard)
    if (justEnteredEditRef.current) return
    setProfileError(''); setProfileSuccess(''); setProfileLoading(true)
    try {
      if (user?.id?.toString().startsWith('demo_')) {
        await new Promise(r => setTimeout(r, 500))
        updateUser({
          ...user,
          email: profileForm.email,
          userName: profileForm.fullName,
          profilePicture: profileForm.profilePicture || user.profilePicture
        })
        setProfileSuccess('Profile updated successfully')
        return
      }
      const res = await profileAPI.updateMyProfile({
        email: profileForm.email,
        profilePicture: profileForm.profilePicture !== user?.profilePicture ? profileForm.profilePicture : null,
        phoneNumber: profileForm.phone,
        gender: profileForm.gender,
        nic: profileForm.nic,
        dateOfBirth: profileForm.dateOfBirth || null,
        licenseNumber: profileForm.licenseNumber,
        licenseExpiryDate: profileForm.licenseExpiryDate || null,
        dateJoined: profileForm.dateJoined || null,
        experience: profileForm.experience
      })
      let updated = res.data?.data

      if (user?.role === 'DRIVER' && licenseFile && updated && updated.id) {
        const uploadRes = await userAPI.uploadDocument(updated.id, 'license', licenseFile, profileForm.licenseExpiryDate)
        updated = uploadRes.data?.data
      }

      if (updated) updateUser(updated)
      setProfileSuccess('Profile updated successfully')
      setIsEditingProfile(false)
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()
    setPwError(''); setPwSuccess('')
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('New passwords do not match'); return }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return }
    setPwLoading(true)
    try {
      if (user?.id?.toString().startsWith('demo_')) {
        await new Promise(r => setTimeout(r, 500))
        setPwSuccess('Password changed successfully')
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        return
      }
      await profileAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword, confirmPassword: pwForm.confirmPassword })
      setPwSuccess('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }


  const saveBtn = (label, saving, onClick) => (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        padding: '12px 28px', borderRadius: 12, border: 'none',
        background: saving ? D.surfaceHi : 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: saving ? D.textSub : '#fff',
        cursor: saving ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 800,
        boxShadow: saving ? 'none' : '0 4px 16px rgba(37, 99, 235,0.35)',
        transition: 'all 0.25s ease', display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235,0.45)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = saving ? 'none' : '0 4px 16px rgba(37, 99, 235,0.35)' }}
    >
      {saving
        ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: D.textSub, animation: 'spin 0.7s linear infinite' }} /> Saving…</>
        : <><Check size={16} strokeWidth={3} /> {label}</>}
    </button>
  )

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="System Settings" subtitle="Home / Settings" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ padding: '28px 32px 40px' }}>

          {/* Top Banner Header */}
          <div style={{
            background: isDark
              ? 'linear-gradient(135deg, #030712 0%, #0a1628 30%, #0f2345 60%, #1a3a7a 85%, #1e40af 100%)'
              : 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
            borderRadius: 24, padding: '32px 36px', marginBottom: 32,
            position: 'relative', overflow: 'hidden',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(59,130,246,0.06)'
              : '0 8px 32px rgba(0,0,0,0.25)',
            border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : `1px solid ${D.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap'
          }}>
            {/* decorative circles */}
            {[['80%','-20px','180px','rgba(255,255,255,0.03)'],['20%','60%','120px','rgba(255,255,255,0.04)'],['55%','80%','90px','rgba(255,255,255,0.02)']].map(([t,l,s,bg],i) => (
              <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
            ))}
            
            <div style={{ flex: 1, position: 'relative' }}>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Settings, {user?.userName || 'Admin'}!
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#93c5fd', opacity: 0.9 }}>
                Manage your profile details, password, system notifications, theme options, and default fleet measurement units.
              </p>
            </div>


          </div>

          {/* Split Settings Layout */}
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            
            {/* Left Sidebar Menu */}
            <div
              className="profile-settings-tabs"
              style={{
                width: '100%', maxWidth: 280, background: D.surface, borderRadius: 24,
                border: `1px solid ${D.border}`, padding: '16px 12px', flexShrink: 0,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            >
              {[
                { key: 'profile', label: 'Profile Settings', icon: <User size={18} /> },
                { key: 'security', label: 'Security & Auth', icon: <Lock size={18} /> },
                { key: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
                { key: 'appearance', label: 'Appearance', icon: <Sun size={18} /> },
                { key: 'fleet', label: 'Fleet Defaults', icon: <Settings size={18} /> },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px', borderRadius: 16, border: 'none',
                      background: isActive 
                        ? (isDark ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.06)') 
                        : 'transparent',
                      color: isActive ? D.purple : D.textSub,
                      fontSize: '0.9rem', fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
                      marginBottom: 4, fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.color = D.text;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = D.textSub;
                      }
                    }}
                  >
                    <div style={{ color: isActive ? D.purple : D.textSub, display: 'flex', alignItems: 'center' }}>
                      {tab.icon}
                    </div>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Right Settings Content Area */}
            <div className="responsive-card-settings" style={{
              flex: 1, minWidth: 0, background: D.surface, borderRadius: 24,
              border: `1px solid ${D.border}`,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)', position: 'relative',
              padding: '28px 32px'
            }}>
              
              {/* Profile Settings Panel */}
              {activeTab === 'profile' && (
                <div style={{ animation: 'fadeIn 0.3s ease', padding: 0 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: D.text }}>Profile Information</h3>
                  <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: D.textSub }}>Update your basic details, contact info, and profile avatar.</p>

                  {profileError && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={16} /> {profileError}</div>}
                  {profileSuccess && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} /> {profileSuccess}</div>}

                  <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Avatar Upload Box */}
                    <div style={{ padding: 20, background: D.surfaceHi, borderRadius: 16, border: `1px dashed ${D.border}`, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                      <img
                        src={profileForm.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=1e3a8a&color=fff&size=100&bold=true`}
                        alt="preview"
                        style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', border: `1px solid ${D.border}`, flexShrink: 0 }}
                      />
                      <div>
                        {isEditingProfile ? (
                          <>
                            <button type="button" onClick={handleAvatarClick}
                              style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${D.indigo}40`, background: D.indigo + '10', color: D.indigo, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s ease', marginBottom: 6, display: 'block' }}
                              onMouseEnter={e => e.currentTarget.style.background = D.indigo + '20'}
                              onMouseLeave={e => e.currentTarget.style.background = D.indigo + '10'}
                            >
                              Choose New Avatar
                            </button>
                            <span style={{ fontSize: '0.75rem', color: D.textSub }}>JPG, PNG - Max 1 MB</span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: D.textSub, fontWeight: 600 }}>Avatar is locked. Click "Edit Profile" below to change it.</span>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    </div>

                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                      <div>
                        <label style={labelStyle}>Full Name / Username</label>
                        <input type="text" value={profileForm.fullName} disabled style={{ ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Email Address</label>
                        <input type="email" value={profileForm.email} onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Phone Number</label>
                        <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <label style={labelStyle}>Role Status</label>
                        <input type="text" value={user?.role ? (user.role.charAt(0) + user.role.slice(1).toLowerCase()) : 'User'} disabled style={{ ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Gender</label>
                        <select value={profileForm.gender} onChange={e => setProfileForm(prev => ({ ...prev, gender: e.target.value }))} disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : { ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>NIC Number</label>
                        <input type="text" value={profileForm.nic} onChange={e => setProfileForm(prev => ({ ...prev, nic: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 199912345678" />
                      </div>
                      <div>
                        <label style={labelStyle}>Date of Birth</label>
                        <input type="date" value={profileForm.dateOfBirth} onChange={e => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>

                      {user?.role === 'DRIVER' && (
                        <>
                          <div>
                            <label style={labelStyle}>License Number</label>
                            <input type="text" value={profileForm.licenseNumber} onChange={e => setProfileForm(prev => ({ ...prev, licenseNumber: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} />
                          </div>
                          <div>
                            <label style={labelStyle}>License Expiry Date</label>
                            <input type="date" value={profileForm.licenseExpiryDate} onChange={e => setProfileForm(prev => ({ ...prev, licenseExpiryDate: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} />
                          </div>
                          <div>
                            <label style={labelStyle}>Date Joined</label>
                            <input type="date" value={profileForm.dateJoined} onChange={e => setProfileForm(prev => ({ ...prev, dateJoined: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} />
                          </div>
                          <div>
                            <label style={labelStyle}>Experience</label>
                            <input type="text" value={profileForm.experience} onChange={e => setProfileForm(prev => ({ ...prev, experience: e.target.value }))} required disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="e.g. 5 years" />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>License Document</label>
                            {profileForm.licenseDocumentPath && !licenseFile ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token')
                                      const res = await api.get(`/users/${user.id}/document/license`, {
                                        responseType: 'blob',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      })
                                      const path = profileForm.licenseDocumentPath || ''
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
                                {isEditingProfile && (
                                  <label style={{ cursor: 'pointer' }}>
                                    <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setLicenseFile(e.target.files[0])} />
                                    <span style={{ color: D.textSub, fontSize: '0.8rem', fontWeight: 800, textDecoration: 'underline' }}>Change Document</span>
                                  </label>
                                )}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} id="user-license-file-profile" onChange={e => setLicenseFile(e.target.files[0])} disabled={!isEditingProfile} />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById('user-license-file-profile').click()}
                                  disabled={!isEditingProfile}
                                  style={{
                                    padding: '10px 20px', borderRadius: 12,
                                    border: `1px solid ${D.border}`, background: !isEditingProfile ? D.surfaceHi : 'rgba(255,255,255,0.05)',
                                    color: !isEditingProfile ? D.textSub : D.text, cursor: !isEditingProfile ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 800,
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
                        <label style={labelStyle}>Address</label>
                        <input type="text" value={profileForm.address} onChange={e => setProfileForm(prev => ({ ...prev, address: e.target.value }))} disabled={!isEditingProfile} style={!isEditingProfile ? { ...inputStyle, background: D.surfaceHi, cursor: 'not-allowed', color: D.textSub } : inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    </div>

                    {/* Form Edit/Save Buttons */}
                    {isEditingProfile ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                        <button
                          type="submit"
                          disabled={profileLoading}
                          style={{
                            padding: '12px 24px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: '#fff', fontSize: '0.9rem', fontWeight: 800,
                            cursor: profileLoading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'all 0.25s', boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                          }}
                          onMouseEnter={e => { if (!profileLoading) e.currentTarget.style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { if (!profileLoading) e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                          {profileLoading ? (
                            <>
                              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check size={16} /> Save Changes
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelProfileEdit}
                          style={{
                            padding: '12px 24px', borderRadius: 12,
                            border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)',
                            color: D.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={handleEnterEditMode}
                          style={{
                            padding: '12px 24px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: '#fff', fontSize: '0.9rem', fontWeight: 800,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'all 0.25s', boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          <Edit2 size={16} /> Edit Profile
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Security settings Panel */}
              {activeTab === 'security' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: D.text }}>Security & Passwords</h3>
                  <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: D.textSub }}>Change your login credentials and adjust your auto-logout timeout.</p>

                  {pwError && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={16} /> {pwError}</div>}
                  {pwSuccess && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} /> {pwSuccess}</div>}

                  <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Current Password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPasswords ? 'text' : 'password'} value={pwForm.currentPassword} onChange={e => setPwForm(prev => ({ ...prev, currentPassword: e.target.value }))} required style={{ ...inputStyle, paddingRight: 45 }} onFocus={onFocus} onBlur={onBlur} />
                          <button type="button" onClick={() => setShowPasswords(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, display: 'flex', alignItems: 'center' }}>
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>New Password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPasswords ? 'text' : 'password'} value={pwForm.newPassword} onChange={e => setPwForm(prev => ({ ...prev, newPassword: e.target.value }))} required style={{ ...inputStyle, paddingRight: 45 }} onFocus={onFocus} onBlur={onBlur} />
                          <button type="button" onClick={() => setShowPasswords(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, display: 'flex', alignItems: 'center' }}>
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Confirm New Password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPasswords ? 'text' : 'password'} value={pwForm.confirmPassword} onChange={e => setPwForm(prev => ({ ...prev, confirmPassword: e.target.value }))} required style={{ ...inputStyle, paddingRight: 45 }} onFocus={onFocus} onBlur={onBlur} />
                          <button type="button" onClick={() => setShowPasswords(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, display: 'flex', alignItems: 'center' }}>
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Circular strength indicator */}
                    {pwForm.newPassword.length > 0 && (() => {
                      const pw = pwForm.newPassword;
                      const criteria = [
                        { met: pw.length >= 8 },
                        { met: /[A-Z]/.test(pw) },
                        { met: /[a-z]/.test(pw) },
                        { met: /[0-9]/.test(pw) },
                        { met: /[^A-Za-z0-9]/.test(pw) },
                      ];
                      const score = criteria.filter(c => c.met).length;
                      const pct = score * 20;
                      const R = 36, CIRC = 2 * Math.PI * R, offset = CIRC * (1 - pct / 100);
                      const clr = score <= 1 ? D.red : score === 2 ? D.orange : score === 3 ? D.gold : score === 4 ? D.blue : D.green;
                      const lbl = ['—', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
                      return (
                        <div style={{ padding: '16px 20px', borderRadius: 16, background: D.surfaceHi, border: `1px solid ${D.border}`, display: 'flex', gap: 20, alignItems: 'center', marginTop: 8 }}>
                          <div style={{ flexShrink: 0 }}>
                            <svg width="80" height="80" viewBox="0 0 88 88">
                              <circle cx="44" cy="44" r={R} fill="none" stroke={D.border} strokeWidth="7" />
                              <circle cx="44" cy="44" r={R} fill="none" stroke={clr} strokeWidth="7" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} transform="rotate(-90 44 44)" style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }} />
                              <text x="44" y="41" textAnchor="middle" fontSize="14" fontWeight="900" fill={clr} fontFamily="inherit">{pct}%</text>
                              <text x="44" y="55" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={D.textSub} fontFamily="inherit">{lbl}</text>
                            </svg>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password Strength</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: clr }}>{lbl}</div>
                            <div style={{ width: '100%', height: 6, borderRadius: 3, background: D.border, marginTop: 4 }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: clr, transition: 'width 0.4s ease, background 0.3s ease' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ borderTop: `1px solid ${D.border}`, marginTop: 12, paddingTop: 20 }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Device Security</h4>
                      
                      {/* Session Timeout select */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: D.tealDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.teal }}><Clock size={18} /></div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: D.text }}>Session Timeout</div>
                            <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 2 }}>Log out account automatically after inactivity</div>
                          </div>
                        </div>
                        <select value={privacy.sessionTimeout} onChange={e => setPrivacy(p => ({ ...p, sessionTimeout: e.target.value }))}
                          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.text, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="120">2 hours</option>
                          <option value="never">Never Log Out</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, borderTop: `1px solid ${D.border}`, paddingTop: 20 }}>
                      {saveBtn('Save Password & Security', pwLoading)}
                    </div>
                  </form>
                </div>
              )}

              {/* Notification Settings Panel */}
              {activeTab === 'notifications' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: D.text }}>Notification Settings</h3>
                  <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: D.textSub }}>Control which system status updates pop up in the app shell.</p>

                  {notifSaved && (
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 20, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={16} /> Notification settings saved successfully.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* System Alerts */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: `1px solid ${D.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: D.orangeDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.orange }}><Bell size={20} /></div>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: D.text }}>System Push Notifications</div>
                          <div style={{ fontSize: '0.8rem', color: D.textSub, marginTop: 2 }}>In-app alerts that notify you instantly of critical activities</div>
                        </div>
                      </div>
                      <Toggle checked={privacy.systemAlerts} onChange={() => setPrivacy(p => ({ ...p, systemAlerts: !p.systemAlerts }))} color={D.orange} />
                    </div>

                    {/* Preferences options */}
                    {privacy.systemAlerts && (
                      <div style={{ padding: '20px 0', borderBottom: `1px solid ${D.border}`, animation: 'fadeIn 0.25s ease' }}>
                        <label style={{ ...labelStyle, marginBottom: 12 }}>Filter Alert Types</label>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {ALERT_TYPES.map(at => {
                            const active = privacy.alertTypes.includes(at.key);
                            return (
                              <button key={at.key} type="button" onClick={() => toggleAlertType(at.key)} style={{
                                padding: '10px 18px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease',
                                border: active ? 'none' : `1px solid ${D.border}`,
                                background: active ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.04)',
                                color: active ? '#fff' : D.textSub,
                                boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                              }}>
                                {at.icon} {at.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ padding: '20px 0 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: `1px solid ${D.border}`, marginTop: 24 }}>
                      {saveBtn('Save Notification Settings', notifSaving, handleNotifSave)}
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Panel */}
              {activeTab === 'appearance' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: D.text }}>Theme & Appearance</h3>
                  <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: D.textSub }}>Choose your default background view and colors.</p>

                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Dark mode card */}
                    <div
                      onClick={() => { if (theme !== 'blue') toggleTheme() }}
                      style={{
                        padding: '24px 20px', borderRadius: 20, cursor: 'pointer',
                        background: theme === 'blue' ? '#0d1527' : 'rgba(0,0,0,0.03)',
                        border: theme === 'blue' ? '2px solid #3b82f6' : `1px solid ${D.border}`,
                        boxShadow: theme === 'blue' ? '0 8px 30px rgba(59, 130, 246, 0.15)' : 'none',
                        textAlign: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={e => { if (theme !== 'blue') e.currentTarget.style.borderColor = '#3b82f660' }}
                      onMouseLeave={e => { if (theme !== 'blue') e.currentTarget.style.borderColor = D.border }}
                    >
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Moon size={28} />
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: D.text }}>Dark Aurora Mode</h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: D.textSub }}>Deep space dark aesthetic with glowing blue highlights.</p>
                      {theme === 'blue' && (
                        <span style={{ display: 'inline-block', marginTop: 12, background: 'rgba(59, 130, 246, 0.2)', color: '#38bdf8', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          Active Theme
                        </span>
                      )}
                    </div>

                    {/* Light mode card */}
                    <div
                      onClick={() => { if (theme !== 'light') toggleTheme() }}
                      style={{
                        padding: '24px 20px', borderRadius: 20, cursor: 'pointer',
                        background: theme === 'light' ? '#fcfcfd' : 'rgba(0,0,0,0.03)',
                        border: theme === 'light' ? '2px solid #2563eb' : `1px solid ${D.border}`,
                        boxShadow: theme === 'light' ? '0 8px 30px rgba(37, 99, 235, 0.1)' : 'none',
                        textAlign: 'center', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={e => { if (theme !== 'light') e.currentTarget.style.borderColor = '#2563eb60' }}
                      onMouseLeave={e => { if (theme !== 'light') e.currentTarget.style.borderColor = D.border }}
                    >
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Sun size={28} />
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: D.text }}>Sleek Light Mode</h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: D.textSub }}>Clean, daylight interfaces with premium indigo contrasts.</p>
                      {theme === 'light' && (
                        <span style={{ display: 'inline-block', marginTop: 12, background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                          Active Theme
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fleet Defaults Panel */}
              {activeTab === 'fleet' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: D.text }}>Fleet Settings & Defaults</h3>
                  <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: D.textSub }}>Establish defaults for mileage tracking metrics, timezone clocks, and automated notifications warnings.</p>

                  {fleetSaved && (
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 20, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={16} /> Fleet configurations updated.
                    </div>
                  )}

                  <form onSubmit={e => { e.preventDefault(); handleFleetSave() }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                      <div>
                        <label style={labelStyle}>System Timezone</label>
                        <select value={fleetForm.timezone} onChange={e => setFleetForm(prev => ({ ...prev, timezone: e.target.value }))} style={inputStyle}>
                          <option value="Asia/Colombo">Sri Lanka (Asia/Colombo) - GMT+5:30</option>
                          <option value="UTC">Coordinated Universal Time (UTC)</option>
                          <option value="EST">Eastern Standard Time (EST) - GMT-5</option>
                          <option value="GMT">Greenwich Mean Time (GMT)</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Fuel Inefficiency Reporting</label>
                        <select value={fleetForm.fuelReportingPeriod} onChange={e => setFleetForm(prev => ({ ...prev, fuelReportingPeriod: e.target.value }))} style={inputStyle}>
                          <option value="weekly">Weekly Reports</option>
                          <option value="monthly">Monthly Reports</option>
                          <option value="never">Do Not Report</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, borderTop: `1px solid ${D.border}`, paddingTop: 20 }}>
                      {saveBtn('Save Fleet Configurations', fleetSaving)}
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

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
    </div>
  )
}

export default ProfilePage
