import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Eye, EyeOff, User, Lock, LogIn, AlertCircle, UserPlus, Car, Settings,
  Users, CheckCircle, ChevronDown, Clock, ArrowLeft, Mail, Sun, Moon
} from 'lucide-react';
import logo from '../assets/logo.png';
import loginBg from '../assets/login-bg.jpg';
import loginBgWhite from '../assets/Login bg image (White).png';
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
   REUSABLE PREMIUM FLOATING INPUT FIELD
   ───────────────────────────────────────────────────── */
const FloatingInput = ({
  id,
  type,
  value,
  onChange,
  placeholder,
  required = false,
  autoComplete,
  tabIndex,
  name,
  disabled = false,
  icon,
  rightElement
}) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || (value !== undefined && value !== null && value !== '');

  return (
    <div className={`ag-field ${isActive ? 'ag-field--active' : ''} ${icon ? '' : 'ag-field--no-icon'}`}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        tabIndex={tabIndex}
        disabled={disabled}
        className="ag-input"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <label htmlFor={id} className="ag-floating-label">
        {placeholder}
      </label>
      {icon && <span className="ag-field-icon">{icon}</span>}
      {rightElement}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   REUSABLE PREMIUM FLOATING SELECT FIELD
   ───────────────────────────────────────────────────── */
const FloatingSelect = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  tabIndex,
  leftIcon,
  children
}) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value !== '';

  return (
    <div className={`ag-field ag-field--select ${isActive ? 'ag-field--active' : ''}`}>
      {leftIcon && <span className="ag-select-icon">{leftIcon}</span>}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        tabIndex={tabIndex}
        className="ag-input ag-select"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {children}
      </select>
      <label htmlFor={id} className="ag-floating-label">
        {placeholder}
      </label>
      <ChevronDown size={14} className="ag-field-icon ag-caret" />
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   QUICK DEMO DRAWER
   ───────────────────────────────────────────────────── */
const DemoDrawer = ({ onPopulate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const demoAccounts = [
    { name: 'Admin', role: 'ADMIN', user: 'admin', pass: 'admin123', icon: <Users size={14} /> },
    { name: 'Controller', role: 'CONTROLLER', user: 'controller1', pass: 'controller123', icon: <Settings size={14} /> },
    { name: 'Driver', role: 'DRIVER', user: 'driver1', pass: 'driver123', icon: <Car size={14} /> },
  ];

  return (
    <div className={`ag-demo-drawer ${isOpen ? 'ag-demo-drawer--open' : ''}`}>
      <div className="ag-demo-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="ag-demo-header-title">
          <AlertCircle size={13} style={{ color: '#60a5fa' }} />
          Quick-Demo Credentials
        </span>
        <ChevronDown size={14} className="ag-demo-caret" />
      </div>
      <div className="ag-demo-content">
        <div className="ag-demo-grid">
          {demoAccounts.map((acc, idx) => (
            <button
              key={idx}
              type="button"
              className="ag-demo-btn"
              onClick={() => onPopulate(acc.user, acc.pass)}
            >
              <span className="ag-demo-btn-icon">{acc.icon}</span>
              <span className="ag-demo-btn-name">{acc.name}</span>
              <span className="ag-demo-btn-role">{acc.user}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   LOGIN SLIDE
   ───────────────────────────────────────────────────── */
const LoginSlide = ({ onSwitch, onForgot, isActive }) => {
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

  const handleDemoLogin = async (user, pass) => {
    setUserName(user);
    setPassword(pass);
    setError('');
    setLoading(true);
    const result = await login(user, pass);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials');
    }
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
        <FloatingInput
          id="login-username"
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Username"
          required
          autoComplete="username"
          tabIndex={isActive ? 0 : -1}
          icon={<User size={16} />}
        />

        {/* Password */}
        <FloatingInput
          id="login-password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoComplete="current-password"
          tabIndex={isActive ? 0 : -1}
          rightElement={
            <button
              type="button"
              className="ag-field-icon ag-field-btn"
              onClick={() => setShowPw(!showPw)}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Lock size={16} />}
            </button>
          }
        />

        {/* Options row */}
        <div className="ag-options">
          <label className="ag-remember" onClick={() => setRemember(!remember)}>
            <div className={`ag-checkbox ${remember ? 'ag-checkbox--on' : ''}`}>
              {remember && <div className="ag-checkbox-dot" />}
            </div>
            <span>Remember me</span>
          </label>
          <button type="button" className="ag-forgot ag-field-btn" onClick={onForgot} tabIndex={isActive ? 0 : -1}>
            Forgot password?
          </button>
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

      {/* Demo Account drawer toggle */}
      <DemoDrawer onPopulate={handleDemoLogin} />
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
    if (!data.profilePicture) data.profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.userName)}&background=2563eb&color=fff&size=128&bold=true`;
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
        <FloatingInput
          id="reg-username"
          type="text"
          name="userName"
          value={formData.userName}
          onChange={handleChange}
          placeholder="Enter Name"
          required
          autoComplete="username"
          tabIndex={isActive ? 0 : -1}
          icon={<User size={16} />}
        />

        {/* Email */}
        <FloatingInput
          id="reg-email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email address"
          required
          autoComplete="email"
          tabIndex={isActive ? 0 : -1}
          icon={<Mail size={16} />}
        />

        {/* Password */}
        <FloatingInput
          id="reg-password"
          type={showPw ? 'text' : 'password'}
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
          autoComplete="new-password"
          tabIndex={isActive ? 0 : -1}
          rightElement={
            <button type="button" className="ag-field-icon ag-field-btn"
              onClick={() => setShowPw(!showPw)} tabIndex={-1}>
              {showPw ? <EyeOff size={16} /> : <Lock size={16} />}
            </button>
          }
        />
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
        <FloatingInput
          id="reg-confirm"
          type={showCf ? 'text' : 'password'}
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm password"
          required
          autoComplete="new-password"
          tabIndex={isActive ? 0 : -1}
          rightElement={
            <button type="button" className="ag-field-icon ag-field-btn"
              onClick={() => setShowCf(!showCf)} tabIndex={-1}>
              {showCf ? <EyeOff size={16} /> : <Lock size={16} />}
            </button>
          }
        />
        {formData.confirmPassword && (
          <div className="ag-match">
            {formData.password === formData.confirmPassword
              ? <><CheckCircle size={11} color="#4ade80" /><span style={{color:'#4ade80'}}>Passwords match</span></>
              : <><AlertCircle size={11} color="#f87171" /><span style={{color:'#f87171'}}>Passwords do not match</span></>}
          </div>
        )}

        {/* Role */}
        <FloatingSelect
          id="reg-role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          placeholder="Role"
          tabIndex={isActive ? 0 : -1}
          leftIcon={ROLE_ICONS[formData.role]}
        >
          <option value="DRIVER">Driver</option>
          <option value="CONTROLLER">Controller</option>
          <option value="ADMIN">Admin</option>
        </FloatingSelect>

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

/* ─────────────────────────────────────────────────────
   FORGOT PASSWORD SLIDE
   ───────────────────────────────────────────────────── */
const ForgotSlide = ({ onSwitch, isActive }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setError('');
      setSuccess(false);
      setEmail('');
    }
  }, [isActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    // Simulate sending recovery email beautifully
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="ag-slide ag-slide--pending" aria-hidden={!isActive}>
        <div className="ag-pending-ring">
          <div className="ag-pending-pulse" />
          <div className="ag-pending-icon"><CheckCircle size={26} color="#fff" /></div>
        </div>
        <h2 className="ag-title">Reset Link Sent!</h2>
        <p className="ag-pending-sub">
          Check your email at <span className="ag-pending-hl">{email}</span>
        </p>
        <p className="ag-pending-desc" style={{ marginBottom: '1.8rem' }}>
          We have sent password recovery instructions. If you do not see it soon, check your spam or junk folder.
        </p>
        <button className="ag-btn" onClick={onSwitch} tabIndex={isActive ? 0 : -1}>
          <ArrowLeft size={15} /> Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="ag-slide" aria-hidden={!isActive}>
      <h2 className="ag-title">Reset Password</h2>
      <p className="ag-pending-desc" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        Enter your registered email address and we'll send you instructions to reset your password.
      </p>

      {error && (
        <div className="ag-error" role="alert">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="ag-form" noValidate>
        <FloatingInput
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          autoComplete="email"
          tabIndex={isActive ? 0 : -1}
          icon={<Mail size={16} />}
        />

        <button
          type="submit"
          className="ag-btn"
          disabled={loading}
          id="forgot-submit"
          tabIndex={isActive ? 0 : -1}
        >
          {loading ? (
            <span className="ag-btn-spinner" />
          ) : (
            <>Send Reset Link</>
          )}
        </button>
      </form>

      <p className="ag-switch">
        Remember your password?{' '}
        <button type="button" className="ag-switch-btn" onClick={onSwitch} tabIndex={isActive ? 0 : -1}>
          Sign In
        </button>
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   MAIN AUTH PAGE
   ───────────────────────────────────────────────────── */
const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Local theme initialized based on global context (Day is light, Night is blue/dark)
  const [themeMode, setThemeModeState] = useState(theme === 'light' ? 'day' : 'night');
  const [isForgot, setIsForgot] = useState(false);
  const isSignup = location.pathname === '/signup';

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Reset forgot state whenever pathname transitions
    setIsForgot(false);
  }, [location.pathname]);

  const goSignup = useCallback(() => navigate('/signup', { replace: true }), [navigate]);
  const goLogin  = useCallback(() => navigate('/login',  { replace: true }), [navigate]);

  const handleThemeChange = (mode) => {
    setThemeModeState(mode);
    if (mode === 'day') {
      setTheme('light');
    } else {
      setTheme('blue');
    }
  };

  // Card cursor glow coordinates calculations
  const handleMouseMove = (e) => {
    const card = e.currentTarget.querySelector('.ag-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const getTrackClass = () => {
    if (isForgot) return ' ag-track--forgot';
    if (isSignup) return ' ag-track--signup';
    return ' ag-track--login';
  };

  return (
    <div className={`ag-container theme-lime${themeMode === 'day' ? ' theme-light' : ''}`} onMouseMove={handleMouseMove}>
      {/* Zoom parallax background element */}
      <div className="ag-container-bg" style={{ backgroundImage: `url("${themeMode === 'day' ? loginBgWhite : loginBg}")` }} />

      {/* Full-screen dark overlay */}
      <div className="ag-overlay" />

      {/* Floating Day/Night Theme Switcher */}
      <div className="ag-theme-toggle-container">
        <div 
          className={`ag-theme-pill ${themeMode === 'day' ? 'ag-theme-pill--day' : 'ag-theme-pill--night'}`}
          onClick={() => handleThemeChange(themeMode === 'day' ? 'night' : 'day')}
          title={themeMode === 'day' ? 'Switch to Night Theme' : 'Switch to Day Theme'}
        >
          <div className="ag-theme-knob">
            {themeMode === 'day' ? <Sun size={14} color="#2563eb" /> : <Moon size={14} color="#84cc16" />}
          </div>
          <div className="ag-theme-icon-placeholder ag-theme-icon-left">
            <Moon size={13} />
          </div>
          <div className="ag-theme-icon-placeholder ag-theme-icon-right">
            <Sun size={13} />
          </div>
        </div>
      </div>

      {/* System Status Badge */}
      <div className="ag-status-badge">
        <span className="ag-status-dot">
          <span className="ag-status-pulse" />
        </span>
        <span>ALL SYSTEMS OPERATIONAL</span>
      </div>

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
            className={`ag-dot ${!isSignup && !isForgot ? 'ag-dot--on' : ''}`}
            onClick={() => { setIsForgot(false); goLogin(); }}
            aria-label="Go to Login"
          />
          <button
            type="button"
            className={`ag-dot ${isSignup ? 'ag-dot--on' : ''}`}
            onClick={() => { setIsForgot(false); goSignup(); }}
            aria-label="Go to Sign Up"
          />
          <button
            type="button"
            className={`ag-dot ${isForgot ? 'ag-dot--on' : ''}`}
            onClick={() => setIsForgot(true)}
            aria-label="Go to Forgot Password"
          />
        </div>

        {/* Swipe track */}
        <div className="ag-track-outer">
          <div className={`ag-track${getTrackClass()}`}>
            <LoginSlide  onSwitch={goSignup} onForgot={() => setIsForgot(true)} isActive={!isSignup && !isForgot} />
            <SignupSlide onSwitch={goLogin}  isActive={isSignup}  />
            <ForgotSlide onSwitch={() => { setIsForgot(false); goLogin(); }} isActive={isForgot} />
          </div>
        </div>
      </div>

      {/* Footer below card */}
      <p className="ag-page-footer">© 2026 V-MAS Fleet Management. All rights reserved.</p>
    </div>
  );
};

export default AuthPage;
