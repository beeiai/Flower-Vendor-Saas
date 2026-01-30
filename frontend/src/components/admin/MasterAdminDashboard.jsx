import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Building, Mail, Lock, Phone, UserCheck, Shield, Settings2, Edit2 } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import CreateUserModal from './CreateUserModal';

export default function MasterAdminDashboard({ onLogout }) {
  const [formData, setFormData] = useState({
    vendorName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [vendors, setVendors] = useState([]);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('skfs_auth_token');
      
      const response = await fetch('http://localhost:8000/api/admin/create-vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendor_name: formData.vendorName,
          owner_name: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Vendor created successfully! Vendor ID: ${result.vendor_id}, Email: ${result.admin_email}`
        });
        // Reset form
        setFormData({
          vendorName: '',
          ownerName: '',
          email: '',
          phone: '',
          password: ''
        });
        // Refresh vendors list
        fetchVendors();
      } else {
        setMessage({
          type: 'error',
          text: result.detail || 'Failed to create vendor'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    setVendorsLoading(true);
    try {
      const token = localStorage.getItem('skfs_auth_token');
      const isMasterAdmin = localStorage.getItem('skfs_master_admin') === 'true';
      
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      if (!isMasterAdmin) {
        console.error('Not a master admin session');
        return;
      }
      
      const response = await fetch('http://localhost:8000/api/admin/vendors', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setVendors(result);
      } else {
        console.error('Failed to fetch vendors:', response.status);
        // If unauthorized, maybe token expired - log out user
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          onLogout();
        }
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setVendorsLoading(false);
    }
  };

  const openChangePasswordModal = (vendor) => {
    setSelectedVendor(vendor);
    setShowChangePasswordModal(true);
  };

  const openCreateUserModal = (vendor) => {
    setSelectedVendor(vendor);
    setShowCreateUserModal(true);
  };

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false);
    setSelectedVendor(null);
  };

  const handleUserCreated = () => {
    // Refresh vendors list to show the new user
    fetchVendors();
    closeCreateUserModal();
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-400" /> Master Admin Dashboard
        </h1>
        <button 
          onClick={onLogout} 
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          data-enter-index="6"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Create Vendor Section */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Building className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-slate-800">Create New Vendor</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vendor Name *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      name="vendorName"
                      value={formData.vendorName}
                      onChange={handleChange}
                      required
                      minLength={2}
                      maxLength={100}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter vendor name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Owner Name *
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      required
                      minLength={2}
                      maxLength={100}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter owner name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="owner@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Minimum 8 characters with uppercase, lowercase, and digit"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Password must be at least 8 characters with uppercase, lowercase, and digit
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-sm font-semibold shadow-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Vendor...' : 'Create Vendor Account'}
                </button>
              </div>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
          </div>

          {/* Vendors List Section */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-slate-800">Existing Vendors</h2>
              </div>
              <button 
                onClick={fetchVendors}
                className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-sm hover:bg-slate-200 transition-colors"
                disabled={vendorsLoading}
              >
                {vendorsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {vendorsLoading ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Loading vendors...</p>
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No vendors created yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700">ID</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Vendor Name</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Owner Name</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Phone</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Created</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {vendors.map((vendor) => (
                      <React.Fragment key={vendor.id}>
                        <tr className="hover:bg-slate-50 bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-600 font-bold">{vendor.id}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{vendor.name}</td>
                          <td className="px-4 py-3 text-slate-600">{vendor.owner_name}</td>
                          <td className="px-4 py-3 text-slate-600">{vendor.email}</td>
                          <td className="px-4 py-3 text-slate-600">{vendor.phone || '--'}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(vendor.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              <button
                                onClick={() => openCreateUserModal(vendor)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Add User
                              </button>
                              <button
                                onClick={() => openChangePasswordModal(vendor)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                                Change Password
                              </button>
                            </div>
                          </td>
                        </tr>
                        {vendor.users && vendor.users.length > 0 && (
                          <tr>
                            <td colSpan="7" className="px-4 py-2 bg-white">
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-700 mb-2">Users:</div>
                                <div className="space-y-1">
                                  {vendor.users.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded border">
                                      <div className="flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-slate-500" />
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-slate-500">({user.email})</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                          {user.role}
                                        </span>
                                        {!user.is_active && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-700">
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        Created: {new Date(user.created_at).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-sm">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Master Admin Dashboard</h3>
                  <p className="text-sm text-blue-700">
                    Use this interface to create new vendor accounts and manage existing vendors. 
                    Each vendor will receive their own login credentials and can manage their data independently.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && selectedVendor && (
        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={closeCreateUserModal}
          vendor={selectedVendor}
          onCreateUser={handleUserCreated}
        />
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && selectedVendor && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => {
            setShowChangePasswordModal(false);
            setSelectedVendor(null);
          }}
          vendorId={selectedVendor.id}
          vendorEmail={selectedVendor.email}
        />
      )}
    </div>
  );
}