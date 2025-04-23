import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import GroupPage from './components/GroupPage';
import Login from './components/Login';
import HomePage from './components/HomePage';
import { API_URL } from './config';
import './App.css';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          if (window.location.pathname !== '/login') {
            navigate('/login');
          }
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/check/`, {
          credentials: 'include',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });
        
        if (!response.ok) {
          if (window.location.pathname !== '/login' && response.status === 401) {
            localStorage.removeItem('authToken');
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/group/:groupId" element={<GroupPage />} />
    </Routes>
  );
};

export default App;
