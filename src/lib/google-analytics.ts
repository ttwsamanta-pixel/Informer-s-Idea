// Public GA4 stream identifier, not a credential.
export const GA_MEASUREMENT_ID = 'G-MDY2R8G1ET';
export const GTM_CONTAINER_ID = 'GTM-NX9ZCCHS';
const disableKey = `ga-disable-${GA_MEASUREMENT_ID}`;
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [disableKey]?: boolean;
};
let initialized = false;

export function analyticsAllowed() {
  try {
    return (
      localStorage.getItem('idea-analytics-consent') !== 'no' &&
      navigator.doNotTrack !== '1' &&
      !(navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    );
  } catch {
    return false;
  }
}

export function enableGoogleAnalytics() {
  if (!analyticsAllowed() || location.pathname.startsWith('/admin')) return;
  const win = window as AnalyticsWindow;
  win[disableKey] = false;
  if (initialized) return;
  initialized = true;
  win.dataLayer = win.dataLayer || [];
  // gtag's queue uses Arguments objects (the Google bootstrap convention).
  win.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    win.dataLayer!.push(arguments);
  };
  win.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  // The container's Google Analytics tag owns stream configuration and page
  // views. Global settings also apply to events queued before it loads.
  win.gtag('set', {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  win.gtag('js', new Date());
  const script = document.createElement('script');
  script.id = 'idea-google-tag-manager';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);
}

export function disableGoogleAnalytics(clearCookies = false) {
  (window as AnalyticsWindow)[disableKey] = true;
  if (!clearCookies) return;
  const parts = location.hostname.split('.');
  const domains = [
    '',
    ...parts.map((_, index) => `.${parts.slice(index).join('.')}`),
  ];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (name !== '_ga' && !name.startsWith('_ga_')) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ''}`;
    }
  }
}

export type ToolEvent =
  | 'tool_started'
  | 'tool_completed'
  | 'tool_error'
  | 'tool_cancelled'
  | 'tool_download';

export function trackGoogleTool(
  tool?: string,
  event: ToolEvent = 'tool_started',
) {
  if (
    !analyticsAllowed() ||
    !tool ||
    !/^[a-z0-9-]+$/.test(tool) ||
    location.pathname.startsWith('/admin')
  )
    return;
  const win = window as AnalyticsWindow;
  if (win[disableKey] || !initialized) return;
  win.gtag?.('event', event, { tool_id: tool });
}
