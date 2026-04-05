import { useState } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shaking, setShaking] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post<{ token: string; user: { id: string; email: string } }>(
        endpoint,
        { email, password },
      );
      login(data.token, data.user);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Something went wrong';
      setErrorMsg(msg);
      // Shake the form on error
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`auth-card-enter w-full max-w-sm rounded-2xl flex flex-col overflow-hidden ${shaking ? 'animate-shake' : ''}`}
      style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
    >
      {/* ── Logo header band ───────────────────────────────────── */}
      <div
        className="px-8 pt-8 pb-7 flex flex-col gap-1.5"
        style={{
          background: 'var(--text-primary)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo mark + wordmark */}
        <div className="flex items-center gap-2.5 mb-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect width="20" height="20" rx="5" fill="#E05C20" />
            <path d="M6 6h4.5a2.5 2.5 0 0 1 0 5H6V6Z" fill="white" />
            <path d="M6 11h5a2.5 2.5 0 0 1 0 5H6v-5Z" fill="white" opacity="0.6" />
          </svg>
          <span
            className="text-white text-[15px] font-bold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em' }}
          >
            BYTE
          </span>
        </div>
        <p
          className="text-[12px] tracking-wide"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-hint)',
            letterSpacing: '0.04em',
          }}
        >
          Your personal AI agent. Nothing extra.
        </p>
      </div>

      {/* ── Form body ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-8 py-8">
        {/* Email */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="auth-email"
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              letterSpacing: '0.12em',
            }}
          >
            Email
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.currentTarget.value)}
            required
            autoComplete="email"
            placeholder="you@domain.com"
            className="w-full h-10 px-3.5 rounded-lg text-[14px] outline-none transition-all duration-150"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--text-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(224,92,32,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="auth-password"
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              letterSpacing: '0.12em',
            }}
          >
            Password
          </label>
          <input
            id="auth-password"
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.currentTarget.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            className="w-full h-10 px-3.5 rounded-lg text-[14px] outline-none transition-all duration-150"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--text-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(224,92,32,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Error */}
        {errorMsg && (
          <p className="text-[13px] animate-fade-up" style={{ color: 'var(--accent)' }}>
            {errorMsg}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: 'var(--font-mono)',
            background: loading ? 'var(--text-muted)' : 'var(--text-primary)',
            color: 'var(--bg-elevated)',
            letterSpacing: '0.06em',
          }}
          onMouseEnter={e => {
            if (!loading) e.currentTarget.style.background = 'var(--accent)';
          }}
          onMouseLeave={e => {
            if (!loading) e.currentTarget.style.background = 'var(--text-primary)';
          }}
        >
          {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {/* ── Footer toggle ─────────────────────────────────────── */}
      <div className="px-8 pb-7 pt-0 flex justify-center">
        <p
          className="text-[12px]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="font-semibold transition-colors duration-150"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
