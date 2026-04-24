'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Phone, 
  Loader2, 
  Search, 
  MapPin, 
  GraduationCap, 
  ArrowRight, 
  UserCircle, 
  ChevronRight,
  Home,
  X,
  Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";

const WardenStudents = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hostelId, setHostelId] = useState<string | null>(searchParams.get('hostel'));
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardenId, setWardenId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hostelName, setHostelName] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      setWardenId(user.id);
      if (!hostelId) {
        fetchHostel(user.id);
      } else {
        fetchStudents(hostelId);
      }
    }
  }, [hostelId]);

  const fetchHostel = async (wId: number) => {
    try {
      const res = await api.get(`/hostels/warden/${wId}`);
      if (res.data.length > 0) {
        const hId = res.data[0].hostel_id;
        setHostelId(hId.toString());
        setHostelName(res.data[0].hostel_name);
        fetchStudents(hId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching hostel:', err);
      setLoading(false);
    }
  };

  const fetchStudents = async (hId: string | number) => {
    try {
      const res = await api.get(`/hostels/${hId}/students`);
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    let result = students;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = students.filter(student => {
        const nameMatch = student.name?.toLowerCase().includes(term);
        const roomMatch = (student.details?.assigned_slot || student.room_number || '').toLowerCase().includes(term);
        const phoneMatch = (student.phone || '').toLowerCase().includes(term);
        return nameMatch || roomMatch || phoneMatch;
      });
    }

    // Sort by room number naturally
    return [...result].sort((a, b) => {
      const slotA = (a.details?.assigned_slot || a.room_number || '').toString();
      const slotB = (b.details?.assigned_slot || b.room_number || '').toString();
      return slotA.localeCompare(slotB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students, searchTerm]);

  if (loading && students.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="warden" hostelName={hostelName} />
      <main className="flex-1 p-8 overflow-y-auto bg-[#FDFDFF]">
        <header className="mb-10 space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">Student Directory</h1>
            <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-widest">View and manage all active residents</p>
          </div>
          
          <div className="relative w-full group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
            <input 
              type="text" 
              placeholder="Search students..."
              className="w-full pl-14 pr-12 py-4 bg-white border border-[#F1F5F9] rounded-[2rem] outline-none focus:border-[#4F46E5] text-xs font-bold text-[#1E293B] shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#4F46E5] p-1"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[40px] border border-[#F1F5F9] shadow-sm">
            <div className="w-20 h-20 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-6 shadow-inner">
              <UserCircle size={40} className="text-[#CBD5E1]" />
            </div>
            <p className="text-[#64748B] font-black uppercase tracking-[0.2em] text-[10px]">No Residents Found</p>
            <p className="text-[#94A3B8] font-bold mt-3 max-w-xs mx-auto text-xs uppercase tracking-widest leading-loose">Try adjusting your search terms or adding new students.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
            <AnimatePresence>
              {filteredStudents.map((student, index) => {
                const rawSlot = student.details?.assigned_slot || student.room_number || '';
                const assignedSlot = typeof rawSlot === 'string' 
                  ? rawSlot.replace(/(\d+)([A-Z])/i, '$1-$2') 
                  : rawSlot;
                
                return (
                  <motion.div
                    key={student.student_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <Link href={`/warden/students/${student.student_id}`}>
                      <div className="bg-white rounded-[2.5rem] border border-[#F1F5F9] shadow-sm p-8 flex flex-col items-center space-y-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 group cursor-pointer">
                        {/* Profile Section */}
                        <div className="flex items-center gap-5 w-full">
                          <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] overflow-hidden flex-shrink-0">
                            {student.details?.student_photo ? (
                              <img src={student.details.student_photo} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                                <UserCircle size={32} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-[#1E293B] tracking-tight truncate capitalize">{student.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                student.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-[#94A3B8]"
                              )} />
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                student.status === 'active' ? "text-emerald-600" : "text-[#94A3B8]"
                              )}>
                                {student.status === 'active' ? 'ACTIVE' : student.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Details Boxes */}
                        <div className="w-full space-y-3">
                          {/* Room Box */}
                          <div className="flex items-center gap-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl p-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#94A3B8] shadow-sm">
                              <Home size={18} />
                            </div>
                            <div className="flex-1 text-center pr-10">
                              <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Room Assigned</p>
                              <p className="text-[11px] font-black text-[#1E293B]">{assignedSlot || 'Not Assigned'}</p>
                            </div>
                          </div>

                          {/* Contact Box */}
                          <div className="flex items-center gap-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl p-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#94A3B8] shadow-sm">
                              <Phone size={18} />
                            </div>
                            <div className="flex-1 text-center pr-10">
                              <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Contact Number</p>
                              <p className="text-[11px] font-black text-[#1E293B]">{student.phone || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* View Button */}
                        <div className="pt-2 w-full flex justify-center">
                          <div className="bg-[#1E293B] group-hover:bg-[#0F172A] text-white rounded-xl px-10 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group-hover:scale-105">
                            View Details
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

// Add Suspense boundary
export default function WardenStudentsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    }>
      <WardenStudents />
    </Suspense>
  );
}
