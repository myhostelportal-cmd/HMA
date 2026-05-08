'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { Users, Loader2, Phone, Trash2, Building2, User, ChevronRight } from 'lucide-react';

const AdminWardens = () => {
  const [wardens, setWardens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWardens = async () => {
    try {
      const res = await api.get('hostels/wardens');
      setWardens(res.data);
    } catch (err) {
      console.error('Error fetching wardens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardens();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
     e.preventDefault();
     e.stopPropagation();
     if (window.confirm('Are you sure you want to delete this warden? All hostels assigned to this warden will show "No Warden Assigned".')) {
       try {
         await api.delete(`hostels/warden/${id}`);
         await fetchWardens();
       } catch (err) {
         alert('Error deleting warden');
       }
     }
   };

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
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hostel Wardens</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage and view all registered hostel wardens.</p>
        </header>

        {wardens.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No wardens found</p>
            <p className="text-slate-400 text-sm mt-1">Go to Management to create your first warden.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wardens.map((warden) => (
              <Link key={warden.warden_id} href={`/admin/wardens/${warden.warden_id}`}>
                <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden border-slate-200/60 p-0">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                          <Users size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-violet-600 transition-colors">{warden.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warden ID: #{warden.warden_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => handleDelete(e, warden.warden_id)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                        <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-all">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Building2 size={12} className="text-violet-500" />
                          <span>Assigned Hostel</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {warden.assigned_hostel || 'Not Assigned'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <User size={12} className="text-violet-500" />
                          <span>Hostel Owner</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {warden.owner_name || 'Not Assigned'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          <Phone size={12} className="text-violet-500" />
                          <span>Contact Number</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{warden.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminWardens;
