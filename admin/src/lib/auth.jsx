import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api';
import { AuthContext } from './auth-context.js';
import { clearPayloadKey, setPayloadKey } from './payloadCrypto.js';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('cms_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [booting, setBooting] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    apiRequest('/admin/me')
      .then((data) => setUser(data.user))
      .then(() => apiRequest('/admin/encryption-key'))
      .then((data) => setPayloadKey(data.key))
      .catch(() => {
        localStorage.removeItem('cms_token');
        localStorage.removeItem('cms_user');
        clearPayloadKey();
        setToken(null);
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, [token]);

  const value = useMemo(() => ({
    booting,
    token,
    user,
    isAuthenticated: Boolean(token && user),
    async login(email, password) {
      const data = await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('cms_token', data.token);
      localStorage.setItem('cms_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      try {
        const keyData = await apiRequest('/admin/encryption-key');
        setPayloadKey(keyData.key);
      } catch {
        // Payload key is optional for boot; encryption only applies to PII endpoints.
      }

      return data.user;
    },
    async logout() {
      try {
        await apiRequest('/admin/logout', { method: 'POST' });
      } finally {
        localStorage.removeItem('cms_token');
        localStorage.removeItem('cms_user');
        clearPayloadKey();
        setToken(null);
        setUser(null);
      }
    },
  }), [booting, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
