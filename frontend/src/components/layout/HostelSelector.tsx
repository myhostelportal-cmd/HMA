'use client';

import React from 'react';
import { useHostel } from '@/context/HostelContext';
import { Building2, ChevronDown } from 'lucide-react';

const HostelSelector = () => {
  const { selectedHostel, setSelectedHostel, hostels, loading } = useHostel();

  if (loading) return null;

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl hover:border-indigo-200 hover:bg-white transition-all cursor-pointer">
        <Building2 size={18} className="text-slate-400 group-hover:text-indigo-600" />
        <select
          value={selectedHostel}
          onChange={(e) => setSelectedHostel(e.target.value)}
          className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer pr-6 appearance-none"
        >
          <option value="all">All Hostels</option>
          {hostels.map((hostel) => (
            <option key={hostel.hostel_id} value={hostel.hostel_id.toString()}>
              {hostel.hostel_name}
            </option>
          ))}
        </select>
        <div className="absolute right-3 pointer-events-none">
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
};

export default HostelSelector;