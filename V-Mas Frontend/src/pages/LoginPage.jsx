import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle, X, Mail, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { getRoleLogo } from '../utils/roleAssets';
import { authAPI } from '../services/api';
import fleetHero from '../assets/fleet-hero.png';
import './LoginPage.css';

const LoginPage = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(userName, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div className="pay-container">

      {/* ── LEFT PANEL ── */}
      <div className="pay-left">
        {/* Subtle tagline */}
        <p className="pay-left-tagline">Vehicle fleet management — simplified.</p>

        {/* Big hero headline */}
        <div className="pay-left-hero">
          <h1 className="pay-left-headline">
            Manage<br />your fleet
          </h1>
          <p className="pay-left-sub">
            Real-time tracking, service records, fuel analytics and complete control — in one platform.
          </p>
        </div>

        {/* Hero mockup image */}
        <div className="pay-left-img-wrap">
          <img src={fleetHero} alt="V-MAS Dashboard" className="pay-left-img" />
        </div>

        {/* Copyright */}
        <p className="pay-left-copy">© 2026 V-MAS. All rights reserved.</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="pay-right">
        {/* Logo row */}
        <div className="pay-right-logo-row">
          <div className="pay-right-logo-box">
            <img src={getRoleLogo(user?.role)} alt="V-MAS Logo" className="pay-right-logo-img" />
          </div>
          <span className="pay-right-logo-name">V-MAS</span>
          <Link to="/signup" className="pay-right-signup-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Sign Up
          </Link>
        </div>

        {/* Form section */}
        <div className="pay-right-form-wrap">
          <h2 className="pay-right-heading">Sign In</h2>

          {error && (
            <div className="pay-right-error">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="pay-right-form" noValidate>
            <div className="pay-field">
              <input
                id="login-username"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Username"
                className="pay-input"
                required
                autoComplete="username"
              />
            </div>

            <div className="pay-field">
              <div className="pay-input-pw-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="pay-input"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pay-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <a
              href="#"
              className="pay-forgot"
              onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}
            >
              Forgot password?
            </a>

            <button
              type="submit"
              className="pay-submit-btn"
              disabled={loading}
              id="login-submit"
            >
              <LogIn size={17} />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="pay-right-footer">
          <span>© 2026 V-MAS</span>
          <Link to="/signup">Create account</Link>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </div>
  );
};

export default LoginPage;

/* ═══════════════════════════════════════════════════════════
   FORGOT PASSWORD MODAL
═══════════════════════════════════════════════════════════ */
const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState('email'); // 'email' | 'sent' | 'error'
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setServerError('');

    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setStep('sent');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Something went wrong. Please try again.';
      setServerError(msg);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fpw-backdrop" onClick={handleBackdrop}>
      <div className="fpw-card">
        {/* Close button */}
        <button className="fpw-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* ── Step: Email Input ── */}
        {step === 'email' && (
          <>
            <div className="fpw-icon-wrap">
              <Mail size={26} />
            </div>
            <h2 className="fpw-title">Forgot password?</h2>
            <p className="fpw-desc">
              Enter your registered email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="fpw-form" noValidate>
              <div className={`fpw-field ${emailError ? 'fpw-field--error' : ''}`}>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="Your email address"
                  className="pay-input"
                  autoFocus
                  autoComplete="email"
                />
                {emailError && (
                  <span className="fpw-field-error">
                    <AlertCircle size={13} /> {emailError}
                  </span>
                )}
              </div>

              {serverError && (
                <div className="fpw-server-error">
                  <AlertCircle size={14} /> {serverError}
                </div>
              )}

              <button
                type="submit"
                className="pay-submit-btn"
                disabled={loading}
                id="forgot-submit"
              >
                {loading ? (
                  <><Loader2 size={16} className="fpw-spin" /> Sending…</>
                ) : (
                  <>Send Reset Link</>
                )}
              </button>
            </form>

            <button className="fpw-back-link" onClick={onClose}>
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </>
        )}

        {/* ── Step: Email Sent ── */}
        {step === 'sent' && (
          <>
            <div className="fpw-icon-wrap fpw-icon-wrap--success">
              <CheckCircle size={26} />
            </div>
            <h2 className="fpw-title">Check your inbox!</h2>
            <p className="fpw-desc">
              We've sent a password reset link to <strong>{email}</strong>.
              The link expires in <strong>30 minutes</strong>.
            </p>
            <p className="fpw-hint">
              Didn't receive it? Check your spam folder or{' '}
              <button
                className="fpw-retry-link"
                onClick={() => { setStep('email'); setServerError(''); }}
              >
                try again
              </button>.
            </p>
            <button className="pay-submit-btn" style={{ marginTop: '1.25rem' }} onClick={onClose}>
              Back to Sign In
            </button>
          </>
        )}

        {/* ── Step: Error ── */}
        {step === 'error' && (
          <>
            <div className="fpw-icon-wrap fpw-icon-wrap--error">
              <AlertCircle size={26} />
            </div>
            <h2 className="fpw-title">Something went wrong</h2>
            <p className="fpw-desc">{serverError || 'Unable to send the reset email. Please try again.'}</p>
            <button
              className="pay-submit-btn"
              style={{ marginTop: '1rem' }}
              onClick={() => { setStep('email'); setServerError(''); }}
            >
              Try Again
            </button>
            <button className="fpw-back-link" onClick={onClose}>
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
};
