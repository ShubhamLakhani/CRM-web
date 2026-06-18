import React from 'react';
import { Copy, Edit3, Trash2, Zap, ZapOff, Check, X, MoreVertical, Eye, Play } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { automationsService } from '@/services/api';
import { toast } from '@/store/toastStore';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

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

interface RulesListProps {
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  onViewDetails: (rule: Rule) => void;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
  orgId: string;
}

export default function RulesList({
  rules,
  onEdit,
  onViewDetails,
  canUpdate,
  canDelete,
  canCreate,
  orgId,
}: RulesListProps) {
  const queryClient = useQueryClient();
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const pathname = usePathname();
  const firstMenuItemRef = React.useRef<HTMLButtonElement | null>(null);

  const handleCloseMenu = React.useCallback(() => {
    setActiveMenuId(null);
    setMenuPosition(null);
  }, []);

  // Close menu on route changes
  React.useEffect(() => {
    handleCloseMenu();
  }, [pathname, handleCloseMenu]);

  // Close menu on click outside, scroll, or resize
  React.useEffect(() => {
    if (!activeMenuId) return;

    const handleClose = () => {
      handleCloseMenu();
    };

    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);

    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [activeMenuId, handleCloseMenu]);

  // Escape key support to close menu
  React.useEffect(() => {
    if (!activeMenuId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId, handleCloseMenu]);

  // Focus management: focus the first menu item when opened
  React.useEffect(() => {
    if (activeMenuId && firstMenuItemRef.current) {
      const timer = setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeMenuId]);

  // Formatting date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Status Switch Toggle Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      automationsService.update(id, { isEnabled }),
    onMutate: async ({ id, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ['automations', orgId] });
      const previousRules = queryClient.getQueryData<Rule[]>(['automations', orgId]);
      queryClient.setQueryData<Rule[]>(['automations', orgId], (old) => {
        if (!old) return [];
        return old.map((r) => (r.id === id ? { ...r, isEnabled } : r));
      });
      return { previousRules };
    },
    onError: (err: any, variables, context) => {
      queryClient.setQueryData(['automations', orgId], context?.previousRules);
      const errMsg = err.response?.data?.message;
      const formattedMsg = Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to change automation status';
      toast.error(formattedMsg);
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isEnabled ? 'Automation enabled successfully' : 'Automation disabled successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', orgId] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['automations', orgId] });
      const previousRules = queryClient.getQueryData<Rule[]>(['automations', orgId]);
      queryClient.setQueryData<Rule[]>(['automations', orgId], (old) => {
        if (!old) return [];
        return old.filter((r) => r.id !== id);
      });
      return { previousRules };
    },
    onError: (err: any, id, context) => {
      queryClient.setQueryData(['automations', orgId], context?.previousRules);
      const errMsg = err.response?.data?.message;
      const formattedMsg = Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to delete automation';
      toast.error(formattedMsg);
    },
    onSuccess: () => {
      toast.success('Automation deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', orgId] });
    },
  });

  // Duplicate Mutation
  const duplicateMutation = useMutation({
    mutationFn: (newRule: any) => automationsService.create(newRule),
    onError: (err: any) => {
      const errMsg = err.response?.data?.message;
      const formattedMsg = Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to duplicate automation';
      toast.error(formattedMsg);
    },
    onSuccess: () => {
      toast.success('Automation duplicated successfully');
      queryClient.invalidateQueries({ queryKey: ['automations', orgId] });
    },
  });

  const handleToggleStatus = (rule: Rule) => {
    if (!canUpdate) return;
    toggleStatusMutation.mutate({ id: rule.id, isEnabled: !rule.isEnabled });
  };

  const handleDelete = (rule: Rule) => {
    if (!canDelete) return;
    if (confirm(`Are you sure you want to permanently delete rule "${rule.name}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  const handleDuplicate = (rule: Rule) => {
    if (!canCreate) return;
    const duplicatedPayload = {
      name: `${rule.name} (Copy)`,
      description: rule.description || undefined,
      triggerEvent: rule.triggerEvent,
      conditionsJson: rule.conditionsJson,
      isEnabled: rule.isEnabled,
      actions: rule.actions.map((a) => ({
        actionType: a.actionType,
        configurationJson: a.configurationJson,
      })),
    };
    duplicateMutation.mutate(duplicatedPayload);
  };

  // Old click listener removed in favor of portal event handlers

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border bg-card/65 backdrop-blur-sm rounded-2xl text-center max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
        <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border/60">
          <ZapOff className="h-7 w-7 text-muted-foreground/60 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-extrabold text-foreground tracking-tight uppercase">
            No Automation Rules Configured
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
            Create automated trigger actions to delegate tasks, send notifications, and dispatch SMTP emails when CRM events occur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors duration-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Rule Name</th>
              <th className="px-6 py-4">Trigger</th>
              <th className="px-6 py-4">Active Actions</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4">Failures</th>
              <th className="px-6 py-4">Last Failure</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm text-foreground">
            {rules.map((rule) => (
              <tr
                key={rule.id}
                className="hover:bg-muted/5 transition-colors duration-150 group"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span
                      onClick={() => onViewDetails(rule)}
                      className="font-bold text-foreground hover:text-indigo-400 transition-colors cursor-pointer truncate"
                    >
                      {rule.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-sm mt-0.5">
                      {rule.description || 'No description provided.'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wide uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-lg">
                    <Play className="h-2.5 w-2.5 fill-indigo-400" />
                    <span>{rule.triggerEvent.replace('_', ' ')}</span>
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold bg-secondary/80 border border-border px-2 py-0.5 rounded-full select-none">
                    {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-semibold text-xs">
                  v{rule.version}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.2 rounded ${
                      rule.failureCount > 0
                        ? 'text-rose-400 bg-rose-500/10 border border-rose-500/15'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {rule.failureCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                  {formatDate(rule.lastFailureAt)}
                </td>
                <td className="px-6 py-4">
                  <button
                    disabled={!canUpdate}
                    onClick={() => handleToggleStatus(rule)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed ${
                      rule.isEnabled ? 'bg-indigo-600' : 'bg-secondary'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        rule.isEnabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeMenuId === rule.id) {
                        handleCloseMenu();
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuWidth = 160;
                        const menuHeight = canUpdate || canCreate || canDelete ? 170 : 50;
                        
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
                        
                        const top = openUpward
                          ? rect.top + window.scrollY - menuHeight
                          : rect.bottom + window.scrollY;
                        
                        const left = Math.min(
                          rect.right - menuWidth + window.scrollX,
                          window.innerWidth - menuWidth - 16 + window.scrollX
                        );

                        setMenuPosition({ top, left, openUpward });
                        setActiveMenuId(rule.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer inline-flex"
                    aria-haspopup="true"
                    aria-expanded={activeMenuId === rule.id}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Context dropdown menu rendered via Portal */}
                  {activeMenuId === rule.id && menuPosition && typeof window !== 'undefined' && document.body && createPortal(
                    <div
                      style={{
                        position: 'absolute',
                        top: menuPosition.top,
                        left: menuPosition.left,
                      }}
                      role="menu"
                      onClick={(e) => e.stopPropagation()} // Prevent close on clicking inside the menu
                      className={`rounded-xl border border-border bg-card p-1 shadow-xl z-[9999] w-40 text-left animate-in fade-in duration-150 ${
                        menuPosition.openUpward ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
                      }`}
                    >
                      <button
                        ref={firstMenuItemRef}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(rule);
                          handleCloseMenu();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer outline-none focus:bg-secondary/80"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Details</span>
                      </button>

                      {canUpdate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(rule);
                            handleCloseMenu();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer outline-none focus:bg-secondary/80"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit Rule</span>
                        </button>
                      )}

                      {canCreate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(rule);
                            handleCloseMenu();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer outline-none focus:bg-secondary/80"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Duplicate Rule</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(rule);
                            handleCloseMenu();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer border-t border-border/40 mt-1 pt-2 outline-none focus:bg-rose-500/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Rule</span>
                        </button>
                      )}
                    </div>,
                    document.body
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
