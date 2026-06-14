'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Power, 
  Loader2,
  Smartphone,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

// Get backend base URL (remove /api/ suffix
const getBackendBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hma-backend-et8f.onrender.com/api/';
  return apiUrl.endsWith('/api/') ? apiUrl.slice(0, -5) : apiUrl;
};

const WhatsAppIntegrationPage = () => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/warden/whatsapp/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll for status updates every 2 seconds
    const interval = setInterval(fetchStatus, 2000);
    setPollingInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await api.post('/warden/whatsapp/connect');
      // Status will be updated via polling
    } catch (err) {
      console.error('Error connecting WhatsApp:', err);
      alert('Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.post('/warden/whatsapp/disconnect');
      setShowConfirm(false);
      await fetchStatus();
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      alert('Failed to disconnect WhatsApp');
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = status?.status === 'connected';
  const isQrPending = status?.status === 'qr_pending';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="warden" />
      
      <main className="flex-1 p-6 lg:p-10 pt-28 lg:pt-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">WhatsApp Integration</h1>
                <p className="text-slate-500 font-medium mt-1">Connect your WhatsApp account to send automated reminders</p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-bold">Checking connection status...</p>
              </motion.div>
            ) : isConnected ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
              >
                {/* Success Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-10">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <CheckCircle2 size={40} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black text-white mb-1">WhatsApp Connected Successfully!</h2>
                      <p className="text-green-100 font-medium">Your account is linked and ready to send messages</p>
                    </div>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <Smartphone size={20} className="text-green-600" />
                        </div>
                        <h3 className="font-bold text-slate-700">Connected Number</h3>
                      </div>
                      <p className="text-2xl font-black text-slate-900">{status.connected_phone || 'N/A'}</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Clock size={20} className="text-blue-600" />
                        </div>
                        <h3 className="font-bold text-slate-700">Last Connected</h3>
                      </div>
                      <p className="text-lg font-black text-slate-900">
                        {status.last_connected 
                          ? new Date(status.last_connected).toLocaleString() 
                          : 'Just now'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3 mb-8 p-4 bg-green-50 rounded-2xl border border-green-200">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-bold text-green-700">Status: Connected & Active</span>
                  </div>

                  {/* Disconnect Button */}
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={disconnecting}
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-rose-50 text-rose-600 font-black rounded-2xl border-2 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disconnecting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Power size={20} />
                        Disconnect WhatsApp
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
              >
                {/* Disconnected Header */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-8 py-10">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                      <XCircle size={40} className="text-slate-300" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black text-white mb-1">WhatsApp Not Connected</h2>
                      <p className="text-slate-300 font-medium">Connect your account to start sending reminders</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {/* QR Code Section */}
                  {isQrPending && status.qr_code_url ? (
                    <div className="mb-8">
                      <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-blue-300 text-center">
                        <div className="inline-block bg-white p-6 rounded-2xl shadow-lg mb-4">
                          <img 
                            src={`${getBackendBaseUrl()}${status.qr_code_url}`} 
                            alt="WhatsApp QR Code"
                            className="w-64 h-64"
                          />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Scan QR Code</h3>
                        <p className="text-slate-600 font-medium mb-4">
                          Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                        </p>
                        <div className="flex items-center justify-center gap-2 text-blue-600">
                          <Loader2 size={20} className="animate-spin" />
                          <span className="font-bold">Waiting for scan...</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8">
                      <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-300 text-center">
                        <div className="w-24 h-24 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <QrCode size={48} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-700 mb-2">QR Code Will Appear Here</h3>
                        <p className="text-slate-500 font-medium">
                          Click "Connect WhatsApp" below to generate a QR code
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="mb-8 bg-amber-50 rounded-2xl p-6 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={24} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-black text-amber-800 mb-2">How to Connect</h4>
                        <ol className="text-amber-700 font-medium space-y-1 list-decimal list-inside">
                          <li>Click "Connect WhatsApp" to generate a QR code</li>
                          <li>Open WhatsApp on your mobile device</li>
                          <li>Go to Settings &gt; Linked Devices &gt; Link a Device</li>
                          <li>Scan the QR code with your phone camera</li>
                          <li>Your account will be linked automatically</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Connect Button */}
                  <button
                    onClick={handleConnect}
                    disabled={connecting || isQrPending}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 px-8 py-4 font-black rounded-2xl transition-all duration-300",
                      connecting || isQrPending
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {connecting || isQrPending ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {isQrPending ? 'Waiting for Scan...' : 'Connecting...'}
                      </>
                    ) : (
                      <>
                        <MessageCircle size={20} />
                        Connect WhatsApp
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirmation Modal */}
          <AnimatePresence>
            {showConfirm && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
                  onClick={() => setShowConfirm(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-md"
                >
                  <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4">
                    <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <AlertCircle size={32} className="text-rose-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 text-center mb-3">Disconnect WhatsApp?</h3>
                    <p className="text-slate-600 text-center font-medium mb-8">
                      This will remove your WhatsApp connection and you'll need to scan the QR code again to reconnect.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="flex-1 px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {disconnecting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Disconnecting
                          </>
                        ) : (
                          'Disconnect'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppIntegrationPage;
