import React, { useState, useEffect } from 'react';
import { X, PlayCircle, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationsService } from '@/services/api';
import { toast } from '@/store/toastStore';
import ConditionsBuilder from './ConditionsBuilder';
import ActionsBuilder from './ActionsBuilder';
import TemplateHelperPanel from './TemplateHelperPanel';
import AutomationDrawerSkeleton from './AutomationDrawerSkeleton';

interface Action {
  id?: string;
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
  actions: Action[];
}

interface AutomationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rule: Rule | null; // Null if creating a new rule
  orgId: string;
}

export default function AutomationDrawer({
  isOpen,
  onClose,
  rule,
  orgId,
}: AutomationDrawerProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!(rule && rule.id);

  // Form local states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [conditionsJson, setConditionsJson] = useState<any[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [actions, setActions] = useState<Action[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch metadata definitions
  const metadataQuery = useQuery({
    queryKey: ['automations', 'metadata', orgId],
    queryFn: () => automationsService.getMetadata(),
    enabled: isOpen,
    staleTime: Infinity,
  });

  const metadata = metadataQuery.data || { triggers: [], conditionFields: [], actionTypes: [] };

  // Toast if metadata loading fails
  useEffect(() => {
    if (metadataQuery.isError) {
      const errMsg = metadataQuery.error instanceof Error ? metadataQuery.error.message : 'Failed to load automation parameters';
      toast.error(`Rule loading failed: ${errMsg}`);
    }
  }, [metadataQuery.isError, metadataQuery.error]);

  // Set default form values when metadata is loaded or rule changes
  useEffect(() => {
    if (isOpen && metadataQuery.isSuccess) {
      if (rule) {
        setName(rule.name);
        setDescription(rule.description || '');
        setTriggerEvent(rule.triggerEvent);
        setIsEnabled(rule.isEnabled);
        
        // Parse conditions safely
        const parsedConditions = Array.isArray(rule.conditionsJson)
          ? rule.conditionsJson
          : rule.conditionsJson && typeof rule.conditionsJson === 'object' && Object.keys(rule.conditionsJson).length > 0
          ? [rule.conditionsJson]
          : [];
        setConditionsJson(parsedConditions);

        // Map actions configuration
        setActions(
          rule.actions.map((a) => ({
            actionType: a.actionType,
            configurationJson: JSON.parse(JSON.stringify(a.configurationJson)),
          }))
        );
      } else {
        // Default values for new rule
        setName('');
        setDescription('');
        setTriggerEvent(metadata.triggers[0]?.value || '');
        setConditionsJson([]);
        setIsEnabled(true);
        setActions([]);
      }
      setFormError(null);
    }
  }, [isOpen, rule, metadataQuery.isSuccess, metadataQuery.data]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => automationsService.create(data),
    onError: (err: any) => {
      const errMsg = err.response?.data?.message;
      const formattedMsg = Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to create automation';
      setFormError(formattedMsg);
      toast.error(formattedMsg);
    },
    onSuccess: () => {
      toast.success('Automation created successfully');
      queryClient.invalidateQueries({ queryKey: ['automations', orgId] });
      onClose();
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      automationsService.update(id, data),
    onError: (err: any) => {
      const errMsg = err.response?.data?.message;
      const formattedMsg = Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to update automation';
      setFormError(formattedMsg);
      toast.error(formattedMsg);
    },
    onSuccess: () => {
      toast.success('Automation updated successfully');
      queryClient.invalidateQueries({ queryKey: ['automations', orgId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (actions.length === 0) {
      setFormError('At least one action is required to save automation.');
      return;
    }

    const payload = {
      name,
      description: description || undefined,
      triggerEvent,
      conditionsJson: conditionsJson.length > 0 ? conditionsJson : null,
      isEnabled,
      actions: actions.map((a) => ({
        actionType: a.actionType,
        configurationJson: a.configurationJson,
      })),
    };

    if (isEditMode && rule) {
      updateMutation.mutate({ id: rule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container Panel */}
      <div className="relative w-full max-w-5xl bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-secondary/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-bold text-foreground">
              {isEditMode ? 'Modify Automation Rule' : 'Launch New Automation'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area - Split into Form and Helper Column */}
        {metadataQuery.isLoading ? (
          <div className="flex-1 overflow-y-auto p-6">
            <AutomationDrawerSkeleton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Column: Form Elements */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-border/60">
              {/* Form Error Alert */}
              {formError && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3.5 text-center text-xs font-semibold text-red-400 animate-pulse">
                  {formError}
                </div>
              )}

              {/* Basic Meta Cards */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Auto-assign contact follow-ups"
                    className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description outlining rule objectives..."
                    className="w-full rounded-xl border border-border bg-secondary/20 py-2 px-3.5 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all leading-relaxed"
                  />
                </div>
              </div>

              {/* Event Triggers selection */}
              <div className="space-y-1 pt-4 border-t border-border/40">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Trigger Event Selector
                </label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs font-bold text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                >
                  {metadata.triggers.map((t: any) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditions List Section */}
              <div className="pt-4 border-t border-border/40">
                <ConditionsBuilder
                  conditions={conditionsJson}
                  onChange={setConditionsJson}
                  fieldsMetadata={metadata.conditionFields}
                />
              </div>

              {/* Actions List Section */}
              <div className="pt-4 border-t border-border/40">
                <ActionsBuilder
                  actions={actions}
                  onChange={setActions}
                  actionTypesMetadata={metadata.actionTypes}
                  organizationUsers={metadata.organizationUsers}
                />
              </div>
            </div>

            {/* Right Column: Template Helper Sidebar */}
            <div className="w-80 overflow-y-auto p-4 bg-muted/10 hidden md:block flex-shrink-0">
              <TemplateHelperPanel />
            </div>
          </form>
        )}

        {/* Footer controls */}
        {!metadataQuery.isLoading && (
          <div className="h-16 border-t border-border bg-card px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEnabled"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="rounded border-border bg-secondary text-indigo-600 focus:ring-indigo-500/50 cursor-pointer h-4.5 w-4.5"
              />
              <label htmlFor="isEnabled" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Active Rule immediately
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="h-4.5 w-4.5" />
                <span>{isPending ? 'Saving...' : 'Save Automation'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
