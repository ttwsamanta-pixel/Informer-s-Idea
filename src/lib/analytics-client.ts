import { trackGoogleTool } from '@/lib/google-analytics';

// GA4 owns page views. No visitor events are sent to the MySQL collector.
export async function trackEvent(kind: 'page_view' | 'tool_started', tool?: string) {
  try {
    if (kind === 'tool_started') trackGoogleTool(tool);
  } catch { /* Analytics must never interrupt a tool or download. */ }
}
