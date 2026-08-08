import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, KeyRound, CheckCircle, AlertCircle,
  ArrowLeft, Loader2, ShieldCheck,
} from 'lucide-react';
import { authAPI } from '../services/api';
import './LoginPage.css';
import './ResetPasswordPage.css';

/* ═══════════════════════════════════════════════════════════
   RESET PASSWORD PAGE  —  /reset-password?token=<TOKEN>
═══════════════════════════════════════════════════════════ */
const ResetPasswordPage = () => {
  const [searchParams]               = useSearchParams();
  const navigate                     = useNavigate();
  const token                        = searchParams.get('token');

  // Step: 'form' | 'success' | 'error' | 'invalid'
  const [step, setStep]              = useState(token ? 'form' : 'invalid');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]        = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]        = useState(false);
  const [errors, setErrors]          = useState({});
  const [serverError, setServerError] = useState('');
  const [countdown, setCountdown]    = useState(5);

  // Auto-redirect after success
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

  // ── Validation ─────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!newPassword) {
      errs.newPassword = 'Password is required.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await authAPI.resetPassword(token, newPassword);
      setStep('success');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'The link has expired or is invalid. Please request a new one.';
      setServerError(msg);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Strength indicator ─────────────────────────────────────────
  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '' };
    let score = 0;
    if (pw.length >= 8)             score++;
    if (/[A-Z]/.test(pw))          score++;
    if (/[0-9]/.test(pw))          score++;
    if (/[^A-Za-z0-9]/.test(pw))   score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
    return { level: score, label: labels[score], color: colors[score] };
  };
  const strength = getStrength(newPassword);

  return (
    <div className="rp-page">
      {/* ── Left panel (decorative, same as LoginPage) ── */}
      <div className="rp-left">
        <p className="pay-left-tagline">Vehicle fleet management — simplified.</p>
        <div className="pay-left-hero">
          <h1 className="pay-left-headline">
            Reset your<br />password
          </h1>
          <p className="pay-left-sub">
            Set a strong new password to keep your fleet management account secure.
          </p>
        </div>
        <div className="rp-shield-wrap">
          <ShieldCheck size={80} strokeWidth={1.2} />
        </div>
        <p className="pay-left-copy">© 2026 V-MAS. All rights reserved.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="pay-right">
        {/* Logo row */}
        <div className="pay-right-logo-row">
          <div className="pay-right-logo-box rp-logo-box">
            <KeyRound size={18} />
          </div>
          <span className="pay-right-logo-name">V-MAS</span>
          <Link to="/login" className="pay-right-signup-link">
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </div>

        {/* Form section */}
        <div className="pay-right-form-wrap">

          {/* ── Step: Form ── */}
          {step === 'form' && (
            <>
              <h2 className="pay-right-heading">Set new password</h2>

              {serverError && (
                <div className="pay-right-error">
                  <AlertCircle size={15} />
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="pay-right-form" noValidate>
                {/* New password */}
                <div className={`pay-field ${errors.newPassword ? 'rp-field--error' : ''}`}>
                  <div className="pay-input-pw-wrap">
                    <input
                      id="rp-new-password"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, newPassword: '' }));
                      }}
                      placeholder="New password"
                      className="pay-input"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="pay-pw-toggle"
                      onClick={() => setShowNew(!showNew)}
                      tabIndex={-1}
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <span className="rp-field-error">
                      <AlertCircle size={13} /> {errors.newPassword}
                    </span>
                  )}

                  {/* Strength bar */}
                  {newPassword && (
                    <div className="rp-strength">
                      <div className="rp-strength-bars">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className="rp-strength-bar"
                            style={{
                              background: lvl <= strength.level ? strength.color : '#e8e8e8',
                              transition: 'background 0.3s ease',
                            }}
                          />
                        ))}
                      </div>
                      <span className="rp-strength-label" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className={`pay-field ${errors.confirmPassword ? 'rp-field--error' : ''}`}>
                  <div className="pay-input-pw-wrap">
                    <input
                      id="rp-confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Confirm new password"
                      className="pay-input"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="pay-pw-toggle"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="rp-field-error">
                      <AlertCircle size={13} /> {errors.confirmPassword}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="pay-submit-btn"
                  disabled={loading}
                  id="rp-submit"
                >
                  {loading ? (
                    <><Loader2 size={16} className="fpw-spin" /> Resetting…</>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step: Success ── */}
          {step === 'success' && (
            <div className="rp-result">
              <div className="rp-result-icon rp-result-icon--success">
                <CheckCircle size={32} />
              </div>
              <h2 className="rp-result-title">Password reset!</h2>
              <p className="rp-result-desc">
                Your password has been updated successfully.
                <br />
                Redirecting to Sign In in <strong>{countdown}s</strong>…
              </p>
              <Link to="/login" className="pay-submit-btn" style={{ textDecoration: 'none', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                Go to Sign In
              </Link>
            </div>
          )}

          {/* ── Step: Error / Expired ── */}
          {step === 'error' && (
            <div className="rp-result">
              <div className="rp-result-icon rp-result-icon--error">
                <AlertCircle size={32} />
              </div>
              <h2 className="rp-result-title">Link expired</h2>
              <p className="rp-result-desc">
                {serverError || 'This reset link has expired or is invalid.'}
              </p>
              <Link to="/login" className="pay-submit-btn" style={{ textDecoration: 'none', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                Request a new link
              </Link>
            </div>
          )}

          {/* ── Step: Invalid (no token in URL) ── */}
          {step === 'invalid' && (
            <div className="rp-result">
              <div className="rp-result-icon rp-result-icon--error">
                <AlertCircle size={32} />
              </div>
              <h2 className="rp-result-title">Invalid link</h2>
              <p className="rp-result-desc">
                This page requires a valid reset token. Please use the link
                sent to your email, or request a new one.
              </p>
              <Link to="/login" className="pay-submit-btn" style={{ textDecoration: 'none', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                Back to Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pay-right-footer">
          <span>© 2026 V-MAS</span>
          <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
