import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

// ── Eagerly loaded (entry points — always needed immediately) ──────────────
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

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
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0d1117',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '4px solid rgba(129,140,248,0.2)',
        borderTopColor: '#a78bfa',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 16px',
      }} />
      <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
        Loading…
      </p>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"            element={<LoginPage />} />
            <Route path="/register"         element={<RegisterPage />} />
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
