import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { profileAPI, fuelAPI, serviceAPI, vehicleAPI } from '../services/api'
import { User, Mail, Key, ShieldCheck, Shield, Globe, Fuel, Ruler, Calendar, Car, Wrench, Edit2, AlertCircle, CheckCircle, Eye, EyeOff, Check, Trophy, Activity, Lock, Settings, LogOut, Zap, Bell, Clock, Smartphone, Share2, UserCheck, X } from 'lucide-react'
import { computeLogsEfficiency } from '../utils/fuelUtils'

const Toggle = ({ checked, onChange, color = '#6366f1' }) => (
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
  e.target.style.borderColor = 'rgba(99,102,241,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
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
  const { user, updateUser } = useAuth()

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

  const [profileForm, setProfileForm] = useState({ email: '', profilePicture: '', fullName: '', phone: '', address: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const fileInputRef = useRef(null)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [activeModal, setActiveModal] = useState(null)
  const closeModal = () => setActiveModal(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'PUBLIC',
    dataTracking: true,
    emailNotifications: true,
    systemAlerts: true,
    alertTypes: ['SERVICE', 'INSURANCE', 'FUEL', 'OVERDUE'],
    twoFactor: false,
    sessionTimeout: '30',
  })
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  const toggleAlertType = key => setPrivacy(p => ({
    ...p,
    alertTypes: p.alertTypes.includes(key) ? p.alertTypes.filter(k => k !== key) : [...p.alertTypes, key],
  }))

  const handlePrivacySave = async () => {
    setPrivacySaving(true)
    await new Promise(r => setTimeout(r, 800))
    setPrivacySaving(false)
    setPrivacySaved(true)
    setTimeout(() => setPrivacySaved(false), 3000)
  }

  const handleNotifSave = async () => {
    setNotifSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setNotifSaving(false)
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        email: user.email || '',
        profilePicture: user.profilePicture || '',
        fullName: user.userName || '',
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
          const [vehicleRes, serviceRes] = await Promise.all([vehicleAPI.getAllVehicles(), serviceAPI.getUpcomingServices()])
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

  const handleProfileSubmit = async e => {
    e.preventDefault()
    setProfileError(''); setProfileSuccess(''); setProfileLoading(true)
    try {
      if (user?.id?.toString().startsWith('demo_')) {
        await new Promise(r => setTimeout(r, 500))
        updateUser({ ...user, email: profileForm.email, userName: profileForm.fullName, profilePicture: profileForm.profilePicture || user.profilePicture })
        setProfileSuccess('Profile updated successfully')
        return
      }
      const res = await profileAPI.updateMyProfile({ email: profileForm.email, profilePicture: profileForm.profilePicture })
      const updated = res.data?.data
      if (updated) updateUser(updated)
      setProfileSuccess('Profile updated successfully')
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

  const previewEmail = () => {
    const preview = window.open('', '_blank', 'width=620,height=520')
    preview.document.write(`<html><body style="font-family:sans-serif;background:#0d1117;color:#e2e8f0;padding:32px"><div style="max-width:560px;margin:0 auto;background:#161b27;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)"><div style="padding:28px 32px;background:linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)"><h1 style="margin:0;color:#fff;font-size:1.4rem">V-MAS Fleet Alert</h1><p style="margin:8px 0 0;color:#a5b4fc;font-size:0.88rem">Fleet Management System</p></div><div style="padding:28px 32px"><h2 style="color:#818cf8;font-size:1rem;margin:0 0 16px">⚠ Service Due Reminder</h2><p style="margin:0 0 8px"><b>Vehicle:</b> WP-CAA-1234</p><p style="margin:0 0 8px"><b>Alert:</b> Scheduled service due in 7 days</p><p style="margin:0 0 8px"><b>Due Date:</b> 2026-06-05</p><p style="margin:0 0 24px;color:#64748b">Please schedule a service appointment as soon as possible to avoid operational delays.</p><div style="background:#1e2535;padding:16px;border-radius:10px;border-left:3px solid #6366f1"><b style="color:#818cf8">Action Required:</b><br><span style="font-size:0.88rem;color:#94a3b8">Contact your fleet controller to arrange service.</span></div></div><div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.07);color:#475569;font-size:0.75rem">V-MAS Fleet Management · This is an automated alert</div></div></body></html>`)
    preview.document.close()
  }

  const saveBtn = (label, saving, onClick) => (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        padding: '12px 28px', borderRadius: 12, border: 'none',
        background: saving ? D.surfaceHi : 'linear-gradient(135deg, #3b82f6, #6366f1)',
        color: saving ? D.textSub : '#fff',
        cursor: saving ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 800,
        boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
        transition: 'all 0.25s ease', display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.45)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = saving ? 'none' : '0 4px 16px rgba(99,102,241,0.35)' }}
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
        <Topbar title="My Profile" subtitle="Home / Profile" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ padding: '28px 32px 40px' }}>

          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 45%, #1e40af 100%)',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: `1px solid rgba(255,255,255,0.07)`,
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
          }}>
            {/* decorative circles */}
            {[['80%', '-20px', '180px', 'rgba(255,255,255,0.03)'], ['20%', '60%', '120px', 'rgba(255,255,255,0.04)'], ['55%', '80%', '90px', 'rgba(255,255,255,0.02)']].map(([t, l, s, bg], i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: l, width: s, height: s, borderRadius: '50%', background: bg, pointerEvents: 'none' }} />
            ))}
            <img
              src={profileForm.profilePicture || user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=random&size=100`}
              alt={user?.userName}
              style={{ width: 100, height: 100, borderRadius: 16, objectFit: 'cover', border: `3px solid rgba(255,255,255,0.2)`, flexShrink: 0, position: 'relative', zIndex: 1 }}
            />
            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.userName}</h1>
                <span style={{ background: 'rgba(255,255,255,0.25)', color: '#ffffff', padding: '4px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid rgba(255,255,255,0.3)' }}>
                  {user?.role?.charAt(0) + (user?.role?.slice(1).toLowerCase() || '')}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} /> Full system access with all permissions
              </p>
            </div>
            <button
              onClick={() => setActiveModal('edit')}
              style={{
                padding: '12px 24px', borderRadius: 14, border: 'none',
                background: '#ffffff', color: '#1e40af',
                fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                transition: 'all 0.25s ease', whiteSpace: 'nowrap', flexShrink: 0, position: 'relative', zIndex: 1
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#ffffff' }}
            >
              <Edit2 size={18} /> Edit Profile
            </button>
          </div>

          {/* Member Since & Last Login */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            {[
              { label: 'Member Since', value: '1/15/2024', icon: <Calendar size={20} />, colorDim: D.blueDim, colorHex: D.blue },
              { label: 'Last Login', value: '2026-05-16 09:30 AM', icon: <Shield size={20} />, colorDim: D.orangeDim, colorHex: D.orange },
            ].map(({ label, value, icon, colorDim, colorHex }) => (
              <div key={label} style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden', padding: '24px', display: 'flex', alignItems: 'center', gap: 24, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = colorHex + '50'; e.currentTarget.style.boxShadow = `0 16px 32px ${colorHex}20` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)' }}
              >
                <div style={{ width: 50, height: 50, borderRadius: 14, background: colorDim, color: colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colorHex}30`, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: D.text, lineHeight: 1.1 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Personal Info & Recent Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '22px 28px', background: D.surfaceHi, borderBottom: `1px solid ${D.border}` }}>
                <User size={20} style={{ color: D.textSub }} />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Personal Information</h2>
              </div>
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Full Name', value: profileForm.fullName || user?.userName || 'N/A' },
                  { label: 'Email Address', value: profileForm.email || user?.email },
                  { label: 'Phone Number', value: profileForm.phone || 'N/A' },
                  { label: 'Address', value: profileForm.address || 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label style={labelStyle}>{label}</label>
                    <div style={{ fontSize: '0.9rem', color: D.text, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '22px 28px', background: D.surfaceHi, borderBottom: `1px solid ${D.border}` }}>
                <Activity size={20} style={{ color: D.textSub }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Activity</h3>
              </div>
              <div style={{ padding: '16px 28px' }}>
                <ActivityItem label="Updated vehicle mileage" timeAgo="2 hours ago" color={D.blue} D={D} />
                <ActivityItem label="Profile updated successfully" timeAgo="1 day ago" color={D.green} D={D} />
                <ActivityItem label="Logged in from new device" timeAgo="3 days ago" color={D.orange} D={D} />
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div style={{ background: D.surface, borderRadius: 24, border: `1px solid ${D.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '22px 28px', background: D.surfaceHi, borderBottom: `1px solid ${D.border}` }}>
              <Settings size={20} style={{ color: D.textSub }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account Settings</h3>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', gap: 12 }}>
              {[
                { label: 'Change Password', modal: 'password', icon: <Key size={16} /> },
                { label: 'Notification Settings', modal: 'notifications', icon: <Bell size={16} /> },
                { label: 'Privacy Settings', modal: 'privacy', icon: <Shield size={16} /> },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveModal(item.modal)}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700,
                    border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.textSub,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s ease', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = D.purple; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = D.purple; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = D.surfaceHi; e.currentTarget.style.color = D.textSub; e.currentTarget.style.borderColor = D.border; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {activeModal === 'edit' && (
        <Modal title="Edit Your Profile" icon={<Edit2 size={20} style={{ color: D.indigo }} />} onClose={closeModal} D={D}>
          <div style={{ padding: '24px 28px' }}>
            {profileError && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={16} /> {profileError}</div>}
            {profileSuccess && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} /> {profileSuccess}</div>}
            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ padding: 18, background: D.surfaceHi, borderRadius: 14, border: `1px dashed ${D.border}` }}>
                <label style={labelStyle}>Profile Picture</label>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <img
                    src={profileForm.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=random&size=80`}
                    alt="preview"
                    style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', border: `1px solid ${D.border}`, flexShrink: 0 }}
                  />
                  <div>
                    <button type="button" onClick={handleAvatarClick}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${D.indigo}40`, background: D.indigo + '10', color: D.indigo, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s ease', marginBottom: 6, display: 'block' }}
                      onMouseEnter={e => e.currentTarget.style.background = D.indigo + '20'}
                      onMouseLeave={e => e.currentTarget.style.background = D.indigo + '10'}
                    >Choose Image</button>
                    <span style={{ fontSize: '0.75rem', color: D.textSub }}>JPG, PNG - Max 1 MB</span>
                  </div>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {[
                { key: 'fullName', label: 'Full Name', type: 'text' },
                { key: 'email', label: 'Email Address', type: 'email', required: true },
                { key: 'phone', label: 'Phone Number', type: 'tel' },
                { key: 'address', label: 'Address', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type} value={profileForm[f.key]} onChange={e => setProfileForm(prev => ({ ...prev, [f.key]: e.target.value }))} required={f.required} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              ))}
              <button type="submit" disabled={profileLoading}
                style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: D.indigo, color: '#fff', cursor: profileLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 800, opacity: profileLoading ? 0.7 : 1, boxShadow: `0 2px 8px ${D.indigo}40`, transition: 'all 0.2s ease', alignSelf: 'flex-start' }}
                onMouseEnter={e => !profileLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Change Password Modal ── */}
      {activeModal === 'password' && (
        <Modal title="Change Password" icon={<Lock size={20} style={{ color: D.orange }} />} onClose={closeModal} D={D}>
          <div style={{ padding: '24px 28px' }}>
            {pwError && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={16} /> {pwError}</div>}
            {pwSuccess && <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} /> {pwSuccess}</div>}
            {(() => {
              const pw = pwForm.newPassword
              const criteria = [
                { met: pw.length >= 8 },
                { met: /[A-Z]/.test(pw) },
                { met: /[a-z]/.test(pw) },
                { met: /[0-9]/.test(pw) },
                { met: /[^A-Za-z0-9]/.test(pw) },
              ]
              const score = criteria.filter(c => c.met).length
              const pct = score * 20
              const R = 36, CIRC = 2 * Math.PI * R, offset = CIRC * (1 - pct / 100)
              const clr = score <= 1 ? D.red : score === 2 ? D.orange : score === 3 ? D.gold : score === 4 ? D.blue : D.green
              const lbl = ['—', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score]
              return (
                <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[
                    { key: 'currentPassword', label: 'Current Password' },
                    { key: 'newPassword', label: 'New Password' },
                    { key: 'confirmPassword', label: 'Confirm New Password' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={labelStyle}>{field.label}</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showPasswords ? 'text' : 'password'} value={pwForm[field.key]} onChange={e => setPwForm(prev => ({ ...prev, [field.key]: e.target.value }))} required style={{ ...inputStyle, paddingRight: 40 }} onFocus={onFocus} onBlur={onBlur} />
                        <button type="button" onClick={() => setShowPasswords(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.textSub, padding: 4, display: 'flex', alignItems: 'center' }}>
                          {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {pw.length > 0 && (
                    <div style={{ padding: '20px', borderRadius: 14, background: D.surfaceHi, border: `1px solid ${D.border}`, display: 'flex', gap: 20, alignItems: 'center' }}>
                      <div style={{ flexShrink: 0 }}>
                        <svg width="88" height="88" viewBox="0 0 88 88">
                          <circle cx="44" cy="44" r={R} fill="none" stroke={D.border} strokeWidth="7" />
                          <circle cx="44" cy="44" r={R} fill="none" stroke={clr} strokeWidth="7" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} transform="rotate(-90 44 44)" style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }} />
                          <text x="44" y="41" textAnchor="middle" fontSize="14" fontWeight="900" fill={clr} fontFamily="inherit">{pct}%</text>
                          <text x="44" y="55" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={D.textSub} fontFamily="inherit">{lbl}</text>
                        </svg>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password Strength</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: clr }}>{lbl}</div>
                        <div style={{ width: '100%', height: 6, borderRadius: 3, background: D.border, marginTop: 4 }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: clr, transition: 'width 0.4s ease, background 0.3s ease' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <button type="submit" disabled={pwLoading}
                    style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', cursor: pwLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 800, opacity: pwLoading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(99,102,241,0.35)', transition: 'all 0.25s ease', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => { if (!pwLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.45)' } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)' }}
                  >
                    {pwLoading ? 'Updating…' : <><Check size={16} strokeWidth={3} /> Update Password</>}
                  </button>
                </form>
              )
            })()}
          </div>
        </Modal>
      )}

      {/* ── Notification Settings Modal ── */}
      {activeModal === 'notifications' && (
        <Modal title="Notification Settings" icon={<Bell size={20} style={{ color: D.indigo }} />} onClose={closeModal} D={D}>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {notifSaved && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> Notification settings saved.
              </div>
            )}

            {/* Email Notifications toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${D.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: D.indigoDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.indigo, flexShrink: 0 }}><Mail size={18} /></div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: D.text }}>Email Notifications</div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 2 }}>Receive alerts and updates via email</div>
                </div>
              </div>
              <Toggle checked={privacy.emailNotifications} onChange={() => setPrivacy(p => ({ ...p, emailNotifications: !p.emailNotifications }))} color={D.indigo} />
            </div>

            {/* Notification Preferences label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', borderBottom: `1px solid ${D.border}` }}>
              <Bell size={15} style={{ color: D.gold }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notification Preferences</span>
            </div>

            {/* Alert Types */}
            {privacy.emailNotifications && (
              <div style={{ padding: '16px 0', borderBottom: `1px solid ${D.border}` }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Select Alert Types</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {ALERT_TYPES.map(at => {
                    const active = privacy.alertTypes.includes(at.key)
                    return (
                      <button key={at.key} onClick={() => toggleAlertType(at.key)} style={{
                        padding: '8px 16px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease',
                        border: active ? 'none' : `1px solid ${D.border}`,
                        background: active ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.05)',
                        color: active ? '#fff' : D.textSub,
                        boxShadow: active ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                      }}>
                        {at.icon} {at.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* System Alerts */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${D.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: D.orangeDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.orange, flexShrink: 0 }}><Bell size={18} /></div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: D.text }}>System Alerts</div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 2 }}>In-app alerts for critical fleet events</div>
                </div>
              </div>
              <Toggle checked={privacy.systemAlerts} onChange={() => setPrivacy(p => ({ ...p, systemAlerts: !p.systemAlerts }))} color={D.orange} />
            </div>

            {/* Preview Email */}
            <div style={{ padding: '16px 0', borderBottom: `1px solid ${D.border}` }}>
              <button onClick={previewEmail}
                style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${D.indigo}40`, background: D.indigoDim, color: D.indigo, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = D.indigo; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = D.indigoDim; e.currentTarget.style.color = D.indigo }}
              >
                <Mail size={15} /> Preview Sample Email
              </button>
            </div>

            <div style={{ paddingTop: 20 }}>{saveBtn('Save Settings', notifSaving, handleNotifSave)}</div>
          </div>
        </Modal>
      )}

      {/* ── Privacy Settings Modal ── */}
      {activeModal === 'privacy' && (
        <Modal title="Privacy Settings" icon={<Shield size={20} style={{ color: D.blue }} />} onClose={closeModal} D={D}>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {privacySaved && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} /> Privacy settings saved successfully.
              </div>
            )}

            {/* Profile Visibility */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${D.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: D.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.blue, flexShrink: 0 }}><Globe size={18} /></div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: D.text }}>Profile Visibility</div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4 }}>Control who can view your profile</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {['PUBLIC', 'PRIVATE'].map(v => (
                  <button key={v} onClick={() => setPrivacy(p => ({ ...p, profileVisibility: v }))} style={{ padding: '7px 18px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: 'all 0.2s ease', background: privacy.profileVisibility === v ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : D.surfaceHi, color: privacy.profileVisibility === v ? '#fff' : D.textSub, boxShadow: privacy.profileVisibility === v ? '0 4px 12px rgba(99,102,241,0.3)' : 'none' }}>
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Data Tracking */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${D.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: D.purpleDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.purple, flexShrink: 0 }}><Share2 size={18} /></div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: D.text }}>Allow Data Tracking</div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4 }}>Help improve the system with usage analytics</div>
                </div>
              </div>
              <Toggle checked={privacy.dataTracking} onChange={() => setPrivacy(p => ({ ...p, dataTracking: !p.dataTracking }))} color={D.purple} />
            </div>

            {/* Two-Factor Auth */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${D.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: D.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.green, flexShrink: 0 }}><Smartphone size={18} /></div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: D.text }}>Two-Factor Auth</div>
                    {privacy.twoFactor && <span style={{ background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Active</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4 }}>Add extra security to your account</div>
                </div>
              </div>
              <Toggle checked={privacy.twoFactor} onChange={() => setPrivacy(p => ({ ...p, twoFactor: !p.twoFactor }))} color={D.green} />
            </div>

            {/* Session Timeout */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: D.tealDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.teal, flexShrink: 0 }}><Clock size={18} /></div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: D.text }}>Session Timeout</div>
                  <div style={{ fontSize: '0.78rem', color: D.textSub, marginTop: 4 }}>Auto-logout after inactivity</div>
                </div>
              </div>
              <select value={privacy.sessionTimeout} onChange={e => setPrivacy(p => ({ ...p, sessionTimeout: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${D.border}`, background: D.surfaceHi, color: D.text, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="never">Never</option>
              </select>
            </div>

            <div style={{ paddingTop: 20 }}>{saveBtn('Save Privacy Settings', privacySaving, handlePrivacySave)}</div>
          </div>
        </Modal>
      )}

    </div>
  )
}

export default ProfilePage
