import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, AlertCircle, CheckCircle, ChevronDown,
  Clock, ArrowLeft, UserPlus, Car, Settings, Users
} from 'lucide-react';
import logo from '../assets/V-MAS Logo.svg';
import fleetHero from '../assets/fleet-hero.png';
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
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6)                   { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { confirmPassword, ...submitData } = formData;
    if (!submitData.profilePicture) {
      submitData.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(submitData.userName)}&background=2563eb&color=fff&size=128&bold=true`;
    }
    const result = await register(submitData);
    if (result.success) {
      result.pending ? setRegistered(true) : navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const roleIcons = { DRIVER: <Car size={14} />, CONTROLLER: <Settings size={14} />, ADMIN: <Users size={14} /> };

  /* ── PENDING APPROVAL SCREEN ── */
  if (registered) {
    return (
      <div className="su-pending-overlay">
        <div className="su-pending-card">
          <div className="su-pending-ring">
            <div className="su-pending-pulse" />
            <div className="su-pending-inner"><Clock size={30} color="#fff" /></div>
          </div>
          <h2 className="su-pending-title">Account Created!</h2>
          <p className="su-pending-sub">Your account is <span className="su-pending-hl">pending admin approval</span>.</p>
          <p className="su-pending-desc">An administrator will review your request and activate your account shortly. You will be able to sign in once approved.</p>
          <div className="su-pending-steps">
            <div className="su-pstep done"><CheckCircle size={15} /><span>Account registered</span></div>
            <div className="su-pstep-line" />
            <div className="su-pstep waiting"><Clock size={15} /><span>Awaiting admin approval</span></div>
            <div className="su-pstep-line" />
            <div className="su-pstep inactive"><CheckCircle size={15} /><span>Access granted</span></div>
          </div>
          <Link to="/login" className="su-pending-btn"><ArrowLeft size={15} /> Back to Sign In</Link>
          <p className="su-pending-copy">© 2026 V-MAS. All rights reserved.</p>
        </div>
      </div>
    );
  }

  /* ── SIGN UP FORM ── */
  return (
    <div className="su-container">

      {/* LEFT */}
      <div className="su-left">
        <p className="su-left-tagline">Vehicle fleet management — simplified.</p>
        <div className="su-left-hero">
          <h1 className="su-left-headline">Start your<br />fleet journey</h1>
          <p className="su-left-sub">Join the platform trusted by fleet operators for smarter, safer, and more efficient vehicle management.</p>
        </div>
        <div className="su-left-img-wrap">
          <img src={fleetHero} alt="V-MAS Dashboard" className="su-left-img" />
        </div>
        <p className="su-left-copy">© 2026 V-MAS. All rights reserved.</p>
      </div>

      {/* RIGHT */}
      <div className="su-right">
        {/* Logo row */}
        <div className="su-logo-row">
          <div className="su-logo-box">
            <img src={logo} alt="V-MAS" className="su-logo-img" />
          </div>
          <span className="su-logo-name">V-MAS</span>
          <Link to="/login" className="su-signin-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Sign In
          </Link>
        </div>

        {/* Form */}
        <div className="su-form-wrap">
          <h2 className="su-heading">Create Account</h2>
          <p className="su-sub">Fill in your details to get started</p>

          {error && (
            <div className="su-error"><AlertCircle size={15} />{error}</div>
          )}

          <form onSubmit={handleSubmit} className="su-form" noValidate>

            {/* Username */}
            <div className="su-field">
              <input
                type="text" name="userName" value={formData.userName}
                onChange={handleChange} placeholder="Username"
                className="su-input" required id="reg-username"
                autoComplete="username"
              />
            </div>

            {/* Email */}
            <div className="su-field">
              <input
                type="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="Email address"
                className="su-input" required id="reg-email"
                autoComplete="email"
              />
            </div>

            {/* Password row */}
            <div className="su-row">
              <div className="su-field">
                <div className="su-pw-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Password" className="su-input" required
                    id="reg-password" autoComplete="new-password"
                  />
                  <button type="button" className="su-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="su-strength">
                    <div className="su-strength-bars">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className="su-strength-bar"
                          style={{ background: n <= passwordStrength ? strengthColor[passwordStrength] : '#ebebeb' }} />
                      ))}
                    </div>
                    <span style={{ color: strengthColor[passwordStrength], fontSize: '0.72rem', fontWeight: 600 }}>
                      {strengthLabel[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="su-field">
                <div className="su-pw-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Confirm password" className="su-input" required
                    id="reg-confirm-password" autoComplete="new-password"
                  />
                  <button type="button" className="su-pw-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <div className="su-match-hint">
                    {formData.password === formData.confirmPassword
                      ? <><CheckCircle size={11} color="#22c55e" /><span style={{color:'#22c55e'}}>Passwords match</span></>
                      : <><AlertCircle size={11} color="#ef4444" /><span style={{color:'#ef4444'}}>Passwords do not match</span></>}
                  </div>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="su-field">
              <div className="su-select-wrap">
                <span className="su-select-icon">{roleIcons[formData.role]}</span>
                <select name="role" value={formData.role} onChange={handleChange} className="su-select" id="reg-role">
                  <option value="DRIVER">Driver</option>
                  <option value="CONTROLLER">Controller</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronDown size={15} className="su-select-caret" />
              </div>
            </div>

            {/* Info banner */}
            <div className="su-info-banner">
              <Clock size={13} />
              <span>New accounts require <strong>admin approval</strong> before you can sign in.</span>
            </div>

            {/* Submit */}
            <button type="submit" className="su-submit-btn" disabled={loading} id="reg-submit">
              <UserPlus size={16} />
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="su-footer">
          <span>© 2026 V-MAS</span>
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
