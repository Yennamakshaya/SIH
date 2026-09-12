import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface UserSession {
  token: string;
  role: 'farmer' | 'buyer' | 'admin';
  user_id: number;
  name: string;
}

interface AuthContextType {
  user: UserSession | null;
  login: (token: string, role: 'farmer' | 'buyer' | 'admin', user_id: number, name: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('kisanlink_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [user]);

  const login = (token: string, role: 'farmer' | 'buyer' | 'admin', user_id: number, name: string) => {
    const session: UserSession = { token, role, user_id, name };
    setUser(session);
    localStorage.setItem('kisanlink_session', JSON.stringify(session));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kisanlink_session');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
