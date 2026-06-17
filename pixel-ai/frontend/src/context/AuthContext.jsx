import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const LOCAL_TOKEN_KEY = 'flash_it_token';
const LOCAL_USER_KEY = 'flash_it_user';

// ── helpers ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabase) {
      // Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } else {
      // Local JWT fallback — restore from localStorage
      const token = localStorage.getItem(LOCAL_TOKEN_KEY);
      const savedUser = localStorage.getItem(LOCAL_USER_KEY);
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setSession({ access_token: token });
        } catch {
          localStorage.removeItem(LOCAL_TOKEN_KEY);
          localStorage.removeItem(LOCAL_USER_KEY);
        }
      }
      setLoading(false);
    }
  }, []);

  // ── signIn ──────────────────────────────────────────────────────────────────

  const signIn = async (email, password) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    }

    // API-backed local JWT
    const { user: u, session: s } = await apiPost('/api/accounts/login', { email, password });
    localStorage.setItem(LOCAL_TOKEN_KEY, s.access_token);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
    setUser(u);
    setSession(s);
    return { user: u, session: s };
  };

  // ── signInAdmin ─────────────────────────────────────────────────────────────
  // Admin login: uses the admin secret instead of a password.

  const signInAdmin = async (email, secret) => {
    const { user: u, session: s } = await apiPost('/api/accounts/admin-login', { email, secret });
    localStorage.setItem(LOCAL_TOKEN_KEY, s.access_token);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
    setUser(u);
    setSession(s);
    return { user: u, session: s };
  };

  // ── register ────────────────────────────────────────────────────────────────

  const register = async (email, password, name) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw error;
      return data;
    }

    const { user: u, session: s } = await apiPost('/api/accounts/register', { email, password, name });
    localStorage.setItem(LOCAL_TOKEN_KEY, s.access_token);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
    setUser(u);
    setSession(s);
    return { user: u, session: s };
  };

  // ── signOut ─────────────────────────────────────────────────────────────────

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem(LOCAL_TOKEN_KEY);
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem('flash_it_event');
    setUser(null);
    setSession(null);
  };

  // ── getToken ────────────────────────────────────────────────────────────────

  const getToken = () => session?.access_token || localStorage.getItem(LOCAL_TOKEN_KEY);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signInAdmin, register, signOut, getToken, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
