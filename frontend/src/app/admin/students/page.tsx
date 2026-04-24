'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { GraduationCap, Loader2, Phone, Building2, User, Search, Home, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get('hostels/students');
        setStudents(res.data);
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    let result = students;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = students.filter(student => {
        const nameMatch = student.name?.toLowerCase().includes(term);
        const hostelIdMatch = student.hostel_id?.toString() === term;
        const hostelNameMatch = student.hostel_name?.toLowerCase().includes(term);
        return nameMatch || hostelIdMatch || hostelNameMatch;
      });
    }

    // Sort alphabetically by name for the global student list
    return [...result].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [students, searchTerm]);

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
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">All Students</h1>
            <p className="text-slate-500 mt-1 font-medium">Complete list of students across all hostels.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by student, hostel name or ID..."
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {filteredStudents.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <GraduationCap size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No students found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search terms.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStudents.map((student) => (
              <Link key={student.student_id} href={`/admin/students/${student.student_id}`}>
                <div className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
                  {/* Header Section */}
                  <div className="p-8 pb-0 flex items-start justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors duration-500 shadow-inner">
                        <User size={32} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-slate-800 text-xl tracking-tight group-hover:text-emerald-700 transition-colors">{student.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">ID: #{student.student_id}</span>
                          <div className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border transition-all duration-500",
                            student.status === 'active' 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-slate-50 text-slate-500 border-slate-100"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              student.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            )} />
                            {student.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body Section */}
                  <div className="p-8 space-y-8 flex-1">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Building2 size={14} strokeWidth={2} />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Hostel</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-slate-700 truncate">{student.hostel_name || 'N/A'}</p>
                          <p className="text-[10px] font-bold text-slate-400">#{student.hostel_id || '00'}</p>
                        </div>
                      </div>
                      <div className="space-y-3 pl-8 border-l border-slate-50">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Home size={14} strokeWidth={2} />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Unit</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-slate-700">#{student.room_number || 'N/A'}</p>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Assigned</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl group-hover:bg-emerald-50/30 transition-colors duration-500">
                      <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors duration-500">
                        <Phone size={18} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</span>
                        <p className="text-xs font-bold text-slate-600 tracking-wide">{student.phone || 'No Contact'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="px-8 py-5 border-t border-slate-50 bg-slate-50/20 group-hover:bg-emerald-50/50 transition-colors duration-500 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">View Details</span>
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-500">
                      <GraduationCap size={16} strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminStudents;
