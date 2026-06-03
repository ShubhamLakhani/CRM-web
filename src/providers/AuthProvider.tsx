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

  // Restore session from API on mount/refresh
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      // If we already have an in-memory access token, we don't need to restore/refresh again
      if (accessToken) {
        setIsLoading(false);
        return;
      }

      const persistedUser = localStorage.getItem('apex-user');

      if (persistedUser) {
        try {
          // Pre-populate user to prevent UI flicker
          try {
            setUser(JSON.parse(persistedUser));
          } catch (e) {}

          // Call the cookie-based refresh to obtain access token
          const data = await authService.refresh();
          if (!active) return;

          setMemoryToken(data.accessToken);
          setAccessToken(data.accessToken);
          setUser(data.user);
          localStorage.setItem('apex-user', JSON.stringify(data.user));

          // If they land on login page but have a valid session, go to dashboard
          if (pathname.startsWith('/login')) {
            router.replace('/dashboard');
          }
        } catch (error) {
          console.error('Session restoration failed:', error);
          if (!active) return;
          logout();
        }
      } else {
        // No session user, redirect if on protected route
        if (!pathname.startsWith('/login')) {
          router.replace('/login');
        }
      }
      if (active) {
        setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [pathname, accessToken]);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const data = await authService.login(credentials);
      setMemoryToken(data.accessToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('apex-user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (error) {
      setMemoryToken(null);
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('apex-user');
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
      localStorage.setItem('apex-user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (error) {
      setMemoryToken(null);
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('apex-user');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout().catch((err) => {
      console.error('Failed backend session logout:', err);
    });
    setMemoryToken(null);
    setAccessToken(null);
    setUser(null);
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
