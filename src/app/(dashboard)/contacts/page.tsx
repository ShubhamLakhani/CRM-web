'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import {
  Search,
  Plus,
  Trash2,
  User,
  Building,
  Phone,
  Mail,
  Filter,
  ArrowUpDown,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  DollarSign,
  Calendar,
  MessageSquare,
  FileText,
  TrendingUp,
  CheckCircle2,
  Grid3X3,
  ExternalLink
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import ActivityTimeline from '@/components/ActivityTimeline';
import { useSearchParams } from 'next/navigation';

interface ContactActivity {
  id: string;
  type: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'SYSTEM_UPDATE';
  description: string;
  createdAt: string;
}

interface ContactDeal {
  id: string;
  title: string;
  value: number;
  stage: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: { id: string; name: string; domain?: string } | null;
  status: 'LEAD' | 'CONTACTED' | 'CUSTOMER' | 'CHURNED';
  createdAt: string;
  deals?: ContactDeal[];
  activities?: ContactActivity[];
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('contacts.create');
  const canUpdate = hasPermission('contacts.update');
  const canDelete = hasPermission('contacts.delete');

  // UI Control states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  // Creation modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [statusInput, setStatusInput] = useState<'LEAD' | 'CONTACTED' | 'CUSTOMER' | 'CHURNED'>('LEAD');

  // Details drawer states
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // Floating Bulk actions state
  const [bulkStatusInput, setBulkStatusInput] = useState<'LEAD' | 'CONTACTED' | 'CUSTOMER' | 'CHURNED'>('CUSTOMER');

  const searchParams = useSearchParams();
  const contactIdParam = searchParams.get('contactId');

  // TanStack Query list fetch
  const contactsQuery = useQuery({
    queryKey: ['contacts', searchQuery, statusFilter],
    queryFn: () => contactsService.getAll(searchQuery, statusFilter, 1, 100),
  });

  const contacts = useMemo(() => contactsQuery.data?.data || [], [contactsQuery.data]);

  useEffect(() => {
    if (contactIdParam && contacts.length > 0) {
      const found = contacts.find((c: any) => c.id === contactIdParam);
      if (found) {
        handleOpenDrawer(found);
      } else {
        contactsService
          .getOne(contactIdParam)
          .then((contact) => {
            if (contact) {
              handleOpenDrawer(contact);
            }
          })
          .catch((err) => console.error('Failed to load deep-linked contact', err));
      }
    }
  }, [contactIdParam, contacts]);

