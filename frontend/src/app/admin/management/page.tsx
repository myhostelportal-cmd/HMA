'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { Plus, Building2, UserCog, Users, Loader2 } from 'lucide-react';

const AdminPanel = () => {
  const [owners, setOwners] = useState<any[]>([]);
  const [wardens, setWardens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState<'hostel' | 'owner' | 'warden' | null>(null);

  const [hostelForm, setHostelForm] = useState({
    hostel_name: '',
    address: '',
    owner_id: '',
    warden_id: '',
    total_rooms: '',
    room_details: [
      { type: 'Dual Seater', ac: 0, non_ac: 0 },
      { type: 'Triple Seater', ac: 0, non_ac: 0 },
      { type: 'Four Seater', ac: 0, non_ac: 0 }
    ]
  });

  const updateRoomDetail = (index: number, field: 'ac' | 'non_ac', value: string) => {
    const newDetails = [...hostelForm.room_details];
    newDetails[index][field] = parseInt(value) || 0;
    
    // Auto-calculate total rooms
    const total = newDetails.reduce((sum, item) => sum + item.ac + item.non_ac, 0);
    
    setHostelForm({
      ...hostelForm,
      room_details: newDetails,
      total_rooms: total.toString()
    });
  };

  const [ownerForm, setOwnerForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    aadhaar: '',
    address: ''
  });

  const [wardenForm, setWardenForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ownersRes, wardensRes] = await Promise.all([
        api.get('hostels/owners'),
        api.get('hostels/wardens')
      ]);
      setOwners(ownersRes.data);
      setWardens(wardensRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleHostelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('hostels', hostelForm);
      alert('Hostel Created Successfully!');
      setFormType(null);
    } catch (err) {
      alert('Error creating hostel');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('hostels/owners', ownerForm);
      alert('Owner Created Successfully!');
      fetchData();
      setFormType(null);
      setOwnerForm({
        name: '', email: '', password: '', phone: '', aadhaar: '', address: ''
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error creating owner');
    } finally {
      setLoading(false);
    }
  };

  const handleWardenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('hostels/wardens', wardenForm);
      alert('Warden Created Successfully!');
      fetchData();
      setFormType(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error creating warden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="admin" />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Create and associate Hostels, Owners, and Wardens.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <button onClick={() => setFormType('hostel')} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 size={24} />
            </div>
            <span className="font-bold text-slate-700">Create New Hostel</span>
          </button>
          
          <button onClick={() => setFormType('owner')} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <UserCog size={24} />
            </div>
            <span className="font-bold text-slate-700">Create New Owner</span>
          </button>

          <button onClick={() => setFormType('warden')} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl hover:border-violet-500 hover:bg-violet-50 transition-all group">
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Users size={24} />
            </div>
            <span className="font-bold text-slate-700">Create New Warden</span>
          </button>
        </div>

        {formType === 'hostel' && (
          <Card title="Create New Hostel" className="max-w-2xl animate-in fade-in slide-in-from-bottom-4">
            <form onSubmit={handleHostelSubmit} className="space-y-4">
              <input type="text" placeholder="Hostel Name" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={hostelForm.hostel_name} onChange={e => setHostelForm({...hostelForm, hostel_name: e.target.value})} />
              <textarea placeholder="Address" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={hostelForm.address} onChange={e => setHostelForm({...hostelForm, address: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select required className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={hostelForm.owner_id} onChange={e => setHostelForm({...hostelForm, owner_id: e.target.value})}>
                  <option value="">Select Owner</option>
                  {owners.map(o => <option key={o.owner_id} value={o.owner_id}>{o.name}</option>)}
                </select>
                <select required className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={hostelForm.warden_id} onChange={e => setHostelForm({...hostelForm, warden_id: e.target.value})}>
                  <option value="">Select Warden</option>
                  {wardens.map(w => <option key={w.warden_id} value={w.warden_id}>{w.name}</option>)}
                </select>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Room Configuration</p>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-left font-bold text-slate-600">Room Type</th>
                        <th className="p-2 text-center font-bold text-slate-600">AC</th>
                        <th className="p-2 text-center font-bold text-slate-600">Non-AC</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {hostelForm.room_details.map((detail, idx) => (
                        <tr key={detail.type} className="border-b border-slate-100 last:border-0">
                          <td className="p-2 font-medium text-slate-700">{detail.type}</td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              min="0" 
                              className="w-full p-1.5 text-center bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                              value={detail.ac} 
                              onChange={e => updateRoomDetail(idx, 'ac', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              min="0" 
                              className="w-full p-1.5 text-center bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
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
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-sm font-bold text-blue-800 uppercase tracking-wider">Total Calculated Rooms</span>
                <span className="text-xl font-black text-blue-600">{hostelForm.total_rooms}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : 'Create Hostel'}
                </button>
                <button type="button" onClick={() => setFormType(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
              </div>
            </form>
          </Card>
        )}

        {formType === 'owner' && (
          <Card title="Create New Owner" className="max-w-2xl animate-in fade-in slide-in-from-bottom-4">
            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Owner Name" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={ownerForm.name} onChange={e => setOwnerForm({...ownerForm, name: e.target.value})} />
                <input type="email" placeholder="Email" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={ownerForm.email} onChange={e => setOwnerForm({...ownerForm, email: e.target.value})} />
                <input type="password" placeholder="Password" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={ownerForm.password} onChange={e => setOwnerForm({...ownerForm, password: e.target.value})} />
                <input type="text" placeholder="Phone Number" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={ownerForm.phone} onChange={e => setOwnerForm({...ownerForm, phone: e.target.value})} />
              </div>
              <input type="text" placeholder="Aadhaar Number" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={ownerForm.aadhaar} onChange={e => setOwnerForm({...ownerForm, aadhaar: e.target.value})} />
              <textarea placeholder="Address" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24" value={ownerForm.address} onChange={e => setOwnerForm({...ownerForm, address: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : 'Create Owner'}
                </button>
                <button type="button" onClick={() => setFormType(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
              </div>
            </form>
          </Card>
        )}

        {formType === 'warden' && (
          <Card title="Create New Warden" className="max-w-2xl animate-in fade-in slide-in-from-bottom-4">
            <form onSubmit={handleWardenSubmit} className="space-y-4">
              <input type="text" placeholder="Warden Name" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-violet-500" value={wardenForm.name} onChange={e => setWardenForm({...wardenForm, name: e.target.value})} />
              <input type="email" placeholder="Email" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-violet-500" value={wardenForm.email} onChange={e => setWardenForm({...wardenForm, email: e.target.value})} />
              <input type="password" placeholder="Password" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-violet-500" value={wardenForm.password} onChange={e => setWardenForm({...wardenForm, password: e.target.value})} />
              <input type="text" placeholder="Phone" required className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-violet-500" value={wardenForm.phone} onChange={e => setWardenForm({...wardenForm, phone: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : 'Create Warden'}
                </button>
                <button type="button" onClick={() => setFormType(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
              </div>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
