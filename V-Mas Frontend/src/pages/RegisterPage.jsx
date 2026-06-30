import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, Truck, Users, Settings,
  Car, AlertCircle, CheckCircle, ChevronDown, Clock, ArrowLeft
} from 'lucide-react';
import bgImage from '../assets/login-bg-opt.jpg';
import './RegisterPage.css';

const RegisterPage = () => {
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
  const [registered, setRegistered]     = useState(false); // ← "pending" screen trigger

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
      submitData.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(submitData.userName)}&background=2563eb&color=fff&size=128&bold=true`;
    }
    const result = await register(submitData);
    if (result.success) {
      if (result.pending) {
        // Backend returned no token → account is PENDING
        setRegistered(true);
      } else {
        // Backend auto-approved (ACTIVE + token) — go to dashboard
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

  // ──────────────────────────────────────────────────────────────────
  // PENDING APPROVAL CONFIRMATION SCREEN
  // ──────────────────────────────────────────────────────────────────
  if (registered) {
    return (
      <div className="split-register-container">
        <img src={bgImage} alt="background" className="split-register-bg-image" />
        <div className="split-register-bg-gradient" />

        <div className="split-pending-card">
          {/* Animated checkmark ring */}
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

  // ──────────────────────────────────────────────────────────────────
  // REGISTRATION FORM
  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="split-register-container">
      <img src={bgImage} alt="Dark background with vehicle lights" className="split-register-bg-image" />
      <div className="split-register-bg-gradient" />

      <div className="split-register-main-card">

        {/* Left Panel */}
        <div className="split-register-left">
          <div className="split-register-circle-1" />
          <div className="split-register-circle-2" />

          <div className="split-register-left-content">
            <div className="split-register-logo-container">
              <div className="split-register-logo-box">
                <Truck color="white" size={20} />
              </div>
              <span className="split-register-logo-text">V-MAS</span>
            </div>

            <h2 className="split-register-heading">
              Start Your<br />Fleet Journey
            </h2>
            <p className="split-register-subheading">
              Join thousands of fleet operators who trust V-MAS for smarter, safer, and more efficient vehicle management.
            </p>

            <div className="split-register-features">
              <div className="split-register-feature-item">
                <div className="split-register-feature-icon"><Users size={16} /></div>
                <span className="split-register-feature-text">Three distinct user roles</span>
              </div>
              <div className="split-register-feature-item">
                <div className="split-register-feature-icon"><Car size={16} /></div>
                <span className="split-register-feature-text">Centralized fleet management</span>
              </div>
              <div className="split-register-feature-item">
                <div className="split-register-feature-icon"><Settings size={16} /></div>
                <span className="split-register-feature-text">Admin, Controller &amp; Driver portals</span>
              </div>
            </div>
          </div>

          <p className="split-register-copyright">© 2026 V-MAS. All rights reserved.</p>
        </div>

        {/* Right Panel */}
        <div className="split-register-right">
          <div className="split-register-mobile-logo">
            <div className="split-register-mobile-logo-box"><Truck size={16} color="white" /></div>
            <span className="split-register-title" style={{ marginBottom: 0 }}>V-MAS</span>
          </div>

          <h3 className="split-register-title">Create Account</h3>
          <p className="split-register-subtitle">Fill in your details to get started</p>

          {error && (
            <div className="split-register-error">
              <AlertCircle size={16} />{error}
            </div>
          )}

          <form className="split-register-form" onSubmit={handleSubmit}>

            {/* Username */}
            <div className="split-register-input-wrapper">
              <label className="split-register-label">Username</label>
              <div className="split-register-input-group">
                <User className="split-register-input-icon" size={16} />
                <input type="text" name="userName" value={formData.userName}
                  onChange={handleChange} placeholder="Choose a username"
                  className="split-register-input" required />
              </div>
            </div>

            {/* Email */}
            <div className="split-register-input-wrapper">
              <label className="split-register-label">Email Address</label>
              <div className="split-register-input-group">
                <Mail className="split-register-input-icon" size={16} />
                <input type="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="your@email.com"
                  className="split-register-input" required />
              </div>
            </div>

            {/* Password row */}
            <div className="split-register-row">
              <div className="split-register-input-wrapper">
                <label className="split-register-label">Password</label>
                <div className="split-register-input-group">
                  <Lock className="split-register-input-icon" size={16} />
                  <input type={showPassword ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Min. 6 characters" className="split-register-input" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="split-register-input-btn">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="split-register-strength">
                    <div className="split-register-strength-bars">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className="split-register-strength-bar"
                          style={{ background: n <= passwordStrength ? strengthColor[passwordStrength] : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span className="split-register-strength-label" style={{ color: strengthColor[passwordStrength] }}>
                      {strengthLabel[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="split-register-input-wrapper">
                <label className="split-register-label">Confirm Password</label>
                <div className="split-register-input-group">
                  <Lock className="split-register-input-icon" size={16} />
                  <input type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Repeat password" className="split-register-input" required />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="split-register-input-btn">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <div className="split-register-match-hint">
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
            <div className="split-register-input-wrapper">
              <label className="split-register-label">Role</label>
              <div className="split-register-input-group split-register-select-group">
                <span className="split-register-input-icon">{roleIcons[formData.role]}</span>
                <select name="role" value={formData.role} onChange={handleChange}
                  className="split-register-input split-register-select">
                  <option value="DRIVER">Driver</option>
                  <option value="CONTROLLER">Controller</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronDown className="split-register-select-caret" size={16} />
              </div>
            </div>

            {/* Info banner */}
            <div className="split-register-info-banner">
              <Clock size={14} />
              <span>New accounts require <strong>admin approval</strong> before you can sign in.</span>
            </div>

            {/* Submit */}
            <button type="submit" className="split-register-submit" disabled={loading}>
              {loading ? <span>Creating account...</span> : <span>Create Account</span>}
            </button>
          </form>

          <p className="split-register-footer">
            Already have an account?{' '}<Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
