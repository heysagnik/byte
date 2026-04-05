import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ThreadPage from './pages/ThreadPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

export default function App() {
  const { isLoggedIn } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <Routes>
      <Route path="/auth" element={isLoggedIn ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <HomePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/thread/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <ThreadPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
