'use client';

import React from 'react';
import { useCRMStore } from '../../../store/crmStore';
import { useAuth } from '../../../providers/AuthProvider';
import { Sun, Moon, Shield, Settings, Server, Database, Globe, User } from 'lucide-react';

export default function SettingsPage() {
  const { theme, toggleTheme } = useCRMStore();
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Workspace Settings</h1>
        <p className="text-muted-foreground mt-1.5">
          Configure visual parameters, verify server states, and manage profile keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar inside Settings */}
        <div className="md:col-span-1 rounded-2xl border border-border bg-card p-4 h-fit space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground text-left">
            <Settings className="h-4.5 w-4.5 text-indigo-500" />
            <span>General Preferences</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/10 hover:text-foreground text-left transition-all">
            <User className="h-4.5 w-4.5" />
            <span>Profile Identity</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/10 hover:text-foreground text-left transition-all">
            <Shield className="h-4.5 w-4.5" />
            <span>Security & API Keys</span>
          </button>
        </div>

        {/* Configurations Fields */}
        <div className="md:col-span-2 space-y-6">
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
                    <p className="text-[10px] text-muted-foreground">Host: http://localhost:3001/api</p>
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
                    <p className="text-[10px] text-muted-foreground">Engine: Postgres 15 alpine</p>
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
                    <p className="text-[10px] text-muted-foreground">Host: http://localhost:3000</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-lg px-2 py-0.5 uppercase">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
