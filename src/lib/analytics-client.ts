import { trackGoogleTool, type ToolEvent } from '@/lib/google-analytics';

// GA4 owns page views. No visitor events are sent to the MySQL collector.
export async function trackEvent(kind: 'page_view' | ToolEvent, tool?: string) {
  try {
    if (kind !== 'page_view') trackGoogleTool(tool, kind);
  } catch {
    /* Analytics must never interrupt a tool or download. */
  }
}
