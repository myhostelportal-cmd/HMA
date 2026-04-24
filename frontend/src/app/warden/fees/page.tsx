'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Calendar,
  Loader2,
  X,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Download,
  CheckCircle2,
  History,
  Info,
  BadgeAlert,
  ChevronRight,
  IndianRupee,
  Users,
  Fingerprint,
  Home,
  UserCircle,
  MessageSquare,
  Eye,
  ArrowUpRight,
  Bell,
  Mail,
  Scale,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WardenFeesPage() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hostelId, setHostelId] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState<number | null>(null);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'UPI',
    transaction_id: '',
    confirm_transaction_id: '',
    remarks: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  const [generateData, setGenerateData] = useState({
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    amount: ''
  });

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    if (userData.id) {
      fetchHostel(userData.id);
    }
  }, []);

  // FAILSAFE REFETCH: If data is missing student names, try fetching again once
  useEffect(() => {
    if (fees.length > 0 && !fees[0].student_name && !fees[0].name) {
      console.warn('DATA INCONSISTENCY DETECTED: Missing student names. Retrying fetch...');
      if (hostelId) {
        fetchFees(hostelId);
      }
    }
  }, [fees, hostelId]);

  const fetchHostel = async (wardenId: number) => {
    try {
      const res = await api.get(`/hostels/warden/${wardenId}`);
      if (res.data.length > 0) {
        setHostelId(res.data[0].hostel_id);
        fetchFees(res.data[0].hostel_id);
      }
    } catch (err) {
      console.error('Error fetching hostel:', err);
      setLoading(false);
    }
  };

  const fetchFees = async (hId: number) => {
    try {
      // CACHE BUSTER: Added timestamp to ensure we get fresh data from the server
      const res = await api.get(`/hostels/${hId}/fees?t=${new Date().getTime()}`);
      console.log('DEBUG FEES DATA RECEIVED:', res.data[0]);
      setFees(res.data);
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    if (!hostelId) return;
    setRoomLoading(true);
    try {
      const res = await api.get(`/hostels/${hostelId}/rooms`);
      setRooms(res.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setRoomLoading(false);
    }
  };

  const fetchRoomStudents = async (roomId: number) => {
    setStudentLoading(true);
    try {
      const res = await api.get(`/hostels/rooms/${roomId}`);
      setSelectedRoom(res.data);
      setPaymentStep(2);
    } catch (err) {
      console.error('Error fetching room students:', err);
    } finally {
      setStudentLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    // Validate Transaction ID for digital payments
    if (paymentForm.method !== 'Cash' && paymentForm.transaction_id !== paymentForm.confirm_transaction_id) {
      alert('Transaction IDs do not match!');
      return;
    }

    setPaymentLoading(true);
    try {
      await api.post(`/finance/student/${selectedStudent.student_id}/pay`, {
        amount_paid: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method,
        transaction_id: paymentForm.transaction_id,
        remarks: paymentForm.remarks,
        actual_payment_date: paymentForm.date
      });
      setShowPaymentModal(false);
      resetPaymentFlow();
      if (hostelId) fetchFees(hostelId);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error recording payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetPaymentFlow = () => {
    setPaymentStep(1);
    setSelectedRoom(null);
    setSelectedStudent(null);
    setPaymentForm({
      amount: '',
      method: 'UPI',
      transaction_id: '',
      confirm_transaction_id: '',
      remarks: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleGenerateFees = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/finance/hostel/${hostelId}/generate-monthly`, {
        month: generateData.month,
        amount: parseFloat(generateData.amount)
      });
      setShowGenerateModal(false);
      if (hostelId) fetchFees(hostelId);
    } catch (err) {
      alert('Error generating monthly fees');
    }
  };

  const handleSendLegalNotice = async (fee: any) => {
    const studentName = fee.student_name || fee.name || 'Resident';
    const amount = (parseFloat(fee.amount || 0) + parseFloat(fee.adjustment_amount || 0) - parseFloat(fee.paid_amount || 0)).toLocaleString();
    const dueDate = new Date(fee.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const roomNo = fee.room_number || 'N/A';
    const hostelName = user?.hostel_name || 'Hostel Management';
    const wardenName = user?.name || 'The Warden';

    const confirmSend = window.confirm(`Are you sure you want to send a formal fee reminder to ${studentName} via WhatsApp?`);
    if (!confirmSend) return;

    // Validate Phone
    let phone = fee.phone || '';
    if (!phone) {
      alert('Student phone number is missing. Cannot send WhatsApp reminder.');
      return;
    }

    // Clean phone number and ensure country code (defaulting to 91 for India as per requirements)
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    // Generate Formal Message (Polite but Firm)
    const message = `*FORMAL NOTICE - HOSTEL FEE REMINDER*

Dear ${studentName},

This is to inform you that your hostel fee payment of *₹${amount}* is pending since *${dueDate}*.

As of now, the payment is categorized under *pending dues* for Room ${roomNo}. We request you to kindly clear the outstanding amount at the earliest.

If the payment has already been made, please ignore this message or update us accordingly.

For any issues or assistance, feel free to contact the hostel office.

Regards,
*${wardenName}*
Warden, ${hostelName}`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    setNoticeLoading(fee.fee_id);
    try {
      // Mark as sent in backend
      await api.post(`/finance/fee/${fee.fee_id}/notice-sent`);
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      // Refresh data to show badge
      if (hostelId) fetchFees(hostelId);
    } catch (err) {
      console.error('Error tracking legal notice:', err);
      alert('Failed to update notice status, but redirecting to WhatsApp...');
      window.open(whatsappUrl, '_blank');
    } finally {
      setNoticeLoading(null);
    }
  };

  // Status Logic Engine with Priority
  const getFeeStatus = (fee: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(fee.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const amount = parseFloat(fee.amount || 0);
    const paid = parseFloat(fee.paid_amount || 0);
    const isFullyPaid = paid >= amount;
    const isPartial = paid > 0 && paid < amount;
    
    // Priority: Overdue > Due Today > Upcoming > Paid > Partial > Pending
    if (!isFullyPaid && dueDate < today) return 'overdue';
    if (!isFullyPaid && dueDate.getTime() === today.getTime()) return 'due_today';
    if (!isFullyPaid && dueDate > today) return 'upcoming';
    if (isFullyPaid) return 'paid';
    if (isPartial) return 'partial';
    return 'pending';
  };

  // Real-time Analytics
  const stats = useMemo(() => {
    // We need to apply the deduplication logic to the counts as well to match the UI
    const overdueMap = new Map();
    const upcomingMap = new Map();
    const paidCount = new Set();
    const pendingCount = new Set();

    fees.forEach(fee => {
      const status = getFeeStatus(fee);
      const studentId = fee.student_id;
      const feeDate = new Date(fee.due_date).getTime();

      if (status === 'overdue') {
        const current = overdueMap.get(studentId);
        if (!current || feeDate > new Date(current.due_date).getTime()) {
          overdueMap.set(studentId, fee);
        }
      } else if (status === 'upcoming') {
        const current = upcomingMap.get(studentId);
        if (!current || feeDate < new Date(current.due_date).getTime()) {
          upcomingMap.set(studentId, fee);
        }
      } else if (status === 'paid') {
        paidCount.add(fee.fee_id);
      } else if (status === 'pending' || status === 'partial' || status === 'due_today') {
        pendingCount.add(fee.fee_id);
      }
    });

    // Critical Overdue logic
    let criticalOverdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    overdueMap.forEach(fee => {
      const dueDate = new Date(fee.due_date);
      const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 5) criticalOverdue++;
    });

    return {
      overdue: overdueMap.size,
      upcoming: upcomingMap.size,
      paid: paidCount.size,
      pending: pendingCount.size,
      criticalOverdue: criticalOverdue
    };
  }, [fees]);

  // Combined Instant Filtering Flow
  const filteredFees = useMemo(() => {
    let result = fees.filter(fee => {
      const status = getFeeStatus(fee);

      const seat = fee.student_details?.assigned_slot || fee.details?.assigned_slot || '';
      const fullRoom = seat || fee.room_number || '';
      
      // 1. Search Filter (Name, Room)
      const matchesSearch = 
        (fee.student_name || fee.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        fullRoom.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Card Category Filter
      let matchesCategory = true;
      if (categoryFilter === 'overdue') matchesCategory = status === 'overdue';
      else if (categoryFilter === 'upcoming') matchesCategory = status === 'upcoming';
      else if (categoryFilter === 'paid') matchesCategory = status === 'paid';
      else if (categoryFilter === 'pending') matchesCategory = status === 'pending' || status === 'partial' || status === 'overdue' || status === 'due_today' || status === 'upcoming';

      return matchesSearch && matchesCategory;
    });

    // 5. Deduplication & Nearest Entry Logic
    // For Upcoming: Only show the nearest future installment per student
    // For Overdue: Only show the most recent overdue installment per student
    if (categoryFilter === 'upcoming' || categoryFilter === 'overdue') {
      const studentMap = new Map();
      result.forEach(fee => {
        const studentId = fee.student_id;
        const currentEntry = studentMap.get(studentId);
        const feeDate = new Date(fee.due_date).getTime();

        if (!currentEntry) {
          studentMap.set(studentId, fee);
        } else {
          const currentEntryDate = new Date(currentEntry.due_date).getTime();
          if (categoryFilter === 'upcoming') {
            // For upcoming, we want the EARLIEST future date (nearest)
            if (feeDate < currentEntryDate) {
              studentMap.set(studentId, fee);
            }
          } else if (categoryFilter === 'overdue') {
            // For overdue, we want the LATEST past date (most recent overdue)
            if (feeDate > currentEntryDate) {
              studentMap.set(studentId, fee);
            }
          }
        }
      });
      result = Array.from(studentMap.values());
    }

    // 6. Global Sorting: Ascending Alphabetical Order (A-Z) by Student Name
    return result.sort((a, b) => {
      const nameA = (a.student_name || a.name || '').toLowerCase();
      const nameB = (b.student_name || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [fees, searchTerm, statusFilter, categoryFilter, dateRange]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="warden" />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 mb-6 md:mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-indigo-600 rounded-full" />
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Financial Dashboard</h1>
              </div>
              <p className="text-slate-500 text-xs md:text-sm font-medium ml-4">Advanced monitoring and collection management for residents.</p>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
              <div className="flex flex-col items-start md:items-end mr-0 md:mr-4">
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs md:text-sm font-bold text-slate-700">Live Sync Active</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(true);
                  fetchRooms();
                }}
                className="group relative flex items-center gap-2 md:gap-3 bg-slate-900 text-white px-5 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl hover:bg-slate-800 transition-all duration-300 active:scale-[0.98] shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] overflow-hidden shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CreditCard size={20} className="relative" />
                <span className="relative font-black text-[10px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em]">Make Payment</span>
              </button>
            </div>
          </div>

          {/* 1. ELITE MODERN SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { id: 'overdue', label: 'Overdue', value: stats.overdue, color: 'text-rose-500/80', icon: AlertCircle, bg: 'bg-rose-50/70', border: 'border-rose-100/60', accent: 'bg-rose-400/80', shadow: 'shadow-rose-200/30', glow: 'group-hover:shadow-rose-500/10' },
              { id: 'upcoming', label: 'Upcoming', value: stats.upcoming, color: 'text-blue-600', icon: Calendar, bg: 'bg-blue-50', border: 'border-blue-100', accent: 'bg-blue-500', shadow: 'shadow-blue-200/40', glow: 'group-hover:shadow-blue-500/20' },
              { id: 'paid', label: 'Paid', value: stats.paid, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-500', shadow: 'shadow-emerald-200/40', glow: 'group-hover:shadow-emerald-500/20' },
              { id: 'pending', label: 'Pending', value: stats.pending, color: 'text-indigo-600', icon: CreditCard, bg: 'bg-indigo-50', border: 'border-indigo-100', accent: 'bg-indigo-500', shadow: 'shadow-indigo-200/40', glow: 'group-hover:shadow-indigo-500/20' },
            ].map((card) => (
              <button
                key={card.id}
                onClick={() => setCategoryFilter(categoryFilter === card.id ? 'all' : card.id)}
                className={cn(
                  "relative p-7 rounded-[32px] border transition-all duration-500 group overflow-hidden text-left",
                  categoryFilter === card.id 
                    ? cn("bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12)] scale-[1.04] z-10 border-white ring-2 ring-slate-100/50", card.shadow) 
                    : "bg-white/90 backdrop-blur-2xl border-white/80 hover:border-white hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] active:scale-[0.98]"
                )}
              >
                {/* Glossy Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                {/* Top Lighting Edge */}
                <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />

                <div className="relative flex flex-col h-full space-y-7">
                  {/* Floating Glass Icon Container - SHIFTED DOWN */}
                  <div className="flex items-center justify-between pt-3">
                    <div className={cn(
                      "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all duration-700 relative",
                      categoryFilter === card.id 
                        ? cn(card.bg, "shadow-[inset_0_2px_10px_rgba(255,255,255,0.8),0_15px_30px_-5px_rgba(0,0,0,0.05)] scale-110", card.border) 
                        : "bg-slate-50/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.5)] group-hover:bg-white group-hover:scale-105"
                    )}>
                      {/* Outer Glow on Hover */}
                      <div className={cn(
                        "absolute inset-0 rounded-[22px] opacity-0 group-hover:opacity-40 blur-xl transition-all duration-700",
                        card.glow
                      )} />
                      
                      <card.icon 
                        size={28} 
                        strokeWidth={2.5}
                        className={cn(
                          "relative transition-all duration-700",
                          categoryFilter === card.id ? card.color : "text-slate-400 group-hover:" + card.color
                        )} 
                      />
                    </div>
                    
                    {categoryFilter === card.id && (
                      <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-900 rounded-full shadow-2xl scale-90 origin-right ring-4 ring-white">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", card.accent)} />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Active</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 pt-1">
                    <div>
                      <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-3">
                        {card.label}
                      </p>
                      <h3 className={cn(
                        "text-[2.4rem] font-black tracking-tighter transition-all duration-500 leading-none",
                        categoryFilter === card.id ? card.color : "text-slate-900 group-hover:" + card.color
                      )}>
                        {card.value}
                      </h3>
                    </div>
                    
                    {/* PREMIUM PROGRESS TRACK */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                          categoryFilter === card.id ? "text-slate-500" : "text-slate-300 group-hover:text-slate-400"
                        )}>
                          Analytics
                        </span>
                        <ArrowUpRight size={14} className={cn("transition-all duration-500", categoryFilter === card.id ? card.color : "text-slate-200 group-hover:text-slate-400")} />
                      </div>
                      <div className="h-[5px] w-full bg-slate-100/50 rounded-full overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] border border-white/50">
                        <div className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]",
                          categoryFilter === card.id ? card.accent + " w-full shadow-[0_0_15px_rgba(0,0,0,0.1)]" : "bg-slate-200/80 w-0 group-hover:w-1/2"
                        )} />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 7. MODERN ALERT SECTION */}
          {(stats.criticalOverdue > 0) && (
            <div className="relative overflow-hidden bg-white/40 backdrop-blur-3xl rounded-[32px] p-1.5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-white/80 group">
              <div className="bg-slate-900 rounded-[28px] p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
                {/* Background Design Element */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-[100px] -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <div className="relative flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]">
                    <div className="relative">
                      <div className="absolute inset-0 bg-rose-500 blur-lg opacity-40 animate-pulse" />
                      <BadgeAlert className="text-rose-400 relative" size={32} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-white tracking-tight uppercase tracking-[0.05em]">Priority Financial Alerts</h4>
                    <p className="text-sm text-slate-400 font-medium">Immediate collection actions required for specific residents</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 relative">
                  {stats.criticalOverdue > 0 && (
                    <div className="px-6 py-4 bg-rose-500/5 border border-rose-500/10 rounded-[20px] text-rose-400/80 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-rose-500/10 transition-all cursor-default shadow-lg shadow-rose-900/5">
                      <div className="w-2 h-2 rounded-full bg-rose-400/60 animate-pulse" />
                      {stats.criticalOverdue} CRITICAL OVERDUE
                    </div>
                  )}
                  <button className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-[20px] transition-all border border-white/10">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. ADVANCED FILTER SYSTEM */}
          <div className="bg-white/60 backdrop-blur-2xl p-2.5 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-white flex flex-col lg:flex-row gap-3 items-center">
            <div className="flex-1 w-full relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-all duration-300" size={20} />
              <input
                type="text"
                placeholder="Search by Resident Name or Room..."
                className="w-full pl-16 pr-6 py-5 bg-white/50 border border-slate-100 rounded-[24px] font-bold text-sm focus:outline-none focus:ring-[12px] focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all placeholder:text-slate-400 placeholder:font-medium shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* 3. ADVANCED DATA TABLE */}
          <div className="bg-white/40 backdrop-blur-3xl rounded-[32px] md:rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] border border-white overflow-hidden p-1 md:p-2">
            <div className="bg-white rounded-[24px] md:rounded-[32px] overflow-hidden border border-slate-100 shadow-sm">
              <div className="overflow-hidden">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-4 md:px-6 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.25em] border-b border-slate-100">Student Name</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.25em] border-b border-slate-100">Billing Period</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.25em] border-b border-slate-100">Progress</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.25em] border-b border-slate-100">Deadline</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.25em] border-b border-slate-100 text-center">Status</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.25em] border-b border-slate-100 text-right">Remainder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredFees.map((fee) => {
                      const status = getFeeStatus(fee);
                      const amount = parseFloat(fee.amount || 0);
                      const paid = parseFloat(fee.paid_amount || 0);
                      const remaining = Math.max(0, amount - paid);
                      const progress = amount > 0 ? (paid / amount) * 100 : 0;
                      
                      const dueDate = new Date(fee.due_date);
                      const formattedDate = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                      const studentName = fee.student_name || fee.name || fee.studentName || 'Unknown Student';
                      const seat = fee.student_details?.assigned_slot || fee.details?.assigned_slot || '';
                      const roomNo = fee.room_number || fee.room_no || fee.roomNumber || 'N/A';
                      const roomDisplay = seat || roomNo;

                      return (
                        <tr 
                          key={fee.fee_id} 
                          className="hover:bg-slate-50/80 transition-all duration-300 group/row"
                        >
                          <td className="px-4 md:px-6 py-6 md:py-8">
                            <div className="flex items-center gap-4 md:gap-5">
                              <div className={cn(
                                "w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-xl transition-all duration-500 group-hover/row:scale-110 shadow-[inset_0_2px_8px_rgba(255,255,255,0.5)] border relative shrink-0",
                                status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50" :
                                status === 'overdue' ? "bg-rose-50/70 text-rose-500/80 border-rose-100/60 shadow-rose-100/30" :
                                "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50"
                              )}>
                                {studentName.charAt(0)}
                                {status === 'paid' && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                    <CheckCircle2 size={10} className="text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <Link
                                  href={`/warden/students/${fee.student_id}`}
                                  className="font-black text-slate-900 text-sm md:text-lg tracking-tight truncate hover:text-indigo-600 transition-colors duration-300 leading-tight"
                                >
                                  {studentName}
                                </Link>
                                <div className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] md:tracking-[0.2em] mt-1.5 md:mt-2 flex items-center gap-2">
                                  <Home size={12} className="text-slate-300" />
                                  {roomDisplay}
                                </div>
                                {fee.notice_sent && (
                                  <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-rose-50/70 text-rose-500/80 rounded-lg w-fit border border-rose-100/60">
                                    <svg 
                                      viewBox="0 0 24 24" 
                                      className="w-2.5 h-2.5 fill-current"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 0 5.414 0 12.05c0 2.123.553 4.197 1.604 6.02L0 24l6.132-1.608a11.845 11.845 0 005.915 1.572c6.635 0 12.049-5.414 12.049-12.05a11.82 11.82 0 00-3.48-8.52z"/>
                                    </svg>
                                    <span className="text-[8px] font-black uppercase tracking-widest">Notice Sent</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-6 md:py-8">
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-sm md:text-base font-black text-slate-800 tracking-tight">{fee.month}</div>
                              <div className="inline-flex px-1.5 md:px-2 py-0.5 bg-slate-100 rounded text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                {new Date(fee.period_start || fee.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(fee.period_end || fee.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 md:px-8 py-6 md:py-8">
                            <div className="w-32 md:w-48 space-y-2 md:space-y-3">
                              <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                  <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Paid</span>
                                  <span className="text-xs md:text-sm font-black text-slate-900">₹{paid.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Balance</span>
                                  <span className={cn("text-xs md:text-sm font-black", remaining > 0 ? "text-rose-500/80" : "text-emerald-600")}>₹{remaining.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="h-2 md:h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-white p-[1px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]">
                                <div 
                                  style={{ width: `${Math.min(100, progress)}%` }}
                                  className={cn(
                                    "h-full rounded-full transition-all duration-1000 ease-out shadow-sm relative overflow-hidden",
                                    status === 'paid' ? "bg-emerald-500" : 
                                    status === 'overdue' ? "bg-rose-400/80" :
                                    "bg-indigo-600"
                                  )}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-6 md:py-8">
                            <div className="space-y-1 md:space-y-2">
                               <div className="text-sm md:text-base font-black text-slate-900 tracking-tight">{formattedDate}</div>
                              <div className={cn(
                                "text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 md:gap-2",
                                status === 'overdue' ? "text-rose-500/80" : status === 'due_today' ? "text-amber-600" : "text-slate-400"
                              )}>
                                <Calendar size={12} />
                                {status === 'overdue' ? 'Critical Action' : status === 'due_today' ? 'Due Today' : 'Schedule'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-6 md:py-8 text-center">
                            <div className="flex justify-center">
                              <div className={cn(
                                "inline-flex items-center gap-2 md:gap-3 px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] border shadow-sm transition-all duration-500 group-hover/row:shadow-md group-hover/row:-translate-y-0.5",
                                status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                status === 'overdue' ? "bg-rose-50/70 text-rose-600/90 border-rose-100/60" :
                                status === 'due_today' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                status === 'upcoming' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                status === 'partial' ? "bg-amber-50/50 text-amber-600 border-amber-100/50" :
                                "bg-slate-50 text-slate-500 border-slate-100"
                              )}>
                                <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full relative", 
                                  status === 'paid' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                  status === 'overdue' ? "bg-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse" :
                                  status === 'due_today' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                                  "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.5)]"
                                )} />
                                {status === 'partial' ? 'Partial' : status.replace('_', ' ')}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-6 md:py-8 text-right">
                            <div className="flex items-center justify-end gap-2 md:gap-3 transition-all duration-300">
                              <button 
                                onClick={() => handleSendLegalNotice(fee)}
                                className={cn(
                                  "w-9 h-9 md:w-11 md:h-11 flex items-center justify-center transition-all border rounded-xl md:rounded-2xl shadow-sm",
                                  "bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-xl hover:shadow-emerald-500/10 border-slate-100"
                                )}
                                title="Send WhatsApp Reminder"
                              >
                                {noticeLoading === fee.fee_id ? (
                                  <Loader2 className="animate-spin" size={18} />
                                ) : (
                                  <svg 
                                    viewBox="0 0 24 24" 
                                    className="w-5 h-5 fill-current"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 0 5.414 0 12.05c0 2.123.553 4.197 1.604 6.02L0 24l6.132-1.608a11.845 11.845 0 005.915 1.572c6.635 0 12.049-5.414 12.049-12.05a11.82 11.82 0 00-3.48-8.52z"/>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {filteredFees.length === 0 && (
              <div className="p-24 text-center space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto shadow-inner relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full" />
                  <Search className="text-slate-300 relative group-hover:text-indigo-400 transition-colors" size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">No matching records found</h3>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto">We couldn't find any financial records matching your current filters.</p>
                </div>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                    setDateRange({ from: '', to: '' });
                  }}
                  className="bg-indigo-50 text-indigo-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-100 transition-all active:scale-[0.98]"
                >
                  Reset All Advanced Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Make Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] w-full max-w-2xl overflow-hidden border border-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="p-8 border-b border-slate-100 flex justify-between items-center relative bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <CreditCard size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {paymentStep === 1 ? 'Select Room' : paymentStep === 2 ? 'Select Student' : 'Record Payment'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {paymentStep === 1 ? 'Step 1 of 3' : paymentStep === 2 ? `Step 2 of 3 • Room ${selectedRoom?.room_number}` : `Step 3 of 3 • ${selectedStudent?.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {paymentStep > 1 && (
                  <button 
                    onClick={() => setPaymentStep(paymentStep - 1)}
                    className="px-4 py-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 rounded-xl transition-all"
                  >
                    Back
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentFlow();
                  }} 
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {paymentStep === 1 && (
                <div className="space-y-6">
                  {roomLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-indigo-600" size={40} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Rooms...</p>
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <Home className="mx-auto text-slate-200" size={64} />
                      <p className="text-slate-500 font-bold">No rooms found in this hostel.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {rooms.map((room) => (
                        <button
                          key={room.room_id}
                          onClick={() => fetchRoomStudents(room.room_id)}
                          className="group p-5 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-center relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={14} className="text-indigo-500" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Room</p>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">{room.room_number}</h4>
                          <div className="mt-3 flex items-center justify-center gap-1.5">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              room.student_count >= room.capacity ? "bg-rose-500" : "bg-emerald-500"
                            )} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                              {room.student_count}/{room.capacity} Seats
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paymentStep === 2 && (
                <div className="space-y-4">
                  {studentLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-indigo-600" size={40} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Students...</p>
                    </div>
                  ) : !selectedRoom?.students || selectedRoom.students.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <Users className="mx-auto text-slate-200" size={64} />
                      <p className="text-slate-500 font-bold">No active students in Room {selectedRoom?.room_number}.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedRoom.students.map((student: any) => (
                        <button
                          key={student.student_id}
                          onClick={() => {
                            setSelectedStudent(student);
                            setPaymentStep(3);
                          }}
                          className="group p-5 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 font-black text-indigo-600">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{student.name}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                {student.phone} • Seat {student.details?.seat_number || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paymentStep === 3 && (
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100/50 flex items-center gap-5">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100 font-black text-xl text-indigo-600">
                      {selectedStudent?.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">{selectedStudent?.name}</h4>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                        Room {selectedRoom?.room_number} • {selectedStudent?.payment_model}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Payment Amount (₹)</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          placeholder="0.00"
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        />
                        <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Channel</label>
                      <select
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Value Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                          value={paymentForm.date}
                          onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                        />
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Audit Remarks</label>
                      <input
                        type="text"
                        placeholder="Enter internal accounting notes..."
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                        value={paymentForm.remarks}
                        onChange={(e) => setPaymentForm({...paymentForm, remarks: e.target.value})}
                      />
                    </div>

                    {paymentForm.method !== 'Cash' && (
                      <>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Transaction Ref</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter ID"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                            value={paymentForm.transaction_id}
                            onChange={(e) => setPaymentForm({...paymentForm, transaction_id: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Ref</label>
                          <input
                            type="text"
                            required
                            placeholder="Re-enter ID"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                            value={paymentForm.confirm_transaction_id}
                            onChange={(e) => setPaymentForm({...paymentForm, confirm_transaction_id: e.target.value})}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Confirm & Record Payment
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Fees Modal (REMOVED FROM UI BUT KEPT IN CODE FOR REFERENCE IF NEEDED) */}
      {false && showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] w-full max-w-xl overflow-hidden p-10 border border-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex justify-between items-center mb-10 relative">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-500/20">
                  <Calendar size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Financial Cycle Initiation</h3>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Generate Monthly Resident Fees</p>
                </div>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleGenerateFees} className="space-y-8 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Billing Cycle</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-black text-sm text-slate-900 outline-none focus:ring-[10px] focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                    value={generateData.month}
                    onChange={(e) => setGenerateData({...generateData, month: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Standard Amount (₹)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-black text-sm text-slate-900 outline-none focus:ring-[10px] focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all pr-12"
                      value={generateData.amount}
                      onChange={(e) => setGenerateData({...generateData, amount: e.target.value})}
                    />
                    <IndianRupee className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>
              </div>
              
              <div className="bg-indigo-50/50 p-6 rounded-[24px] border border-indigo-100/50 flex gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
                  <Info size={20} strokeWidth={2.5} />
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed font-bold">
                  This action will batch-generate financial records for all active residents assigned to the current hostel for the period of <span className="text-indigo-600 font-black">{generateData.month}</span>. This process is immutable once initiated.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-[0.25em] rounded-[20px] hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  Discard Request
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-[20px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
                >
                  Confirm & Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
