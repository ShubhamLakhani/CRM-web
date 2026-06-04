'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import { invitationsService, authService } from '../../../services/api';
import { Zap, Sparkles, CheckCircle2, AlertCircle, Mail, Lock, User, ArrowRight } from 'lucide-react';

interface InviteData {
  organizationName: string;
  role: string;
  invitedEmail: string;
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  userExists: boolean;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, isAuthenticated, login, logout, syncSession, isLoading: authLoading } = useAuth();

  const [validationLoading, setValidationLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  // 1. Validate Token on mount
  useEffect(() => {
    async function validate() {
      if (!token) {
        setValidationError('No invitation token was provided in the URL.');
        setValidationLoading(false);
        return;
      }

      try {
        const res = await invitationsService.validate(token);
        setInviteData(res);

        if (res.invitationStatus === 'ACCEPTED') {
          setValidationError('This invitation has already been accepted.');
        } else if (res.invitationStatus === 'EXPIRED') {
          setValidationError('This invitation has expired.');
        } else if (res.userExists && !isAuthenticated) {
          router.replace(`/login?inviteToken=${token}`);
        }
      } catch (err: any) {
        console.error(err);
        setValidationError(err.response?.data?.message || 'Invalid or malformed invitation link.');
      } finally {
        setValidationLoading(false);
      }
    }

    validate();
  }, [token, isAuthenticated, router]);

  // 2. Existing User: Accept and Join Org directly
  const handleAcceptExisting = async () => {
    if (!token) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const acceptRes = await invitationsService.accept(token);
      
      // Switch active organization context
      const refreshData = await authService.refresh(acceptRes.organizationId);
      syncSession({
        user: refreshData.user,
        accessToken: refreshData.accessToken,
      });

      setStatus('success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.message || 'Failed to accept invitation.');
      setActionLoading(false);
    }
  };

  // 3. Existing User: Login first, then Accept automatically
  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteData) return;
    setActionLoading(true);
    setActionError(null);

    try {
      // 1. Authenticate user
      await login({ email: inviteData.invitedEmail, password });
      
      // 2. Accept invite immediately
      const acceptRes = await invitationsService.accept(token);
      
      // 3. Switch active organization context
      const refreshData = await authService.refresh(acceptRes.organizationId);
      syncSession({
        user: refreshData.user,
        accessToken: refreshData.accessToken,
      });
      
      setStatus('success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message;
      setActionError(
        Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Authentication failed. Please verify password.'
      );
      setActionLoading(false);
    }
  };

  // 4. New User: Register and Accept in single endpoint
  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteData) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await invitationsService.registerAndAccept({
        token,
        name,
        password,
      });

      // Synchronize auth state and set memory tokens
      syncSession({
        user: res.user,
        accessToken: res.accessToken,
      });

      setStatus('success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message;
      setActionError(
        Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Registration failed. Please try again.'
      );
      setActionLoading(false);
    }
  };

  // 5. Logout mismatched user
  const handleLogoutAndSwitch = () => {
    logout();
    // Reload page to re-validate token clean
    window.location.reload();
  };

  if (validationLoading || authLoading) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-[#070b13]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-slate-400 font-semibold animate-pulse">Decrypting secure token...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#070b13] px-4 relative overflow-hidden">
      {/* Visual background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-indigo-600 shadow-xl border border-indigo-400/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
            Join <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">{inviteData?.organizationName || 'Workspace'}</span>
          </h1>
        </div>

        <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-8 backdrop-blur-2xl shadow-2xl relative">
          <div className="absolute inset-0 rounded-3xl border border-indigo-500/10 pointer-events-none" />

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
              </div>
              <h2 className="text-xl font-bold text-white">Workspace Decrypted!</h2>
              <p className="text-xs text-slate-400">
                You have successfully joined <span className="text-indigo-400 font-bold">{inviteData?.organizationName}</span> as a <span className="capitalize">{inviteData?.role.toLowerCase()}</span>.
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold">Redirecting to operations terminal...</p>
            </div>
          ) : validationError ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Invalid Invitation</h2>
              <p className="text-xs text-red-400 font-semibold">{validationError}</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 py-3 text-xs font-bold text-white cursor-pointer transition-all"
              >
                Go to login
              </button>
            </div>
          ) : inviteData?.userExists ? (
            /* FLOW 1: EXISTING USER */
            isAuthenticated ? (
              user?.email?.toLowerCase() === inviteData.invitedEmail.toLowerCase() ? (
                /* CASE A: Logged in as matching user */
                <div className="space-y-5">
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    You are invited to join <span className="text-indigo-400 font-bold">{inviteData.organizationName}</span> as a <span className="text-indigo-400 capitalize">{inviteData.role.toLowerCase()}</span>.
                  </p>
                  <div className="rounded-xl border border-white/5 bg-secondary/10 p-3 text-left">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Authenticated user</span>
                    <span className="text-xs font-bold text-slate-300">{user.email}</span>
                  </div>

                  {actionError && (
                    <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-medium text-red-400">
                      {actionError}
                    </div>
                  )}

                  <button
                    onClick={handleAcceptExisting}
                    disabled={actionLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 py-3.5 text-xs font-bold text-white shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Accept & Join workspace</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* CASE B: Logged in as mismatched user */
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Identity Mismatch</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This invitation was explicitly issued to <code className="text-indigo-400 font-bold bg-slate-900 px-1 py-0.5 rounded">{inviteData.invitedEmail}</code>, but you are signed in as <code className="text-slate-300 font-bold bg-slate-900 px-1 py-0.5 rounded">{user?.email}</code>.
                  </p>
                  <button
                    onClick={handleLogoutAndSwitch}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 py-3.5 text-xs font-bold text-white cursor-pointer transition-all"
                  >
                    Log out & Join as {inviteData.invitedEmail}
                  </button>
                </div>
              )
            ) : (
              /* CASE C: Existing user, NOT logged in */
              <form onSubmit={handleLoginAndAccept} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  You already have an Apex account. Please enter your password to join <span className="text-indigo-400 font-bold">{inviteData.organizationName}</span>.
                </p>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      disabled
                      value={inviteData.invitedEmail}
                      className="w-full rounded-xl border border-white/5 bg-slate-900/20 py-3 pl-10 pr-4 text-xs text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Password</label>
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
                      className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                {actionError && (
                  <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-medium text-red-400">
                    {actionError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 py-3.5 text-xs font-bold text-white shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Login & Join Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )
          ) : (
            /* FLOW 2: NEW USER */
            <form onSubmit={handleRegisterAndAccept} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Create a password to register your account and join <span className="text-indigo-400 font-bold">{inviteData?.organizationName}</span> as a <span className="capitalize text-indigo-400 font-semibold">{inviteData?.role.toLowerCase()}</span>.
              </p>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Invited Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    disabled
                    value={inviteData?.invitedEmail || ''}
                    className="w-full rounded-xl border border-white/5 bg-slate-900/20 py-3 pl-10 pr-4 text-xs text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Connor"
                    className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Create Password</label>
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
                    className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {actionError && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-medium text-red-400">
                  {actionError}
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 py-3.5 text-xs font-bold text-white shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Create Account & Join Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-screen items-center justify-center bg-[#070b13]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
