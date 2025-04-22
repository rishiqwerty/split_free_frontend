import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { API_URL } from '../config';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const idToken = await user.getIdToken();
      console.log('Firebase auth successful, calling backend API...');
      
      const response = await fetch(`${API_URL}/auth/google-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: idToken }),
        credentials: 'include',
      });

      console.log('Backend API response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        navigate('/group/1');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend authentication failed:', errorData);
        setError('Failed to authenticate with backend. Please try again.');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>SplitFree</h1>
        <p className="tagline">Split expenses, stay free</p>
        {error && <div className="error-message">{error}</div>}
        <button 
          className="google-btn" 
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            'Signing in...'
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Login; 