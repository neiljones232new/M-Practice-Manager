'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, AuthResponse } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  portfolios: Array<number | '*'>;
  isActive: boolean;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const isAuthenticated = !!user;

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for demo mode first
      if (typeof window !== 'undefined') {
        const demoMode = sessionStorage.getItem('demoMode');
        const demoUser = sessionStorage.getItem('demoUser');
        
        if (demoMode === 'true' && demoUser) {
          setUser(JSON.parse(demoUser));
          setIsDemoMode(true);
          setIsLoading(false);
          return;
        }

        // Check for stored user
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await apiClient.login({ email, password, rememberMe });
      setUser(response.user);
      setIsDemoMode(false);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
  }) => {
    try {
      const response = await apiClient.register(data);
      setUser(response.user);
      setIsDemoMode(false);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setIsDemoMode(false);
      
      // Clear demo mode data
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('demoMode');
        sessionStorage.removeItem('demoUser');
      }
    }
  };

  const enterDemoMode = async () => {
    try {
      const response = await apiClient.getDemoUser();
      setUser(response.user);
      setIsDemoMode(true);
    } catch (error) {
      console.error('Demo mode failed:', error);
      throw error;
    }
  };

  const refreshAuth = async () => {
    try {
      if (isDemoMode) {
        // For demo mode, just refresh from session storage
        const demoUser = sessionStorage.getItem('demoUser');
        if (demoUser) {
          setUser(JSON.parse(demoUser));
        }
        return;
      }

      const response = await apiClient.refreshToken();
      setUser(response.user);
    } catch (error) {
      console.error('Auth refresh failed:', error);
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isDemoMode,
    login,
    register,
    logout,
    enterDemoMode,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}