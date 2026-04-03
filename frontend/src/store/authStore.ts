import { create } from 'zustand';
import { AuthUser, getUser, setAuth, clearAuth, isAuthenticated } from '../lib/auth';

interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(() => ({
  user: getUser(),
  isLoggedIn: isAuthenticated(),
  login: (token, user) => {
    setAuth(token, user);
    useAuthStore.setState({ user, isLoggedIn: true });
  },
  logout: () => {
    clearAuth();
    useAuthStore.setState({ user: null, isLoggedIn: false });
  },
}));
