import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { initDatabase } from '../../database/db';
import {
  deleteAccount as deleteAccountService,
  getCurrentUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
} from '../../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [fatalError, setFatalError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initDatabase();
        const current = await getCurrentUser();
        if (mounted) setUser(current);
      } catch (error) {
        if (mounted) setFatalError(error?.message || 'No se pudo iniciar la base de datos local.');
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (values) => {
    const nextUser = await loginService(values);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (values) => {
    const result = await registerService(values);
    if (result.user) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('No hay una sesión activa.');
    const result = await deleteAccountService(user.id);
    setUser(null);
    return result;
  }, [user]);

  const refreshUser = useCallback(async () => {
    const current = await getCurrentUser();
    setUser(current);
    return current;
  }, []);

  const value = useMemo(
    () => ({ user, ready, fatalError, login, register, logout, deleteAccount, refreshUser, setUser }),
    [user, ready, fatalError, login, register, logout, deleteAccount, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
