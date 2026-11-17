'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics-client';
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
  if (!enabled) return null;
  const choose = (value: string) => {
    localStorage.setItem('idea-analytics-consent', value);
    setConsent(value);
    if (value === 'no') {
      localStorage.removeItem('idea-visitor');
      sessionStorage.removeItem('idea-session');
    }
  };
  return consent === null ? (
    <aside className="analytics-consent" aria-label="Analytics preference">
      <p>
        Help improve these tools with anonymous usage statistics. Your files are
        never included. <Link href="/privacy-policy">Privacy policy</Link>
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
