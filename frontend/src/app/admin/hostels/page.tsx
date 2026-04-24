'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { Building2, Loader2, MapPin, BedDouble, Trash2, AlertTriangle, X } from 'lucide-react';

const AdminHostels = () => {
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });
  const [deleting, setDeleting] = useState(false);

  const fetchHostels = async () => {
    try {
      const res = await api.get('hostels');
      setHostels(res.data);
    } catch (err) {
      console.error('Error fetching hostels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleting(true);
    try {
      await api.delete(`hostels/hostel/${deleteModal.id}`);
      await fetchHostels();
      setDeleteModal({ show: false, id: null });
    } catch (err) {
      alert('Error deleting hostel. Please check console for details.');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ show: true, id });
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hostels Directory</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage and view all hostels in the system.</p>
        </header>

        {hostels.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Building2 size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hostels found</p>
            <p className="text-slate-400 text-sm mt-1">Go to Management to create your first hostel.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostels.map((hostel) => (
              <Link key={hostel.hostel_id} href={`/admin/hostels/${hostel.hostel_id}`}>
                <Card className="hover:scale-[1.02] transition-transform duration-300 cursor-pointer group relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{hostel.hostel_name}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hostel ID: #{hostel.hostel_id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteClick(e, hostel.hostel_id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-slate-500">
                      <MapPin size={16} className="mt-1 flex-shrink-0" />
                      <p className="text-sm line-clamp-2">{hostel.address}</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <BedDouble size={16} />
                      <p className="text-sm font-medium">{hostel.total_rooms} Total Rooms</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner ID</span>
                        <span className="text-sm font-bold text-slate-700">{hostel.owner_id ? `#${hostel.owner_id}` : 'None'}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warden ID</span>
                        <span className="text-sm font-bold text-slate-700">{hostel.warden_id ? `#${hostel.warden_id}` : 'None'}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Custom Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setDeleteModal({ show: false, id: null })}
              className="absolute top-6 right-6 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border-4 border-red-100">
                <AlertTriangle size={40} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Hostel?</h3>
              <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">
                This action is <span className="text-red-600 font-bold">IRREVERSIBLE</span>. It will permanently delete:
                <br/><br/>
                <span className="block text-left bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">
                  • All student records & documents<br/>
                  • All fee payments & financial ledgers<br/>
                  • All room configurations & inventory<br/>
                  • All complaints, expenses & logs
                </span>
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => setDeleteModal({ show: false, id: null })}
                  className="py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete Everything'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHostels;
