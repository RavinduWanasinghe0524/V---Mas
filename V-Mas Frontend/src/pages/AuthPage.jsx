import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Eye, EyeOff, User, Lock, LogIn, AlertCircle, UserPlus, Car, Settings,
  Users, CheckCircle, ChevronDown, Clock, ArrowLeft, Mail, Sun, Moon
} from 'lucide-react';
import logo from '../assets/V-MAS Logo.svg';
import loginBg from '../assets/login-bg-opt.jpg';
import loginBgWhite from '../assets/Login bg image (White)-opt.jpg';
import './AuthPage.css';

/* ─────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────── */
const S_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const S_COLOR = ['', '#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399'];
const calcStr = (v) => {
  let s = 0;
  if (v.length >= 6) s++;
  if (v.length >= 10) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
};
const ROLE_ICONS = {
  DRIVER: <Car size={13} />, CONTROLLER: <Settings size={13} />, ADMIN: <Users size={13} />,
};

/* ─────────────────────────────────────────────────────
   REUSABLE PREMIUM MODERN INPUT FIELD
   ───────────────────────────────────────────────────── */
const ModernInput = ({
  id,
  type,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  autoComplete,
  tabIndex,
  name,
  disabled = false,
  icon,
  rightElement
}) => {
  return (
    <div className="modern-form-group">
      {label && <label htmlFor={id} className="modern-form-lbl">{label}</label>}
      <div className="modern-input-wrap">
        {icon && <span className="modern-input-ico">{icon}</span>}
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
          className={`modern-form-input ${icon ? 'modern-form-input--has-icon' : ''}`}
        />
        {rightElement}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   REUSABLE PREMIUM MODERN SELECT FIELD
   ───────────────────────────────────────────────────── */
const ModernSelect = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  label,
  tabIndex,
  leftIcon,
  children
}) => {
  return (
    <div className="modern-form-group">
      {label && <label htmlFor={id} className="modern-form-lbl">{label}</label>}
      <div className="modern-input-wrap">
        {leftIcon && <span className="modern-input-ico">{leftIcon}</span>}
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          tabIndex={tabIndex}
          className={`modern-form-input modern-select ${leftIcon ? 'modern-form-input--has-icon' : ''}`}
        >
          {children}
        </select>
        <ChevronDown size={14} className="modern-caret" />
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      <h2 className="ag-welcome-title">Welcome back</h2>
      <p className="ag-welcome-sub">Sign in to access your V-MAS dashboard</p>

      {/* System Status Badge */}
      <div className="ag-slide-status-bar">
        <div className="ag-slide-status-dot"></div>
        <span className="ag-slide-status-txt">ALL SYSTEMS OPERATIONAL</span>
      </div>

      {error && (
        <div className="ag-error" role="alert">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="ag-form" noValidate>
        {/* Username / Email */}
        <ModernInput
          id="login-username"
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="your username or email"
          label="EMAIL ADDRESS / USERNAME"
          required
          autoComplete="username"
          tabIndex={isActive ? 0 : -1}
          icon={<Mail size={15} />}
        />

        {/* Password */}
        <ModernInput
          id="login-password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          label="PASSWORD"
          required
          autoComplete="current-password"
          tabIndex={isActive ? 0 : -1}
          icon={<Lock size={15} />}
          rightElement={
            <button
              type="button"
              className="modern-field-btn"
              onClick={() => setShowPw(!showPw)}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
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
          className="ag-btn ag-btn-submit"
          disabled={loading}
          id="login-submit"
          tabIndex={isActive ? 0 : -1}
        >
          {loading ? (
            <span className="ag-btn-spinner" />
          ) : (
            <><LogIn size={16} /> Sign In</>
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
  const INIT = { userName: '', email: '', password: '', confirmPassword: '', role: 'DRIVER', profilePicture: '' };
  const [formData, setFormData] = useState(INIT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [strength, setStrength] = useState(0);
  const [registered, setRegistered] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!isActive) { setError(''); setRegistered(false); } }, [isActive]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (name === 'password') setStrength(calcStr(value));
  };

  const handleRoleChange = (role) => {
    setFormData(p => ({ ...p, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
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
      <h2 className="ag-welcome-title" style={{ marginBottom: '0.4rem' }}>Create Account</h2>
      <p className="ag-welcome-sub" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Fill in your details to get started</p>

      {/* System Status Badge */}
      <div className="ag-slide-status-bar">
        <div className="ag-slide-status-dot"></div>
        <span className="ag-slide-status-txt">ALL SYSTEMS OPERATIONAL</span>
      </div>

      {error && (
        <div className="ag-error" role="alert"><AlertCircle size={14} />{error}</div>
      )}

      <form onSubmit={handleSubmit} className="ag-form" noValidate>
        {/* Username */}
        <ModernInput
          id="reg-username"
          type="text"
          name="userName"
          value={formData.userName}
          onChange={handleChange}
          placeholder="Username"
          label="NAME / USERNAME"
          required
          autoComplete="username"
          tabIndex={isActive ? 0 : -1}
          icon={<User size={15} />}
        />

        {/* Email */}
        <ModernInput
          id="reg-email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="email@example.com"
          label="EMAIL ADDRESS"
          required
          autoComplete="email"
          tabIndex={isActive ? 0 : -1}
          icon={<Mail size={15} />}
        />

        {/* Password and Confirm row */}
        <div className="ag-form-row" style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <ModernInput
              id="reg-password"
              type={showPw ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              label="PASSWORD"
              required
              autoComplete="new-password"
              tabIndex={isActive ? 0 : -1}
              icon={<Lock size={15} />}
              rightElement={
                <button type="button" className="modern-field-btn"
                  onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <ModernInput
              id="reg-confirm"
              type={showCf ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm"
              label="CONFIRM PASSWORD"
              required
              autoComplete="new-password"
              tabIndex={isActive ? 0 : -1}
              icon={<Lock size={15} />}
              rightElement={
                <button type="button" className="modern-field-btn"
                  onClick={() => setShowCf(!showCf)} tabIndex={-1}>
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
          </div>
        </div>

        {formData.password && (
          <div className="ag-strength" style={{ marginTop: '-4px' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="ag-strength-bar"
                style={{ background: n <= strength ? S_COLOR[strength] : 'rgba(255,255,255,0.12)' }} />
            ))}
            <span style={{ color: S_COLOR[strength] }}>{S_LABEL[strength]}</span>
          </div>
        )}

        {formData.confirmPassword && (
          <div className="ag-match" style={{ marginTop: '-4px' }}>
            {formData.password === formData.confirmPassword
              ? <><CheckCircle size={11} color="#4ade80" /><span style={{ color: '#4ade80' }}>Passwords match</span></>
              : <><AlertCircle size={11} color="#f87171" /><span style={{ color: '#f87171' }}>Passwords do not match</span></>}
          </div>
        )}

        {/* Role */}
        <div className="modern-form-group">
          <label className="modern-form-lbl">SELECT ROLE</label>
          <div className="modern-role-wrap" role="group" aria-label="Select your role" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`modern-role-btn ${formData.role === 'ADMIN' ? 'active' : ''}`}
              onClick={() => handleRoleChange('ADMIN')}
              tabIndex={isActive ? 0 : -1}
            >
              <Users size={13} /> Admin
            </button>
            <button
              type="button"
              className={`modern-role-btn ${formData.role === 'DRIVER' ? 'active' : ''}`}
              onClick={() => handleRoleChange('DRIVER')}
              tabIndex={isActive ? 0 : -1}
            >
              <Car size={13} /> Driver
            </button>
            <button
              type="button"
              className={`modern-role-btn ${formData.role === 'CONTROLLER' ? 'active' : ''}`}
              onClick={() => handleRoleChange('CONTROLLER')}
              tabIndex={isActive ? 0 : -1}
            >
              <Settings size={13} /> Controller
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="ag-info-banner" style={{ margin: '2px 0' }}>
          <Clock size={12} />
          <span>New accounts require <strong>admin approval</strong> before sign in.</span>
        </div>

        <button type="submit" className="ag-btn ag-btn-submit" disabled={loading}
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
      <h2 className="ag-welcome-title" style={{ marginBottom: '0.4rem' }}>Reset Password</h2>
      <p className="ag-welcome-sub" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Enter your registered email address and we'll send you instructions to reset your password.
      </p>

      {/* System Status Badge */}
      <div className="ag-slide-status-bar">
        <div className="ag-slide-status-dot"></div>
        <span className="ag-slide-status-txt">ALL SYSTEMS OPERATIONAL</span>
      </div>

      {error && (
        <div className="ag-error" role="alert">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="ag-form" noValidate>
        <ModernInput
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          label="EMAIL ADDRESS"
          required
          autoComplete="email"
          tabIndex={isActive ? 0 : -1}
          icon={<Mail size={15} />}
        />

        <button
          type="submit"
          className="ag-btn ag-btn-submit"
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

  const canvasRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Reset forgot state whenever pathname transitions
    setIsForgot(false);
  }, [location.pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    let animationFrameId;

    const isLight = themeMode === 'day';
    const BG_COLOR = isLight ? '#F4F7FC' : '#04091A';
    const GRID_COLOR = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.028)';
    const ROAD_BG = isLight ? '#E3EAF5' : '#0A152A';
    const LANE_COLOR = isLight ? 'rgba(37, 99, 235, 0.2)' : 'rgba(29, 94, 248, 0.18)';
    const INTERSECTION_GLOW = isLight ? 'rgba(37, 99, 235, 0.5)' : 'rgba(0, 200, 248, 0.6)';
    const INTERSECTION_OFF = isLight ? 'rgba(37, 99, 235, 0.15)' : 'rgba(29, 94, 248, 0.25)';
    const INTERSECTION_COLOR = isLight ? '#2563EB' : '#00C8F8';

    const RH = [0.12, 0.26, 0.40, 0.54, 0.68, 0.82, 0.92];
    const RV = [0.10, 0.22, 0.38, 0.55, 0.70, 0.84, 0.94];

    const BLUE = isLight ? '#2563EB' : '#1D5EF8';
    const CYAN = isLight ? '#0284C7' : '#00C8F8';
    const AMB = isLight ? '#D97706' : '#F59E0B';

    /* pre-compute glowing intersections */
    const GLOW_SET = new Set();
    RH.forEach(ry => RV.forEach(rx => {
      if (Math.random() > 0.55) GLOW_SET.add(`${rx},${ry}`);
    }));

    let cityBlocks = [];

    function generateCityBlocks() {
      cityBlocks = [];
      const roadW = 16;
      const roadH = 22;
      const cols = [0, ...RV, 1];
      const rows = [0, ...RH, 1];

      for (let i = 0; i < cols.length - 1; i++) {
        for (let j = 0; j < rows.length - 1; j++) {
          const x1 = cols[i] * W + (i === 0 ? 0 : roadW / 2 + 4);
          const x2 = cols[i+1] * W - (i+1 === cols.length - 1 ? 0 : roadW / 2 + 4);
          const y1 = rows[j] * H + (j === 0 ? 0 : roadH / 2 + 4);
          const y2 = rows[j+1] * H - (j+1 === rows.length - 1 ? 0 : roadH / 2 + 4);

          const blockW = x2 - x1;
          const blockH = y2 - y1;

          if (blockW > 12 && blockH > 12) {
            const buildings = [];
            const isPark = Math.random() > 0.85;

            if (isPark) {
              buildings.push({
                type: 'park',
                x: x1 + 2,
                y: y1 + 2,
                w: blockW - 4,
                h: blockH - 4
              });
            } else {
              const subdivideX = blockW > 45 && Math.random() > 0.45;
              const subdivideY = blockH > 45 && Math.random() > 0.45;
              const numX = subdivideX ? 2 : 1;
              const numY = subdivideY ? 2 : 1;

              const bW = (blockW - (numX + 1) * 3) / numX;
              const bH = (blockH - (numY + 1) * 3) / numY;

              for (let bx = 0; bx < numX; bx++) {
                for (let by = 0; by < numY; by++) {
                  const padding = 3;
                  const bxCoord = x1 + padding + bx * (bW + padding);
                  const byCoord = y1 + padding + by * (bH + padding);
                  const randW = bW * (0.85 + Math.random() * 0.15);
                  const randH = bH * (0.85 + Math.random() * 0.15);

                  buildings.push({
                    type: 'building',
                    x: bxCoord,
                    y: byCoord,
                    w: randW,
                    h: randH,
                    windows: Math.random() > 0.35
                  });
                }
              }
            }
            cityBlocks.push({ buildings });
          }
        }
      }
    }

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      generateCityBlocks();
    }
    resize();

    const vehicles = [];
    const MAX_V = 35;

    class Vehicle {
      constructor() { this.init() }
      init() {
        const h = Math.random() > 0.48;
        this.isH = h;
        if (h) {
          this.road = RH[Math.floor(Math.random() * RH.length)];
          this.dir = Math.random() > 0.5 ? 1 : -1;
          this.pos = this.dir > 0 ? -0.04 : 1.04;
          this.lane = this.road + (Math.random() * 0.014 - 0.007);
        } else {
          this.road = RV[Math.floor(Math.random() * RV.length)];
          this.dir = Math.random() > 0.5 ? 1 : -1;
          this.pos = this.dir > 0 ? -0.04 : 1.04;
          this.lane = this.road + (Math.random() * 0.01 - 0.005);
        }
        this.spd = (0.00065 + Math.random() * 0.0011) * this.dir;
        const r = Math.random();
        this.col = r < 0.5 ? BLUE : r < 0.8 ? CYAN : AMB;
        this.len = 0.022 + Math.random() * 0.018;
        this.alive = true;
      }
      update() {
        this.pos += this.spd;
        if ((this.dir > 0 && this.pos > 1.08) || (this.dir < 0 && this.pos < -0.08)) this.alive = false;
      }
      draw() {
        const x = this.isH ? this.pos * W : this.lane * W;
        const y = this.isH ? this.lane * H : this.pos * H;

        ctx.save();
        ctx.translate(x, y);
        
        // Rotate vehicle local axis to match direction
        if (this.isH) {
          if (this.dir < 0) ctx.rotate(Math.PI);
        } else {
          if (this.dir > 0) ctx.rotate(Math.PI / 2);
          else ctx.rotate(-Math.PI / 2);
        }

        // Draw local vehicle silhouette
        const w = 18 + Math.random() * 6; // length (local x)
        const h = 8; // width (local y)

        // Glow chassis
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.col;
        ctx.fillStyle = this.col;
        ctx.globalAlpha = 0.92;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 2, -h / 2, w, h, 2.5);
        } else {
          ctx.rect(-w / 2, -h / 2, w, h);
        }
        ctx.fill();

        // Windshield cabin
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(4, 9, 26, 0.75)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 6, -h * 0.35, w * 0.4, h * 0.7, 1.5);
        } else {
          ctx.rect(-w / 6, -h * 0.35, w * 0.4, h * 0.7);
        }
        ctx.fill();

        // Headlights (white/yellow circles at the front-right)
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w / 2, -h * 0.25, 1.2, 0, Math.PI * 2);
        ctx.arc(w / 2, h * 0.25, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Headlight beams
        const gradient = ctx.createRadialGradient(w / 2, 0, 1, w / 2 + 18, 0, 18);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(w / 2, -h * 0.25);
        ctx.lineTo(w / 2 + 18, -h * 0.5);
        ctx.lineTo(w / 2 + 18, h * 0.5);
        ctx.lineTo(w / 2, h * 0.25);
        ctx.closePath();
        ctx.fill();

        // Red taillights (rear-left)
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-w / 2, -h * 0.25, 1.0, 0, Math.PI * 2);
        ctx.arc(-w / 2, h * 0.25, 1.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    function buildVehicles() {
      vehicles.length = 0;
      for (let i = 0; i < MAX_V; i++) {
        const v = new Vehicle();
        v.pos = Math.random();
        vehicles.push(v);
      }
    }
    buildVehicles();

    function resizeHandler() {
      resize();
      buildVehicles();
    }
    window.addEventListener('resize', resizeHandler);

    function drawBg() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      // subtle dot grid
      ctx.fillStyle = GRID_COLOR;
      const gs = W / 28;
      for (let x = gs; x < W; x += gs) {
        for (let y = gs; y < H; y += gs) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Draw City Blocks
      cityBlocks.forEach(block => {
        block.buildings.forEach(b => {
          if (b.type === 'park') {
            ctx.fillStyle = isLight ? 'rgba(34, 197, 94, 0.08)' : 'rgba(16, 185, 129, 0.06)';
            ctx.strokeStyle = isLight ? 'rgba(34, 197, 94, 0.18)' : 'rgba(16, 185, 129, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 4);
            else ctx.rect(b.x, b.y, b.w, b.h);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.035)' : 'rgba(255, 255, 255, 0.015)';
            ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 3);
            else ctx.rect(b.x, b.y, b.w, b.h);
            ctx.fill();
            ctx.stroke();

            if (b.windows && b.w > 15 && b.h > 15) {
              ctx.fillStyle = isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(0, 200, 248, 0.08)';
              const winSize = 1.5;
              const spacing = 4;
              for (let wx = b.x + 3; wx < b.x + b.w - 3; wx += spacing) {
                for (let wy = b.y + 3; wy < b.y + b.h - 3; wy += spacing) {
                  ctx.fillRect(wx, wy, winSize, winSize);
                }
              }
            }
          }
        });
      });

      // road bands
      ctx.fillStyle = ROAD_BG;
      RH.forEach(ry => { ctx.fillRect(0, ry * H - 11, W, 22) });
      RV.forEach(rx => { ctx.fillRect(rx * W - 8, 0, 16, H) });

      // road lane lines
      ctx.setLineDash([8, 12]); ctx.lineWidth = 0.8; ctx.strokeStyle = LANE_COLOR;
      RH.forEach(ry => { ctx.beginPath(); ctx.moveTo(0, ry * H); ctx.lineTo(W, ry * H); ctx.stroke() });
      RV.forEach(rx => { ctx.beginPath(); ctx.moveTo(rx * W, 0); ctx.lineTo(rx * W, H); ctx.stroke() });
      ctx.setLineDash([]);

      // intersection nodes
      RH.forEach(ry => RV.forEach(rx => {
        const key = `${rx},${ry}`;
        if (GLOW_SET.has(key)) {
          ctx.save();
          ctx.shadowBlur = 16; ctx.shadowColor = INTERSECTION_COLOR;
          ctx.fillStyle = INTERSECTION_GLOW;
          ctx.beginPath(); ctx.arc(rx * W, ry * H, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = INTERSECTION_OFF;
          ctx.beginPath(); ctx.arc(rx * W, ry * H, 2, 0, Math.PI * 2); ctx.fill();
        }
      }));
    }

    function animate() {
      drawBg();
      vehicles.forEach((v, i) => {
        v.update();
        v.draw();
        if (!v.alive) {
          vehicles.splice(i, 1);
          vehicles.push(new Vehicle());
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener('resize', resizeHandler);
      cancelAnimationFrame(animationFrameId);
    };
  }, [themeMode]);

  const goSignup = useCallback(() => navigate('/signup', { replace: true }), [navigate]);
  const goLogin = useCallback(() => navigate('/login', { replace: true }), [navigate]);

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
    <div className={`ag-container${themeMode === 'day' ? ' theme-light' : ''}`} onMouseMove={handleMouseMove}>
      
      {/* ── LEFT PANEL ── */}
      <div className="ag-panel-left">
        <canvas ref={canvasRef} className="ag-road-canvas" />
        <div className="ag-left-overlay">
          <div className="ag-brand">
            <div className="ag-brand-mark">
              <img src={logo} alt="V-MAS Logo" className="ag-logo-img" />
            </div>
            
          </div>

          <div className="ag-hero">
            <div className="ag-hero-eyebrow">Fleet Intelligence Platform</div>
            <h1 className="ag-hero-headline">
              Smart Fleet.<br/><em>Smarter</em> Decisions.
            </h1>
            <p className="ag-hero-sub">
              Real-time vehicle monitoring, proactive maintenance alerts, and driver operations — all from one unified dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="ag-panel-right">
        {/* Floating Day/Night Theme Switcher */}
        <div className="ag-theme-toggle-container">
          <div
            className={`ag-theme-pill ${themeMode === 'day' ? 'ag-theme-pill--day' : 'ag-theme-pill--night'}`}
            onClick={() => handleThemeChange(themeMode === 'day' ? 'night' : 'day')}
            title={themeMode === 'day' ? 'Switch to Night Theme' : 'Switch to Day Theme'}
          >
            <div className="ag-theme-knob">
              {themeMode === 'day' ? <Sun size={14} color="#2563eb" /> : <Moon size={14} color="#3b82f6" />}
            </div>
            <div className="ag-theme-icon-placeholder ag-theme-icon-left">
              <Moon size={13} />
            </div>
            <div className="ag-theme-icon-placeholder ag-theme-icon-right">
              <Sun size={13} />
            </div>
          </div>
        </div>



        {/* Glassmorphism card */}
        <div className="ag-card">
          {/* Swipe track */}
          <div className="ag-track-outer">
            <div className={`ag-track${getTrackClass()}`}>
              <LoginSlide onSwitch={goSignup} onForgot={() => setIsForgot(true)} isActive={!isSignup && !isForgot} />
              <SignupSlide onSwitch={goLogin} isActive={isSignup} />
              <ForgotSlide onSwitch={() => { setIsForgot(false); goLogin(); }} isActive={isForgot} />
            </div>
          </div>
        </div>

        {/* Footer below card */}
        <p className="ag-page-footer">© 2026 V-MAS Fleet Management. All rights reserved.</p>
      </div>

    </div>
  );
};

export default AuthPage;
