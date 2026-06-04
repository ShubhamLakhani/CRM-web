'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/api';
import {
  Check,
  CheckSquare,
  Clock,
  Sparkles,
  Trophy,
  UserPlus,
  BellOff,
  ChevronRight,
  ExternalLink
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

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch latest 5 notifications
  const { data, isLoading } = useQuery<{ data: Notification[]; total: number }>({
    queryKey: ['notifications', 'latest'],
    queryFn: () => notificationsService.getAll(false, 1, 5),
  });

  const notifications = data?.data || [];

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
    // 1. Mark as read on click if not already read
    if (!notif.readAt) {
      markReadMutation.mutate(notif.id);
    }

    // Close the dropdown first
    onClose();

    // 2. Perform deep link navigation
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
          router.push('/notifications');
          break;
      }
    } else {
      router.push('/notifications');
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
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getIcon = (event: string) => {
    switch (event) {
      case 'TASK_ASSIGNED':
      case 'TASK_DUE':
        return <CheckSquare className="h-3.5 w-3.5 text-sky-400" />;
      case 'DEAL_WON':
        return <Trophy className="h-3.5 w-3.5 text-yellow-400" />;
      case 'USER_INVITED':
        return <UserPlus className="h-3.5 w-3.5 text-indigo-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-indigo-400" />;
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

  return (
    <div className="absolute right-0 top-11 w-80 sm:w-96 rounded-2xl border border-border bg-card p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col text-left">
      {/* Dropdown Header */}
      <div className="px-3.5 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-extrabold text-foreground">Notifications</span>
          <span className="text-[10px] text-muted-foreground font-semibold">Latest updates in workspace</span>
        </div>
        {notifications.some((n) => !n.readAt) && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 px-2 py-1 rounded-lg cursor-pointer"
          >
            <Check className="h-3 w-3" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Dropdown Body */}
      <div className="max-h-80 overflow-y-auto py-1 divide-y divide-border/40">
        {isLoading ? (
          /* Loading skeletons state */
          [1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 flex gap-3 animate-pulse">
              <div className="h-7 w-7 rounded-lg bg-muted/40 shrink-0" />
              <div className="flex-1 space-y-1.5 py-0.5">
                <div className="h-3 w-1/3 bg-muted/40 rounded" />
                <div className="h-3.5 w-3/4 bg-muted/40 rounded" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          /* Empty state */
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 select-none">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/40 border border-border/40">
              <BellOff className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground/75">Inbox fully cleared</span>
            <span className="text-[10px] text-muted-foreground/50 max-w-[200px]">
              You will be notified when new tasks, deals, or invitations require your response.
            </span>
          </div>
        ) : (
          /* Notifications list */
          notifications.map((notif) => {
            const isUnread = !notif.readAt;
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 flex gap-3.5 hover:bg-muted/10 cursor-pointer transition-all duration-150 relative group ${
                  isUnread ? 'bg-indigo-500/[0.02]' : ''
                }`}
              >
                {/* Event Icon container */}
                <div
                  className={`h-7.5 w-7.5 rounded-lg border flex items-center justify-center shrink-0 shadow-sm self-start ${getIconBg(
                    notif.event
                  )}`}
                >
                  {getIcon(notif.event)}
                </div>

                {/* Text Content block */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs truncate ${
                        isUnread ? 'font-extrabold text-foreground' : 'font-semibold text-muted-foreground'
                      }`}
                    >
                      {notif.title}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 font-medium whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal mt-0.5 line-clamp-2 font-medium">
                    {notif.message}
                  </p>

                  {/* Deep-link action hint */}
                  {notif.entityType && (
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] text-indigo-400 font-extrabold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View details</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>

                {/* Mark read hover button + unread dot indicator */}
                <div className="flex items-center justify-center shrink-0 pr-1">
                  {isUnread ? (
                    <div className="h-2 w-2 rounded-full bg-indigo-500 shadow shadow-indigo-500/50 group-hover:hidden" />
                  ) : null}
                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(notif.id);
                      }}
                      className="p-1 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground hidden group-hover:block transition-all border border-border/40"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3 text-emerald-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dropdown Footer */}
      <div className="p-1 border-t border-border/40 mt-1.5">
        <button
          onClick={() => {
            router.push('/notifications');
            onClose();
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all cursor-pointer"
        >
          <span>View All Notifications</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
