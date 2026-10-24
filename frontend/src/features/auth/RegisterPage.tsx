import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const RESEND_COOLDOWN_SECONDS = 60;

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const registeredEmail = await register({
        email,
        username,
        full_name: fullName,
        password,
      });
      setEmail(registeredEmail);
      setStep('otp');
      setInfo(`We sent a 6-digit code to ${registeredEmail}. Enter it below to activate your account.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Registration failed. Please check your information.'
      );
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
      navigate('/setup-workspace');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Invalid verification code. Please try again.'
      );
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
            Verify &amp; Continue
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
              setStep('details');
              setError(null);
              setInfo(null);
              setOtp('');
            }}
            className="font-semibold text-stone-500 hover:text-stone-700"
          >
            ← Change details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[1.35rem] font-semibold text-stone-900 tracking-tight mb-1.5">
        Create your account
      </h3>
      <p className="text-sm text-stone-500 mb-6">
        Set up your login details to get started.
      </p>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleDetailsSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          required
        />

        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="janedoe"
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
          required
        />

        <Input
          label="Password (min 8 characters)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••••••"
          required
        />

        <Button type="submit" className="w-full" loading={loading}>
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-stone-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-500">
          Sign in
        </Link>
      </div>
    </div>
  );
};
