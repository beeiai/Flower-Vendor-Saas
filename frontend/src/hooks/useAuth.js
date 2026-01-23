/**
 * Authentication Hook
 * Manages user authentication state and provides login/logout functionality
 */
import { useState, useEffect, useCallback } from 'react';
import { authApi, getAuthToken, getUserData, setUserData, clearAuth, isAuthenticated } from '../utils/apiService';

export function useAuth() {
  const [user, setUser] = useState(() => getUserData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if authenticated
  const authenticated = Boolean(user);

  /**
   * Login user
   * @param {string} email
   * @param {string} password
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(email, password);
      
      // Decode token to get user info (basic JWT decode)
      if (response?.access_token) {
        // Store token already handled in authApi.login
        // Fetch current user from backend to validate token and populate user data
        try {
          const me = await authApi.me();
          if (me) {
            setUserData(me);
            setUser(me);
          } else {
            setUser({ authenticated: true });
          }
        } catch {
          // If /auth/me fails, clear any stored token
          clearAuth();
          setUser(null);
          throw new Error('Login succeeded but user fetch failed');
        }
      }

      return { success: true };
    } catch (err) {
      const message = err.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register new user
   * @param {Object} data - {vendor_id, name, email, password, role?}
   */
  const signup = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      await authApi.signup(data);
      return { success: true };
    } catch (err) {
      const message = err.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Sync with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getAuthToken();
      const userData = getUserData();
      if (!token) {
        setUser(null);
      } else if (userData) {
        setUser(userData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // On mount: if token exists, validate it by calling backend /auth/me
  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = getAuthToken();
      if (!token) return;
      setLoading(true);
      try {
        const me = await authApi.me();
        if (!mounted) return;
        if (me) {
          setUserData(me);
          setUser(me);
        } else {
          clearAuth();
          setUser(null);
        }
      } catch {
        // invalid token or network error -> treat as not authenticated
        clearAuth();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return {
    user,
    loading,
    error,
    authenticated,
    login,
    signup,
    logout,
    clearError,
  };
}

export default useAuth;
