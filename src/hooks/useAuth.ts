import { useState, useEffect, useCallback } from 'react';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'employee';
  employeeType?: string;
  position?: string;
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = useCallback((userData: User, jwtToken: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', jwtToken);
    setUser(userData);
    setToken(jwtToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }, []);

  // Auto logout on inactivity (30 min)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => logout(), 30 * 60 * 1000);
    };
    if (token) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keypress', resetTimer);
      resetTimer();
    }
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [token, logout]);

  return { user, token, login, logout, isAuthenticated: !!token };
};

export default useAuth;
