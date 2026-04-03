import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ThreadPage from './pages/ThreadPage';
import ProtectedRoute from './components/ProtectedRoute';

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
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/thread/:id"
        element={
          <ProtectedRoute>
            <ThreadPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
