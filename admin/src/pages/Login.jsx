import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  KeyRound,
  LoaderCircle,
  Mail,
  Moon,
  RefreshCw,
  SatelliteDish,
  SquareTerminal,
  Sun,
  TriangleAlert,
} from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import MeteorShower from '../components/MeteorShower.jsx';
import SpaceShuttle from '../components/SpaceShuttle.jsx';
import StarfieldCanvas from '../components/StarfieldCanvas.jsx';
import { useAuth } from '../lib/useAuth.js';
import { useTheme } from '../lib/useTheme.js';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const SUCCESS_REDIRECT_MS = 650;
const SHUTTLE_VARIANTS = [1, 2, 3, 4, 5, 6];

const STATUS_ICONS = { error: TriangleAlert, success: CircleCheck, info: SatelliteDish };

function StatusBanner({ status }) {
  const Icon = STATUS_ICONS[status.type] ?? SatelliteDish;
  return (
    <div className={`status-banner status-${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>
      <Icon size={14} />
      <span>{status.message}</span>
    </div>
  );
}

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const boxRefs = useRef([]);

  const code = digits.join('');

  useEffect(() => {
    if (resendIn <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'code') {
      boxRefs.current[0]?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (status?.type !== 'success') {
      return undefined;
    }
    const timer = setTimeout(() => {
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    }, SUCCESS_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [status, navigate, location.state]);

  if (!auth.booting && auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const target = email.trim();

  async function handleRequest(event) {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      const data = await auth.requestOtp(target);
      setDigits(Array(OTP_LENGTH).fill(''));
      setStep('code');
      setResendIn(data?.resend_after ?? RESEND_SECONDS);
      setStatus({ type: 'info', message: `New ${OTP_LENGTH}-digit code dispatched to ${target}` });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Could not send the code.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();

    if (code.length !== OTP_LENGTH) {
      setStatus({ type: 'error', message: `Please enter all ${OTP_LENGTH} digits of your verification code.` });
      return;
    }

    setStatus(null);
    setSubmitting(true);

    try {
      await auth.verifyOtp(target, code);
      setStatus({ type: 'success', message: 'Code verified. Access granted to Portfolio CMS.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'The code is incorrect.' });
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || submitting) {
      return;
    }
    setStatus(null);
    try {
      const data = await auth.requestOtp(target);
      setResendIn(data?.resend_after ?? RESEND_SECONDS);
      setStatus({ type: 'info', message: `New ${OTP_LENGTH}-digit code dispatched to ${target}` });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Could not resend the code.' });
    }
  }

  function setDigit(index, value) {
    const cleaned = value.replace(/\D/g, '');
    const next = [...digits];

    if (!cleaned) {
      next[index] = '';
      setDigits(next);
      return;
    }

    if (cleaned.length > 1) {
      cleaned.slice(0, OTP_LENGTH - index).split('').forEach((char, offset) => {
        next[index + offset] = char;
      });
      setDigits(next);
      boxRefs.current[Math.min(index + cleaned.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    next[index] = cleaned;
    setDigits(next);
    if (index < OTP_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  }

  function handleBoxKeyDown(index, event) {
    if (event.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        event.preventDefault();
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        boxRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      boxRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      boxRefs.current[index + 1]?.focus();
    }
  }

  function handleBoxPaste(event) {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }
    const next = [...digits];
    pasted.split('').forEach((char, offset) => {
      next[offset] = char;
    });
    setDigits(next);
    boxRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  function backToEmail() {
    setStep('email');
    setDigits(Array(OTP_LENGTH).fill(''));
    setStatus(null);
  }

  function clearDigits() {
    setDigits(Array(OTP_LENGTH).fill(''));
    setStatus(null);
    boxRefs.current[0]?.focus();
  }

  return (
    <main className="login-page">
      <div className="login-nebula login-nebula-1" aria-hidden="true" />
      <div className="login-nebula login-nebula-2" aria-hidden="true" />
      <StarfieldCanvas />
      <MeteorShower />
      {SHUTTLE_VARIANTS.map((variant) => (
        <SpaceShuttle key={variant} variant={variant} />
      ))}

      <header className="login-topbar">
        <div className="login-topbar-left">
          <a className="login-back" href="https://www.shandyshultonshihab.my.id">
            <ArrowLeft size={16} />
            Back to Portfolio
          </a>
          <span className="telemetry-pill">
            <span className="telemetry-dot" />
            <span>OTP telemetry active</span>
          </span>
        </div>
        <button className="theme-toggle" type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <div className="login-main">
        <div className="login-panel">
          <div className="login-brand">
            <div className="brand-mark"><SquareTerminal size={26} /></div>
            <span className="command-label">Shandy SS. // Command Center</span>
            <h1 id="login-title">Portfolio CMS</h1>
            {step === 'email' ? (
              <p className="login-sub">Sign in with a one-time code sent to your email</p>
            ) : (
              <div className="recipient-block">
                <p className="login-sub">Enter the {OTP_LENGTH}-digit code we sent to</p>
                <span className="recipient-pill">
                  <Mail size={13} />
                  <span>{target}</span>
                </span>
              </div>
            )}
          </div>

          <div className="login-card">
            {step === 'email' ? (
              <form className="login-form" onSubmit={handleRequest}>
                <div>
                  <label className="field-label" htmlFor="email">Email Address</label>
                  <div className="field-control">
                    <Mail size={20} />
                    <input
                      id="email"
                      type="email"
                      placeholder="xxx@gmail.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="primary-black" disabled={submitting}>
                  {submitting ? 'Sending code...' : 'Send OTP Code'}
                  {submitting ? <LoaderCircle size={20} className="spin" /> : <ArrowRight size={20} />}
                </button>

                {status && <StatusBanner status={status} />}
              </form>
            ) : (
              <form className="login-form" onSubmit={handleVerify}>
                <div className="otp-label-row">
                  <span className="field-label-inline">
                    <KeyRound size={12} />
                    One-Time Code
                  </span>
                  <button type="button" className="text-button" onClick={clearDigits}>Clear digits</button>
                </div>

                <div className="otp-deck">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => { boxRefs.current[index] = element; }}
                      className="otp-box"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      aria-label={`Digit ${index + 1}`}
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => setDigit(index, event.target.value)}
                      onKeyDown={(event) => handleBoxKeyDown(index, event)}
                      onPaste={handleBoxPaste}
                    />
                  ))}
                </div>

                <p className="otp-hint">The code expires in 1 minute. Not seeing it? Check your spam folder.</p>

                <button type="submit" className="primary-black" disabled={submitting || code.length !== OTP_LENGTH}>
                  {submitting ? 'Verifying...' : 'Verify & Sign In'}
                  {submitting ? <LoaderCircle size={20} className="spin" /> : <ArrowRight size={20} />}
                </button>

                {status && <StatusBanner status={status} />}

                <div className="otp-actions">
                  <button type="button" className="link-button" onClick={handleResend} disabled={resendIn > 0 || submitting}>
                    <RefreshCw size={13} />
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                  <button type="button" className="link-button link-accent" onClick={backToEmail}>
                    Use a different email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer className="login-footer">© 2026 Shandy Shulton Shihab • Portfolio Control System</footer>
    </main>
  );
}
