import { useState } from 'react';
import { Button, Input, Card, CardBody, CardHeader, Divider, addToast } from '@heroui/react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post<{ token: string; user: { id: number; email: string } }>(
        endpoint,
        { email, password }
      );
      login(data.token, data.user);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Something went wrong';
      addToast({ title: 'Error', description: msg, color: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
        <h1 className="text-2xl font-bold">byte</h1>
        <p className="text-default-500 text-sm">Your personal AI agent</p>
      </CardHeader>
      <Divider />
      <CardBody className="px-6 py-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onValueChange={setEmail}
            variant="bordered"
            isRequired
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onValueChange={setPassword}
            variant="bordered"
            isRequired
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <Button
            type="submit"
            color="primary"
            isLoading={loading}
            fullWidth
            size="lg"
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-default-500 mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </CardBody>
    </Card>
  );
}
