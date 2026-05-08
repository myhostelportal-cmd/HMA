'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { 
  Users, 
  Mail, 
  User, 
  ArrowLeft, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  Phone,
  Calendar,
  Edit,
  X,
  Save,
  Building2,
  MapPin,
  BedDouble,
  TrendingUp
} from 'lucide-react';

const WardenDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const [warden, setWarden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`hostels/wardens/${id}/details`);
      setWarden(res.data);
      setEditForm({
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone || '',
        address: res.data.address || '',
        id_details: res.data.id_details || ''
      });
    } catch (err) {
      console.error('Error fetching warden details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.put(`hostels/wardens/${id}`, editForm);
      setShowEditModal(false);
      fetchDetails();
    } catch (err) {
      alert('Error updating warden details');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!warden) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
        <p className="text-xl font-bold text-slate-900">Warden not found</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 font-bold flex items-center gap-2">
          <ArrowLeft size={20} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="admin" />
      <main className="flex-1 p-8 overflow-y-auto">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <header className="mb-8 flex justify-between items-start">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-violet-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-violet-600/30">
              <Users size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{warden.name}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2 text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <Mail size={18} />
                  <span>{warden.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={18} />
                  <span>{warden.phone || 'No phone number'}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(true)}
                className="mt-4 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
              >
                <Edit size={18} />
                Edit Details
              </button>
            </div>
          </div>
          <div className="bg-violet-100 text-violet-700 px-6 py-3 rounded-2xl border border-violet-200">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Warden ID</p>
            <p className="text-xl font-black">#{warden.warden_id}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Assigned Hostels</h2>
              <div className="px-4 py-1.5 bg-violet-50 text-violet-600 rounded-xl border border-violet-100 text-xs font-black uppercase tracking-widest">
                {warden.hostels?.length || 0} Total Units
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {warden.hostels?.length === 0 ? (
                <div className="md:col-span-2 py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                  <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hostels assigned</p>
                </div>
              ) : (
                warden.hostels?.map((hostel: any) => {
                  const occupancyRate = hostel.total_capacity > 0 
                    ? Math.round((hostel.total_students / hostel.total_capacity) * 100) 
                    : 0;

                  return (
                    <Link key={hostel.hostel_id} href={`/admin/hostels/${hostel.hostel_id}`}>
                      <Card className="hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer group relative overflow-hidden border-slate-200/60 h-full flex flex-col p-0">
                        <div className="p-6 flex flex-col h-full">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                                <Building2 size={24} />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1">{hostel.hostel_name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hostel ID: #{hostel.hostel_id}</p>
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-all">
                              <ChevronRight size={20} />
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Location + Owner on the same row */}
                            <div className="flex flex-col gap-2 text-slate-500">
                              <div className="flex items-center gap-2">
                                <MapPin size={16} className="flex-shrink-0 text-violet-500" />
                                <p className="text-sm font-medium line-clamp-1">{hostel.address}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <User size={16} className="flex-shrink-0 text-violet-500" />
                                <p className="text-sm font-medium">Owner: <span className="font-bold text-slate-700">{hostel.owner_name}</span></p>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                              {/* Capacity Section */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <BedDouble size={12} className="text-violet-500" />
                                  <span>Total Capacity</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900">{hostel.total_capacity || 0} Beds</p>
                              </div>
                              
                              {/* Students Section */}
                              <div className="space-y-1 text-right">
                                <div className="flex items-center justify-end gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <Users size={12} className="text-violet-500" />
                                  <span>Active Students</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900">{hostel.total_students || 0} Students</p>
                              </div>
                            </div>

                            {/* Occupancy Section */}
                            <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <TrendingUp size={12} className="text-emerald-500" />
                                <span>Occupancy</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className="h-full bg-violet-600 rounded-full transition-all duration-500" 
                                    style={{ width: `${occupancyRate}%` }}
                                  />
                                </div>
                                <span className="text-sm font-black text-violet-600">{occupancyRate}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card title="Operational Details">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Warden Status</p>
                    <p className="text-sm font-bold text-blue-700">Full Operational Access</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned Since</p>
                    <p className="text-sm font-bold text-slate-900">January 05, 2026</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Hostels</p>
                    <p className="text-sm font-bold text-slate-900">{warden.hostels?.length || 0} Hostels Assigned</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="p-8 bg-violet-900 rounded-3xl text-white relative overflow-hidden shadow-xl shadow-violet-900/20">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <ShieldCheck size={120} />
              </div>
              <h4 className="text-lg font-bold mb-4 relative z-10">Warden Summary</h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center text-violet-100">
                  <span className="text-sm opacity-80">Access Level</span>
                  <span className="font-bold text-lg">Warden Core</span>
                </div>
                <div className="flex justify-between items-center text-violet-100">
                  <span className="text-sm opacity-80">Assigned Hostels</span>
                  <span className="font-bold text-lg">{warden.hostels?.length || 0}</span>
                </div>
                <div className="pt-4 border-t border-violet-800 flex justify-between items-center">
                  <span className="text-sm text-violet-300">Account Status</span>
                  <span className="px-3 py-1 bg-emerald-500 rounded-full text-xs font-bold uppercase tracking-widest">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] relative border-none">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="p-8">
              <div className="w-14 h-14 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-6">
                <Edit size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Edit Warden Details</h2>
              <p className="text-slate-500 font-medium text-sm mb-8">Update warden profile information.</p>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" required 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500 font-bold"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500 font-bold"
                      value={editForm.email}
                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500 font-bold"
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Details (Aadhar/PAN)</label>
                  <input 
                    type="text"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500 font-bold"
                    value={editForm.id_details}
                    onChange={e => setEditForm({...editForm, id_details: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Address</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500 font-bold h-24"
                    value={editForm.address}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Hostels (Read Only)</label>
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500">
                    {warden.hostels?.length > 0 
                      ? warden.hostels.map((h: any) => h.hostel_name).join(', ') 
                      : 'No hostels assigned'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">* Hostel assignments are managed via the Hostel Edit page.</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit" 
                    disabled={updating}
                    className="flex-1 bg-violet-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-violet-600/20 hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Update Warden</>}
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WardenDetails;
