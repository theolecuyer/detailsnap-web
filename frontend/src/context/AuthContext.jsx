import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ds_user')); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.post('/login', { email, password });
    localStorage.setItem('ds_token', data.token);
    localStorage.setItem('ds_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (shopName, ownerName, email, password) => {
    const { data } = await authApi.post('/signup', { shopName, ownerName, email, password });
    localStorage.setItem('ds_token', data.token);
    localStorage.setItem('ds_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ds_token');
    localStorage.removeItem('ds_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
