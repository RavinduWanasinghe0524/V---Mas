import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, Users, Settings,
  Car, AlertCircle, CheckCircle, ChevronDown, Clock, ArrowLeft,
  Shield, BarChart3, MapPin, Moon, Sun
} from 'lucide-react';
import bgImage from '../assets/login-bg.jpg';
import logo from '../assets/logo.png';
import { useTheme } from '../context/ThemeContext';
import './SignUpPage.css';

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'DRIVER',
    profilePicture: '',
  });
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [registered, setRegistered]     = useState(false);

  const { register, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'blue';

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'password') {
      let s = 0;
      if (value.length >= 6)           s++;
      if (value.length >= 10)          s++;
      if (/[A-Z]/.test(value))         s++;
      if (/[0-9]/.test(value))         s++;
      if (/[^A-Za-z0-9]/.test(value))  s++;
      setPasswordStrength(s);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { confirmPassword, ...submitData } = formData;
    if (!submitData.profilePicture) {
      submitData.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(submitData.userName)}&background=6366f1&color=fff&size=128&bold=true`;
    }
    const result = await register(submitData);
    if (result.success) {
      if (result.pending) {
        setRegistered(true);
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const roleIcons = {
    DRIVER:     <Car size={14} />,
    CONTROLLER: <Settings size={14} />,
    ADMIN:      <Users size={14} />,
  };

  // ── PENDING APPROVAL SCREEN ──────────────────────────────────────────────
  if (registered) {
    return (
      <div className="split-signup-container">
        <img src={bgImage} alt="background" className="split-signup-bg-image" />
        <div className="split-signup-bg-gradient" />
        <button onClick={toggleTheme} className="auth-theme-toggle" title={isDark ? 'Switch to Light theme' : 'Switch to Blue theme'}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? 'Light' : 'Blue'}
        </button>

        <div className="split-pending-card">
          <div className="split-pending-icon-ring">
            <div className="split-pending-icon-pulse" />
            <div className="split-pending-icon-inner">
              <Clock size={32} color="white" />
            </div>
          </div>

          <h2 className="split-pending-title">Account Created!</h2>
          <p className="split-pending-sub">
            Your account is <span className="split-pending-highlight">pending admin approval</span>.
          </p>
          <p className="split-pending-desc">
            An administrator will review your request and activate your account shortly.
            You will be able to sign in once your account has been approved.
          </p>

          <div className="split-pending-steps">
            <div className="split-pending-step done">
              <CheckCircle size={16} className="split-pending-step-icon" />
              <span>Account registered</span>
            </div>
            <div className="split-pending-step-line" />
            <div className="split-pending-step waiting">
              <Clock size={16} className="split-pending-step-icon" />
              <span>Awaiting admin approval</span>
            </div>
            <div className="split-pending-step-line" />
            <div className="split-pending-step inactive">
              <CheckCircle size={16} className="split-pending-step-icon" />
              <span>Access granted</span>
            </div>
          </div>

          <Link to="/login" className="split-pending-btn">
            <ArrowLeft size={16} />
            Back to Sign In
          </Link>

          <p className="split-pending-footer">
            © 2026 V-MAS. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // ── SIGN UP FORM ─────────────────────────────────────────────────────────
  return (
    <div className="split-signup-container">
      <img src={bgImage} alt="Dark background with vehicle lights" className="split-signup-bg-image" />
      <div className="split-signup-bg-gradient" />
      <button onClick={toggleTheme} className="auth-theme-toggle" title={isDark ? 'Switch to Light theme' : 'Switch to Blue theme'}>
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
        {isDark ? 'Light' : 'Blue'}
      </button>

      <div className="split-signup-main-card">

        {/* Left Panel */}
        <div className="split-signup-left">
          <div className="split-signup-circle-1" />
          <div className="split-signup-circle-2" />

          <div className="split-signup-left-content">
            <div className="split-signup-logo-container">
              <div className="split-signup-logo-box" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
                <img
                  src={logo}
                  alt="V-MAS"
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                    filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.7))',
                  }}
                />
              </div>
              <span className="split-signup-logo-text">V-MAS</span>
            </div>

            <h2 className="split-signup-heading">
              Start Your<br />Fleet Journey
            </h2>
            <p className="split-signup-subheading">
              Join thousands of fleet operators who trust V-MAS for smarter, safer, and more efficient vehicle management.
            </p>

            <div className="split-signup-features">
              <div className="split-signup-feature-item">
                <div className="split-signup-feature-icon"><Shield size={16} /></div>
                <span className="split-signup-feature-text">Enterprise-grade Security</span>
              </div>
              <div className="split-signup-feature-item">
                <div className="split-signup-feature-icon"><BarChart3 size={16} /></div>
                <span className="split-signup-feature-text">Real-time Analytics</span>
              </div>
              <div className="split-signup-feature-item">
                <div className="split-signup-feature-icon"><MapPin size={16} /></div>
                <span className="split-signup-feature-text">Live GPS Tracking</span>
              </div>
            </div>
          </div>

          <p className="split-signup-copyright">© 2026 V-MAS. All rights reserved.</p>
        </div>

        {/* Right Panel */}
        <div className="split-signup-right">
          <div className="split-signup-mobile-logo">
            <div className="split-signup-mobile-logo-box" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
              <img
                src={logo}
                alt="V-MAS"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                  filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.6))',
                }}
              />
            </div>
            <span className="split-signup-title" style={{ marginBottom: 0 }}>V-MAS</span>
          </div>

          <h3 className="split-signup-title">Create Account</h3>
          <p className="split-signup-subtitle">Fill in your details to get started</p>

          {error && (
            <div className="split-signup-error">
              <AlertCircle size={16} />{error}
            </div>
          )}

          <form className="split-signup-form" onSubmit={handleSubmit}>

            {/* Username */}
            <div className="split-signup-input-wrapper">
              <label className="split-signup-label">Username</label>
              <div className="split-signup-input-group">
                <User className="split-signup-input-icon" size={16} />
                <input type="text" name="userName" value={formData.userName}
                  onChange={handleChange} placeholder="Choose a username"
                  className="split-signup-input" required />
              </div>
            </div>

            {/* Email */}
            <div className="split-signup-input-wrapper">
              <label className="split-signup-label">Email Address</label>
              <div className="split-signup-input-group">
                <Mail className="split-signup-input-icon" size={16} />
                <input type="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="your@email.com"
                  className="split-signup-input" required />
              </div>
            </div>

            {/* Password row */}
            <div className="split-signup-row">
              <div className="split-signup-input-wrapper">
                <label className="split-signup-label">Password</label>
                <div className="split-signup-input-group">
                  <Lock className="split-signup-input-icon" size={16} />
                  <input type={showPassword ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Min. 6 characters" className="split-signup-input" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="split-signup-input-btn">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="split-signup-strength">
                    <div className="split-signup-strength-bars">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className="split-signup-strength-bar"
                          style={{ background: n <= passwordStrength ? strengthColor[passwordStrength] : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span className="split-signup-strength-label" style={{ color: strengthColor[passwordStrength] }}>
                      {strengthLabel[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="split-signup-input-wrapper">
                <label className="split-signup-label">Confirm Password</label>
                <div className="split-signup-input-group">
                  <Lock className="split-signup-input-icon" size={16} />
                  <input type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Repeat password" className="split-signup-input" required />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="split-signup-input-btn">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <div className="split-signup-match-hint">
                    {formData.password === formData.confirmPassword ? (
                      <><CheckCircle size={12} color="#22c55e" /><span style={{ color:'#22c55e' }}>Passwords match</span></>
                    ) : (
                      <><AlertCircle size={12} color="#ef4444" /><span style={{ color:'#ef4444' }}>Passwords do not match</span></>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="split-signup-input-wrapper">
              <label className="split-signup-label">Role</label>
              <div className="split-signup-input-group split-signup-select-group">
                <span className="split-signup-input-icon">{roleIcons[formData.role]}</span>
                <select name="role" value={formData.role} onChange={handleChange}
                  className="split-signup-input split-signup-select">
                  <option value="DRIVER">Driver</option>
                  <option value="CONTROLLER">Controller</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronDown className="split-signup-select-caret" size={16} />
              </div>
            </div>

            {/* Info banner */}
            <div className="split-signup-info-banner">
              <Clock size={14} />
              <span>New accounts require <strong>admin approval</strong> before you can sign in.</span>
            </div>

            {/* Submit */}
            <button type="submit" className="split-signup-submit" disabled={loading}>
              {loading ? <span>Creating account...</span> : <span>Create Account</span>}
            </button>
          </form>

          <p className="split-signup-footer">
            Already have an account?{' '}<Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
