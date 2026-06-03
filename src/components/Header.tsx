'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCRMStore } from '../store/crmStore';
import { useAuth } from '../providers/AuthProvider';
import { Sun, Moon, LogOut, User, Menu, ChevronRight, Search, Settings, HelpCircle, Bell } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export default function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useCRMStore();
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Generate dynamic breadcrumbs from path
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Workspace', href: '/dashboard' }];

    paths.forEach((p, idx) => {
      // Format segment name nicely (e.g., "deals" -> "Deals")
      const name = p
        .replace('-', ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
      const href = '/' + paths.slice(0, idx + 1).join('/');
      breadcrumbs.push({ name, href });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 px-6 backdrop-blur-md transition-colors duration-200">
      {/* Left side: Mobile menu toggle + Dynamic Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs Nav */}
        <nav className="flex items-center text-xs font-bold text-muted-foreground hidden sm:flex">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={crumb.href} className="flex items-center">
                {idx > 0 && <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground/60" />}
                <button
                  onClick={() => router.push(crumb.href)}
                  className={`hover:text-foreground transition-colors cursor-pointer capitalize ${
                    isLast ? 'text-foreground font-extrabold' : ''
                  }`}
                  disabled={isLast}
                >
                  {crumb.name}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Central Global Search Box (Linear / Attio style) */}
      <div className="flex-1 max-w-sm mx-4 hidden md:block">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-border/80 bg-secondary/15 hover:bg-secondary/35 text-xs text-muted-foreground hover:text-foreground transition-all duration-150 group text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span>Search anything...</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px] font-bold tracking-wider select-none">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Mobile Search Icon Button */}
        <button
          onClick={onSearchClick}
          className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all border border-border/40"
          aria-label="Search Workspace"
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        {/* Notification Bell */}
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40 transition-all cursor-pointer relative">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40 transition-all duration-200 cursor-pointer"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </button>

        {/* Profile Dropdown Menu Toggle */}
        <div className="relative border-l border-border/60 pl-3">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Open User Menu"
          >
            <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25 border border-indigo-400/25">
              <User className="h-4 w-4" />
            </div>
          </button>

          {profileDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
              <div className="absolute right-0 top-11 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Identity info */}
                <div className="px-3 py-2 border-b border-border/60 mb-1 flex flex-col">
                  <span className="text-xs font-extrabold text-foreground">{user?.name || 'Sarah Connor'}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold truncate">{user?.email || 'demo@apex.com'}</span>
                </div>

                <button
                  onClick={() => {
                    router.push('/settings');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary/50 hover:text-foreground text-left transition-all"
                >
                  <Settings className="h-4 w-4" />
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={() => setProfileDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary/50 hover:text-foreground text-left transition-all"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Support Center</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 text-left transition-all border-t border-border/40 mt-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out Session</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
