'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('auth/forgot-password', { email });
      setMessage(res.data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/Loginbackground.png")',
          imageRendering: 'crisp-edges'
        }}
      />
      <div className="absolute inset-0 z-10 bg-black/30" />

      <div className="w-full max-w-md relative z-20 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-2xl mb-6 border border-white/20 transition-all hover:scale-105 overflow-hidden">
            <img src="/images/My Hostel.logo.png" alt="My Hostel Logo" className="h-full w-full object-contain p-1" />
          </div>
          <div className="-mt-4">
            <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">My Hostel</h1>
            <p className="text-white/80 font-medium mt-2 text-lg drop-shadow-lg">Recover Your Account</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] p-10 space-y-8 border border-white/20 -mt-4">
          <div className="space-y-2">
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4">
              <ArrowLeft size={16} /> Back to Login
            </Link>
            <h2 className="text-2xl font-bold text-white">Forgot Password?</h2>
            <p className="text-white/60 text-sm">Enter your registered email address and we'll send you a link to reset your password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" />
                <input
                  type="email"
                  required
                  className="block w-full h-14 pl-12 pr-4 py-2 border border-white/10 rounded-2xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/10 transition-all text-lg"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 backdrop-blur-md text-red-100 text-sm font-bold rounded-2xl flex items-center gap-3 border border-red-500/30 animate-shake">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 bg-green-500/20 backdrop-blur-md text-green-100 text-sm font-bold rounded-2xl flex items-center gap-3 border border-green-500/30">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!message}
              className="w-full h-14 bg-white text-slate-900 font-black text-lg rounded-2xl shadow-[0_10px_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_15px_25px_-5px_rgba(255,255,255,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Sending Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-white/40 mt-10 font-medium tracking-wide uppercase">
          © {new Date().getFullYear()} My Hostel. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
