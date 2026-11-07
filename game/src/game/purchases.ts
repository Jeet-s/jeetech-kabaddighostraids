import { iap } from "../modules/iap";
import { store } from "../modules/store";

export const STORE_UNREACHABLE = "Store not reachable — check your connection and try again.";

/**
 * Restore purchases with a visible result (Shop and Settings). The store is reachable only when it returned products;
 * without that, iap.restore() silently does nothing, so say so instead of a dead tap.
 */
export async function restorePurchases(): Promise<string> {
  if (iap.items().length === 0) return STORE_UNREACHABLE;
  const before = store.get().adsRemoved;
  try {
    await iap.restore();
  } catch {
    return STORE_UNREACHABLE;
  }
  const after = store.get().adsRemoved;
  return after ? (before ? "Purchases restored — ads are already removed ✓" : "Purchases restored — ads removed ✓") : "Nothing to restore on this account.";
}
