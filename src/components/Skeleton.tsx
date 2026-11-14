import React from 'react';

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-3xl p-6 border border-white/80 dark:border-white/10 space-y-4 hologram-shimmer">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200/80 dark:bg-slate-700/80 rounded-xl w-1/3 animate-pulse" />
        <div className="h-4 bg-slate-200/80 dark:bg-slate-700/80 rounded-xl w-16 animate-pulse" />
      </div>
      <div className="h-9 bg-slate-200/80 dark:bg-slate-700/80 rounded-2xl w-1/2 animate-pulse" />
      <div className="h-3.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-xl w-2/3 animate-pulse" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="glass-card rounded-3xl p-5 border border-white/80 dark:border-white/10 space-y-4 hologram-shimmer">
      <div className="h-6 bg-slate-200/80 dark:bg-slate-700/80 rounded-xl w-1/4 mb-4 animate-pulse" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100/60 dark:border-slate-800/60">
          <div className="w-9 h-9 rounded-2xl bg-slate-200/80 dark:bg-slate-700/80 shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg w-1/3 animate-pulse" />
            <div className="h-2.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg w-1/4 animate-pulse" />
          </div>
          <div className="h-7 bg-slate-200/80 dark:bg-slate-700/80 rounded-xl w-20 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
