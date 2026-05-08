'use client';

import React, { useState, useEffect } from 'react';
import { useHostel } from '@/context/HostelContext';
import HostelSelector from '@/components/layout/HostelSelector';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2,
  Users,
  DoorOpen,
  ChevronRight,
  ArrowLeft,
  Circle,
  LayoutGrid,
  Info,
  User,
  CheckCircle2,
  XCircle,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

const OccupancyPage = () => {
  const { selectedHostel } = useHostel();
  const [hostelsData, setHostelsData] = useState<any[]>([]);
  const [selectedDrillDown, setSelectedDrillDown] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    const fetchOccupancy = async () => {
      setLoading(true);
      try {
        const res = await api.get('/owner/occupancy');
        setHostelsData(res.data);
      } catch (err) {
        console.error('Error fetching occupancy:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOccupancy();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const filteredHostels = selectedHostel === 'all' 
    ? hostelsData 
    : hostelsData.filter(h => h.hostel_id.toString() === selectedHostel);

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="px-4 md:px-8 py-4 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 gap-4 bg-[#FDFDFF]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          {selectedDrillDown && (
            <button 
              onClick={() => setSelectedDrillDown(null)}
              className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {selectedDrillDown ? selectedDrillDown.hostel_name : 'Occupancy Map'}
            </h1>
            <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mt-1">
              {selectedDrillDown ? 'Room-level availability details' : 'Portfolio inventory overview'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!selectedDrillDown && <HostelSelector />}
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            {user?.name?.charAt(0) || 'C'}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24 mt-8">
        <AnimatePresence mode="wait">
          {!selectedDrillDown ? (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            >
              {filteredHostels.map((hostel, idx) => {
                const occupancyPercent = Math.round((hostel.occupied_students / (hostel.calculated_capacity || ((hostel.total_rooms || 0) * 2))) * 100);
                return (
                  <motion.div
                    key={hostel.hostel_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedDrillDown(hostel)}
                    className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                        <Home strokeWidth={1.5} size={28} />
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500",
                        occupancyPercent > 90 
                          ? "bg-red-50 text-red-600 border-red-100 group-hover:bg-red-500 group-hover:text-white group-hover:border-red-500" 
                          : "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500"
                      )}>
                        {occupancyPercent > 90 ? 'High Demand' : 'Available'}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-indigo-800 transition-all truncate">
                      {hostel.hostel_name}
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                      {hostel.total_rooms} Units • {hostel.occupied_students} Residents
                    </p>

                    <div className="mt-10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage</span>
                        <span className="text-xs font-black text-slate-900">{occupancyPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${occupancyPercent}%` }}
                          className={cn(
                            "h-full rounded-full transition-all",
                            occupancyPercent > 90 ? "bg-red-500" : "bg-indigo-600"
                          )}
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-indigo-600 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                      <span className="text-[10px] font-black uppercase tracking-widest">Explore Units</span>
                      <ChevronRight size={16} />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              key="drilldown"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {[
                  { label: 'Total Units', value: selectedDrillDown.total_rooms, icon: DoorOpen, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                  { label: 'Active Residents', value: selectedDrillDown.occupied_students, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Open Slots', value: (selectedDrillDown.calculated_capacity || ((selectedDrillDown.total_rooms || 0) * 2)) - selectedDrillDown.occupied_students, icon: LayoutGrid, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex items-center gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border", stat.bg, stat.color, stat.border)}>
                      <stat.icon size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Unit Status Matrix</h2>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {selectedDrillDown.rooms?.map((room: any, idx: number) => {
                    const isFull = room.occupied >= room.capacity;
                    const isPartiallyFull = room.occupied > 0 && room.occupied < room.capacity;
                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.05, y: -4 }}
                        className={cn(
                          "aspect-square rounded-[2rem] border-2 p-5 flex flex-col justify-between transition-all cursor-default shadow-sm",
                          isFull 
                            ? "bg-red-50 border-red-100" 
                            : (isPartiallyFull ? "bg-indigo-50 border-indigo-100" : "bg-emerald-50 border-emerald-100")
                        )}
                      >
                        <span className={cn(
                          "text-[10px] font-black",
                          isFull ? "text-red-900" : (isPartiallyFull ? "text-indigo-900" : "text-emerald-900")
                        )}>
                          UNIT {room.room_no}
                        </span>
                        <div className="space-y-2">
                          <p className={cn(
                            "text-[8px] font-black uppercase tracking-widest",
                            isFull ? "text-red-600" : (isPartiallyFull ? "text-indigo-600" : "text-emerald-600")
                          )}>
                            {isFull ? 'Occupied' : (isPartiallyFull ? 'Partially' : 'Open')}
                          </p>
                          <div className="flex gap-1.5">
                            {Array.from({ length: room.capacity }).map((_, i) => (
                              <div 
                                key={i}
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  i < room.occupied 
                                    ? (isFull ? 'bg-red-500' : 'bg-indigo-600') 
                                    : 'bg-slate-200'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100/50 p-6 rounded-[2rem] flex gap-5 items-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Info size={20} />
                </div>
                <p className="text-indigo-900 text-[10px] font-bold leading-relaxed uppercase tracking-widest opacity-80">
                  This unit matrix is synced with warden allocations. residents are mapped to individual units. red units are at 100% capacity.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OccupancyPage;