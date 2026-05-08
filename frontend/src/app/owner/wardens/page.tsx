'use client';

import React, { useState, useEffect } from 'react';
import { useHostel } from '@/context/HostelContext';
import HostelSelector from '@/components/layout/HostelSelector';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { 
  Loader2,
  User,
  Phone,
  Mail,
  TrendingUp,
  ShieldCheck,
  MoreVertical,
  Activity,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WardensPage = () => {
  const { selectedHostel } = useHostel();
  const [wardens, setWardens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    const fetchWardens = async () => {
      setLoading(true);
      try {
        const res = await api.get('/owner/wardens');
        setWardens(res.data);
      } catch (err) {
        console.error('Error fetching wardens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWardens();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="px-4 md:px-8 py-4 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 gap-4 bg-[#FDFDFF]/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Warden Management</h1>
          <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Staff Performance & Assignments</p>
        </div>
        <div className="flex items-center gap-3 pl-6">
          <div className="text-right">
            <p className="text-sm font-black text-slate-900 leading-none">{user?.name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Owner</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            <User size={20} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 space-y-8">
        {/* WARDEN CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {wardens.map((warden, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full overflow-hidden group"
            >
              <div className="p-8 pb-4 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500">
                    <User size={32} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500",
                      warden.status === 'Active' 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500" 
                        : "bg-slate-50 text-slate-500 border-slate-100"
                    )}>
                      {warden.status}
                    </span>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1 group-hover:text-indigo-800 transition-all truncate">
                  {warden.warden_name}
                </h3>
                <div className="flex items-center gap-2 text-indigo-600 mb-8 bg-indigo-50/50 px-3 py-1.5 rounded-xl w-fit border border-indigo-100/50">
                  <Home size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{warden.hostel_name}</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <Phone size={14} />
                    </div>
                    <span className="text-xs font-bold">{warden.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <Mail size={14} />
                    </div>
                    <span className="text-xs font-bold truncate">{warden.email}</span>
                  </div>
                </div>
              </div>

              {/* COLLECTION STAT */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 group-hover:bg-white transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fee Collection</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">
                      ₹{parseFloat(warden.collection || '0').toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 ml-2">
                      ({warden.total_fees > 0 ? Math.round((warden.collection / warden.total_fees) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden group-hover:bg-slate-100 transition-colors">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${warden.total_fees > 0 ? Math.min(100, (warden.collection / warden.total_fees) * 100) : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* ADD WARDEN PLACEHOLDER */}
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/10 transition-all min-h-[300px]">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 group-hover:scale-110 group-hover:bg-white group-hover:shadow-lg transition-all">
              <ShieldCheck size={32} strokeWidth={1.5} className="text-slate-300 group-hover:text-indigo-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Staff Management</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-[200px]">
              Warden assignments are managed by the Admin system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WardensPage;
