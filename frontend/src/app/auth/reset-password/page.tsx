'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

const ResetPasswordContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('auth/reset-password', {
        token,
        email,
        password: formData.password
      });
      setMessage(res.data.message);
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Link may be expired.');
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
            <p className="text-white/80 font-medium mt-2 text-lg drop-shadow-lg">Reset Password for:</p>
            {email && (
              <p className="text-white font-bold bg-white/10 px-4 py-1 rounded-full inline-block mt-2 border border-white/20 backdrop-blur-sm">
                {email}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] p-10 space-y-8 border border-white/20 -mt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative group">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full h-14 pl-12 pr-12 py-2 border border-white/10 rounded-2xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/10 transition-all text-lg"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative group">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full h-14 pl-12 pr-4 py-2 border border-white/10 rounded-2xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/10 transition-all text-lg"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
              disabled={loading || !!message || !token}
              className="w-full h-14 bg-white text-slate-900 font-black text-lg rounded-2xl shadow-[0_10px_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_15px_25px_-5px_rgba(255,255,255,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Reset Password'
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

const ResetPasswordPage = () => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold tracking-widest uppercase">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
};

export default ResetPasswordPage;
