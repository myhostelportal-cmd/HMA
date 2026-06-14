'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  UserCog, 
  GraduationCap, 
  Receipt, 
  CreditCard, 
  MessageSquare, 
  BarChart3, 
  UserPlus, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CalendarCheck,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: 'admin' | 'owner' | 'warden';
  hostelName?: string;
}

const menuItems = {
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Management', icon: UserPlus, href: '/admin/management' },
    { label: 'Admins', icon: ShieldCheck, href: '/admin/admins' },
    { label: 'Hostels', icon: Building2, href: '/admin/hostels' },
    { label: 'Owners', icon: UserCog, href: '/admin/owners' },
    { label: 'Wardens', icon: Users, href: '/admin/wardens' },
    { label: 'All Students', icon: GraduationCap, href: '/admin/students' },
    { label: 'Fee Reports', icon: BarChart3, href: '/admin/reports/fees' },
    { label: 'System Logs', icon: Receipt, href: '/admin/logs' },
  ],
  warden: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/warden' },
    { label: 'Attendance', icon: CalendarCheck, href: '/warden/attendance' },
    { label: 'Students', icon: GraduationCap, href: '/warden/students' },
    { label: 'Rooms', icon: Building2, href: '/warden/rooms' },
    { label: 'Fees', icon: CreditCard, href: '/warden/fees' },
    { label: 'Expenses', icon: Receipt, href: '/warden/expenses' },
    { label: 'WhatsApp Integration', icon: MessageCircle, href: '/warden/whatsapp' },
  ],
  owner: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/owner' },
    { label: 'Financials', icon: BarChart3, href: '/owner/finance' },
    { label: 'Fee Reports', icon: CreditCard, href: '/owner/reports/fees' },
    { label: 'Occupancy', icon: Building2, href: '/owner/occupancy' },
    { label: 'Wardens', icon: Users, href: '/owner/wardens' },
    { label: 'Students', icon: GraduationCap, href: '/owner/students' },
  ]
};

const Sidebar = ({ role, hostelName: initialHostelName }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hostelName, setHostelName] = useState(initialHostelName || '');
  const pathname = usePathname();
  const router = useRouter();
  const items = menuItems[role] || [];

  useEffect(() => {
    if (initialHostelName) {
      setHostelName(initialHostelName);
    } else if (role === 'warden') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        api.get(`/hostels/warden/${user.id}`).then(res => {
          if (res.data.length > 0) {
            setHostelName(res.data[0].hostel_name);
          }
        }).catch(err => console.error('Error fetching hostel name for sidebar:', err));
      }
    }
  }, [role, initialHostelName]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header Bar - Fixed at top to prevent overlapping content during scroll */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 z-[70] flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center group/toggle"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} className="group-hover/toggle:scale-110 transition-transform" />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
              <img src="/images/My Hostel.logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight leading-none text-slate-900">{hostelName || 'My Hostel'}</span>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Management Portal</span>
            </div>
          </div>
        </div>
        
        {/* Small subtle indicator of the active portal */}
        <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role}</span>
        </div>
      </div>

      {/* Backdrop for Mobile */}
      <div 
        className={cn(
          "lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[60] transition-all duration-500",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
      />

      {/* Sidebar Container */}
      <aside className={cn(
        "flex flex-col w-72 h-screen bg-slate-900 text-white border-r border-slate-800/50 fixed lg:sticky top-0 z-[65] shrink-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 shadow-2xl lg:shadow-none"
      )}>
        {/* Sidebar Header */}
        <div className="p-8 flex items-center gap-4 shrink-0 relative overflow-hidden group/header">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover/header:bg-blue-600/20 transition-colors duration-700" />
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden group-hover/header:scale-110 transition-transform duration-500 relative z-10">
            <img src="/images/My Hostel.logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="font-black text-xl tracking-tight leading-none text-white">{hostelName || 'My Hostel'}</span>
            {!hostelName && <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 group-hover/header:text-blue-400 transition-colors">Premium SaaS</span>}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white hover:translate-x-1"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 -z-10"
                  />
                )}
                <item.icon size={20} className={cn(
                  "transition-all duration-300",
                  isActive ? "text-white scale-110" : "text-slate-400 group-hover:text-white group-hover:scale-110"
                )} />
                <span className={cn(
                  "font-bold text-sm tracking-wide transition-colors duration-300",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 mt-auto border-t border-slate-800/50 relative z-10 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl bg-slate-800/30 border border-slate-800/50 group/user">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-black text-blue-500 shadow-inner group-hover/user:bg-blue-600 group-hover/user:text-white transition-all duration-500">
              {role.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-black text-white truncate uppercase tracking-wider">{role} Portal</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Session</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300 group/logout"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center group-hover/logout:bg-rose-500 transition-all duration-300">
              <LogOut size={18} className="group-hover/logout:rotate-12 transition-transform duration-300 group-hover/logout:text-white" />
            </div>
            <span className="font-bold text-sm tracking-wide">Secure Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
