'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useHostel } from '@/context/HostelContext';
import HostelSelector from '@/components/layout/HostelSelector';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2,
  Users,
  Search,
  Receipt,
  AlertCircle,
  User,
  Filter,
  ChevronDown,
  LayoutGrid,
  CreditCard,
  Mail,
  Phone,
  Home,
  X,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const StudentsPage = () => {
  const { selectedHostel } = useHostel();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`owner/students?hostel_id=${selectedHostel}&status=${statusFilter}`);
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedHostel, statusFilter]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase().trim();
    return students.filter(student => 
      student.name?.toLowerCase().includes(term) ||
      student.phone?.toLowerCase().includes(term) ||
      student.hostel_name?.toLowerCase().includes(term) ||
      student.room_number?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  if (loading && students.length === 0) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="px-4 md:px-8 py-4 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 gap-4 bg-[#FDFDFF]/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Student Control</h1>
          <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Portfolio Student Roster & Fee Status</p>
        </div>
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <HostelSelector />
          </div>
          <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-slate-100 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Owner</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <User size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24">
        {/* FILTERS & SEARCH */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-[2rem] border border-slate-200/60 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-[350px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, room or phone..." 
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:border-indigo-200 transition-all focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-4 pr-10 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-200 transition-all appearance-none cursor-pointer focus:bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active Residents</option>
                <option value="graduated">Graduated</option>
                <option value="inactive">Exited/Inactive</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center justify-center gap-2 bg-indigo-50/50 px-5 py-3 rounded-2xl border border-indigo-100/50 w-full sm:w-auto">
              <Users size={18} className="text-indigo-600" />
              <span className="text-sm font-black text-indigo-900">{filteredStudents.length} Students</span>
            </div>
          </div>
        </div>

        {/* STUDENT CARDS GRID */}
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center bg-white rounded-[3rem] border border-slate-200/60 shadow-sm">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
              <Users size={48} className="text-slate-200" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs">No Residents Found</p>
            <p className="text-slate-400 font-medium mt-2 max-w-xs mx-auto text-xs md:text-sm">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <AnimatePresence>
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.student_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full overflow-hidden"
                >
                  <div className="p-6 md:p-8 pb-4 md:pb-6 flex-1">
                    {/* Identity Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500 border border-slate-100/50">
                          <User size={32} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-black text-slate-800 text-lg md:text-xl tracking-tight group-hover:text-indigo-800 transition-colors truncate capitalize max-w-[150px] md:max-w-none">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border transition-all duration-500",
                              student.status === 'active' 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500" 
                                : "bg-slate-50 text-slate-500 border-slate-100"
                            )}>
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                student.status === 'active' ? "bg-emerald-500 group-hover:bg-white animate-pulse" : "bg-slate-400"
                              )} />
                              {student.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hostel & Room Info */}
                    <div className="grid grid-cols-2 gap-4 md:gap-8 mb-8 bg-slate-50/50 p-5 rounded-3xl border border-slate-100/50 group-hover:bg-white group-hover:border-indigo-100 transition-all duration-500">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Home size={14} strokeWidth={2.5} />
                          <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Hostel</span>
                        </div>
                        <p className="text-xs md:text-sm font-black text-slate-700 leading-tight truncate">
                          {student.hostel_name || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-2 pl-4 md:pl-6 border-l border-slate-200/50 group-hover:border-indigo-100">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Home size={14} strokeWidth={2.5} />
                          <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Room</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs md:text-sm font-black text-slate-700">#{student.details?.assigned_slot || student.room_number || 'N/A'}</p>
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[7px] md:text-[8px] font-black uppercase tracking-widest rounded-md border border-indigo-100">
                            {student.room_type_name?.substring(0, 8) || 'Std'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Phone size={14} />
                      </div>
                      <span className="text-[10px] md:text-xs font-bold text-slate-600 tracking-tight truncate">{student.phone}</span>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <Link 
                      href={`/owner/students/${student.student_id}`}
                      className="px-6 md:px-8 py-5 border-t border-slate-50 bg-slate-50/20 group-hover:bg-indigo-50/50 transition-all duration-500 flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">View Financial Ledger</span>
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-500 border border-slate-50 group-hover:border-indigo-100">
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </div>
                    </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsPage;
