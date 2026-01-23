import { useEffect } from 'react';
import { useAuth } from './useAuth';
import axios from 'axios';

export function useTokenValidation() {
  const { logout } = useAuth();

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      try {
        // Token ni server da tekshirish
        await axios.get('/api/auth/verify');
        console.log('✅ Token valid');
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.log('❌ Token invalid - logging out');
          logout();
        }
      }
    };

    // Sahifa yuklanganda token ni tekshirish
    validateToken();

    // Har 5 daqiqada token ni tekshirish
    const interval = setInterval(validateToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [logout]);
}