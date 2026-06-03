'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Building,
  Globe,
  Users,
  DollarSign,
  Filter,
  ExternalLink,
  X,
  AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesService } from '@/services/api';

interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employees?: number;
  dealValue?: number;
  createdAt: string;
}

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // Filter and Search States
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  // Modals States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form Creation States
  const [nameInput, setNameInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [industryInput, setIndustryInput] = useState('Technology');
  const [employeesInput, setEmployeesInput] = useState('50');
  const [dealValueInput, setDealValueInput] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  // Form Editing States
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editEmployees, setEditEmployees] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Companies list using TanStack Query
  const companiesQuery = useQuery<{ data: Company[]; meta: any }>({
    queryKey: ['companies', search, industryFilter],
    queryFn: () => companiesService.getAll(search, industryFilter, 1, 100),
  });

  const companies = useMemo(() => companiesQuery.data?.data || [], [companiesQuery.data]);

  // Premium Logo Gradient Helper based consistently on Company name / ID hash
  const getLogoColor = (id: string) => {
    const colors = [
      'from-indigo-500 to-violet-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-sky-500 to-blue-600',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Industries default sector list to fall back on or merge with DB values
  const defaultSectors = [
    'Technology',
    'Automotive & Energy',
    'Software Enterprise',
    'Artificial Intelligence',
    'Cloud Infrastructure',
    'Consulting',
    'Financial Services',
    'Healthcare'
  ];

  const industries = useMemo(() => {
    const dbSectors = companies.map((c: any) => c.industry).filter(Boolean);
    return Array.from(new Set([...defaultSectors, ...dbSectors]));
  }, [companies]);

  // --- MUTATIONS ---

  // Create Company Mutation
  const createCompanyMutation = useMutation({
    mutationFn: (newCompany: any) => companiesService.create(newCompany),
    onMutate: async (newCompany) => {
      await queryClient.cancelQueries({ queryKey: ['companies', search, industryFilter] });
      const previousCompanies = queryClient.getQueryData(['companies', search, industryFilter]);

      const optimisticCompany: Company = {
        id: `temp-${Date.now()}`,
        name: newCompany.name,
        domain: newCompany.domain,
        industry: newCompany.industry,
        employees: newCompany.employees,
        dealValue: newCompany.dealValue || 0,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<any>(['companies', search, industryFilter], (old: any) => {
        if (!old) return { data: [optimisticCompany], meta: { total: 1 } };
        return {
          ...old,
          data: [optimisticCompany, ...old.data],
          meta: { ...old.meta, total: old.meta.total + 1 }
        };
      });

      return { previousCompanies };
    },
    onError: (err, newCompany, context) => {
      queryClient.setQueryData(['companies', search, industryFilter], context?.previousCompanies);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Invalidate deals statistics as well in case an initial deal was auto-generated
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  // Update Company Mutation
  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => companiesService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['companies', search, industryFilter] });
      const previousCompanies = queryClient.getQueryData(['companies', search, industryFilter]);

      queryClient.setQueryData<any>(['companies', search, industryFilter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((c: any) => c.id === id ? { ...c, ...data } : c)
        };
      });

      return { previousCompanies };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['companies', search, industryFilter], context?.previousCompanies);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  // Delete Company Mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: (id: string) => companiesService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['companies', search, industryFilter] });
      const previousCompanies = queryClient.getQueryData(['companies', search, industryFilter]);

      queryClient.setQueryData<any>(['companies', search, industryFilter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((c: any) => c.id !== id),
          meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) }
        };
      });

      return { previousCompanies };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['companies', search, industryFilter], context?.previousCompanies);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  // --- HANDLERS ---

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const employeesCount = parseInt(employeesInput, 10) || 10;
    const initialDealVal = parseFloat(dealValueInput) || 0.0;

    createCompanyMutation.mutate(
      {
        name: nameInput,
        domain: domainInput,
        industry: industryInput,
        employees: employeesCount,
        dealValue: initialDealVal,
      },
      {
        onSuccess: () => {
          closeCreateModal();
        },
        onError: (err: any) => {
          const errMsg = err.response?.data?.message;
          setFormError(
            Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to register enterprise account.'
          );
        },
      }
    );
  };

  const handleUpdateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setEditFormError(null);

    const employeesCount = parseInt(editEmployees, 10) || 0;

    updateCompanyMutation.mutate(
      {
        id: editingCompany.id,
        data: {
          name: editName,
          domain: editDomain,
          industry: editIndustry,
          employees: employeesCount,
        },
      },
      {
        onSuccess: () => {
          closeEditModal();
        },
        onError: (err: any) => {
          const errMsg = err.response?.data?.message;
          setEditFormError(
            Array.isArray(errMsg) ? errMsg[0] : errMsg || 'Failed to update company properties.'
          );
        },
      }
    );
  };

  const handleDeleteCompany = (id: string) => {
    deleteCompanyMutation.mutate(id);
  };

  // --- MODAL CONTROLS ---

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNameInput('');
    setDomainInput('');
    setIndustryInput('Technology');
    setEmployeesInput('50');
    setDealValueInput('0');
    setFormError(null);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditDomain(company.domain || '');
    setEditIndustry(company.industry || 'Technology');
    setEditEmployees(company.employees?.toString() || '0');
  };

  const closeEditModal = () => {
    setEditingCompany(null);
    setEditName('');
    setEditDomain('');
    setEditIndustry('');
    setEditEmployees('');
    setEditFormError(null);
  };

  // Loading indicator on mount or fetch
  if (!mounted || companiesQuery.isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground font-semibold animate-pulse">Decrypting Enterprise Directories...</span>
        </div>
      </div>
    );
  }

  // Error boundary page
  if (companiesQuery.isError) {
    return (
      <div className="flex h-[400px] items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <AlertTriangle className="h-10 w-10 text-rose-500" />
          <h3 className="font-bold text-foreground text-lg">Failed to retrieve accounts</h3>
          <p className="text-xs text-muted-foreground">
            An error occurred while connecting to the CRM data engine. Please verify backend state.
          </p>
          <button
            onClick={() => companiesQuery.refetch()}
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Enterprise Accounts</h1>
          <p className="text-muted-foreground mt-1.5">
            Directory of corporate profiles, technology sectors, and deal distributions.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search companies by name, domain, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            <Filter className="h-4 w-4" /> Sector
          </span>
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="w-full md:w-48 rounded-xl border border-border bg-card py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
          >
            <option value="">All Sectors</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Companies Grid/List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Company Profile</th>
                <th className="px-6 py-4">Technology Sector</th>
                <th className="px-6 py-4">Employee Scale</th>
                <th className="px-6 py-4">Active Pipeline Value</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm text-foreground">
              {companies.length > 0 ? (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-muted/10 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg bg-gradient-to-tr ${getLogoColor(company.id)} flex items-center justify-center text-white font-bold border border-white/10 shadow-md shadow-indigo-500/5`}>
                          {company.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{company.name}</span>
                          {company.domain && (
                            <a
                              href={`https://${company.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <span>{company.domain}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {company.industry && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          {company.industry}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>{(company.employees || 0).toLocaleString()} staff</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-foreground">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-indigo-400" />
                        <span>{(company.dealValue || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(company)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer"
                          aria-label="Edit Company"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                          aria-label="Delete Company"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No enterprise profiles matched search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Company Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeCreateModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground">Register Enterprise Account</h2>
            <p className="text-xs text-muted-foreground mt-1">Configure company profiles to connect opportunities.</p>

            <form onSubmit={handleCreateCompanySubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Company Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Stark Industries"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Domain (URL)</label>
                  <input
                    type="text"
                    required
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="starkindustries.com"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Tech Industry</label>
                  <input
                    type="text"
                    required
                    value={industryInput}
                    onChange={(e) => setIndustryInput(e.target.value)}
                    placeholder="Aerospace Defense"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Staff Employee Size</label>
                  <input
                    type="number"
                    required
                    value={employeesInput}
                    onChange={(e) => setEmployeesInput(e.target.value)}
                    placeholder="4500"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Deal Pipeline Valuation ($)</label>
                <input
                  type="number"
                  required
                  value={dealValueInput}
                  onChange={(e) => setDealValueInput(e.target.value)}
                  placeholder="340000"
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-semibold text-red-400 animate-pulse">
                  {formError}
                </div>
              )}

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
                  disabled={createCompanyMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {createCompanyMutation.isPending ? 'Registering...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeEditModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground">Modify Company Profile</h2>
            <p className="text-xs text-muted-foreground mt-1">Update corporate properties and directories.</p>

            <form onSubmit={handleUpdateCompanySubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Domain (URL)</label>
                  <input
                    type="text"
                    required
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Tech Industry</label>
                  <input
                    type="text"
                    required
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Staff Employee Size</label>
                  <input
                    type="number"
                    required
                    value={editEmployees}
                    onChange={(e) => setEditEmployees(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {editFormError && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center text-xs font-semibold text-red-400 animate-pulse">
                  {editFormError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCompanyMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {updateCompanyMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
