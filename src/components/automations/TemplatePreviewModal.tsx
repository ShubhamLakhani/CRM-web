import React, { useState, useEffect } from 'react';
import { X, Play, Sliders, CheckSquare, MessageSquare, Mail, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { AutomationTemplate } from './TemplatesLibrary';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AutomationTemplate | null;
  organizationUsers?: Array<{ id: string; name: string; email: string }>;
  onInstantiate: (overrides: any) => void;
  onCustomize: (prefilledState: any) => void;
  isPending: boolean;
}

export default function TemplatePreviewModal({
  isOpen,
  onClose,
  template,
  organizationUsers = [],
  onInstantiate,
  onCustomize,
  isPending,
}: TemplatePreviewModalProps) {
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [assigneeOverride, setAssigneeOverride] = useState('');
  const [emailToOverride, setEmailToOverride] = useState('');

  // Reset local inputs when template details change
  useEffect(() => {
    if (template) {
      setCustomName(`${template.name}`);
      setCustomDescription(template.description);
      
      // Determine default overrides
      const taskAction = template.actions.find((a) => a.actionType === 'CREATE_TASK');
      if (taskAction) {
        setAssigneeOverride(taskAction.configurationJson.assigneeId || 'OWNER');
      }

      const emailAction = template.actions.find((a) => a.actionType === 'SEND_EMAIL');
      if (emailAction) {
        setEmailToOverride(emailAction.configurationJson.to || 'CONTACT');
      }
    }
  }, [template, isOpen]);

  if (!isOpen || !template) return null;

  // Compile visual steps
  const getFriendlyTrigger = (trigger: string) => {
    if (trigger === 'CONTACT_CREATED') return 'Contact is created';
    if (trigger === 'DEAL_CREATED') return 'Deal is created';
    if (trigger === 'DEAL_STAGE_CHANGED') return 'Deal stage changes';
    if (trigger === 'DEAL_WON') return 'Deal is marked won';
    if (trigger === 'TASK_COMPLETED') return 'Task is completed';
    if (trigger === 'USER_INVITED') return 'User invite is sent';
    return trigger;
  };

  const hasTaskAction = template.actions.some((a) => a.actionType === 'CREATE_TASK');
  const hasEmailAction = template.actions.some((a) => a.actionType === 'SEND_EMAIL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map overrides back into the exact action array structures
    const customActions = template.actions.map((action) => {
      const clonedConfig = JSON.parse(JSON.stringify(action.configurationJson));
      if (action.actionType === 'CREATE_TASK') {
        clonedConfig.assigneeId = assigneeOverride;
      }
      if (action.actionType === 'SEND_EMAIL') {
        clonedConfig.to = emailToOverride;
      }
      return {
        actionType: action.actionType,
        configurationJson: clonedConfig,
      };
    });

    onInstantiate({
      name: customName,
      description: customDescription,
      isEnabled: true,
      actions: customActions,
    });
  };

  const handleCustomizeInBuilder = () => {
    // Generate prefilled model state for the Builder Drawer
    const prefilledActions = template.actions.map((action) => {
      const clonedConfig = JSON.parse(JSON.stringify(action.configurationJson));
      if (action.actionType === 'CREATE_TASK') {
        clonedConfig.assigneeId = assigneeOverride;
      }
      if (action.actionType === 'SEND_EMAIL') {
        clonedConfig.to = emailToOverride;
      }
      return {
        actionType: action.actionType,
        configurationJson: clonedConfig,
      };
    });

    onCustomize({
      name: customName,
      description: customDescription,
      triggerEvent: template.triggerEvent,
      conditionsJson: template.conditionsJson || [],
      isEnabled: true,
      actions: prefilledActions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-secondary/10">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-bold text-foreground">Template Review & Configuration</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          {/* Left Column: Visual Workflow steps */}
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground">{template.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {template.description}
              </p>
            </div>

            {/* Steps Timeline */}
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                Workflow Timeline Blueprint
              </span>
              
              <div className="relative border-l border-border/80 pl-6 ml-3 space-y-5">
                {/* 1. Trigger */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-0 h-4.5 w-4.5 rounded-full bg-indigo-500 border-4 border-card flex items-center justify-center" />
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-indigo-400">
                      Step 1: Event Trigger
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      When a {getFriendlyTrigger(template.triggerEvent)}
                    </p>
                  </div>
                </div>

                {/* 2. Conditions */}
                {template.conditionsJson && template.conditionsJson.length > 0 && (
                  <div className="relative">
                    <div className="absolute -left-[30px] top-0 h-4.5 w-4.5 rounded-full bg-slate-500 border-4 border-card flex items-center justify-center" />
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
                        Step 2: Matching Conditions (AND)
                      </span>
                      <div className="space-y-1 mt-1">
                        {template.conditionsJson.map((c, idx) => (
                          <div key={idx} className="bg-secondary/40 border border-border/40 rounded-lg p-2 text-[11px] font-semibold text-muted-foreground">
                            {c.field} <span className="text-indigo-400 font-bold">{c.operator}</span> {c.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Actions */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-0 h-4.5 w-4.5 rounded-full bg-emerald-500 border-4 border-card flex items-center justify-center" />
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-400">
                      Step {template.conditionsJson && template.conditionsJson.length > 0 ? 3 : 2}: Executing Action Actions
                    </span>
                    <div className="space-y-2">
                      {template.actions.map((act, idx) => {
                        const isTask = act.actionType === 'CREATE_TASK';
                        const isEmail = act.actionType === 'SEND_EMAIL';
                        return (
                          <div key={idx} className="flex gap-2 bg-secondary/25 border border-border/30 rounded-xl p-3 text-xs leading-relaxed text-foreground">
                            {isTask && <CheckSquare className="h-4.5 w-4.5 text-blue-400 flex-shrink-0" />}
                            {isEmail && <Mail className="h-4.5 w-4.5 text-teal-400 flex-shrink-0" />}
                            {!isTask && !isEmail && <MessageSquare className="h-4.5 w-4.5 text-yellow-400 flex-shrink-0" />}
                            <div>
                              <span className="font-bold text-[11px] uppercase tracking-wide text-slate-400 block mb-0.5">
                                {isTask ? 'Create Task' : isEmail ? 'Send Email' : 'Send Notification'}
                              </span>
                              <p className="font-semibold">{act.configurationJson.title || act.configurationJson.subject || 'Automated Step'}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{act.configurationJson.description || act.configurationJson.body || act.configurationJson.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Custom settings overrides form */}
          <form onSubmit={handleSubmit} className="border-t md:border-t-0 md:border-l border-border/80 pt-6 md:pt-0 md:pl-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                Tenant Parameters & Customization
              </span>

              {/* 1. Rule Name Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground font-semibold outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* 2. Rule Description Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 leading-relaxed"
                />
              </div>

              {/* 3. Assignee Overrides dropdown (rendered only if task creations are present) */}
              {hasTaskAction && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Default Task Assignee
                  </label>
                  <select
                    value={assigneeOverride}
                    onChange={(e) => setAssigneeOverride(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-xs font-semibold text-foreground cursor-pointer outline-none focus:border-indigo-500/50"
                  >
                    <optgroup label="Dynamic Roles">
                      <option value="OWNER">Deal/Contact Owner (Dynamic)</option>
                      <option value="ACTOR">Triggering User (Actor)</option>
                    </optgroup>
                    {organizationUsers.length > 0 && (
                      <optgroup label="Organization Members">
                        {organizationUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {/* 4. Email Recipient Override dropdown (rendered only if emails are present) */}
              {hasEmailAction && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email Recipient (To)
                  </label>
                  <select
                    value={emailToOverride}
                    onChange={(e) => setEmailToOverride(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-xs font-semibold text-foreground cursor-pointer outline-none focus:border-indigo-500/50"
                  >
                    <optgroup label="Dynamic Variables">
                      <option value="CONTACT">Contact's Email (Dynamic)</option>
                      <option value="OWNER">Owner's Email (Dynamic)</option>
                      <option value="ACTOR">Triggering User's Email (Dynamic)</option>
                    </optgroup>
                    {organizationUsers.length > 0 && (
                      <optgroup label="Organization Members">
                        {organizationUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Actions controls */}
            <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCustomizeInBuilder}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border hover:bg-secondary/40 text-xs font-bold text-foreground py-3 transition-all cursor-pointer"
              >
                <Sliders className="h-4 w-4" />
                <span>Customize in Builder</span>
              </button>
              
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isPending ? 'Instantiating...' : 'One-Click Create'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
