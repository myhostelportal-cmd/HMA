"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import api from "@/lib/api";
import Sidebar from '@/components/layout/Sidebar';
import { 
  ArrowLeft, 
  User, 
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  MapPin,
  Home,
  CreditCard, 
  History, 
  X, 
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  Info,
  Download,
  FileText,
  BadgeAlert,
  ChevronRight,
  TrendingUp,
  Activity,
  UserCheck,
  Smartphone,
  BookOpen,
  Map,
  School,
  Briefcase,
  Fingerprint,
  Heart,
  LogOut,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadReceipt as generateReceipt } from "@/utils/receiptGenerator";

interface StudentProfile {
  student_id: number;
  name: string;
  phone: string;
  whatsapp_number?: string;
  aadhaar_number?: string;
  assigned_slot?: string;
  student_photo?: string;
  email?: string;
  dob?: string;
  gender?: string;
  room_number?: string;
  room_type?: string;
  room_capacity?: number;
  floor?: string;
  hostel_name?: string;
  hostel_address?: string;
  hostel_contact?: string;
  status: string;
  hostel_id: number;
  payment_model: string;
  monthly_fee: number;
  total_session_fees: number;
  security_deposit: number;
  security_balance: number;
  joining_date: string;
  fee_status?: string;
  details?: {
    college_name?: string;
    course_name?: string;
    address?: string;
    city?: string;
    state?: string;
    parent_name?: string;
    parent_phone?: string;
    parent_relation?: string;
    parent_address?: string;
    year?: string;
    emergency_contact?: string;
    floor?: string;
    room_category?: string;
    parent_secondary_phone?: string;
    parent_occupation?: string;
    parent_aadhaar?: string;
    assigned_slot?: string;
    student_photo?: string;
  };
}

interface FeeRecord {
  fee_id: number;
  student_id: number;
  hostel_id: number;
  amount: string;
  paid_amount: string;
  adjustment_amount: string;
  due_date: string;
  status: 'paid' | 'unpaid' | 'pending' | 'partial';
  fee_type: 'monthly' | 'installment' | 'one-time' | 'remaining' | 'advance_payment';
  advance_status?: 'unadjusted' | 'adjusted';
  advance_balance?: string;
  payment_source?: 'DIRECT' | 'ADVANCE_ADJUSTED';
  adjusted_from_advance?: boolean;
  installment_name?: string;
  month?: string;
  period_start: string;
  period_end?: string;
  receipt_id?: string;
  transaction_id?: string;
  payment_date?: string;
  payment_method?: string;
  remarks?: string;
  month_type?: 'Running' | 'Advance' | 'Past';
  associated_payments?: Array<{
    payment_id: number;
    amount: string;
    payment_method: string;
    transaction_id: string;
    receipt_id: string;
    actual_payment_date: string;
    remarks: string;
    status: string;
  }>;
}

