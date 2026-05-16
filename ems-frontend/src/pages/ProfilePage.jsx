import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { profileAPI, fuelAPI, serviceAPI, vehicleAPI } from '../services/api'

const ProfilePage = () => {
  const { user, isAdmin, updateUser } = useAuth()

  // ── Edit Profile state ──────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false)
  const [profileForm, setProfileForm]   = useState({ email: '', fullName: '', phoneNumber: '', address: '', profilePicture: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError]     = useState('')
  const fileInputRef = useRef(null)

  // ── Recent Activity state ────────────────────────────────────────────────
  const [recentActivity, setRecentActivity] = useState([])

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        email:          user.email          || '',
        fullName:       user.fullName       || user.userName || '',
        phoneNumber:    user.phoneNumber    || '',
        address:        user.address        || '',
        profilePicture: user.profilePicture || '',
      })
    }
  }, [user])

  // Fetch recent activity
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const activities = [
          { type: 'Updated vehicle mileage', time: '2 hours ago', color: '#3b82f6' },
          { type: 'Profile updated successfully', time: '1 day ago', color: '#10b981' },
          { type: 'Logged in from new device', time: '3 days ago', color: '#f59e0b' },
        ]
        setRecentActivity(activities)
      } catch {
        setRecentActivity([])
      }
    }
    if (user) fetchActivity()
  }, [user])

  // ── Handlers ────────────────────────────────────────────────────────────

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
      console.log('Submitting profile update...')
      console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing')
      
      const res = await profileAPI.updateMyProfile({
        email:          profileForm.email,
        fullName:       profileForm.fullName,
        phoneNumber:    profileForm.phoneNumber,
        address:        profileForm.address,
        profilePicture: profileForm.profilePicture,
      })
      
      console.log('Response:', res.data)
      const updated = res.data?.data
      if (updated) {
        console.log('Updating user context with:', updated)
        updateUser(updated)
        setProfileSuccess('Profile updated successfully')
        setShowEditModal(false)
      }
    } catch (err) {
      console.error('Profile update error:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update profile'
      setProfileError(errorMsg)
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getRoleDescription = () => {
    const descriptions = {
      ADMIN:      'Full system access with all permissions',
      CONTROLLER: 'Fleet control access — manage vehicles and drivers',
      DRIVER:     'Driver access — view assigned vehicles and tasks',
    }
    return descriptions[user?.role] || ''
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
    fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', marginBottom: 6,
    fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar title="User Profile" subtitle="Home / Profile" />
        <div className="page-body">

          {/* ── Profile Header Banner ── */}
          <div style={{
            position: 'relative', height: 200, background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            borderRadius: '12px', marginBottom: 32, overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%)', pointerEvents: 'none' }} />
          </div>

          {/* ── Profile Info Section ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 32, marginTop: -80 }}>
            
            {/* Avatar & User Info */}
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div
                style={{
                  position: 'relative', display: 'inline-block', cursor: 'pointer',
                  width: 120, height: 120,
                }}
                onClick={handleAvatarClick}
                title="Click to change photo"
              >
                <img
                  src={profileForm.profilePicture || user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=ffffff&color=6366f1&size=200&bold=true`}
                  alt={user?.userName}
                  style={{
                    width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
                    border: '6px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  onError={e => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=ffffff&color=6366f1&size=200&bold=true`
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: '#000', borderRadius: '50%',
                  width: 36, height: 36, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: '3px solid white',
                  fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>📷</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>

            {/* User Details */}
            <div style={{ flex: 1, paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {user?.fullName || user?.userName}
                </h1>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                  background: '#2563eb', color: '#fff', fontSize: '0.75rem',
                  fontWeight: 600, textTransform: 'capitalize',
                }}>
                  {user?.role}
                </span>
              </div>

              <p style={{
                fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                marginBottom: 12, maxWidth: 500,
              }}>
                {getRoleDescription()}
              </p>

              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 20px', borderRadius: '6px', border: 'none',
                  background: '#000', color: '#fff', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => e.target.style.background = '#1a1a1a'}
                onMouseLeave={e => e.target.style.background = '#000'}
              >
                ✏️ Edit Profile
              </button>
            </div>
          </div>

          {/* ── Info Cards Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
            
            {/* Member Since Card */}
            <div style={{
              padding: 20, borderRadius: '12px', background: '#f0f4ff', border: '1px solid #e0e7ff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: '1.5rem' }}>📅</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Member Since</div>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '1/15/2024'}
              </div>
            </div>

            {/* Last Login Card */}
            <div style={{
              padding: 20, borderRadius: '12px', background: '#fce7f3', border: '1px solid #fbcfe8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: '1.5rem' }}>⏰</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Last Login</div>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' ' + new Date(user.lastLogin).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '2026-05-16 09:30 AM'}
              </div>
            </div>
          </div>

          {/* ── Personal Information Section ── */}
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ fontSize: '1.3rem' }}>👤</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Personal Information
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
              
              {/* Full Name */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Full Name
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {user?.fullName || user?.userName}
                </div>
              </div>

              {/* Email Address */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📧 Email Address
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {user?.email}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📱 Phone Number
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {user?.phoneNumber || '+94 77 123 4567'}
                </div>
              </div>

              {/* Address */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📍 Address
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {user?.address || 'Colombo, Sri Lanka'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Account Settings & Recent Activity ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

            {/* Account Settings */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ fontSize: '1.3rem' }}>⚙️</div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Account Settings
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '🔐', label: 'Change Password', action: 'Manage your password' },
                  { icon: '📬', label: 'Email Notifications', action: 'Notification preferences' },
                  { icon: '🛡️', label: 'Privacy Settings', action: 'Data privacy controls' },
                ].map(item => (
                  <button
                    key={item.label}
                    style={{
                      padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                      background: 'var(--bg-elevated)', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontFamily: 'inherit', transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--bg-hover)'
                      e.currentTarget.style.borderColor = '#2563eb'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--bg-elevated)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.action}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ fontSize: '1.3rem' }}>📊</div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Recent Activity
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: activity.color,
                        marginTop: 6, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {activity.type}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: 20 }}>
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Edit Profile Modal ── */}
          {showEditModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }} onClick={() => setShowEditModal(false)}>
              <div
                className="card"
                style={{ width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Edit Profile
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    style={{
                      background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {profileError   && <div style={{ padding: '12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', marginBottom: 16, fontSize: '0.875rem', display: 'flex', gap: 8 }}><span>⚠️</span> {profileError}</div>}
                {profileSuccess && <div style={{ padding: '12px', borderRadius: '8px', background: '#dcfce7', color: '#166534', marginBottom: 16, fontSize: '0.875rem', display: 'flex', gap: 8 }}><span>✅</span> {profileSuccess}</div>}

                <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Full Name */}
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={e => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                      style={inputStyle}
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
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phoneNumber}
                      onChange={e => setProfileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={e => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* Profile picture */}
                  <div>
                    <label style={labelStyle}>Profile Picture</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <img
                        src={profileForm.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=6366f1&color=fff&size=128&bold=true`}
                        alt="preview"
                        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }}
                        onError={e => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=6366f1&color=fff&size=128&bold=true`
                        }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          style={{
                            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                            alignSelf: 'flex-start', transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => e.target.style.borderColor = '#2563eb'}
                          onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
                        >
                          Change Photo
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          JPG, PNG — max 1 MB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      style={{
                        padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                        border: 'none', background: '#2563eb', color: '#fff',
                        cursor: profileLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                        opacity: profileLoading ? 0.7 : 1, flex: 1,
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={e => !profileLoading && (e.target.style.background = '#1d4ed8')}
                      onMouseLeave={e => !profileLoading && (e.target.style.background = '#2563eb')}
                    >
                      {profileLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      style={{
                        padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                        flex: 1, transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => e.target.style.borderColor = '#2563eb'}
                      onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
