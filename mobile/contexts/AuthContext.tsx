/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Manages user session and authentication status.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, isAuthenticated, getUser, logout as authLogout, getCurrentUser } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isAuth: boolean;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const authenticated = await isAuthenticated();
      setIsAuth(authenticated);
      
      if (authenticated) {
        // Try to get user from server first, fallback to local storage
        const serverUser = await getCurrentUser();
        if (serverUser) {
          setUser(serverUser);
        } else {
          // Fallback to local storage
          const localUser = await getUser();
          setUser(localUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuth(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    setIsAuth(true);
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuth(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setUser(userData);
        setIsAuth(true);
      } else {
        // If we can't get user, check auth status
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          setUser(null);
          setIsAuth(false);
        }
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuth,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
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

