import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

import { API_URL } from '../config/api';
const API_BASE_URL = API_URL;

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

interface User {
  id: number;
  username: string;
  role: 'owner' | 'staff' | 'manager' | 'admin' | 'quality_supervisor' | 'physical_supervisor' | 'inventory_staff' | 'financial_account';
  staffType?: 'mill' | 'location' | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Logout function (defined early so it can be used in interceptor)
  const logout = () => {
    setUser(null);
    setToken(null);

    // Remove from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Remove axios default authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);

        // Set axios default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  // Add axios response interceptor to handle 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token is invalid or expired
          console.error('Authentication error:', error.response?.data?.error);
          logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await axios.post('/auth/login', {
        username,
        password
      });

      const { token: newToken, user: newUser } = response.data as { token: string; user: User };

      setToken(newToken);
      setUser(newUser);

      // Store in localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      // Set axios default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};