export default function StudentProfilePage() {
  const { studentId: id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [existingFees, setExistingFees] = useState<FeeRecord[]>([]);
  const [feeStats, setFeeStats] = useState({
    totalPaid: 0,
    totalDue: 0,
    overcreditedAmount: 0,
    progress: 0
  });

  const getAvailableSecurity = () => {
    return parseFloat(student?.security_balance?.toString() || "0");
  };

  const fetchStudentData = useCallback(async () => {
    try {
      const profileRes = await api.get(`/hostels/students/${id}/profile`);
      const studentData = {
        ...profileRes.data,
        email: profileRes.data.email || profileRes.data.details?.email || 'N/A',
        dob: profileRes.data.dob || profileRes.data.details?.dob || 'N/A',
        gender: profileRes.data.gender || profileRes.data.details?.gender || 'N/A',
        whatsapp_number: profileRes.data.details?.whatsapp_number || 'N/A',
        aadhaar_number: profileRes.data.details?.aadhaar_number || 'N/A',
        assigned_slot: profileRes.data.details?.assigned_slot || '',
        student_photo: profileRes.data.details?.student_photo || '',
        payment_model: profileRes.data.payment_model || '2 + 1 System',
        monthly_fee: profileRes.data.monthly_fee || 0,
        total_session_fees: profileRes.data.total_session_fees || 0,
        security_deposit: profileRes.data.security_deposit || 0,
        security_balance: profileRes.data.security_balance || 0,
        floor: profileRes.data.floor || profileRes.data.details?.floor || 'Ground Floor',
        hostel_name: profileRes.data.hostel_name || 'N/A',
        hostel_address: profileRes.data.hostel_address || 'Professional Hostel Finance Solutions',
        hostel_contact: profileRes.data.hostel_contact || 'N/A',
        joining_date: profileRes.data.joining_date || new Date().toISOString()
      };
      setStudent(studentData);
   
      const feesRes = await api.get(`/finance/student/${id}/periods`);
      const fees: FeeRecord[] = feesRes.data.existing_fees || [];
      setExistingFees(fees);

      if (feesRes.data.student) {
        setStudent((prev: any) => ({
          ...prev,
          ...feesRes.data.student,
          monthly_fee: Number(feesRes.data.student.monthly_fee || 0),
          security_deposit: Number(feesRes.data.student.security_deposit || 0),
          security_balance: Number(feesRes.data.student.security_balance || 0),
          total_session_fees: Number(feesRes.data.student.total_session_fees || 0)
        }));
      }

      const totalPaid = fees.reduce((sum, f) => {
        const rowPayments = f.associated_payments || [];
        const paymentSum = rowPayments.reduce((pSum, p) => pSum + parseFloat(p.amount || "0"), 0);
        if (f.installment_name === 'Overpayment Credit' && rowPayments.length === 0) {
          return sum + parseFloat(f.paid_amount || "0");
        }
        return sum + paymentSum;
      }, 0);

      const overcreditedAmount = fees.reduce((sum, f) => {
        if (f.installment_name === 'Overpayment Credit') {
          return sum + parseFloat(f.paid_amount || "0");
        }
        return sum;
      }, 0);
      
      const totalSession = parseFloat(studentData.total_session_fees || "0");
      
      setFeeStats({
        totalPaid,
        totalDue: totalSession - (totalPaid - overcreditedAmount),
        overcreditedAmount,
        progress: totalSession > 0 ? Math.round(((totalPaid + overcreditedAmount) / totalSession) * 100) : 0
      });
    } catch (err: any) {
      console.error("Critical: Student profile failed to load", err);
      const msg = err.response?.data?.details || err.response?.data?.error || "Failed to load student data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchStudentData();
  }, [id, fetchStudentData]);

  const downloadReceipt = (fee: FeeRecord) => {
    if (!student) return;
    generateReceipt(student, fee, feeStats, 'warden');
  };

  const shareOnWhatsApp = (fee: FeeRecord) => {
    if (!student) return;
    
    const hostelName = student.hostel_name || "Hostel";
    const amount = parseFloat(fee.paid_amount || "0").toLocaleString('en-IN');
    const installment = fee.installment_name || fee.month || "Fee";
    const receiptId = fee.receipt_id || "N/A";
    const transactionRef = fee.transaction_id || "N/A";
    
    // Generate the secure public link
    const publicToken = (fee as any).public_token;
    const publicLink = publicToken 
      ? `\n\n*Download Official PDF Receipt:*\n${window.location.origin}/public/receipt/${publicToken}`
      : "";
    
    const message = `*FEE PAYMENT RECEIPT - ${hostelName}*\n\n` +
      `Hello *${student.name}*,\n\n` +
      `Your payment has been successfully recorded.\n\n` +
      `*Details:*\n` +
      `• *Installment:* ${installment}\n` +
      `• *Amount:* ₹${amount}\n` +
      `• *Receipt ID:* ${receiptId}\n` +
      `• *Transaction Ref:* ${transactionRef}${publicLink}\n\n` +
      `_Thank you for your payment!_`;

    const encodedMsg = encodeURIComponent(message);
    const phoneNumber = student.whatsapp_number || student.phone || "";
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-100">
          <User size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{error || "Student not found"}</h2>
        <button onClick={() => router.back()} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-white font-bold hover:bg-slate-800 transition-all">
          <ArrowLeft size={20} /> Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20 flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-w-0">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
          <div className="w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all group">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors"><ArrowLeft size={16} /></div>
              <span className="hidden sm:inline">Back to Directory</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-blue-50 rounded-full border border-blue-100">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-blue-600 font-black text-[9px] md:text-[10px] uppercase tracking-widest">Admin View (Read-Only)</span>
              </div>
            </div>
          </div>
        </motion.div>

        <main className="w-full px-4 md:px-6 mt-6 md:mt-8 space-y-6 md:space-y-8 max-w-7xl mx-auto pb-12 relative">
          {(student.status === 'inactive' || student.status === 'Exited') && (
            <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-[90px] md:text-[125px] font-black text-rose-500/50 uppercase tracking-[0.2em] -rotate-[35deg] whitespace-nowrap select-none blur-[1px] drop-shadow-[0_20px_50px_rgba(244,63,94,0.3)]">EXITED</motion.div>
            </div>
          )}

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[28px] md:rounded-[32px] p-6 md:p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/30 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row gap-8 md:gap-10 items-center lg:items-start">
              <div className="relative group shrink-0 self-center lg:self-start">
                {student.student_photo ? (
                  <motion.div whileHover={{ scale: 1.05 }} className="w-32 h-32 md:w-40 md:h-40 rounded-[28px] md:rounded-[32px] overflow-hidden shadow-2xl border-4 border-white relative z-10">
                    <img src={student.student_photo} alt={student.name} className="w-full h-full object-cover" />
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[28px] md:rounded-[32px] flex items-center justify-center text-5xl md:text-6xl font-black shadow-2xl border-4 border-white relative z-10">
                    {student.name?.charAt(0)}
                  </motion.div>
                )}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 md:w-12 md:h-12 bg-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white z-20"><UserCheck size={20} /></div>
              </div>
              <div className="flex-1 space-y-6 w-full text-center lg:text-left">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-2 pt-2">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight capitalize">{student.name}</h1>
                      <div className="flex gap-2 justify-center lg:justify-start">
                        <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">{student.gender || 'N/A'}</span>
                        <span className={cn("px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border shadow-sm", student.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100")}>{student.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-slate-500 font-bold">
                      <div className="flex items-center gap-2"><Fingerprint size={16} className="text-indigo-400" /><span className="text-xs md:text-sm">Student ID: <span className="text-slate-900 font-black">#{student.student_id}</span></span></div>
                      <div className="w-1 h-1 rounded-full bg-slate-300 hidden md:block" />
                      <div className="flex items-center gap-2"><span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">RESIDENT PROFILE OVERVIEW</span></div>
                    </div>
                  </div>
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-indigo-50/50 rounded-[24px] md:rounded-[28px] p-5 md:p-6 border border-indigo-100 shadow-xl shadow-indigo-200/20 w-full lg:min-w-[280px] lg:max-w-[320px] hover:shadow-2xl hover:shadow-indigo-300/30 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-5 md:mb-6 justify-center lg:justify-start">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30"><Home size={24} /></div>
                      <div className="text-left"><p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">ROOM ASSIGNED</p><p className="text-xl md:text-2xl font-black text-slate-900">{student.room_number || 'N/A'}{student.assigned_slot?.slice(-1)}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-3 md:gap-y-4 text-left">
                      <div>
  <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
    ROOM SEATER
  </p>
  <p className="text-[11px] md:text-xs font-black text-slate-700">
    {student.room_capacity ? `${student.room_capacity} Seater` : 'N/A'}
  </p>
</div>
                      <div><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CATEGORY</p><p className="text-[11px] md:text-xs font-black text-slate-700 truncate">{student.room_type || (student.details?.room_category || 'N/A')}</p></div>
                      <div><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">FLOOR</p><p className="text-[11px] md:text-xs font-black text-emerald-600">{student.floor || 'Ground Floor'}</p></div>
                      <div><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">JOINING DATE</p><p className="text-[11px] md:text-xs font-black text-slate-700">{new Date(student.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p></div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/30 border border-slate-100 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-[10px] font-black text-indigo-600 mb-8 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-1.5 h-6 bg-indigo-600 rounded-full" />IDENTIFICATION</h3>
              <div className="space-y-6">
                <div className="group"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">CONTACT NUMBER</p><p className="text-base font-black text-slate-900 flex items-center gap-2"><Phone size={14} className="text-indigo-400" />{student.phone}</p></div>
                <div className="group"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">WHATSAPP NUMBER</p><p className="text-base font-black text-emerald-600 flex items-center gap-2"><Smartphone size={14} className="text-emerald-400" />{student.whatsapp_number}</p></div>
                <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">STUDENT AADHAAR</p><p className="text-xl font-black text-slate-900 tracking-[0.2em]">{student.aadhaar_number || 'N/A'}</p></div>
              </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/30 border border-slate-100 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-[10px] font-black text-emerald-600 mb-8 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-600 rounded-full" />ADDRESS & GUARDIAN</h3>
              <div className="space-y-6">
                <div className="group"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">EMAIL ADDRESS</p><p className="text-sm font-black text-slate-900 truncate flex items-center gap-2"><Mail size={14} className="text-indigo-400" />{student.email}</p></div>
                <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 group hover:bg-white hover:border-emerald-200 transition-all"><div className="flex justify-between items-center mb-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">GUARDIAN & RELATION</p><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">{student.details?.parent_relation || 'Parent'}</span></div><p className="text-lg font-black text-slate-900">{student.details?.parent_name || 'N/A'}</p><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">{student.details?.parent_occupation || 'Occupation Not Specified'}</p></div>
                <div className="group"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">GUARDIAN CONTACT(S)</p><p className="text-sm font-black text-slate-900 flex items-center gap-2"><Phone size={14} className="text-emerald-400" />{student.details?.parent_phone}{student.details?.parent_secondary_phone && <span className="text-slate-300 font-medium">/ {student.details.parent_secondary_phone}</span>}</p></div>
              </div>
            </motion.div>

            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/30 border border-slate-100 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-[10px] font-black text-amber-600 mb-8 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-1.5 h-6 bg-amber-600 rounded-full" />ACADEMIC INFO</h3>
              <div className="space-y-6">
                <div className="group"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">COLLEGE NAME</p><p className="text-base font-black text-slate-900 uppercase leading-tight">{student.details?.college_name || 'N/A'}</p></div>
                <div className="p-5 bg-amber-50/50 rounded-[24px] border border-amber-100 group hover:bg-white hover:border-amber-300 transition-all"><p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">COURSE & YEAR</p><div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm"><BookOpen size={20} /></div><div><p className="text-lg font-black text-slate-900 uppercase">{student.details?.course_name || 'N/A'}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.details?.year || '1st'} Year Student</p></div></div></div>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-[40px] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform duration-500"><CreditCard size={32} /></div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">Fee Management Portal</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors cursor-default">SYSTEM: {student.payment_model}</span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm hover:bg-emerald-100 transition-colors cursor-default"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />LIVE LEDGER</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setShowHistoryModal(true)} className="flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-[24px] font-black text-sm transition-all border border-slate-200 shadow-sm group/btn"><History size={20} className="group-hover/btn:rotate-12 transition-transform text-indigo-600" /><span>Ledger History</span></motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 flex flex-col hover:shadow-2xl transition-all duration-500">
                  <div className="flex items-center justify-between mb-8"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3"><TrendingUp size={18} className="text-indigo-600" />PAYMENT PLAN DETAILS</h4><span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-black uppercase border border-slate-100">{student.payment_model}</span></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {existingFees.slice(0, 4).map((fee, idx) => {
                      const isPaid = fee.status === 'paid';
                      const adjustment = parseFloat(fee.adjustment_amount || "0");
                      return (
                        <motion.div key={idx} whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }} className={cn("p-5 rounded-[28px] border transition-all duration-300", isPaid ? "bg-emerald-50/50 border-emerald-100/50" : "bg-slate-50/50 border-slate-100")}>
                          <div className="flex justify-between items-start">
                            <div className="space-y-1"><p className={cn("text-sm font-black", isPaid ? "text-emerald-700" : "text-slate-800")}>{fee.installment_name || fee.month}</p><div className="flex items-center gap-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due: {new Date(fee.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div></div>
                            <div className="text-right"><p className="text-lg font-black text-slate-900 tracking-tight">₹{(parseFloat(fee.amount) + adjustment).toLocaleString()}</p>{adjustment !== 0 && (<p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">₹{Math.abs(adjustment).toLocaleString()} Security Adjusted</p>)}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm shrink-0"><ShieldCheck size={28} /></div>
                      <div>
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SECURITY DEPOSIT</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">₹{parseFloat(student.security_deposit as any || "0").toLocaleString()}</p>
                      </div>
                    </div>
                    {student.payment_model === '2 + 1 System' && (
                      <div className="sm:ml-4 border-l-0 sm:border-l border-slate-100 pl-0 sm:pl-8 w-full sm:w-auto text-center sm:text-left">
                        <p className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">SECURITY DEPOSIT</p>
                        <p className="text-xl md:text-2xl font-black text-amber-600 tracking-tighter">₹{getAvailableSecurity().toLocaleString()}</p>
                      </div>
                    )}
                    <div className="flex-1 flex justify-center w-full sm:w-auto">
                      <div className="px-4 md:px-6 py-2 md:py-3 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 flex flex-col items-center w-full sm:w-auto">
                        {student.payment_model === '2 + 1 System' ? (
                          <><p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">MONTHLY INSTALLMENT</p><p className="text-base md:text-lg font-black text-indigo-600 tracking-tight">₹{parseFloat(student.monthly_fee as any || "0").toLocaleString()}</p></>
                        ) : (
                          <><p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">TOTAL SESSION VALUE</p><p className="text-base md:text-lg font-black text-indigo-600 tracking-tight">₹{parseFloat(student.total_session_fees as any || "0").toLocaleString()}</p></>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 shadow-sm whitespace-nowrap">HELD IN TRUST</div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-slate-50 rounded-[40px] p-8 border border-slate-100 shadow-inner flex flex-col justify-between group/card hover:bg-white hover:shadow-xl transition-all duration-500">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PAYMENT PROGRESS</p><div className="flex items-center gap-2"><span className="text-3xl font-black text-indigo-600">{feeStats.progress}%</span><div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /></div></div>
                    <div className="relative h-4 bg-white rounded-full overflow-hidden p-1 border border-slate-100"><motion.div initial={{ width: 0 }} animate={{ width: `${feeStats.progress}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full relative"><div className="absolute inset-0 bg-white/20 skew-x-12 animate-shimmer" /></motion.div></div>
                  </div>
                  <div className="mt-auto grid grid-cols-1 gap-3">
                    <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Paid</p><p className="text-base font-black text-slate-900">₹{feeStats.totalPaid.toLocaleString()}</p></div>
                    <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-[24px] shadow-lg shadow-indigo-100/50 hover:shadow-indigo-200/50 transition-all flex items-center justify-between group/outstanding"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest group-hover/outstanding:text-indigo-600 transition-colors">Outstanding</p><p className="text-base font-black text-indigo-700">₹{feeStats.totalDue.toLocaleString()}</p></div>
                    <div className="p-4 bg-slate-50 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Overcredited</p><p className="text-base font-black text-slate-900">₹{feeStats.overcreditedAmount.toLocaleString()}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12"><div className="space-y-2"><div className="flex items-center gap-4"><div className="w-2 h-10 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200" /><h3 className="text-3xl font-black text-slate-900 tracking-tight">Payment History</h3></div><p className="text-slate-500 font-bold text-sm ml-6 uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-emerald-500" />Real-time transaction payment log</p></div></div>
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar max-h-[500px] overflow-y-auto">
              <table className="w-full min-w-[1000px] text-left border-separate border-spacing-y-4">
                <thead><tr className="text-slate-400"><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] pl-6 w-[4%]">S.No</th><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 w-[16%]">Source / Entry</th><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[12%]">Plan Required</th><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[12%]">Paid Amount</th><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[10%]">Status</th><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[18%]">Transaction Ref</th><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-right w-[20%]">Receipt</th><th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] pr-6 text-center w-[8%]">Action</th></tr></thead>
                <tbody>
                  {(() => {
                    let globalSNo = 0;
                    const mainFees = existingFees.filter(f => f.fee_type !== 'advance_payment');
                    return mainFees.flatMap((fee) => {
                      const adjustment = parseFloat(fee.adjustment_amount || "0");
                      const payments = fee.associated_payments || [];
                      const planRows = [];
                      globalSNo++;
                      const isPaid = fee.status === 'paid';
                      const isPartial = fee.status === 'partial';
                      const isPending = fee.status === 'pending';
                      const hasSubTransactions = (payments.length > 1 || (payments.length === 1 && fee.status === 'partial'));
                      const isFullyAdjusted = fee.status === 'paid' && parseFloat(fee.paid_amount || "0") === 0;
                      const isUnpaid = fee.status === 'unpaid' || fee.status === 'pending';
                      const showPaymentInPlan = !hasSubTransactions && !isFullyAdjusted && !isUnpaid && fee.status === 'paid';
                      const singlePayment = showPaymentInPlan ? payments[0] : null;

                      planRows.push(
                        <motion.tr key={`plan-${fee.fee_id}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: globalSNo * 0.05 }} className={cn("group transition-all duration-300", isPaid ? "bg-white hover:bg-slate-50 shadow-sm" : "bg-slate-50/50 hover:bg-white border border-slate-100")}>
                          <td className="py-4 pl-6 rounded-l-[24px] border-y border-l border-slate-100/50"><div className={cn("w-10 h-10 flex items-center justify-center rounded-2xl font-black text-xs shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3", isPaid ? "bg-emerald-50 text-emerald-600 shadow-inner" : "bg-white text-slate-400 border border-slate-100 shadow-sm")}>{globalSNo.toString().padStart(2, '0')}</div></td>
                          <td className="py-4 px-2 border-y border-slate-100/50"><div className="flex flex-col"><div className="flex items-center flex-wrap gap-2 mb-1"><span className="text-sm font-black text-slate-900 tracking-tight leading-tight">{(fee.installment_name || fee.month || 'Ledger Entry').replace(/ \d{4}/, '')}</span>{student.payment_model === '2 + 1 System' && fee.month_type && (<span className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 rounded border tracking-[0.1em] shrink-0", fee.month_type === 'Running' ? "bg-green-100 text-green-800 border-green-200" : fee.month_type === 'Advance' ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200")}>{fee.month_type}</span>)}</div><div className="flex items-center gap-1.5 text-slate-400"><Calendar size={10} className="shrink-0" /><span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">Due: {new Date(fee.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div></div></td>
                          <td className="py-4 px-4 text-center border-y border-slate-100/50"><div className="flex flex-col items-center">{fee.installment_name === 'Overpayment Credit' ? (<><span className="text-base font-black text-blue-600 tracking-tight">₹{parseFloat(fee.paid_amount || "0").toLocaleString()}</span><span className="text-[9px] font-black uppercase text-blue-600/60 tracking-[0.2em] mt-2">EXTRA CREDITED</span></>) : (<><span className="text-base font-black text-slate-900 tracking-tight">₹{(parseFloat(fee.amount) + adjustment).toLocaleString()}</span>{adjustment !== 0 && (<div className="flex flex-col items-center gap-1 mt-2"><span className="text-[10px] font-bold text-slate-300 line-through">₹{parseFloat(fee.amount).toLocaleString()}</span><div className="flex flex-col gap-1">{(() => { const labels: React.ReactNode[] = []; if (fee.remarks) { fee.remarks.split('|').forEach((part, pIdx) => { const r = part.trim(); if (r.toLowerCase().includes('adjusted') && !r.toLowerCase().includes('future')) { labels.push(<span key={`adj-${pIdx}`} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-lg border border-indigo-100 uppercase tracking-tighter">{r}</span>); } }); } return labels; })()}</div></div>)}</>)}</div></td>
                          <td className="py-4 px-4 text-center border-y border-slate-100/50"><div className="flex flex-col items-center">{(() => { const rowPayments = fee.associated_payments || []; let totalReceived = rowPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0); if (totalReceived === 0 && parseFloat(fee.paid_amount || "0") > 0) totalReceived = parseFloat(fee.paid_amount); if (totalReceived > 0) { return (<><span className="text-sm font-black text-slate-900 tracking-tight">₹{totalReceived.toLocaleString()}</span><div className="mt-1 flex flex-col gap-1">{Math.min(totalReceived, parseFloat(fee.amount) + adjustment) > 0 && (<span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[7px] font-black rounded border border-emerald-100 uppercase tracking-tighter">{fee.installment_name === 'Overpayment Credit' ? 'CREDITED' : 'Applied'}: ₹{Math.min(totalReceived, parseFloat(fee.amount) + adjustment).toLocaleString()}</span>)}</div></>); } return <span className="text-slate-300 font-black">—</span>; })()}</div></td>
                          <td className="py-4 px-4 text-center border-y border-slate-100/50"><div className="flex flex-col items-center gap-2"><div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 shadow-sm", isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:shadow-emerald-200/50" : isPartial ? "bg-amber-50 text-amber-700 border-amber-100" : isPending ? "bg-rose-50 text-rose-700 border-rose-100 animate-pulse" : "bg-slate-50 text-slate-400 border-slate-100")}><div className={cn("w-1 h-1 rounded-full", isPaid ? "bg-emerald-500" : isPartial ? "bg-amber-500" : isPending ? "bg-rose-500" : "bg-slate-300")} />{fee.status.toUpperCase()}</div></div></td>
                          <td className="py-4 px-2 text-center border-y border-slate-100/50"><span className="text-[10px] font-black text-slate-400 tracking-tight bg-slate-50/50 px-2 py-1.5 rounded-lg border border-slate-100/50 inline-block">{fee.installment_name === 'Overpayment Credit' ? '—' : (showPaymentInPlan ? (singlePayment?.transaction_id || fee.transaction_id || 'BANK/CASH') : (payments.length > 1 ? 'MULTIPLE' : '—'))}</span></td>
                          <td className="py-4 px-2 text-right border-y border-slate-100/50"><span className="text-[9px] font-black text-slate-400 tracking-tighter uppercase inline-block">{fee.installment_name === 'Overpayment Credit' ? '—' : (showPaymentInPlan ? (singlePayment?.receipt_id || fee.receipt_id) : (payments.length > 1 ? 'CONS.' : '—'))}</span></td>
                          <td className="py-4 pr-6 text-center rounded-r-[24px] border-y border-r border-slate-100/50">
                            {showPaymentInPlan && fee.installment_name !== 'Overpayment Credit' ? (
                              <div className="flex items-center justify-center gap-2">
                                <motion.button 
                                  whileHover={{ scale: 1.1, rotate: 5 }} 
                                  whileTap={{ scale: 0.9 }} 
                                  onClick={() => { 
                                    const receiptFee: FeeRecord = { ...fee, paid_amount: singlePayment?.amount || fee.paid_amount, payment_date: singlePayment?.actual_payment_date || fee.payment_date, payment_method: singlePayment?.payment_method || fee.payment_method, transaction_id: singlePayment?.transaction_id || fee.transaction_id, receipt_id: singlePayment?.receipt_id || fee.receipt_id, status: 'paid', remarks: singlePayment?.remarks || fee.remarks }; 
                                    downloadReceipt(receiptFee); 
                                  }} 
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                                  title="Download Receipt"
                                >
                                  <Download size={16} />
                                </motion.button>
                                <motion.button 
                                  whileHover={{ scale: 1.1, rotate: -5 }} 
                                  whileTap={{ scale: 0.9 }} 
                                  animate={{ 
                                    boxShadow: ["0px 0px 0px rgba(16, 185, 129, 0)", "0px 0px 12px rgba(16, 185, 129, 0.5)", "0px 0px 0px rgba(16, 185, 129, 0)"] 
                                  }}
                                  transition={{ 
                                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                    scale: { duration: 0.2 },
                                    rotate: { duration: 0.2 }
                                  }}
                                  onClick={() => { 
                                    const receiptFee: FeeRecord = { ...fee, paid_amount: singlePayment?.amount || fee.paid_amount, payment_date: singlePayment?.actual_payment_date || fee.payment_date, payment_method: singlePayment?.payment_method || fee.payment_method, transaction_id: singlePayment?.transaction_id || fee.transaction_id, receipt_id: singlePayment?.receipt_id || fee.receipt_id, status: 'paid', remarks: singlePayment?.remarks || fee.remarks }; 
                                    shareOnWhatsApp(receiptFee); 
                                  }} 
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all"
                                  title="Share on WhatsApp"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.122.554 4.197 1.607 6.037L0 24l6.105-1.602a11.834 11.834 0 005.937 1.598h.005c6.637 0 12.032-5.395 12.035-12.03a11.824 11.824 0 00-3.417-8.436z"/>
                                  </svg>
                                </motion.button>
                              </div>
                            ) : (
                              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-200 border border-slate-100">
                                <Download size={16} />
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );

                      if (payments.length > 1 || (payments.length === 1 && fee.status === 'partial')) {
                        payments.forEach((payment, pIdx) => {
                          globalSNo++;
                          planRows.push(
                            <motion.tr key={`pay-${payment.payment_id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-all duration-500 border-l-[4px] border-emerald-500 shadow-sm">
                              <td className="py-4 px-4 rounded-l-none pl-6"><div className="w-8 h-8 flex items-center justify-center rounded-xl font-black text-[10px] bg-emerald-100 text-emerald-700 shadow-inner">{globalSNo.toString().padStart(2, '0')}</div></td>
                              <td className="py-4 px-2"><div className="flex flex-col ml-1"><div className="flex items-center flex-wrap gap-2 mb-1"><span className="text-[12px] font-black text-emerald-900 tracking-tight leading-tight">Payment Entry #{pIdx + 1}</span><span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white tracking-widest shrink-0">Txn</span></div><div className="flex items-center gap-1.5 text-emerald-600"><Clock size={10} className="shrink-0" /><span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">{new Date(payment.actual_payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div></div></td>
                              <td className="py-4 px-4 text-center text-slate-300 font-black">—</td>
                              <td className="py-4 px-4 text-center"><span className="text-base font-black text-emerald-700 tracking-tight">₹{parseFloat(payment.amount).toLocaleString()}</span></td>
                              <td className="py-4 px-4 text-center"><div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition-all hover:scale-105"><CheckCircle2 size={12} />Settled</div></td>
                              <td className="py-4 px-2 text-center"><span className="text-[10px] font-black text-emerald-700 tracking-tight bg-white/60 px-2 py-1.5 rounded-lg border border-emerald-100 shadow-inner inline-block">{payment.transaction_id || 'BANK/CASH'}</span></td>
                              <td className="py-4 px-2 text-right font-black text-emerald-600 text-[9px] tracking-widest">{payment.receipt_id}</td>
                              <td className="py-4 pr-6 text-center rounded-r-[24px]">
                                <div className="flex items-center justify-center gap-2">
                                  <motion.button 
                                    whileHover={{ scale: 1.1, rotate: -5 }} 
                                    whileTap={{ scale: 0.9 }} 
                                    onClick={() => { 
                                      const receiptFee: FeeRecord = { ...fee, paid_amount: payment.amount, payment_date: payment.actual_payment_date, payment_method: payment.payment_method, transaction_id: payment.transaction_id, receipt_id: payment.receipt_id, status: 'paid', remarks: payment.remarks }; 
                                      downloadReceipt(receiptFee); 
                                    }} 
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                                    title="Download Receipt"
                                  >
                                    <Download size={16} />
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.1, rotate: -5 }} 
                                    whileTap={{ scale: 0.9 }} 
                                    animate={{ 
                                      boxShadow: ["0px 0px 0px rgba(16, 185, 129, 0)", "0px 0px 12px rgba(16, 185, 129, 0.5)", "0px 0px 0px rgba(16, 185, 129, 0)"] 
                                    }}
                                    transition={{ 
                                      boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                      scale: { duration: 0.2 },
                                      rotate: { duration: 0.2 }
                                    }}
                                    onClick={() => { 
                                      const receiptFee: FeeRecord = { ...fee, paid_amount: payment.amount, payment_date: payment.actual_payment_date, payment_method: payment.payment_method, transaction_id: payment.transaction_id, receipt_id: payment.receipt_id, status: 'paid', remarks: payment.remarks }; 
                                      shareOnWhatsApp(receiptFee); 
                                    }} 
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all"
                                    title="Share on WhatsApp"
                                  >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.122.554 4.197 1.607 6.037L0 24l6.105-1.602a11.834 11.834 0 005.937 1.598h.005c6.637 0 12.032-5.395 12.035-12.03a11.824 11.824 0 00-3.417-8.436z"/>
                                    </svg>
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        });
                      }
                      return planRows;
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistoryModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[48px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl relative z-10 border border-slate-100 flex flex-col">
              <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-6"><div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-200"><History size={32} /></div><div><h2 className="text-4xl font-black text-slate-900 tracking-tight">Audit Trail</h2><p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Student: {student.name}</p></div></div>
                <button onClick={() => setShowHistoryModal(false)} className="p-4 bg-white rounded-[20px] text-slate-400 hover:text-slate-900 transition-colors shadow-sm border border-slate-100"><X size={24} /></button>
              </div>
              <div className="p-12 overflow-y-auto flex-1 space-y-6 bg-white">
                {existingFees.filter(f => f.status === 'paid' || f.status === 'partial').length > 0 ? (
                  existingFees.filter(f => f.status === 'paid' || f.status === 'partial').map((fee, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-500 group">
                      <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500"><Receipt size={32} /></div>
                        <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{fee.installment_name || fee.month}</p><p className="text-3xl font-black text-slate-900 tracking-tight">₹{parseFloat(fee.paid_amount).toLocaleString()}</p><div className="flex items-center gap-3"><span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">Ref: {fee.receipt_id}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(fee.payment_date || "").toLocaleDateString('en-GB')}</span></div></div>
                      </div>
                      <div className="text-right space-y-4">
                        <div className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm inline-block", fee.status === 'paid' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>{fee.status === 'paid' ? 'Fully Settled' : 'Partially Settled'}</div>
                        {fee.remarks && (<div className="max-w-[200px]"><p className="text-[11px] text-slate-400 italic font-medium leading-relaxed">"{fee.remarks}"</p></div>)}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-4"><div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto"><FileText size={40} /></div><p className="text-slate-400 font-black uppercase tracking-widest">No transaction history found</p></div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
