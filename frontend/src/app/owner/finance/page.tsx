'use client';

import React, { useState, useEffect } from 'react';
import { useHostel } from '@/context/HostelContext';
import HostelSelector from '@/components/layout/HostelSelector';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Wallet,
  Receipt,
  CheckCircle2,
  User,
  Activity,
  ArrowUpRight,
  Filter,
  Calendar,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const FinancePage = () => {
  const { selectedHostel, hostels } = useHostel();
  const [summary, setSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    hostel_id: '',
    category: 'Electricity',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, expensesRes] = await Promise.all([
        api.get(`/owner/finance/summary?hostel_id=${selectedHostel}`),
        api.get(`/owner/expenses?hostel_id=${selectedHostel}`)
      ]);
      setSummary(summaryRes.data);
      setExpenses(expensesRes.data);
    } catch (err) {
      console.error('Error fetching finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedHostel]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/owner/expenses', formData);
      setShowAddExpense(false);
      setFormData({
        hostel_id: '',
        category: 'Electricity',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err) {
      console.error('Error adding expense:', err);
      alert('Failed to add expense');
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const doughnutData = {
    labels: summary?.split?.map((s: any) => s.hostel_name) || [],
    datasets: [{
      data: summary?.split?.map((s: any) => s.income) || [],
      backgroundColor: ['#EEF2FF', '#F0FDF4', '#FFFBEB', '#FDF2F8', '#F8FAFC'],
      borderColor: ['#4F46E5', '#10B981', '#F59E0B', '#DB2777', '#94A3B8'],
      borderWidth: 1,
    }]
  };

  const barData = {
    labels: summary?.split?.map((s: any) => s.hostel_name) || [],
    datasets: [
      {
        label: 'Income',
        data: summary?.split?.map((s: any) => s.income) || [],
        backgroundColor: '#4F46E5',
        borderRadius: 8,
      }
    ]
  };

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="px-4 md:px-8 py-4 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 gap-4 bg-[#FDFDFF]/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Financial Overview</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Detailed P&L and Expense Tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <HostelSelector />
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            {user?.name?.charAt(0) || 'C'}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20 space-y-10 mt-8">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Total Income', value: summary?.income, icon: TrendingUp, color: 'text-[#065F46]', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
            { label: 'Total Expense', value: summary?.expenses, icon: TrendingDown, color: 'text-[#991B1B]', bg: 'bg-red-50/50', border: 'border-red-100' },
            { label: 'Money Pending', value: summary?.pending, icon: Receipt, color: 'text-[#92400E]', bg: 'bg-amber-50/50', border: 'border-amber-100' },
            { label: 'Your Net Profit', value: summary?.profit, icon: Wallet, color: 'text-[#3730A3]', bg: 'bg-indigo-50/50', border: 'border-indigo-100' },
          ].map((card, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              className={cn("p-8 rounded-[2rem] border shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all", card.bg, card.border)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
              <p className={cn("text-2xl font-black", card.color)}>₹{card.value?.toLocaleString() || '0'}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          {/* INCOME SPLIT CHART */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3 mb-8">
              <Activity className="text-indigo-600" size={18} />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Revenue Split</h2>
            </div>
            <div className="h-[300px] flex items-center justify-center">
              <Doughnut 
                data={doughnutData} 
                options={{ 
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { position: 'bottom', labels: { font: { size: 10, weight: 'bold' }, usePointStyle: true, padding: 25 } } 
                  } 
                }} 
              />
            </div>
          </motion.div>

          {/* INCOME BAR CHART */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="text-indigo-600" size={18} />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Hostel Performance</h2>
            </div>
            <div className="h-[300px]">
              <Bar 
                data={barData} 
                options={{ 
                  maintainAspectRatio: false, 
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
                  }
                }} 
              />
            </div>
          </motion.div>
        </div>

        {/* EXPENSES LIST */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="text-indigo-600" size={18} />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Expenses</h2>
            </div>
            <button 
              onClick={() => setShowAddExpense(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              Log Expense
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-8 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Hostel</th>
                  <th className="px-8 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-all group">
                    <td className="px-8 py-4 text-[10px] font-bold text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-8 py-4">
                      <span className="text-[11px] font-black text-slate-900 block">{exp.category}</span>
                      <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{exp.description}</p>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <Home size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-600">{exp.hostel_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="text-[11px] font-black text-red-600">₹{parseFloat(exp.amount || '0').toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No expenses recorded yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* ADD EXPENSE MODAL */}
      <AnimatePresence>
        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddExpense(false)}
              className="absolute inset-0 bg-[#1E293B]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[#F1F5F9] flex items-center justify-between">
                <h2 className="text-lg font-black text-[#1E293B] tracking-tight">Log Expense</h2>
                <button onClick={() => setShowAddExpense(false)} className="text-[#94A3B8] hover:text-[#DC2626] transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Select Hostel</label>
                  <select 
                    required
                    value={formData.hostel_id}
                    onChange={(e) => setFormData({...formData, hostel_id: e.target.value})}
                    className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all appearance-none"
                  >
                    <option value="">Select a hostel</option>
                    {hostels.map(h => (
                      <option key={h.hostel_id} value={h.hostel_id}>{h.hostel_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all appearance-none"
                    >
                      <option value="Electricity">Electricity</option>
                      <option value="Food">Food</option>
                      <option value="Water">Water</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Internet">Internet</option>
                      <option value="Staff Salary">Staff Salary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Amount (₹)</label>
                    <input 
                      required
                      type="number"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Date</label>
                  <input 
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Short detail..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-[#4F46E5] focus:bg-white transition-all resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Confirm Entry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancePage;
