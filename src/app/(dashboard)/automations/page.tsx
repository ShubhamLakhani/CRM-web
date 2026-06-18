'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Plus, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { automationsService, subscriptionService } from '@/services/api';
import { useAuth } from '@/providers/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/store/toastStore';
import RulesList from '@/components/automations/RulesList';
import RuleDetailsDrawer from '@/components/automations/RuleDetailsDrawer';
import AutomationDrawer from '@/components/automations/AutomationDrawer';
import StatsDashboard from '@/components/automations/StatsDashboard';
import ExecutionLogsTable from '@/components/automations/ExecutionLogsTable';
import RulesListSkeleton from '@/components/automations/RulesListSkeleton';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<any | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRuleForDetails, setSelectedRuleForDetails] = useState<any | null>(null);

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
      setActiveTab('rules');
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
  const rulesQuery = useQuery<any[]>({
    queryKey: ['automations', orgId],
    queryFn: () => automationsService.getAll(),
    enabled: !!orgId && canView && isEntitled && mounted,
  });

  // Display error toast if rulesQuery fails
  useEffect(() => {
    if (rulesQuery.isError) {
      const errMsg = rulesQuery.error instanceof Error ? rulesQuery.error.message : 'Could not pull workflow metadata configurations.';
      toast.error(`Rule loading failed: ${errMsg}`);
    }
  }, [rulesQuery.isError, rulesQuery.error]);

  const rules = useMemo(() => rulesQuery.data || [], [rulesQuery.data]);

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

  const handleEdit = (rule: any) => {
    setSelectedRuleForEdit(rule);
    setIsDrawerOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRuleForEdit(null);
    setIsDrawerOpen(true);
  };

  const handleViewDetails = (rule: any) => {
    setSelectedRuleForDetails(rule);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            onClick={handleCreateNew}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Automation</span>
          </button>
        )}
      </div>

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
          <RulesList
            rules={rules}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canCreate={canCreate}
            orgId={orgId}
          />
        )
      ) : (
        <div className="space-y-8">
          <StatsDashboard orgId={orgId} rules={rules} />
          <ExecutionLogsTable orgId={orgId} rules={rules} />
        </div>
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
    </div>
  );
}
