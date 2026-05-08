'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { UserCog, Loader2, Users, Building2, Trash2, Home, BedDouble, GraduationCap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Owner ID: #{owner.owner_id}</p>
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
                    {/* Hostels + Students on the same row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="flex-shrink-0 text-indigo-500" />
                        <p className="text-sm font-medium whitespace-nowrap">Total Hostels: {owner.total_hostels || 0}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} className="flex-shrink-0 text-indigo-500" />
                        <p className="text-sm font-medium whitespace-nowrap">Total Students: {owner.total_students || 0}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                      {/* Capacity Section */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Capacity</p>
                        <div className="flex items-center gap-2">
                          <BedDouble size={14} className="text-indigo-400" />
                          <p className="text-sm font-bold text-slate-900">{owner.total_capacity || 0} Seats</p>
                        </div>
                      </div>
                      
                      {/* Status Section */}
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</p>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                          owner.status === 'disabled' 
                            ? "bg-red-50 text-red-600 border border-red-100" 
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        )}>
                          {owner.status === 'disabled' ? 'Disabled' : 'Active'}
                        </span>
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
