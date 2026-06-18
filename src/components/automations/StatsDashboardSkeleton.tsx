import React from 'react';

export default function StatsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Rule selector skeleton */}
      <div className="flex items-center gap-3 w-full md:w-auto animate-pulse">
        <div className="h-4 w-32 rounded bg-secondary-foreground/10" />
        <div className="h-10 w-64 rounded-xl bg-secondary-foreground/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Success Rate Card Skeleton */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center justify-center min-h-[200px] animate-pulse">
          <div className="h-3.5 w-24 rounded bg-secondary-foreground/10 mb-4" />
          <div className="h-28 w-28 rounded-full border-8 border-secondary-foreground/5 flex items-center justify-center mb-2">
            <div className="h-12 w-12 rounded bg-secondary-foreground/10" />
          </div>
          <div className="h-3 w-32 rounded bg-secondary-foreground/10" />
        </div>

        {/* Aggregate Stats Cards Grid */}
        <div className="md:col-span-3 grid grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded bg-secondary-foreground/10" />
                <div className="h-4 w-4 rounded-full bg-secondary-foreground/10" />
              </div>
              <div className="h-8 w-12 rounded bg-secondary-foreground/15" />
              <div className="h-2 w-full rounded bg-secondary-foreground/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
