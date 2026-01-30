import React, { useState } from 'react';
import { authApi } from '../utils/apiService';

export default function Login({ onLogin, loading: propLoading = false, error: propError = null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  
  const submit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setLocalError(null);
    
    try {
      // Use the proper auth API service
      await authApi.login(email, password);
      
      // Redirect to main app
      window.location.href = '/';
    } catch (error) {
      setLocalError(error.message || 'Login failed');
    } finally {
      setLocalLoading(false);
    }
  };
  
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    
    try {
      // Use the proper auth API service
      const data = await authApi.masterLogin({
        username: adminUsername,
        password: adminPassword,
      });
      
      // Store the master admin token
      localStorage.setItem('skfs_auth_token', data.access_token);
      localStorage.setItem('skfs_master_admin', 'true');
      
      // Show success and close modal
      alert('Master admin login successful!');
      setShowAdminModal(false);
      
      // Refresh the page to allow the app to recognize the new admin token
      window.location.reload();
    } catch (error) {
      setLocalError(error.message || 'Login failed');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1920&h=1080&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute top-4 right-4">
        <button 
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-medium"
          onClick={() => setShowAdminModal(true)}
        >
          Admin
        </button>
      </div>
      
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>
        
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              placeholder="you@example.com" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              placeholder="••••••••" 
              required 
            />
          </div>

          {(propError || localError) && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{String(propError || localError)}</div>}

          <button 
            data-action="primary"
            type="submit" 
            disabled={localLoading} 
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      
      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Master Admin Login</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowAdminModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input 
                  type="text" 
                  value={adminUsername} 
                  onChange={e => setAdminUsername(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                  placeholder="Admin username" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input 
                  type="password" 
                  value={adminPassword} 
                  onChange={e => setAdminPassword(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                  placeholder="Admin password" 
                  required 
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAdminModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  data-action="primary"
                  type="submit" 
                  disabled={adminLoading}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adminLoading ? 'Logging in…' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
