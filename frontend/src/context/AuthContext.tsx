import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type User } from '../api/client';

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!localStorage.getItem('token')) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>('/api/auth/me');
      setUser(me);
      setToken(localStorage.getItem('token'));
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      token,
      loading,
      setSession: (t, u) => {
        localStorage.setItem('token', t);
        setToken(t);
        setUser(u);
      },
      logout: () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      },
      refresh,
    }),
    [user, token, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AuthProvider requerido');
  return ctx;
}
