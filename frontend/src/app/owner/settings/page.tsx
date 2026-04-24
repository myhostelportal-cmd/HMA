'use client';

import React, { useState, useEffect } from 'react';
import { useHostel } from '@/context/HostelContext';
import HostelSelector from '@/components/layout/HostelSelector';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2,
  Plus,
  Settings,
  ShieldCheck,
  CreditCard,
  User,
  LayoutGrid,
  CheckCircle2,
  X,
  MapPin,
  DoorOpen,
  Info,
  ChevronRight,
  UserCog,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const { selectedHostel, hostels } = useHostel();
  const [loading, setLoading] = useState(false);
  const [showAddHostel, setShowAddHostel] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Add Hostel Form State
  const [formData, setFormData] = useState({
    hostel_name: '',
    total_rooms: '',
    address: '',
    warden_id: ''
  });

  const [availableWardens, setAvailableWardens] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    const fetchWardens = async () => {
      try {
        const res = await api.get('/owner/wardens');
        setAvailableWardens(res.data);
      } catch (err) {
        console.error('Error fetching wardens:', err);
      }
    };
    fetchWardens();
  }, []);

  const handleAddHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/hostels', { ...formData, owner_id: user.id });
      setShowAddHostel(false);
      setFormData({ hostel_name: '', total_rooms: '', address: '', warden_id: '' });
      window.location.reload(); 
    } catch (err) {
      console.error('Error adding hostel:', err);
      alert('Failed to add hostel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="px-4 md:px-8 py-4 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 gap-4 bg-[#FDFDFF]/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Portfolio Settings</h1>
          <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Configure Units & Assignments</p>
        </div>
        <div className="flex items-center gap-4">
          <HostelSelector />
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            {user?.name?.charAt(0) || 'C'}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24 space-y-10 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          {/* LEFT COLUMN: HOSTEL LIST */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Home size={18} className="text-indigo-600" />
                <h2 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest">Active Portfolio</h2>
              </div>
              <button 
                onClick={() => setShowAddHostel(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl md:rounded-2xl px-3 md:px-5 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
              >
                <Plus size={12} />
                <span className="hidden sm:inline">Add Hostel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {hostels.map((hostel, idx) => (
                <motion.div
                  key={hostel.hostel_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] group hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500"
                >
                  <div className="flex justify-between items-start mb-6 md:mb-8">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all duration-500">
                      <Home strokeWidth={1.5} size={24} />
                    </div>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Settings size={16} />
                    </button>
                  </div>

                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight group-hover:text-indigo-800 transition-colors">{hostel.hostel_name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 mt-1 mb-8 md:mb-10">
                    <MapPin size={12} />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">{hostel.address}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-6 md:gap-8 pt-6 md:pt-8 border-t border-slate-50">
                    <div>
                      <p className="text-slate-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest">Warden</p>
                      <p className="text-[10px] md:text-xs font-black text-slate-700 mt-1 uppercase truncate">{availableWardens.find(w => w.hostel_name === hostel.hostel_name)?.warden_name || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest">Capacity</p>
                      <p className="text-xs md:text-sm font-black text-slate-900 mt-1">{hostel.calculated_capacity || ((hostel.total_rooms || 0) * 2)} Seats</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: PERMISSIONS */}
          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-8 md:mb-10">
                <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                  <ShieldCheck className="text-white" size={18} />
                </div>
                <h2 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest">Captain Permissions</h2>
              </div>
              <div className="space-y-3 md:space-y-4">
                {[
                  { label: 'View Analytics', status: true },
                  { label: 'Enter Expenses', status: true },
                  { label: 'Audit Reports', status: true },
                  { label: 'Manage Hostels', status: true },
                  { label: 'Change Fees', status: false },
                  { label: 'Bulk Student SMS', status: false },
                ].map((perm, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-50 transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 group">
                    <span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{perm.label}</span>
                    <div className={cn(
                      "w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center transition-all",
                      perm.status ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-300"
                    )}>
                      {perm.status ? <CheckCircle2 size={12} /> : <X size={10} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADD HOSTEL MODAL */}
      <AnimatePresence>
        {showAddHostel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddHostel(false)}
              className="absolute inset-0 bg-[#1E293B]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[#F1F5F9] flex items-center justify-between">
                <h2 className="text-lg font-black text-[#1E293B] tracking-tight">Add New Hostel</h2>
                <button onClick={() => setShowAddHostel(false)} className="text-[#94A3B8] hover:text-[#DC2626] transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddHostel} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Hostel Name</label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g., Captains Palace"
                    value={formData.hostel_name}
                    onChange={(e) => setFormData({...formData, hostel_name: e.target.value})}
                    className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Total Rooms</label>
                    <div className="relative">
                      <DoorOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                      <input 
                        required
                        type="number"
                        placeholder="0"
                        value={formData.total_rooms}
                        onChange={(e) => setFormData({...formData, total_rooms: e.target.value})}
                        className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Assign Warden</label>
                    <select 
                      required
                      value={formData.warden_id}
                      onChange={(e) => setFormData({...formData, warden_id: e.target.value})}
                      className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all appearance-none"
                    >
                      <option value="">Select Warden</option>
                      {availableWardens.map(w => (
                        <option key={w.warden_id} value={w.warden_id}>{w.warden_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Location</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="Full address..."
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Initialize Unit
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;