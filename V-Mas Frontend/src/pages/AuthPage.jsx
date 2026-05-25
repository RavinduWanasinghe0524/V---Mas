import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, User, Lock, LogIn, AlertCircle, UserPlus, Car, Settings,
  Users, CheckCircle, ChevronDown, Clock, ArrowLeft, Mail
} from 'lucide-react';
import logo from '../assets/logo.png';
import loginBg from '../assets/login-bg.jpg';
import './AuthPage.css';

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */
const S_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const S_COLOR = ['', '#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399'];
const calcStr = (v) => {
  let s = 0;
  if (v.length >= 6)          s++;
  if (v.length >= 10)         s++;
  if (/[A-Z]/.test(v))        s++;
  if (/[0-9]/.test(v))        s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
};
const ROLE_ICONS = {
  DRIVER: <Car size={13} />, CONTROLLER: <Settings size={13} />, ADMIN: <Users size={13} />,
};

/* ─────────────────────────────────────────────────────
   LOGIN SLIDE
───────────────────────────────────────────────────── */
const LoginSlide = ({ onSwitch, isActive }) => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => { if (!isActive) setError(''); }, [isActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(userName, password);
    if (result.success) { navigate('/dashboard'); }
    else { setError(result.error || 'Invalid username or password'); }
    setLoading(false);
  };

  return (
    <div className="ag-slide" aria-hidden={!isActive}>
      <h2 className="ag-title">Login</h2>

      {error && (
        <div className="ag-error" role="alert">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="ag-form" noValidate>
        {/* Username */}
        <div className="ag-field">
          <input
            id="login-username"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Username"
            className="ag-input"
            required
            autoComplete="username"
            tabIndex={isActive ? 0 : -1}
          />
          <User size={16} className="ag-field-icon" />
        </div>

        {/* Password */}
        <div className="ag-field">
          <input
            id="login-password"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="ag-input"
            required
            autoComplete="current-password"
            tabIndex={isActive ? 0 : -1}
          />
          <button
            type="button"
            className="ag-field-icon ag-field-btn"
            onClick={() => setShowPw(!showPw)}
            tabIndex={-1}
          >
            {showPw ? <EyeOff size={16} /> : <Lock size={16} />}
          </button>
        </div>

        {/* Options row */}
        <div className="ag-options">
          <label className="ag-remember" onClick={() => setRemember(!remember)}>
            <div className={`ag-checkbox ${remember ? 'ag-checkbox--on' : ''}`}>
              {remember && <div className="ag-checkbox-dot" />}
            </div>
            <span>Remember me</span>
          </label>
          <a href="#" className="ag-forgot" onClick={(e) => e.preventDefault()}>
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          className="ag-btn"
          disabled={loading}
          id="login-submit"
          tabIndex={isActive ? 0 : -1}
        >
          {loading ? (
            <span className="ag-btn-spinner" />
          ) : (
            <><LogIn size={16} /> Login</>
          )}
        </button>
      </form>

      <p className="ag-switch">
        Don't have an account?{' '}
        <button type="button" className="ag-switch-btn" onClick={onSwitch} tabIndex={isActive ? 0 : -1}>
          Register
        </button>
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   SIGNUP SLIDE
───────────────────────────────────────────────────── */
const SignupSlide = ({ onSwitch, isActive }) => {
  const INIT = { userName:'', email:'', password:'', confirmPassword:'', role:'DRIVER', profilePicture:'' };
  const [formData, setFormData]       = useState(INIT);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const [showCf, setShowCf]           = useState(false);
  const [strength, setStrength]       = useState(0);
  const [registered, setRegistered]   = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!isActive) { setError(''); setRegistered(false); } }, [isActive]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (name === 'password') setStrength(calcStr(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6)                   { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { confirmPassword, ...data } = formData;
    if (!data.profilePicture) data.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.userName)}&background=6366f1&color=fff&size=128&bold=true`;
    const result = await register(data);
    if (result.success) { result.pending ? setRegistered(true) : navigate('/dashboard'); }
    else { setError(result.error || 'Registration failed.'); }
    setLoading(false);
  };

  /* Pending screen */
  if (registered) {
    return (
      <div className="ag-slide ag-slide--pending" aria-hidden={!isActive}>
        <div className="ag-pending-ring">
          <div className="ag-pending-pulse" />
          <div className="ag-pending-icon"><Clock size={26} color="#fff" /></div>
        </div>
        <h2 className="ag-title">Account Created!</h2>
        <p className="ag-pending-sub">
          Your account is <span className="ag-pending-hl">pending admin approval</span>.
        </p>
        <p className="ag-pending-desc">An administrator will review your request and activate your account shortly.</p>
        <div className="ag-pending-steps">
          <div className="ag-pstep ag-pstep--done"><CheckCircle size={13} /><span>Registered</span></div>
          <div className="ag-pstep-line" />
          <div className="ag-pstep ag-pstep--wait"><Clock size={13} /><span>Awaiting approval</span></div>
          <div className="ag-pstep-line" />
          <div className="ag-pstep ag-pstep--off"><CheckCircle size={13} /><span>Access granted</span></div>
        </div>
        <button className="ag-btn" onClick={onSwitch} tabIndex={isActive ? 0 : -1}>
          <ArrowLeft size={15} /> Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="ag-slide" aria-hidden={!isActive}>
      <h2 className="ag-title">Create Account</h2>

      {error && (
        <div className="ag-error" role="alert"><AlertCircle size={14} />{error}</div>
      )}

      <form onSubmit={handleSubmit} className="ag-form" noValidate>
        {/* Username */}
        <div className="ag-field">
          <input type="text" name="userName" value={formData.userName}
            onChange={handleChange} placeholder="Enter Name"
            className="ag-input" required id="reg-username"
            autoComplete="username" tabIndex={isActive ? 0 : -1} />
          <User size={16} className="ag-field-icon" />
        </div>

        {/* Email */}
        <div className="ag-field">
          <input type="email" name="email" value={formData.email}
            onChange={handleChange} placeholder="Email address"
            className="ag-input" required id="reg-email"
            autoComplete="email" tabIndex={isActive ? 0 : -1} />
          <Mail size={16} className="ag-field-icon" />
        </div>

        {/* Password */}
        <div className="ag-field">
          <input type={showPw ? 'text' : 'password'} name="password"
            value={formData.password} onChange={handleChange}
            placeholder="Password" className="ag-input" required
            id="reg-password" autoComplete="new-password" tabIndex={isActive ? 0 : -1} />
          <button type="button" className="ag-field-icon ag-field-btn"
            onClick={() => setShowPw(!showPw)} tabIndex={-1}>
            {showPw ? <EyeOff size={16} /> : <Lock size={16} />}
          </button>
        </div>
        {formData.password && (
          <div className="ag-strength">
            {[1,2,3,4,5].map(n => (
              <div key={n} className="ag-strength-bar"
                style={{ background: n <= strength ? S_COLOR[strength] : 'rgba(255,255,255,0.15)' }} />
            ))}
            <span style={{ color: S_COLOR[strength] }}>{S_LABEL[strength]}</span>
          </div>
        )}

        {/* Confirm */}
        <div className="ag-field">
          <input type={showCf ? 'text' : 'password'} name="confirmPassword"
            value={formData.confirmPassword} onChange={handleChange}
            placeholder="Confirm password" className="ag-input" required
            id="reg-confirm" autoComplete="new-password" tabIndex={isActive ? 0 : -1} />
          <button type="button" className="ag-field-icon ag-field-btn"
            onClick={() => setShowCf(!showCf)} tabIndex={-1}>
            {showCf ? <EyeOff size={16} /> : <Lock size={16} />}
          </button>
        </div>
        {formData.confirmPassword && (
          <div className="ag-match">
            {formData.password === formData.confirmPassword
              ? <><CheckCircle size={11} color="#4ade80" /><span style={{color:'#4ade80'}}>Passwords match</span></>
              : <><AlertCircle size={11} color="#f87171" /><span style={{color:'#f87171'}}>Passwords do not match</span></>}
          </div>
        )}

        {/* Role */}
        <div className="ag-field ag-field--select">
          <span className="ag-select-icon">{ROLE_ICONS[formData.role]}</span>
          <select name="role" value={formData.role} onChange={handleChange}
            className="ag-input ag-select" id="reg-role" tabIndex={isActive ? 0 : -1}>
            <option value="DRIVER">Driver</option>
            <option value="CONTROLLER">Controller</option>
            <option value="ADMIN">Admin</option>
          </select>
          <ChevronDown size={14} className="ag-field-icon ag-caret" />
        </div>

        {/* Info */}
        <div className="ag-info-banner">
          <Clock size={12} />
          <span>New accounts require <strong>admin approval</strong> before sign in.</span>
        </div>

        <button type="submit" className="ag-btn" disabled={loading}
          id="reg-submit" tabIndex={isActive ? 0 : -1}>
          {loading ? <span className="ag-btn-spinner" /> : <><UserPlus size={16} /> Create Account</>}
        </button>
      </form>

      <p className="ag-switch">
        Already have an account?{' '}
        <button type="button" className="ag-switch-btn" onClick={onSwitch} tabIndex={isActive ? 0 : -1}>
          Sign In
        </button>
      </p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   MAIN AUTH PAGE
═══════════════════════════════════════════════════ */
const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const isSignup = location.pathname === '/signup';

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const goSignup = useCallback(() => navigate('/signup', { replace: true }), [navigate]);
  const goLogin  = useCallback(() => navigate('/login',  { replace: true }), [navigate]);

  return (
    <div className="ag-container" style={{ backgroundImage: `url(${loginBg})` }}>
      {/* Full-screen dark overlay */}
      <div className="ag-overlay" />

      {/* Glassmorphism card */}
      <div className="ag-card">
        {/* Card header */}
        <div className="ag-card-header">
          <div className="ag-logo-box">
            <img src={logo} alt="V-MAS" className="ag-logo-img" />
          </div>
          <span className="ag-logo-name">V-MAS</span>
        </div>

        {/* Swipe indicator dots */}
        <div className="ag-dots">
          <button
            type="button"
            className={`ag-dot ${!isSignup ? 'ag-dot--on' : ''}`}
            onClick={goLogin}
            aria-label="Go to Login"
          />
          <button
            type="button"
            className={`ag-dot ${isSignup ? 'ag-dot--on' : ''}`}
            onClick={goSignup}
            aria-label="Go to Sign Up"
          />
        </div>

        {/* Swipe track */}
        <div className="ag-track-outer">
          <div className={`ag-track${isSignup ? ' ag-track--signup' : ''}`}>
            <LoginSlide  onSwitch={goSignup} isActive={!isSignup} />
            <SignupSlide onSwitch={goLogin}  isActive={isSignup}  />
          </div>
        </div>
      </div>

      {/* Footer below card */}
      <p className="ag-page-footer">© 2026 V-MAS Fleet Management. All rights reserved.</p>
    </div>
  );
};

export default AuthPage;
