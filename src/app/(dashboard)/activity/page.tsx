'use client';

import React, { useState } from 'react';
import { Search, Plus, Phone, Mail, Calendar, MessageSquare, Sparkles, Filter, Trash2, Clock } from 'lucide-react';

interface ActivityLog {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'SYSTEM_UPDATE';
  description: string;
  creator: {
    name: string;
    avatarInitials: string;
  };
  contactName?: string;
  dealTitle?: string;
  createdAt: string;
}

export default function ActivityPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ActivityLog['type']>('NOTE');
  const [contactName, setContactName] = useState('');
  const [dealTitle, setDealTitle] = useState('');

  const [activities, setActivities] = useState<ActivityLog[]>([
    {
      id: 'act-1',
      type: 'CALL',
      description: 'Introductory discovery call with Elon Musk regarding solar roof software licensing parameters',
      creator: { name: 'Sarah Connor', avatarInitials: 'SC' },
      contactName: 'Elon Musk',
      dealTitle: 'Tesla Solar Roof Integration',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'act-2',
      type: 'MEETING',
      description: 'Presented AWS cloud security and high-availability architecture proposal to Microsoft stakeholders',
      creator: { name: 'Sarah Connor', avatarInitials: 'SC' },
      contactName: 'Satya Nadella',
      dealTitle: 'Azure Cloud Migration Services',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: 'act-3',
      type: 'NOTE',
      description: 'Sam Altman requested customized enterprise data compliance guarantees for GDPR standards',
      creator: { name: 'John Doe', avatarInitials: 'JD' },
      contactName: 'Sam Altman',
      dealTitle: 'GPT-5 Enterprise Partnership',
      createdAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    },
    {
      id: 'act-4',
      type: 'EMAIL',
      description: 'Sent final contract documents for GPT-5 Enterprise Partnership for digital signature execution',
      creator: { name: 'Sarah Connor', avatarInitials: 'SC' },
      contactName: 'Sam Altman',
      dealTitle: 'GPT-5 Enterprise Partnership',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: 'act-5',
      type: 'SYSTEM_UPDATE',
      description: 'Workspace Apex HQ CRM node initialized with PostgreSQL master databases healthy',
      creator: { name: 'Sarah Connor', avatarInitials: 'SC' },
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
  ]);

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const newActivity: ActivityLog = {
      id: `act-${Date.now()}`,
      type,
      description,
      creator: { name: 'Sarah Connor', avatarInitials: 'SC' },
      contactName: contactName || undefined,
      dealTitle: dealTitle || undefined,
      createdAt: new Date().toISOString(),
    };

    setActivities([newActivity, ...activities]);
    closeModal();
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setDescription('');
    setType('NOTE');
    setContactName('');
    setDealTitle('');
  };

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'CALL':
        return <Phone className="h-4.5 w-4.5 text-sky-400" />;
      case 'EMAIL':
        return <Mail className="h-4.5 w-4.5 text-amber-400" />;
      case 'MEETING':
        return <Calendar className="h-4.5 w-4.5 text-emerald-400" />;
      case 'NOTE':
        return <MessageSquare className="h-4.5 w-4.5 text-indigo-400" />;
      default: // SYSTEM_UPDATE
        return <Sparkles className="h-4.5 w-4.5 text-violet-400" />;
    }
  };

  const getBadgeClass = (type: ActivityLog['type']) => {
    switch (type) {
      case 'CALL':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/15';
      case 'EMAIL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/15';
      case 'MEETING':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15';
      case 'NOTE':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15';
      default:
        return 'bg-violet-500/10 text-violet-400 border-violet-500/15';
    }
  };

  // Filter list
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.description.toLowerCase().includes(search.toLowerCase()) ||
      (act.contactName && act.contactName.toLowerCase().includes(search.toLowerCase())) ||
      (act.dealTitle && act.dealTitle.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter ? act.type === typeFilter : true;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Workspace Feed</h1>
          <p className="text-muted-foreground mt-1.5">
            Audit logs timeline representing full CRM interaction coordinates.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Control filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search feed logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            Filter Type
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-44 rounded-xl border border-border bg-card py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
          >
            <option value="">All Streams</option>
            <option value="NOTE">Notes Only</option>
            <option value="CALL">Calls Only</option>
            <option value="EMAIL">Emails Only</option>
            <option value="MEETING">Meetings Only</option>
            <option value="SYSTEM_UPDATE">Updates Only</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative border-l border-border/80 pl-8 ml-4 space-y-8 py-2">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((act) => (
            <div key={act.id} className="relative group animate-in slide-in-from-bottom-2 duration-200">
              {/* Timeline dot icon */}
              <div className="absolute -left-12.5 top-1 h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-md relative z-10">
                {getActivityIcon(act.type)}
              </div>

              {/* Feed Card Log */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-150 relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border/50 pb-3.5 mb-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase ${getBadgeClass(act.type)}`}>
                      {act.type}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(act.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-indigo-400/20">
                        {act.creator.avatarInitials}
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {act.creator.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteActivity(act.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      aria-label="Delete Log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {act.description}
                </p>

                {/* Relational details */}
                {(act.contactName || act.dealTitle) && (
                  <div className="mt-3.5 flex items-center gap-3 flex-wrap">
                    {act.contactName && (
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase bg-secondary border border-border/60 px-2 py-0.5 rounded">
                        Contact: {act.contactName}
                      </span>
                    )}
                    {act.dealTitle && (
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase bg-secondary border border-border/60 px-2 py-0.5 rounded">
                        Deal: {act.dealTitle}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-12">
            No activity streams matched standard selection coordinates.
          </div>
        )}
      </div>

      {/* Add Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground">Record Action Activity</h2>
            <p className="text-xs text-muted-foreground mt-1">Audit log coordinate parameters to document client coordination.</p>

            <form onSubmit={handleCreateActivity} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Action Type</label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-sm text-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                >
                  <option value="NOTE">Internal Note</option>
                  <option value="CALL">Log Call</option>
                  <option value="EMAIL">Log Email</option>
                  <option value="MEETING">Log Meeting</option>
                  <option value="SYSTEM_UPDATE">Log System Update</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Log Details Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Completed contract negotiations for enterprise licenses upgrade with Elon Musk..."
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Link Contact (Name)</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Elon Musk"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Link Deal (Title)</label>
                  <input
                    type="text"
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    placeholder="Tesla Solar Roof Upgrade"
                    className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

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
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 text-sm transition-all cursor-pointer"
                >
                  Save Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
