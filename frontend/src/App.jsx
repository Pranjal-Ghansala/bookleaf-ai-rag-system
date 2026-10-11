import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import AuthorDashboard from './components/AuthorDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  return <AuthorDashboard token={token} user={user} onLogout={handleLogout} />;
}