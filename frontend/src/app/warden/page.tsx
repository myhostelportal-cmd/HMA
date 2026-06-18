'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  MessageSquare,
  Mail,
  BarChart3,
  Loader2,
  Plus,
  Layout,
  Home,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Activity,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WardenDashboard = () => {
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingEmailReminders, setSendingEmailReminders] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchWardenData(parsedUser.id);
      fetchRecentLogs(parsedUser.id);
    }
  }, []);

  const fetchRecentLogs = async (wardenId: number) => {
    try {
      const res = await api.get(`/hostels/warden/${wardenId}/logs`);
      setRecentLogs(res.data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const sendReminders = async () => {
    if (sendingReminders) return;
    setSendingReminders(true);
    try {
      const res = await api.post('/warden/send-reminders');
      const { totalStudents, messagesSent, failedMessages } = res.data;
      
      if (totalStudents === 0) {
        setToast({
          show: true,
          message: 'No priority due alerts found',
          type: 'success'
        });
      } else {
        let message = `Total students: ${totalStudents} | Messages sent: ${messagesSent}`;
        if (failedMessages > 0) {
          message += ` | Failed: ${failedMessages}`;
        }
        setToast({
          show: true,
          message,
          type: 'success'
        });
      }
      setTimeout(() => setToast(null), 7000);
    } catch (err: any) {
      setToast({
        show: true,
        message: err.response?.data?.error || 'Failed to send reminders',
        type: 'error'
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSendingReminders(false);
    }
  };

  const sendEmailReminders = async () => {
    if (sendingEmailReminders) return;
    setSendingEmailReminders(true);
    try {
      const res = await api.post('/warden/send-email-reminders');
      const { totalStudents, emailsSent, failedEmails } = res.data;
      
      if (totalStudents === 0) {
        setToast({
          show: true,
          message: 'No priority due alerts found',
          type: 'success'
        });
      } else {
        let message = `Total students: ${totalStudents} | Emails sent: ${emailsSent}`;
        if (failedEmails > 0) {
          message += ` | Failed: ${failedEmails}`;
        }
        setToast({
          show: true,
          message,
          type: 'success'
        });
      }
      setTimeout(() => setToast(null), 7000);
    } catch (err: any) {
      setToast({
        show: true,
        message: err.response?.data?.error || 'Failed to send email reminders',
        type: 'error'
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSendingEmailReminders(false);
    }
  };

  const fetchWardenData = async (wardenId: number) => {
    try {
      const res = await api.get(`/hostels/warden/${wardenId}`);
      const hostelsData = res.data;
      
      // Fetch consolidated data for each hostel in parallel
      const hostelsWithStats = await Promise.all(hostelsData.map(async (hostel: any) => {
        try {
          const summaryRes = await api.get(`/hostels/${hostel.hostel_id}/dashboard-summary`);
          const data = summaryRes.data;

          // Fetch correct due alerts from finance API
          const dueAlertsRes = await api.get(`/finance/due-alerts/${hostel.hostel_id}`);

          return { 
            ...hostel, 
            stats: data.stats,
            room_details: data.details.room_details,
            rooms: data.rooms,
            dueAlerts: dueAlertsRes.data
          };
        } catch (e) {
          console.error(`Error fetching summary for hostel ${hostel.hostel_id}:`, e);
          return { 
            ...hostel, 
            stats: { totalStudents: 0, totalRooms: 0, availableRooms: 0 },
            room_details: [],
            rooms: []
          };
        }
      }));
      
      setHostels(hostelsWithStats);
    } catch (err) {
      console.error('Error fetching warden data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMatrixData = (hostel: any) => {
    if (!hostel.room_details) return null;

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
        
        const created = hostel.rooms.filter((r: any) => r.room_type === type && r.capacity === cap).length;
        matrix[cap][type] = { allowed, created, remaining: Math.max(0, allowed - created) };
      });
    });

    return { matrix, types, capacities };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen relative">
      {/* Toast Notification */}
      {toast && toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right fade-in duration-500">
          <div className={cn(
            "flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border border-white/50 backdrop-blur-md",
            toast.type === 'success' 
              ? "bg-emerald-50 border-emerald-100" 
              : "bg-rose-50 border-rose-100"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              toast.type === 'success' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            )}>
              {toast.type === 'success' ? (
                <CheckCircle2 size={20} strokeWidth={2.5} />
              ) : (
                <AlertCircle size={20} strokeWidth={2.5} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-black text-sm leading-tight",
                toast.type === 'success' ? "text-emerald-900" : "text-rose-900"
              )}>
                {toast.type === 'success' ? 'Reminders Sent!' : 'Error'}
              </p>
              <p className={cn(
                "text-xs font-medium mt-0.5",
                toast.type === 'success' ? "text-emerald-600" : "text-rose-600"
              )}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <Sidebar role="warden" hostelName={hostels[0]?.hostel_name} />
      <main className="flex-1 p-4 md:p-8 pt-24 md:pt-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-10 md:space-y-12 pb-20">
          {/* Header section removed as per instructions */}
          
          {hostels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 px-6 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Home size={40} className="text-slate-200" />
              </div>
              <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs md:text-sm">No Assignment Found</p>
              <p className="text-slate-400 font-medium mt-2 max-w-xs mx-auto text-sm">Please wait for the administrator to authorize your hostel assignment.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Welcome Greeting Section */}
              <div className="px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    Welcome, <span className="text-indigo-600">{user?.name || 'Warden'}</span>
                  </h2>
                  <p className="text-slate-400 text-sm font-medium mt-1">Here is your operational overview for today.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* WhatsApp Reminder Button - Compact & Branded Green */}
                  <button
                    onClick={sendReminders}
                    disabled={sendingReminders}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md border border-transparent",
                      sendingReminders
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200"
                        : "bg-[#25D366] text-white hover:bg-[#1DB954] hover:shadow-[#25D366]/25 active:scale-95 border-[#128C7E]/20"
                    )}
                  >
                    {sendingReminders ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span className="hidden md:inline">Sending...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare size={18} strokeWidth={2.5} />
                        <span className="hidden md:inline">Send on WhatsApp</span>
                        <span className="md:hidden">WhatsApp</span>
                      </>
                    )}
                  </button>

                  {/* Email Reminder Button - Compact Professional Blue */}
                  <button
                    onClick={sendEmailReminders}
                    disabled={sendingEmailReminders}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md border border-transparent",
                      sendingEmailReminders
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200"
                        : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/25 active:scale-95 border-blue-700/20"
                    )}
                  >
                    {sendingEmailReminders ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span className="hidden md:inline">Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={18} strokeWidth={2.5} />
                        <span className="hidden md:inline">Send on Email</span>
                        <span className="md:hidden">Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {hostels.map((hostel) => (
                <div key={hostel.hostel_id} className="space-y-12">
                  {/* 1. ELITE MODERN SUMMARY CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
                    {[
                      { id: 'students', label: 'Total Students', value: `${hostel.stats?.totalStudents || 0}/${hostel.stats?.totalRooms || 0}`, color: 'text-indigo-600', icon: UserCheck, bg: 'bg-indigo-50', border: 'border-indigo-100', accent: 'bg-indigo-500', shadow: 'shadow-indigo-200/40', glow: 'group-hover:shadow-indigo-500/20' },
                      { id: 'rooms', label: 'Collection Ratio', value: `${hostel.stats?.collectionRatio || 0}%`, color: 'text-slate-600', icon: Home, bg: 'bg-slate-50', border: 'border-slate-100', accent: 'bg-slate-500', shadow: 'shadow-slate-200/40', glow: 'group-hover:shadow-indigo-500/20' },
                      { id: 'available', label: 'Occupancy Rate', value: `${hostel.stats?.occupancyRate || 0}%`, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-500', shadow: 'shadow-emerald-200/40', glow: 'group-hover:shadow-emerald-500/20' },
                      { id: 'revenue', label: 'Pending Fees', value: `₹${Math.floor(hostel.stats?.pendingFees || 0).toLocaleString()}`, color: 'text-indigo-600', icon: TrendingUp, bg: 'bg-indigo-50', border: 'border-indigo-100', accent: 'bg-indigo-500', shadow: 'shadow-indigo-200/40', glow: 'group-hover:shadow-indigo-500/20' },
                      { id: 'overdue', label: 'Overdue Accounts', value: hostel.dueAlerts?.length || 0, color: 'text-rose-600', icon: AlertCircle, bg: 'bg-rose-50', border: 'border-rose-100', accent: 'bg-rose-500', shadow: 'shadow-rose-200/40', glow: 'group-hover:shadow-rose-500/20' },
                    ].map((card) => {
                      const displayValue = card.value !== undefined && card.value !== null ? card.value : '0';
                      return (
                        <div
                          key={card.id}
                          className={cn(
                            "relative p-8 rounded-[40px] border transition-all duration-700 group overflow-hidden text-left bg-white border-slate-100 hover:border-indigo-200 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-2"
                          )}
                        >
                          {/* Interactive Background Glow */}
                          <div className="absolute -top-24 -right-24 w-48 h-48 bg-slate-50 rounded-full blur-3xl group-hover:bg-indigo-50 transition-colors duration-700" />
                          
                          <div className="relative flex flex-col h-full space-y-8">
                            <div className={cn(
                              "w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-700 relative",
                              "bg-slate-50/50 shadow-[inset_0_2px_8px_rgba(255,255,255,0.8)] group-hover:bg-white group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/10",
                              card.border
                            )}>
                              <card.icon size={28} strokeWidth={2.5} className={cn("relative transition-all duration-700", card.color)} />
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-3 group-hover:text-indigo-400 transition-colors">{card.label}</p>
                                <h3 className={cn(
                                  "font-black tracking-tighter transition-all duration-500 leading-none text-slate-900",
                                  card.id === 'revenue' ? "text-2xl" : "text-4xl"
                                )}>
                                  {card.id === 'students' && typeof displayValue === 'string' && displayValue.includes('/') ? (
                                    <>
                                      {displayValue.split('/')[0]}
                                      <span className="text-slate-300 ml-1">/ {displayValue.split('/')[1]}</span>
                                    </>
                                  ) : displayValue}
                                </h3>
                              </div>
                              
                              <div className="pt-2">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Performance</span>
                                  <ArrowUpRight size={14} className="text-slate-200 group-hover:text-indigo-400 transition-all duration-500" />
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                  <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out w-0 group-hover:w-full", card.accent)} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-8 md:space-y-12">
                    {/* 2. OPERATIONAL DUE ALERTS - ELITE TABLE DESIGN */}
                    <div className="bg-white rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                      <div className="p-8 md:p-10 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-slate-50/30">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-rose-500">
                            <Clock size={28} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Priority Due Alerts</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Financial Oversight Matrix</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="px-5 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/20 animate-pulse">
                            Action Required
                          </div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Student Name</th>
                              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Room No</th>
                              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Payment Model</th>
                              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Total Due Amount</th>
                              <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {hostel.dueAlerts?.length > 0 ? hostel.dueAlerts.map((alert: any, idx: number) => (
                              <tr 
                                key={idx} 
                                className="group hover:bg-indigo-50/30 transition-all duration-500 cursor-pointer"
                                onClick={() => window.location.href = `/warden/students/${alert.student_id}`}
                              >
                                <td className="px-10 py-8">
                                  <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-indigo-600 group-hover:bg-white group-hover:shadow-lg group-hover:scale-110 transition-all duration-500 border border-transparent group-hover:border-slate-100 text-lg">
                                      {alert.name.charAt(0)}
                                    </div>
                                    <Link 
                                      href={`/warden/students/${alert.student_id}`}
                                      className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {alert.name}
                                    </Link>
                                  </div>
                                </td>
                                <td className="px-10 py-8">
                                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">
                                    {alert.room_number ? `${alert.room_number} ${alert.seat_label || ''}`.trim() : 'N/A'}
                                  </span>
                                </td>
                                <td className="px-10 py-8">
                                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50/50 px-3 py-1.5 rounded-lg">{alert.payment_model}</span>
                                </td>
                                <td className="px-10 py-8 font-black text-rose-600 text-base">₹{(alert.total_due || 0).toLocaleString()}</td>
                                <td className="px-10 py-8 text-right">
                                  <span className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm inline-block transition-all duration-500 bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500 group-hover:text-white">
                                    {alert.status}
                                  </span>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={5} className="px-10 py-24 text-center">
                                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <CheckCircle2 size={40} />
                                  </div>
                                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">All Financials Normalized</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 3. RECENT WARDEN ACTIVITY LOG */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 items-stretch">
                      <div className="lg:col-span-2 bg-white rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-[500px]">
                        <div className="p-8 md:p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 shrink-0">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                              <Activity size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Audit Trail & Operations Log</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-6 custom-scrollbar">
                          {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
                            <div key={idx} className="flex items-start gap-5 group">
                              <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-black text-slate-800 leading-relaxed">{log.action}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{log.module}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {new Date(log.timestamp).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="py-12 text-center h-full flex items-center justify-center">
                              <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No recent logs found</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-1 bg-indigo-600 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/30 h-[500px]">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10 h-full flex flex-col justify-between">
                          <div className="space-y-6">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-[24px] flex items-center justify-center">
                              <ShieldCheck size={32} />
                            </div>
                            <div>
                              <h4 className="text-2xl font-black tracking-tight leading-tight">Warden Authorization</h4>
                              <p className="text-indigo-100/60 font-bold text-xs uppercase tracking-widest mt-2">Active Session Verified</p>
                            </div>
                          </div>
                          <div className="pt-10 border-t border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200/50 mb-4">Warden Identity</p>
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                                {user?.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-lg leading-none">{user?.name}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mt-1">{user?.role}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. OPERATIONS GRID - ELITE BENTO TILES */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                      {[
                        { href: `/warden/students?hostel=${hostel.hostel_id}`, icon: GraduationCap, label: 'Resident Registry', sub: 'Directory Management', color: 'from-blue-500 to-indigo-600' },
                        { href: `/warden/fees?hostel=${hostel.hostel_id}`, icon: CreditCard, label: 'Financial Matrix', sub: 'Collection & Revenue', color: 'from-indigo-500 to-purple-600' },
                        { href: `/warden/expenses?hostel=${hostel.hostel_id}`, icon: Activity, label: 'Asset Expenditure', sub: 'Maintenance Logs', color: 'from-emerald-500 to-teal-600' },
                        { href: `/warden/complaints?hostel=${hostel.hostel_id}`, icon: MessageSquare, label: 'Support Queue', sub: 'Issue Resolution', color: 'from-rose-500 to-pink-600' },
                      ].map((item, i) => (
                        <Link 
                          key={i}
                          href={item.href} 
                          className="group relative p-10 bg-white rounded-[40px] border border-slate-100 hover:border-indigo-600 transition-all duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_60px_-15px_rgba(79,70,229,0.15)] overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 group-hover:bg-indigo-500/10 transition-all duration-1000" />
                          
                          <div className="relative space-y-8">
                            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-[24px] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-inner group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                              <item.icon size={32} />
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs group-hover:text-indigo-600 transition-colors">{item.label}</h4>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest opacity-60">{item.sub}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                              <span>Open Matrix</span>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WardenDashboard;
