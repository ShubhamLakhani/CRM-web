import React from 'react';

export default function ExecutionLogsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors duration-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Execution ID</th>
              <th className="px-6 py-4">Automation Rule</th>
              <th className="px-6 py-4">Trigger Event</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Trigger Time</th>
              <th className="px-6 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: 10 }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="h-4 w-36 rounded bg-secondary-foreground/15 font-mono" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-32 rounded bg-secondary-foreground/10" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-28 rounded bg-secondary-foreground/10" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-5 w-16 rounded-lg bg-secondary-foreground/10" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-24 rounded bg-secondary-foreground/10" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-48 rounded bg-secondary-foreground/10" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-muted/10 px-6 py-4 flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <div className="h-4 w-36 rounded bg-secondary-foreground/10 animate-pulse" />
        <div className="h-6 w-28 rounded bg-secondary-foreground/10 animate-pulse" />
      </div>
    </div>
  );
}
