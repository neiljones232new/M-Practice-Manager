'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import BrandingHeader from '@/components/auth/BrandingHeader';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agree) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({ firstName, lastName, email, password, confirmPassword: confirm, agreeToTerms: agree });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <BrandingHeader />

        <h1 className="authTitle">Create Your Account</h1>
        <p className="authSubtitle">
          Join M Practice Manager and streamline your workflow
        </p>
        <p className="authPowered">Powered by M Assist</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="authInput"
            placeholder="First Name *"
            value={firstName}
            onChange={handleInputChange(setFirstName)}
            required
          />

          <input
            type="text"
            className="authInput"
            placeholder="Last Name *"
            value={lastName}
            onChange={handleInputChange(setLastName)}
            required
          />

          <input
            type="email"
            className="authInput"
            placeholder="Email Address *"
            value={email}
            onChange={handleInputChange(setEmail)}
            required
          />

          <input
            type="password"
            className="authInput"
            placeholder="Password *"
            value={password}
            onChange={handleInputChange(setPassword)}
            required
          />

          <input
            type="password"
            className="authInput"
            placeholder="Confirm Password *"
            value={confirm}
            onChange={handleInputChange(setConfirm)}
            required
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '1rem',
            }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#d4af37', flexShrink: 0 }}
            />
            <label style={{ fontSize: '0.8rem', lineHeight: 1.3, textAlign: 'left' }}>
              I agree to the{' '}
              <a href="/terms" style={{ color: '#d4af37' }}>
                Terms of Service
              </a>
              <br />
              and{' '}
              <a href="/privacy" style={{ color: '#d4af37' }}>
                Privacy Policy
              </a>
            </label>
          </div>

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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p style={{ fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#ffffff' }}>
              Sign in
            </a>
          </p>

          <p className="authFooter">
            Secure registration · Full feature access
          </p>
        </form>
      </div>
    </div>
  );
}
