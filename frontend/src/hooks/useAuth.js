import { useState, useCallback, useEffect } from 'react';
import { authApi, getAuthToken, getUserData, setUserData, clearAuth } from '../utils/apiService';

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
   * Logout user
   */
  const logout = useCallback(() => {
    authApi.logout();
    // Clear master admin flag if it exists
    localStorage.removeItem('skfs_master_admin');
    setUser(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Master admin login
   */
  const masterLogin = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.masterLogin({ username, password });
      
      // Master login returns a token but doesn't set user data
      // The master admin can then create vendors
      if (response?.access_token) {
        // Token is already stored in authApi.masterLogin
        return { success: true, role: response.role };
      }

      return { success: true };
    } catch (err) {
      const message = err.message || 'Master login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create vendor as master admin
   */
  const createVendor = useCallback(async (vendorData) => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await authApi.createVendor(vendorData, token);
      
      return { success: true, data: response };
    } catch (err) {
      const message = err.message || 'Create vendor failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Change master password
   */
  const changeMasterPassword = useCallback(async (oldPassword, newPassword) => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await authApi.changeMasterPassword({
        old_password: oldPassword,
        new_password: newPassword
      }, token);
      
      return { success: true, data: response };
    } catch (err) {
      const message = err.message || 'Change password failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
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
  // Skip validation for master admin tokens
  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = getAuthToken();
      const isMasterAdmin = localStorage.getItem('skfs_master_admin') === 'true';
      
      if (!token) return;
      
      // If this is a master admin session, don't validate with /auth/me
      // Master admin has different endpoints and token structure
      if (isMasterAdmin) {
        // Set a minimal user object to indicate master admin authentication
        setUser({ role: 'MASTER_ADMIN', authenticated: true });
        return;
      }
      
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
    logout,
    clearError,
    masterLogin,
    createVendor,
    changeMasterPassword,
  };
}

export default useAuth;