import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  // page_access matrix: { 'pageKey:role': boolean }. Default `true` when missing.
  const [pageAccess, setPageAccess] = useState({});

  const refreshPageAccess = useCallback(async () => {
    try {
      const { data } = await api.get('/page-access');
      setPageAccess(data.matrix || {});
    } catch {
      setPageAccess({});
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => {});
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (user) refreshPageAccess();
    else setPageAccess({});
  }, [user, refreshPageAccess]);

  async function login(email, password) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally { setLoading(false); }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // True when the current user's role is allowed to see the given page.
  // Superadmin always sees everything. Missing matrix entry = allowed.
  function canSee(pageKey) {
    const role = user?.role;
    if (!role) return false;
    if (role === 'superadmin') return true;
    const v = pageAccess[`${pageKey}:${role}`];
    return v === undefined ? true : !!v;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, canSee, pageAccess, refreshPageAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
