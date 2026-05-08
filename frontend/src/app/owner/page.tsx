'use client';

import React, { useState, useEffect } from 'react';
import { useHostel } from '@/context/HostelContext';
import HostelSelector from '@/components/layout/HostelSelector';
import api from '@/lib/api';
import { 
  Loader2,
  TrendingUp,
  Receipt,
  Users,
  User,
  Activity,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Download,
  FileText,
  PieChart,
  DoorOpen,
  LayoutGrid,
  ShieldCheck,
  CheckCircle,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const OwnerDashboard = () => {
  const { selectedHostel } = useHostel();
  const [data, setData] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const StatCard = ({ icon: Icon, title, value, subValue, unit, progress: _progress, color = "text-[#6366f1]" }: any) => {
    const accentMatch = String(color).match(/#[0-9A-Fa-f]{3,8}\b/i);
    const cardAccent = accentMatch ? accentMatch[0] : '#6366f1';

    return (
      <div
        className="group bg-white border border-slate-200/60 p-6 lg:p-8 rounded-[2rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col items-start gap-6 h-full transition-all duration-300 ease-out hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
        style={{ '--card-accent': cardAccent } as React.CSSProperties}
      >
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-slate-600 transition-all duration-300 ease-out group-hover:scale-[1.03] group-hover:bg-white group-hover:shadow-lg group-hover:text-[color:var(--card-accent)]">
          <Icon size={24} strokeWidth={2} aria-hidden />
        </div>

        <div className="space-y-2 w-full overflow-hidden">
          <h4 className={cn("font-black text-[10px] uppercase tracking-[0.15em] truncate", color)}>{title}</h4>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className={cn(
              "font-black text-[#1E293B] tracking-tight break-all leading-none transition-colors duration-300",
              value?.toString().length > 10 ? "text-xl" : "text-2xl lg:text-3xl"
            )}>
              {value}
            </span>
            {subValue && (
              <span className="text-lg lg:text-xl font-bold text-[#94A3B8]">
                / {subValue}
                {unit && <span className="ml-1.5 uppercase text-[0.7em]">{unit}</span>}
              </span>
            )}
          </div>
        </div>

        <div className="w-full space-y-3 pt-2 mt-auto">
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span className="text-[9px] font-black uppercase tracking-widest">Performance</span>
            <ArrowUpRight
              size={14}
              className="flex-shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
            <div
              className="h-full rounded-full w-0 transition-all duration-700 ease-in-out group-hover:w-full"
              style={{ backgroundColor: cardAccent }}
            />
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, trendRes] = await Promise.all([
          api.get(`/owner/stats?hostel_id=${selectedHostel}`),
          api.get(`/owner/analytics/revenue?hostel_id=${selectedHostel}`)
        ]);
        
        setData(statsRes.data);
        setRevenueTrend(trendRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedHostel]);

  const chartData = React.useMemo(() => ({
    labels: (revenueTrend || []).map(d => d.day),
    datasets: [
      {
        label: 'Collection',
        data: (revenueTrend || []).map(d => d.total),
        borderColor: '#4F46E5',
        borderWidth: 3,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(79, 70, 229, 0)');
          gradient.addColorStop(1, 'rgba(79, 70, 229, 0.15)');
          return gradient;
        },
        tension: 0.45,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 20,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ],
  }), [revenueTrend]);

  const chartOptions = React.useMemo(() => ({
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        titleFont: { size: 12, weight: 'bold' as const, family: 'Inter' },
        bodyFont: { size: 13, family: 'Inter' },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `₹${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#F1F5F9',
          drawBorder: false,
        },
        ticks: {
          font: { size: 10, weight: 'bold' as const },
          color: '#94A3B8',
          callback: (value: any) => '₹' + value.toLocaleString(),
          maxTicksLimit: 5,
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10, weight: 'bold' as const },
          color: '#94A3B8',
          padding: 10,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), []);

  if (loading && !data) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* TOP HEADER */}
      <header className="px-4 md:px-8 py-4 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-20 gap-4 bg-[#FDFDFF]/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Welcome, {user?.name || 'Captain'}</h1>
          <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Portfolio Insights & Decision Engine</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <HostelSelector />
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            {user?.name?.charAt(0) || 'C'}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20 space-y-10 mt-8">
        {/* MONTHLY COLLECTION PROGRESS (REDESIGNED) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Portfolio Performance</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            <StatCard 
              icon={Home}
              title="Total Hostels"
              value={data?.totalHostels}
              color="text-indigo-600"
            />
            <StatCard 
              icon={PieChart} 
              title="Collection Status" 
              value={`${((data?.collectionProgress?.collected / (data?.collectionProgress?.shouldCollect || 1)) * 100).toFixed(1)}%`}
              progress={Math.round((data?.collectionProgress?.collected / (data?.collectionProgress?.shouldCollect || 1)) * 100) || 0}
              color="text-[#10B981]"
            />
            <StatCard 
              icon={Calendar} 
              title="Total Dues" 
              value={`₹${(data?.collectionProgress?.shouldCollect || 0).toLocaleString()}`}
              progress={100}
              color="text-[#4F46E5]"
            />
            <StatCard 
              icon={CheckCircle2} 
              title="Money Collected" 
              value={`₹${(data?.collectionProgress?.collected || 0).toLocaleString()}`}
              progress={Math.round((data?.collectionProgress?.collected / (data?.collectionProgress?.shouldCollect || 1)) * 100) || 0}
              color="text-[#059669]"
            />
            <StatCard 
              icon={AlertCircle} 
              title="Money Pending" 
              value={`₹${(data?.collectionProgress?.remaining || 0).toLocaleString()}`}
              progress={Math.round((data?.collectionProgress?.remaining / (data?.collectionProgress?.shouldCollect || 1)) * 100) || 0}
              color="text-[#DC2626]"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          {/* LEFT COLUMN: SUMMARY & TREND */}
          <div className="lg:col-span-8 space-y-10">
            {/* MONTHLY SUMMARY */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Financial Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <StatCard 
                  icon={Wallet} 
                  title="Total Income" 
                  value={`₹${(data?.summary?.totalIncome || 0).toLocaleString()}`}
                  progress={100}
                  color="text-[#1E293B]"
                />
                <StatCard 
                  icon={Receipt} 
                  title="Total Expense" 
                  value={`₹${(data?.summary?.totalExpense || 0).toLocaleString()}`}
                  progress={Math.round(((data?.summary?.totalExpense || 0) / (data?.summary?.totalIncome || 1)) * 100)}
                  color="text-[#64748B]"
                />
                <StatCard 
                  icon={TrendingUp} 
                  title="Your Net Profit" 
                  value={`₹${(data?.summary?.netProfit || 0).toLocaleString()}`}
                  progress={Math.round(((data?.summary?.netProfit || 0) / (data?.summary?.totalIncome || 1)) * 100)}
                  color="text-[#10B981]"
                />
              </div>
            </section>

            {/* DAILY COLLECTION TREND */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Collective Collection Analytics</h3>
              <div className="bg-white border border-slate-200/60 p-6 md:p-10 rounded-[2.5rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] h-[300px] md:h-[400px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden">
                <Line 
                  data={chartData} 
                  options={chartOptions} 
                />
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: PENDING & ADVANCE */}
          <div className="lg:col-span-4 space-y-10">
            {/* PENDING SUMMARY TABLE (REDESIGNED) */}
            <section className="bg-white border border-slate-200/60 p-6 md:p-8 rounded-[2.5rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0 border border-red-100">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight truncate max-w-[150px] md:max-w-none">₹{data?.pending?.total?.toLocaleString() || '0'} Outstanding</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Payment Review</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Delinquent Residents</p>
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100/50">
                          <th className="px-4 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                          <th className="px-4 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                          <th className="px-4 py-4 text-[8px] font-black text-red-600 uppercase tracking-widest text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data?.pending?.delinquents?.map((student: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white transition-all">
                            <td className="px-4 py-4 text-[10px] font-bold text-slate-700 truncate max-w-[80px]">{student.name}</td>
                            <td className="px-4 py-4 text-[9px] font-bold text-slate-400 uppercase">
                              {student.hostel_name?.substring(0, 8)}.. • {student.room_no}
                            </td>
                            <td className="px-4 py-4 text-[10px] font-black text-red-600 text-right whitespace-nowrap">
                              ₹{parseFloat(student.pending_amount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* ADVANCE PAYMENT DATA (REDESIGNED) */}
            <section className="bg-white border border-slate-200/60 p-6 md:p-8 rounded-[2.5rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] space-y-8">
              <div className="text-center space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Security Reserves</h3>
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100/50">
                  <Wallet size={28} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Collected</p>
                    <p className="text-sm font-black text-slate-900">₹{data?.advance?.totalCollected?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/50">
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Remaining Active</p>
                    <p className="text-sm font-black text-emerald-900">₹{data?.advance?.remainingAdvance?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-full border border-indigo-100 uppercase tracking-tighter">
                  <ShieldCheck size={14} /> Deposit Pool Verified
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* REPORTS & EXPORTS */}
        <section className="space-y-6 pt-10 border-t border-slate-50">
          <h3 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1">Exports & Governance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { label: 'Revenue Report', desc: 'Portfolio Transaction PDF', icon: Download, bg: 'bg-indigo-50/50', iconColor: 'text-indigo-600' },
              { label: 'Fee Matrix', desc: 'Resident Status Export', icon: FileText, bg: 'bg-emerald-50/50', iconColor: 'text-emerald-600' },
              { label: 'Cost Analysis', desc: 'Operating Expense Summary', icon: PieChart, bg: 'bg-amber-50/50', iconColor: 'text-amber-600' },
              { label: 'Intelligence', desc: 'Portfolio Forecasts', icon: Activity, bg: 'bg-rose-50/50', iconColor: 'text-rose-600' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex items-center gap-5 group cursor-pointer hover:border-indigo-100 hover:shadow-[0_20px_50px_rgb(0,0,0,0.04)] transition-all duration-500">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110", item.bg, item.iconColor)}>
                  <item.icon size={24} />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-black text-[#1E293B] tracking-tight group-hover:text-indigo-600 transition-all truncate">{item.label}</h4>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mt-0.5 truncate">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default OwnerDashboard;