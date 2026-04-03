import { useState } from 'react';
import { Button, Input } from '@heroui/react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post<{ token: string; user: { id: string; email: string } }>(
        endpoint,
        { email, password }
      );
      login(data.token, data.user);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Something went wrong';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* visual-layered-shadows — multiple shadow layers for realistic depth */
    /* visual-concentric-radius — outer radius 16px, inner elements 12px */
    <div
      className="w-full max-w-sm bg-[--color-surface] rounded-2xl px-8 py-8 flex flex-col gap-6"
      style={{
        boxShadow:
          '0 0 0 1px var(--color-border), ' +
          '0 2px 4px rgba(0,0,0,0.04), ' +
          '0 8px 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[--color-fg]">byte</h1>
        <p className="text-sm text-[--color-muted]">Your personal AI agent</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium text-[--color-fg]">
            Email
          </label>
          <Input
            id="auth-email"
            name="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.currentTarget.value)}
            required
            autoComplete="email"
            variant="secondary"
            fullWidth
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-sm font-medium text-[--color-fg]">
            Password
          </label>
          <Input
            id="auth-password"
            name="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.currentTarget.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            variant="secondary"
            fullWidth
          />
        </div>

        {/* ux-von-restorff-emphasis — error is visually distinct */}
        {errorMsg && (
          <p className="text-sm text-danger-500">{errorMsg}</p>
        )}

        {/* visual-button-shadow-anatomy + ux-fitts-target-size (min 44px height via size="lg") */}
        <Button
          type="submit"
          isPending={loading}
          size="lg"
          className="w-full font-medium transition-all duration-150 ease-out"
          style={{
            backgroundColor: 'var(--color-fg)',
            color: 'var(--color-surface)',
            /* visual-button-shadow-anatomy — 6-layer shadow */
            boxShadow:
              '0 0 0 1px rgba(0,0,0,0.15), ' +
              '0 1px 0 rgba(255,255,255,0.06) inset, ' +
              '0 -1px 0 rgba(0,0,0,0.2) inset, ' +
              '0 2px 4px rgba(0,0,0,0.12), ' +
              '0 4px 8px rgba(0,0,0,0.08), ' +
              '0 8px 16px rgba(0,0,0,0.04)',
          }}
        >
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      {/* Toggle mode */}
      <p className="text-center text-sm text-[--color-muted]">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        {/* ux-fitts-target-size — wider tap target via padding */}
        <button
          type="button"
          className="text-[--color-fg] hover:underline font-medium px-1 py-0.5 transition-colors duration-150 ease-out"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
