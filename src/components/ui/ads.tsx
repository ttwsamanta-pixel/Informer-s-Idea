export function AdSlot({
  enabled = false,
  placement = 'banner',
}: {
  enabled?: boolean;
  placement?: 'banner' | 'sidebar' | 'tool-top' | 'tool-bottom';
}) {
  return enabled ? (
    <aside
      className="ad-slot"
      aria-label="Advertisement"
      data-placement={placement}
    >
      Advertisement
    </aside>
  ) : null;
}
export const AdBanner = AdSlot;
export const AdSidebar = AdSlot;
export const AdToolTop = AdSlot;
export const AdToolBottom = AdSlot;
