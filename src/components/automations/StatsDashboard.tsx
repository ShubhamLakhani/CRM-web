import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { automationsService } from '@/services/api';
import { AlertCircle, BarChart3, TrendingUp, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import StatsDashboardSkeleton from './StatsDashboardSkeleton';

interface Rule {
  id: string;
  name: string;
}

interface StatsDashboardProps {
  orgId: string;
  rules: Rule[];
}

export default function StatsDashboard({ orgId, rules }: StatsDashboardProps) {
  const [selectedRuleId, setSelectedRuleId] = React.useState('');

  const statsQuery = useQuery({
    queryKey: ['automations', 'stats', orgId, selectedRuleId],
    queryFn: () => automationsService.getStats(selectedRuleId || undefined),
    staleTime: 30 * 1000, // cache for 30s
  });

  const stats = statsQuery.data;

  if (statsQuery.isLoading) {
    return <StatsDashboardSkeleton />;
  }

  if (statsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-red-500/10 bg-red-500/5 text-center max-w-md mx-auto space-y-4">
        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/15">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Failed to load statistics</h3>
        <p className="text-xs text-muted-foreground">
          An error occurred while communicating with the telemetry server. Please verify connections.
        </p>
        <button
          onClick={() => statsQuery.refetch()}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs transition-colors cursor-pointer"
        >
          Retry Fetching
        </button>
      </div>
    );
  }

  const hasNoMetrics = !stats || stats.totalCount === 0;

  return (
    <div className="space-y-6">
      {/* Target Rule Filter Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          Filter Statistics
        </span>
        <select
          value={selectedRuleId}
          onChange={(e) => setSelectedRuleId(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-border bg-card py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer font-bold"
        >
          <option value="">Aggregated (All Rules)</option>
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name}
            </option>
          ))}
        </select>
      </div>

      {hasNoMetrics ? (
        <div className="flex flex-col items-center justify-center p-12 border border-border bg-card/65 backdrop-blur-sm rounded-2xl text-center max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
          <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border/60">
            <BarChart3 className="h-7 w-7 text-muted-foreground/60 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight uppercase">
              No Performance Metrics Registered
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              Performance percentages and execution logs will populate once events match your active rule conditions.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in duration-300">
          {/* Circular Success Rate Card */}
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-indigo-500/5 blur-3xl" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-4">
              Success Rate
            </span>

            {/* SVG Progress Circle */}
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-secondary/40"
                  strokeWidth="2.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Accent Fill Ring */}
                <path
                  className="text-indigo-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${stats.successRate}, 100`}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-foreground">{stats.successRate}%</span>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground/60 font-semibold mt-4">
              Calculated on completed runs
            </div>
          </div>

          {/* Value cards Grid */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total count */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-500" />
                  <span>Total Triggered</span>
                </span>
                <span className="text-[10px] font-extrabold text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded border border-border/50">
                  Runs
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">{stats.totalCount}</div>
              <div className="w-full bg-secondary/30 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full w-full" />
              </div>
            </div>

            {/* Success count */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Successful Steps</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                  Ok
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">{stats.successCount}</div>
              <div className="w-full bg-secondary/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${
                      stats.totalCount > 0 ? (stats.successCount / stats.totalCount) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Failed count */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  <span>Failed Executions</span>
                </span>
                <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/15">
                  Error
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">{stats.failedCount}</div>
              <div className="w-full bg-secondary/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{
                    width: `${
                      stats.totalCount > 0 ? (stats.failedCount / stats.totalCount) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Skipped count */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-border/80 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>Conditions Skipped</span>
                </span>
                <span className="text-[10px] font-extrabold text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded border border-border/50">
                  Skip
                </span>
              </div>
              <div className="text-3xl font-black text-foreground">{stats.skippedCount}</div>
              <div className="w-full bg-secondary/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-slate-500 h-full rounded-full"
                  style={{
                    width: `${
                      stats.totalCount > 0 ? (stats.skippedCount / stats.totalCount) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
