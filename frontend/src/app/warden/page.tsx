'use client';

import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Home,
  ChevronRight,
  Calendar,
  ShieldCheck,
  Activity,
  DollarSign,
  Key,
  Smartphone,
  MapPin,
  Clock,
  Bell
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
      setToast({
        show: true,
        message: `Reminders sent successfully!`,
        type: 'success'
      });
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
      setToast({
        show: true,
        message: `Email reminders sent successfully!`,
        type: 'success'
      });
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
      const hostelsWithStats = await Promise.all(hostelsData.map(async (hostel: any) => {
        try {
          const summaryRes = await api.get(`/hostels/${hostel.hostel_id}/dashboard-summary`);
          const data = summaryRes.data;
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#64748B] font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen relative">
      {/* Toast Notification */}
      {toast && toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right fade-in duration-500">
          <div className={cn(
            "flex items-center gap-4 px-6 py-4 rounded-2xl shadow-xl border border-white/50 backdrop-blur-xl",
            toast.type === 'success'
              ? "bg-[#22C55E]/10 border-[#22C55E]/20"
              : "bg-[#EF4444]/10 border-[#EF4444]/20"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              toast.type === 'success' ? "bg-[#22C55E] text-white" : "bg-[#EF4444] text-white"
            )}>
              {toast.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <AlertCircle size={20} strokeWidth={2.5} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-bold text-sm leading-none",
                toast.type === 'success' ? "text-[#166534]" : "text-[#991B1B]"
              )}>
                {toast.type === 'success' ? 'Success!' : 'Error'}
              </p>
              <p className={cn(
                "text-xs font-medium mt-1.5",
                toast.type === 'success' ? "text-[#16A34A]" : "text-[#DC2626]"
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
      <main className="flex-1 p-6 md:p-10 pt-28 md:pt-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-10">
          {hostels.map((hostel) => (
            <div key={hostel.hostel_id} className="space-y-10">
              {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <p className="text-[#64748B] font-bold text-xs uppercase tracking-[0.2em]">Today&apos;s Overview</p>
                  <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">
                    Welcome back, <span className="text-[#4F46E5]">{user?.name || 'Warden'}</span> 👋
                  </h2>
                  <p className="text-[#64748B] font-medium text-base">Here&apos;s your operational overview for today.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  {/* Date Picker Placeholder */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
                    <Calendar size={18} className="text-[#64748B]" />
                    <span className="text-[#0F172A] font-semibold text-sm">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <ChevronRight size={14} className="text-[#94A3B8]" />
                  </div>

                  {/* WhatsApp Button */}
                  <button
                    onClick={sendReminders}
                    disabled={sendingReminders}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md border border-transparent",
                      sendingReminders
                        ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border-[#E2E8F0]"
                        : "bg-[#25D366] text-white hover:bg-[#1DB954] hover:shadow-[#25D366]/25 active:scale-95 border-[#128C7E]/20"
                    )}
                  >
                    {sendingReminders ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MessageSquare size={18} strokeWidth={2.5} />
                    )}
                    <span className="hidden md:inline">WhatsApp</span>
                  </button>

                  {/* Email Button */}
                  <button
                    onClick={sendEmailReminders}
                    disabled={sendingEmailReminders}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md border border-transparent",
                      sendingEmailReminders
                        ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border-[#E2E8F0]"
                        : "bg-[#3B82F6] text-white hover:bg-[#2563EB] hover:shadow-[#3B82F6]/25 active:scale-95 border-[#2563EB]/20"
                    )}
                  >
                    {sendingEmailReminders ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Mail size={18} strokeWidth={2.5} />
                    )}
                    <span className="hidden md:inline">Email</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {[
                  {
                    id: 'students',
                    label: 'Total Students',
                    value: `${hostel.stats?.totalStudents || 0}`,
                    subValue: `/${hostel.stats?.totalRooms || 0}`,
                    color: 'text-[#4F46E5]',
                    icon: Users,
                    bg: 'bg-[#4F46E5]/10',
                    trend: '+12%',
                    trendDir: 'up'
                  },
                  {
                    id: 'collection',
                    label: 'Collection Ratio',
                    value: `${hostel.stats?.collectionRatio || 0}%`,
                    color: 'text-[#64748B]',
                    icon: Home,
                    bg: 'bg-[#64748B]/10',
                    trend: '+8%',
                    trendDir: 'up'
                  },
                  {
                    id: 'occupancy',
                    label: 'Occupancy Rate',
                    value: `${hostel.stats?.occupancyRate || 0}%`,
                    color: 'text-[#22C55E]',
                    icon: CheckCircle2,
                    bg: 'bg-[#22C55E]/10',
                    trend: '+3%',
                    trendDir: 'up'
                  },
                  {
                    id: 'pending',
                    label: 'Pending Fees',
                    value: `₹${Math.floor(hostel.stats?.pendingFees || 0).toLocaleString()}`,
                    color: 'text-[#4F46E5]',
                    icon: DollarSign,
                    bg: 'bg-[#4F46E5]/10',
                    trend: '-5%',
                    trendDir: 'down'
                  },
                  {
                    id: 'overdue',
                    label: 'Overdue Accounts',
                    value: hostel.dueAlerts?.length || 0,
                    color: 'text-[#EF4444]',
                    icon: AlertCircle,
                    bg: 'bg-[#EF4444]/10',
                    trend: '+2%',
                    trendDir: 'up'
                  }
                ].map((card) => (
                  <div
                    key={card.id}
                    className="relative p-7 rounded-[28px] bg-white border border-[#E2E8F0] hover:border-[#4F46E5]/20 transition-all duration-500 group overflow-hidden hover:shadow-[0_20px_40px_rgba(79,70,229,0.08)] hover:-translate-y-1"
                  >
                    {/* Background Glow */}
                    <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#4F46E5]/5 rounded-full blur-3xl group-hover:bg-[#4F46E5]/10 transition-colors duration-700" />
                    <div className="relative flex flex-col h-full gap-6">
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-[20px] bg-white shadow-inner border border-[#F1F5F9] flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                        <card.icon size={26} className={cn(card.color)} />
                      </div>
                      {/* Metrics */}
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.25em]">
                          {card.label}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <h3 className="text-3xl font-bold text-[#0F172A] tracking-tight">
                            {card.value}
                          </h3>
                          {card.subValue && (
                            <span className="text-[#94A3B8] text-xl font-semibold">
                              {card.subValue}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Trend */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold",
                          card.trendDir === 'up' ? "bg-[#22C55E]/10 text-[#16A34A]" : "bg-[#EF4444]/10 text-[#DC2626]"
                        )}>
                          {card.trendDir === 'up' ? (
                            <TrendingUp size={14} strokeWidth={3} />
                          ) : (
                            <TrendingUp size={14} strokeWidth={3} className="rotate-180" />
                          )}
                          {card.trend}
                          <span className="text-[#64748B] font-medium ml-1">vs last month</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Priority Due Alerts & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Priority Due Alerts */}
                <div className="lg:col-span-2 bg-white rounded-[28px] border border-[#E2E8F0] shadow-[0_20px_40px_rgba(15,23,42,0.03)] overflow-hidden">
                  <div className="px-8 py-7 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#EF4444]/10 rounded-2xl flex items-center justify-center text-[#EF4444]">
                        <Clock size={24} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">Priority Due Alerts</h3>
                        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-[0.2em] mt-1">Financial Overview</p>
                      </div>
                    </div>
                    <Link
                      href="/warden/fees"
                      className="flex items-center gap-2 px-4 py-2 text-[#4F46E5] font-semibold text-sm hover:bg-[#4F46E5]/5 rounded-xl transition-colors"
                    >
                      View All <ChevronRight size={16} />
                    </Link>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    {hostel.dueAlerts?.length > 0 ? (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#F8FAFC]/80">
                            <th className="px-8 py-5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#F1F5F9]">
                              Student Name
                            </th>
                            <th className="px-8 py-5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#F1F5F9]">
                              Room No
                            </th>
                            <th className="px-8 py-5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#F1F5F9]">
                              Payment Model
                            </th>
                            <th className="px-8 py-5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#F1F5F9]">
                              Total Due
                            </th>
                            <th className="px-8 py-5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#F1F5F9] text-right">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {hostel.dueAlerts.map((alert: any, idx: number) => (
                            <tr
                              key={idx}
                              className="group hover:bg-[#4F46E5]/5 transition-all duration-300 cursor-pointer"
                              onClick={() => window.location.href = `/warden/students/${alert.student_id}`}
                            >
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4F46E5]/20 to-[#6366F1]/20 text-[#4F46E5] flex items-center justify-center font-bold text-lg border border-[#4F46E5]/10 group-hover:bg-[#4F46E5] group-hover:text-white group-hover:scale-110 transition-all duration-300">
                                    {alert.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <p className="font-semibold text-[#0F172A]">{alert.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl">
                                  {alert.room_number || 'N/A'}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-widest bg-[#4F46E5]/10 px-3 py-1.5 rounded-xl">
                                  {alert.payment_model}
                                </span>
                              </td>
                              <td className="px-8 py-6 font-bold text-[#EF4444] text-base">
                                ₹{(alert.total_due || 0).toLocaleString()}
                              </td>
                              <td className="px-8 py-6 text-right">
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                                  Overdue
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-8 py-20 text-center">
                        <div className="w-16 h-16 bg-[#22C55E]/10 text-[#22C55E] rounded-full flex items-center justify-center mx-auto mb-5">
                          <CheckCircle2 size={32} />
                        </div>
                        <p className="text-sm font-bold text-[#64748B] uppercase tracking-[0.2em]">All Financials Normalized</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity & Authorization Card */}
                <div className="space-y-8">
                  {/* Recent Activity */}
                  <div className="bg-white rounded-[28px] border border-[#E2E8F0] shadow-[0_20px_40px_rgba(15,23,42,0.03)] overflow-hidden h-[400px] flex flex-col">
                    <div className="px-7 py-6 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#4F46E5]/10 rounded-2xl flex items-center justify-center text-[#4F46E5]">
                          <Activity size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-[#0F172A] tracking-tight">Recent Activity</h3>
                          <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em] mt-1">Audit Trail</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-7 py-6 custom-scrollbar">
                      {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
                        <div key={idx} className="mb-6 last:mb-0 group">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 w-3 h-3 rounded-full bg-[#4F46E5] shadow-[0_0_0_4px_rgba(79,70,229,0.1)]" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-[#0F172A] leading-relaxed group-hover:text-[#4F46E5] transition-colors">
                                {log.action}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] px-2 py-1 bg-[#F1F5F9] rounded-lg">
                                  {log.module}
                                </span>
                                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">
                                  {new Date(log.timestamp).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-16 text-center">
                          <p className="text-sm font-bold text-[#94A3B8] uppercase tracking-[0.2em]">No Recent Activity</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Authorization Card */}
                  <div className="relative bg-gradient-to-br from-[#4F46E5] to-[#6366F1] rounded-[28px] p-8 text-white shadow-2xl shadow-[#4F46E5]/25 overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute -top-16 -right-16 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-8 -left-8">
                      <ShieldCheck size={120} className="text-white/10" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between gap-6">
                      <div className="space-y-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-lg rounded-[24px] flex items-center justify-center">
                          <ShieldCheck size={28} />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold tracking-tight leading-tight">Active Session Verified</h4>
                          <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.2em] mt-2">Your session is secure</p>
                        </div>
                      </div>
                      <div className="pt-5 border-t border-white/15">
                        <div className="grid grid-cols-2 gap-4 mb-5">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Session Started</p>
                            <p className="text-sm font-semibold text-white/90">Just now</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Device</p>
                            <p className="text-sm font-semibold text-white/90">Web Browser</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Last Login</p>
                            <p className="text-sm font-semibold text-white/90">Today</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Status</p>
                            <p className="text-sm font-semibold text-[#22C55E]">Verified</p>
                          </div>
                        </div>
                        <button className="w-full py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 rounded-xl text-sm font-semibold transition-all duration-300">
                          Verify Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    href: `/warden/students?hostel=${hostel.hostel_id}`,
                    icon: GraduationCap,
                    title: 'Resident Registry',
                    description: 'Manage and view students',
                    actionText: 'Manage Residents',
                    color: 'from-[#3B82F6] to-[#4F46E5]'
                  },
                  {
                    href: `/warden/fees?hostel=${hostel.hostel_id}`,
                    icon: CreditCard,
                    title: 'Financial Matrix',
                    description: 'View collection and fees',
                    actionText: 'View Financials',
                    color: 'from-[#4F46E5] to-[#7C3AED]'
                  },
                  {
                    href: `/warden/expenses?hostel=${hostel.hostel_id}`,
                    icon: Activity,
                    title: 'Asset Expenditure',
                    description: 'Track maintenance logs',
                    actionText: 'View Reports',
                    color: 'from-[#22C55E] to-[#10B981]'
                  },
                  {
                    href: `/warden/whatsapp`,
                    icon: MessageSquare,
                    title: 'Support Queue',
                    description: 'Manage communications',
                    actionText: 'View Tickets',
                    color: 'from-[#EF4444] to-[#F43F5E]'
                  }
                ].map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="group relative p-7 bg-white rounded-[28px] border border-[#E2E8F0] hover:border-[#4F46E5]/20 transition-all duration-500 shadow-[0_10px_30px_rgba(15,23,42,0.02)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.08)] hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F46E5]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 group-hover:bg-[#4F46E5]/10 transition-all duration-1000" />
                    <div className="relative space-y-6">
                      <div className="w-14 h-14 bg-[#F1F5F9] text-[#64748B] rounded-[24px] flex items-center justify-center group-hover:bg-gradient-to-br group-hover:text-white group-hover:rotate-3 transition-all duration-500 shadow-inner" style={{ background: item.color }}>
                        <item.icon size={28} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-[#0F172A] tracking-tight text-lg group-hover:text-[#4F46E5] transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[#64748B] text-sm font-medium opacity-80">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[#4F46E5] font-bold text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                        <span>{item.actionText}</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default WardenDashboard;
