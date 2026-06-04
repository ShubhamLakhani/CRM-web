'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Trash2,
  Plus,
  DollarSign,
  User,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MessageSquare,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsService, contactsService } from '@/services/api';
import { useFeatures } from '@/hooks/useFeatures';
import { usePermissions } from '@/hooks/usePermissions';
import ActivityTimeline from '@/components/ActivityTimeline';

interface DealActivity {
  id: string;
  type: 'NOTE' | 'SYSTEM_UPDATE';
  description: string;
  createdAt: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: 'LEAD' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  contactId?: string | null;
  contact?: {
    id?: string;
    name: string;
    email?: string;
    company?: {
      id?: string;
      name: string;
    } | null;
  } | null;
  createdAt: string;
  activities?: DealActivity[];
}

export default function DealsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('deals.create');
  const canUpdate = hasPermission('deals.update');
  const canDelete = hasPermission('deals.delete');
  const [mounted, setMounted] = useState(false);

  // Modal and drawer controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Drag and drop helpers
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [hoveredColumnStage, setHoveredColumnStage] = useState<string | null>(null);

  // Create Opportunity form states
  const [titleInput, setTitleInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [stageInput, setStageInput] = useState<Deal['stage']>('LEAD');
  const [contactIdInput, setContactIdInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Drawer local input states (for smooth editing without input lag)
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerValue, setDrawerValue] = useState('');
  const [drawerStage, setDrawerStage] = useState<Deal['stage']>('LEAD');
  const [drawerContactId, setDrawerContactId] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  // 1. Fetch all deals
  const dealsQuery = useQuery<Deal[]>({
    queryKey: ['deals'],
    queryFn: () => dealsService.getAll(),
  });

  const deals = useMemo(() => dealsQuery.data || [], [dealsQuery.data]);

  // 2. Fetch contacts for dropdown selection
  const contactsQuery = useQuery({
    queryKey: ['contacts-dropdown'],
    queryFn: () => contactsService.getAll('', '', 1, 100),
  });

  const contacts = useMemo(() => contactsQuery.data?.data || [], [contactsQuery.data]);

  const { isFeatureEnabled } = useFeatures();
  const isAiEnabled = isFeatureEnabled('AI_ASSISTANT');

  const aiForecastQuery = useQuery({
    queryKey: ['ai-forecast'],
    queryFn: () => dealsService.getAiForecast(),
    enabled: mounted && isAiEnabled,
    staleTime: 10 * 60 * 1000,
  });

  // 3. Fetch single deal details (includes activities) when drawer is open
  const dealDetailsQuery = useQuery<Deal>({
    queryKey: ['deal', selectedDealId],
    queryFn: () => dealsService.getOne(selectedDealId!),
    enabled: !!selectedDealId && drawerOpen,
  });

  const selectedDeal = dealDetailsQuery.data;
  const isDetailsLoading = dealDetailsQuery.isLoading && !!selectedDealId;

  // Sync drawer fields when details are loaded
  useEffect(() => {
    if (selectedDeal) {
      setDrawerTitle(selectedDeal.title);
      setDrawerValue(selectedDeal.value.toString());
      setDrawerStage(selectedDeal.stage);
      setDrawerContactId(selectedDeal.contactId || '');
    }
  }, [selectedDeal]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- MUTATIONS ---

  // Create Deal Mutation with Optimistic Updates
  const createDealMutation = useMutation({
    mutationFn: (newDeal: any) => dealsService.create(newDeal),
    onMutate: async (newDeal) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const previousDeals = queryClient.getQueryData<Deal[]>(['deals']) || [];

      const matchedContact = contacts.find((c: any) => c.id === newDeal.contactId);

      const optimisticDeal: Deal = {
        id: `temp-${Date.now()}`,
        title: newDeal.title,
        value: newDeal.value,
        stage: newDeal.stage || 'LEAD',
        contactId: newDeal.contactId || null,
        contact: matchedContact ? { id: matchedContact.id, name: matchedContact.name, email: matchedContact.email, company: matchedContact.company } : null,
        createdAt: new Date().toISOString(),
        activities: [],
      };

      queryClient.setQueryData<Deal[]>(['deals'], [optimisticDeal, ...previousDeals]);
      return { previousDeals };
    },
    onError: (err, newDeal, context) => {
      queryClient.setQueryData(['deals'], context?.previousDeals);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  // Update Deal Mutation with Detailed Optimistic Updates
  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => dealsService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      if (selectedDealId) {
        await queryClient.cancelQueries({ queryKey: ['deal', id] });
      }

      const previousDeals = queryClient.getQueryData<Deal[]>(['deals']);
      const previousDealDetails = queryClient.getQueryData<Deal>(['deal', id]);

      let matchedContact: Deal['contact'] = undefined;
      if (data.contactId !== undefined) {
        if (data.contactId) {
          const c = contacts.find((c: any) => c.id === data.contactId);
          matchedContact = c ? { id: c.id, name: c.name, email: c.email, company: c.company } : null;
        } else {
          matchedContact = null;
        }
      }

      // Optimistically update list
      queryClient.setQueryData<Deal[]>(['deals'], (old) => {
        if (!old) return [];
        return old.map((d) => {
          if (d.id === id) {
            const updated = { ...d, ...data };
            if (matchedContact !== undefined) {
              updated.contact = matchedContact;
            }
            return updated;
          }
          return d;
        });
      });

      // Optimistically update detail drawer
      if (previousDealDetails) {
        queryClient.setQueryData<Deal>(['deal', id], (old) => {
          if (!old) return old;
          const updated = { ...old, ...data };
          if (matchedContact !== undefined) {
            updated.contact = matchedContact;
          }
          if (data.stage && data.stage !== old.stage) {
            const stageLog: DealActivity = {
              id: `temp-log-${Date.now()}`,
              type: 'SYSTEM_UPDATE',
              description: `Moved stage from ${old.stage} to ${data.stage}`,
              createdAt: new Date().toISOString(),
            };
            updated.activities = [stageLog, ...(old.activities || [])];
          }
          return updated;
        });
      }

      return { previousDeals, previousDealDetails };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['deals'], context?.previousDeals);
      if (context?.previousDealDetails) {
        queryClient.setQueryData(['deal', variables.id], context.previousDealDetails);
      }
    },
    onSettled: (data, err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', variables.id] });
    },
  });

  // Delete Deal Mutation with Optimistic Updates
  const deleteDealMutation = useMutation({
    mutationFn: (id: string) => dealsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const previousDeals = queryClient.getQueryData<Deal[]>(['deals']);

      queryClient.setQueryData<Deal[]>(['deals'], (old) => {
        if (!old) return [];
        return old.filter((d) => d.id !== id);
      });

      return { previousDeals };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['deals'], context?.previousDeals);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  // Add Note Mutation with Optimistic Updates
  const addNoteMutation = useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      dealsService.addNote(id, description),
    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: ['deal', id] });
      const previousDealDetails = queryClient.getQueryData<Deal>(['deal', id]);

      if (previousDealDetails) {
        queryClient.setQueryData<Deal>(['deal', id], (old) => {
          if (!old) return old;
          const tempNote: DealActivity = {
            id: `temp-note-${Date.now()}`,
            type: 'NOTE',
            description,
            createdAt: new Date().toISOString(),
          };
          return {
            ...old,
            activities: [tempNote, ...(old.activities || [])],
          };
        });
      }

      return { previousDealDetails };
    },
    onError: (err, variables, context) => {
      if (context?.previousDealDetails) {
        queryClient.setQueryData(['deal', variables.id], context.previousDealDetails);
      }
    },
    onSettled: (data, err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deal', variables.id] });
    },
  });

  // --- DRAG AND DROP HANDLERS ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedDealId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setHoveredColumnStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (hoveredColumnStage !== stage) {
      setHoveredColumnStage(stage);
    }
  };

  const handleDragLeave = () => {
    setHoveredColumnStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: Deal['stage']) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (!dealId) return;

    const dealToMove = deals.find((d) => d.id === dealId);
    if (!dealToMove || dealToMove.stage === targetStage) {
      handleDragEnd();
      return;
    }

    updateDealMutation.mutate({ id: dealId, data: { stage: targetStage } });
    handleDragEnd();
  };

  const handleManualStageShift = (id: string, currentStage: Deal['stage'], direction: 'forward' | 'backward') => {
    const list: Deal['stage'][] = ['LEAD', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const currentIndex = list.indexOf(currentStage);
    let nextIndex = currentIndex;

    if (direction === 'forward' && currentIndex < list.length - 1) {
      nextIndex += 1;
    } else if (direction === 'backward' && currentIndex > 0) {
      nextIndex -= 1;
    }

    const nextStage = list[nextIndex];
    if (nextStage === currentStage) return;

    updateDealMutation.mutate({ id, data: { stage: nextStage } });
  };

  // --- DRAWER ACTIONS ---

  const handleOpenDrawer = (deal: Deal) => {
    setSelectedDealId(deal.id);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedDealId(null);
    setNewNoteText('');
  };

  const handleDeleteDeal = (id: string) => {
    deleteDealMutation.mutate(id, {
      onSuccess: () => {
        handleCloseDrawer();
      },
    });
  };

  const handleUpdateDrawerField = (field: string, value: any) => {
    if (!selectedDealId) return;
    updateDealMutation.mutate({
      id: selectedDealId,
      data: { [field]: value },
    });
  };

  const handleAddDrawerNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedDealId) return;

    addNoteMutation.mutate(
      { id: selectedDealId, description: newNoteText.trim() },
      {
        onSuccess: () => {
          setNewNoteText('');
        },
      }
    );
  };

  // --- OPPORTUNITY CREATION ---

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numericValue = parseFloat(valueInput) || 0.0;

    createDealMutation.mutate(
      {
        title: titleInput,
        value: numericValue,
        stage: stageInput,
        contactId: contactIdInput || undefined,
      },
      {
        onSuccess: () => {
          closeModal();
        },
        onError: (err: any) => {
          const errMsg = err.response?.data?.message;
          setFormError(
            Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to deploy opportunity.'
          );
        },
      }
    );
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitleInput('');
    setValueInput('');
    setStageInput('LEAD');
    setContactIdInput('');
    setFormError(null);
  };

  const columns: { title: string; stage: Deal['stage']; border: string; color: string }[] = [
    { title: 'Leads', stage: 'LEAD', border: 'border-t-amber-500', color: 'text-amber-400 bg-amber-500/10' },
    { title: 'Contacted', stage: 'CONTACTED', border: 'border-t-indigo-500', color: 'text-indigo-400 bg-indigo-500/10' },
    { title: 'Proposal', stage: 'PROPOSAL', border: 'border-t-violet-500', color: 'text-violet-400 bg-violet-500/10' },
    { title: 'Negotiation', stage: 'NEGOTIATION', border: 'border-t-blue-500', color: 'text-blue-400 bg-blue-500/10' },
    { title: 'Won', stage: 'WON', border: 'border-t-emerald-500', color: 'text-emerald-400 bg-emerald-500/10' },
    { title: 'Lost', stage: 'LOST', border: 'border-t-rose-500', color: 'text-rose-400 bg-rose-500/10' },
  ];

  // Render loading state
  if (!mounted || dealsQuery.isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground font-semibold animate-pulse">Decrypting Pipeline...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (dealsQuery.isError) {
    return (
      <div className="flex h-[400px] items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <AlertTriangle className="h-10 w-10 text-rose-500" />
          <h3 className="font-bold text-foreground text-lg">Failed to retrieve pipeline</h3>
          <p className="text-xs text-muted-foreground">
            An error occurred while connecting to the CRM data engine. Please verify backend state.
          </p>
          <button
            onClick={() => dealsQuery.refetch()}
            className="mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Pipeline Stages</h1>
          <p className="text-muted-foreground mt-1.5">
            Native HTML5 Drag and Drop sales pipeline synced with backend engine.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Launch Opportunity</span>
          </button>
        )}
      </div>

      {/* AI forecast section (Premium AI feature flag check) */}
      {isAiEnabled && (
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-5 shadow-lg relative overflow-hidden backdrop-blur-sm group hover:border-indigo-500/35 transition-all duration-300">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl group-hover:scale-150 transition-all duration-700" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>AI Copilot Forecast</span>
                  <span className="text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded px-1.5 py-0.5 uppercase tracking-wider">Active</span>
                </h3>
                {aiForecastQuery.isLoading ? (
                  <div className="space-y-2 mt-2">
                    <div className="h-3 w-72 bg-secondary/60 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-secondary/60 rounded animate-pulse" />
                  </div>
                ) : aiForecastQuery.isError ? (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Failed to retrieve AI insights. Verify your workspace credentials.</span>
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl font-medium">
                      {aiForecastQuery.data?.forecast}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        Predictive Confidence: <span className="text-indigo-400 font-bold">{(aiForecastQuery.data?.confidenceScore * 100).toFixed(0)}%</span>
                      </span>
                      <span>•</span>
                      <span>Synced {aiForecastQuery.data?.updatedAt ? new Date(aiForecastQuery.data.updatedAt).toLocaleTimeString() : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => aiForecastQuery.refetch()}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/20 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <span>Refresh Insights</span>
            </button>
          </div>
        </div>
      )}

      {/* Kanban staging columns grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 items-start select-none">
        {columns.map((col) => {
          const colDeals = deals.filter((d) => d.stage === col.stage);
          const totalValuation = colDeals.reduce((sum, d) => sum + d.value, 0);
          const isHovered = hoveredColumnStage === col.stage;

          return (
            <div
              key={col.stage}
              onDragOver={canUpdate ? (e) => handleDragOver(e, col.stage) : undefined}
              onDragLeave={canUpdate ? handleDragLeave : undefined}
              onDrop={canUpdate ? (e) => handleDrop(e, col.stage) : undefined}
              className={`rounded-2xl border bg-card/65 backdrop-blur-sm p-4 flex flex-col gap-4 border-t-4 ${col.border} min-h-[450px] transition-all duration-200 ${
                isHovered
                  ? 'border-indigo-500/50 ring-2 ring-indigo-500/20 bg-indigo-500/5 border-dashed border-2'
                  : 'border-border'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">{col.title}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${col.color}`}>
                  {colDeals.length}
                </span>
              </div>
              <div className="text-[10px] font-extrabold text-muted-foreground/80 tracking-wider uppercase border-b border-border/60 pb-2">
                Total: ${totalValuation.toLocaleString()}
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-3">
                {colDeals.length > 0 ? (
                  colDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable={canUpdate}
                      onDragStart={canUpdate ? (e) => handleDragStart(e, deal.id) : undefined}
                      onDragEnd={canUpdate ? handleDragEnd : undefined}
                      onClick={() => handleOpenDrawer(deal)}
                      className={`group relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer ${
                        draggedDealId === deal.id ? 'opacity-40 border-dashed border-indigo-500/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-indigo-400 transition-colors">
                          {deal.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 mt-2.5 text-indigo-400 font-extrabold text-base">
                        <DollarSign className="h-4 w-4" />
                        <span>{deal.value.toLocaleString()}</span>
                      </div>

                      {/* Associated contact badge */}
                      <div className="mt-3.5 pt-3.5 border-t border-border/60 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{deal.contact?.name || 'Independent Opportunity'}</span>
                        </div>
                        {deal.contact?.company && (
                          <div className="text-[9px] font-bold text-muted-foreground/80 pl-5 uppercase tracking-wide">
                            {typeof deal.contact.company === 'string'
                              ? deal.contact.company
                              : deal.contact.company.name}
                          </div>
                        )}
                      </div>

                      {/* Quick stage shifter controls */}
                      <div
                        className="flex items-center justify-between mt-4 pt-2 border-t border-border/40"
                        onClick={(e) => e.stopPropagation()} // Prevent drawer trigger
                      >
                        <button
                          disabled={col.stage === 'LEAD'}
                          onClick={() => handleManualStageShift(deal.id, deal.stage, 'backward')}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                          aria-label="Shift Stage Backward"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 select-none">
                          Shift Stage
                        </span>
                        <button
                          disabled={col.stage === 'LOST'}
                          onClick={() => handleManualStageShift(deal.id, deal.stage, 'forward')}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                          aria-label="Shift Stage Forward"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border/80 rounded-xl text-center text-muted-foreground/50 text-[10px] font-semibold">
                    <HelpCircle className="h-6 w-6 text-muted-foreground/30 mb-1" />
                    <span>Drop Opportunities</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Deal Drawer */}
      {drawerOpen && selectedDealId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseDrawer}
          />

          <div className="relative w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-secondary/10">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-bold text-foreground">Opportunity Pipeline Parameters</span>
              </div>
              <div className="flex items-center gap-3">
                {canDelete && (
                  <button
                    onClick={() => handleDeleteDeal(selectedDealId)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                    aria-label="Delete Deal"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailsLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span className="text-[10px] font-semibold text-muted-foreground animate-pulse">Retrieving opportunity coordinates...</span>
                  </div>
                </div>
              ) : selectedDeal ? (
                <>
                  {/* Main title panel */}
                  <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Deal Title</label>
                      <input
                        type="text"
                        disabled={!canUpdate}
                        value={drawerTitle}
                        onChange={(e) => setDrawerTitle(e.target.value)}
                        onBlur={() => {
                          if (canUpdate && drawerTitle.trim() && drawerTitle !== selectedDeal.title) {
                            handleUpdateDrawerField('title', drawerTitle.trim());
                          }
                        }}
                        className="w-full text-lg font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-indigo-500 outline-none transition-colors disabled:hover:border-transparent disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Grid configs */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Pipeline Coordinates</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border rounded-2xl p-4 bg-muted/5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Financial Value ($)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="number"
                            disabled={!canUpdate}
                            value={drawerValue}
                            onChange={(e) => setDrawerValue(e.target.value)}
                            onBlur={() => {
                              if (canUpdate) {
                                const numVal = parseFloat(drawerValue) || 0;
                                if (numVal !== selectedDeal.value) {
                                  handleUpdateDrawerField('value', numVal);
                                }
                              }
                            }}
                            className="w-full text-xs font-bold text-foreground bg-transparent border border-transparent hover:border-border focus:border-indigo-500/50 py-1.5 pl-7 pr-2 rounded-lg outline-none transition-all disabled:hover:border-transparent disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Current Stage</label>
                        <select
                          disabled={!canUpdate}
                          value={drawerStage}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setDrawerStage(val);
                            handleUpdateDrawerField('stage', val);
                          }}
                          className="w-full text-xs font-bold text-foreground bg-card border border-border rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500/50 transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          <option value="LEAD">Lead</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="PROPOSAL">Proposal</option>
                          <option value="NEGOTIATION">Negotiation</option>
                          <option value="WON">Won</option>
                          <option value="LOST">Lost</option>
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Linked Contact</label>
                        <select
                          disabled={!canUpdate}
                          value={drawerContactId}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            setDrawerContactId(val || '');
                            handleUpdateDrawerField('contactId', val);
                          }}
                          className="w-full text-xs font-bold text-foreground bg-card border border-border rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500/50 transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          <option value="">Independent Lead (No Linked Contact)</option>
                          {contacts.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.company?.name ? `(${c.company.name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Deal activities timelines */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Activity Timeline</h3>

                    {/* Add note inside drawer */}
                    {canUpdate && (
                      <form onSubmit={handleAddDrawerNote} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Log a new detail note..."
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          className="flex-1 rounded-xl border border-border bg-secondary/20 py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={addNoteMutation.isPending}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {addNoteMutation.isPending ? 'Logging...' : 'Log Note'}
                        </button>
                      </form>
                    )}

                    {/* Timeline Feed list */}
                    <div className="mt-4">
                      <ActivityTimeline entityType="deal" entityId={selectedDeal.id} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-muted-foreground py-10">
                  Opportunity details not found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Launch Opportunity Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground">Launch Opportunity</h2>
            <p className="text-xs text-muted-foreground mt-1">Configure deal parameters to launch opportunities in the pipeline stages.</p>

            <form onSubmit={handleCreateDeal} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Deal Title</label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Enterprise License Upgrade"
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Valuation ($)</label>
                  <input
                    type="number"
                    required
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    placeholder="25000"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Initial Stage</label>
                  <select
                    value={stageInput}
                    onChange={(e: any) => setStageInput(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Link Contact</label>
                <select
                  value={contactIdInput}
                  onChange={(e) => setContactIdInput(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                >
                  <option value="">Independent Lead (No Linked Contact)</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company?.name ? `(${c.company.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-semibold text-red-400">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDealMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {createDealMutation.isPending ? 'Deploying...' : 'Deploy Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
