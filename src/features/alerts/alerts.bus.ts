export const ALERTS_INVALIDATE_EVENT = "crm:invalidate-alerts";

export function invalidateAlerts() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ALERTS_INVALIDATE_EVENT));
}
