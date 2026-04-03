import { Routes, Route, Navigate } from 'react-router-dom';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { useConnectionBuilder } from './lib/spacetimedb';
import { useAuthStore } from './store/authStore';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ThreadPage from './pages/ThreadPage';
import ProtectedRoute from './components/ProtectedRoute';

function SpacetimeWrapper({ children }: { children: React.ReactNode }) {
  const builder = useConnectionBuilder();
  return (
    <SpacetimeDBProvider connectionBuilder={builder}>
      {children}
    </SpacetimeDBProvider>
  );
}

export default function App() {
  const { isLoggedIn } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/auth"
        element={isLoggedIn ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SpacetimeWrapper>
              <HomePage />
            </SpacetimeWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/thread/:id"
        element={
          <ProtectedRoute>
            <SpacetimeWrapper>
              <ThreadPage />
            </SpacetimeWrapper>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
