'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activitiesService } from '@/services/api';
import {
  Search,
  Sparkles,
  Clock,
  Plus,
  RefreshCw,
  TrendingUp,
  Trophy,
  CheckCircle2,
  UserPlus,
  UserCheck,
  MessageSquare
} from 'lucide-react';

export default function ActivityPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, contact, company, deal, task, user
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch activities using TanStack Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activities-feed', debouncedSearch, typeFilter, page],
    queryFn: () =>
      activitiesService.getAll(
        debouncedSearch || undefined,
        typeFilter === 'all' ? undefined : typeFilter,
        page,
        15
      ),
  });

  // Reset pagination state when filters or search change
  useEffect(() => {
    setPage(1);
    setActivities([]);
    setHasMore(true);
  }, [debouncedSearch, typeFilter]);

  // Sync loaded activities
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

  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
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

  // Group activities into Today, Yesterday, and Earlier
  const groupedActivities = useMemo(() => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const earlier: any[] = [];

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const todayTime = todayDate.getTime();
    const yesterdayTime = yesterdayDate.getTime();

    activities.forEach((act) => {
      const actDate = new Date(act.createdAt);
      const actDayStart = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate()).getTime();

      if (actDayStart === todayTime) {
        today.push(act);
      } else if (actDayStart === yesterdayTime) {
        yesterday.push(act);
      } else {
        earlier.push(act);
      }
    });

    return { today, yesterday, earlier };
  }, [activities]);

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Contacts', value: 'contact' },
    { label: 'Companies', value: 'company' },
    { label: 'Deals', value: 'deal' },
    { label: 'Tasks', value: 'task' },
    { label: 'Invitations', value: 'user' },
  ];

  const renderTimelineItems = (items: any[]) => {
    return items.map((act) => (
      <div key={act.id} className="relative group animate-in slide-in-from-bottom-2 duration-200">
        {/* Timeline node icon */}
        <div
          className={`absolute -left-9.5 top-0.5 h-7 w-7 rounded-xl bg-card border flex items-center justify-center shadow-sm z-10 ${getIconBg(
            act.action
          )}`}
        >
          {getIcon(act.action)}
        </div>

        {/* Content card */}
        <div className="rounded-2xl border border-border bg-card/50 p-4 text-xs shadow-sm hover:bg-card/75 hover:shadow-md transition-all duration-150 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm leading-tight">
                {act.title}
              </span>
              <span className="inline-flex items-center rounded-lg border border-border bg-secondary/60 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase text-muted-foreground">
                {act.entityType}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(act.createdAt)}
            </span>
          </div>

          <p className="text-muted-foreground font-medium leading-relaxed mb-3">
            {act.description}
          </p>

          {/* Actor display */}
          {act.actor && (
            <div className="flex items-center gap-1.5 mt-1 border-t border-border/40 pt-2.5 pb-0.5">
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
    ));
  };

  const renderSkeletons = () => (
    <div className="space-y-8">
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-4 animate-pulse">
          <div className="h-3 w-16 bg-muted/40 rounded pl-3.5 ml-3.5" />
          <div className="relative border-l border-border/60 pl-6 ml-3.5 space-y-6 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="relative flex gap-4">
                <div className="absolute -left-9.5 top-0.5 h-7 w-7 rounded-xl bg-muted/30 flex-shrink-0 border border-transparent" />
                <div className="flex-1 rounded-2xl border border-border bg-card/25 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4.5 w-1/3 bg-muted/40 rounded" />
                    <div className="h-3 w-12 bg-muted/40 rounded" />
                  </div>
                  <div className="h-3.5 w-3/4 bg-muted/30 rounded" />
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
                    <div className="h-5 w-5 rounded-md bg-muted/40" />
                    <div className="h-3 w-16 bg-muted/40 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/60 bg-card/20 flex flex-col items-center justify-center">
      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/15">
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">No activities found</h3>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        Try adjusting your filters or search query to locate registered interaction logs.
      </p>
    </div>
  );

  const hasAnyActivities = activities.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Activity Feed</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Audit logs timeline representing full CRM interaction coordinates.
        </p>
      </div>

      {/* Control filters bar */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search feed logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                typeFilter === opt.value
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-md shadow-indigo-600/10'
                  : 'bg-card border-border hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {isLoading && page === 1 ? (
        renderSkeletons()
      ) : !hasAnyActivities ? (
        renderEmptyState()
      ) : (
        <div className="space-y-8">
          {groupedActivities.today.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-indigo-500/80 tracking-wider uppercase pl-3.5">
                Today
              </h3>
              <div className="relative border-l border-border pl-6 ml-3.5 space-y-6 py-2">
                {renderTimelineItems(groupedActivities.today)}
              </div>
            </div>
          )}

          {groupedActivities.yesterday.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-indigo-500/80 tracking-wider uppercase pl-3.5">
                Yesterday
              </h3>
              <div className="relative border-l border-border pl-6 ml-3.5 space-y-6 py-2">
                {renderTimelineItems(groupedActivities.yesterday)}
              </div>
            </div>
          )}

          {groupedActivities.earlier.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-indigo-500/80 tracking-wider uppercase pl-3.5">
                Earlier
              </h3>
              <div className="relative border-l border-border pl-6 ml-3.5 space-y-6 py-2">
                {renderTimelineItems(groupedActivities.earlier)}
              </div>
            </div>
          )}

          {/* Load More trigger */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-border bg-card hover:bg-secondary rounded-xl text-xs font-bold text-foreground transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:shadow"
              >
                {isFetching ? 'Loading more...' : 'Load More Activities'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
