'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Download,
  X,
  Server,
  Calendar,
  User,
  Shield,
  Clock,
  ArrowRight,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { auditLogsService, authService } from '../services/api';

// TypeScript Interfaces
export interface AuditLogActor {
  id: string;
  name: string;
  email: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: any;
  after: any;
  ipAddress: string | null;
  createdAt: string;
  userId: string | null;
  user: AuditLogActor | null;
  organizationId: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AuditLogCenter() {
  // Filter States
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Drawer state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 1. Fetch Audit Logs matching filters
  const {
    data: logsData,
    isLoading: isLogsLoading,
    isError: isLogsError,
    refetch: refetchLogs
  } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', search, actionFilter, entityFilter, actorFilter, startDate, endDate, page, limit],
    queryFn: () =>
      auditLogsService.getAll({
        search: search || undefined,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        actorId: actorFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      }),
  });

  // 2. Fetch Workspace Members to populate actor dropdown selector
  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members-list'],
    queryFn: () => authService.getUsers(),
  });

  const logs = logsData?.data || [];
  const meta = logsData?.meta || { total: 0, page: 1, limit: 10, totalPages: 0 };

  // Helper to extract Entity Name from snapshots
  const getEntityName = (log: AuditLog): string => {
    const beforeObj = log.before;
    const afterObj = log.after;

    return (
      afterObj?.name ||
      beforeObj?.name ||
      afterObj?.title ||
      beforeObj?.title ||
      afterObj?.email ||
      beforeObj?.email ||
      log.entityId ||
      'N/A'
    );
  };

  // Helper to construct property diffs for visual diff viewer
  const getPropertyDiff = (before: any, after: any) => {
    const diffs: { key: string; before: any; after: any }[] = [];
    const beforeObj = before || {};
    const afterObj = after || {};

    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    const ignoredKeys = ['id', 'createdAt', 'updatedAt', 'organizationId', 'createdById', 'ownerId', 'deletedAt'];

    allKeys.forEach((key) => {
      if (ignoredKeys.includes(key)) return;

      const valBefore = beforeObj[key];
      const valAfter = afterObj[key];

      const strBefore = typeof valBefore === 'object' ? JSON.stringify(valBefore) : valBefore;
      const strAfter = typeof valAfter === 'object' ? JSON.stringify(valAfter) : valAfter;

      if (strBefore !== strAfter) {
        diffs.push({
          key,
          before: valBefore,
          after: valAfter,
        });
      }
    });

    return diffs;
  };

  // Handle Export CSV action
  const handleExportCSV = async () => {
    try {
      const blob = await auditLogsService.export({
        search: search || undefined,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        actorId: actorFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please try again.');
    }
  };

  // Handle row click
  const handleOpenDrawer = (log: AuditLog) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setSelectedLog(null);
    setDrawerOpen(false);
  };

  // Action badge style generator
  const getActionBadgeClass = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15';
      case 'UPDATE':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/15';
      case 'DELETE':
        return 'bg-red-500/10 text-red-400 border border-red-500/15';
      default:
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/15';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & CSV Export Button Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Audit Log Center</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Browse and query visual audit logs of all records creation, deletion, or modifications.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-xs transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Query Filters Bar */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative col-span-1 md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search action, entity ID, actor, IP address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-secondary/10 py-2.5 pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-card py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="relative">
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-card py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
            >
              <option value="">All Entity Types</option>
              <option value="COMPANY">COMPANY</option>
              <option value="CONTACT">CONTACT</option>
              <option value="DEAL">DEAL</option>
              <option value="TASK">TASK</option>
              <option value="USER">USER</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-border/40 items-center">
          {/* Actor Select Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase whitespace-nowrap flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" /> Actor
            </span>
            <select
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-card py-2 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
            >
              <option value="">All Operators</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Start */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase whitespace-nowrap flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Start
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-card py-2 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
            />
          </div>

          {/* Date Picker End */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase whitespace-nowrap flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> End
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-card py-2 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
            />
          </div>

          {/* Page Limit selector */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase whitespace-nowrap">Page Size</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-border bg-card py-2 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Entity Type</th>
                <th className="px-5 py-4">Entity Name / Scope</th>
                <th className="px-5 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs text-foreground">
              {isLogsLoading ? (
                // Skeletons State
                Array.from({ length: limit }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-4 w-28 bg-muted rounded-md" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 bg-muted rounded-md" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4.5 w-16 bg-muted rounded-md" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-20 bg-muted rounded-md" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-32 bg-muted rounded-md" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 bg-muted rounded-md" />
                    </td>
                  </tr>
                ))
              ) : isLogsError ? (
                // Error State
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                      <AlertTriangle className="h-9 w-9 text-rose-500" />
                      <h4 className="font-bold text-foreground text-sm">Query Connection Failed</h4>
                      <p className="text-[11px] text-muted-foreground">
                        An error occurred while fetching audit log details. Please verify your connection or permission state.
                      </p>
                      <button
                        onClick={() => refetchLogs()}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-[10px] transition-colors cursor-pointer"
                      >
                        Retry Query
                      </button>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <Server className="h-8 w-8 text-muted-foreground/50" />
                      <span>No cryptographic audit logs matched filter constraints.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                // Main Data Rows
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => handleOpenDrawer(log)}
                    className="hover:bg-muted/10 transition-all cursor-pointer"
                  >
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {log.user ? (
                        <div className="flex flex-col">
                          <span>{log.user.name || log.user.email}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-indigo-400 font-semibold">System</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-extrabold uppercase ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/30 px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold max-w-xs truncate">
                      {getEntityName(log)}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Controls */}
        {!isLogsLoading && !isLogsError && logs.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-secondary/15 px-6 py-4">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Showing page <strong className="text-foreground">{meta.page}</strong> of{' '}
              <strong className="text-foreground">{meta.totalPages}</strong> ({meta.total} total logs)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center justify-center p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="flex items-center justify-center p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Audit Details Drawer */}
      {drawerOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Drawer backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseDrawer}
          />
          {/* Drawer Panel content */}
          <div className="relative w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-secondary/10">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-extrabold text-foreground">Audit Log Metadata Details</span>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body content scroll region */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Operator details card */}
              <div className="rounded-2xl border border-border bg-secondary/20 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-base border border-white/10 shadow-md">
                    {selectedLog.user ? (selectedLog.user.name || selectedLog.user.email).charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">
                      {selectedLog.user ? selectedLog.user.name || 'Workspace Member' : 'System Actor'}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {selectedLog.user ? selectedLog.user.email : 'system@apex.com'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3 text-xs">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">IP Address</span>
                    <span className="font-semibold text-foreground">{selectedLog.ipAddress || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">Logged At</span>
                    <span className="font-semibold text-foreground">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Entity Scope Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" /> Operational Context
                </h3>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">Action</span>
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-extrabold uppercase ${getActionBadgeClass(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">Entity Type</span>
                      <span className="font-bold text-foreground uppercase">{selectedLog.entityType}</span>
                    </div>
                  </div>

                  {selectedLog.entityId && (
                    <div className="text-xs border-t border-border/40 pt-3">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">Entity Target ID</span>
                      <span className="font-mono text-muted-foreground text-[10px] select-all block bg-secondary/35 p-2 rounded-lg border border-border/30">
                        {selectedLog.entityId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Property Changes Visual Diff Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ArrowRight className="h-4 w-4 text-indigo-500" /> Visual Property Diffs
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const diffs = getPropertyDiff(selectedLog.before, selectedLog.after);
                    if (diffs.length === 0) {
                      return (
                        <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl font-medium">
                          No structural state diff updates to display.
                        </div>
                      );
                    }
                    return diffs.map((d) => (
                      <div key={d.key} className="rounded-xl border border-border bg-secondary/15 p-3 text-xs space-y-2">
                        <div className="font-bold uppercase text-[10px] tracking-wider text-indigo-400">
                          {d.key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          {/* Before State */}
                          <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 min-h-[48px]">
                            <span className="text-[9px] font-extrabold text-red-400 uppercase block mb-1">Before</span>
                            <span className="font-semibold text-red-400/90 line-through break-all text-[11px] block">
                              {d.before === null || d.before === undefined ? (
                                <span className="italic text-muted-foreground/45 normal-case font-normal">null</span>
                              ) : typeof d.before === 'object' ? (
                                JSON.stringify(d.before)
                              ) : (
                                String(d.before)
                              )}
                            </span>
                          </div>
                          {/* After State */}
                          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 min-h-[48px]">
                            <span className="text-[9px] font-extrabold text-emerald-400 uppercase block mb-1">After</span>
                            <span className="font-semibold text-emerald-400 break-all text-[11px] block">
                              {d.after === null || d.after === undefined ? (
                                <span className="italic text-muted-foreground/45 normal-case font-normal">null</span>
                              ) : typeof d.after === 'object' ? (
                                JSON.stringify(d.after)
                              ) : (
                                String(d.after)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
