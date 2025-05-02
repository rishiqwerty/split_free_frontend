import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import GroupPage from './components/GroupPage';
import Login from './components/Login';
import HomePage from './components/HomePage';
import './App.css';
import { API_URL } from './config';
import JoinGroupPopup from './components/JoinGroupPopup';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/health-check/`);
        setIsBackendOnline(response.ok);
        if (response.ok) {
          setCountdown(60); // Reset countdown when backend is up
        }
      } catch (error) {
        console.error('Backend health check failed:', error);
        setIsBackendOnline(false);
      }
    };

    const checkAuth = async () => {
      try {
        onAuthStateChanged(auth, (user) => {
          if (!user) {
            if (location.pathname !== '/login' && !location.pathname.includes('/join')) {
              localStorage.setItem('previousUrl', location.pathname);
              navigate('/login');
            }
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoading(false);
      }
    };

    checkBackendHealth();
    checkAuth();
  }, [location.pathname]);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isBackendOnline && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.reload();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isBackendOnline, countdown]);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isBackendOnline) {
    return (
      <div className="backend-offline">
        <div className="branding">
          <h1 className="app-title">SplitFree</h1>
          <p className="app-tagline">Split expenses, not friendships</p>
        </div>
        <img 
          src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGJhMWR5NXlscmZhNjJqc2RoN3I5MGxpbmxrZXM3MmV3N2hwdG5kNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/yaUG0KDAcIcWA/giphy.gif" 
          alt="Loading animation" 
          className="loading-gif"
        />
        <h2>Backend hamster warming up…. <b>{countdown} seconds</b> to showtime!</h2>
        <p>Backend Service is not up yet</p>
        <button onClick={() => window.location.reload()}>Retry Now</button>
      </div>
    );
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
