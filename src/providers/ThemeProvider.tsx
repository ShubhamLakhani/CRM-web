'use client';

import React, { useEffect, useState } from 'react';
import { useCRMStore } from '../store/crmStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useCRMStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read cached preference or default
    const savedTheme = localStorage.getItem('apex-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';

    // Apply to DOM
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(initialTheme);

    // Sync store state
    setTheme(initialTheme);
    setMounted(true);
  }, [setTheme]);

  return <>{children}</>;
}
