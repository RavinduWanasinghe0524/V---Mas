import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { profileAPI, fuelAPI, serviceAPI, vehicleAPI } from '../services/api'

const ProfilePage = () => {
  const { user, isAdmin, updateUser } = useAuth()

  // ── Edit Profile state ──────────────────────────────────────────────────
  const [profileForm, setProfileForm]   = useState({ email: '', profilePicture: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError]     = useState('')
  const fileInputRef = useRef(null)

  // ── Change Password state ───────────────────────────────────────────────
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading]   = useState(false)
  const [pwSuccess, setPwSuccess]   = useState('')
  const [pwError, setPwError]       = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // ── Activity stats state ────────────────────────────────────────────────
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // ── Active tab ──────────────────────────────────────────────────────────
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

  // ── Helpers ─────────────────────────────────────────────────────────────

  const roleBadgeClass = {
    ADMIN:      'badge badge-admin',
    CONTROLLER: 'badge badge-controller',
    DRIVER:     'badge badge-driver',
  }[user?.role] || 'badge'

  const roleDescription = {
    ADMIN:      'Full system access — manage users, view reports, and configure the system.',
    CONTROLLER: 'Fleet control access — manage vehicles, assign drivers, and monitor operations.',
    DRIVER:     'Driver access — view assigned vehicles, tasks, and log fuel consumption.',
  }[user?.role] || ''

  const permissions = {
    ADMIN:      ['Manage all users', 'View system stats', 'Configure settings', 'Access all modules'],
    CONTROLLER: ['Manage fleet vehicles', 'Assign drivers', 'Live vehicle tracking', 'Schedule maintenance'],
    DRIVER:     ['View assigned vehicle', 'Manage tasks', 'Log fuel usage', 'Report vehicle issues'],
  }[user?.role] || []

  const tabs = [
    { key: 'info',     label: 'Account Info' },
    { key: 'edit',     label: 'Edit Profile' },
    { key: 'password', label: 'Change Password' },
    { key: 'stats',    label: 'Activity' },
  ]

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
        <Topbar title="My Profile" subtitle="Home / Profile" />
        <div className="page-body">

          <div className="page-header">
            <div>
              <h1 className="page-title">My Profile</h1>
              <p className="page-subtitle">Manage your account information and security settings</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

            {/* ── Left: Profile Card ── */}
            <div className="card" style={{ textAlign: 'center' }}>
              {/* Avatar */}
              <div
                style={{ position: 'relative', display: 'inline-block', marginBottom: 20, cursor: 'pointer' }}
                onClick={handleAvatarClick}
                title="Click to change photo"
              >
                <img
                  src={profileForm.profilePicture || user?.profilePicture}
                  alt={user?.userName}
                  className="avatar-xl"
                  onError={e => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.userName || 'U')}&background=6366f1&color=fff&size=128&bold=true`
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: 'var(--text-accent)', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: '2px solid var(--bg-card)',
                  fontSize: '0.75rem',
                }}>✏️</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {user?.userName}
              </h2>
              <div style={{ marginBottom: 8 }}>
                <span className={roleBadgeClass}>{user?.role}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {roleDescription}
              </p>

              {/* Status indicator */}
              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {user?.accountStatus || 'ACTIVE'}
                </span>
              </div>

              {/* Permissions */}
              <div style={{
                marginTop: 16, padding: '14px 16px',
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', textAlign: 'left',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Your Permissions
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {permissions.map(p => (
                    <li key={p} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--success)' }}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Right: Tabbed Panel ── */}
            <div>
              {/* Tab bar */}
              <div style={{
                display: 'flex', gap: 4, marginBottom: 20,
                background: 'var(--bg-elevated)', padding: 4, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                      transition: 'all 0.15s ease',
                      background: activeTab === tab.key ? 'var(--text-accent)' : 'transparent',
                      color:      activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Account Info ── */}
              {activeTab === 'info' && (
                <div className="card">
                  <div className="section-header" style={{ marginBottom: 20 }}>
                    <h2 className="section-title">Account Information</h2>
                    <div className="section-divider"></div>
                  </div>

                  {[
                    { icon: '👤', label: 'Username',       value: user?.userName },
                    { icon: '📧', label: 'Email',          value: user?.email },
                    { icon: '🔑', label: 'Role',           value: <span className={roleBadgeClass}>{user?.role}</span> },
                    { icon: '✅', label: 'Account Status', value: <span className="badge badge-active">● {user?.accountStatus}</span> },
                  ].map((row, idx, arr) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 0',
                      borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.1rem' }}>{row.icon}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {row.value}
                      </span>
                    </div>
                  ))}

                  {/* Session info */}
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                      Session
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { icon: '🔐', title: 'Authentication',  sub: 'JWT Token-based authentication active', badge: 'Secure'    },
                        { icon: '🌐', title: 'Backend API',     sub: 'Connected to V-MAS Spring Boot backend', badge: 'Connected' },
                      ].map(item => (
                        <div key={item.title} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: 14,
                          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                        }}>
                          <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.sub}</div>
                          </div>
                          <span className="badge badge-active" style={{ marginLeft: 'auto' }}>{item.badge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Edit Profile ── */}
              {activeTab === 'edit' && (
                <div className="card">
                  <div className="section-header" style={{ marginBottom: 20 }}>
                    <h2 className="section-title">Edit Profile</h2>
                    <div className="section-divider"></div>
                  </div>

                  {profileError   && <div className="alert alert-error"   style={{ marginBottom: 16 }}><span>⚠️</span> {profileError}</div>}
                  {profileSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}><span>✅</span> {profileSuccess}</div>}

                  <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Username (read-only) */}
                    <div>
                      <label style={labelStyle}>Username <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(cannot be changed)</span></label>
                      <input
                        type="text"
                        value={user?.userName || ''}
                        disabled
                        style={{ ...inputStyle, opacity: 0.55, cursor: 'not-allowed' }}
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
                              alignSelf: 'flex-start',
                            }}
                          >
                            Upload Image
                          </button>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            JPG, PNG — max 1 MB
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={profileLoading}
                      style={{
                        padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                        border: 'none', background: 'var(--text-accent)', color: '#fff',
                        cursor: profileLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                        opacity: profileLoading ? 0.7 : 1, alignSelf: 'flex-start',
                      }}
                    >
                      {profileLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Tab: Change Password ── */}
              {activeTab === 'password' && (
                <div className="card">
                  <div className="section-header" style={{ marginBottom: 20 }}>
                    <h2 className="section-title">Change Password</h2>
                    <div className="section-divider"></div>
                  </div>

                  {pwError   && <div className="alert alert-error"   style={{ marginBottom: 16 }}><span>⚠️</span> {pwError}</div>}
                  {pwSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}><span>✅</span> {pwSuccess}</div>}

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
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(p => !p)}
                            style={{
                              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-muted)', fontSize: '1rem',
                            }}
                          >
                            {showPasswords ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Password strength hint */}
                    {pwForm.newPassword.length > 0 && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        fontSize: '0.78rem', color: 'var(--text-muted)',
                      }}>
                        Strength: {' '}
                        <span style={{
                          fontWeight: 700,
                          color: pwForm.newPassword.length < 6 ? '#ef4444'
                            : pwForm.newPassword.length < 10 ? '#f59e0b'
                            : '#10b981',
                        }}>
                          {pwForm.newPassword.length < 6 ? 'Weak'
                            : pwForm.newPassword.length < 10 ? 'Moderate'
                            : 'Strong'}
                        </span>
                        {pwForm.newPassword.length > 0 && pwForm.confirmPassword.length > 0 && (
                          <span style={{ marginLeft: 16, color: pwForm.newPassword === pwForm.confirmPassword ? '#10b981' : '#ef4444' }}>
                            {pwForm.newPassword === pwForm.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={pwLoading}
                      style={{
                        padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                        border: 'none', background: 'var(--text-accent)', color: '#fff',
                        cursor: pwLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                        opacity: pwLoading ? 0.7 : 1, alignSelf: 'flex-start',
                      }}
                    >
                      {pwLoading ? 'Updating…' : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Tab: Activity Stats ── */}
              {activeTab === 'stats' && (
                <div className="card">
                  <div className="section-header" style={{ marginBottom: 20 }}>
                    <h2 className="section-title">Activity Overview</h2>
                    <div className="section-divider"></div>
                  </div>

                  {statsLoading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      Loading stats…
                    </div>
                  ) : stats ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                      {user?.role === 'DRIVER' ? (
                        <>
                          <StatCard icon="⛽" label="Total Fuel Logs"    value={stats.totalLogs}       color="var(--text-accent)" />
                          <StatCard icon="📏" label="Avg Efficiency"     value={`${stats.avgEfficiency} km/L`} color="#10b981" />
                          <StatCard icon="📅" label="Last Entry"         value={stats.lastEntry}        color="#f59e0b" />
                        </>
                      ) : (
                        <>
                          <StatCard icon="🚗" label="Total Vehicles"     value={stats.totalVehicles}    color="var(--text-accent)" />
                          <StatCard icon="🔧" label="Upcoming Services"  value={stats.upcomingServices} color="#f59e0b" />
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
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

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    padding: 20, borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '2rem', marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
  </div>
)

export default ProfilePage
