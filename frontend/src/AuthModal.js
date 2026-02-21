import React, { useState } from 'react';
import { register, login } from './api';

function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (mode === 'register') {
        res = await register(email, password, username || undefined);
      } else {
        res = await login(email, password);
      }

      const { access_token, user } = res.data;
      localStorage.setItem('token', access_token);
      onSuccess(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>&#x2715;</button>

        <h2 className="modal-title">
          {mode === 'login' ? 'Welcome back' : 'Get started'}
        </h2>

        {mode === 'register' && (
          <p style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '13px', marginBottom: '20px', background: 'var(--primary-soft)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glow)' }}>
            50 free credits when you sign up
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-field">
              <label>Username (optional)</label>
              <input
                type="text"
                placeholder="how should we call you?"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder={mode === 'register' ? 'min. 6 characters' : 'your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(255,80,80,0.08)', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.2)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '12px', marginTop: '6px' }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                onClick={() => { setMode('register'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
              >
                Sign up free
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
