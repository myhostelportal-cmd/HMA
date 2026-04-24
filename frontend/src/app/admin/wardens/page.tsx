'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { Users, Loader2, Mail, Phone, Trash2, Home } from 'lucide-react';

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
                <Card className="hover:scale-[1.02] transition-transform duration-300 cursor-pointer group relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-violet-600 transition-colors">{warden.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warden ID: #{warden.warden_id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, warden.warden_id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail size={16} className="text-slate-400 group-hover:text-violet-500 transition-colors duration-300" />
                      <p className="text-sm font-medium">{warden.email}</p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone size={16} className="text-slate-400 group-hover:text-violet-500 transition-colors duration-300" />
                      <p className="text-sm font-medium">{warden.phone || 'N/A'}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mt-1 uppercase tracking-widest">Operational</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl group-hover:bg-violet-50 transition-colors duration-300">
                          <Home size={14} className="text-slate-400 group-hover:text-violet-600 transition-colors" />
                          <span className="text-xs font-bold text-slate-700">View Details</span>
                        </div>
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
