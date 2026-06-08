import React, { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { subscriptionService } from '../services/api';
import {
  Check,
  X,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Users,
  Contact,
  TrendingUp,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxUsers: number;
  maxContacts: number;
  maxDeals: number;
  aiAssistant: boolean;
  emailSync: boolean;
  automation: boolean;
  clientPortal: boolean;
}

interface UsageMetricDetails {
  usage: number;
  limit: number;
  remaining: number;
}

interface UsageData {
  users: UsageMetricDetails;
  contacts: UsageMetricDetails;
  deals: UsageMetricDetails;
  features: Record<string, boolean>;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  plan: Plan;
}

export default function BillingCenter() {
  const { user } = useAuth();
  const orgId = user?.organizationId || user?.activeOrganizationId;

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Flow states
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // Fetch all billing and usage metrics
  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subData, usageData, plansData] = await Promise.all([
        subscriptionService.getCurrent(),
        subscriptionService.getUsage(),
        subscriptionService.getPlans(),
      ]);
      setSub(subData);
      setUsage(usageData);
      setPlans(plansData);
    } catch (err: any) {
      console.error('Failed to load billing metrics:', err);
      setError(
        err.response?.data?.message ||
          'Could not retrieve subscription details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Sync details on workspace switches
  useEffect(() => {
    if (orgId) {
      fetchBillingData();
    }
  }, [orgId]);

  const handlePlanChangeClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setChangeError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmChangePlan = async () => {
    if (!selectedPlan || !orgId) return;

    // Client-side downgrade check
    if (usage) {
      const isDowngrade = selectedPlan.price < (sub?.plan?.price || 0);
      const exceedUsers = usage.users.usage > selectedPlan.maxUsers;
      const exceedContacts = usage.contacts.usage > selectedPlan.maxContacts;
      const exceedDeals = usage.deals.usage > selectedPlan.maxDeals;

      if (isDowngrade && (exceedUsers || exceedContacts || exceedDeals)) {
        setChangeError(
          `Cannot downgrade: Current usage exceeds the target limits of the ${selectedPlan.name}.`
        );
        return;
      }
    }

    setIsChangingPlan(true);
    setChangeError(null);
    try {
      const updatedSub = await subscriptionService.changePlan(selectedPlan.id);
      setSub(updatedSub);
      // Refresh usage to sync limits automatically
      const updatedUsage = await subscriptionService.getUsage();
      setUsage(updatedUsage);
      setShowConfirmModal(false);
      setSelectedPlan(null);
    } catch (err: any) {
      console.error('Failed to change subscription plan:', err);
      setChangeError(
        err.response?.data?.message ||
          'Failed to execute subscription plan change. Please verify limits.'
      );
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Helper for progress bar color thresholds
  const getProgressColor = (usage: number, limit: number) => {
    const percentage = limit > 0 ? (usage / limit) * 100 : 100;
    if (percentage >= 90) return 'bg-rose-500 text-rose-400';
    if (percentage >= 70) return 'bg-amber-500 text-amber-400';
    return 'bg-emerald-500 text-emerald-400';
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Loading skeleton state template
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Current Plan Card Loader */}
        <div className="rounded-2xl border border-border bg-card/50 p-6 h-40 space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>

        {/* Usage Row Loader */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/50 p-5 h-36 space-y-4">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-6 bg-muted rounded w-1/2" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
          ))}
        </div>

        {/* Feature List Loader */}
        <div className="rounded-2xl border border-border bg-card/50 p-6 h-48 space-y-3">
          <div className="h-4 bg-muted rounded w-1/5" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-muted rounded w-2/3" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error Card Template
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-6 space-y-4 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">Billing Data Unreachable</h3>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={fetchBillingData}
          className="mx-auto flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-secondary px-4 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  if (!sub || !usage) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs font-bold text-muted-foreground">
        No active subscription workspace session found.
      </div>
    );
  }

  const activePlanId = sub.planId;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* SECTION 1 - CURRENT PLAN CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md transition-colors duration-200">
        {/* Glow backdrop decorator */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
              Current Subscription
            </span>
            <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
              <span>{sub.plan.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize shadow-sm">
                {sub.status.toLowerCase()}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span>Started: {formatDate(sub.startDate)}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                <span>Price: ${sub.plan.price}/month</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 bg-secondary/35 border border-border/40 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Current Cost
            </span>
            <span className="text-xl font-black text-foreground">
              ${sub.plan.price} <span className="text-xs font-semibold text-muted-foreground">/mo</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2 - USAGE DASHBOARD RESOURCE CARDS */}
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-4">
          Resource Consumption Quotas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Users */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <span>Team Members</span>
              </span>
              <span className="text-[10px] font-extrabold text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-md border border-border/50">
                Limit: {sub.plan.maxUsers}
              </span>
            </div>
            
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-black text-foreground">
                {usage.users.usage} <span className="text-xs font-semibold text-muted-foreground">/ {sub.plan.maxUsers}</span>
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {usage.users.remaining} Remaining
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3.5 w-full rounded-full bg-secondary/50 h-2 overflow-hidden border border-border/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                  usage.users.usage,
                  sub.plan.maxUsers
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    sub.plan.maxUsers > 0
                      ? (usage.users.usage / sub.plan.maxUsers) * 100
                      : 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Card 2: Contacts */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Contact className="h-4 w-4 text-indigo-500" />
                <span>CRM Contacts</span>
              </span>
              <span className="text-[10px] font-extrabold text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-md border border-border/50">
                Limit: {sub.plan.maxContacts}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-black text-foreground">
                {usage.contacts.usage} <span className="text-xs font-semibold text-muted-foreground">/ {sub.plan.maxContacts}</span>
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {usage.contacts.remaining} Remaining
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3.5 w-full rounded-full bg-secondary/50 h-2 overflow-hidden border border-border/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                  usage.contacts.usage,
                  sub.plan.maxContacts
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    sub.plan.maxContacts > 0
                      ? (usage.contacts.usage / sub.plan.maxContacts) * 100
                      : 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Card 3: Deals */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <span>Pipeline Deals</span>
              </span>
              <span className="text-[10px] font-extrabold text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-md border border-border/50">
                Limit: {sub.plan.maxDeals}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-black text-foreground">
                {usage.deals.usage} <span className="text-xs font-semibold text-muted-foreground">/ {sub.plan.maxDeals}</span>
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {usage.deals.remaining} Remaining
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3.5 w-full rounded-full bg-secondary/50 h-2 overflow-hidden border border-border/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                  usage.deals.usage,
                  sub.plan.maxDeals
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    sub.plan.maxDeals > 0
                      ? (usage.deals.usage / sub.plan.maxDeals) * 100
                      : 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 - FEATURE ENTITLEMENTS CARD */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
          <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
          <span>Active Plan Entitlements</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'AI_ASSISTANT', label: 'AI Relationship Assistant' },
            { key: 'EMAIL_SYNC', label: 'Email Conversation Sync' },
            { key: 'AUTOMATION', label: 'Workflow Automations' },
            { key: 'CLIENT_PORTAL', label: 'Collaborative Client Portal' },
          ].map((feat) => {
            const hasFeature = !!usage.features[feat.key];
            return (
              <div
                key={feat.key}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  hasFeature
                    ? 'bg-indigo-500/5 border-indigo-500/15 text-foreground'
                    : 'bg-secondary/20 border-border/40 text-muted-foreground'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
                    hasFeature
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                      : 'bg-secondary/40 border-border/50 text-muted-foreground/50'
                  }`}
                >
                  {hasFeature ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="text-xs font-bold">{feat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4 - PLAN CATALOG GRID */}
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-4">
          Upgrade & Downgrade Options
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all ${
                  isActive
                    ? 'border-indigo-500 ring-1 ring-indigo-500/20 scale-[1.01]'
                    : 'border-border hover:border-border/80'
                }`}
              >
                {/* Banner Badge for Current Plan */}
                {isActive && (
                  <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-0 mr-4 text-[9px] font-black uppercase bg-indigo-600 text-white rounded-full px-3 py-1 shadow-md border border-indigo-500">
                    Active Plan
                  </span>
                )}

                <div className="space-y-1.5 pb-4 border-b border-border/60">
                  <h4 className="text-lg font-black text-foreground">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground font-medium min-h-[32px] leading-relaxed">
                    {plan.description || 'All core CRM modules for team organization.'}
                  </p>
                  <div className="pt-2 flex items-baseline">
                    <span className="text-2xl font-black text-foreground">${plan.price}</span>
                    <span className="text-xs font-semibold text-muted-foreground ml-1">/mo</span>
                  </div>
                </div>

                {/* Quotas */}
                <div className="space-y-3 py-5 flex-1">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">
                    Limits & Scale
                  </span>
                  
                  <div className="space-y-2 text-xs font-semibold text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Team Users:</span>
                      <span>{plan.maxUsers} limit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CRM Contacts:</span>
                      <span>{plan.maxContacts} limit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pipeline Deals:</span>
                      <span>{plan.maxDeals} limit</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block pt-3">
                    Features
                  </span>

                  <div className="space-y-2 text-xs font-semibold">
                    {[
                      { key: plan.aiAssistant, label: 'AI Assistant' },
                      { key: plan.emailSync, label: 'Email Sync' },
                      { key: plan.automation, label: 'Automations' },
                      { key: plan.clientPortal, label: 'Client Portal' },
                    ].map((f, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 ${
                          f.key ? 'text-foreground font-bold' : 'text-muted-foreground/50'
                        }`}
                      >
                        {f.key ? (
                          <Check className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Action button */}
                <div className="pt-4">
                  {isActive ? (
                    <div className="w-full text-center py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs font-bold text-indigo-400">
                      Currently Selected
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePlanChangeClick(plan)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer ${
                        plan.price > sub.plan.price
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white'
                          : 'bg-secondary hover:bg-secondary/70 border border-border text-foreground'
                      }`}
                    >
                      <span>{plan.price > sub.plan.price ? 'Upgrade' : 'Downgrade'}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIRMATION / CHANGE PLAN FLOW MODAL */}
      {showConfirmModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in scale-in duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-500" />
                <span>Confirm Subscription Update</span>
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Plan Comparison Summary */}
            <div className="flex items-center justify-between bg-secondary/35 border border-border/40 p-4 rounded-xl">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase">Current Plan</span>
                <div className="text-sm font-bold text-foreground">{sub.plan.name}</div>
                <div className="text-xs text-muted-foreground font-medium">${sub.plan.price}/mo</div>
              </div>
              <ArrowRight className="h-5 w-5 text-indigo-500 flex-shrink-0 mx-2" />
              <div className="space-y-1 text-right">
                <span className="text-[9px] font-black text-muted-foreground uppercase">Target Plan</span>
                <div className="text-sm font-bold text-indigo-400">{selectedPlan.name}</div>
                <div className="text-xs text-muted-foreground font-medium">${selectedPlan.price}/mo</div>
              </div>
            </div>

            {/* Comparison Details Table */}
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">
                Resource Quota Changes
              </span>

              <div className="divide-y divide-border/60 text-xs font-semibold">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">User Limit:</span>
                  <span className="flex items-center gap-1.5">
                    <span>{sub.plan.maxUsers}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                    <span className={selectedPlan.maxUsers < sub.plan.maxUsers ? 'text-amber-500' : 'text-indigo-400'}>
                      {selectedPlan.maxUsers}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Contact Limit:</span>
                  <span className="flex items-center gap-1.5">
                    <span>{sub.plan.maxContacts}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                    <span className={selectedPlan.maxContacts < sub.plan.maxContacts ? 'text-amber-500' : 'text-indigo-400'}>
                      {selectedPlan.maxContacts}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Deal Limit:</span>
                  <span className="flex items-center gap-1.5">
                    <span>{sub.plan.maxDeals}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                    <span className={selectedPlan.maxDeals < sub.plan.maxDeals ? 'text-amber-500' : 'text-indigo-400'}>
                      {selectedPlan.maxDeals}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Entitlements Changes Summary */}
            <div className="space-y-3 bg-secondary/10 border border-border/40 p-4 rounded-xl">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">
                Feature Additions / Reductions
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-foreground">
                {[
                  { label: 'AI Assistant', cur: sub.plan.aiAssistant, tgt: selectedPlan.aiAssistant },
                  { label: 'Email Sync', cur: sub.plan.emailSync, tgt: selectedPlan.emailSync },
                  { label: 'Automations', cur: sub.plan.automation, tgt: selectedPlan.automation },
                  { label: 'Client Portal', cur: sub.plan.clientPortal, tgt: selectedPlan.clientPortal },
                ].map((item, index) => {
                  let badge = null;
                  if (item.tgt && !item.cur) {
                    badge = <span className="text-[8px] px-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded uppercase">Gain</span>;
                  } else if (!item.tgt && item.cur) {
                    badge = <span className="text-[8px] px-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded uppercase">Lose</span>;
                  }
                  return (
                    <div key={index} className="flex items-center justify-between p-1 text-[11px] font-semibold text-muted-foreground">
                      <span>{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={item.tgt ? 'text-indigo-400' : 'text-muted-foreground/40'}>
                          {item.tgt ? 'Yes' : 'No'}
                        </span>
                        {badge}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 6 - DOWNGRADE VALIDATION ERROR UX */}
            {changeError && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 space-y-2.5">
                <div className="flex items-start gap-2 text-xs font-bold text-red-400">
                  <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span>Validation Failed</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                      {changeError}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5 space-y-1.5 text-[10px] font-mono text-muted-foreground">
                  <div className="font-extrabold text-red-400 uppercase tracking-widest text-[9px]">Current Workspace Usage:</div>
                  <div className="flex justify-between">
                    <span>Users:</span>
                    <span className={usage.users.usage > selectedPlan.maxUsers ? 'text-rose-400 font-bold' : ''}>
                      {usage.users.usage} / {selectedPlan.maxUsers} limit
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contacts:</span>
                    <span className={usage.contacts.usage > selectedPlan.maxContacts ? 'text-rose-400 font-bold' : ''}>
                      {usage.contacts.usage} / {selectedPlan.maxContacts} limit
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deals:</span>
                    <span className={usage.deals.usage > selectedPlan.maxDeals ? 'text-rose-400 font-bold' : ''}>
                      {usage.deals.usage} / {selectedPlan.maxDeals} limit
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
              <button
                disabled={isChangingPlan}
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-border bg-card hover:bg-secondary px-4 py-2.5 text-xs font-bold text-foreground shadow-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isChangingPlan}
                onClick={handleConfirmChangePlan}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-2.5 px-5 text-xs font-bold text-white shadow-lg cursor-pointer transition-all flex items-center gap-1.5"
              >
                {isChangingPlan ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Change Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
