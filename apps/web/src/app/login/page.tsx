'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import BrandingHeader from '@/components/auth/BrandingHeader';

export default function LoginPage() {
  const { login, enterDemoMode } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password, remember);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await enterDemoMode();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unable to start demo right now.');
    } finally {
      setLoading(false);
    }
  };

  // Clear error when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <BrandingHeader />
        
        <p className="authSubtitle">
          Streamline your client management and compliance
        </p>
        <p className="authPowered">Powered by M Assist</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="authInput"
            placeholder="Email Address *"
            autoComplete="username"
            value={email}
            onChange={handleEmailChange}
            required
          />

          <input
            type="password"
            className="authInput"
            placeholder="Password *"
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            required
          />

          <label
            htmlFor="remember"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              lineHeight: 1.3,
              color: '#eaeaea',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--brand-purple)' }}
            />
            Remember me
          </label>

          {error && (
            <div 
              style={{ 
                color: '#ffb3b3', 
                fontSize: '0.9rem', 
                marginBottom: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 179, 179, 0.1)',
                border: '1px solid rgba(255, 179, 179, 0.3)',
                borderRadius: '4px',
                textAlign: 'center'
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <button type="submit" className="authButton" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            <a href="/forgot-password" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>
              Forgot your password?
            </a>
          </div>

          <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            Don't have an account?{' '}
            <a href="/register" style={{ color: '#ffd966' }}>
              Sign up
            </a>
          </p>

          <button
            type="button"
            onClick={handleDemo}
            className="authButton authSecondary"
          >
            Explore Demo
          </button>

          <p className="authFooter">
            No registration required • Full feature access
          </p>
        </form>
      </div>
    </div>
  );
}
