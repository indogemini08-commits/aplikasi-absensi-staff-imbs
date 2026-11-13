import React from 'react';
import { Inbox, FileText, Calendar, Users, MapPin } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'inbox' | 'file' | 'calendar' | 'users' | 'map';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  title = 'Belum Ada Data',
  description = 'Tidak ada catatan atau data yang tersedia untuk ditampilkan.',
  icon = 'inbox',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-inner">
        {icon === 'inbox' && <Inbox className="w-8 h-8" />}
        {icon === 'file' && <FileText className="w-8 h-8" />}
        {icon === 'calendar' && <Calendar className="w-8 h-8" />}
        {icon === 'users' && <Users className="w-8 h-8" />}
        {icon === 'map' && <MapPin className="w-8 h-8" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

