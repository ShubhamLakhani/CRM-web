import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { automationsService } from '@/services/api';
import { ChevronLeft, ChevronRight, AlertCircle, History, Filter } from 'lucide-react';
import ExecutionLogsSkeleton from './ExecutionLogsSkeleton';

interface Rule {
  id: string;
  name: string;
}

interface ExecutionLogsTableProps {
  orgId: string;
  rules: Rule[];
  onViewTelemetry: (id: string) => void;
}

export default function ExecutionLogsTable({ orgId, rules, onViewTelemetry }: ExecutionLogsTableProps) {
  // Query Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [ruleFilter, setRuleFilter] = useState('');

  const executionsQuery = useQuery({
    queryKey: ['automations', 'executions', orgId, page, limit, statusFilter, ruleFilter],
    queryFn: () =>
      automationsService.findExecutions({
        ruleId: ruleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit,
      }),
    staleTime: 15 * 1000, // cache for 15s
  });

  const response = executionsQuery.data;
  const logs = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  if (executionsQuery.isLoading) {
    return <ExecutionLogsSkeleton />;
  }

  if (executionsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-red-500/10 bg-red-500/5 text-center max-w-md mx-auto space-y-4">
        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/15">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Failed to load execution logs</h3>
        <p className="text-xs text-muted-foreground">
          An error occurred while connecting to the audit server database logs. Please retry.
        </p>
        <button
          onClick={() => executionsQuery.refetch()}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/15';
      case 'SKIPPED':
        return 'bg-slate-500/10 text-muted-foreground border-border';
      default: // STARTED
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Coordinates */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            <Filter className="h-4 w-4" /> Filter Rule
          </span>
          <select
            value={ruleFilter}
            onChange={(e) => {
              setRuleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-56 rounded-xl border border-border bg-card py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer font-semibold"
          >
            <option value="">All Rules</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            <Filter className="h-4 w-4" /> Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-44 rounded-xl border border-border bg-card py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="STARTED">Started</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-border bg-card/65 backdrop-blur-sm rounded-2xl text-center max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
          <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border/60">
            <History className="h-7 w-7 text-muted-foreground/60 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight uppercase">
              No Execution Audit Trace Available
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              When active workspace rules are triggered, their automated executions and traceback logs will be audited here.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Execution ID</th>
                  <th className="px-6 py-4">Automation Rule</th>
                  <th className="px-6 py-4">Trigger Event</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Trigger Time</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4 text-right">Telemetry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-foreground">
                {logs.map((log: {
                  id: string;
                  automationExecutionId: string;
                  rule?: { name: string } | null;
                  triggerEvent: string;
                  status: string;
                  startedAt: string;
                  errorMessage?: string | null;
                }) => (
                  <tr key={log.id} className="hover:bg-muted/5 transition-colors duration-150">
                    <td 
                      onClick={() => onViewTelemetry(log.id)}
                      className="px-6 py-4 font-mono text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer select-all max-w-[150px] truncate hover:underline"
                    >
                      {log.automationExecutionId}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {log.rule?.name || 'Deleted Rule'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-extrabold tracking-wide uppercase text-indigo-400/80 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                        {log.triggerEvent.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${getStatusBadge(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-muted-foreground max-w-xs truncate">
                      {log.errorMessage ? (
                        <span className="text-rose-400 font-bold" title={log.errorMessage}>
                          {log.errorMessage}
                        </span>
                      ) : log.status === 'SUCCESS' ? (
                        <span className="text-emerald-400 font-medium">Steps completed successfully.</span>
                      ) : log.status === 'SKIPPED' ? (
                        <span className="text-muted-foreground/60">Condition check evaluation: false.</span>
                      ) : (
                        'Execution active.'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onViewTelemetry(log.id)}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        View Trace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Custom Pagination bar */}
          <div className="border-t border-border bg-muted/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-semibold">
            <div>
              <span>
                Showing{' '}
                <span className="text-foreground font-extrabold">
                  {(meta.page - 1) * meta.limit + 1}
                </span>{' '}
                to{' '}
                <span className="text-foreground font-extrabold">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </span>{' '}
                of <span className="text-foreground font-extrabold">{meta.total}</span> records
              </span>
            </div>

            <div className="flex items-center gap-2 select-none">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card cursor-pointer transition-all"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <span className="font-bold text-foreground">
                Page {meta.page} of {meta.totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                disabled={page >= meta.totalPages}
                className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card cursor-pointer transition-all"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
