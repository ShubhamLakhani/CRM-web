'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Circle,
  AlertTriangle,
  PlayCircle,
  XCircle,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService, authService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';

interface Task {
  id: string;
  title: string;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  dueDate?: string;
  createdAt: string;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('tasks.create');
  const canUpdate = hasPermission('tasks.update');
  const canDelete = hasPermission('tasks.delete');
  const [mounted, setMounted] = useState(false);

  // Search and status filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Task['status']>('TODO');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch active tasks matching search/filters
  const tasksQuery = useQuery<Task[]>({
    queryKey: ['tasks', search, statusFilter],
    queryFn: () => tasksService.getAll(search, statusFilter),
  });

  const tasks = useMemo(() => tasksQuery.data || [], [tasksQuery.data]);

  // 2. Fetch organization users to populate assignee selection list
  const usersQuery = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => authService.getUsers(),
  });

  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  // Set default assignee to current user if available on open
  useEffect(() => {
    if (users.length > 0 && !assigneeId) {
      setAssigneeId(users[0].id);
    }
  }, [users, assigneeId]);

  // --- MUTATIONS ---

  // Create Task Mutation with Optimistic Updates
  const createTaskMutation = useMutation({
    mutationFn: (newTask: any) => tasksService.create(newTask),
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', search, statusFilter] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', search, statusFilter]) || [];

      const assignedUser = users.find((u: any) => u.id === newTask.assigneeId);

      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        title: newTask.title,
        status: newTask.status || 'TODO',
        priority: newTask.priority || 'MEDIUM',
        dueDate: newTask.dueDate || undefined,
        assigneeId: newTask.assigneeId || null,
        assignee: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(['tasks', search, statusFilter], [optimisticTask, ...previousTasks]);
      return { previousTasks };
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(['tasks', search, statusFilter], context?.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Update Task Mutation with Optimistic Updates
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', search, statusFilter] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', search, statusFilter]);

      queryClient.setQueryData<Task[]>(['tasks', search, statusFilter], (old) => {
        if (!old) return [];
        return old.map((t) => {
          if (t.id === id) {
            const updated = { ...t, ...data };
            if (data.assigneeId !== undefined) {
              const assignedUser = users.find((u: any) => u.id === data.assigneeId);
              updated.assignee = assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null;
            }
            return updated;
          }
          return t;
        });
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tasks', search, statusFilter], context?.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Delete Task Mutation with Optimistic Updates
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', search, statusFilter] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', search, statusFilter]);

      queryClient.setQueryData<Task[]>(['tasks', search, statusFilter], (old) => {
        if (!old) return [];
        return old.filter((t) => t.id !== id);
      });

      return { previousTasks };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['tasks', search, statusFilter], context?.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // --- HANDLERS ---

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    createTaskMutation.mutate(
      {
        title,
        status,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      },
      {
        onSuccess: () => {
          closeModal();
        },
        onError: (err: any) => {
          const errMsg = err.response?.data?.message;
          setFormError(
            Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to log action task.'
          );
        },
      }
    );
  };

  const handleDeleteTask = (id: string) => {
    deleteTaskMutation.mutate(id);
  };

  const handleToggleStatus = (id: string, currentStatus: Task['status']) => {
    const nextStatusMap: Record<Task['status'], Task['status']> = {
      BACKLOG: 'TODO',
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'TODO',
      CANCELED: 'TODO',
    };
    const nextStatus = nextStatusMap[currentStatus];
    updateTaskMutation.mutate({ id, data: { status: nextStatus } });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setStatus('TODO');
    setPriority('MEDIUM');
    setDueDate('');
    if (users.length > 0) {
      setAssigneeId(users[0].id);
    }
    setFormError(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusIcon = (status: Task['status'], id?: string) => {
    const cursorClass = canUpdate ? 'cursor-pointer' : '';
    const clickHandler = (currentStatus: Task['status']) => {
      if (canUpdate && id) {
        handleToggleStatus(id, currentStatus);
      }
    };

    switch (status) {
      case 'DONE':
        return (
          <CheckCircle2
            className={`h-4.5 w-4.5 text-emerald-500 ${cursorClass}`}
            onClick={() => clickHandler(status)}
          />
        );
      case 'IN_PROGRESS':
        return (
          <PlayCircle
            className={`h-4.5 w-4.5 text-sky-400 ${cursorClass}`}
            onClick={() => clickHandler(status)}
          />
        );
      case 'BACKLOG':
        return (
          <HelpCircle
            className={`h-4.5 w-4.5 text-muted-foreground/60 ${cursorClass}`}
            onClick={() => clickHandler(status)}
          />
        );
      case 'CANCELED':
        return (
          <XCircle
            className={`h-4.5 w-4.5 text-rose-500/60 ${cursorClass}`}
            onClick={() => clickHandler(status)}
          />
        );
      default: // TODO
        return (
          <Circle
            className={`h-4.5 w-4.5 text-amber-500 ${cursorClass}`}
            onClick={() => clickHandler(status)}
          />
        );
    }
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'HIGH':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/15">
            High Priority
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15">
            Med Priority
          </span>
        );
      case 'LOW':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15">
            Low Priority
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
            No Priority
          </span>
        );
    }
  };

  const statuses: Task['status'][] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE', 'CANCELED'];

  // Render loading state
  if (!mounted || tasksQuery.isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground font-semibold animate-pulse">Decrypting Action Items...</span>
        </div>
      </div>
    );
  }

  // Render error page
  if (tasksQuery.isError) {
    return (
      <div className="flex h-[400px] items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <AlertTriangle className="h-10 w-10 text-rose-500" />
          <h3 className="font-bold text-foreground text-lg">Failed to retrieve tasks</h3>
          <p className="text-xs text-muted-foreground">
            An error occurred while connecting to the CRM data engine. Please verify backend state.
          </p>
          <button
            onClick={() => tasksQuery.refetch()}
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Action Tasks</h1>
          <p className="text-muted-foreground mt-1.5">
            Linear-style task tracking, assignee checkpoints, and priorities management.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* Control filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search action items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            Filter Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-44 rounded-xl border border-border bg-card py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
          >
            <option value="">All Tasks</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Completed</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
      </div>

      {/* Linear Grouped Task Columns */}
      <div className="space-y-6">
        {statuses
          .filter((st) => (statusFilter ? st === statusFilter : true))
          .map((st) => {
            const statusTasks = tasks.filter((t) => t.status === st);
            if (statusTasks.length === 0 && statusFilter) return null;

            return (
              <div key={st} className="space-y-2 animate-in fade-in duration-150">
                {/* Status Group Header */}
                <div className="flex items-center gap-2 px-1">
                  {getStatusIcon(st)}
                  <span className="text-xs font-extrabold tracking-wide uppercase text-muted-foreground select-none">
                    {st.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-secondary text-muted-foreground/80 border border-border/40 select-none">
                    {statusTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="rounded-2xl border border-border bg-card shadow-sm divide-y divide-border/60 overflow-hidden">
                  {statusTasks.length > 0 ? (
                    statusTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4 hover:bg-muted/5 transition-colors duration-150 group"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {getStatusIcon(task.status, task.id)}
                          <span
                            onClick={() => canUpdate && handleToggleStatus(task.id, task.status)}
                            className={`text-sm font-semibold truncate hover:text-indigo-400 transition-colors ${
                              canUpdate ? 'cursor-pointer' : ''
                            } ${
                              task.status === 'DONE' ? 'line-through text-muted-foreground/60' : 'text-foreground'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Task parameters */}
                        <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-auto">
                          {getPriorityBadge(task.priority)}

                          {task.dueDate && (
                            <span className="text-[10px] font-bold text-muted-foreground tracking-wide bg-secondary border border-border/50 px-2 py-0.5 rounded flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </span>
                          )}

                          {task.assignee && (
                            <div className="flex items-center gap-1.5 border-l border-border/60 pl-4">
                              <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm border border-indigo-400/20">
                                {getInitials(task.assignee.name)}
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground hidden md:inline">
                                {task.assignee.name.split(' ')[0]}
                              </span>
                            </div>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer animate-in fade-in duration-100"
                              aria-label="Delete Task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground/50 font-medium select-none">
                      No tasks currently scheduled under this stage.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground">Launch Action Item</h2>
            <p className="text-xs text-muted-foreground mt-1">Schedule task logs aligned with project priorities.</p>

            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Task Summary</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Review AWS hosting invoice and budget allocations"
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Initial status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                  >
                    <option value="BACKLOG">Backlog</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Completed</option>
                    <option value="CANCELED">Canceled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                    <option value="NONE">No Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Assignee</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                  >
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-semibold text-red-400 animate-pulse">
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
                  disabled={createTaskMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
