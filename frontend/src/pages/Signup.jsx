import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Signup({ onSignup, loading = false, error = null }) {
  const [vendorName, setVendorName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!vendorName.trim()) {
      newErrors.vendorName = 'Vendor name is required';
    } else if (vendorName.trim().length < 2) {
      newErrors.vendorName = 'Vendor name must be at least 2 characters';
    } else if (vendorName.trim().length > 100) {
      newErrors.vendorName = 'Vendor name must be less than 100 characters';
    }

    if (!ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    } else if (ownerName.trim().length < 2) {
      newErrors.ownerName = 'Owner name must be at least 2 characters';
    } else if (ownerName.trim().length > 100) {
      newErrors.ownerName = 'Owner name must be less than 100 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email format is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and digit';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || !onSignup) return;

    await onSignup({
      vendor_name: vendorName.trim(),
      owner_name: ownerName.trim(),
      email: email.trim(),
      password
    });
  };

  return (
    <form onSubmit={submit}>
      <h2 className="text-lg font-bold mb-4">Create Account</h2>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Vendor Name</label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className={`w-full mb-1 mt-1 px-3 py-2 border rounded ${
              errors.vendorName ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="Enter vendor name"
            required
          />
          {errors.vendorName && (
            <div className="text-xs text-red-600 mt-1">{errors.vendorName}</div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Owner Name</label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={`w-full mb-1 mt-1 px-3 py-2 border rounded ${
              errors.ownerName ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="Enter owner name"
            required
          />
          {errors.ownerName && (
            <div className="text-xs text-red-600 mt-1">{errors.ownerName}</div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full mb-1 mt-1 px-3 py-2 border rounded ${
              errors.email ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="you@example.com"
            required
          />
          {errors.email && (
            <div className="text-xs text-red-600 mt-1">{errors.email}</div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full mb-1 mt-1 px-3 py-2 border rounded ${
                errors.password ? 'border-red-500' : 'border-slate-300'
              }`}
              placeholder="Create password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <div className="text-xs text-red-600 mt-1">{errors.password}</div>
          )}
          <div className="text-xs text-slate-500 mt-1">
            Must be at least 8 characters with uppercase, lowercase, and digit
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-3 mt-3">{String(error)}</div>}

      <button
        data-action="primary"
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 text-white py-2 rounded font-semibold mt-4"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}