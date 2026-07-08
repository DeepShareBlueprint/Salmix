import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  google_user_data: {
    name: string;
    picture?: string;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isPending: boolean;
  redirectToLogin: () => Promise<void>;
  exchangeCodeForSessionToken: () => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/users/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.authorized === false ? null : data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setIsPending(false));
  }, [fetchUser]);

  const redirectToLogin = useCallback(async () => {
    const response = await fetch('/api/oauth/google/redirect_url');
    if (!response.ok) {
      throw new Error('Falha ao obter URL de login do Google');
    }
    const { redirectUrl } = await response.json();
    window.location.href = redirectUrl;
  }, []);

  const exchangeCodeForSessionToken = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      throw new Error('Código ou state ausente na URL de callback');
    }

    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, state }),
    });

    if (!response.ok) {
      throw new Error('Falha ao trocar código por sessão');
    }

    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await fetch('/api/logout', { credentials: 'include' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isPending, redirectToLogin, exchangeCodeForSessionToken, fetchUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
}
