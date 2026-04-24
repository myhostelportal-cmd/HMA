'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { 
  Loader2, 
  Plus, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  X,
  Save,
  BedDouble,
  Home,
  Layout,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WardenRooms = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hostelId, setHostelId] = useState<string | null>(searchParams.get('hostel'));
  const [hostel, setHostel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: '',
    capacity: 2,
    floor: 'Ground Floor'
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      fetchHostel(user.id);
    }
  }, []);

  const fetchHostel = async (wId: number) => {
    try {
      const res = await api.get(`/hostels/warden/${wId}`);
      if (res.data.length > 0) {
        const hId = res.data[0].hostel_id;
        setHostelId(hId);
        // Fetch full hostel details to get room types
        const hostelRes = await api.get(`/hostels/${hId}/details`);
        setHostel(hostelRes.data);
        fetchRooms(hId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching hostel:', err);
      setLoading(false);
    }
  };

  const fetchRooms = async (hId: string | number) => {
    try {
      const res = await api.get(`/hostels/${hId}/rooms`);
      setRooms(res.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const matrixData = useMemo(() => {
    if (!hostel || !hostel.room_details) return null;

    const types = ['AC Room', 'Non-AC Room'];
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
        // Find the configuration for this seater type (e.g., 'Dual Seater')
        const detail = hostel.room_details.find((d: any) => d.type === capacityLabels[cap]);
        
        // Map 'AC Room' -> 'ac' and 'Non-AC Room' -> 'non_ac' keys in JSON
        const dbKey = type === 'AC Room' ? 'ac' : 'non_ac';
        const allowed = detail ? detail[dbKey] : 0;

        // Created by warden
        const matchingRooms = rooms.filter(r => r.room_type === type && r.capacity === cap);
        const created = matchingRooms.length;
        const totalCapacity = allowed;

        matrix[cap][type] = {
          allowed,
          created,
          totalCapacity,
          remaining: Math.max(0, allowed - created)
        };
      });
    });

    return { matrix, types, capacities, capacityLabels };
  }, [hostel, rooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Check remaining count in matrix
    if (matrixData) {
      const category = matrixData.matrix[roomForm.capacity]?.[roomForm.room_type];
      if (!category || category.allowed === 0) {
        alert("This room category is not configured for this hostel.");
        return;
      }
      if (category.remaining <= 0) {
        alert("No more rooms available in this category.");
        return;
      }
    }

    setCreating(true);
    try {
      await api.post(`/hostels/${hostelId}/rooms`, roomForm);
      setShowCreateModal(false);
      setRoomForm({ room_number: '', room_type: '', capacity: 2, floor: 'Ground Floor' });
      fetchRooms(hostelId!);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error creating room');
    } finally {
      setCreating(false);
    }
  };

  const roomTypes = hostel?.room_details?.map((d: any) => d.type) || [];

  if (loading && rooms.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    limit: hostel?.total_rooms || 0,
    totalSlots: rooms.reduce((acc, r) => acc + (r.capacity || 0), 0),
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="warden" />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-indigo-600 rounded-full" />
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Room Management</h1>
              </div>
              <p className="text-slate-500 text-sm font-medium ml-4">
                Inventory for <span className="text-indigo-600 font-black">{hostel?.hostel_name || `Hostel #${hostelId}`}</span>
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="group relative flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all duration-300 active:scale-[0.98] shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus size={20} className="relative" />
              <span className="relative font-black text-xs uppercase tracking-[0.2em]">Create Room</span>
            </button>
          </div>

          {/* 1. ELITE MODERN REALISTIC SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Rooms', value: stats.total, limit: stats.limit, icon: Home, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', accent: 'bg-slate-500', shadow: 'shadow-slate-200/40' },
              { label: 'Available Rooms', value: stats.available, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-500', shadow: 'shadow-emerald-200/40' },
              { label: 'Occupied Rooms', value: stats.occupied, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', accent: 'bg-amber-500', shadow: 'shadow-amber-200/40' },
              { label: 'Total Student Slots', value: stats.totalSlots, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', accent: 'bg-indigo-500', shadow: 'shadow-indigo-200/40' },
            ].map((card, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative p-7 rounded-[32px] border bg-white/90 backdrop-blur-2xl border-white/80 transition-all duration-500 group overflow-hidden text-left",
                  "hover:border-white hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-2 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
                )}
              >
                {/* Glossy Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="relative flex flex-col h-full space-y-7">
                  {/* Floating Glass Icon Container */}
                  <div className="flex items-center justify-between pt-3">
                    <div className={cn(
                      "w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-700 relative",
                      "bg-slate-50/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.5)] group-hover:bg-white group-hover:scale-105 group-hover:shadow-md",
                      card.bg, card.border
                    )}>
                      <card.icon 
                        size={26} 
                        strokeWidth={2.5}
                        className={cn("relative transition-all duration-700", card.color)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">
                        {card.label}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h3 className={cn(
                          "text-[2.2rem] font-black tracking-tighter transition-all duration-500 leading-none",
                          "text-slate-900 group-hover:" + card.color
                        )}>
                          {card.value}
                        </h3>
                        {card.limit && (
                          <span className="text-slate-400 font-bold text-sm">/ {card.limit} Limit</span>
                        )}
                      </div>
                    </div>
                    
                    {/* PREMIUM PROGRESS TRACK */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-400 transition-all duration-500">
                          Inventory Analytics
                        </span>
                        <ArrowUpRight size={12} className="text-slate-200 group-hover:text-slate-400 transition-all duration-500" />
                      </div>
                      <div className="h-[4px] w-full bg-slate-100/50 rounded-full overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] border border-white/50">
                        <div className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] w-0 group-hover:w-full opacity-0 group-hover:opacity-100",
                          card.accent
                        )} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

              <div className="flex justify-between items-center mt-12 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-6 bg-slate-900 rounded-full" />
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    Room Grid
                    <span className="px-3 py-1 bg-slate-900 text-white text-[10px] rounded-full font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">
                      {rooms.length} Units Active
                    </span>
                  </h2>
                </div>
              </div>

        {/* Room Grid Container */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {rooms.map((room) => (
            <Link key={room.room_id} href={`/warden/rooms/${room.room_id}`}>
              <div className={cn(
                "group p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer text-center relative overflow-hidden h-full",
                room.status === 'available' 
                  ? "bg-white border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30" 
                  : "bg-white border-slate-100 hover:border-amber-500 hover:bg-amber-50/30"
              )}>
                <div className={cn(
                  "w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
                  room.status === 'available' 
                    ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white" 
                    : "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                )}>
                  <Home size={24} />
                </div>
                <h3 className="font-black text-slate-900 text-lg">{room.room_number}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 group-hover:text-slate-600 transition-colors">{room.room_type}</p>
                <p className="text-[9px] font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-2 inline-block">{room.floor || 'Ground Floor'}</p>
                
                <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Users size={12} />
                  <span>{room.student_count || 0} / {room.capacity}</span>
                </div>

                <div className={cn(
                  "mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                  room.status === 'available' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {room.status}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Home size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-sm">No Rooms Defined</p>
            <p className="text-slate-400 font-medium mt-2 max-w-xs mx-auto">Click "Create Room" to start building your hostel room list.</p>
          </div>
        )}

        {/* Inventory Matrix Breakdown */}
        {matrixData && (
          <div className="bg-white/40 backdrop-blur-3xl rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] border border-white overflow-hidden p-2 mt-12">
            <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                    <Layout size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Room Inventory Metrics</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Allocation & Creation Strategy</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Live Status</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100">Seats</th>
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 text-center">AC Rooms</th>
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 text-center">Non-AC Rooms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {matrixData.capacities.map(cap => {
                      const row = matrixData.matrix[cap];
                      return (
                        <tr key={cap} className="group hover:bg-indigo-50/30 transition-all duration-300">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-md transition-all border border-transparent group-hover:border-slate-100">
                                <BedDouble size={20} />
                              </div>
                              <span className="text-sm font-black text-slate-700 group-hover:text-slate-900 transition-colors">
                                {row.label === 'Single Seater' ? 'Single Seat' : 
                                 row.label === 'Dual Seater' ? 'Dual Seats' : 
                                 row.label === 'Triple Seater' ? 'Triple Seats' : 
                                 row.label === 'Four Seater' ? 'Four Seats' : row.label}
                              </span>
                            </div>
                          </td>
                          {matrixData.types.map(type => {
                            const cell = row[type];
                            const progress = cell.allowed > 0 ? (cell.created / cell.allowed) * 100 : 0;
                            return (
                              <td key={type} className="px-8 py-6">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "text-sm font-black tracking-tight",
                                      cell.created > 0 ? "text-slate-900" : "text-slate-300"
                                    )}>
                                      {cell.created} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Created</span>
                                    </span>
                                    <div className="w-[1px] h-3 bg-slate-200" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      Limit: {cell.allowed}
                                    </span>
                                  </div>
                                  
                                  {/* Realistic Progress Indicator */}
                                  <div className="w-full max-w-[140px] h-2 bg-slate-100 rounded-full overflow-hidden p-[1px] border border-white shadow-inner mt-1">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                        cell.created > 0 ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" : "bg-slate-200"
                                      )}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-white rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden relative border border-white p-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <div className="flex justify-between items-center mb-10 relative">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-500/20">
                    <Plus size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Expansion</h3>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Create New Resident Room</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-8 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Room Identity</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. 209, A-101"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-black text-sm text-slate-900 outline-none focus:ring-[10px] focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                      value={roomForm.room_number}
                      onChange={e => setRoomForm({...roomForm, room_number: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Configuration</label>
                    <select 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-black text-sm text-slate-900 outline-none focus:ring-[10px] focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all appearance-none"
                      value={roomForm.room_type}
                      onChange={e => setRoomForm({...roomForm, room_type: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      <option value="AC Room">AC Room (Climate Opt)</option>
                      <option value="Non-AC Room">Non-AC Room (Standard)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Floor Level</label>
                    <select 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-black text-sm text-slate-900 outline-none focus:ring-[10px] focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all appearance-none"
                      value={roomForm.floor}
                      onChange={e => setRoomForm({...roomForm, floor: e.target.value})}
                    >
                      <option value="Ground Floor">Ground Floor</option>
                      {Array.from({length: 14}, (_, i) => `${i + 1}${['st', 'nd', 'rd'][i] || 'th'} Floor`).map(floor => (
                        <option key={floor} value={floor}>{floor}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Resident Capacity</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRoomForm({...roomForm, capacity: num})}
                          className={cn(
                            "py-3 rounded-xl font-black transition-all border-2",
                            roomForm.capacity === num 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                              : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-6 rounded-[24px] border border-indigo-100/50 flex gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
                    <Info size={20} strokeWidth={2.5} />
                  </div>
                  <p className="text-xs text-indigo-900 leading-relaxed font-bold">
                    New rooms are automatically assigned to the current hostel strategy. This action will update the <span className="text-indigo-600 font-black">Room Matrix</span> in real-time.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit" 
                    disabled={creating}
                    className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-[20px] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px]"
                  >
                    {creating ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Authorize & Create</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    }>
      <WardenRooms />
    </Suspense>
  );
}
