import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create a configured Axios instance
export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Set default headers for all requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      
      // If we have a token but no user, we could fetch the profile here.
      // For this minimal app, user is set during login/register.
      // But let's try to fetch if we only have a token (page refresh).
      if (!user) {
        // Try to decode or fetch profile depending on what the backend supports.
        // The backend has /api/student/profile, but no generic profile route yet.
        // We'll rely on login/register to set the user object for now, or clear token if it fails.
      }
      setLoading(false);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = (userData, jwtToken) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
    localStorage.setItem('token', jwtToken);
    setUser(userData);
    setToken(jwtToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
