import React from 'react';
import { X, Zap, CheckCircle2, AlertTriangle, PlayCircle, ShieldAlert, ArrowDown } from 'lucide-react';

interface Action {
  id: string;
  actionType: string;
  configurationJson: Record<string, any>;
}

interface Rule {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  conditionsJson: any;
  isEnabled: boolean;
  version: number;
  failureCount: number;
  lastFailureAt: string | null;
  actions: Action[];
}

interface RuleDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rule: Rule | null;
}

export default function RuleDetailsDrawer({ isOpen, onClose, rule }: RuleDetailsDrawerProps) {
  if (!isOpen || !rule) return null;

  // Formatting date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const conditionsList = Array.isArray(rule.conditionsJson)
    ? rule.conditionsJson
    : rule.conditionsJson && typeof rule.conditionsJson === 'object' && Object.keys(rule.conditionsJson).length > 0
    ? [rule.conditionsJson]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-secondary/10">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-bold text-foreground">Automation Details</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Metrics Banner */}
          <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">{rule.name}</h2>
              <span
                className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                  rule.isEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                    : 'bg-secondary/40 text-muted-foreground border-border'
                }`}
              >
                {rule.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {rule.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>
            )}

            {/* Diagnostics Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Rule Version
                </span>
                <span className="font-bold text-foreground">v{rule.version}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Failures count
                </span>
                <span
                  className={`font-bold ${
                    rule.failureCount > 0 ? 'text-rose-400 font-extrabold' : 'text-foreground'
                  }`}
                >
                  {rule.failureCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Last Failure
                </span>
                <span className="font-semibold text-foreground truncate block" title={formatDate(rule.lastFailureAt)}>
                  {formatDate(rule.lastFailureAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Trigger Event Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Trigger Triggering Event
            </h3>
            <div className="p-3.5 rounded-xl border border-border bg-secondary/15 flex items-center gap-2.5 text-xs text-foreground font-bold">
              <PlayCircle className="h-4.5 w-4.5 text-indigo-400" />
              <span>{rule.triggerEvent.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Conditions matching section */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              AND Conditions Criteria
            </h3>
            {conditionsList.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-border bg-secondary/5 text-xs text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-slate-400" />
                <span>No filtering conditions configured. Triggers on every event.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {conditionsList.map((cond, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border bg-secondary/25 flex flex-wrap gap-2 text-xs font-semibold"
                  >
                    <span className="text-indigo-400 font-mono">{cond.field}</span>
                    <span className="text-muted-foreground/80 lowercase">{cond.operator.replace('_', ' ')}</span>
                    {cond.value !== null && cond.value !== undefined && (
                      <span className="text-foreground font-bold font-mono">"{cond.value}"</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions workflow section */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Actions sequence
            </h3>
            <div className="space-y-3">
              {rule.actions.map((act, index) => (
                <div key={act.id} className="relative">
                  {index > 0 && (
                    <div className="flex justify-center -my-2.5">
                      <ArrowDown className="h-4.5 w-4.5 text-indigo-500/50" />
                    </div>
                  )}

                  <div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400" />
                      <span>
                        Step {index + 1}: {act.actionType.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 rounded-lg p-3 text-[11px] font-mono text-muted-foreground space-y-1 overflow-x-auto">
                      {Object.entries(act.configurationJson).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <span className="text-indigo-300 font-semibold">{k}:</span>
                          <span className="text-foreground truncate select-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
