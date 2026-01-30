import React from 'react';
import Login from '../../pages/Login';

export default function AuthTabs() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded shadow">
        {/* Login header */}
        <div className="border-b border-slate-200">
          <div className="py-3 text-center font-semibold text-sm text-primary-600 border-b-2 border-primary-600">
            Login
          </div>
        </div>

        {/* Login Content */}
        <div className="p-6">
          <Login />
        </div>
      </div>
    </div>
  );
}