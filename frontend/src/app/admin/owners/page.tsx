'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { UserCog, Loader2, Mail, Users, Building2, Trash2, Home } from 'lucide-react';

const AdminOwners = () => {
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOwners = async () => {
    try {
      const res = await api.get('hostels/owners');
      setOwners(res.data);
    } catch (err) {
      console.error('Error fetching owners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
     e.preventDefault();
     e.stopPropagation();
     if (window.confirm('Are you sure you want to delete this owner? All hostels assigned to this owner will show "No Owner Assigned".')) {
       try {
         await api.delete(`hostels/owner/${id}`);
         await fetchOwners();
       } catch (err) {
         alert('Error deleting owner');
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hostel Owners</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage and view all registered hostel owners.</p>
        </header>

        {owners.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <UserCog size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No owners found</p>
            <p className="text-slate-400 text-sm mt-1">Go to Management to create your first owner.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {owners.map((owner) => (
              <Link key={owner.owner_id} href={`/admin/owners/${owner.owner_id}`}>
                <Card className="hover:scale-[1.02] transition-transform duration-300 cursor-pointer group relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <UserCog size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{owner.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner ID: #{owner.owner_id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, owner.owner_id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-300" />
                      <p className="text-sm font-medium">{owner.email}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 mt-1">Active</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors duration-300">
                          <Home size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                          <span className="text-xs font-bold text-slate-700">View Hostels</span>
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

export default AdminOwners;
