'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building, Briefcase, CheckSquare, Clock, Settings, Zap, X, ChevronDown, Check } from 'lucide-react';
import { useCRMStore } from '../store/crmStore';
import { useAuth } from '../providers/AuthProvider';
import { organizationsService } from '../services/api';

interface SidebarProps {
  onClose?: () => void;
  onSearchClick?: () => void;
}

export default function Sidebar({ onClose, onSearchClick }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen } = useCRMStore();
  const { user, syncSession } = useAuth();
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    async function loadWorkspaces() {
      if (user) {
        try {
          const res = await organizationsService.getMyOrganizations();
          setWorkspaces(res);
        } catch (err) {
          console.error('Failed to load workspaces:', err);
        }
      }
    }
    loadWorkspaces();
  }, [user]);

  const activeWorkspaceName = user?.organizationName || 'Apex HQ';

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Companies', href: '/companies', icon: Building },
    { name: 'Deals Pipeline', href: '/deals', icon: Briefcase },
    { name: 'Tasks Manager', href: '/tasks', icon: CheckSquare },
    { name: 'Automations', href: '/automations', icon: Zap },
    { name: 'Activity Feed', href: '/activity', icon: Clock },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card transition-colors duration-200">
      {/* Workspace Selector Dropdown Header */}
      <div className="relative flex h-16 items-center justify-between px-6 border-b border-border">
        <div className="flex flex-col w-full relative z-30">
          <button
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            className="flex items-center gap-2.5 text-left group w-full cursor-pointer hover:bg-secondary/40 p-1.5 -ml-1.5 rounded-lg transition-all"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 via-violet-500 to-indigo-600 shadow-md shadow-indigo-500/20 text-white font-bold text-xs select-none">
              {activeWorkspaceName.charAt(0)}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold tracking-tight text-foreground truncate flex items-center gap-1">
                {activeWorkspaceName}
                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </span>
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider capitalize">{user?.role ? user.role.toLowerCase() : 'viewer'}</span>
            </div>
          </button>

          {/* Workspace Dropdown Panel */}
          {workspaceDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setWorkspaceDropdownOpen(false)} />
              <div className="absolute top-12 left-0 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto">
                {workspaces.map((ws) => (
                  <button
                    key={ws.organizationId}
                    onClick={async () => {
                      if (ws.organizationId === user?.organizationId) {
                        setWorkspaceDropdownOpen(false);
                        return;
                      }
                      try {
                        const result = await organizationsService.switch(ws.organizationId);
                        syncSession({
                          user: result.user,
                          accessToken: result.accessToken,
                        });
                        setWorkspaceDropdownOpen(false);
                        window.location.reload();
                      } catch (err) {
                        console.error('Failed to switch workspace:', err);
                      }
                    }}
                    className={`w-full flex flex-col px-3 py-2 rounded-lg text-left transition-all mb-0.5 last:mb-0 ${
                      user?.organizationId === ws.organizationId ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold truncate pr-2">{ws.organizationName}</span>
                      {user?.organizationId === ws.organizationId && <Check className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{ws.roleId.toLowerCase()}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent'
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`} />
              <span>{item.name}</span>
              {isActive && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Search Keyboard Shortcut Info Footer */}
      <div className="p-4 border-t border-border/60">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/80 bg-secondary/15 hover:bg-secondary/35 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-150 group text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
            <span>Search Workspace</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px] font-bold tracking-wider select-none">
            ⌘K
          </kbd>
        </button>
      </div>
    </aside>
  );
}
