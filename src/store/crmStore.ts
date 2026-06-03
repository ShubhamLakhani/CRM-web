import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
}

interface CRMState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

type StoreState = UIState & CRMState;

export const useCRMStore = create<StoreState>((set) => ({
  // UI State
  theme: 'dark', // standard production premium default
  sidebarOpen: true,
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(nextTheme);
        localStorage.setItem('apex-theme', nextTheme);
      }
      return { theme: nextTheme };
    }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('apex-theme', theme);
    }
    set({ theme });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // CRM state
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  statusFilter: '',
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
