'use client';
import { useState, useSyncExternalStore } from 'react';
import { analyticsAllowed, disableGoogleAnalytics } from '@/lib/google-analytics';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function AnalyticsPreferences() {
  const allowed = useSyncExternalStore(subscribe, analyticsAllowed, () => null);
  const [error, setError] = useState('');
  function optOut() {
    disableGoogleAnalytics(true);
    try {
      localStorage.setItem('idea-analytics-consent', 'no');
      window.dispatchEvent(new StorageEvent('storage', { key: 'idea-analytics-consent' }));
      location.reload();
    } catch {
      setError('Your browser could not save this preference. Enable Do Not Track in your browser to prevent analytics on future visits.');
    }
  }
  return (
    <section>
      <h2>Your analytics preference</h2>
      <p>Google Analytics runs automatically when enabled by the site. You can disable it for this browser. Existing opt-outs, Do Not Track and Global Privacy Control are respected.</p>
      {allowed === false && <p role="status">Google Analytics is disabled for this browser.</p>}
      {allowed === true && <button className="button secondary" onClick={optOut}>Disable Google Analytics on this browser</button>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
