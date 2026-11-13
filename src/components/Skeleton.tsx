import React from 'react';

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-16" />
      </div>
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-2/3" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 animate-pulse space-y-3">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-md w-1/4 mb-4" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}

