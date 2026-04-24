'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit2, 
  UserX, 
  Mail, 
  Phone, 
  Calendar,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const AdminsPage = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Super Admin',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admin-mgmt');
      setAdmins(res.data);
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin-mgmt', formData);
      setSuccess('Admin created successfully!');
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', role: 'Super Admin', phone: '' });
      fetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/admin-mgmt/${selectedAdmin.admin_id}`, {
        name: selectedAdmin.name,
        email: selectedAdmin.email,
        role: 'Super Admin',
        status: selectedAdmin.status,
        phone: selectedAdmin.phone
      });
      setSuccess('Admin updated successfully!');
      setShowEditModal(false);
      fetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAdmin = async (id: number) => {
    if (!confirm('Are you sure you want to disable this admin? They will no longer be able to log in.')) return;
    try {
      await api.patch(`/admin-mgmt/${id}/disable`);
      setSuccess('Admin disabled successfully!');
      fetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable admin');
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!confirm('Send a password reset link to this admin?')) return;
    try {
      await api.post(`/admin-mgmt/${id}/reset-password`);
      setSuccess('Password reset link sent!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset link');
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="admin" />
      
      <main className="flex-1 p-6 md:p-8 pt-24 md:pt-8 overflow-y-auto relative">
        {/* Success Alert */}
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-8 right-8 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
            >
              <CheckCircle2 size={20} />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                <ShieldCheck className="text-white" size={24} />
              </div>
              Admin Management
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Manage system administrators and their account status.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-slate-900/10 active:scale-95 group"
          >
            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
            Add New Admin
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white border-transparent shadow-sm">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Total Admins</p>
            <p className="text-3xl font-black text-slate-900">{admins.length}</p>
          </Card>
          <Card className="bg-white border-transparent shadow-sm">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Active</p>
            <p className="text-3xl font-black text-emerald-600">{admins.filter(a => a.status === 'active').length}</p>
          </Card>
          <Card className="bg-white border-transparent shadow-sm">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Disabled</p>
            <p className="text-3xl font-black text-rose-600">{admins.filter(a => a.status === 'disabled').length}</p>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 relative">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search admins by name or email..."
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[24px] font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Admin Table */}
        <Card className="p-0 overflow-hidden border-transparent shadow-xl shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin.admin_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner">
                          {admin.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-base">{admin.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: #{admin.admin_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={14} className="text-slate-300" />
                        <span className="text-sm font-bold">{admin.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        admin.status === 'active' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          admin.status === 'active' ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        {admin.status}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedAdmin(admin); setShowViewModal(true); }}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <Eye size={20} />
                        </button>
                        <button 
                          onClick={() => { setSelectedAdmin({...admin}); setShowEditModal(true); }}
                          className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="Edit Admin"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button 
                          onClick={() => handleDisableAdmin(admin.admin_id)}
                          disabled={admin.status === 'disabled'}
                          className={cn(
                            "p-2.5 rounded-xl transition-all",
                            admin.status === 'disabled' 
                              ? "text-slate-200 cursor-not-allowed" 
                              : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          )}
                          title="Disable Admin"
                        >
                          <UserX size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAdmins.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} />
              </div>
              <p className="text-slate-500 font-bold">No admins found matching your search.</p>
            </div>
          )}
        </Card>

        {/* Add Admin Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl p-10 relative z-10 border border-slate-100"
              >
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Add New Admin</h2>
                <p className="text-slate-500 font-medium mb-8">Create a new system administrator account.</p>

                {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                  <AlertTriangle size={18} /> {error}
                </div>}

                <form onSubmit={handleAddAdmin} className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Apoorv"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        required
                        type="email" 
                        placeholder="admin@example.com"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                      <input 
                        required
                        type="password" 
                        placeholder="••••••••"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    disabled={saving}
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                    Create Admin Account
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Admin Modal */}
        <AnimatePresence>
          {showEditModal && selectedAdmin && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEditModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl p-10 relative z-10 border border-slate-100"
              >
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Edit Admin</h2>
                <p className="text-slate-500 font-medium mb-8">Update administrative details for {selectedAdmin.name}.</p>

                {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-bold flex items-center gap-2">
                  <AlertTriangle size={18} /> {error}
                </div>}

                <form onSubmit={handleUpdateAdmin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                      value={selectedAdmin.name}
                      onChange={(e) => setSelectedAdmin({...selectedAdmin, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                      value={selectedAdmin.email}
                      onChange={(e) => setSelectedAdmin({...selectedAdmin, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Account Status</label>
                    <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                      <button
                        type="button"
                        onClick={() => setSelectedAdmin({...selectedAdmin, status: 'active'})}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                          selectedAdmin.status === 'active' 
                            ? "bg-white text-emerald-600 shadow-sm" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAdmin({...selectedAdmin, status: 'disabled'})}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                          selectedAdmin.status === 'disabled' 
                            ? "bg-white text-rose-600 shadow-sm" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <button 
                      type="button"
                      onClick={() => handleResetPassword(selectedAdmin.admin_id)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm transition-colors group"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Key size={16} />
                      </div>
                      Reset Admin Password
                    </button>
                  </div>

                  <button 
                    disabled={saving}
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Edit2 size={20} />}
                    Update Admin Details
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* View Admin Modal */}
        <AnimatePresence>
          {showViewModal && selectedAdmin && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowViewModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl p-10 relative z-10 border border-slate-100"
              >
                <button 
                  onClick={() => setShowViewModal(false)} 
                  className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
                
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center font-black text-4xl shadow-inner">
                    {selectedAdmin.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">{selectedAdmin.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                        selectedAdmin.status === 'active' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {selectedAdmin.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Address</p>
                      <p className="font-bold text-slate-900">{selectedAdmin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Account Created</p>
                      <p className="font-bold text-slate-900">{new Date(selectedAdmin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleResetPassword(selectedAdmin.admin_id)}
                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                  >
                    <Key size={20} />
                    Send Password Reset Link
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setShowViewModal(false); setShowEditModal(true); }}
                      className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black py-4 rounded-2xl transition-all"
                    >
                      <Edit2 size={18} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDisableAdmin(selectedAdmin.admin_id)}
                      disabled={selectedAdmin.status === 'disabled'}
                      className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-4 rounded-2xl transition-all disabled:opacity-50"
                    >
                      <UserX size={18} /> Disable
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
};

export default AdminsPage;
