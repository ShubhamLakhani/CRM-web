'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCRMStore } from '../store/crmStore';
import { Search, Compass, Users, Building, Briefcase, CheckSquare, Clock, Settings, Moon, Sun, X, CornerDownLeft } from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { theme, toggleTheme } = useCRMStore();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Navigation Category
    {
      id: 'nav-dash',
      title: 'Go to Dashboard',
      category: 'Navigation',
      icon: Compass,
      shortcut: 'G D',
      action: () => {
        router.push('/dashboard');
        onClose();
      },
    },
    {
      id: 'nav-contacts',
      title: 'Go to Contacts',
      category: 'Navigation',
      icon: Users,
      shortcut: 'G C',
      action: () => {
        router.push('/contacts');
        onClose();
      },
    },
    {
      id: 'nav-companies',
      title: 'Go to Companies',
      category: 'Navigation',
      icon: Building,
      shortcut: 'G O',
      action: () => {
        router.push('/companies');
        onClose();
      },
    },
    {
      id: 'nav-deals',
      title: 'Go to Deals Pipeline',
      category: 'Navigation',
      icon: Briefcase,
      shortcut: 'G P',
      action: () => {
        router.push('/deals');
        onClose();
      },
    },
    {
      id: 'nav-tasks',
      title: 'Go to Tasks Manager',
      category: 'Navigation',
      icon: CheckSquare,
      shortcut: 'G T',
      action: () => {
        router.push('/tasks');
        onClose();
      },
    },
    {
      id: 'nav-activity',
      title: 'Go to Activity Feed',
      category: 'Navigation',
      icon: Clock,
      shortcut: 'G A',
      action: () => {
        router.push('/activity');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      title: 'Go to Workspace Settings',
      category: 'Navigation',
      icon: Settings,
      shortcut: 'G S',
      action: () => {
        router.push('/settings');
        onClose();
      },
    },
    // Preferences Category
    {
      id: 'pref-theme',
      title: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`,
      category: 'Preferences',
      icon: theme === 'light' ? Moon : Sun,
      shortcut: 'T T',
      action: () => {
        toggleTheme();
        onClose();
      },
    },
  ];

  // Filter commands by search
  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Focus input on mount/open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Sync scroll on key nav
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const selectedElement = listElement.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (!selectedElement) return;

    const listHeight = listElement.clientHeight;
    const elementTop = selectedElement.offsetTop;
    const elementHeight = selectedElement.clientHeight;

    if (elementTop + elementHeight > listElement.scrollTop + listHeight) {
      listElement.scrollTop = elementTop + elementHeight - listHeight;
    } else if (elementTop < listElement.scrollTop) {
      listElement.scrollTop = elementTop;
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group commands by category for display
  const categories = Array.from(new Set(filteredCommands.map((c) => c.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Main dialog box */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[480px]">
        <div className="absolute inset-0 rounded-2xl border border-indigo-500/10 pointer-events-none" />

        {/* Input area */}
        <div className="flex items-center gap-3 px-4 border-b border-border py-4 bg-secondary/15">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-foreground placeholder-muted-foreground outline-none text-base border-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            aria-label="Close Command Palette"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Results Container */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[350px]">
          {filteredCommands.length > 0 ? (
            categories.map((cat) => {
              const catCommands = filteredCommands.filter((c) => c.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
                    {cat}
                  </div>
                  {catCommands.map((cmd) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIndex}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left border border-transparent ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                            : 'text-foreground hover:bg-secondary/40'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <cmd.icon className={`h-4.5 w-4.5 ${isSelected ? 'text-white animate-pulse' : 'text-muted-foreground'}`} />
                          <span>{cmd.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {cmd.shortcut && (
                            <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${isSelected ? 'bg-indigo-700 border-indigo-500 text-white' : 'bg-secondary border-border text-muted-foreground'}`}>
                              {cmd.shortcut}
                            </span>
                          )}
                          {isSelected && (
                            <CornerDownLeft className="h-3 w-3 text-white/80 animate-in fade-in slide-in-from-right-1 duration-100" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground text-sm font-medium">
              <span>No commands or items found matching "{search}"</span>
              <span className="text-xs text-muted-foreground/60 mt-1">Try another search term or keybind</span>
            </div>
          )}
        </div>

        {/* Footer shortcuts hints */}
        <div className="border-t border-border bg-secondary/15 px-4 py-2.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">Enter</kbd> Execute
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">Esc</kbd> Close Palette
          </span>
        </div>
      </div>
    </div>
  );
}
