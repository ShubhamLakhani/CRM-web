'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('demo@apex.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Attempt real API login using Context
        await login({ email, password });
        setSuccess(true);
      } else {
        // Attempt real API register using Context
        await register({ email, password, name });
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Authentication attempt failed:', err);
      const errMsg = err.response?.data?.message;
      setError(
        Array.isArray(errMsg)
          ? errMsg[0]
          : errMsg || 'Authentication failed. Please verify credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#070b13] px-4 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-indigo-600 shadow-xl shadow-indigo-500/20 border border-indigo-400/25">
            <Zap className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            Welcome to <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">ApexCRM</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enterprise relationship and intelligence workspace.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-8 backdrop-blur-2xl shadow-2xl relative">
          <div className="absolute inset-0 rounded-3xl border border-indigo-500/10 pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-medium text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group ${
                success
                  ? 'bg-emerald-500 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/20 cursor-pointer'
              }`}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : success ? (
                <>
                  <Sparkles className="h-4 w-4 animate-bounce" />
                  <span>Decrypting Workspace...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Initialize Session' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Assist */}
          {isLogin && (
            <div className="mt-5 border-t border-white/5 pt-4 text-center">
              <span className="text-xs text-slate-500">
                Out-of-the-box test client: <code className="text-indigo-400 font-semibold">demo@apex.com</code> / <code className="text-indigo-400 font-semibold">password123</code>
              </span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
            >
              {isLogin ? "Don't have an enterprise account? Sign up" : 'Already configured? Access workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
