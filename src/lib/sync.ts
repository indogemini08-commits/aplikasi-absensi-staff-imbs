'use client';

// Central Real-time Data Synchronization & Cache Invalidation Bus
// Eliminates stale sessionStorage caches and keeps all pages/tabs 100% in sync with the live database

import { useEffect } from 'react';

const SYNC_CHANNEL_NAME = 'imbs_realtime_sync_bus';
const DATA_CHANGE_EVENT = 'imbs:data_changed';

export const MASTER_CACHE_KEYS = [
  'imbs_pegawai_list',
  'imbs_departments_list',
  'imbs_shifts_list',
  'imbs_absensi_master',
  'imbs_audit_logs',
  'imbs_leave_requests',
  'imbs_jadwal_depts',
  'imbs_jadwal_emps',
  'imbs_holidays_list',
  'imbs_late_records',
  'imbs_corrections_list',
  'imbs_laporan_data',
  'imbs_locations_list',
  'imbs_admin_board',
  'imbs_admin_leaves',
  'imbs_admin_logs',
  'imbs_papan_jadwal',
  'imbs_staff_status',
  'imbs_staff_history_summary',
  'imbs_staff_recent_records',
  'imbs_staff_leaves',
  'imbs_staff_balance',
  'imbs_staff_corrections',
  'imbs_notifications',
  'imbs_unread_count',
  'imbs_history_records',
  'imbs_history_summary',
];

/**
 * Invalidate all client-side master cache keys so data is always 100% fresh from live DB
 */
export function invalidateMasterCache(specificKey?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (specificKey) {
      sessionStorage.removeItem(specificKey);
    } else {
      for (const k of MASTER_CACHE_KEYS) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {}
}

/**
 * Broadcasts a database / entity change event across all open tabs and components.
 * Causes all active views to re-fetch live data immediately.
 */
export function broadcastDataChange(entity: string = 'all') {
  if (typeof window === 'undefined') return;

  // 1. Invalidate client sessionStorage cache
  invalidateMasterCache();

  // 2. Dispatch local window CustomEvent
  window.dispatchEvent(
    new CustomEvent(DATA_CHANGE_EVENT, {
      detail: { entity, timestamp: Date.now() },
    })
  );

  // 3. Broadcast across browser tabs via BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage({ entity, timestamp: Date.now() });
      channel.close();
    }
  } catch {}
}

/**
 * React Hook for automatic real-time synchronization.
 * Triggers `onSync()` whenever a mutation occurs in any tab or component.
 */
export function useDataSync(onSync: () => void, entities?: string[]) {
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const changed = customEvent?.detail?.entity;
      if (!entities || !changed || changed === 'all' || entities.includes(changed)) {
        onSync();
      }
    };

    window.addEventListener(DATA_CHANGE_EVENT, handleEvent);

    // Auto-sync when user returns / focuses the tab (e.g., after modifying database in Neon / admin tool)
    const handleFocus = () => {
      onSync();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        onSync();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channel.onmessage = (msg) => {
          const changed = msg.data?.entity;
          if (!entities || !changed || changed === 'all' || entities.includes(changed)) {
            onSync();
          }
        };
      }
    } catch {}

    // Subtle 20s background sync pulse for active tabs
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        onSync();
      }
    }, 20000);

    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleEvent);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(intervalId);
      if (channel) {
        try {
          channel.close();
        } catch {}
      }
    };
  }, [onSync, entities]);
}
