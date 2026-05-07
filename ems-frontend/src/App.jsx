import { lazy, Suspense } from 'react'
import logo from './assets/logo.png'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

// ── Eagerly loaded (entry points — always needed immediately) ──────────────
import LoginPage    from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'

// ── Lazily loaded (code-split per page) ───────────────────────────────────
const DashboardPage     = lazy(() => import('./pages/DashboardPage'))
const UsersPage         = lazy(() => import('./pages/UsersPage'))
const ProfilePage       = lazy(() => import('./pages/ProfilePage'))
const VehiclesPage      = lazy(() => import('./pages/VehiclesPage'))
const ServicePage       = lazy(() => import('./pages/ServicePage'))
const AddServicePage    = lazy(() => import('./pages/AddServicePage'))
const FuelAnalysisPage  = lazy(() => import('./pages/FuelAnalysisPage'))
const FuelLogPage       = lazy(() => import('./pages/FuelLogPage'))
const FuelManagementPage = lazy(() => import('./pages/FuelManagementPage'))
const LocationPage      = lazy(() => import('./pages/LocationPage'))
const ReportsPage       = lazy(() => import('./pages/ReportsPage'))

// ── Suspense fallback — matches the app's dark theme ─────────────────────
const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1117 50%, #0a1628 100%)',
    gap: 0,
  }}>
    {/* Logo with animated glow pulse */}
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      <div style={{
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: '36px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
        animation: 'logoPulse 2s ease-in-out infinite',
      }} />
      <img
        src={logo}
        alt="V-MAS Logo"
        style={{
          width: 110,
          height: 110,
          borderRadius: '28px',
          position: 'relative',
          zIndex: 1,
          filter: 'drop-shadow(0 0 18px rgba(99,102,241,0.5)) drop-shadow(0 0 40px rgba(56,189,248,0.2))',
          animation: 'logoFloat 3s ease-in-out infinite',
        }}
      />
    </div>

    {/* Brand name */}
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{
        fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.12em',
        background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text', lineHeight: 1,
      }}>V-MAS</div>
      <div style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.2em', marginTop: 6, textTransform: 'uppercase' }}>
        Fleet Management
      </div>
    </div>

    {/* Animated dots */}
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
          animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          opacity: 0.8,
        }} />
      ))}
    </div>

    <style>{`
      @keyframes logoPulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.15); opacity: 1; }
      }
      @keyframes logoFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      @keyframes dotBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-10px); opacity: 1; }
      }
    `}</style>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"            element={<LoginPage />} />
            <Route path="/signup"           element={<SignUpPage />} />
            <Route path="/dashboard"        element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/users"            element={<PrivateRoute><UsersPage /></PrivateRoute>} />
            <Route path="/profile"          element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/vehicles"         element={<PrivateRoute><VehiclesPage /></PrivateRoute>} />
            <Route path="/service"          element={<PrivateRoute><ServicePage /></PrivateRoute>} />
            <Route path="/service/add"      element={<PrivateRoute><AddServicePage /></PrivateRoute>} />
            <Route path="/service/edit/:id" element={<PrivateRoute><AddServicePage /></PrivateRoute>} />
            <Route path="/fuel-analysis"    element={<PrivateRoute><FuelAnalysisPage /></PrivateRoute>} />
            <Route path="/fuel-log"         element={<PrivateRoute><FuelLogPage /></PrivateRoute>} />
            <Route path="/fuel-management"  element={<PrivateRoute><FuelManagementPage /></PrivateRoute>} />
            <Route path="/location"         element={<PrivateRoute><LocationPage /></PrivateRoute>} />
            <Route path="/reports"          element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
            <Route path="/"                 element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}

export default App
