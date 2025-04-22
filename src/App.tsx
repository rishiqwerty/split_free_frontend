import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import GroupPage from './components/GroupPage';
import Login from './components/Login';
import { API_URL } from './config';
import './App.css';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/check/`, {
          credentials: 'include',
        });
        if (!response.ok) {
          navigate('/login');
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
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/group/:groupId" element={<GroupPage />} />
    </Routes>
  );
};

export default App;
