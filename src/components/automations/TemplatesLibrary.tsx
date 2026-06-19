import React, { useState } from 'react';
import { Search, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';

export interface TemplateAction {
  actionType: string;
  configurationJson: Record<string, any>;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Leads' | 'Sales' | 'Customer Success' | 'Operations';
  icon: string;
  triggerEvent: string;
  conditionsJson: any[] | null;
  actions: TemplateAction[];
}

interface TemplatesLibraryProps {
  templates: AutomationTemplate[];
  onSelectTemplate: (template: AutomationTemplate) => void;
  onClose: () => void;
}

export default function TemplatesLibrary({
  templates,
  onSelectTemplate,
  onClose,
}: TemplatesLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Leads', 'Sales', 'Customer Success', 'Operations'];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFriendlyTriggerName = (trigger: string) => {
    return trigger
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getFriendlyActionName = (actionType: string) => {
    if (actionType === 'CREATE_TASK') return 'Create Task';
    if (actionType === 'SEND_NOTIFICATION') return 'Send Notification';
    if (actionType === 'SEND_EMAIL') return 'Send Email';
    return actionType;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Library Subheader */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span>Select a prebuilt template</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Choose from standard CRM automation recipes to kickstart your workflows instantly.
          </p>
        </div>
        
        {/* Search controls */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates (e.g. follow up)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* Category selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin select-none">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === category
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'border border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/80 rounded-2xl text-center space-y-3">
          <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
          <h4 className="text-sm font-bold text-foreground">No templates match search criteria</h4>
          <p className="text-xs text-muted-foreground max-w-xs">
            Try adjusting your search filters or check back later for new additions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const IconComponent = (Icons as any)[template.icon] || Icons.Zap;

            return (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="group relative rounded-2xl border border-border bg-card p-5 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
                      <IconComponent className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-500/15 bg-indigo-500/5 text-indigo-400">
                      {template.category}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div className="space-y-1.5 mt-4">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-indigo-400 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="pt-4 mt-4 border-t border-border/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                    <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Trigger:</span>
                    <span className="bg-secondary/40 px-2 py-0.5 rounded border border-border/30 text-[10px]">
                      {getFriendlyTriggerName(template.triggerEvent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                      <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Actions:</span>
                      <span className="bg-secondary/40 px-2 py-0.5 rounded border border-border/30 text-[10px]">
                        {template.actions.map(a => getFriendlyActionName(a.actionType)).join(', ')}
                      </span>
                    </div>
                    
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Setup</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
