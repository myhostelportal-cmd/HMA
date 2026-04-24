'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { 
  UserCog, 
  Mail, 
  Building2, 
  Users, 
  ArrowLeft, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  Edit,
  X,
  Save,
  Phone,
  Eye,
  EyeOff,
  Fingerprint,
  MapPin,
  AlertTriangle
} from 'lucide-react';

const OwnerDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [emailWarning, setEmailWarning] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`hostels/owners/${id}/details`);
      setOwner(res.data);
      setEditForm({
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone || '',
        aadhaar: res.data.aadhaar || '',
        address: res.data.address || ''
      });
    } catch (err) {
      console.error('Error fetching owner details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if email is being changed
    if (editForm.email !== owner.email && !emailWarning) {
      setEmailWarning(true);
      return;
    }

    setUpdating(true);
    try {
      await api.put(`hostels/owners/${id}`, editForm);
      setShowEditModal(false);
      setEmailWarning(false);
      fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error updating owner details');
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

  if (!owner) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
        <p className="text-xl font-bold text-slate-900">Owner not found</p>
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
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
              <UserCog size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{owner.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium">
                <Mail size={18} />
                <span>{owner.email}</span>
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
          <div className="bg-indigo-100 text-indigo-700 px-6 py-3 rounded-2xl border border-indigo-200">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Owner ID</p>
            <p className="text-xl font-black">#{owner.owner_id}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card title="Owned Hostels" className="overflow-hidden">
              <div className="space-y-4 p-4">
                {owner.hostels?.length === 0 ? (
                  <p className="text-slate-500 font-medium text-center py-10">No hostels associated with this owner.</p>
                ) : (
                  owner.hostels?.map((hostel: any) => (
                    <div key={hostel.hostel_id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-white transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{hostel.hostel_name}</h4>
                          <p className="text-sm text-slate-500 font-medium">{hostel.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-4 md:mt-0">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warden</p>
                          <Link href={`/admin/wardens/${hostel.warden_id}`} className="text-sm font-bold text-indigo-600 hover:underline">
                            {hostel.warden_name}
                          </Link>
                        </div>
                        <Link href={`/admin/hostels/${hostel.hostel_id}`} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
                          <ChevronRight size={20} />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Account Information">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Status</p>
                    <p className="text-sm font-bold text-emerald-700">Verified Professional</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Member Since</p>
                    <p className="text-sm font-bold text-slate-900">March 12, 2026</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Hostels</p>
                    <p className="text-sm font-bold text-slate-900">{owner.hostels?.length || 0} Hostels Registered</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aadhaar</p>
                    <p className="text-sm font-bold text-slate-900">{owner.aadhaar}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Address</p>
                    <p className="text-sm font-bold text-slate-900">{owner.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                    <p className="text-sm font-bold text-slate-900">{owner.phone}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="p-8 bg-indigo-900 rounded-3xl text-white relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <ShieldCheck size={120} />
              </div>
              <h4 className="text-lg font-bold mb-4 relative z-10">Owner Summary</h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center text-indigo-100">
                  <span className="text-sm opacity-80">Portfolio Value</span>
                  <span className="font-bold text-lg">Premium</span>
                </div>
                <div className="flex justify-between items-center text-indigo-100">
                  <span className="text-sm opacity-80">Operational Units</span>
                  <span className="font-bold text-lg">{owner.hostels?.length || 0}</span>
                </div>
                <div className="pt-4 border-t border-indigo-800 flex justify-between items-center">
                  <span className="text-sm text-indigo-300">Account Type</span>
                  <span className="px-3 py-1 bg-indigo-500 rounded-full text-xs font-bold uppercase tracking-widest">Owner Elite</span>
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
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Edit size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Edit Owner Details</h2>
              <p className="text-slate-500 font-medium text-sm mb-8">Update owner profile information.</p>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" required 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={editForm.email}
                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Details (Aadhar/PAN)</label>
                  <input 
                    type="text"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    value={editForm.aadhaar}
                    onChange={e => setEditForm({...editForm, aadhaar: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Address</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold h-24"
                    value={editForm.address}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                  />
                </div>

                {emailWarning && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-amber-900 font-bold text-sm">Security Warning</p>
                      <p className="text-amber-700 text-xs font-medium leading-relaxed">
                        Changing the email address will update the owner's login credentials. They will need to use the new email to sign in. Proceed?
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit" 
                    disabled={updating}
                    className={`flex-1 ${emailWarning ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'} text-white font-black py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {updating ? <Loader2 className="animate-spin" /> : <><Save size={20} /> {emailWarning ? 'Confirm & Update' : 'Update Owner'}</>}
                  </button>
                  {emailWarning && (
                    <button 
                      type="button"
                      onClick={() => setEmailWarning(false)}
                      className="px-6 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OwnerDetails;
