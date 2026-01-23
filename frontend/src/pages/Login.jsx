import React, { useState } from 'react';

export default function Login({ onLogin, loading = false, error = null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!onLogin) return;
    await onLogin(email.trim(), password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded shadow p-6">
        <h2 className="text-lg font-bold mb-4">Sign in</h2>

        <label className="text-xs font-semibold text-slate-600">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mb-3 mt-1 px-3 py-2 border rounded" placeholder="you@example.com" required />

        <label className="text-xs font-semibold text-slate-600">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mb-4 mt-1 px-3 py-2 border rounded" placeholder="Password" required />

        {error && <div className="text-sm text-red-600 mb-3">{String(error)}</div>}

        <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-2 rounded font-semibold">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
