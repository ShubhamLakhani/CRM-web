import React from 'react';

export default function AutomationDrawerSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title placeholder */}
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-secondary-foreground/10" />
        <div className="h-10 w-full rounded-xl bg-secondary-foreground/10" />
      </div>

      {/* Description placeholder */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-secondary-foreground/10" />
        <div className="h-16 w-full rounded-xl bg-secondary-foreground/10" />
      </div>

      {/* Trigger selection placeholder */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-secondary-foreground/10" />
        <div className="h-10 w-full rounded-xl bg-secondary-foreground/10" />
      </div>

      {/* Conditions list placeholder */}
      <div className="space-y-3 pt-4 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-secondary-foreground/10" />
          <div className="h-6 w-24 rounded bg-secondary-foreground/10" />
        </div>
        <div className="flex gap-3 items-center">
          <div className="h-10 flex-1 rounded-xl bg-secondary-foreground/10" />
          <div className="h-10 flex-1 rounded-xl bg-secondary-foreground/10" />
          <div className="h-10 flex-1 rounded-xl bg-secondary-foreground/10" />
          <div className="h-7 w-7 rounded-md bg-secondary-foreground/10" />
        </div>
      </div>

      {/* Actions placeholder */}
      <div className="space-y-3 pt-4 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-secondary-foreground/10" />
          <div className="h-6 w-20 rounded bg-secondary-foreground/10" />
        </div>
        <div className="rounded-xl border border-border bg-muted/5 p-4 space-y-4">
          <div className="h-4 w-32 rounded bg-secondary-foreground/10" />
          <div className="h-10 w-full rounded-xl bg-secondary-foreground/10" />
        </div>
      </div>
    </div>
  );
}
