'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarCheck, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Users,
  Home,
  ArrowUpRight,
  UserCheck,
  Clock
} from 'lucide-react';
import { cn } from "@/lib/utils";

const WardenAttendance = () => {
  const router = useRouter();
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [wardenId, setWardenId] = useState<number | null>(null);
  const [hostelName, setHostelName] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      setWardenId(user.id);
      fetchHostel(user.id);
    }
  }, []);

  useEffect(() => {
    if (hostelId) {
      setIsSubmitted(false);
      fetchAttendance();
    }
  }, [hostelId, selectedDate]);

  const fetchHostel = async (wId: number) => {
    try {
      const res = await api.get(`/hostels/warden/${wId}`);
      if (res.data.length > 0) {
        const hId = res.data[0].hostel_id;
        setHostelId(hId.toString());
        setHostelName(res.data[0].hostel_name);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching hostel:', err);
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!hostelId) return;
    setLoading(true);
    try {
      const res = await api.get(`/attendance/${hostelId}?date=${selectedDate}`);
      const dataWithDefaultStatus = res.data.attendance.map((student: any) => ({
        ...student,
        status: student.status || 'absent'
      }));
      setAttendance(dataWithDefaultStatus);
      setIsSubmitted(res.data.is_submitted);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      showToast('Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitAttendance = async () => {
    if (!hostelId || isFutureDate) return;
    setSubmitting(true);
    try {
      await api.post('/attendance/submit', {
        hostel_id: hostelId,
        date: selectedDate
      });
      setIsSubmitted(true);
      showToast('Attendance submitted successfully!', 'success');
    } catch (err: any) {
      console.error('Error submitting attendance:', err);
      showToast(err.response?.data?.error || 'Failed to submit attendance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isAttendanceMarked = () => {
    return attendance.some(a => a.attendance_id !== null);
  };

  const toggleAttendance = async (student: any) => {
    if (!hostelId || isFutureDate || isSubmitted) return;
    
    const newStatus = student.status === 'present' ? 'absent' : 'present';
    
    setUpdatingIds(prev => new Set([...prev, student.student_id]));
    
    setAttendance(prev => prev.map(a => 
      a.student_id === student.student_id 
        ? { ...a, status: newStatus }
        : a
    ));

    try {
      await api.post('/attendance/mark', {
        student_id: student.student_id,
        date: selectedDate,
        status: newStatus
      });
      showToast(`Marked ${student.name} as ${newStatus.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Error marking attendance:', err);
      fetchAttendance();
      showToast('Failed to update attendance', 'error');
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(student.student_id);
        return next;
      });
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const isFutureDate = selectedDate > todayStr;

  if (loading && attendance.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="warden" hostelName={hostelName} />
      <main className="flex-1 p-4 md:p-8 pt-24 md:pt-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8 md:space-y-10 pb-20">
          <div className="px-2">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              Attendance <span className="text-indigo-600">Management</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Track and manage daily student attendance.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5 md:gap-6">
            {[
              { id: 'students', label: 'Total Students', value: attendance.length, color: 'text-indigo-600', icon: UserCheck, bg: 'bg-indigo-50', border: 'border-indigo-100', accent: 'bg-indigo-500', shadow: 'shadow-indigo-200/40' },
              { id: 'present', label: 'Present Today', value: presentCount, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-500', shadow: 'shadow-emerald-200/40' },
              { id: 'absent', label: 'Absent Today', value: absentCount, color: 'text-rose-600', icon: XCircle, bg: 'bg-rose-50', border: 'border-rose-100', accent: 'bg-rose-500', shadow: 'shadow-rose-200/40' },
            ].map((card) => {
              const displayValue = card.value !== undefined && card.value !== null ? card.value : '0';
              return (
                <div
                  key={card.id}
                  className={cn(
                    "relative p-6 rounded-[30px] border transition-all duration-700 group overflow-hidden text-left bg-white border-slate-100 hover:border-indigo-200 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-2"
                  )}
                >
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-slate-50 rounded-full blur-3xl group-hover:bg-indigo-50 transition-colors duration-700" />
                  
                  <div className="relative flex flex-col h-full space-y-6">
                    <div className={cn(
                      "w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-700 relative",
                      "bg-slate-50/50 shadow-[inset_0_2px_8px_rgba(255,255,255,0.8)] group-hover:bg-white group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/10",
                      card.border
                    )}>
                      <card.icon size={24} strokeWidth={2.5} className={cn("relative transition-all duration-700", card.color)} />
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-2 group-hover:text-indigo-400 transition-colors">{card.label}</p>
                        <h3 className={cn(
                          "font-black tracking-tighter transition-all duration-500 leading-none text-slate-900 text-3xl"
                        )}>
                          {displayValue}
                        </h3>
                      </div>
                      
                      <div className="pt-1">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Performance</span>
                          <ArrowUpRight size={12} className="text-slate-200 group-hover:text-indigo-400 transition-all duration-500" />
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden relative">
                          <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out w-0 group-hover:w-full", card.accent)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <CalendarCheck size={28} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">
                      {isSubmitted ? 'Attendance Submitted' : (isAttendanceMarked() ? 'Attendance Record' : 'Mark Attendance')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute opacity-0 pointer-events-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dateInputRef.current) {
                            const input = dateInputRef.current as any;
                            if (input.showPicker) {
                              input.showPicker();
                            } else {
                              input.click();
                            }
                          }
                        }}
                        className="flex items-center gap-4 px-7 py-4 bg-white border-2 border-slate-200 hover:border-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-[0.98] group"
                      >
                        <Calendar size={26} className="text-indigo-600 group-hover:scale-125 group-hover:-rotate-6 transition-all duration-300" />
                        <div className="text-left">
                          <p className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors duration-300">
                            {new Date(selectedDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </button>
                      <div className="flex flex-wrap items-center gap-3">
                        {isToday && (
                          <div className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/30 border border-emerald-400">
                            Today
                          </div>
                        )}
                        {isFutureDate ? (
                          <div className="px-5 py-2 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 text-xs font-black uppercase tracking-widest rounded-2xl border border-orange-200">
                            Future Date
                          </div>
                        ) : isSubmitted ? (
                          <div className="px-5 py-2 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-2xl border border-emerald-200">
                            Attendance Submitted
                          </div>
                        ) : (
                          <div className="px-5 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 text-xs font-black uppercase tracking-widest rounded-2xl border border-amber-200">
                            Attendance Pending
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {isSubmitted ? (
                    <div className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl border border-emerald-400 cursor-not-allowed flex items-center gap-3 shadow-xl shadow-emerald-500/30">
                      <CheckCircle2 size={20} />
                      Attendance Submitted
                    </div>
                  ) : (
                    <button
                      onClick={submitAttendance}
                      disabled={submitting}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl border border-indigo-500 hover:from-indigo-700 hover:to-blue-700 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <CheckCircle2 size={20} />
                      )}
                      {submitting ? 'Submitting...' : 'Submit Attendance'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isFutureDate && (
              <div className="p-8 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-y border-amber-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                    <Clock size={28} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">Future Attendance Cannot Be Marked</h4>
                    <p className="text-slate-600 text-sm font-medium mt-2">
                      Attendance can only be marked for today or previous dates. Please select a valid date from the calendar above.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-20 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-700">Loading attendance records...</p>
                    <p className="text-sm text-slate-400 mt-2">Please wait while we fetch the data</p>
                  </div>
                </div>
              </div>
            ) : attendance.length === 0 ? (
              <div className="p-24 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Users size={48} className="text-slate-300" />
                </div>
                <h4 className="text-xl font-black text-slate-700 mb-3">No Students Found</h4>
                <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-sm">
                  There are no active students in this hostel
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b-2 border-slate-200 w-16">#</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b-2 border-slate-200">Student</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b-2 border-slate-200 w-32">Room</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b-2 border-slate-200 w-40 text-right">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance.map((student, idx) => (
                        <tr 
                          key={student.student_id} 
                          className="hover:bg-gradient-to-r from-indigo-50/80 to-blue-50/50 transition-all duration-300"
                        >
                          <td className="px-8 py-6">
                            <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center font-black text-indigo-600 hover:bg-white hover:shadow-xl hover:scale-110 transition-all duration-300 border border-slate-200 hover:border-indigo-200 text-lg">
                                {student.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-black text-slate-900 hover:text-indigo-700 transition-colors">
                                  {student.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-200 hover:text-indigo-700 transition-all shadow-sm">
                              {student.room_number}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              type="button"
                              onClick={() => toggleAttendance(student)}
                              disabled={updatingIds.has(student.student_id) || isSubmitted || isFutureDate}
                              className={cn(
                                "relative w-20 h-10 rounded-2xl transition-all duration-300 ease-out border-2 shadow-md overflow-hidden",
                                isSubmitted || isFutureDate
                                  ? "opacity-60 cursor-not-allowed border-slate-300"
                                  : student.status === 'present'
                                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500 border-emerald-500 shadow-emerald-500/30"
                                    : "bg-gradient-to-r from-slate-200 to-slate-300 border-slate-300"
                              )}
                            >
                              {updatingIds.has(student.student_id) ? (
                                <Loader2 className="animate-spin mx-auto text-white" size={18} />
                              ) : (
                                <>
                                  <motion.div
                                    layout
                                    transition={{ 
                                      type: "spring", 
                                      stiffness: 700, 
                                      damping: 25 
                                    }}
                                    className={cn(
                                      "absolute top-1 w-7 h-7 bg-white rounded-xl shadow-lg flex items-center justify-center font-extrabold text-sm z-10",
                                      student.status === 'present'
                                        ? "text-emerald-600"
                                        : "text-slate-500"
                                    )}
                                    style={{ 
                                      left: student.status === 'present' ? '38px' : '3px' 
                                    }}
                                  >
                                    {student.status === 'present' ? 'P' : 'A'}
                                  </motion.div>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3",
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="font-black text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WardenAttendance;
