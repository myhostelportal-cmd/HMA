'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { 
  Users, 
  Building2, 
  UserCog, 
  GraduationCap, 
  TrendingUp, 
  Activity,
  Loader2,
  ArrowRight
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>({
    hostels: 0,
    owners: 0,
    wardens: 0,
    students: 0,
    logs: []
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchStats = async () => {
      try {
        const res = await api.get('hostels/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="admin" />
      
      <main className="flex-1 p-6 md:p-8 pt-24 md:pt-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
            <p className="text-slate-500 mt-1 font-medium">Welcome back, {user?.name || 'Super Admin'}! Here's what's happening today.</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <UserCog size={20} className="text-slate-600" />
            </div>
            <div className="pr-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Administrator</p>
              <p className="text-sm font-bold text-slate-900">{user?.name || 'Super Admin'}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Link href="/admin/hostels" className="block group">
            <Card className="relative overflow-hidden group-hover:shadow-xl group-hover:shadow-blue-600/10 group-active:scale-[0.98] transition-all duration-300 border-transparent hover:border-blue-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <Building2 size={64} className="text-blue-600" />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Hostels</p>
              <div className="flex items-end justify-between">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.hostels}</h2>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-2 text-slate-400 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg w-fit group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                {stats.hostels > 0 ? 'View All' : 'No data'}
              </div>
            </Card>
          </Link>

          <Link href="/admin/owners" className="block group">
            <Card className="relative overflow-hidden group-hover:shadow-xl group-hover:shadow-indigo-600/10 group-active:scale-[0.98] transition-all duration-300 border-transparent hover:border-indigo-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <UserCog size={64} className="text-indigo-600" />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Owners</p>
              <div className="flex items-end justify-between">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.owners}</h2>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-2 text-slate-400 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg w-fit group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                {stats.owners > 0 ? 'View All' : 'No data'}
              </div>
            </Card>
          </Link>

          <Link href="/admin/wardens" className="block group">
            <Card className="relative overflow-hidden group-hover:shadow-xl group-hover:shadow-violet-600/10 group-active:scale-[0.98] transition-all duration-300 border-transparent hover:border-violet-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <Users size={64} className="text-violet-600" />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Wardens</p>
              <div className="flex items-end justify-between">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.wardens}</h2>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-2 text-slate-400 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg w-fit group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                {stats.wardens > 0 ? 'View All' : 'No data'}
              </div>
            </Card>
          </Link>

          <Link href="/admin/students" className="block group">
            <Card className="relative overflow-hidden group-hover:shadow-xl group-hover:shadow-pink-600/10 group-active:scale-[0.98] transition-all duration-300 border-transparent hover:border-pink-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                <GraduationCap size={64} className="text-pink-600" />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Students</p>
              <div className="flex items-end justify-between">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.students}</h2>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-pink-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-2 text-slate-400 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg w-fit group-hover:bg-pink-50 group-hover:text-pink-600 transition-colors">
                {stats.students > 0 ? 'View All' : 'No data'}
              </div>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2" title="System Activity Logs" subtitle="Real-time audit of all system changes.">
            {stats.logs.length > 0 ? (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.logs.map((log: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        log.user_role === 'admin' ? "bg-blue-100 text-blue-600" : 
                        log.user_role === 'warden' ? "bg-indigo-100 text-indigo-600" : "bg-violet-100 text-violet-600"
                      )}>
                        <Activity size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{log.action}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{log.user_role}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Activity size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No activity recorded yet</p>
                <p className="text-slate-400 text-sm mt-1">Actions performed by users will appear here.</p>
              </div>
            )}
          </Card>

          <Card title="Quick Stats" subtitle="Current system distribution.">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                  <span>Occupancy Rate</span>
                  <span>0%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                  <span>Fee Collection</span>
                  <span>0%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">
                  <span>Complaints Resolved</span>
                  <span>0%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
