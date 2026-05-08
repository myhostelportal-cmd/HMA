'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { Receipt, Loader2, Plus, Save, X, DollarSign, Calendar, Tag } from 'lucide-react';

const WardenExpenses = () => {
  const searchParams = useSearchParams();
  const [hostelId, setHostelId] = useState<string | null>(searchParams.get('hostel'));
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Utilities'
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      if (!hostelId) {
        fetchHostel(user.id);
      } else {
        fetchExpenses(hostelId);
      }
    }
  }, [hostelId]);

  const fetchHostel = async (wId: number) => {
    try {
      const res = await api.get(`/hostels/warden/${wId}`);
      if (res.data.length > 0) {
        const hId = res.data[0].hostel_id;
        setHostelId(hId);
        fetchExpenses(hId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching hostel:', err);
      setLoading(false);
    }
  };

  const fetchExpenses = async (hId: string | number) => {
    try {
      const res = await api.get(`/hostels/${hId}/expenses`);
      setExpenses(res.data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/hostels/${hostelId}/expenses`, formData);
      alert('Expense recorded successfully!');
      setFormData({ description: '', amount: '', category: 'Utilities' });
      setShowAddForm(false);
      if (hostelId) fetchExpenses(hostelId);
    } catch (err) {
      alert('Error recording expense');
    } finally {
      setLoading(false);
    }
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="warden" />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Expense Tracker</h1>
            <p className="text-slate-500 mt-1 font-medium">Record and monitor operational costs for Hostel #{hostelId}</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            {showAddForm ? <X size={20} /> : <Plus size={20} />}
            {showAddForm ? 'Cancel' : 'Record New Expense'}
          </button>
        </header>

        {showAddForm && (
          <Card title="New Expense Entry" className="mb-8 max-w-2xl animate-in fade-in slide-in-from-top-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" placeholder="Description (e.g., Electricity Bill)" required 
                className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" 
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-500 transition-colors">₹</div>
                  <input 
                    type="number" placeholder="Amount" required 
                    className="w-full pl-8 pr-3 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" 
                    value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <select 
                  required 
                  className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" 
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Utilities">Utilities</option>
                  <option value="Staff Salary">Staff Salary</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Food/Groceries">Food/Groceries</option>
                  <option value="Miscellaneous">Other</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                Save Expense
              </button>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {expenses.map((expense) => (
            <Card key={expense.expense_id} className="group hover:border-red-200 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{expense.description}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Tag size={12} />
                        {expense.category}
                      </div>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Calendar size={12} />
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-red-600 tracking-tight">₹{parseFloat(expense.amount).toLocaleString()}</p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recorded by Warden</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {expenses.length === 0 && !showAddForm && (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Receipt size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No expenses recorded</p>
            <p className="text-slate-400 text-sm mt-1">Operational costs will appear here once added.</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    }>
      <WardenExpenses />
    </Suspense>
  );
}
