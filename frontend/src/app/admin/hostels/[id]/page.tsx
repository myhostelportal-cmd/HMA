'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { 
  Building2, 
  MapPin, 
  User, 
  Users, 
  ArrowLeft, 
  Loader2, 
  BedDouble, 
  GraduationCap,
  ChevronRight,
  Edit,
  X,
  Save
} from 'lucide-react';

const HostelDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const [hostel, setHostel] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [wardens, setWardens] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const [hostelRes, statsRes, ownersRes, wardensRes] = await Promise.all([
        api.get(`hostels/${id}/details`),
        api.get(`hostels/${id}/operational-stats`),
        api.get('hostels/owners'),
        api.get('hostels/wardens')
      ]);
      
      const hostelData = hostelRes.data;
      const ownersList = ownersRes.data;
      const wardensList = wardensRes.data;

      // Ensure names are present by looking them up in the full lists
      const owner = ownersList.find((o: any) => o.owner_id == hostelData.owner_id);
      const warden = wardensList.find((w: any) => w.warden_id == hostelData.warden_id);

      setHostel({
        ...hostelData,
        owner_name: owner ? owner.name : (hostelData.owner_id ? 'Unknown Owner' : 'No Owner Assigned'),
        warden_name: warden ? warden.name : (hostelData.warden_id ? 'Unknown Warden' : 'No Warden Assigned')
      });
      
      setStudentCount(statsRes.data.totalStudents);
      setOwners(ownersList);
      setWardens(wardensList);
      
      // Initialize edit form
      setEditForm({
        hostel_name: hostelData.hostel_name,
        address: hostelData.address,
        owner_id: hostelData.owner_id,
        warden_id: hostelData.warden_id,
        total_rooms: hostelData.total_rooms,
        room_details: hostelData.room_details || []
      });
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.put(`hostels/${id}`, editForm);
      setShowEditModal(false);
      fetchDetails(); // Refresh data
    } catch (err) {
      alert('Error updating hostel details');
    } finally {
      setUpdating(false);
    }
  };

  const getMatrixData = (hostel: any) => {
    if (!hostel || !hostel.room_details) return null;
    const types = ['ac', 'non_ac'];
    const capacities = [1, 2, 3, 4];
    const capacityLabels: Record<number, string> = { 
      1: 'Single Seater', 
      2: 'Dual Seater', 
      3: 'Triple Seater', 
      4: 'Four Seater' 
    };

    const matrix: any = {};

    capacities.forEach(cap => {
      matrix[cap] = { label: capacityLabels[cap] };
      types.forEach(type => {
        const detail = hostel.room_details.find((d: any) => {
          // Some structures use capacity property, some rely on array index. 
          // The current editForm.room_details uses index-based type names like "Single Seater".
          return d.type === capacityLabels[cap];
        });
        matrix[cap][type] = detail ? detail[type] : 0;
      });
    });

    return { matrix, types, capacities, capacityLabels };
  };

  const updateRoomDetail = (index: number, field: 'ac' | 'non_ac', value: string) => {
    const newDetails = [...editForm.room_details];
    newDetails[index][field] = parseInt(value) || 0;
    const total = newDetails.reduce((sum, item) => sum + item.ac + item.non_ac, 0);
    setEditForm({ ...editForm, room_details: newDetails, total_rooms: total });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
        <p className="text-xl font-bold text-slate-900">Hostel not found</p>
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
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{hostel.hostel_name}</h1>
            <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium">
              <MapPin size={18} />
              <span>{hostel.address}</span>
            </div>
            <button 
              onClick={() => setShowEditModal(true)}
              className="mt-4 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Edit size={18} />
              Edit Details
            </button>
          </div>
          <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-600/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Hostel ID</p>
            <p className="text-xl font-black">#{hostel.hostel_id}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Room Configuration */}
            <Card title="Room Configuration" className="overflow-hidden">
              {(() => {
                const matrixData = getMatrixData(hostel);
                if (!matrixData) return <p className="p-4 text-slate-400 italic">No configuration found.</p>;
                
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-4 text-left font-bold text-slate-600 uppercase tracking-widest text-xs">Seater Type</th>
                          <th className="p-4 text-center font-bold text-slate-600 uppercase tracking-widest text-xs">AC Rooms</th>
                          <th className="p-4 text-center font-bold text-slate-600 uppercase tracking-widest text-xs">Non-AC Rooms</th>
                          <th className="p-4 text-center font-bold text-slate-600 uppercase tracking-widest text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matrixData.capacities.map(cap => {
                          const row = matrixData.matrix[cap];
                          const total = row.ac + row.non_ac;
                          return (
                            <tr key={cap} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-slate-700">{row.label}</td>
                              <td className="p-4 text-center font-medium text-blue-600 bg-blue-50/30">{row.ac}</td>
                              <td className="p-4 text-center font-medium text-slate-600">{row.non_ac}</td>
                              <td className="p-4 text-center font-black text-slate-900 bg-slate-50/50">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-900 text-white">
                        <tr>
                          <td className="p-4 font-bold uppercase tracking-widest text-xs">Grand Total</td>
                          <td className="p-4 text-center font-black text-blue-400">
                            {matrixData.capacities.reduce((sum, cap) => sum + (matrixData.matrix[cap]?.ac || 0), 0)}
                          </td>
                          <td className="p-4 text-center font-black text-slate-300">
                            {matrixData.capacities.reduce((sum, cap) => sum + (matrixData.matrix[cap]?.non_ac || 0), 0)}
                          </td>
                          <td className="p-4 text-center font-black text-white text-lg">
                            {hostel.total_rooms}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </Card>

            {/* Student Directory Link */}
            <Link href={`/admin/hostels/${id}/students`}>
              <Card className="hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <GraduationCap size={80} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                      <GraduationCap size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Student Directory</h3>
                      <p className="text-slate-500 font-medium">Currently {studentCount} active students in this hostel.</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          <div className="space-y-6">
            {/* Management Info */}
            <Card title="Management Info">
              <div className="space-y-6">
                {hostel.owner_id ? (
                  <Link href={`/admin/owners/${hostel.owner_id}`} className="block group">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 group-hover:border-indigo-500 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="text-indigo-600" size={20} />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Hostel Owner</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{hostel.owner_name}</p>
                      <p className="text-xs font-bold text-indigo-500 mt-1">Click to view owner profile</p>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-60">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="text-slate-400" size={20} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hostel Owner</span>
                    </div>
                    <p className="text-lg font-black text-slate-400 italic">No Owner Assigned</p>
                  </div>
                )}

                {hostel.warden_id ? (
                  <Link href={`/admin/wardens/${hostel.warden_id}`} className="block group">
                    <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 group-hover:border-violet-500 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="text-violet-600" size={20} />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Hostel Warden</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 group-hover:text-violet-600 transition-colors">{hostel.warden_name}</p>
                      <p className="text-xs font-bold text-violet-500 mt-1">Click to view warden profile</p>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-60">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="text-slate-400" size={20} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hostel Warden</span>
                    </div>
                    <p className="text-lg font-black text-slate-400 italic">No Warden Assigned</p>
                  </div>
                )}
              </div>
            </Card>

            <div className="p-6 bg-slate-900 rounded-3xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <BedDouble size={24} className="text-blue-400" />
                <h4 className="font-bold text-lg">Inventory Summary</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Total Capacity</span>
                  <span className="text-xl font-black">{hostel.total_rooms}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Occupied Rooms</span>
                  <span className="text-xl font-black text-blue-400">{studentCount}</span>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Available Inventory</span>
                    <span className="text-2xl font-black text-emerald-400">{hostel.total_rooms - studentCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] relative border-none">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="p-8">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Edit size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Edit Hostel Details</h2>
              <p className="text-slate-500 font-medium text-sm mb-8">Update your hostel information and room configuration.</p>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hostel Name</label>
                    <input 
                      type="text" required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={editForm.hostel_name}
                      onChange={e => setEditForm({...editForm, hostel_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Rooms</label>
                    <input 
                      type="number" readOnly
                      className="w-full p-4 bg-slate-100 border border-slate-100 rounded-2xl outline-none font-bold text-slate-500 cursor-not-allowed"
                      value={editForm.total_rooms}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</label>
                  <textarea 
                    required 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold h-24"
                    value={editForm.address}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Owner</label>
                    <select 
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none"
                      value={editForm.owner_id}
                      onChange={e => setEditForm({...editForm, owner_id: e.target.value})}
                    >
                      <option value="">Select Owner</option>
                      {owners.map(owner => (
                        <option key={owner.owner_id} value={owner.owner_id}>{owner.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Warden</label>
                    <select 
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none"
                      value={editForm.warden_id}
                      onChange={e => setEditForm({...editForm, warden_id: e.target.value})}
                    >
                      <option value="">Select Warden</option>
                      {wardens.map(warden => (
                        <option key={warden.warden_id} value={warden.warden_id}>{warden.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Room Configuration</p>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-left font-bold text-slate-600">Type</th>
                          <th className="p-3 text-center font-bold text-slate-600">AC</th>
                          <th className="p-3 text-center font-bold text-slate-600">Non-AC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editForm.room_details.map((detail: any, idx: number) => (
                          <tr key={detail.type} className="border-b border-slate-100 last:border-0">
                            <td className="p-3 font-bold text-slate-700">{detail.type}</td>
                            <td className="p-3">
                              <input 
                                type="number" min="0"
                                className="w-full p-2 text-center bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                value={detail.ac}
                                onChange={e => updateRoomDetail(idx, 'ac', e.target.value)}
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="number" min="0"
                                className="w-full p-2 text-center bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                value={detail.non_ac}
                                onChange={e => updateRoomDetail(idx, 'non_ac', e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit" 
                    disabled={updating}
                    className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Update Hostel</>}
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

export default HostelDetails;
