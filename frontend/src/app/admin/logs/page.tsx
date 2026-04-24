'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { Activity, Loader2, Clock, Search, Filter, X, Calendar, ArrowUpDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionType) params.append('actionType', actionType);
      if (moduleFilter) params.append('module', moduleFilter);
      if (roleFilter) params.append('role', roleFilter);
      if (dateRange) params.append('dateRange', dateRange);
      if (dateRange === 'custom' && customDates.start && customDates.end) {
        params.append('startDate', customDates.start);
        params.append('endDate', customDates.end);
      }
      params.append('sort', sort);

      const res = await api.get(`hostels/logs?${params.toString()}`);
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, actionType, moduleFilter, roleFilter, dateRange, customDates, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const clearFilters = () => {
    setSearch('');
    setActionType('');
    setModuleFilter('');
    setRoleFilter('');
    setDateRange('');
    setCustomDates({ start: '', end: '' });
    setSort('newest');
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="admin" />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Logs</h1>
            <p className="text-slate-500 mt-1 font-medium">Real-time audit of all administrative and system actions.</p>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all border shadow-sm",
              showFilters ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Filter size={18} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </header>

        {/* Search and Filters Bar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search by student, warden, hostel name or action..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  className="pl-11 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm appearance-none min-w-[160px]"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Action Type</label>
                <div className="relative">
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                  >
                    <option value="">All Actions</option>
                    <option value="Created">Created</option>
                    <option value="Updated">Updated</option>
                    <option value="Deleted">Deleted</option>
                    <option value="Added">Added</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Removed">Removed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Module</label>
                <div className="relative">
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none"
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                  >
                    <option value="">All Modules</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                    <option value="warden">Warden</option>
                    <option value="hostel">Hostel</option>
                    <option value="room">Room</option>
                    <option value="student">Student</option>
                    <option value="fees">Fees</option>
                    <option value="complaint">Complaints</option>
                    <option value="expense">Expenses</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">User Role</label>
                <div className="relative">
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                    <option value="warden">Warden</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date Range</label>
                <div className="relative">
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7days">Last 7 Days</option>
                    <option value="last30days">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              {dateRange === 'custom' && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                    <input 
                      type="date" 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={customDates.start}
                      onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                    <input 
                      type="date" 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={customDates.end}
                      onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                <button 
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  <X size={16} />
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-slate-500 font-bold animate-pulse">Filtering logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Activity size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No logs found matching your criteria</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search terms.</p>
            <button 
              onClick={clearFilters}
              className="mt-6 text-blue-600 font-bold hover:underline"
            >
              Reset all filters
            </button>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log, i) => (
              <Card key={i} className="hover:border-blue-200 transition-all duration-300 group hover:shadow-lg hover:shadow-blue-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 shrink-0",
                      log.user_role === 'admin' ? "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" : 
                      log.user_role === 'warden' ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : 
                      "bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"
                    )}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{log.action}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                          log.user_role === 'admin' ? "bg-blue-50 text-blue-600" : 
                          log.user_role === 'warden' ? "bg-indigo-50 text-indigo-600" : 
                          "bg-violet-50 text-violet-600"
                        )}>
                          {log.user_role} #{log.user_id}
                        </span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">
                          {log.module}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors duration-300 self-start sm:self-center">
                    <Clock size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()}, {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLogs;
