export interface AuthUser {
  id: number;
  email: string;
}

export function getToken(): string | null {
  return localStorage.getItem('byte_token');
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('byte_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem('byte_token', token);
  localStorage.setItem('byte_user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('byte_token');
  localStorage.removeItem('byte_user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
