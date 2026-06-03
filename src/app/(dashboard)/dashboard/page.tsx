'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dealsService } from '../../../services/api';
import { Briefcase, BarChart3, TrendingUp, Compass, Plus, Sparkles, MessageSquare, Phone, Mail, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dealsService.getStats,
    retry: 1,
  });

  // Gorgeous mock stats if backend is not started/connected
  const mockStats = {
    totalPipelineValue: 720000,
    totalWonValue: 850000,
    winRate: 72.5,
    activeDealsCount: 4,
    totalDealsCount: 7,
    recentActivities: [
      {
        id: '1',
        type: 'CALL',
        description: 'Introductory discovery call with Elon Musk regarding solar roof software',
        createdAt: new Date().toISOString(),
        contact: { name: 'Elon Musk' },
        deal: { title: 'Tesla Solar Roof Integration' },
      },
      {
        id: '2',
        type: 'MEETING',
        description: 'Proposal presentation with Satya Nadella and Azure stakeholders',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        contact: { name: 'Satya Nadella' },
        deal: { title: 'Azure Cloud Migration Services' },
      },
      {
        id: '3',
        type: 'SYSTEM_UPDATE',
        description: 'Moved deal "GPT-5 Enterprise Partnership" from Proposal to WON',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        contact: { name: 'Sam Altman' },
        deal: { title: 'GPT-5 Enterprise Partnership' },
      },
      {
        id: '4',
        type: 'EMAIL',
        description: 'Sent final contract documents for GPT-5 Enterprise Partnership',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        contact: { name: 'Sam Altman' },
        deal: { title: 'GPT-5 Enterprise Partnership' },
      },
    ],
  };

  const actualStats = stats || mockStats;

  const cards = [
    {
      title: 'Total Pipeline Value',
      value: `$${(actualStats.totalPipelineValue || 0).toLocaleString()}`,
      description: 'Active deal valuations',
      icon: Briefcase,
      color: 'from-indigo-600 to-indigo-800 shadow-indigo-600/10',
      textColor: 'text-indigo-400',
    },
    {
      title: 'Total Closed Won',
      value: `$${(actualStats.totalWonValue || 0).toLocaleString()}`,
      description: 'Realized revenue',
      icon: TrendingUp,
      color: 'from-violet-600 to-violet-800 shadow-violet-600/10',
      textColor: 'text-violet-400',
    },
    {
      title: 'Sales Win Rate',
      value: `${actualStats.winRate || 0}%`,
      description: 'Closed-won vs closed-lost',
      icon: BarChart3,
      color: 'from-fuchsia-600 to-fuchsia-800 shadow-fuchsia-600/10',
      textColor: 'text-fuchsia-400',
    },
    {
      title: 'Active Deal Pipeline',
      value: String(actualStats.activeDealsCount || 0),
      description: 'Negotiation or earlier',
      icon: Compass,
      color: 'from-blue-600 to-blue-800 shadow-blue-600/10',
      textColor: 'text-blue-400',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="h-4 w-4 text-sky-400" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-amber-400" />;
      case 'MEETING':
        return <Calendar className="h-4 w-4 text-emerald-400" />;
      case 'NOTE':
        return <MessageSquare className="h-4 w-4 text-indigo-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-violet-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">CRM Command Center</h1>
          <p className="text-muted-foreground mt-1.5">
            Real-time analytics, revenue milestones, and pipeline updates.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/deals"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2.5 shadow-lg shadow-indigo-600/15 text-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Opportunity</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 flex items-center justify-between">
          <span className="text-sm text-amber-400 font-medium">
            ⚠️ PostgreSQL disconnected. Operating in offline simulation mode using pre-compiled sample records.
          </span>
        </div>
      )}

      {/* Analytics Matrix Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            {/* Subtle glow border effect on hover */}
            <div className="absolute inset-0 rounded-2xl border border-indigo-500/0 group-hover:border-indigo-500/10 pointer-events-none transition-all" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">{card.title}</span>
              <div className={`rounded-xl bg-gradient-to-tr ${card.color} p-2.5 text-white shadow-lg`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{card.value}</h3>
              <p className="text-xs text-muted-foreground font-semibold mt-1">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphical Insights & Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mock Analytics Chart Opportunity */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-md transition-colors duration-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Revenue Projection</h2>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">Projected pipeline distribution vs targets</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-xs font-semibold text-muted-foreground">Target</span>
              <span className="h-2 w-2 rounded-full bg-violet-500 ml-2" />
              <span className="text-xs font-semibold text-muted-foreground">Actual</span>
            </div>
          </div>

          {/* Fully customized premium SVG representation of graphs */}
          <div className="relative h-64 w-full flex items-end">
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="indigo-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="violet-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              {/* Target Line */}
              <path d="M 0 160 Q 125 100 250 80 T 500 50" fill="none" stroke="#4f46e5" strokeWidth="3" />
              <path d="M 0 160 Q 125 100 250 80 T 500 50 L 500 200 L 0 200 Z" fill="url(#indigo-grad)" />

              {/* Actual Line */}
              <path d="M 0 180 Q 125 140 250 110 T 500 70" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="5,5" />
              <path d="M 0 180 Q 125 140 250 110 T 500 70 L 500 200 L 0 200 Z" fill="url(#violet-grad)" />
            </svg>
            <div className="absolute bottom-2 left-0 right-0 flex justify-between px-2 text-[10px] font-bold text-muted-foreground">
              <span>Q1 2026</span>
              <span>Q2 2026</span>
              <span>Q3 2026</span>
              <span>Q4 2026</span>
            </div>
          </div>
        </div>

        {/* Live CRM Stream */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Updates Stream</h2>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">Live CRM logs and updates feed</p>
            </div>
          </div>

          <div className="space-y-5">
            {actualStats.recentActivities.map((act: any, idx: number) => (
              <div key={act.id || idx} className="flex gap-4 relative group">
                {idx < actualStats.recentActivities.length - 1 && (
                  <div className="absolute top-8 bottom-0 left-4 w-px bg-border/60 group-hover:bg-indigo-500/10 transition-colors" />
                )}
                
                <div className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                  {getActivityIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-2">
                    {act.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                      {act.type}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
