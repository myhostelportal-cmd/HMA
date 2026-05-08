'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { 
  GraduationCap, 
  ArrowLeft, 
  Loader2, 
  Phone, 
  Home, 
  Calendar,
  User,
  Search,
  Filter
} from 'lucide-react';

const HostelStudentDirectory = () => {
  const { id } = useParams();
  const router = useRouter();
  const [hostel, setHostel] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hostelRes, studentsRes] = await Promise.all([
          api.get(`/hostels/${id}/details`),
          api.get(`/hostels/${id}/students`)
        ]);
        setHostel(hostelRes.data);
        setStudents(studentsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const filteredStudents = useMemo(() => {
    let result = students;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = students.filter(student => 
        student.name?.toLowerCase().includes(term) ||
        student.student_id?.toString().includes(term) ||
        student.room_number?.toString().includes(term) ||
        student.room_id?.toString().includes(term)
      );
    }

    // Sort by room number in ascending order (natural sort)
    return [...result].sort((a, b) => {
      const roomA = (a.room_number || a.room_id || "").toString();
      const roomB = (b.room_number || b.room_id || "").toString();
      return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
    });
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
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Hostel
        </button>

        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Directory</h1>
          </div>
          <p className="text-slate-500 font-medium">Viewing all residents of <span className="text-blue-600 font-bold">{hostel?.hostel_name}</span></p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, ID, or room..." 
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={20} />
            <span>Filters</span>
          </button>
        </div>

        {filteredStudents.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <User size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No students found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Card key={student.student_id} className="hover:border-blue-500 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{student.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student ID: #{student.student_id}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {student.status}
                  </span>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Home size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Room Information</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                      Room {student.room_number || student.room_id}
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-blue-600 uppercase text-[10px]">{student.capacity ? `${student.capacity}-Seater` : 'N/A'}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-slate-500 uppercase text-[10px]">{student.room_type || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Phone size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Contact Number</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{student.phone}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={14} />
                    <span className="text-xs font-medium">Joined {new Date(student.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <Link 
                    href={`/admin/students/${student.student_id}`}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest hover:underline transition-colors"
                  >
                    Full Profile
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HostelStudentDirectory;
