import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { useD } from '../context/ThemeContext'
import { profileAPI, fuelAPI, serviceAPI, vehicleAPI } from '../services/api'
import { User, Mail, Key, ShieldCheck, Shield, Globe, Fuel, Ruler, Calendar, Car, Wrench, Edit2, AlertCircle, CheckCircle, Eye, EyeOff, Check, Trophy, Activity, Lock, Settings, LogOut, Zap } from 'lucide-react'
import { computeLogsEfficiency } from '../utils/fuelUtils'

const getRoleBadgeComponent = (role, D) => {
  const cfg = {
    ADMIN:      { label: 'Admin',      bg: D.purpleDim, color: D.purple, border: `1px solid ${D.purple}40` },
    CONTROLLER: { label: 'Controller', bg: D.blueDim,   color: D.blue,   border: `1px solid ${D.blue}40` },
    DRIVER:     { label: 'Driver',     bg: D.greenDim,  color: D.green,  border: `1px solid ${D.green}40` },
  }
  const { label, bg, color, border } = cfg[role] || cfg.DRIVER
  return <span style={{ background: bg, color, border, padding: '6px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' }}>{label}</span>
}

const PremiumStatCard = ({ icon, label, value, suffix, colorHex, colorDim, D }) => (
  <div style={{
    padding: 24,
    borderRadius: 14,
    background: D.surfaceHi,
    border: `2px solid ${colorHex}20`,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    cursor: 'default',
  }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = colorHex + '40'
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = `0 8px 24px ${colorHex}15`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = colorHex + '20'
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}
  >
    <div style={{
      width: 52,
      height: 52,
      borderRadius: 14,
      background: colorDim,
      border: `2px solid ${colorHex}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: colorHex,
      marginBottom: 14,
    }}>
      {icon}
    </div>
    <div style={{
      fontSize: '1.8rem',
      fontWeight: 900,
      color: D.text,
      marginBottom: 6,
    }}>
      {value}{suffix && <span style={{ fontSize: '0.8rem', color: colorHex, fontWeight: 700, marginLeft: 4 }}>{suffix}</span>}
    </div>
    <div style={{
      fontSize: '0.8rem',
      color: D.textSub,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {label}
    </div>
  </div>
)

const ActivityItem = ({ label, timeAgo, color, D }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  }}>
    <div style={{
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: color,
      marginTop: 4,
      flexShrink: 0,
    }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: D.text }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: D.textSub, marginTop: 2 }}>{timeAgo}</div>
    </div>
  </div>
)

const ProfilePage = () => {
  const D = useD()
  const { user, isAdmin, updateUser } = useAuth()

  const [profileForm, setProfileForm] = useState({ email: '', profilePicture: '' })
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

  const [activeTab, setActiveTab] = useState('info')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({
        email: user.email || '',
        profilePicture: user.profilePicture || '',
      })
    }
  }, [user])

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
            vehicleAPI.getAllVehicles(),
            serviceAPI.getUpcomingServices(),
          ])
          setStats({
            totalVehicles: vehicleRes.data?.data?.length || 0,
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

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 1024 * 1024) {
      setProfileError('Image must be under 1 MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setProfileForm(prev => ({ ...prev, profilePicture: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)
    try {
      const res = await profileAPI.updateMyProfile({
        email: profileForm.email,
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
        newPassword: pwForm.newPassword,
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

  const roleDescription = {
    ADMIN: 'Executive Fleet Administrator - Orchestrate the entire V-MAS platform, overseeing user roles, comprehensive system analytics, and master configurations.',
    CONTROLLER: 'Fleet Operations Controller - Direct daily fleet logistics, coordinate vehicle assignments, and monitor real-time fuel and maintenance metrics.',
    DRIVER: 'V-MAS Fleet Driver - Access personal vehicle assignments, log daily fuel consumption, and monitor vehicle performance on the road.',
  }[user?.role] || ''

  const permissions = {
    ADMIN: ['Orchestrate user management & security', 'Analyze comprehensive fleet reports', 'Configure system-wide V-MAS settings', 'Full operational override capabilities'],
    CONTROLLER: ['Monitor live vehicle performance metrics', 'Assign & coordinate fleet drivers', 'Schedule critical vehicle maintenance', 'Analyze & approve fuel logs'],
    DRIVER: ['Access real-time assigned vehicle data', 'Submit precise daily fuel entries', 'Review personal efficiency analytics', 'Report operational vehicle issues'],
  }[user?.role] || []

  const tabs = [
    { key: 'info', label: 'Account Info' },
    { key: 'edit', label: 'Edit Profile' },
    { key: 'password', label: 'Change Password' },
    { key: 'stats', label: 'Activity Details' },
  ]

  return (
    <div className="app-shell" style={{ background: D.bg }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ background: D.bg }}>
        <Topbar title="My Profile" subtitle="Home / Profile" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-body" style={{ paddingBottom: 40, maxWidth: '900px', margin: '0 auto' }}>

          {/* Profile Header */}
          <div style={{
            background: D.surface,
            borderRadius: 12,
            border: `1px solid ${D.border}`,
            padding: '24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}>
            <img
              src={profileForm.profilePicture || user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=${D.indigo.slice(1)}&color=fff&size=100&bold=true`}
              alt={user?.userName}
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                objectFit: 'cover',
                border: `3px solid ${D.indigo}40`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: D.text,
                }}>{user?.userName}</h1>
                {getRoleBadgeComponent(user?.role, D)}
              </div>
              <p style={{
                margin: 0,
                fontSize: '0.9rem',
                color: D.textSub,
              }}>Full system access with all permissions</p>
            </div>
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: D.indigo,
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: `0 2px 8px ${D.indigo}40`,
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 4px 12px ${D.indigo}50`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 2px 8px ${D.indigo}40`
              }}
            >
              <Edit2 size={16} /> Edit
            </button>
          </div>

          {/* Info Cards - Member Since & Last Login */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{
              background: D.surface,
              borderRadius: 12,
              border: `1px solid ${D.border}`,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: D.blueDim,
                border: `1px solid ${D.blue}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: D.blue,
                flexShrink: 0,
              }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', marginBottom: 2 }}>Member Since</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: D.text }}>1/15/2024</div>
              </div>
            </div>

            <div style={{
              background: D.surface,
              borderRadius: 12,
              border: `1px solid ${D.border}`,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: D.orangeDim,
                border: `1px solid ${D.orange}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: D.orange,
                flexShrink: 0,
              }}>
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', marginBottom: 2 }}>Last Login</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: D.text }}>2026-05-16 09:30 AM</div>
              </div>
            </div>
          </div>

          {/* Main Grid - Personal Info & Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Personal Information */}
            <div style={{
              background: D.surface,
              borderRadius: 12,
              border: `1px solid ${D.border}`,
              padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <User size={20} style={{ color: D.textSub }} />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: D.text }}>Personal Information</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Full Name</label>
                  <div style={{ fontSize: '0.9rem', color: D.text, fontWeight: 600 }}>{user?.userName || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Email Address</label>
                  <div style={{ fontSize: '0.9rem', color: D.text, fontWeight: 600 }}>{profileForm.email || user?.email}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Phone Number</label>
                  <div style={{ fontSize: '0.9rem', color: D.text, fontWeight: 600 }}>+94 77 123 4567</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Address</label>
                  <div style={{ fontSize: '0.9rem', color: D.text, fontWeight: 600 }}>Colombo, Sri Lanka</div>
                </div>
              </div>
            </div>

            {/* Account Settings & Recent Activity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Account Settings */}
              <div style={{
                background: D.surface,
                borderRadius: 12,
                border: `1px solid ${D.border}`,
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Settings size={20} style={{ color: D.textSub }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: D.text }}>Account Settings</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Change Password', action: 'password' },
                    { label: 'Email Notifications', action: 'edit' },
                    { label: 'Privacy Settings', action: 'edit' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(item.action)}
                      style={{
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: D.text,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = D.indigo
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = D.text
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{
                background: D.surface,
                borderRadius: 12,
                border: `1px solid ${D.border}`,
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Activity size={20} style={{ color: D.textSub }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: D.text }}>Recent Activity</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <ActivityItem label="Updated vehicle mileage" timeAgo="2 hours ago" color={D.blue} D={D} />
                  <ActivityItem label="Profile updated successfully" timeAgo="1 day ago" color={D.green} D={D} />
                  <ActivityItem label="Logged in from new device" timeAgo="3 days ago" color={D.orange} D={D} />
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          {activeTab === 'edit' && (
            <div style={{
              background: D.surface,
              borderRadius: 12,
              border: `1px solid ${D.border}`,
              padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Edit2 size={20} style={{ color: D.indigo }} />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: D.text }}>Edit Your Profile</h2>
              </div>

              {profileError && <div style={{ padding: '10px 14px', borderRadius: 8, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> {profileError}</div>}
              {profileSuccess && <div style={{ padding: '10px 14px', borderRadius: 8, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> {profileSuccess}</div>}

              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 700, color: D.text, textTransform: 'uppercase' }}>Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${D.border}`,
                      fontSize: '0.9rem',
                      color: D.text,
                      background: D.inputBg || D.surface,
                      outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = D.indigo
                      e.target.style.boxShadow = `0 0 0 3px ${D.indigo}15`
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = D.border
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>

                <div style={{ padding: 16, background: D.surfaceHi, borderRadius: 10, border: `1px dashed ${D.border}` }}>
                  <label style={{ display: 'block', marginBottom: 12, fontSize: '0.8rem', fontWeight: 700, color: D.text, textTransform: 'uppercase' }}>Profile Picture</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img
                      src={profileForm.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=${D.indigo.slice(1)}&color=fff&size=80&bold=true`}
                      alt="preview"
                      style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', border: `1px solid ${D.border}`, flexShrink: 0 }}
                    />
                    <div>
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: `1px solid ${D.indigo}40`,
                          background: D.indigo + '10',
                          color: D.indigo,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          transition: 'all 0.2s ease',
                          marginBottom: 6,
                          display: 'block',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = D.indigo + '20'}
                        onMouseLeave={e => e.currentTarget.style.background = D.indigo + '10'}
                      >
                        Choose Image
                      </button>
                      <span style={{ fontSize: '0.7rem', color: D.textSub }}>JPG, PNG - Max 1 MB</span>
                    </div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

                <button
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: D.indigo,
                    color: '#fff',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    opacity: profileLoading ? 0.7 : 1,
                    boxShadow: `0 2px 8px ${D.indigo}40`,
                    transition: 'all 0.2s ease',
                    alignSelf: 'flex-start',
                  }}
                  onMouseEnter={e => !profileLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Change Password Form */}
          {activeTab === 'password' && (
            <div style={{
              background: D.surface,
              borderRadius: 12,
              border: `1px solid ${D.border}`,
              padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Lock size={20} style={{ color: D.orange }} />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: D.text }}>Change Password</h2>
              </div>

              {pwError && <div style={{ padding: '10px 14px', borderRadius: 8, background: D.redDim, color: D.red, border: `1px solid ${D.red}30`, marginBottom: 16, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> {pwError}</div>}
              {pwSuccess && <div style={{ padding: '10px 14px', borderRadius: 8, background: D.greenDim, color: D.green, border: `1px solid ${D.green}30`, marginBottom: 16, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> {pwSuccess}</div>}

              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'currentPassword', label: 'Current Password' },
                  { key: 'newPassword', label: 'New Password' },
                  { key: 'confirmPassword', label: 'Confirm New Password' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', fontWeight: 700, color: D.text, textTransform: 'uppercase' }}>{field.label}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={pwForm[field.key]}
                        onChange={e => setPwForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 36px 10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${D.border}`,
                          fontSize: '0.9rem',
                          color: D.text,
                          background: D.inputBg || D.surface,
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onFocus={e => {
                          e.target.style.borderColor = D.orange
                          e.target.style.boxShadow = `0 0 0 3px ${D.orange}15`
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = D.border
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => !p)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: D.textSub,
                          padding: 4,
                        }}
                      >
                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwForm.newPassword.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 8, background: D.surfaceHi, border: `1px solid ${D.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: D.textSub, textTransform: 'uppercase' }}>Password Strength</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: pwForm.newPassword.length < 6 ? D.red : pwForm.newPassword.length < 10 ? D.gold : D.green,
                      }}>
                        {pwForm.newPassword.length < 6 ? 'Weak' : pwForm.newPassword.length < 10 ? 'Moderate' : 'Strong'}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: D.surfaceHi, border: `1px solid ${D.border}`, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pwForm.newPassword.length * 8, 100)}%`,
                        background: pwForm.newPassword.length < 6 ? D.red : pwForm.newPassword.length < 10 ? D.gold : D.green,
                        transition: 'width 0.2s ease',
                      }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: D.orange,
                    color: '#fff',
                    cursor: pwLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    opacity: pwLoading ? 0.7 : 1,
                    boxShadow: `0 2px 8px ${D.orange}40`,
                    transition: 'all 0.2s ease',
                    alignSelf: 'flex-start',
                  }}
                  onMouseEnter={e => !pwLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default ProfilePage
