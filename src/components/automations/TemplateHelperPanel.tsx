import React, { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';

interface VariableItem {
  key: string;
  description: string;
}

const TEMPLATE_VARIABLES: VariableItem[] = [
  { key: '{{contact.name}}', description: 'Contact Full Name' },
  { key: '{{contact.email}}', description: 'Contact Email Address' },
  { key: '{{contact.status}}', description: 'Contact Lifecycle Status' },
  { key: '{{before.contact.status}}', description: 'Previous Contact Status' },
  { key: '{{deal.title}}', description: 'Pipeline Deal Title' },
  { key: '{{deal.value}}', description: 'Pipeline Deal Value ($)' },
  { key: '{{deal.stage}}', description: 'Pipeline Deal Stage' },
  { key: '{{before.deal.stage}}', description: 'Previous Deal Stage' },
  { key: '{{task.title}}', description: 'Action Task Title' },
  { key: '{{task.status}}', description: 'Action Task Status' },
  { key: '{{before.task.status}}', description: 'Previous Task Status' },
];

export default function TemplateHelperPanel() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/65 backdrop-blur-sm p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
          Dynamic Template Variables
        </h4>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Click any token below to copy it. You can paste these into notification messages, task summaries, or email bodies to auto-populate event coordinates.
      </p>
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {TEMPLATE_VARIABLES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleCopy(item.key)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 border border-border/30 hover:border-border/60 transition-all text-left group"
          >
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-mono font-bold text-indigo-400 truncate">
                {item.key}
              </span>
              <span className="text-[9px] text-muted-foreground mt-0.5 truncate">
                {item.description}
              </span>
            </div>
            <div className="flex-shrink-0 p-1">
              {copiedKey === item.key ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
