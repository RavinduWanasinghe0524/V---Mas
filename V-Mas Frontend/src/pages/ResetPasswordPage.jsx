import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Eye, EyeOff, Lock, KeyRound, CheckCircle, AlertCircle,
  ArrowLeft, LogIn, Sun, Moon
} from 'lucide-react';
import { getRoleLogo } from '../utils/roleAssets';
import { authAPI } from '../services/api';
import './AuthPage.css';
import './ResetPasswordPage.css';

/* ─────────────────────────────────────────────────────
   HELPERS & STRENGTH CALCULATION
   ───────────────────────────────────────────────────── */
const S_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const S_COLOR = ['', '#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399'];
const calcStr = (v) => {
  let s = 0;
  if (!v) return 0;
  if (v.length >= 6) s++;
  if (v.length >= 10) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
};

/* ─────────────────────────────────────────────────────
   REUSABLE MODERN INPUT FIELD
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
  rightElement,
  autoFocus = false
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
          autoFocus={autoFocus}
          className={`modern-form-input ${icon ? 'modern-form-input--has-icon' : ''}`}
        />
        {rightElement}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   RESET PASSWORD PAGE — MATCHES MODERN AUTH/LOGIN DESIGN
   ═══════════════════════════════════════════════════════════ */
const ResetPasswordPage = () => {
  const [searchParams]                 = useSearchParams();
  const navigate                       = useNavigate();
  const { theme, setTheme }           = useTheme();
  const token                          = searchParams.get('token');

  // Step: 'form' | 'success' | 'error' | 'invalid'
  const [step, setStep]                = useState(token ? 'form' : 'invalid');
  const [newPassword, setNewPassword]  = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]          = useState(false);
  const [showConfirm, setShowConfirm]  = useState(false);
  const [strength, setStrength]        = useState(0);
  const [loading, setLoading]          = useState(false);
  const [fieldErrors, setFieldErrors]  = useState({});
  const [serverError, setServerError]  = useState('');
  const [countdown, setCountdown]      = useState(5);

  // Theme mode: 'day' | 'night'
  const [themeMode, setThemeModeState] = useState(theme === 'light' ? 'day' : 'night');
  const canvasRef = useRef(null);

  // Auto-redirect countdown on success
  useEffect(() => {
    if (step !== 'success') return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate('/login');
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, navigate]);

  // Sync password strength
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setNewPassword(val);
    setStrength(calcStr(val));
    if (fieldErrors.newPassword) {
      setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
    }
  };

  const handleConfirmChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  // Validation
  const validate = () => {
    const errs = {};
    if (!newPassword) {
      errs.newPassword = 'Password is required.';
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    return errs;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await authAPI.resetPassword(token, newPassword);
      setStep('success');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'The reset link has expired or is invalid. Please request a new one.';
      setServerError(msg);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Theme change
  const handleThemeChange = (mode) => {
    setThemeModeState(mode);
    if (mode === 'day') {
      setTheme('light');
    } else {
      setTheme('blue');
    }
  };

  // Card cursor glow
  const handleMouseMove = (e) => {
    const card = e.currentTarget.querySelector('.ag-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  /* ─────────────────────────────────────────────────────
     CANVAS ROAD & CITY ANIMATION (exact match with AuthPage)
     ───────────────────────────────────────────────────── */
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
      constructor() { this.init(); }
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

        if (this.isH) {
          if (this.dir < 0) ctx.rotate(Math.PI);
        } else {
          if (this.dir > 0) ctx.rotate(Math.PI / 2);
          else ctx.rotate(-Math.PI / 2);
        }

        const w = 18 + Math.random() * 6;
        const h = 8;

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

        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(4, 9, 26, 0.75)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 6, -h * 0.35, w * 0.4, h * 0.7, 1.5);
        } else {
          ctx.rect(-w / 6, -h * 0.35, w * 0.4, h * 0.7);
        }
        ctx.fill();

        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w / 2, -h * 0.25, 1.2, 0, Math.PI * 2);
        ctx.arc(w / 2, h * 0.25, 1.2, 0, Math.PI * 2);
        ctx.fill();

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

      ctx.fillStyle = GRID_COLOR;
      const gs = W / 28;
      for (let x = gs; x < W; x += gs) {
        for (let y = gs; y < H; y += gs) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
        }
      }

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

      ctx.fillStyle = ROAD_BG;
      RH.forEach(ry => { ctx.fillRect(0, ry * H - 11, W, 22); });
      RV.forEach(rx => { ctx.fillRect(rx * W - 8, 0, 16, H); });

      ctx.setLineDash([8, 12]); ctx.lineWidth = 0.8; ctx.strokeStyle = LANE_COLOR;
      RH.forEach(ry => { ctx.beginPath(); ctx.moveTo(0, ry * H); ctx.lineTo(W, ry * H); ctx.stroke(); });
      RV.forEach(rx => { ctx.beginPath(); ctx.moveTo(rx * W, 0); ctx.lineTo(rx * W, H); ctx.stroke(); });
      ctx.setLineDash([]);

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

  return (
    <div className={`ag-container${themeMode === 'day' ? ' theme-light' : ''}`} onMouseMove={handleMouseMove}>
      {/* ── LEFT PANEL ── */}
      <div className="ag-panel-left">
        <canvas ref={canvasRef} className="ag-road-canvas" />
        <div className="ag-left-overlay">
          <div className="ag-brand">
            <div className="ag-brand-mark">
              <img src={getRoleLogo()} alt="V-MAS Logo" className="ag-logo-img" />
            </div>
          </div>

          <div className="ag-hero">
            <div className="ag-hero-eyebrow">Fleet Intelligence Platform</div>
            <h1 className="ag-hero-headline">
              Smart Fleet.<br /><em>Smarter</em> Decisions.
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

        {/* Glassmorphism Card */}
        <div className="ag-card">
          <div className="ag-slide" style={{ width: '100%' }}>

            {/* ── STEP: FORM ── */}
            {step === 'form' && (
              <>
                <h2 className="ag-welcome-title">Set new password</h2>
                <p className="ag-welcome-sub">Create a strong new password for your V-MAS account</p>

                {/* System Status Badge */}
                <div className="ag-slide-status-bar">
                  <div className="ag-slide-status-dot"></div>
                  <span className="ag-slide-status-txt">ALL SYSTEMS OPERATIONAL</span>
                </div>

                {serverError && (
                  <div className="ag-error" role="alert">
                    <AlertCircle size={14} />
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="ag-form" noValidate>
                  {/* New Password */}
                  <ModernInput
                    id="rp-new-password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    label="NEW PASSWORD"
                    required
                    autoComplete="new-password"
                    autoFocus
                    icon={<Lock size={15} />}
                    rightElement={
                      <button
                        type="button"
                        className="modern-field-btn"
                        onClick={() => setShowNew(!showNew)}
                        tabIndex={-1}
                        aria-label={showNew ? 'Hide password' : 'Show password'}
                      >
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />
                  {fieldErrors.newPassword && (
                    <div className="rp-field-error-text">
                      <AlertCircle size={12} /> {fieldErrors.newPassword}
                    </div>
                  )}

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="ag-strength" style={{ marginTop: '-4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className="ag-strength-bar"
                          style={{ background: n <= strength ? S_COLOR[strength] : 'rgba(255,255,255,0.12)' }}
                        />
                      ))}
                      <span style={{ color: S_COLOR[strength] }}>{S_LABEL[strength]}</span>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <ModernInput
                    id="rp-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={handleConfirmChange}
                    placeholder="••••••••"
                    label="CONFIRM NEW PASSWORD"
                    required
                    autoComplete="new-password"
                    icon={<Lock size={15} />}
                    rightElement={
                      <button
                        type="button"
                        className="modern-field-btn"
                        onClick={() => setShowConfirm(!showConfirm)}
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />
                  {fieldErrors.confirmPassword && (
                    <div className="rp-field-error-text">
                      <AlertCircle size={12} /> {fieldErrors.confirmPassword}
                    </div>
                  )}

                  {/* Passwords Match Indicator */}
                  {confirmPassword && (
                    <div className="ag-match" style={{ marginTop: '-4px', marginBottom: '4px' }}>
                      {newPassword === confirmPassword ? (
                        <>
                          <CheckCircle size={12} color="#4ade80" />
                          <span style={{ color: '#4ade80' }}>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} color="#f87171" />
                          <span style={{ color: '#f87171' }}>Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="ag-btn ag-btn-submit"
                    disabled={loading}
                    id="rp-submit"
                    style={{ marginTop: '0.6rem' }}
                  >
                    {loading ? (
                      <span className="ag-btn-spinner" />
                    ) : (
                      <>
                        <KeyRound size={16} /> Reset Password
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Sign In */}
                <p className="ag-switch">
                  Remember your password?{' '}
                  <button
                    type="button"
                    className="ag-switch-btn"
                    onClick={() => navigate('/login')}
                  >
                    Sign In
                  </button>
                </p>
              </>
            )}

            {/* ── STEP: SUCCESS ── */}
            {step === 'success' && (
              <div className="ag-slide--pending" style={{ padding: '1rem 0' }}>
                <div className="ag-pending-ring">
                  <div className="ag-pending-pulse" style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.45), transparent)' }} />
                  <div className="ag-pending-icon" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)' }}>
                    <CheckCircle size={26} color="#fff" />
                  </div>
                </div>
                <h2 className="ag-welcome-title" style={{ marginBottom: '0.4rem' }}>Password Reset!</h2>
                <p className="ag-pending-sub" style={{ textAlign: 'center' }}>
                  Your password has been updated successfully.
                </p>
                <p className="ag-pending-desc" style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
                  Redirecting to Sign In in <span className="ag-pending-hl">{countdown}s</span>…
                </p>
                <button
                  type="button"
                  className="ag-btn ag-btn-submit"
                  onClick={() => navigate('/login')}
                  id="rp-success-signin"
                >
                  <LogIn size={16} /> Go to Sign In
                </button>
              </div>
            )}

            {/* ── STEP: ERROR / EXPIRED ── */}
            {step === 'error' && (
              <div className="ag-slide--pending" style={{ padding: '1rem 0' }}>
                <div className="ag-pending-ring">
                  <div className="ag-pending-pulse" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.45), transparent)' }} />
                  <div className="ag-pending-icon" style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)' }}>
                    <AlertCircle size={26} color="#fff" />
                  </div>
                </div>
                <h2 className="ag-welcome-title" style={{ marginBottom: '0.4rem' }}>Link Expired</h2>
                <p className="ag-pending-sub" style={{ textAlign: 'center', color: '#fca5a5' }}>
                  {serverError || 'This reset link has expired or is invalid.'}
                </p>
                <p className="ag-pending-desc" style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
                  Password reset links are valid for a single use and expire after a limited time for security.
                </p>
                <button
                  type="button"
                  className="ag-btn ag-btn-submit"
                  onClick={() => navigate('/login')}
                  id="rp-error-back"
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
              </div>
            )}

            {/* ── STEP: INVALID TOKEN ── */}
            {step === 'invalid' && (
              <div className="ag-slide--pending" style={{ padding: '1rem 0' }}>
                <div className="ag-pending-ring">
                  <div className="ag-pending-pulse" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.45), transparent)' }} />
                  <div className="ag-pending-icon" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)' }}>
                    <AlertCircle size={26} color="#fff" />
                  </div>
                </div>
                <h2 className="ag-welcome-title" style={{ marginBottom: '0.4rem' }}>Invalid Link</h2>
                <p className="ag-pending-sub" style={{ textAlign: 'center' }}>
                  No valid reset token was found in the link.
                </p>
                <p className="ag-pending-desc" style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
                  Please make sure you clicked the complete reset link sent to your email, or request a new one.
                </p>
                <button
                  type="button"
                  className="ag-btn ag-btn-submit"
                  onClick={() => navigate('/login')}
                  id="rp-invalid-back"
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <p className="ag-page-footer">© 2026 V-MAS Fleet Management. All rights reserved.</p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
