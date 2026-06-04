'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activitiesService } from '@/services/api';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Trophy,
  CheckCircle2,
  UserPlus,
  UserCheck,
  MessageSquare,
  Plus,
  Clock
} from 'lucide-react';

interface ActivityTimelineProps {
  entityType: string;
  entityId: string;
}

export default function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Fetch activities by entity with pagination
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activities', entityType, entityId, page],
    queryFn: () => activitiesService.getByEntity(entityType, entityId, page, 10),
    enabled: !!entityId,
  });

  // Reset page and activities when entityId changes
  useEffect(() => {
    setPage(1);
    setActivities([]);
    setHasMore(true);
  }, [entityId, entityType]);

  // Append data when page loads
  useEffect(() => {
    if (data?.data) {
      setActivities((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newItems = data.data.filter((a: any) => !existingIds.has(a.id));
        return page === 1 ? data.data : [...prev, ...newItems];
      });
      if (data.page >= data.totalPages) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }
  }, [data, page]);

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

  const getIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-3.5 w-3.5 text-emerald-400" />;
      case 'updated':
        return <RefreshCw className="h-3.5 w-3.5 text-sky-400" />;
      case 'stage_changed':
        return <TrendingUp className="h-3.5 w-3.5 text-amber-400" />;
      case 'won':
        return <Trophy className="h-3.5 w-3.5 text-yellow-400" />;
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case 'invited':
        return <UserPlus className="h-3.5 w-3.5 text-indigo-400" />;
      case 'invite_accepted':
        return <UserCheck className="h-3.5 w-3.5 text-violet-400" />;
      case 'note_added':
        return <MessageSquare className="h-3.5 w-3.5 text-sky-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-indigo-400" />;
    }
  };

  const getIconBg = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-emerald-500/10 border-emerald-500/15';
      case 'updated':
        return 'bg-sky-500/10 border-sky-500/15';
      case 'stage_changed':
        return 'bg-amber-500/10 border-amber-500/15';
      case 'won':
        return 'bg-yellow-500/10 border-yellow-500/15';
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500/15';
      case 'invited':
        return 'bg-indigo-500/10 border-indigo-500/15';
      case 'invite_accepted':
        return 'bg-violet-500/10 border-violet-500/15';
      case 'note_added':
        return 'bg-sky-500/10 border-sky-500/15';
      default:
        return 'bg-indigo-500/10 border-indigo-500/15';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (isLoading && page === 1) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="h-8 w-8 rounded-xl bg-muted/40 flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-1/3 bg-muted/40 rounded" />
              <div className="h-4 w-3/4 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground/60 py-8 select-none">
        No activities registered for this {entityType}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline List */}
      <div className="relative border-l border-border pl-6 ml-3.5 space-y-6 py-2">
        {activities.map((act) => (
          <div key={act.id} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-9.5 top-0.5 h-7 w-7 rounded-xl bg-card border flex items-center justify-center shadow-sm z-10 ${getIconBg(
                act.action
              )}`}
            >
              {getIcon(act.action)}
            </div>

            {/* Content card */}
            <div className="rounded-2xl border border-border bg-card/50 p-4 text-xs shadow-sm hover:bg-card/75 transition-all duration-150">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="font-bold text-foreground text-sm">
                  {act.title}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRelativeTime(act.createdAt)}
                </span>
              </div>

              <p className="text-muted-foreground font-medium leading-relaxed mb-2.5">
                {act.description}
              </p>

              {/* Actor details */}
              {act.actor && (
                <div className="flex items-center gap-1.5 mt-1 border-t border-border/40 pt-2 pb-0.5">
                  <div className="h-5 w-5 rounded-md bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[8px] font-extrabold shadow-sm border border-indigo-400/20">
                    {getInitials(act.actor.name)}
                  </div>
                  <span className="text-[10px] font-bold text-foreground">
                    {act.actor.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Infinite load trigger / pagination */}
      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            className="inline-flex items-center justify-center px-4 py-2 border border-border bg-card hover:bg-secondary rounded-xl text-xs font-bold text-foreground transition-all disabled:opacity-50 cursor-pointer"
          >
            {isFetching ? 'Loading more...' : 'Load More Activities'}
          </button>
        </div>
      )}
    </div>
  );
}
