'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import { 
  MessageSquare, 
  RefreshCcw, 
  Power, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ShieldCheck,
  Smartphone,
  ScanLine,
  Info,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WhatsAppManagement = () => {
  const [status, setStatus] = useState<{ isReady: boolean; qr: string | null; info?: any }>({ 
    isReady: false, 
    qr: null 
  });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    try {
      const res = await api.get('/hostels/whatsapp/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 5 seconds for real-time updates
    const interval = setInterval(() => fetchStatus(), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp? You will need to scan a new QR code to re-enable automated reminders.')) {
      return;
    }
    setDisconnecting(true);
    try {
      await api.post('/hostels/whatsapp/disconnect');
      await fetchStatus();
    } catch (err) {
      alert('Error disconnecting WhatsApp');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar role="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing WhatsApp Service...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar role="admin" />
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100/50">
                <MessageSquare size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">WhatsApp <span className="text-emerald-600">Central</span></h1>
            </div>
            <p className="text-slate-500 font-medium text-lg">Manage your automated hostel communication hub.</p>
          </div>
          <button 
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 rounded-2xl border border-slate-200 font-bold hover:bg-slate-50 transition-all hover:shadow-lg disabled:opacity-50"
          >
            <RefreshCcw size={18} className={cn("transition-transform", refreshing && "animate-spin")} />
            Refresh Status
          </button>
        </header>

        <div className="max-w-4xl">
          <AnimatePresence mode="wait">
            {status.isReady ? (
              <motion.div 
                key="connected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Connection Success Card */}
                <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-emerald-100/20 border border-emerald-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                  
                  <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center relative">
                      <CheckCircle2 size={64} strokeWidth={2.5} />
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                        <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100 mb-2">
                          Status: Active & Secure
                        </div>
                        <h2 className="text-3xl font-black text-slate-900">Successfully Connected</h2>
                        <p className="text-slate-500 font-medium text-lg">Your WhatsApp Business account is now powering automated reminders.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Push Name</p>
                          <p className="font-bold text-slate-800">{status.info?.pushname || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                          <p className="font-bold text-slate-800">{status.info?.wid?.user || 'Connected'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Management Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-start gap-6">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                      <ShieldCheck size={28} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-black text-slate-900">Security Hub</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">Your connection is end-to-end encrypted. No messages are stored on our servers.</p>
                    </div>
                  </div>

                  <div className="bg-rose-50/30 p-8 rounded-[2.5rem] border border-rose-100 flex items-start gap-6 group hover:bg-rose-50 transition-colors">
                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-all">
                      <Power size={28} />
                    </div>
                    <div className="space-y-4 flex-1">
                      <div className="space-y-1">
                        <h3 className="font-black text-slate-900">Terminate Connection</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">Disconnect this device to stop all automated messaging.</p>
                      </div>
                      <button 
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                      >
                        {disconnecting ? 'Disconnecting...' : 'Disconnect Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="disconnected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-8"
              >
                {/* QR Scanner Card */}
                <div className="lg:col-span-3 bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 text-center space-y-8 relative overflow-hidden">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900">Scan QR Code</h2>
                    <p className="text-slate-500 font-medium">Link your device to start using automated WhatsApp features.</p>
                  </div>

                  <div className="max-w-[320px] mx-auto p-6 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 aspect-square flex items-center justify-center relative">
                    <AnimatePresence mode="wait">
                      {status.qr ? (
                        <motion.div
                          key="qr-code"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full h-full relative"
                        >
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(status.qr)}&size=400x400`}
                            alt="WhatsApp QR Code"
                            className="w-full h-full rounded-2xl shadow-2xl border-4 border-white"
                          />
                          <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-2xl animate-pulse" />
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="loading-qr"
                          className="flex flex-col items-center gap-4 text-slate-400"
                        >
                          <Loader2 className="animate-spin" size={64} strokeWidth={1.5} />
                          <p className="font-black text-xs uppercase tracking-[0.2em]">Generating Secure QR...</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 py-2 px-4 rounded-full mx-auto w-fit border border-amber-100">
                    <AlertCircle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">QR Code refreshes every 60 seconds</span>
                  </div>
                </div>

                {/* Instructions Card */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                      <ScanLine className="text-blue-600" />
                      How to connect
                    </h3>
                    
                    <div className="space-y-4">
                      {[
                        { icon: Smartphone, text: 'Open WhatsApp on your phone' },
                        { icon: Menu, text: 'Tap Menu or Settings and select Linked Devices' },
                        { icon: ScanLine, text: 'Point your phone at this screen to scan the code' },
                      ].map((step, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-black shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-sm font-bold text-slate-600 leading-snug">{step.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                        <Info size={20} />
                        <h4 className="font-black uppercase tracking-widest text-xs">Pro Tip</h4>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-indigo-100">
                        Using a **WhatsApp Business** account is recommended for professional communication and higher delivery rates.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppManagement;