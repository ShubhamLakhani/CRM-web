import { X, Clock, XCircle, AlertCircle, Database, Calendar, Layers, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { automationsService } from '@/services/api';

interface ExecutionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionId: string | null;
}

const ERROR_CODE_DESCRIPTIONS: Record<string, string> = {
  SMTP_TIMEOUT: 'The connection to the SMTP mail server timed out. Check SMTP configurations or host connection limits.',
  EMAIL_DELIVERY_FAILURE: 'Failed to deliver SMTP email. The recipient server rejected the credentials or email address.',
  NOTIFICATION_FAILURE: 'Failed to record user-assigned in-app notification payload.',
  TASK_CREATION_FAILURE: 'Failed to write DB record or assign CRM task action to organization member.',
  UNKNOWN_ERROR: 'An unclassified runtime exception occurred in the execution engine pipeline.',
};

export default function ExecutionDetailsModal({
  isOpen,
  onClose,
  executionId,
}: ExecutionDetailsModalProps) {
  // Query telemetry logs from server
  const telemetryQuery = useQuery({
    queryKey: ['automations', 'telemetry', executionId],
    queryFn: () => automationsService.getExecutionTelemetry(executionId!),
    enabled: !!executionId && isOpen,
    staleTime: 10 * 1000,
  });

  if (!isOpen) return null;

  const data = telemetryQuery.data;
  const execution = data?.execution;
  const metadata = data?.metadata || {};
  const steps = data?.steps || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/15';
      case 'SKIPPED':
        return 'bg-slate-500/10 text-muted-foreground border border-border';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15';
    }
  };

  const getFriendlyActionName = (type: string) => {
    if (type === 'CREATE_TASK') return 'Create CRM Task';
    if (type === 'SEND_EMAIL') return 'Send Email Notification';
    if (type === 'SEND_NOTIFICATION') return 'Dispatch In-App Notification';
    return type.replace('_', ' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-secondary/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-bold text-foreground">Execution Telemetry Trace</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {telemetryQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <span className="text-xs text-muted-foreground font-semibold animate-pulse">
                  Querying execution pipeline traces...
                </span>
              </div>
            </div>
          ) : telemetryQuery.isError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center max-w-sm mx-auto space-y-4">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/15">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Trace Loading Failed</h3>
              <p className="text-xs text-muted-foreground">
                The trace payload is unavailable or has been garbage collected.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-secondary/15 rounded-xl border border-border p-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3 text-indigo-400" /> Version
                  </span>
                  <p className="text-sm font-black text-foreground font-mono">
                    v{metadata.ruleVersion || 1}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-indigo-400" /> Duration
                  </span>
                  <p className="text-sm font-black text-foreground font-mono">
                    {metadata.executionDurationMs !== undefined ? `${metadata.executionDurationMs}ms` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Database className="h-3 w-3 text-indigo-400" /> Step Count
                  </span>
                  <p className="text-sm font-black text-foreground font-mono">
                    {metadata.stepCount !== undefined ? metadata.stepCount : steps.length}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-indigo-400" /> Loop Depth
                  </span>
                  <p className="text-sm font-black text-foreground font-mono">
                    {metadata.loopDepth || 1}
                  </p>
                </div>
              </div>

              {/* Status details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                    Execution Details
                  </h4>
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase ${getStatusBadge(execution?.status)}`}>
                    {execution?.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Trigger Event / Type
                    </span>
                    <span className="text-foreground capitalize">
                      {execution?.triggerEvent.replace('_', ' ').toLowerCase()} ({execution?.triggerEntityType || 'Entity'})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Trigger Entity ID
                    </span>
                    <span className="text-foreground font-mono break-all font-medium select-all">
                      {execution?.triggerEntityId || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Triggered At
                    </span>
                    <span className="text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {execution?.startedAt ? new Date(execution.startedAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Actor User ID
                    </span>
                    <span className="text-foreground font-mono break-all font-medium select-all">
                      {metadata.actorId || 'System'}
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {execution?.errorMessage && (
                  <div className="bg-rose-500/10 border border-rose-500/15 rounded-xl p-3 text-xs leading-relaxed">
                    <span className="font-extrabold text-[10px] uppercase text-rose-400 tracking-wider block mb-1">
                      System Exception Log
                    </span>
                    <p className="text-rose-300 font-semibold font-mono break-all">
                      {execution.errorMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Steps timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground border-b border-border pb-2">
                  Action Steps Telemetry Breakdown
                </h4>
                {steps.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                    No actions executed in this run pipeline.
                  </div>
                ) : (
                  <div className="relative border-l border-border/80 pl-6 ml-3 space-y-5">
                    {steps.map((step: { status: string; actionType: string; durationMs?: number; errorCode?: string }, idx: number) => {
                      const isSuccess = step.status === 'SUCCESS';
                      return (
                        <div key={idx} className="relative">
                          {/* Left node dot */}
                          <div className={`absolute -left-[30px] top-0 h-4.5 w-4.5 rounded-full border-4 border-card flex items-center justify-center ${
                            isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />

                          <div className="space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-400">
                                Step {idx + 1}: {getFriendlyActionName(step.actionType)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-mono font-bold">
                                  {step.durationMs !== undefined ? `${step.durationMs}ms` : ''}
                                </span>
                                <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                  isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                                }`}>
                                  {step.status}
                                </span>
                              </div>
                            </div>

                            {/* Standard Error Display */}
                            {step.errorCode && (
                              <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400">
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>{step.errorCode}</span>
                                </div>
                                <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed">
                                  {ERROR_CODE_DESCRIPTIONS[step.errorCode] || ERROR_CODE_DESCRIPTIONS.UNKNOWN_ERROR}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Non-PII Resolved Variables snapshot */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-indigo-500" />
                  <span>PII-Safe Variables Evaluated</span>
                </h4>
                {(!metadata.evaluatedVariables || Object.keys(metadata.evaluatedVariables).length === 0) ? (
                  <div className="text-xs text-muted-foreground font-semibold">
                    No matching CRM variables resolved or evaluated for conditions in this run.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(metadata.evaluatedVariables as Record<string, Record<string, unknown>>).map(([entityType, fields]) => (
                      <div key={entityType} className="border border-border bg-secondary/5 rounded-xl p-3 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400/90 font-mono block">
                          {entityType} Entity Variables
                        </span>
                        <div className="divide-y divide-border/40 text-xs font-semibold">
                          {Object.entries(fields || {}).map(([field, val]) => (
                            <div key={field} className="py-1.5 flex justify-between gap-4">
                              <span className="text-muted-foreground font-mono text-[11px]">{field}</span>
                              <span className="text-foreground text-[11px] break-all max-w-[150px] text-right font-medium">
                                {val === null ? 'null' : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex h-16 items-center justify-end px-6 border-t border-border bg-secondary/10">
          <button
            onClick={onClose}
            className="rounded-xl border border-border bg-card hover:bg-secondary px-4 py-2.5 text-xs font-bold text-foreground transition-all cursor-pointer"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
}
