// ─── Auth Screen ───
// Simple auth flow — register / login or quick dev join
import React, { useState } from 'react';
import { useWhiteboardStore } from '@/store/whiteboardStore';

const API_BASE = '/api';

interface AuthProps {
  onAuth: (userId: string, userName: string, token: string) => void;
}

export function AuthScreen({ onAuth }: AuthProps) {
  const [mode, setMode] = useState<'join' | 'login' | 'register'>('join');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickJoin = async () => {
    if (!userName.trim()) {
      setError('Please enter a name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/dev-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: userName.trim() }),
      });

      if (!res.ok) {
        // Server not available — use offline mode
        const offlineId = `offline-${Date.now().toString(36)}`;
        onAuth(offlineId, userName.trim(), '');
        return;
      }

      const { data } = await res.json();
      localStorage.setItem('wb-token', data.token);
      localStorage.setItem('wb-user', JSON.stringify(data.user));
      onAuth(data.user.id, userName.trim(), data.token);
    } catch {
      // Offline — generate local identity
      const offlineId = `offline-${Date.now().toString(36)}`;
      localStorage.setItem('wb-user', JSON.stringify({ id: offlineId, userName: userName.trim() }));
      onAuth(offlineId, userName.trim(), '');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { userName, email, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Authentication failed');
        return;
      }

      localStorage.setItem('wb-token', result.data.token);
      localStorage.setItem('wb-user', JSON.stringify(result.data.user));
      onAuth(result.data.user.id, result.data.user.userName, result.data.token);
    } catch (err) {
      setError('Server unreachable. Use Quick Join for offline mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm panel p-6 space-y-6">
        {/* Logo / Title */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-accent/20 rounded-2xl flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#89b4fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M3 9h18" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-surface-100">Collaborative Whiteboard</h1>
          <p className="text-xs text-surface-400 mt-1">Local-First · CRDT · Real-time</p>
        </div>

        {/* Quick Join (Dev Mode) */}
        {mode === 'join' && (
          <div className="space-y-3">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleQuickJoin()}
              autoFocus
            />
            <button
              className="btn-primary w-full"
              onClick={handleQuickJoin}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Quick Join'}
            </button>
            <p className="text-center text-xs text-surface-500">
              Works offline! No account needed.
            </p>
          </div>
        )}

        {/* Login / Register */}
        {(mode === 'login' || mode === 'register') && (
          <div className="space-y-3">
            {mode === 'register' && (
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Username"
                className="input-field"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="input-field"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            />
            <button
              className="btn-primary w-full"
              onClick={handleAuth}
              disabled={loading}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Register'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-danger text-center">{error}</p>
        )}

        {/* Mode Switcher */}
        <div className="flex justify-center gap-4 text-xs">
          <button
            className={`${mode === 'join' ? 'text-accent' : 'text-surface-400'} hover:text-surface-200`}
            onClick={() => setMode('join')}
          >
            Quick Join
          </button>
          <button
            className={`${mode === 'login' ? 'text-accent' : 'text-surface-400'} hover:text-surface-200`}
            onClick={() => setMode('login')}
          >
            Log In
          </button>
          <button
            className={`${mode === 'register' ? 'text-accent' : 'text-surface-400'} hover:text-surface-200`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
