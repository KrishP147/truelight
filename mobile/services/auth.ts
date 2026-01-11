/**
 * Authentication Service
 * 
 * Handles user authentication (login, register, logout)
 * Stores JWT token securely using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

const TOKEN_KEY = '@delta:auth_token';
const USER_KEY = '@delta:user';

export interface User {
  id: number;
  email: string;
  username: string;
  colorblind_type: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const result: AuthResponse = await response.json();
  
  // Store token and user data
  await AsyncStorage.setItem(TOKEN_KEY, result.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user));

  return result;
}

/**
 * Login with email/username and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const result: AuthResponse = await response.json();
  
  // Store token and user data
  await AsyncStorage.setItem(TOKEN_KEY, result.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user));

  return result;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    const token = await getToken();
    if (token) {
      // Call logout endpoint to invalidate session
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with local cleanup even if API call fails
  } finally {
    // Clear local storage
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }
}

/**
 * Get stored authentication token
 */
export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user data
 */
export async function getUser(): Promise<User | null> {
  const userStr = await AsyncStorage.getItem(USER_KEY);
  if (!userStr) return null;
  return JSON.parse(userStr) as User;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;

  try {
    // Verify token is still valid by calling /api/auth/me
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      // Update stored user data
      if (result.user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user));
      }
      return true;
    } else {
      // Token is invalid, clear it
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

/**
 * Get current user info from server
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const user = result.user as User;
    
    // Update stored user data
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

