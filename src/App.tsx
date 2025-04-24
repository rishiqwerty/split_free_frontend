import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import GroupPage from './components/GroupPage';
import Login from './components/Login';
import HomePage from './components/HomePage';
import './App.css';
import JoinGroupPopup from './components/JoinGroupPopup';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          if (location.pathname !== '/login' && !location.pathname.includes('/join')) {
            localStorage.setItem('previousUrl', location.pathname);
            navigate('/login');
          }
          setIsLoading(false);
          return;
        }

        // const response = await fetch(`${API_URL}/api/auth/check/`, {
        //   credentials: 'include',
        //   headers: {
        //     'Authorization': `Token ${token}`,
        //   },
        // });
        
        // if (!response.ok) {
        //   if (window.location.pathname !== '/login' && response.status === 401) {
        //     localStorage.removeItem('authToken');
        //     navigate('/login');
        //   }
        // }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      {/* Inject randomBounce keyframes to enable unique motion per character */}
      <style>{`
        @keyframes randomBounce {
          0%, 100% { transform: translate(0,0) rotate(0deg); }
          50% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)); }
        }
      `}</style>
      <div className="background-animation">
        {Array.from({ length: 9 }).map((_, index) => {
          const chars = 'SplitFree'.toUpperCase();
          const randomChar = chars[Math.floor(Math.random() * chars.length)];
          const colors = ['var(--accent-color)','black'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const top = Math.random() * 100;
          const left = Math.random() * 100;
          const tx = (Math.random() * 100 - 50) + 'vw';
          const ty = (Math.random() * 100 - 50) + 'vh';
          const rotation = (Math.random() * 360 - 180) + 'deg';
          const delay = Math.random() * 4;
          return (
            <span
              key={index}
              className="bouncing-char"
              style={({
                top: `${top}%`,
                left: `${left}%`,
                '--tx': tx,
                '--ty': ty,
                '--r': rotation,
                animation: `randomBounce 20s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                fontSize: '18rem',
                color
              } as any)}
            >
              {randomChar}
            </span>
          );
        })}
        {Array.from({ length: 10 }).map((_, i) => {
          const emojiList = ['💰','💵','💸','💲','₹','💎','💱',];
          const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
          const top = Math.random() * 100;
          const left = Math.random() * 100;
          const tx = (Math.random() * 100 - 50) + 'vw';
          const ty = (Math.random() * 100 - 50) + 'vh';
          const rotation = (Math.random() * 360 - 180) + 'deg';
          const delay = Math.random() * 4;
          return (
            <span
              key={`emoji-${i}`}
              className="money-emoji"
              style={({
                top: `${top}%`,
                left: `${left}%`,
                '--tx': tx,
                '--ty': ty,
                '--r': rotation,
                animation: `randomBounce 20s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                fontSize: '6rem'
              } as any)}
            >
              {emoji}
            </span>
          );
        })}
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/group/:groupId" element={<GroupPage />} />
        <Route path="/group/:uuid/join" element={<JoinGroupPopup />} />
      </Routes>
    </div>
  );
};

export default App;
