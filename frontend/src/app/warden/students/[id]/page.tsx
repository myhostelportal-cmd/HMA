"use client";

import { useEffect, useState, useCallback } from "react";
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
  Users,
  AlertCircle,
  MapPin,
  GraduationCap,
  Home,
  CreditCard,
  History,
  Save,
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
  MessageSquare,
  Printer,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadReceipt as generateReceipt } from "@/utils/receiptGenerator";
import { generateAdmissionContract } from "@/utils/admissionContractGenerator";

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
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  
  // Fee data states
  const [existingFees, setExistingFees] = useState<FeeRecord[]>([]);
  const [feeStats, setFeeStats] = useState({
    totalPaid: 0,
    totalDue: 0,
    overcreditedAmount: 0,
    nextPayableFee: null as FeeRecord | null,
    progress: 0
  });
  
  // Form states
  const [feeForm, setFeeForm] = useState({
    amount: "",
    payment_method: "UPI",
    transaction_id: "",
    reverify_transaction_id: "",
    actual_payment_date: new Date().toISOString().split('T')[0],
    remarks: "",
    fee_id: null as number | null
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [showAdjustConfirm, setShowAdjustConfirm] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [settling, setSettling] = useState(false);
  const [isSecurityPayment, setIsSecurityPayment] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const getAvailableSecurity = () => {
    if (!student) return 0;
    return parseFloat((student as any).security_balance || "0");
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

      // CRITICAL: Update student state with synced balance from finance response
      if (feesRes.data.student) {
        setStudent((prev: any) => ({
          ...prev,
          ...feesRes.data.student,
          monthly_fee: parseFloat(feesRes.data.student.monthly_fee || "0"),
          security_deposit: parseFloat(feesRes.data.student.security_deposit || "0"),
          security_balance: parseFloat(feesRes.data.student.security_balance || "0"),
          total_session_fees: parseFloat(feesRes.data.student.total_session_fees || "0")
        }));
      }

      // Calculate TRUE total paid by summing every transaction across all fee rows
      // We also need to capture overpayments which might not be linked in associated_payments
      const totalPaid = fees.reduce((sum, f) => {
        const rowPayments = f.associated_payments || [];
        const paymentSum = rowPayments.reduce((pSum, p) => pSum + parseFloat(p.amount || "0"), 0);
        
        // If it's an overpayment credit row and has no associated payments, use its paid_amount
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
      
      // Find next payable: First record that is NOT 'paid'
      const nextPayable = fees.find(f => f.status !== 'paid');
      
      setFeeStats({
        totalPaid,
        totalDue: totalSession - (totalPaid - overcreditedAmount),
        overcreditedAmount,
        nextPayableFee: nextPayable || null,
        progress: totalSession > 0 ? Math.round(((totalPaid + overcreditedAmount) / totalSession) * 100) : 0
      });

      if (nextPayable) {
        const remainingForThisRow = parseFloat(nextPayable.amount) + parseFloat(nextPayable.adjustment_amount || "0") - parseFloat(nextPayable.paid_amount || "0");
        setFeeForm((prev) => ({
          ...prev,
          fee_id: nextPayable.fee_id,
          amount: Math.max(0, remainingForThisRow).toFixed(2)
        }));
      }
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

  const handlePreVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(feeForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid amount greater than zero.");
      return;
    }
    
    // Security Adjustment validation
    if (isSecurityPayment) {
      const availableSecurity = getAvailableSecurity();
      
      // Calculate how much is actually required for this specific month/target
      const currentRequired = parseFloat(feeForm.amount);

      if (currentRequired > availableSecurity) {
        setFormError(`Insufficient security funds. You have ₹${availableSecurity.toLocaleString()} available in the buffer, but you are trying to adjust ₹${currentRequired.toLocaleString()}.`);
        return;
      }
    } else {
      // Strict validation for non-cash digital payments
      if (feeForm.payment_method !== 'Cash') {
        if (!feeForm.transaction_id || feeForm.transaction_id.trim() === "") {
          setFormError("Transaction ID is required for digital payments.");
          return;
        }
        if (feeForm.transaction_id !== feeForm.reverify_transaction_id) {
          setFormError("Transaction IDs do not match. Please verify.");
          return;
        }
      }
    }
    
    setFormError("");
    setShowConfirmPopup(true);
  };

  const handleAddFee = async () => {
    if (saving) return; 
    setFormError("");
    setSaving(true);
    try {
      if (isSecurityPayment && feeForm.fee_id) {
        // Use the adjust-security endpoint
        await api.post(`/finance/fee/${feeForm.fee_id}/adjust-security`, {
          adjustAmount: parseFloat(feeForm.amount)
        });
      } else {
        // Standard payment
        await api.post(`/finance/student/${id}/pay`, {
          amount_paid: parseFloat(feeForm.amount),
          payment_method: feeForm.payment_method,
          transaction_id: feeForm.transaction_id,
          remarks: feeForm.remarks,
          actual_payment_date: feeForm.actual_payment_date
        });
      }
      
      // Reset form fields
      setFeeForm({
        amount: "",
        payment_method: "UPI",
        transaction_id: "",
        reverify_transaction_id: "",
        actual_payment_date: new Date().toISOString().split('T')[0],
        remarks: "",
        fee_id: null
      });
      setIsSecurityPayment(false);

      await fetchStudentData(); 
      setShowFeeModal(false);
      setShowConfirmPopup(false);
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Error recording payment");
      setShowConfirmPopup(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustAdvance = async () => {
    if (adjusting) return;
    setAdjusting(true);
    try {
      await api.post(`/finance/student/${id}/adjust-advance`);
      await fetchStudentData();
      setShowAdjustConfirm(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Error adjusting advance");
    } finally {
      setAdjusting(false);
    }
  };

  const handleUnadjustAdvance = async () => {
    if (adjusting) return;
    setAdjusting(true);
    try {
      await api.post(`/finance/student/${id}/unadjust-advance`);
      await fetchStudentData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error reversing adjustment");
    } finally {
      setAdjusting(false);
    }
  };

  const handleSettleAccount = async () => {
    if (settling) return;
    setSettling(true);
    try {
      const res = await api.post(`/finance/student/${id}/settle-account`, { exitDate });
      alert(`Account settled successfully. Remaining refund: ₹${res.data.remaining_refund}`);
      await fetchStudentData();
      setShowSettleModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Error settling account");
    } finally {
      setSettling(false);
    }
  };

  const handleMarkExit = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await api.put(`/hostels/students/${id}/exit`, {
        exitDate: new Date().toISOString().split('T')[0],
        reason: exitReason || 'Student marked as exit by warden'
      });
      alert('Student marked as inactive successfully.');
      await fetchStudentData();
      setShowExitModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Error marking student as exit");
    } finally {
      setExiting(false);
    }
  };

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
    
    const pDate = fee.payment_date ? new Date(fee.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const statusText = (fee.status || 'pending').toUpperCase();
    const displayStatus = statusText === 'PAID' ? 'PAID' : statusText === 'PARTIAL' ? 'PARTIAL PAID' : statusText;

    const message = `*FEE PAYMENT RECEIPT - ${hostelName}*\n\n` +
      `Hello *${student.name}*,\n\n` +
      `Your payment has been successfully recorded.\n\n` +
      `*STUDENT INFORMATION*\n` +
      `• *Room Number:* ${student.room_number || '—'}\n` +
      `• *Contact:* ${student.phone || '—'}\n` +
      `• *Joining Date:* ${new Date(student.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n` +
      `*RECEIPT INFORMATION*\n` +
      `• *Receipt ID:* ${receiptId}\n` +
      `• *Payment Date:* ${pDate}\n` +
      `• *Installment:* ${installment}\n` +
      `• *Amount:* ₹${amount}\n` +
      `• *Payment Method:* ${fee.payment_method || '—'}\n` +
      `• *Transaction ID:* ${transactionRef}\n` +
      `• *Status:* ${displayStatus}\n\n` +
      `*PAYMENT SUMMARY*\n` +
      `• *Total Package:* ₹${parseFloat(student.total_session_fees as any || "0").toLocaleString('en-IN')}\n` +
      `• *Security:* ₹${parseFloat(student.security_deposit as any || "0").toLocaleString('en-IN')}\n` +
      `• *Total Paid:* ₹${feeStats.totalPaid.toLocaleString('en-IN')}\n` +
      `• *Outstanding:* ₹${feeStats.totalDue.toLocaleString('en-IN')}\n` +
      `• *Overcredited:* ₹${feeStats.overcreditedAmount.toLocaleString('en-IN')}${publicLink}\n\n` +
      `_Thank you for your payment!_`;

    const encodedMsg = encodeURIComponent(message);
    const phoneNumber = student.whatsapp_number || student.phone || "";
    // Remove any non-numeric characters from phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Use international format if not already (assuming Indian numbers if 10 digits)
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleGenerateAdmissionContract = async () => {
    if (!student) return;
    setPdfGenerating(true);
    try {
      // Prepare hostel data
      const hostelData = {
        hostel_name: student.hostel_name || "Hostel",
        hostel_address: student.hostel_address || "Address not available",
        city: "City",
        state: "State",
        phone_number: student.hostel_contact || "N/A",
        whatsapp_number: student.hostel_contact || "N/A"
      };

      // Prepare room data
      const roomData = {
        room_number: student.room_number || "N/A",
        floor: student.floor || "N/A",
        room_type: student.room_type || (student.details?.room_category || "N/A"),
        capacity: student.room_capacity || 1,
        current_occupancy: 1
      };

      // Prepare fee data with total session fees for percentage calculation
      const feeData = {
        security_deposit: student.security_deposit || 0,
        monthly_fee: student.monthly_fee || 0,
        total_due: feeStats.totalDue || 0,
        total_paid: feeStats.totalPaid || 0,
        outstanding_balance: feeStats.totalDue || 0,
        total_session_fees: student.total_session_fees || 0,
        payment_completion_percent: feeStats.progress || 0
      };

      await generateAdmissionContract(hostelData, student, roomData, feeData, existingFees);
    } catch (error) {
      console.error("Error generating admission contract:", error);
      alert("Failed to generate admission contract. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
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
      <Sidebar role="warden" />
      <div className="flex-1 min-w-0">
        {/* Navigation Bar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100"
        >
          <div className="w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all group"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                <ArrowLeft size={16} />
              </div>
              <span className="hidden sm:inline">Back to Directory</span>
              <span className="sm:hidden">Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateAdmissionContract}
                disabled={pdfGenerating}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-full border border-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-300"
              >
                {pdfGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Printer size={14} />
                )}
                <span className="font-black text-[9px] md:text-[10px] uppercase tracking-widest">
                  {pdfGenerating ? "Generating..." : "Print Admission Contract"}
                </span>
              </motion.button>
              <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-indigo-50 rounded-full border border-indigo-100">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                <span className="text-indigo-600 font-black text-[9px] md:text-[10px] uppercase tracking-widest">Warden Control</span>
              </div>
            </div>
          </div>
        </motion.div>

        <main className="w-full px-4 md:px-6 mt-6 md:mt-8 space-y-6 md:space-y-8 max-w-7xl mx-auto pb-12 relative">
          {/* EXITED WATERMARK */}
          {(student.status === 'inactive' || student.status === 'Exited') && (
            <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[90px] md:text-[125px] font-black text-rose-500/50 uppercase tracking-[0.2em] -rotate-[35deg] whitespace-nowrap select-none blur-[1px] drop-shadow-[0_20px_50px_rgba(244,63,94,0.3)]"
              >
                EXITED
              </motion.div>
            </div>
          )}

          {/* Student Overview Header - Professional Redesign */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[28px] md:rounded-[32px] p-6 md:p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/30 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row gap-8 md:gap-10 items-center lg:items-start">
              {/* Photo/Avatar Section */}
              <div className="relative group shrink-0 self-center lg:self-start">
                {student.student_photo ? (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-[28px] md:rounded-[32px] overflow-hidden shadow-2xl border-4 border-white relative z-10"
                  >
                    <img src={student.student_photo} alt={student.name} className="w-full h-full object-cover" />
                  </motion.div>
                ) : (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[28px] md:rounded-[32px] flex items-center justify-center text-5xl md:text-6xl font-black shadow-2xl border-4 border-white relative z-10"
                  >
                    {student.name?.charAt(0)}
                  </motion.div>
                )}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 md:w-12 md:h-12 bg-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white z-20">
                  <UserCheck size={20} />
                </div>
              </div>
              
              <div className="flex-1 space-y-6 w-full text-center lg:text-left">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-2 pt-2">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight capitalize">{student.name}</h1>
                      <div className="flex gap-2 justify-center lg:justify-start">
                        <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                          {student.gender || 'N/A'}
                        </span>
                        
                        {/* Status / Exited Badge */}
                        {student.status === 'active' ? (
                          <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                            {student.status}
                          </span>
                        ) : (
                          <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white border border-indigo-700 shadow-lg shadow-indigo-200 animate-in zoom-in duration-300">
                            EXITED
                          </span>
                        )}
                        
                        {/* Mark as Exit Button - Conditional */}
                        {student.status === 'active' && getAvailableSecurity() === 0 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowExitModal(true)}
                            className="px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white shadow-lg shadow-rose-200 flex items-center gap-2"
                          >
                            <LogOut size={12} />
                            Mark as Exit
                          </motion.button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-slate-500 font-bold">
                      <div className="flex items-center gap-2">
                        <Fingerprint size={16} className="text-indigo-400" />
                        <span className="text-xs md:text-sm">Student ID: <span className="text-slate-900 font-black">#{student.student_id}</span></span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-300 hidden md:block" />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">RESIDENT PROFILE OVERVIEW</span>
                      </div>
                    </div>
                  </div>

                  {/* Room Info Box (Right Side) - Matches Screenshot */}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-indigo-50/50 rounded-[24px] md:rounded-[28px] p-5 md:p-6 border border-indigo-100 shadow-xl shadow-indigo-200/20 w-full lg:min-w-[280px] lg:max-w-[320px] hover:shadow-2xl hover:shadow-indigo-300/30 transition-all duration-500"
                  >
                    <div className="flex items-center gap-4 mb-5 md:mb-6 justify-center lg:justify-start">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <Home size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">ROOM ASSIGNED</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900">{student.room_number || 'N/A'}{student.assigned_slot?.slice(-1)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-3 md:gap-y-4 text-left">
                      <div>
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ROOM SEATER</p>
                        <p className="text-[11px] md:text-xs font-black text-slate-700">{student.room_capacity ? `${student.room_capacity} Seater` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CATEGORY</p>
                        <p className="text-[11px] md:text-xs font-black text-slate-700 truncate">{student.room_type || (student.details?.room_category || 'N/A')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">FLOOR</p>
                        <p className="text-[11px] md:text-xs font-black text-emerald-600">{student.floor || 'Ground Floor'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">JOINING DATE</p>
                        <p className="text-[11px] md:text-xs font-black text-slate-700">{new Date(student.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

              </div>
            </div>
          </motion.div>

          {/* Info Grid - Professional Bento Style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* IDENTIFICATION */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/30 border border-slate-100 hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-[10px] font-black text-indigo-600 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                IDENTIFICATION
              </h3>
              
              <div className="space-y-6">
                <div className="group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">CONTACT NUMBER</p>
                  <p className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Phone size={14} className="text-indigo-400" />
                    {student.phone}
                  </p>
                </div>

                <div className="group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">WHATSAPP NUMBER</p>
                  <p className="text-base font-black text-emerald-600 flex items-center gap-2">
                    <Smartphone size={14} className="text-emerald-400" />
                    {student.whatsapp_number}
                  </p>
                </div>

                <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">STUDENT AADHAAR</p>
                  <p className="text-xl font-black text-slate-900 tracking-[0.2em]">{student.aadhaar_number || 'N/A'}</p>
                </div>
              </div>
            </motion.div>

            {/* ADDRESS & GUARDIAN */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/30 border border-slate-100 hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-[10px] font-black text-emerald-600 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                ADDRESS & GUARDIAN
              </h3>

              <div className="space-y-6">
                <div className="group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">EMAIL ADDRESS</p>
                  <p className="text-sm font-black text-slate-900 truncate flex items-center gap-2">
                    <Mail size={14} className="text-indigo-400" />
                    {student.email}
                  </p>
                </div>

                <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 group hover:bg-white hover:border-emerald-200 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">GUARDIAN & RELATION</p>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">
                      {student.details?.parent_relation || 'Parent'}
                    </span>
                  </div>
                  <p className="text-lg font-black text-slate-900">{student.details?.parent_name || 'N/A'}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">{student.details?.parent_occupation || 'Occupation Not Specified'}</p>
                </div>

                <div className="group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">GUARDIAN CONTACT(S)</p>
                  <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Phone size={14} className="text-emerald-400" />
                    {student.details?.parent_phone}
                    {student.details?.parent_secondary_phone && <span className="text-slate-300 font-medium">/ {student.details.parent_secondary_phone}</span>}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ACADEMIC INFO */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xl shadow-slate-200/30 border border-slate-100 hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-[10px] font-black text-amber-600 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-amber-600 rounded-full" />
                ACADEMIC INFO
              </h3>

              <div className="space-y-6">
                <div className="group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">COLLEGE NAME</p>
                  <p className="text-base font-black text-slate-900 uppercase leading-tight">{student.details?.college_name || 'N/A'}</p>
                </div>

                <div className="p-5 bg-amber-50/50 rounded-[24px] border border-amber-100 group hover:bg-white hover:border-amber-300 transition-all">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">COURSE & YEAR</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-900 uppercase">{student.details?.course_name || 'N/A'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.details?.year || '1st'} Year Student</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>


          {/* Fee Management Portal - Professional Redesign */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group"
          >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform duration-500">
                      <CreditCard size={32} />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">Fee Management Portal</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors cursor-default">
                          SYSTEM: {student.payment_model}
                        </span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm hover:bg-emerald-100 transition-colors cursor-default">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          LIVE LEDGER
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowHistoryModal(true)}
                    className="flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-[24px] font-black text-sm transition-all border border-slate-200 shadow-sm group/btn"
                  >
                    <History size={20} className="group-hover/btn:rotate-12 transition-transform text-indigo-600" />
                    <span>Ledger History</span>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (feeStats.nextPayableFee) {
                        const remaining = parseFloat(feeStats.nextPayableFee.amount) + 
                                        parseFloat(feeStats.nextPayableFee.adjustment_amount || "0") - 
                                        parseFloat(feeStats.nextPayableFee.paid_amount || "0");
                        setFeeForm(prev => ({
                          ...prev,
                          fee_id: feeStats.nextPayableFee!.fee_id,
                          amount: Math.max(0, remaining).toString()
                        }));
                      }
                      setShowFeeModal(true);
                    }}
                    disabled={!feeStats.nextPayableFee}
                    className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-[24px] font-black text-sm transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                  >
                    <Plus size={20} className="group-hover/btn:rotate-90 transition-transform" />
                    <span>Record New Payment</span>
                  </motion.button>
                </div>

              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Plan Details Card */}
                <div className="lg:col-span-8 bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 flex flex-col hover:shadow-2xl transition-all duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                      <TrendingUp size={18} className="text-indigo-600" />
                      PAYMENT PLAN DETAILS
                    </h4>
                    <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-black uppercase border border-slate-100">{student.payment_model}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {existingFees.slice(0, 4).map((fee, idx) => {
                      const isPaid = fee.status === 'paid';
                      const adjustment = parseFloat(fee.adjustment_amount || "0");
                      
                      return (
                        <motion.div 
                          key={idx}
                          whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                          className={cn(
                            "p-5 rounded-[28px] border transition-all duration-300",
                            isPaid 
                            ? "bg-emerald-50/50 border-emerald-100/50" 
                            : "bg-slate-50/50 border-slate-100"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className={cn(
                                "text-sm font-black",
                                isPaid ? "text-emerald-700" : "text-slate-800"
                              )}>
                                {fee.installment_name || fee.month}
                                {(fee.installment_name?.toLowerCase() === 'security deposit' || fee.fee_type === 'advance_payment') && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded border border-blue-100">One-Time</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  Due: {new Date(fee.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-slate-900 tracking-tight">
                                ₹{(parseFloat(fee.amount) + adjustment).toLocaleString()}
                              </p>
                              {adjustment !== 0 && (
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">₹{Math.abs(adjustment).toLocaleString()} Security Adjusted</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-6 gap-x-8">
                    <div className="flex flex-wrap items-center gap-8">
                      {/* PRIMARY SECURITY INFO */}
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                          <ShieldCheck size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SECURITY DEPOSIT</p>
                          <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{parseFloat(student.security_deposit as any || "0").toLocaleString()}</p>
                        </div>
                      </div>

                      {student.payment_model === '2 + 1 System' && (
                        <div className="border-l border-slate-100 pl-8">
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">SECURITY DEPOSIT</p>
                          <p className="text-2xl font-black text-amber-600 tracking-tighter">
                            ₹{getAvailableSecurity().toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Static Fee Info based on Payment System */}
                    <div className="flex items-center justify-center">
                      <div className="px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center min-w-[180px] shadow-sm">
                        {student.payment_model === '2 + 1 System' ? (
                          <>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">MONTHLY INSTALLMENT</p>
                            <p className="text-xl font-black text-indigo-600 tracking-tight">₹{parseFloat(student.monthly_fee as any || "0").toLocaleString()}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TOTAL SESSION VALUE</p>
                            <p className="text-xl font-black text-indigo-600 tracking-tight">₹{parseFloat(student.total_session_fees as any || "0").toLocaleString()}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="px-8 py-3 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 shadow-sm whitespace-nowrap">
                      HELD IN TRUST
                    </div>
                  </div>
                </div>

                {/* Progress Card */}
                <div className="lg:col-span-4 bg-slate-50 rounded-[40px] p-8 border border-slate-100 shadow-inner flex flex-col justify-between group/card hover:bg-white hover:shadow-xl transition-all duration-500">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PAYMENT PROGRESS</p>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-indigo-600">{feeStats.progress}%</span>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      </div>
                    </div>
                    
                    <div className="relative h-4 bg-white rounded-full overflow-hidden p-1 border border-slate-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${feeStats.progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full relative"
                      >
                        <div className="absolute inset-0 bg-white/20 skew-x-12 animate-shimmer" />
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <Briefcase size={16} className="text-indigo-600" />
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Financial Summary</h5>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between group/line">
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/line:text-indigo-600 transition-colors">Security Deposit (Paid)</p>
                            <div className="group relative">
                              <Info size={10} className="text-slate-300 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[8px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                This is a one-time refundable deposit
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-black text-slate-900">₹{parseFloat(student.security_deposit as any || "0").toLocaleString()}</p>
                        </div>

                        <div className="flex items-center justify-between group/line">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/line:text-indigo-600 transition-colors">Monthly Fee (Current)</p>
                          <p className="text-sm font-black text-slate-900">₹{parseFloat(student.monthly_fee as any || "0").toLocaleString()}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Total Paid</p>
                          <p className="text-base font-black text-emerald-700">₹{feeStats.totalPaid.toLocaleString()}</p>
                        </div>

                        <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center justify-between">
                          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Outstanding</p>
                          <p className="text-base font-black text-indigo-700">₹{feeStats.totalDue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {feeStats.overcreditedAmount > 0 && (
                      <div className="p-4 bg-slate-50 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Overcredited</p>
                        <p className="text-base font-black text-slate-900">₹{feeStats.overcreditedAmount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>

          {/* Payment History Table - Professional Redesign */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200" />
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Payment History</h3>
                </div>
                <p className="text-slate-500 font-bold text-sm ml-6 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-emerald-500" />
                  Real-time transaction payment log
                </p>
              </div>
              
              <div className="flex gap-4">
                {/* Finance controls removed as requested */}
              </div>
            </div>

            {/* Advance Pool section removed as requested */}
            
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full min-w-[1000px] text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-slate-400">
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] pl-6 w-[4%]">S.No</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 w-[16%]">Source / Entry</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[12%]">Plan Required</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[12%]">Paid Amount</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[10%]">Status</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-center w-[18%]">Transaction Ref</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] px-2 text-right w-[20%]">Receipt</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] pr-6 text-center w-[8%]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let globalSNo = 0;
                    // Filter out advance payments from main list
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
                        <motion.tr 
                          key={`plan-${fee.fee_id}`} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: globalSNo * 0.05 }}
                          className={cn(
                            "group transition-all duration-300",
                            isPaid 
                            ? "bg-white hover:bg-slate-50 shadow-sm" 
                            : "bg-slate-50/50 hover:bg-white border border-slate-100"
                          )}
                        >
                          <td className="py-4 pl-6 rounded-l-[24px] border-y border-l border-slate-100/50">
                            <div className={cn(
                              "w-10 h-10 flex items-center justify-center rounded-2xl font-black text-xs shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                              isPaid ? "bg-emerald-50 text-emerald-600 shadow-inner" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                            )}>
                              {globalSNo.toString().padStart(2, '0')}
                            </div>
                          </td>
                          <td className="py-4 px-2 border-y border-slate-100/50">
                            <div className="flex flex-col">
                              <div className="flex items-center flex-wrap gap-2 mb-1">
                                <span className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                                  {(fee.installment_name || fee.month || 'Ledger Entry').replace(/ \d{4}/, '')}
                                </span>
                                {student.payment_model === '2 + 1 System' && fee.month_type && (
                                  <span className={cn(
                                    "text-[7px] font-black uppercase px-1.5 py-0.5 rounded border tracking-[0.1em] shrink-0",
                                    fee.month_type === 'Running' ? "bg-green-100 text-green-800 border-green-200" :
                                    fee.month_type === 'Advance' ? "bg-blue-100 text-blue-800 border-blue-200" :
                                    "bg-slate-100 text-slate-500 border-slate-200"
                                  )}>
                                    {fee.month_type}
                                  </span>
                                )}

                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar size={10} className="shrink-0" />
                                <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                                  Due: {new Date(fee.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center border-y border-slate-100/50">
                            <div className="flex flex-col items-center">
                              {fee.installment_name === 'Overpayment Credit' ? (
                                <>
                                  <span className="text-base font-black text-blue-600 tracking-tight">₹{parseFloat(fee.paid_amount || "0").toLocaleString()}</span>
                                  <span className="text-[9px] font-black uppercase text-blue-600/60 tracking-[0.2em] mt-2">EXTRA CREDITED</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base font-black text-slate-900 tracking-tight">
                                    ₹{(parseFloat(fee.amount) + adjustment).toLocaleString()}
                                  </span>
                                  {adjustment !== 0 && (
                                    <div className="flex flex-col items-center gap-1 mt-2">
                                      <span className="text-[10px] font-bold text-slate-300 line-through">₹{parseFloat(fee.amount).toLocaleString()}</span>
                                      {/* Dynamic Labels */}
                                      <div className="flex flex-col gap-1">
                                        {(() => {
                                          const labels = [];
                                          const absAdjustment = Math.abs(adjustment);
                                          if (fee.installment_name?.toLowerCase() === 'security deposit' || (globalSNo === 1 && fee.fee_type === 'one-time')) {
                                            const rowPayments = fee.associated_payments || [];
                                            const totalReceived = rowPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
                                            const securityRequired = parseFloat(fee.amount);
                                            const spillover = totalReceived - Math.min(totalReceived, securityRequired);
                                            if (spillover > 0) {
                                              labels.push(
                                                <span key="spill" className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase tracking-tighter">
                                                  ₹{spillover.toLocaleString()} TO FUTURE
                                                </span>
                                              );
                                            }
                                          }
                                          // Remarks based labels
                                          if (fee.remarks) {
                                            fee.remarks.split('|').forEach((part, pIdx) => {
                                              const r = part.trim();
                                              if (r.toLowerCase().includes('adjusted') && !r.toLowerCase().includes('future')) {
                                                labels.push(
                                                  <span key={`adj-${pIdx}`} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-lg border border-indigo-100 uppercase tracking-tighter">
                                                    {r}
                                                  </span>
                                                );
                                              }
                                            });
                                          }
                                          return labels;
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center border-y border-slate-100/50">
                            <div className="flex flex-col items-center">
                              {(() => {
                                const rowPayments = fee.associated_payments || [];
                                let totalReceived = rowPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
                                
                                // Fallback for overpayment rows that don't have linked payments in associated_payments
                                if (totalReceived === 0 && parseFloat(fee.paid_amount || "0") > 0) {
                                  totalReceived = parseFloat(fee.paid_amount);
                                }

                                if (totalReceived > 0) {
                                  return (
                                    <>
                                      <span className="text-sm font-black text-slate-900 tracking-tight">₹{totalReceived.toLocaleString()}</span>
                                      <div className="mt-1 flex flex-col gap-1">
                                        {Math.min(totalReceived, parseFloat(fee.amount) + adjustment) > 0 && (
                                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[7px] font-black rounded border border-emerald-100 uppercase tracking-tighter">
                                            {fee.installment_name === 'Overpayment Credit' ? 'CREDITED' : 'Applied'}: ₹{Math.min(totalReceived, parseFloat(fee.amount) + adjustment).toLocaleString()}
                                          </span>
                                        )}
                                        {totalReceived > (parseFloat(fee.amount) + adjustment) && (
                                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded border border-blue-100 uppercase tracking-tighter">
                                            {fee.installment_name === 'Overpayment Credit' ? 'EXCESS PAYMENT' : `Adjustment (incl. ₹${(totalReceived - (parseFloat(fee.amount) + adjustment)).toLocaleString()} Overcredit)`}
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  );
                                }
                                return <span className="text-slate-300 font-black">—</span>;
                              })()}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center border-y border-slate-100/50">
                            <div className="flex flex-col items-center gap-2">
                              <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 shadow-sm",
                                isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:shadow-emerald-200/50" :
                                isPartial ? "bg-amber-50 text-amber-700 border-amber-100" :
                                isPending ? "bg-rose-50 text-rose-700 border-rose-100 animate-pulse" :
                                "bg-slate-50 text-slate-400 border-slate-100"
                              )}>
                                <div className={cn(
                                  "w-1 h-1 rounded-full",
                                  isPaid ? "bg-emerald-500" : isPartial ? "bg-amber-500" : isPending ? "bg-rose-500" : "bg-slate-300"
                                )} />
                                {fee.status.toUpperCase()}
                              </div>
                              {isPaid && (fee.payment_source === 'ADVANCE_ADJUSTED') && (
                                <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border tracking-tighter bg-indigo-50 text-indigo-600 border-indigo-100">
                                  Advance Adjusted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center border-y border-slate-100/50">
                            <span className="text-[10px] font-black text-slate-400 tracking-tight bg-slate-50/50 px-2 py-1.5 rounded-lg border border-slate-100/50 inline-block uppercase">
                              {fee.installment_name === 'Overpayment Credit' ? '—' : (showPaymentInPlan ? (singlePayment?.transaction_id || fee.transaction_id || singlePayment?.payment_method || fee.payment_method || 'N/A') : (payments.length > 1 ? 'MULTIPLE' : '—'))}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right border-y border-slate-100/50">
                            <span className="text-[9px] font-black text-slate-400 tracking-tighter uppercase inline-block">
                              {fee.installment_name === 'Overpayment Credit' ? '—' : (showPaymentInPlan ? (singlePayment?.receipt_id || fee.receipt_id) : (payments.length > 1 ? 'CONS.' : '—'))}
                            </span>
                          </td>
                          <td className="py-4 pr-6 text-center rounded-r-[24px] border-y border-r border-slate-100/50">
                            {showPaymentInPlan && fee.installment_name !== 'Overpayment Credit' ? (
                              <div className="flex items-center justify-center gap-2">
                                <motion.button 
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const receiptFee: FeeRecord = { 
                                      ...fee, 
                                      paid_amount: singlePayment?.amount || fee.paid_amount, 
                                      payment_date: singlePayment?.actual_payment_date || fee.payment_date, 
                                      payment_method: singlePayment?.payment_method || fee.payment_method, 
                                      transaction_id: singlePayment?.transaction_id || fee.transaction_id, 
                                      receipt_id: singlePayment?.receipt_id || fee.receipt_id, 
                                      status: 'paid', 
                                      remarks: singlePayment?.remarks || fee.remarks 
                                    };
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
                                    const receiptFee: FeeRecord = { 
                                      ...fee, 
                                      paid_amount: singlePayment?.amount || fee.paid_amount, 
                                      payment_date: singlePayment?.actual_payment_date || fee.payment_date, 
                                      payment_method: singlePayment?.payment_method || fee.payment_method, 
                                      transaction_id: singlePayment?.transaction_id || fee.transaction_id, 
                                      receipt_id: singlePayment?.receipt_id || fee.receipt_id, 
                                      status: 'paid', 
                                      remarks: singlePayment?.remarks || fee.remarks 
                                    };
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
                            <motion.tr 
                              key={`pay-${payment.payment_id}`} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-all duration-500 border-l-[4px] border-emerald-500 shadow-sm"
                            >
                              <td className="py-4 px-4 rounded-l-none pl-6">
                                <div className="w-8 h-8 flex items-center justify-center rounded-xl font-black text-[10px] bg-emerald-100 text-emerald-700 shadow-inner">
                                  {globalSNo.toString().padStart(2, '0')}
                                </div>
                              </td>
                              <td className="py-4 px-2">
                                <div className="flex flex-col ml-1">
                                  <div className="flex items-center flex-wrap gap-2 mb-1">
                                    <span className="text-[12px] font-black text-emerald-900 tracking-tight leading-tight">Payment Entry #{pIdx + 1}</span>
                                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white tracking-widest shrink-0">Txn</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-emerald-600">
                                    <Clock size={10} className="shrink-0" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                                      {new Date(payment.actual_payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center text-slate-300 font-black">—</td>
                              <td className="py-4 px-4 text-center">
                                <span className="text-base font-black text-emerald-700 tracking-tight">₹{parseFloat(payment.amount).toLocaleString()}</span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition-all hover:scale-105">
                                  <CheckCircle2 size={12} />
                                  Settled
                                </div>
                              </td>
                              <td className="py-4 px-2 text-center">
                                <span className="text-[10px] font-black text-emerald-700 tracking-tight bg-white/60 px-2 py-1.5 rounded-lg border border-emerald-100 shadow-inner inline-block uppercase">
                                  {payment.transaction_id || payment.payment_method || 'N/A'}
                                </span>
                              </td>
                              <td className="py-4 px-2 text-right font-black text-emerald-600 text-[9px] tracking-widest">
                                {payment.receipt_id}
                              </td>
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

        {/* Record Payment Modal - Professional Redesign */}
        <AnimatePresence>
          {showFeeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFeeModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[32px] md:rounded-[48px] w-full max-w-2xl shadow-2xl p-6 md:p-12 relative max-h-[90vh] overflow-y-auto z-10 border border-slate-100"
              >
                <button 
                  onClick={() => { setShowFeeModal(false); setFormError(""); }} 
                  className="absolute top-6 right-6 md:top-10 md:right-10 p-4 bg-slate-50 rounded-[20px] text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={24} />
                </button>
                
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-200">
                    <CreditCard size={32} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">New Payment</h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Beneficiary: {student.name}</p>
                  </div>
                </div>

                {student.payment_model === '2 + 1 System' && (
                  <div className="mb-8 grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setIsSecurityPayment(false)}
                      className={cn(
                        "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                        !isSecurityPayment 
                          ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                          : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <CreditCard size={14} />
                      Direct Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSecurityPayment(true)}
                      className={cn(
                        "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                        isSecurityPayment 
                          ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-100" 
                          : "bg-white text-slate-400 border-slate-100 hover:border-amber-200"
                      )}
                    >
                      <ShieldCheck size={14} />
                      Adjust from Security
                    </button>
                  </div>
                )}

                {formError && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-[24px] flex items-center gap-4 text-rose-600 text-sm font-bold shadow-sm"
                  >
                    <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle size={18} />
                    </div>
                    {formError}
                  </motion.div>
                )}

                <form onSubmit={handlePreVerify} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Current Obligation</label>
                      <div className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] font-black text-slate-600 flex items-center justify-between">
                        <span>{feeStats.nextPayableFee?.installment_name || feeStats.nextPayableFee?.month || 'Cleared'}</span>
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Payment Amount (₹)</label>
                      <div className="relative group">
                        <input 
                          required 
                          type="number" 
                          step="0.01" 
                          className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-black text-xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all group-hover:border-slate-200" 
                          value={feeForm.amount} 
                          onChange={e => setFeeForm({...feeForm, amount: e.target.value})} 
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black">INR</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Value Date</label>
                      <input required type="date" className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-black outline-none focus:border-indigo-600 transition-all" value={feeForm.actual_payment_date} onChange={e => setFeeForm({...feeForm, actual_payment_date: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Channel</label>
                      <select 
                        disabled={isSecurityPayment}
                        className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-black outline-none focus:border-indigo-600 transition-all appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400" 
                        value={isSecurityPayment ? 'Security' : feeForm.payment_method} 
                        onChange={e => setFeeForm({...feeForm, payment_method: e.target.value})}
                      >
                        {!isSecurityPayment && (
                          <>
                            <option>UPI</option>
                            <option>Cash</option>
                            <option>Bank Transfer</option>
                          </>
                        )}
                        {isSecurityPayment && <option>Security Deposit</option>}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Transaction Ref</label>
                      <input 
                        required={!isSecurityPayment && feeForm.payment_method !== 'Cash'} 
                        disabled={isSecurityPayment}
                        className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-black outline-none focus:border-indigo-600 transition-all disabled:bg-slate-50 disabled:text-slate-400" 
                        placeholder={isSecurityPayment ? "N/A (Security)" : "Enter ID"} 
                        value={isSecurityPayment ? "" : feeForm.transaction_id} 
                        onChange={e => setFeeForm({...feeForm, transaction_id: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Ref</label>
                      <input 
                        required={!isSecurityPayment && feeForm.payment_method !== 'Cash'} 
                        disabled={isSecurityPayment}
                        className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-black outline-none focus:border-indigo-600 transition-all disabled:bg-slate-50 disabled:text-slate-400" 
                        placeholder={isSecurityPayment ? "N/A (Security)" : "Re-enter ID"} 
                        value={isSecurityPayment ? "" : feeForm.reverify_transaction_id} 
                        onChange={e => setFeeForm({...feeForm, reverify_transaction_id: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Audit Remarks</label>
                    <textarea required className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-bold outline-none h-32 resize-none focus:border-indigo-600 transition-all" placeholder="Enter internal accounting notes..." value={feeForm.remarks} onChange={e => setFeeForm({...feeForm, remarks: e.target.value})} />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] hover:bg-black transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={24} className="text-emerald-400" />
                        <span>Authorize Transaction</span>
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal - Professional Redesign */}
        <AnimatePresence>
          {showConfirmPopup && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" 
              />
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-[48px] w-full max-w-md p-12 text-center shadow-2xl relative z-10 border border-white/20"
              >
                <div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-100">
                  <AlertTriangle size={48} />
                </div>
                <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Verify Payment</h4>
                <p className="text-slate-500 text-base font-bold mb-10 leading-relaxed">
                  Are you sure you want to record a payment of <span className="text-indigo-600 font-black text-xl block mt-2">₹{parseFloat(feeForm.amount).toLocaleString()}</span>?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowConfirmPopup(false)} className="py-5 bg-slate-50 text-slate-500 font-black rounded-[24px] hover:bg-slate-100 transition-colors">Abort</button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddFee()} 
                    disabled={saving} 
                    className="py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>Confirm</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settle Account Modal */}
        <AnimatePresence>
          {showSettleModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettleModal(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" 
              />
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-[48px] w-full max-w-md p-12 text-center shadow-2xl relative z-10 border border-white/20"
              >
                <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-100">
                  <ShieldCheck size={48} />
                </div>
                <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Account Settlement</h4>
                <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed">
                  Select the student's exit date to calculate pro-rata rent and adjust the advance balance.
                </p>
                
                <div className="mb-10 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">EXIT DATE</label>
                  <input 
                    type="date" 
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] font-black outline-none focus:border-indigo-600 transition-all" 
                    value={exitDate} 
                    onChange={e => setExitDate(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowSettleModal(false)} className="py-5 bg-slate-50 text-slate-500 font-black rounded-[24px] hover:bg-slate-100 transition-colors">Cancel</button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSettleAccount} 
                    disabled={settling} 
                    className="py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    {settling ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>Settle Now</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Adjust Advance Confirmation Modal */}
        <AnimatePresence>
          {showAdjustConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" 
              />
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-[48px] w-full max-w-md p-12 text-center shadow-2xl relative z-10 border border-white/20"
              >
                <div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-100">
                  <TrendingUp size={48} />
                </div>
                <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Adjust Advance</h4>
                <p className="text-slate-500 text-base font-bold mb-10 leading-relaxed">
                  Are you sure you want to adjust the advance payment? This will allocate the advance amount to upcoming unpaid months.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowAdjustConfirm(false)} className="py-5 bg-slate-50 text-slate-500 font-black rounded-[24px] hover:bg-slate-100 transition-colors">Abort</button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAdjustAdvance} 
                    disabled={adjusting} 
                    className="py-5 bg-amber-600 text-white font-black rounded-[24px] shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2"
                  >
                    {adjusting ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>Confirm</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mark as Exit Modal */}
        <AnimatePresence>
          {showExitModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowExitModal(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" 
              />
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-[48px] w-full max-w-md p-12 text-center shadow-2xl relative z-10 border border-white/20"
              >
                <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-rose-100">
                  <LogOut size={48} />
                </div>
                <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Final Exit Confirmation</h4>
                <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed">
                  Are you sure you want to mark <span className="text-rose-600 font-black">{student.name}</span> as inactive? This will vacate the room and finalize their record.
                </p>
                
                <div className="mb-10 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">EXIT REASON (OPTIONAL)</label>
                  <textarea 
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none h-24 resize-none focus:border-rose-500 transition-all" 
                    placeholder="Enter reason for exit..." 
                    value={exitReason} 
                    onChange={e => setExitReason(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowExitModal(false)} className="py-5 bg-slate-50 text-slate-500 font-black rounded-[24px] hover:bg-slate-100 transition-colors">Cancel</button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMarkExit} 
                    disabled={exiting} 
                    className="py-5 bg-rose-600 text-white font-black rounded-[24px] shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2"
                  >
                    {exiting ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>Confirm Exit</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* History Modal - Professional Redesign */}
        <AnimatePresence>
          {showHistoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistoryModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[32px] md:rounded-[48px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl relative z-10 border border-slate-100 flex flex-col"
              >
                <div className="p-6 md:p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-200">
                      <History size={32} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">Audit Trail</h2>
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Student: {student.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowHistoryModal(false)} className="p-4 bg-white rounded-[20px] text-slate-400 hover:text-slate-900 transition-colors shadow-sm border border-slate-100">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 md:p-12 overflow-y-auto flex-1 space-y-6 bg-white">
                  {existingFees.filter(f => f.status === 'paid' || f.status === 'partial').length > 0 ? (
                    existingFees.filter(f => f.status === 'paid' || f.status === 'partial').map((fee, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-500 group"
                      >
                        <div className="flex items-center gap-8">
                          <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                            <Receipt size={32} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{fee.installment_name || fee.month}</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">₹{parseFloat(fee.paid_amount).toLocaleString()}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">Ref: {fee.receipt_id}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(fee.payment_date || "").toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-4">
                          <div className={cn(
                            "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm inline-block",
                            fee.status === 'paid' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                          )}>
                            {fee.status === 'paid' ? 'Fully Settled' : 'Partially Settled'}
                          </div>
                          {fee.remarks && (
                            <div className="max-w-[200px]">
                              <p className="text-[11px] text-slate-400 italic font-medium leading-relaxed">"{fee.remarks}"</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto">
                        <FileText size={40} />
                      </div>
                      <p className="text-slate-400 font-black uppercase tracking-widest">No transaction history found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
