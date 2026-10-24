import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const RESEND_COOLDOWN_SECONDS = 60;

export const LoginPage: React.FC = () => {
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const nextPath = () => {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    const next = new URLSearchParams(location.search).get('next');
    return from || next || '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(nextPath(), { replace: true });
    } catch (err: any) {
      if (err.response?.status === 403) {
        // Unverified account — offer to send/enter a verification code.
        setError(err.response?.data?.detail || 'Account not verified.');
      } else {
        setError(
          err.response?.data?.detail || 'Invalid email or password. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError('Enter your email address (not username), then click "Send verification code".');
      return;
    }
    setLoading(true);
    try {
      await resendOtp(email, 'register');
      setStep('otp');
      setInfo(`We sent a 6-digit code to ${email}. Enter it to activate your account.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit code from your email');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      navigate(nextPath(), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      await resendOtp(email, 'register');
      setInfo(`A new code was sent to ${email}.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not resend the code. Please try again.');
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo123!@#');
  };

  if (step === 'otp') {
    return (
      <div>
        <h3 className="text-[1.35rem] font-semibold text-stone-900 tracking-tight mb-1.5">
          Verify your email
        </h3>
        <p className="text-sm text-stone-500 mb-6">
          Enter the verification code we emailed to <span className="font-semibold">{email}</span>.
        </p>

        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}
        {info && (
          <Alert type="info" className="mb-4">
            {info}
          </Alert>
        )}

        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <Input
            label="Verification Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            required
          />

          <Button type="submit" className="w-full" loading={loading} disabled={otp.length !== 6}>
            Verify &amp; Sign In
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-stone-600">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="font-semibold text-teal-600 hover:text-teal-500 disabled:text-stone-400 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('login');
              setError(null);
              setInfo(null);
              setOtp('');
            }}
            className="font-semibold text-stone-500 hover:text-stone-700"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[1.35rem] font-semibold text-stone-900 tracking-tight mb-1.5">
        Sign in to BrandGuard
      </h3>
      <p className="text-sm text-stone-500 mb-6">
        Enter your credentials to continue to your workspace.
      </p>

      {error && (
        <Alert type="error" className="mb-4">
          <div>{error}</div>
          {error.toLowerCase().includes('not verified') && (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading}
              className="mt-2 font-semibold text-teal-600 hover:text-teal-500 disabled:text-stone-400"
            >
              Send verification code →
            </button>
          )}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address or Username"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@brandguard.ai"
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          required
        />

        <Button type="submit" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 border-t border-stone-100 pt-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 text-center">
          Demo accounts
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => handleDemoLogin('admin@brandguard.ai')}
          >
            Admin Demo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => handleDemoLogin('creator@brandguard.ai')}
          >
            Creator Demo
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-stone-600">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-500">
          Create an account
        </Link>
      </div>
    </div>
  );
};
