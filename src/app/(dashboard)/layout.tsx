'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCRMStore } from '../../store/crmStore';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import CommandPalette from '../../components/CommandPalette';
import { useAuth } from '../../providers/AuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Bind Cmd+K or Ctrl+K globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-semibold text-muted-foreground animate-pulse">
            Decrypting CRM Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background transition-colors duration-200">
      {/* Large Desktop Sidebar */}
      <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
        <Sidebar onSearchClick={() => setCommandPaletteOpen(true)} />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col animate-in slide-in-from-left duration-200">
            <Sidebar
              onClose={() => setMobileSidebarOpen(false)}
              onSearchClick={() => {
                setMobileSidebarOpen(false);
                setCommandPaletteOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Panel Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileSidebarOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Keyboard-Activated Command Palette Dialog Overlay */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
