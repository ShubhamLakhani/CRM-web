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

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

interface CRMState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

type StoreState = UIState & AuthState & CRMState;

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

  // Auth State
  user: null,
  token: null,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('apex-token', token);
      localStorage.setItem('apex-user', JSON.stringify(user));
    }
    set({ user, token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apex-token');
      localStorage.removeItem('apex-user');
    }
    set({ user: null, token: null });
  },

  // CRM state
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  statusFilter: '',
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
