"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, CheckCircle2, AlertCircle, Loader2, FileText, Smartphone, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { downloadReceipt, StudentProfile, FeeRecord, FeeStats } from "@/utils/receiptGenerator";

export default function PublicReceiptPage() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await api.get(`/finance/public/receipt/${token}`);
        setData(response.data);
      } catch (err: any) {
        console.error("Receipt fetch failed", err);
        setError(err.response?.data?.error || "Invalid or expired receipt link.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchReceipt();
  }, [token]);

  const handleDownload = () => {
    if (!data) return;

    // Transform flat public data into the structure expected by generator
    const student: StudentProfile = {
      student_id: data.student_id || 0, 
      name: data.student_name,
      phone: data.phone || "N/A",
      room_number: data.room_number || "—",
      hostel_name: data.hostel_name,
      hostel_address: data.hostel_address || "Professional Hostel Solutions", 
      hostel_contact: data.hostel_contact || "N/A",
      status: "active",
      hostel_id: 0,
      payment_model: data.payment_model || "N/A",
      monthly_fee: parseFloat(data.monthly_fee || "0"),
      total_session_fees: parseFloat(data.total_session_fees || "0"),
      security_deposit: parseFloat(data.security_deposit || "0"),
      joining_date: data.joining_date || data.payment_date,
    };

    const fee: FeeRecord = {
      fee_id: 0,
      student_id: data.student_id || 0,
      hostel_id: 0,
      amount: data.paid_amount,
      paid_amount: data.paid_amount,
      adjustment_amount: "0",
      due_date: data.payment_date,
      status: 'paid',
      fee_type: 'monthly',
      installment_name: data.installment_name,
      month: data.month,
      period_start: data.payment_date,
      receipt_id: data.receipt_id,
      transaction_id: data.transaction_id,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      remarks: data.remarks
    };

    const stats: FeeStats = {
      totalPaid: data.stats?.totalPaid || parseFloat(data.paid_amount),
      totalDue: data.stats?.totalDue || 0,
      overcreditedAmount: data.stats?.overcreditedAmount || 0
    };

    downloadReceipt(student, fee, stats, 'student');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Fetching your secure receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 mb-8">{error}</p>
          <div className="text-sm text-slate-400">
            If you think this is a mistake, please contact your hostel warden.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden">
            <img src="/images/My Hostel.logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">My Hostel</span>
        </div>
        <p className="text-slate-500 text-sm font-medium">Secure Document Access</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl shadow-slate-200 p-8 max-w-lg w-full border border-slate-100 relative overflow-hidden"
      >
        {/* Success Decoration */}
        <div className="absolute top-0 right-0 p-4">
          <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-100">
            <CheckCircle2 size={12} /> Verified
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner">
            <FileText size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Fee Receipt Ready</h2>
          <p className="text-slate-500 text-sm italic">Payment for {data.installment_name || data.month}</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <span className="text-slate-500 text-sm">Student Name</span>
            <span className="text-slate-900 font-bold">{data.student_name}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <span className="text-slate-500 text-sm">Hostel</span>
            <span className="text-slate-900 font-semibold">{data.hostel_name}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <span className="text-slate-500 text-sm">Amount Paid</span>
            <span className="text-2xl font-black text-indigo-600">₹{parseFloat(data.paid_amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-sm">Payment Date</span>
            <span className="text-slate-700 font-medium">{new Date(data.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="space-y-4">
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
          >
            <Download size={20} />
            Download PDF Receipt
          </motion.button>
          
          <div className="text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck size={12} /> Encrypted & Secure Connection
            </p>
          </div>
        </div>
      </motion.div>

      {/* Help Footer */}
      <div className="mt-12 text-center text-slate-400 text-sm">
        <p>Need help? Reach out on WhatsApp</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
            <Smartphone size={14} /> Support
          </div>
        </div>
      </div>
    </div>
  );
}
