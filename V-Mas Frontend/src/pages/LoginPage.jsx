import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import fleetHero from '../assets/fleet-hero.png';
import './LoginPage.css';

const LoginPage = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
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
            <img src={logo} alt="V-MAS" className="pay-right-logo-img" />
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

            <a href="#" className="pay-forgot" onClick={(e) => e.preventDefault()}>
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
    </div>
  );
};

export default LoginPage;