  // Dynamic mapping of company names to companyIds gathered from fetched contacts
  const companyMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c: any) => {
      if (c.company?.id && c.company?.name) {
        map.set(c.company.name.toLowerCase().trim(), c.company.id);
      }
    });
    return map;
  }, [contacts]);

  const resolveCompanyId = (name: string) => {
    if (!name) return undefined;
    const searchName = name.toLowerCase().trim();
    for (const [compName, compId] of companyMap.entries()) {
      if (compName.includes(searchName) || searchName.includes(compName)) {
        return compId;
      }
    }
    return undefined;
  };

  // Create mutation with optimistic updates
  const createContactMutation = useMutation({
    mutationFn: (newContact: any) => {
      const { companyName, ...payload } = newContact;
      return contactsService.create(payload);
    },
    onMutate: async (newContact) => {
      await queryClient.cancelQueries({ queryKey: ['contacts', searchQuery, statusFilter] });
      const previousContacts = queryClient.getQueryData(['contacts', searchQuery, statusFilter]);

      const companyId = resolveCompanyId(newContact.companyName);
      const optimisticContact: Contact = {
        id: `temp-${Date.now()}`,
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        company: companyId ? { id: companyId, name: newContact.companyName } : null,
        status: newContact.status || 'LEAD',
        createdAt: new Date().toISOString(),
        deals: [],
        activities: [],
      };

      queryClient.setQueryData(['contacts', searchQuery, statusFilter], (old: any) => {
        if (!old) return { data: [optimisticContact], meta: { total: 1 } };
        return {
          ...old,
          data: [optimisticContact, ...old.data]
        };
      });

      return { previousContacts };
    },
    onError: (err, newContact, context) => {
      queryClient.setQueryData(['contacts', searchQuery, statusFilter], context?.previousContacts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Update mutation with optimistic updates
  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contactsService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['contacts', searchQuery, statusFilter] });
      const previousContacts = queryClient.getQueryData(['contacts', searchQuery, statusFilter]);

      queryClient.setQueryData(['contacts', searchQuery, statusFilter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((c: any) => c.id === id ? { ...c, ...data } : c)
        };
      });

      return { previousContacts };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['contacts', searchQuery, statusFilter], context?.previousContacts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Delete mutation with optimistic updates
  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contacts', searchQuery, statusFilter] });
      const previousContacts = queryClient.getQueryData(['contacts', searchQuery, statusFilter]);

      queryClient.setQueryData(['contacts', searchQuery, statusFilter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((c: any) => c.id !== id)
        };
      });

      return { previousContacts };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['contacts', searchQuery, statusFilter], context?.previousContacts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Bulk mutations
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await Promise.all(ids.map(id => contactsService.update(id, { status })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setRowSelection({});
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => contactsService.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setRowSelection({});
    },
  });

  // Column definitions for TanStack Table
  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="rounded border-border bg-secondary text-indigo-600 focus:ring-indigo-500/50 cursor-pointer h-4 w-4"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-border bg-secondary text-indigo-600 focus:ring-indigo-500/50 cursor-pointer h-4 w-4"
            onClick={(e) => e.stopPropagation()} // Prevent drawer opening on checkbox click
          />
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer select-none font-bold"
          >
            <span>Contact</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="h-8.5 w-8.5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/15">
                <User className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-foreground truncate">{c.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{c.email}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'company',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer select-none font-bold"
          >
            <span>Company</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const company = row.original.company;
          const companyName = typeof company === 'object' && company ? company.name : (company || '');
          return (
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Building className="h-3.5 w-3.5" />
              <span>{companyName || '—'}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone Number',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <Phone className="h-3.5 w-3.5" />
            <span>{row.original.phone || '—'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer select-none font-bold"
          >
            <span>Lifecycle</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          const getBadgeClass = (st: Contact['status']) => {
            switch (st) {
              case 'CUSTOMER':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15';
              case 'CONTACTED':
                return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15';
              case 'CHURNED':
                return 'bg-rose-500/10 text-rose-400 border-rose-500/15';
              default:
                return 'bg-amber-500/10 text-amber-400 border-amber-500/15';
            }
          };
          return (
            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${getBadgeClass(status)}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer select-none font-bold"
          >
            <span>Created</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        ),
      },
    ],
    [companyMap, contacts]
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: contacts,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
      globalFilter: searchQuery,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setSearchQuery,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Calculate selected row counts
  const selectedRows = table.getSelectedRowModel().flatRows;
  const isBulkSelected = selectedRows.length > 0;

  // Handle drawer opening
  const handleOpenDrawer = (contact: Contact) => {
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedContact(null);
    setNewNoteText('');
  };

  // Add note inside drawer specifically for this contact
  const handleAddDrawerNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedContact) return;

    const newNote: ContactActivity = {
      id: `a-${Date.now()}`,
      type: 'NOTE',
      description: newNoteText,
      createdAt: new Date().toISOString(),
    };

    setSelectedContact({
      ...selectedContact,
      activities: [newNote, ...(selectedContact.activities || [])],
    });
    setNewNoteText('');
  };

  // Edit fields directly in details drawer
  const handleUpdateDrawerField = (field: keyof Contact, value: any) => {
    if (!selectedContact) return;

    let updateData: any = { [field]: value };
    let optimisticContact: any = { ...selectedContact, [field]: value };

    if (field === 'company') {
      const companyId = resolveCompanyId(value);
      updateData = { companyId };
      optimisticContact = { 
        ...selectedContact, 
        company: companyId ? { id: companyId, name: value } : null 
      };
    }

    updateContactMutation.mutate({ 
      id: selectedContact.id, 
      data: updateData 
    });

    setSelectedContact(optimisticContact);
  };

  // Create contact handler
  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = resolveCompanyId(companyInput);
    createContactMutation.mutate({
      name: nameInput,
      email: emailInput,
      phone: phoneInput,
      companyId,
      companyName: companyInput,
      status: statusInput,
    });
    closeCreateModal();
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setNameInput('');
    setEmailInput('');
    setPhoneInput('');
    setCompanyInput('');
    setStatusInput('LEAD');
  };

  // Bulk actions handlers
  const handleBulkDelete = () => {
    const selectedIds = selectedRows.map((r) => r.original.id);
    bulkDeleteMutation.mutate(selectedIds);
  };

  const handleBulkStatusChange = () => {
    const selectedIds = selectedRows.map((r) => r.original.id);
    bulkStatusMutation.mutate({ ids: selectedIds, status: bulkStatusInput });
  };

  // Filter Table data strictly according to selected lifecycle dropdown status
  React.useEffect(() => {
    table.getColumn('status')?.setFilterValue(statusFilter || undefined);
  }, [statusFilter, table]);

  // Loading, Error, Empty View Render Configurations
  if (contactsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-in fade-in duration-300">
        <div className="h-12 w-12 rounded-xl border-4 border-indigo-500/25 border-t-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading CRM contacts database...</p>
      </div>
    );
  }

  if (contactsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 rounded-2xl border border-red-500/10 bg-red-500/5 text-center max-w-md mx-auto space-y-4 animate-in fade-in duration-300">
        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/15">
          <X className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Failed to load contacts</h3>
        <p className="text-sm text-muted-foreground">
          {contactsQuery.error instanceof Error ? contactsQuery.error.message : 'An unknown network error occurred.'}
        </p>
        <button
          onClick={() => contactsQuery.refetch()}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative min-h-[500px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">CRM Contacts</h1>
          <p className="text-muted-foreground mt-1.5">
            Sleek database grid for customer properties, pipelines, and audit histories.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Lead</span>
          </button>
        )}
      </div>

      {/* Control filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search leads by name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            <Filter className="h-4 w-4" /> Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-44 rounded-xl border border-border bg-card py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
          >
            <option value="">All Lifecycle Stages</option>
            <option value="LEAD">Leads</option>
            <option value="CONTACTED">Contacted</option>
            <option value="CUSTOMER">Customers</option>
            <option value="CHURNED">Churned</option>
          </select>
        </div>
      </div>

      {/* TanStack Table UI */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-border bg-muted/30 text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border text-sm text-foreground">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleOpenDrawer(row.original)}
                    className="hover:bg-muted/10 transition-colors duration-150 cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground/60 font-semibold select-none">
                    No contacts matched selection coordinates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Custom Pagination bar */}
        <div className="border-t border-border bg-muted/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-semibold">
          <div className="flex items-center gap-4">
            <span>
              Showing{' '}
              <span className="text-foreground font-extrabold">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="text-foreground font-extrabold">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
              </span>{' '}
              of{' '}
              <span className="text-foreground font-extrabold">
                {table.getFilteredRowModel().rows.length}
              </span>{' '}
              records
            </span>

            <div className="flex items-center gap-2 border-l border-border/80 pl-4">
              <span>Rows per page</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground cursor-pointer outline-none focus:border-indigo-500/50"
              >
                {[5, 10, 20].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 select-none">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card cursor-pointer transition-all"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <span className="font-bold text-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {Math.max(table.getPageCount(), 1)}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card cursor-pointer transition-all"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Contacts Details Drawer */}
      {drawerOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Drawer Backdrop with blur */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseDrawer}
          />

          {/* Drawer content panel */}
          <div className="relative w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-secondary/10">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-bold text-foreground">Lead Profile Details</span>
              </div>
              <div className="flex items-center gap-2">
                {canDelete && (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${selectedContact.name}?`)) {
                        deleteContactMutation.mutate(selectedContact.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer mr-1"
                    title="Delete Contact"
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

            {/* Content Body scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Card */}
              <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-indigo-500 flex items-center justify-center text-white text-lg font-bold border border-indigo-400/20 shadow-md">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <input
                      type="text"
                      disabled={!canUpdate}
                      value={selectedContact.name}
                      onChange={(e) => handleUpdateDrawerField('name', e.target.value)}
                      className="text-lg font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-indigo-500 outline-none transition-colors w-full disabled:hover:border-transparent disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      disabled={!canUpdate}
                      value={typeof selectedContact.company === 'object' && selectedContact.company ? selectedContact.company.name : (selectedContact.company || '')}
                      onChange={(e) => handleUpdateDrawerField('company', e.target.value)}
                      placeholder="Specify company"
                      className="text-xs font-semibold text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-indigo-500 outline-none mt-1 transition-colors w-full disabled:hover:border-transparent disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Properties Grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Properties Coordinates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border rounded-2xl p-4 bg-muted/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <input
                      type="email"
                      disabled={!canUpdate}
                      value={selectedContact.email}
                      onChange={(e) => handleUpdateDrawerField('email', e.target.value)}
                      className="w-full text-xs font-bold text-foreground bg-transparent border border-transparent hover:border-border focus:border-indigo-500/50 py-1 px-2 rounded-lg outline-none transition-all disabled:hover:border-transparent disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                    <input
                      type="text"
                      disabled={!canUpdate}
                      value={selectedContact.phone}
                      onChange={(e) => handleUpdateDrawerField('phone', e.target.value)}
                      className="w-full text-xs font-bold text-foreground bg-transparent border border-transparent hover:border-border focus:border-indigo-500/50 py-1 px-2 rounded-lg outline-none transition-all disabled:hover:border-transparent disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Lifecycle Stage</label>
                    <select
                      disabled={!canUpdate}
                      value={selectedContact.status}
                      onChange={(e) => handleUpdateDrawerField('status', e.target.value)}
                      className="w-full text-xs font-bold text-foreground bg-card border border-border rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500/50 transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      <option value="LEAD">Lead</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="CUSTOMER">Customer</option>
                      <option value="CHURNED">Churned</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Connected Opportunities deals */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Connected Deals Pipeline</h3>
                <div className="space-y-2">
                  {selectedContact.deals && selectedContact.deals.length > 0 ? (
                    selectedContact.deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="rounded-xl border border-border p-3 flex items-center justify-between hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">{deal.title}</span>
                          <span className="text-[10px] text-indigo-400 font-extrabold uppercase mt-0.5 tracking-wider">
                            {deal.stage}
                          </span>
                        </div>
                        <div className="flex items-center font-extrabold text-foreground text-sm">
                          <DollarSign className="h-4 w-4 text-indigo-400" />
                          <span>{deal.value.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-muted-foreground/60 py-6 border border-dashed border-border rounded-xl font-semibold">
                      No active opportunities currently linked.
                    </div>
                  )}
                </div>
              </div>

              {/* Activity feeds Specific to Contact */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Activity Timeline</h3>
                </div>

                {/* Add note specifically inside drawer */}
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
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 text-xs transition-colors cursor-pointer"
                    >
                      Add Note
                    </button>
                  </form>
                )}

                {/* Chronological mini feed */}
                <div className="mt-4">
                  <ActivityTimeline entityType="contact" entityId={selectedContact.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions bar */}
      {isBulkSelected && (canUpdate || canDelete) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-bottom duration-250">
          <div className="rounded-2xl border border-border bg-slate-950/80 p-4 shadow-xl backdrop-blur-md flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white bg-indigo-600 px-2.5 py-0.5 rounded-full shadow">
                {selectedRows.length} Selected
              </span>
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Active checked leads</span>
            </div>

            <div className="flex items-center gap-2.5">
              {canUpdate && (
                <>
                  <select
                    value={bulkStatusInput}
                    onChange={(e: any) => setBulkStatusInput(e.target.value)}
                    className="rounded-lg border border-white/5 bg-slate-900 py-1.5 px-2 text-xs text-white outline-none cursor-pointer focus:border-indigo-500/50"
                  >
                    <option value="LEAD">Leads</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="CUSTOMER">Customers</option>
                    <option value="CHURNED">Churned</option>
                  </select>

                  <button
                    onClick={handleBulkStatusChange}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 text-xs transition-colors cursor-pointer"
                  >
                    Update Statuses
                  </button>
                </>
              )}

              {canDelete && (
                <button
                  onClick={handleBulkDelete}
                  className="p-1.5 rounded-lg border border-white/5 bg-slate-900 hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer"
                  aria-label="Bulk Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => setRowSelection({})}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Clear Selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Contact Modal Dialog */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeCreateModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground">Add New Lead</h2>
            <p className="text-xs text-muted-foreground mt-1">Configure profile coordinates to initiate pipeline flows.</p>

            <form onSubmit={handleCreateContact} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Wade Wilson"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="wade@deadpool.com"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Phone</label>
                  <input
                    type="text"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+1 (555) 1234"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Company</label>
                  <input
                    type="text"
                    required
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    placeholder="Mercenary Corp"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Lifecycle Stage</label>
                <select
                  value={statusInput}
                  onChange={(e: any) => setStatusInput(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                >
                  <option value="LEAD">Lead</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="CHURNED">Churned</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 text-sm transition-all cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
