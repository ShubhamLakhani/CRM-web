'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/api';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30 seconds
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 30000, // 30 seconds polling
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count || 0;

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
          dropdownOpen
            ? 'bg-secondary text-foreground border-border'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary border-border/40'
        }`}
        aria-label="View notifications panel"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-extrabold text-white border-2 border-background animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Render Dropdown Overlay */}
      {dropdownOpen && (
        <NotificationDropdown onClose={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}
