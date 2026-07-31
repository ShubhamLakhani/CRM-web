/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Plus, AlertTriangle, ShieldCheck, CreditCard, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationsService, subscriptionService } from '@/services/api';
import { useAuth } from '@/providers/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/store/toastStore';
import RulesList, { Rule } from '@/components/automations/RulesList';
import RuleDetailsDrawer from '@/components/automations/RuleDetailsDrawer';
import AutomationDrawer from '@/components/automations/AutomationDrawer';
import StatsDashboard from '@/components/automations/StatsDashboard';
import ExecutionLogsTable from '@/components/automations/ExecutionLogsTable';
import RulesListSkeleton from '@/components/automations/RulesListSkeleton';
import TemplatesLibrary, { AutomationTemplate } from '@/components/automations/TemplatesLibrary';
import TemplatePreviewModal from '@/components/automations/TemplatePreviewModal';
import ExecutionDetailsModal from '@/components/automations/ExecutionDetailsModal';

export default function AutomationsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId || user?.activeOrganizationId || '';
  
  const { hasPermission } = usePermissions();
  const canView = hasPermission('automations.view');
  const canCreate = hasPermission('automations.create');
  const canUpdate = hasPermission('automations.update');
  const canDelete = hasPermission('automations.delete');

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'audit'>('rules');

  // Drawer & Modal State management
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'library'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<Rule | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRuleForDetails, setSelectedRuleForDetails] = useState<Rule | null>(null);

  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  // Sorting & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'duration' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Workspace-switch synchronization
  useEffect(() => {
    if (orgId) {
      setIsDrawerOpen(false);
      setSelectedRuleForEdit(null);
      setIsDetailsOpen(false);
      setSelectedRuleForDetails(null);
      setIsTelemetryOpen(false);
      setSelectedExecutionId(null);
      setActiveTab('rules');
      setViewMode('list');
      setSelectedTemplate(null);
      setIsPreviewOpen(false);
    }
  }, [orgId]);

  // Query Current Subscription for Gating
  const subscriptionQuery = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => subscriptionService.getCurrent(),
    enabled: !!orgId && mounted,
    staleTime: 5 * 60 * 1000,
  });

  const isEntitled = !!subscriptionQuery.data?.plan?.automation;

  // Query Rules List
  const rulesQuery = useQuery<Rule[]>({
    queryKey: ['automations', orgId],
    queryFn: () => automationsService.getAll(),
    enabled: !!orgId && canView && isEntitled && mounted,
  });

  // Query metadata for user listings inside preview modal
  const metadataQuery = useQuery({
    queryKey: ['automations', 'metadata', orgId],
    queryFn: () => automationsService.getMetadata(),
    enabled: isPreviewOpen && mounted,
  });

  // Fetch static library templates
  const templatesQuery = useQuery<AutomationTemplate[]>({
    queryKey: ['automations', 'templates'],
    queryFn: () => automationsService.getTemplates(),
    enabled: viewMode === 'library' && mounted,
  });

  // Instantiate template mutation
  const instantiateMutation = useMutation({
    mutationFn: ({ id, overrides }: { id: string; overrides: Record<string, unknown> }) =>
      automationsService.instantiateTemplate(id, overrides),
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const errMsg = err.response?.data?.message || 'Failed to instantiate template';
      const formattedMsg = Array.isArray(errMsg) ? errMsg[0] : errMsg;
      toast.error(formattedMsg);
    },
    onSuccess: () => {
      toast.success('Workflow created from template successfully');
      queryClient.invalidateQueries({ queryKey: ['automations', orgId] });
      setIsPreviewOpen(false);
      setSelectedTemplate(null);
      setViewMode('list');
    },
  });

  // Display error toast if rulesQuery fails
  useEffect(() => {
    if (rulesQuery.isError) {
      const errMsg = rulesQuery.error instanceof Error ? rulesQuery.error.message : 'Could not pull workflow metadata configurations.';
      toast.error(`Rule loading failed: ${errMsg}`);
    }
  }, [rulesQuery.isError, rulesQuery.error]);

  const rules = useMemo(() => rulesQuery.data || [], [rulesQuery.data]);

  // Query Rules Stats
  const statsQuery = useQuery({
    queryKey: ['automations', 'stats', orgId],
    queryFn: () => automationsService.getStats(),
    enabled: !!orgId && canView && isEntitled && mounted,
  });

  const ruleStatsMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    if (statsQuery.data?.rules) {
      statsQuery.data.rules.forEach((r: { ruleId: string; [key: string]: unknown }) => {
        map[r.ruleId] = r;
      });
    }
    return map;
  }, [statsQuery.data]);

  const enrichedRules = useMemo<Rule[]>(() => {
    const list = rulesQuery.data || [];
    return list.map((rule: Rule) => ({
      ...rule,
      stats: (ruleStatsMap[rule.id] as any) || {
        totalRuns: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        successRate: 100.0,
        averageDurationMs: 0,
        lastRunAt: null,
        lastSuccessAt: null,
        lastFailureAt: null,
        health: 'UNKNOWN',
      },
    }));
  }, [rulesQuery.data, ruleStatsMap]);

  const processedRules = useMemo(() => {
    let list = [...enrichedRules];

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    // 2. Health status filter
    if (healthFilter !== 'ALL') {
      list = list.filter((r) => r.stats?.health === healthFilter);
    }

    // 3. Enabled/Disabled filter
    if (statusFilter !== 'ALL') {
      const wantEnabled = statusFilter === 'ENABLED';
      list = list.filter((r) => r.isEnabled === wantEnabled);
    }

    // 4. Sort
    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'health') {
        const healthRank = { CRITICAL: 0, WARNING: 1, HEALTHY: 2, UNKNOWN: 3 };
        valA = healthRank[a.stats?.health as keyof typeof healthRank] ?? 3;
        valB = healthRank[b.stats?.health as keyof typeof healthRank] ?? 3;
      } else if (sortBy === 'duration') {
        valA = a.stats?.averageDurationMs || 0;
        valB = b.stats?.averageDurationMs || 0;
      } else {
        // created
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [enrichedRules, searchQuery, healthFilter, statusFilter, sortBy, sortOrder]);

  // Loading indicator for mounting or initial subscription check
  if (!mounted || subscriptionQuery.isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground font-semibold animate-pulse">
            Verifying organization credentials...
          </span>
        </div>
      </div>
    );
  }

  // 1. Subscription Plan Entitlement Gate
  if (!isEntitled) {
    return (
      <div className="max-w-md mx-auto my-12 border border-border bg-card p-8 rounded-2xl shadow-xl space-y-6 text-center animate-in fade-in duration-300">
        <div className="h-14 w-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/15 mx-auto">
          <CreditCard className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Workflow Automation is Locked</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your current subscription plan does not support custom automation rules builder engines. Upgrade to Growth or Agency plans to automate workflows.
          </p>
        </div>

        <a
          href="/settings"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-3 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
        >
          <span>Upgrade Workspace Subscription</span>
        </a>
      </div>
    );
  }

  // 2. RBAC Permissions Gate
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] max-w-md mx-auto text-center space-y-4 animate-in fade-in duration-300">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/15">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Access Denied</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You do not have the required permissions (`automations.view`) to access workflow automation parameters in this workspace.
        </p>
      </div>
    );
  }

  if (rulesQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-sm mx-auto space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/15">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Failed to load automations</h3>
        <p className="text-xs text-muted-foreground">
          {rulesQuery.error instanceof Error ? rulesQuery.error.message : 'Could not pull workflow metadata configurations.'}
        </p>
        <button
          onClick={() => rulesQuery.refetch()}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs transition-colors cursor-pointer"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const handleEdit = (rule: Rule) => {
    setSelectedRuleForEdit(rule);
    setIsDrawerOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRuleForEdit(null);
    setIsDrawerOpen(true);
  };

  const handleViewDetails = (rule: Rule) => {
    setSelectedRuleForDetails(rule);
    setIsDetailsOpen(true);
  };

  const handleSelectTemplate = (template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleInstantiate = (overrides: Record<string, unknown>) => {
    if (selectedTemplate) {
      instantiateMutation.mutate({ id: selectedTemplate.id, overrides });
    }
  };

  const handleCustomize = (prefilledState: Record<string, unknown>) => {
    setIsPreviewOpen(false);
    setSelectedTemplate(null);
    setSelectedRuleForEdit({
      id: '', // Empty ID represents new rule but prefilled
      ...prefilledState,
    } as any);
    setIsDrawerOpen(true);
    setViewMode('list');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {viewMode === 'list' ? (
          <>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <span>Workflow Automations</span>
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Configure dynamic rules to assign tasks, notify operators, and send SMTPs on CRM event signals.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setViewMode('library')}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New Automation</span>
              </button>
            )}
          </>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <span>Templates Library</span>
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Select a workflow recipe to instantiate or customize in the builder.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Rules</span>
              </button>
              {canCreate && (
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Start From Scratch</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* View Mode Switching */}
      {viewMode === 'list' ? (
        <>
          {/* Tabs navigation */}
          <div className="border-b border-border/80 flex gap-6 text-sm font-semibold select-none">
            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'rules'
                  ? 'border-indigo-500 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Rules List
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Runs History & Telemetry
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === 'rules' ? (
            rulesQuery.isLoading ? (
              <RulesListSkeleton />
            ) : (
              <div className="space-y-6">
                {/* Search, Sort, Filter Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/60 backdrop-blur-sm border border-border p-4 rounded-2xl">
                  {/* Search Bar */}
                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Search rules..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    {/* Status filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
                      <select
                        value={statusFilter}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as 'ALL' | 'ENABLED' | 'DISABLED')}
                        className="rounded-xl border border-border bg-card py-2 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 cursor-pointer font-semibold"
                      >
                        <option value="ALL">All Status</option>
                        <option value="ENABLED">Enabled</option>
                        <option value="DISABLED">Disabled</option>
                      </select>
                    </div>

                    {/* Health Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Health</span>
                      <select
                        value={healthFilter}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setHealthFilter(e.target.value as 'ALL' | 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN')}
                        className="rounded-xl border border-border bg-card py-2 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 cursor-pointer font-semibold"
                      >
                        <option value="ALL">All Health</option>
                        <option value="HEALTHY">Healthy</option>
                        <option value="WARNING">Warning</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                    </div>

                    {/* Sort By */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort By</span>
                      <select
                        value={sortBy}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as 'name' | 'health' | 'duration' | 'created')}
                        className="rounded-xl border border-border bg-card py-2 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 cursor-pointer font-semibold"
                      >
                        <option value="created">Date Created</option>
                        <option value="name">Name</option>
                        <option value="health">Health State</option>
                        <option value="duration">Execution Duration</option>
                      </select>
                    </div>

                    {/* Sort Order Toggle */}
                    <button
                      onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all cursor-pointer"
                    >
                      {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                    </button>
                  </div>
                </div>

                <RulesList
                  rules={processedRules}
                  onEdit={handleEdit}
                  onViewDetails={handleViewDetails}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  canCreate={canCreate}
                  orgId={orgId}
                />
              </div>
            )
          ) : (
            <div className="space-y-8">
              <StatsDashboard orgId={orgId} rules={rules} />
              <ExecutionLogsTable 
                orgId={orgId} 
                rules={rules} 
                onViewTelemetry={(id) => {
                  setSelectedExecutionId(id);
                  setIsTelemetryOpen(true);
                }}
              />
            </div>
          )}
        </>
      ) : (
        templatesQuery.isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <span className="text-xs text-muted-foreground font-semibold animate-pulse">
                Loading templates library catalog...
              </span>
            </div>
          </div>
        ) : (
          <TemplatesLibrary
            templates={templatesQuery.data || []}
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setViewMode('list')}
          />
        )
      )}

      {/* Dynamic Creation/Edit Form Drawer */}
      <AutomationDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRuleForEdit(null);
        }}
        rule={selectedRuleForEdit}
        orgId={orgId}
      />

      {/* Dynamic Read-only details drawer */}
      <RuleDetailsDrawer
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedRuleForDetails(null);
        }}
        rule={selectedRuleForDetails}
      />

      {/* Template Preview and Configuration Override Dialog */}
      <TemplatePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        organizationUsers={metadataQuery.data?.organizationUsers || []}
        onInstantiate={handleInstantiate}
        onCustomize={handleCustomize}
        isPending={instantiateMutation.isPending}
      />

      {/* Execution details telemetry trace modal */}
      <ExecutionDetailsModal
        isOpen={isTelemetryOpen}
        onClose={() => {
          setIsTelemetryOpen(false);
          setSelectedExecutionId(null);
        }}
        executionId={selectedExecutionId}
      />
    </div>
  );
}
