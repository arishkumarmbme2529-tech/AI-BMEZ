import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, LoginCredentials, RegisterCredentials, AuthTokens } from '../types';
import { authUtils } from '../utils/auth';
import api from '../utils/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRoleGroup(role: UserRole): UserRole[] {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return ['SUPER_ADMIN', 'ADMIN'];
  if (role === 'INSTITUTION_ADMIN' || role === 'INSTITUTE_USER') return ['INSTITUTION_ADMIN', 'INSTITUTE_USER'];
  if (role === 'OFFICER' || role === 'REVIEWER') return ['OFFICER', 'REVIEWER'];
  return [role];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(authUtils.getUser());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
      authUtils.setUser(data);
    } catch {
      authUtils.clearAll();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = authUtils.getToken();
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    const cleanEmail = credentials.email.trim().toLowerCase();
    const { data } = await api.post<AuthTokens>('/auth/login-json', {
      email: cleanEmail,
      password: credentials.password,
    });

    authUtils.setToken(data.access_token);

    if (data.user) {
      authUtils.setUser(data.user);
      setUser(data.user);
      return data.user;
    }

    const { data: userData } = await api.get<User>('/auth/me');
    authUtils.setUser(userData);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<User> => {
    const payload = {
      ...credentials,
      email: credentials.email.trim().toLowerCase(),
    };
    const { data } = await api.post<AuthTokens & Partial<User>>('/auth/register', payload);

    if (data.access_token) {
      authUtils.setToken(data.access_token);
      if (data.user) {
        authUtils.setUser(data.user);
        setUser(data.user);
        return data.user;
      }
      const { data: userData } = await api.get<User>('/auth/me');
      authUtils.setUser(userData);
      setUser(userData);
      return userData;
    }

    // Fallback: if backend returned UserResponse without token, log in automatically
    return await login({ email: payload.email, password: credentials.password });
  }, [login]);

  const logout = useCallback(() => {
    authUtils.clearAll();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const userRoles = normalizeRoleGroup(user.role);
      const targetRoles = Array.isArray(role) ? role : [role];
      return targetRoles.some((r) => userRoles.includes(r));
    },
    [user]
  );

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user && !!authUtils.getToken(),
    isLoading,
    login,
    register,
    logout,
    hasRole,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
