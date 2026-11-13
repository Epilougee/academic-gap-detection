'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Login page with role-based redirect and demo account quick-fill
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign in failed.');
        setLoading(false);
        return;
      }

      if (data.user.role === 'teacher') {
        router.push('/teacher');
      } else {
        router.push('/student');
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword('demo123');
    setError('');
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
            <span>Academic Gap Detection</span>
          </div>
          <p className="muted">Sign in with your student or teacher account.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@demo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-box">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Demo Accounts (password: demo123)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fillDemo('teacher@demo.com')}
            >
              Teacher Demo
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fillDemo('student1@demo.com')}
            >
              Student Demo (Root Gap)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

