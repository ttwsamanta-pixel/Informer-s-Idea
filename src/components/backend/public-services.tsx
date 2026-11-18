'use client';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { enableGoogleAnalytics, disableGoogleAnalytics } from '@/lib/google-analytics';

export function PublicServices() {
  useEffect(() => {
    let active = true;
    // Retire identifiers used by the former built-in analytics collector.
    try {
      localStorage.removeItem('idea-visitor');
      sessionStorage.removeItem('idea-session');
      sessionStorage.removeItem('idea-last-event');
    } catch { /* Storage may be unavailable. */ }
    api<{ analyticsEnabled: boolean }>('public/settings')
      .then((settings) => {
        if (active && settings.analyticsEnabled) enableGoogleAnalytics();
      })
      .catch(() => {});
    const sync = (event: StorageEvent) => {
      if (event.key !== 'idea-analytics-consent' && event.key !== null) return;
      disableGoogleAnalytics(true);
      location.reload();
    };
    window.addEventListener('storage', sync);
    return () => {
      active = false;
      disableGoogleAnalytics();
      window.removeEventListener('storage', sync);
    };
  }, []);
  return null;
}
