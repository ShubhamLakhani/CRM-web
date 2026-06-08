'use client';

import React, { useEffect, useState } from 'react';
import { useCRMStore } from '../../../store/crmStore';
import { useAuth } from '../../../providers/AuthProvider';
import { authService, invitationsService, featuresService } from '../../../services/api';
import { useFeatures } from '../../../hooks/useFeatures';
import {
  Sun,
  Moon,
  Shield,
  Settings,
  Server,
  Database,
  Globe,
  User,
  Users,
  Mail,
  Plus,
  Send,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CreditCard
} from 'lucide-react';

import { usePermissions } from '../../../hooks/usePermissions';
import AuditLogCenter from '../../../components/AuditLogCenter';
import BillingCenter from '../../../components/BillingCenter';


export default function SettingsPage() {
  const { theme, toggleTheme } = useCRMStore();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'features' | 'audit' | 'billing'>('general');
  const canManageFeatures = hasPermission('billing.manage');
  const canManageBilling = hasPermission('billing.manage');
  const canViewAudit = hasPermission('audit.view');
  const canInvite = hasPermission('users.invite');

  // Team management state
  const [members, setMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ADMIN');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(false);

  // Features list state
  const { features: featuresList, isLoading: featuresLoading, refetch: refetchFeatures } = useFeatures();

  const handleToggleFeature = async (featureId: string, isEnabled: boolean) => {
    try {
      await featuresService.toggleFeature(featureId, isEnabled);
      refetchFeatures();
    } catch (err: any) {
      console.error('Failed to toggle feature:', err);
      alert(err.response?.data?.message || 'Failed to update feature flag status');
    }
  };

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamAndInvites();
    }
  }, [activeTab]);

  const fetchTeamAndInvites = async () => {
    setMembersLoading(true);
    setInvitesLoading(true);
    try {
      const usersData = await authService.getUsers();
      setMembers(usersData);
    } catch (e) {
      console.error('Failed to fetch members:', e);
    } finally {
      setMembersLoading(false);
    }

    try {
      const invitesData = await invitationsService.getPending();
      setPendingInvites(invitesData);
    } catch (e) {
      console.error('Failed to fetch pending invites:', e);
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteLoading(true);
    setInviteSuccessMsg('');
    setGeneratedLink('');
    try {
      const res = await invitationsService.invite({
        email: inviteEmail,
        roleId: inviteRole,
      });
      setInviteEmail('');
      setInviteSuccessMsg(`Successfully invited ${res.email}`);
      const link = `${window.location.origin}/invite/accept?token=${res.token}`;
      setGeneratedLink(link);
      fetchTeamAndInvites();
    } catch (err: any) {
      console.error('Failed to send invite:', err);
      alert(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const res = await invitationsService.resend(id);
      const link = `${window.location.origin}/invite/accept?token=${res.token}`;
      alert(`Invitation renewed successfully!\n\nNew Link:\n${link}`);
      fetchTeamAndInvites();
    } catch (err: any) {
      console.error('Failed to resend invite:', err);
      alert('Failed to resend invitation');
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await invitationsService.revoke(id);
      fetchTeamAndInvites();
    } catch (err: any) {
      console.error('Failed to revoke invite:', err);
      alert('Failed to revoke invitation');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Workspace Settings</h1>
        <p className="text-muted-foreground mt-1.5">
          Configure visual parameters, manage organization members, and invite team operators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar inside Settings */}
        <div className="md:col-span-1 rounded-2xl border border-border bg-card p-4 h-fit space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${
              activeTab === 'general'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
            }`}
          >
            <Settings className="h-4.5 w-4.5 text-indigo-500" />
            <span>General Preferences</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${
              activeTab === 'team'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
            }`}
          >
            <Users className="h-4.5 w-4.5 text-indigo-500" />
            <span>Team Members</span>
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${
              activeTab === 'features'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
            }`}
          >
            <Shield className="h-4.5 w-4.5 text-indigo-500" />
            <span>Features</span>
          </button>
          {canManageBilling && (
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${
                activeTab === 'billing'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
              }`}
            >
              <CreditCard className="h-4.5 w-4.5 text-indigo-500" />
              <span>Billing</span>
            </button>
          )}
          {canViewAudit && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${
                activeTab === 'audit'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
              }`}
            >
              <Server className="h-4.5 w-4.5 text-indigo-500" />
              <span>Audit Logs</span>
            </button>
          )}
        </div>

        {/* Configurations Fields / Tabs */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'general' && (
            <>
              {/* Visual Theme Settings Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-md transition-colors duration-200">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Visual Interface</span>
                </h2>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Configure workspace dark/light appearance</p>

                <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border/60">
                  <div>
                    <span className="text-sm font-bold text-foreground">Workspace Theme Mode</span>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Toggle between obsidian dark mode and sleek light mode interfaces.</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card hover:bg-secondary px-4 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all cursor-pointer"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="h-4 w-4 text-violet-500" />
                        <span>Dark Interface</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span>Light Interface</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* User Account Info Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-md transition-colors duration-200">
                <h2 className="text-lg font-bold text-foreground">User Identity Profile</h2>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Cached identity verification metrics</p>

                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">User ID</label>
                      <div className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3.5 text-xs font-mono text-muted-foreground select-all">
                        {user?.id || 'mock-uuid-admin'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Access Privilege</label>
                      <div className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3.5 text-xs font-bold text-indigo-400 capitalize">
                        {user?.role || 'ADMIN'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Full Display Name</label>
                      <div className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3.5 text-xs font-bold text-foreground">
                        {user?.name || 'Sarah Connor'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Registration Email</label>
                      <div className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3.5 text-xs font-bold text-foreground">
                        {user?.email || 'demo@apex.com'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure Health Status Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-md transition-colors duration-200">
                <h2 className="text-lg font-bold text-foreground">Infrastructure Nodes</h2>
                <p className="text-xs text-muted-foreground font-semibold mt-1">Status of cloud infrastructure components</p>

                <div className="mt-5 divide-y divide-border/60">
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-indigo-500" />
                      <div>
                        <span className="text-xs font-bold text-foreground">NestJS API Endpoint</span>
                        <p className="text-[10px] text-muted-foreground font-medium">Host: http://localhost:3002/api</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-lg px-2 py-0.5 uppercase">
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-indigo-500" />
                      <div>
                        <span className="text-xs font-bold text-foreground">PostgreSQL Database Layer</span>
                        <p className="text-[10px] text-muted-foreground font-medium">Engine: Postgres 15 alpine</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-lg px-2 py-0.5 uppercase">
                      Healthy
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-indigo-500" />
                      <div>
                        <span className="text-xs font-bold text-foreground">NextJS App Router Node</span>
                        <p className="text-[10px] text-muted-foreground font-medium">Host: http://localhost:3001</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-lg px-2 py-0.5 uppercase">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Invite Member Section */}
              {canInvite && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
                  <h2 className="text-lg font-bold text-foreground">Invite Workspace Operators</h2>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">Send cryptographically secure invitation links</p>

                  <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="operator@company.com"
                          className="w-full rounded-xl border border-border bg-secondary/15 py-3 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 transition-all font-medium"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="rounded-xl border border-border bg-card hover:bg-secondary/40 py-3 px-4 text-sm font-semibold text-foreground outline-none cursor-pointer transition-all"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="SALES">Sales</option>
                        <option value="SUPPORT">Support</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button
                        type="submit"
                        disabled={inviteLoading}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-3 px-6 text-sm font-bold text-white shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                      >
                        {inviteLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Invite Member</span>
                          </>
                        )}
                      </button>
                    </div>

                    {inviteSuccessMsg && (
                      <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span>{inviteSuccessMsg}</span>
                        </div>
                        {generatedLink && (
                          <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                            <span className="text-[10px] font-mono text-muted-foreground truncate select-all">{generatedLink}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(generatedLink, 'invite-success')}
                              className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors p-1"
                            >
                              {copiedLinkId === 'invite-success' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedLinkId === 'invite-success' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Members List Section */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Workspace Members</h2>
                    <p className="text-xs text-muted-foreground font-semibold mt-1">Users currently in this organization</p>
                  </div>
                  <button
                    onClick={fetchTeamAndInvites}
                    disabled={membersLoading}
                    className="p-2 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 ${membersLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-border bg-secondary/10">
                  {membersLoading ? (
                    <div className="p-8 text-center text-xs font-bold text-muted-foreground">Loading members...</div>
                  ) : members.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-muted-foreground">No members found.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                <span>{member.name}</span>
                                {member.id === user?.id && (
                                  <span className="text-[9px] font-extrabold bg-slate-900 border border-white/5 text-muted-foreground rounded px-1 py-0.5">YOU</span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-semibold">{member.email}</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            member.role === 'ADMIN'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-secondary/40 text-muted-foreground border-border'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Invites List Section */}
              {canInvite && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Pending Invitations</h2>
                    <p className="text-xs text-muted-foreground font-semibold mt-1">Sent invites awaiting user acceptance</p>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-xl border border-border bg-secondary/10">
                    {invitesLoading ? (
                      <div className="p-8 text-center text-xs font-bold text-muted-foreground">Loading pending invitations...</div>
                    ) : pendingInvites.length === 0 ? (
                      <div className="p-8 text-center text-xs font-medium text-muted-foreground flex flex-col items-center gap-1">
                        <AlertCircle className="h-5 w-5 text-muted-foreground/60" />
                        <span>No pending invitations active.</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {pendingInvites.map((invite) => {
                          const acceptLink = `${window.location.origin}/invite/accept?token=${invite.token}`;
                          return (
                            <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-secondary/20 transition-all">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                  <span>{invite.email}</span>
                                  <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded px-1.5">
                                    {invite.roleId}
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                  <span>Invited by {invite.invitedBy?.name}</span>
                                  <span>•</span>
                                  <span>Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-lg border border-white/5 max-w-xs mt-1">
                                  <span className="text-[9px] font-mono text-muted-foreground truncate">{acceptLink}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(acceptLink, invite.id)}
                                    className="flex-shrink-0 flex items-center gap-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors p-1"
                                  >
                                    {copiedLinkId === invite.id ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                                    <span>{copiedLinkId === invite.id ? 'Copied' : 'Copy Link'}</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                  onClick={() => handleResendInvite(invite.id)}
                                  className="flex items-center justify-center gap-1 text-[10px] font-bold bg-secondary hover:bg-secondary/70 border border-border text-foreground px-3 py-2 rounded-xl cursor-pointer transition-all"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  <span>Renew</span>
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(invite.id)}
                                  className="flex items-center justify-center gap-1 text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 px-3 py-2 rounded-xl cursor-pointer transition-all"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Revoke</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md transition-colors duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Feature Management Center</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage active enterprise capabilities and module access for this organization workspace.
                  </p>
                </div>
                {!canManageFeatures && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    <span>View-only (Requires Owner/Admin)</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {featuresLoading ? (
                  <div className="text-center text-xs font-semibold text-muted-foreground py-8">
                    Loading enterprise features...
                  </div>
                ) : (
                  [
                    {
                      id: 'AI_ASSISTANT',
                      name: 'AI Assistant',
                      description: 'Enables AI-powered relationship intelligence, deal forecasting, and smart assistance.',
                      lastUpdated: '2 hours ago',
                    },
                    {
                      id: 'EMAIL_SYNC',
                      name: 'Email Sync',
                      description: 'Allows synchronizing emails and messages automatically with workspace contact profiles.',
                      lastUpdated: '1 day ago',
                    },
                    {
                      id: 'AUTOMATION',
                      name: 'Automations',
                      description: 'Enables triggering automated sales pipelines, task assignments, and alerts.',
                      lastUpdated: '3 days ago',
                    },
                    {
                      id: 'CUSTOM_FIELDS',
                      name: 'Custom Fields',
                      description: 'Allows adding custom schema attributes and properties on contact and company cards.',
                      lastUpdated: 'Just now',
                    },
                    {
                      id: 'CLIENT_PORTAL',
                      name: 'Client Portal',
                      description: 'Enables secure client portal access and collaboration hubs for external partners.',
                      lastUpdated: '5 days ago',
                    },
                  ].map((feat) => {
                    const isEnabled = !!featuresList[feat.id];
                    return (
                      <div
                        key={feat.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-secondary/15 border border-border hover:border-border/80 transition-all gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{feat.name}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                              isEnabled
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                                : 'bg-secondary/40 text-muted-foreground border-border'
                            }`}>
                              {isEnabled ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                            {feat.description}
                          </p>
                          <div className="text-[10px] text-muted-foreground/60 font-semibold">
                            Last updated: {feat.lastUpdated}
                          </div>
                        </div>

                        <button
                          disabled={!canManageFeatures}
                          onClick={() => handleToggleFeature(feat.id, !isEnabled)}
                          className={`flex items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold shadow-sm transition-all ${
                            !canManageFeatures
                              ? 'bg-secondary/20 text-muted-foreground border-border cursor-not-allowed'
                              : isEnabled
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 cursor-pointer'
                              : 'bg-card text-foreground border-border hover:bg-secondary cursor-pointer'
                          }`}
                        >
                          {isEnabled ? 'Disable Feature' : 'Enable Feature'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {activeTab === 'billing' && canManageBilling && (
            <BillingCenter />
          )}
          {activeTab === 'audit' && (
            <AuditLogCenter />
          )}
        </div>
      </div>
    </div>
  );
}
