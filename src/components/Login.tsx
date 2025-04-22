import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { API_URL } from '../config';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/group/1');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Send the Firebase ID token to your backend
      const idToken = await user.getIdToken();
      const response = await fetch(`${API_URL}/auth/google-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: idToken }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Store the token in localStorage
        localStorage.setItem('authToken', data.token);
        navigate('/group/1');
      } else {
        console.error('Failed to authenticate with backend');
      }
    } catch (error) {
      console.error('Error during Google sign in:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>SplitFree</h1>
        <p className="tagline">Split expenses, stay free</p>
        <button className="google-btn" onClick={handleGoogleLogin}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default Login; 