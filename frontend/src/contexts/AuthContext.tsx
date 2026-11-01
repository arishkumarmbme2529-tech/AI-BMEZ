import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, LoginCredentials, AuthTokens } from '../types';
import { authUtils } from '../utils/auth';
import api from '../utils/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  const login = useCallback(async (credentials: LoginCredentials) => {
    // FastAPI OAuth2PasswordRequestForm expects form-encoded
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const { data } = await api.post<AuthTokens>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    authUtils.setToken(data.access_token);

    // Fetch user profile
    const { data: userData } = await api.get<User>('/auth/me');
    authUtils.setUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    authUtils.clearAll();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      if (Array.isArray(role)) return role.includes(user.role);
      return user.role === role;
    },
    [user]
  );

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user && !!authUtils.getToken(),
    isLoading,
    login,
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
