'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, setMemoryToken } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (profile: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage/API on mount
  useEffect(() => {
    async function restoreSession() {
      const persistedToken = localStorage.getItem('apex-session-token');
      const persistedUser = localStorage.getItem('apex-user');

      if (persistedToken && persistedUser) {
        try {
          // Store token in Axios memory client first
          setMemoryToken(persistedToken);
          setAccessToken(persistedToken);
          
          // Verify session integrity with backend
          const userData = await authService.me();
          setUser(userData);
          localStorage.setItem('apex-user', JSON.stringify(userData));
        } catch (error) {
          console.error('Session restoration failed:', error);
          // Token is cleared automatically by response interceptor on 401
          logout();
        }
      } else {
        // No session token, redirect if on protected route
        if (!pathname.startsWith('/login')) {
          router.replace('/login');
        }
      }
      setIsLoading(false);
    }
    restoreSession();
  }, [pathname]);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const data = await authService.login(credentials);
      setMemoryToken(data.accessToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('apex-session-token', data.accessToken);
      localStorage.setItem('apex-refresh-token', data.refreshToken);
      localStorage.setItem('apex-user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (error) {
      setMemoryToken(null);
      setAccessToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (profile: any) => {
    setIsLoading(true);
    try {
      const data = await authService.register(profile);
      setMemoryToken(data.accessToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('apex-session-token', data.accessToken);
      localStorage.setItem('apex-refresh-token', data.refreshToken);
      localStorage.setItem('apex-user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (error) {
      setMemoryToken(null);
      setAccessToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('apex-refresh-token');
    if (refreshToken) {
      authService.logout(refreshToken).catch((err) => {
        console.error('Failed backend session logout:', err);
      });
    }
    setMemoryToken(null);
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('apex-session-token');
    localStorage.removeItem('apex-refresh-token');
    localStorage.removeItem('apex-user');
    router.replace('/login');
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
