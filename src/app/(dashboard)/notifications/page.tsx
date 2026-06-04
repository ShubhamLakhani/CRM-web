'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/api';
import {
  Search,
  Check,
  CheckSquare,
  Clock,
  Sparkles,
  Trophy,
  UserPlus,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter
} from 'lucide-react';

interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: string;
  event: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch paginated notifications matching query options
  const notificationsQuery = useQuery<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['notifications', unreadOnly, page],
    queryFn: () => notificationsService.getAll(unreadOnly, page, limit),
    enabled: mounted,
  });

  const responseData = notificationsQuery.data;
  const notifications = responseData?.data || [];
  const totalPages = responseData?.totalPages || 1;

  // Filter list locally for live text search (since the backend doesn't have a direct search query parameter mapped yet)
  const filteredNotifications = useMemo(() => {
    if (!search.trim()) return notifications;
    const query = search.toLowerCase();
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
    );
  }, [notifications, search]);

  // Reset page when unreadOnly filter toggles
  useEffect(() => {
    setPage(1);
  }, [unreadOnly]);

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = async (notif: Notification) => {
    // 1. Mark as read if not already read
    if (!notif.readAt) {
      markReadMutation.mutate(notif.id);
    }

    // 2. Deep link navigation
    if (notif.entityType && notif.entityId) {
      const type = notif.entityType.toLowerCase();
      switch (type) {
        case 'task':
          router.push(`/tasks?taskId=${notif.entityId}`);
          break;
        case 'deal':
          router.push(`/deals?dealId=${notif.entityId}`);
          break;
        case 'contact':
          router.push(`/contacts?contactId=${notif.entityId}`);
          break;
        case 'company':
          router.push(`/companies?companyId=${notif.entityId}`);
          break;
        case 'invite':
          router.push('/settings');
          break;
        default:
          break;
      }
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getIcon = (event: string) => {
    switch (event) {
      case 'TASK_ASSIGNED':
      case 'TASK_DUE':
        return <CheckSquare className="h-4 w-4 text-sky-400" />;
      case 'DEAL_WON':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'USER_INVITED':
        return <UserPlus className="h-4 w-4 text-indigo-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-indigo-400" />;
    }
  };

  const getIconBg = (event: string) => {
    switch (event) {
      case 'TASK_ASSIGNED':
      case 'TASK_DUE':
        return 'bg-sky-500/10 border-sky-500/15';
      case 'DEAL_WON':
        return 'bg-yellow-500/10 border-yellow-500/15';
      case 'USER_INVITED':
        return 'bg-indigo-500/10 border-indigo-500/15';
      default:
        return 'bg-indigo-500/10 border-indigo-500/15';
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Bell className="h-8 w-8 text-indigo-500" />
            <span>Notification Center</span>
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Audit logs, workspace invitations, and stage checkpoints requiring your clearance.
          </p>
        </div>

        {notifications.some((n) => !n.readAt) && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className="h-4.5 w-4.5" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Control filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search notification messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Toggle unread filter */}
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              unreadOnly
                ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400'
                : 'bg-card border-border hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Unread Only</span>
          </button>
        </div>
      </div>

      {/* Notifications timeline or list */}
      <div className="space-y-6">
        {notificationsQuery.isLoading ? (
          /* Loading skeletons */
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse p-4 rounded-2xl border border-border/40">
                <div className="h-8 w-8 rounded-xl bg-muted/40 shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="h-3 w-1/4 bg-muted/40 rounded" />
                  <div className="h-4.5 w-2/3 bg-muted/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm select-none">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/30 border border-border/40">
              <BellOff className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Inbox fully cleared</h3>
            <p className="text-xs text-muted-foreground max-w-sm font-semibold">
              {search || unreadOnly
                ? 'No notifications match your current active filters.'
                : 'No workspace alerts are currently listed for your profile.'}
            </p>
          </div>
        ) : (
          /* Notification Cards inside unified Timeline */
          <div className="relative border-l border-border pl-6 ml-4 space-y-6 py-2">
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.readAt;
              return (
                <div key={notif.id} className="relative group animate-in fade-in duration-200">
                  {/* Timeline icon dot */}
                  <div
                    className={`absolute -left-9.5 top-2.5 h-7 w-7 rounded-xl bg-card border flex items-center justify-center shadow-sm z-10 ${getIconBg(
                      notif.event
                    )}`}
                  >
                    {getIcon(notif.event)}
                  </div>

                  {/* Notification body card */}
                  <div
                    className={`rounded-2xl border bg-card/65 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                      isUnread
                        ? 'border-l-indigo-500 border-border bg-indigo-500/[0.01]'
                        : 'border-l-border border-border'
                    }`}
                  >
                    <div
                      onClick={() => handleNotificationClick(notif)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-sm ${
                            isUnread ? 'font-extrabold text-foreground' : 'font-bold text-muted-foreground'
                          }`}
                        >
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow shadow-indigo-500/50" />
                        )}
                        <span className="text-[10px] text-muted-foreground/60 font-semibold flex items-center gap-1 ml-auto sm:ml-0">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Mapped Deep link hint */}
                      {notif.entityType && (
                        <div className="mt-2.5 flex items-center gap-1 text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Open linked {notif.entityType} page</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Inline Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pl-4 border-l border-border/40">
                      {isUnread && (
                        <button
                          onClick={() => markReadMutation.mutate(notif.id)}
                          disabled={markReadMutation.isPending}
                          className="flex items-center justify-center p-2 rounded-xl bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-all cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="h-4.5 w-4.5 text-emerald-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-card p-4 rounded-2xl shadow-sm text-xs font-semibold text-muted-foreground">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card cursor-pointer transition-all"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
            <span>Previous</span>
          </button>

          <span className="font-bold text-foreground">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card cursor-pointer transition-all"
          >
            <span>Next</span>
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}
