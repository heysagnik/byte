import AuthForm from '../components/AuthForm';

export default function AuthPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-page)' }}
    >
      <AuthForm />
    </main>
  );
}
