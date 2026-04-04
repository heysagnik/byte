import { useState } from 'react';
import { Button, Input, Surface } from '@heroui/react';
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
    <Surface className="w-full max-w-sm rounded-lg px-8 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">byte</h1>
        <p className="text-sm text-[--muted]">Your personal AI agent</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium">
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
          <label htmlFor="auth-password" className="text-sm font-medium">
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

        {errorMsg && (
          <p className="text-sm text-danger-500">{errorMsg}</p>
        )}

        <Button
          type="submit"
          isPending={loading}
          variant="primary"
          size="lg"
          fullWidth
        >
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-[--muted]">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          className="font-medium underline-offset-2 hover:underline px-1 py-0.5"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </Surface>
  );
}
