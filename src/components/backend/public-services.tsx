'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics-client';
import { enableGoogleAnalytics, disableGoogleAnalytics } from '@/lib/google-analytics';
export function PublicServices() {
  const path = usePathname();
  const [enabled, setEnabled] = useState(false),
    [consent, setConsent] = useState<string | null>('pending');
  useEffect(() => {
    api<{ analyticsEnabled: boolean }>('public/settings')
      .then((s) => {
        setEnabled(s.analyticsEnabled);
        setConsent(localStorage.getItem('idea-analytics-consent'));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (enabled && consent === 'yes') void trackEvent('page_view');
  }, [path, enabled, consent]);
  useEffect(() => {
    if (enabled && consent === 'yes') enableGoogleAnalytics();
    else disableGoogleAnalytics();
    return () => disableGoogleAnalytics();
  }, [enabled, consent]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== 'idea-analytics-consent' && event.key !== null) return;
      disableGoogleAnalytics(true);
      location.reload();
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  if (!enabled) return null;
  const choose = (value: string) => {
    localStorage.setItem('idea-analytics-consent', value);
    setConsent(value);
    if (value === 'no') {
      disableGoogleAnalytics(true);
      localStorage.removeItem('idea-visitor');
      sessionStorage.removeItem('idea-session');
      // Fully unload automatic measurement listeners after withdrawal.
      location.reload();
    }
  };
  return consent === null ? (
    <aside className="analytics-consent" aria-label="Analytics preference">
      <p>
        Allow usage analytics, including Google Analytics cookies, to help improve
        these tools. Your files are never included. <Link href="/privacy-policy">Privacy policy</Link>
      </p>
      <button onClick={() => choose('yes')}>Allow analytics</button>
      <button onClick={() => choose('no')}>No thanks</button>
    </aside>
  ) : (
    <button className="analytics-preferences" onClick={() => setConsent(null)}>
      Privacy preferences
    </button>
  );
}
