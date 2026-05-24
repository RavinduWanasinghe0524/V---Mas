import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { profileAPI, fuelAPI, serviceAPI, vehicleAPI } from '../services/api'
import { User, Mail, Key, ShieldCheck, Shield, Globe, Fuel, Ruler, Calendar, Car, Wrench, Edit2, AlertCircle, CheckCircle, Eye, EyeOff, Check } from 'lucide-react'
import { computeLogsEfficiency } from '../utils/fuelUtils'

const onFocus = e => {
  e.target.style.borderColor = 'rgba(99,102,241,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
}
const onBlur = e => {
  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
  e.target.style.boxShadow = 'none'
}

const ProfilePage = () => {
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
  const { user, isAdmin, updateUser } = useAuth()

  // ÔöÇÔöÇ Edit Profile state ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const [profileForm, setProfileForm]   = useState({ email: '', profilePicture: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError]     = useState('')
  const fileInputRef = useRef(null)

  // ÔöÇÔöÇ Change Password state ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading]   = useState(false)
  const [pwSuccess, setPwSuccess]   = useState('')
  const [pwError, setPwError]       = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // ÔöÇÔöÇ Activity stats state ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // ÔöÇÔöÇ Active tab ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const [activeTab, setActiveTab] = useState('info')

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        email:          user.email          || '',
        profilePicture: user.profilePicture || '',
      })
    }
  }, [user])

  // Fetch activity stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'DRIVER') {
          const res = await fuelAPI.getMyLogs()
          const logs = res.data?.data || []
          computeLogsEfficiency(logs)
          const avg  = logs.length
            ? (logs.reduce((sum, l) => sum + (l.fuelEfficiency || 0), 0) / logs.length).toFixed(1)
            : 0
          const last = logs.length
            ? new Date(logs[logs.length - 1].date).toLocaleDateString()
            : 'N/A'
          setStats({ totalLogs: logs.length, avgEfficiency: avg, lastEntry: last })
        } else {
          const [vehicleRes, serviceRes] = await Promise.all([
            vehicleAPI.getAllVehicles(),
            serviceAPI.getUpcomingServices(),
          ])
          setStats({
            totalVehicles: vehicleRes.data?.data?.length  || 0,
            upcomingServices: serviceRes.data?.data?.length || 0,
          })
        }
      } catch {
        setStats(null)
      } finally {
        setStatsLoading(false)
      }
    }
    if (user) fetchStats()
  }, [user])

  // ÔöÇÔöÇ Handlers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 1024 * 1024) {
      setProfileError('Image must be under 1 MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () =>
      setProfileForm(prev => ({ ...prev, profilePicture: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)
    try {
      const res = await profileAPI.updateMyProfile({
        email:          profileForm.email,
        profilePicture: profileForm.profilePicture,
      })
      const updated = res.data?.data
      if (updated) updateUser(updated)
      setProfileSuccess('Profile updated successfully')
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters')
      return
    }
    setPwLoading(true)
    try {
      await profileAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      })
      setPwSuccess('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  // ÔöÇÔöÇ Helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  const RoleBadge = ({ role }) => {
    const cfg = {
      ADMIN:      { label: 'Admin',      bg: D.purpleDim, color: D.purple, border: `1px solid ${D.purple}30` },
      CONTROLLER: { label: 'Controller', bg: D.blueDim,   color: D.blue,   border: `1px solid ${D.blue}30` },
      DRIVER:     { label: 'Driver',     bg: D.greenDim,  color: D.green,  border: `1px solid ${D.green}30` },
    }
    const { label, bg, color, border } = cfg[role] || cfg.DRIVER
    return <span style={{ background: bg, color, border, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
  }

  const roleDescription = {
    ADMIN:      'Executive Fleet Administrator — Orchestrate the entire V-MAS platform, overseeing user roles, comprehensive system analytics, and master configurations.',
    CONTROLLER: 'Fleet Operations Controller — Direct daily fleet logistics, coordinate vehicle assignments, and monitor real-time fuel and maintenance metrics.',
    DRIVER:     'V-MAS Fleet Driver — Access personal vehicle assignments, log daily fuel consumption, and monitor vehicle performance on the road.',
  }[user?.role] || ''

  const permissions = {
    ADMIN:      ['Orchestrate user management & security', 'Analyze comprehensive fleet reports', 'Configure system-wide V-MAS settings', 'Full operational override capabilities'],
    CONTROLLER: ['Monitor live vehicle performance metrics', 'Assign & coordinate fleet drivers', 'Schedule critical vehicle maintenance', 'Analyze & approve fuel logs'],
    DRIVER:     ['Access real-time assigned vehicle data', 'Submit precise daily fuel entries', 'Review personal efficiency analytics', 'Report operational vehicle issues'],
  }[user?.role] || []

  const tabs = [
    { key: 'info',     label: 'Account Info' },
    { key: 'edit',     label: 'Edit Profile' },
    { key: 'password', label: 'Change Password' },
    { key: 'stats',    label: 'Activity' },
  ]

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="My Profile" subtitle="Home / Profile" />
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
            display: 'flex', alignItems: 'center', gap: 20
          }}>
            {/* decorative circles */}
            {[['80%','ÔêÆ20px','180px','rgba(255,255,255,0.03)'],['20%','60%','120px','rgba(255,255,255,0.04)'],['55%','80%','90px','rgba(255,255,255,0.02)']].map(([t,l,s,bg],i) => (
              <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:bg, pointerEvents:'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, width: 64, height: 64, display:'flex', alignItems:'center', justifyContent:'center', color: '#fff', backdropFilter:'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <User size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  My Profile
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: '0.9rem' }}>
                  Manage your account information and security settings
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

            {/* ÔöÇÔöÇ Left: Profile Card ÔöÇÔöÇ */}
            <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, padding: 24, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              {/* Avatar */}
              <div
                style={{ position: 'relative', display: 'inline-block', marginBottom: 20, cursor: 'pointer' }}
                onClick={handleAvatarClick}
                title="Click to change photo"
              >
                <img
                  src={profileForm.profilePicture || user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=6366f1&color=fff&size=128&bold=true`}
                  alt={user?.userName}
                  style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${D.surfaceHi}`, boxShadow: `0 0 0 1px ${D.border}` }}
                  onError={e => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=6366f1&color=fff&size=128&bold=true`
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: '#6366f1', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: `2px solid ${D.surface}`,
                  color: '#fff'
                }}><Edit2 size={12} strokeWidth={2.5}/></div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: D.text, marginBottom: 6 }}>
                {user?.userName}
              </h2>
              <div style={{ marginBottom: 8 }}>
                <RoleBadge role={user?.role} />
              </div>
              <p style={{ fontSize: '0.8rem', color: D.textSub, lineHeight: 1.6 }}>
                {roleDescription}
              </p>

              {/* Status indicator */}
              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: D.surfaceHi, borderRadius: 8,
                border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: D.green, flexShrink: 0, boxShadow: `0 0 6px ${D.green}` }} />
                <span style={{ fontSize: '0.8rem', color: D.text, fontWeight: 700 }}>
                  {user?.accountStatus || 'ACTIVE'}
                </span>
              </div>

              {/* Permissions */}
              <div style={{
                marginTop: 16, padding: '14px 16px',
                background: D.surfaceHi, borderRadius: 8,
                border: `1px solid ${D.border}`, textAlign: 'left',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Your Permissions
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {permissions.map(p => (
                    <li key={p} style={{ fontSize: '0.8rem', color: D.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} color={D.green} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ÔöÇÔöÇ Right: Tabbed Panel ÔöÇÔöÇ */}
            <div>
              {/* Tab bar */}
              <div style={{
                display: 'flex', gap: 4, marginBottom: 20,
                background: D.surface, padding: 6, borderRadius: 12,
                border: `1px solid ${D.border}`,
              }}>
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700,
                      transition: 'all 0.15s ease',
                      background: activeTab === tab.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color:      activeTab === tab.key ? '#a5b4fc' : D.textSub,
                      boxShadow:  activeTab === tab.key ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ÔöÇÔöÇ Tab: Account Info ÔöÇÔöÇ */}
              {activeTab === 'info' && (
                <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', color: D.text, fontWeight: 700 }}>Account Information</h2>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
                  </div>

                  {[
                    { icon: <User size={18}/>, label: 'Username',       value: user?.userName },
                    { icon: <Mail size={18}/>, label: 'Email',          value: user?.email },
                    { icon: <Key size={18}/>, label: 'Role',           value: <RoleBadge role={user?.role} /> },
                    { icon: <ShieldCheck size={18}/>, label: 'Account Status', value: <span style={{ background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ÔùÅ {user?.accountStatus}</span> },
                  ].map((row, idx, arr) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 0',
                      borderBottom: idx < arr.length - 1 ? `1px solid ${D.border}` : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ display: 'flex', alignItems: 'center', color: D.textSub }}>{row.icon}</span>
                        <span style={{ fontSize: '0.875rem', color: D.textSub, fontWeight: 600 }}>{row.label}</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', color: D.text, fontWeight: 600 }}>
                        {row.value}
                      </span>
                    </div>
                  ))}

                  {/* Session info */}
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                      Session
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { icon: <Shield size={20}/>, title: 'System Security',  sub: 'V-MAS Enterprise Authentication Active', badge: 'Secure', badgeColor: D.green, badgeDim: D.greenDim },
                        { icon: <Globe size={20}/>, title: 'Fleet Network',     sub: 'Connected to V-MAS Central Command API', badge: 'Online', badgeColor: D.blue, badgeDim: D.blueDim },
                      ].map(item => (
                        <div key={item.title} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: 14,
                          background: D.surfaceHi, borderRadius: 8, border: `1px solid ${D.border}`,
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', color: D.indigo }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: D.text }}>{item.title}</div>
                            <div style={{ fontSize: '0.75rem', color: D.textSub }}>{item.sub}</div>
                          </div>
                          <span style={{ marginLeft: 'auto', background: item.badgeDim, color: item.badgeColor, border: `1px solid ${item.badgeColor}30`, padding: '3px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {item.badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ÔöÇÔöÇ Tab: Edit Profile ÔöÇÔöÇ */}
              {activeTab === 'edit' && (
                <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', color: D.text, fontWeight: 700 }}>Edit Profile</h2>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
                  </div>

                  {profileError   && <div style={{ padding: '12px 16px', borderRadius: 8, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16}/> {profileError}</div>}
                  {profileSuccess && <div style={{ padding: '12px 16px', borderRadius: 8, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={16}/> {profileSuccess}</div>}

                  <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Username (read-only) */}
                    <div>
                      <label style={labelStyle}>Username <span style={{ color: D.textFaint, fontWeight: 400, textTransform: 'none' }}>(cannot be changed)</span></label>
                      <input
                        type="text"
                        value={user?.userName || ''}
                        disabled
                        style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed', background: D.surfaceHi }}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                        style={inputStyle}
                        onFocus={onFocus} onBlur={onBlur}
                      />
                    </div>

                    {/* Profile picture */}
                    <div>
                      <label style={labelStyle}>Profile Picture</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <img
                          src={profileForm.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=6366f1&color=fff&size=128&bold=true`}
                          alt="preview"
                          style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${D.border}`, flexShrink: 0 }}
                          onError={e => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=6366f1&color=fff&size=128&bold=true`
                          }}
                        />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            type="button"
                            onClick={handleAvatarClick}
                            style={{
                              padding: '8px 16px', borderRadius: 8,
                              border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.05)',
                              color: D.text, cursor: 'pointer',
                              fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700,
                              alignSelf: 'flex-start', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                          >
                            Upload Image
                          </button>
                          <span style={{ fontSize: '0.75rem', color: D.textSub }}>
                            JPG, PNG ÔÇö max 1 MB
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={profileLoading}
                      style={{
                        padding: '10px 24px', borderRadius: 10,
                        border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                        cursor: profileLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700,
                        opacity: profileLoading ? 0.7 : 1, alignSelf: 'flex-start',
                        boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s ease'
                      }}
                    >
                      {profileLoading ? 'SavingÔÇª' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}

              {/* ÔöÇÔöÇ Tab: Change Password ÔöÇÔöÇ */}
              {activeTab === 'password' && (
                <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', color: D.text, fontWeight: 700 }}>Change Password</h2>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
                  </div>

                  {pwError   && <div style={{ padding: '12px 16px', borderRadius: 8, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16}/> {pwError}</div>}
                  {pwSuccess && <div style={{ padding: '12px 16px', borderRadius: 8, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={16}/> {pwSuccess}</div>}

                  <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {[
                      { key: 'currentPassword', label: 'Current Password' },
                      { key: 'newPassword',      label: 'New Password' },
                      { key: 'confirmPassword',  label: 'Confirm New Password' },
                    ].map(field => (
                      <div key={field.key}>
                        <label style={labelStyle}>{field.label}</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={pwForm[field.key]}
                            onChange={e => setPwForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            required
                            style={{ ...inputStyle, paddingRight: 40 }}
                            onFocus={onFocus} onBlur={onBlur}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(p => !p)}
                            style={{
                              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: D.textSub, fontSize: '1rem',
                            }}
                          >
                            {showPasswords ? <EyeOff size={16}/> : <Eye size={16}/>}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Password strength hint */}
                    {pwForm.newPassword.length > 0 && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: D.surfaceHi, border: `1px solid ${D.border}`,
                        fontSize: '0.78rem', color: D.textSub,
                      }}>
                        Strength: {' '}
                        <span style={{
                          fontWeight: 700,
                          color: pwForm.newPassword.length < 6 ? D.red
                            : pwForm.newPassword.length < 10 ? D.gold
                            : D.green,
                        }}>
                          {pwForm.newPassword.length < 6 ? 'Weak'
                            : pwForm.newPassword.length < 10 ? 'Moderate'
                            : 'Strong'}
                        </span>
                        {pwForm.newPassword.length > 0 && pwForm.confirmPassword.length > 0 && (
                          <span style={{ marginLeft: 16, color: pwForm.newPassword === pwForm.confirmPassword ? D.green : D.red, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {pwForm.newPassword === pwForm.confirmPassword ? <><CheckCircle size={12}/> Passwords match</> : <><AlertCircle size={12}/> Passwords do not match</>}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={pwLoading}
                      style={{
                        padding: '10px 24px', borderRadius: 10,
                        border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                        cursor: pwLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700,
                        opacity: pwLoading ? 0.7 : 1, alignSelf: 'flex-start',
                        boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s ease'
                      }}
                    >
                      {pwLoading ? 'UpdatingÔÇª' : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}

              {/* ÔöÇÔöÇ Tab: Activity Stats ÔöÇÔöÇ */}
              {activeTab === 'stats' && (
                <div style={{ background: D.surface, borderRadius: 16, border: `1px solid ${D.border}`, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', color: D.text, fontWeight: 700 }}>Activity Overview</h2>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${D.border}, transparent)` }}></div>
                  </div>

                  {statsLoading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: D.textSub, fontWeight: 600 }}>
                      Loading statsÔÇª
                    </div>
                  ) : stats ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                      {user?.role === 'DRIVER' ? (
                        <>
                          <StatCard icon={<Fuel size={20}/>} label="Total Fuel Logs"    value={stats.totalLogs}       colorDim={D.blueDim} colorHex={D.blue} D={D} />
                          <StatCard icon={<Ruler size={20}/>} label="Avg Efficiency"     value={`${stats.avgEfficiency} km/L`} colorDim={D.greenDim} colorHex={D.green} D={D} />
                          <StatCard icon={<Calendar size={20}/>} label="Last Entry"         value={stats.lastEntry}        colorDim={D.goldDim} colorHex={D.gold} D={D} />
                        </>
                      ) : (
                        <>
                          <StatCard icon={<Car size={20}/>} label="Total Vehicles"     value={stats.totalVehicles}    colorDim={D.purpleDim} colorHex={D.purple} D={D} />
                          <StatCard icon={<Wrench size={20}/>} label="Upcoming Services"  value={stats.upcomingServices} colorDim={D.orangeDim} colorHex={D.orange} D={D} />
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: D.textSub, fontWeight: 600 }}>
                      No activity data available.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ icon, label, value, colorDim, colorHex, D }) => (
  <div style={{
    padding: 20, borderRadius: 12,
    background: D.surfaceHi, border: `1px solid ${D.border}`,
    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
  }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: colorDim, border: `1px solid ${colorHex}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colorHex, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: D.text, marginBottom: 4, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{value}</div>
    <div style={{ fontSize: '0.78rem', color: D.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
  </div>
)

export default ProfilePage
