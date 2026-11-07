import { store } from "../modules/store";

/**
 * Kit Album: fixed, fully visible cosmetics bought with coins or Chant Tokens (no random rewards, no real money).
 * Every item changes something you see in a match: your crest shield on the scoreboard, your raid-path trail on the
 * mat, and the colour of your raid banners. Owning all 4 items of a set pays a one-time set bonus.
 */
export type KitSlot = "crest" | "trail" | "banner";
export interface KitItem { id: string; slot: KitSlot; name: string; coins?: number; tokens?: number; colors: [string, string] }

export const KIT_SETS: { slot: KitSlot; name: string; what: string; bonus: { coins: number; tokens: number } }[] = [
  { slot: "crest", name: "Crest Shields", what: "Your scoreboard shield", bonus: { coins: 200, tokens: 2 } },
  { slot: "trail", name: "Raid Trails", what: "Your raid path on the mat", bonus: { coins: 250, tokens: 2 } },
  { slot: "banner", name: "Raid Banners", what: "Banners on your raids and wins", bonus: { coins: 300, tokens: 3 } },
];

export const KIT: KitItem[] = [
  { id: "crest_crimson", slot: "crest", name: "Crimson", colors: ["#FF5A5F", "#B3121C"] },
  { id: "crest_emerald", slot: "crest", name: "Emerald", coins: 400, colors: ["#4BE39A", "#11734A"] },
  { id: "crest_midnight", slot: "crest", name: "Midnight", tokens: 3, colors: ["#6C5BFF", "#221A72"] },
  { id: "crest_saffron", slot: "crest", name: "Saffron", coins: 800, colors: ["#FFC14A", "#D25E00"] },
  { id: "trail_gold", slot: "trail", name: "Gold", colors: ["#FFD23F", "#FFB400"] },
  { id: "trail_ghost", slot: "trail", name: "Ghost", coins: 300, colors: ["#4FE3FF", "#12B5E5"] },
  { id: "trail_fire", slot: "trail", name: "Fire", tokens: 4, colors: ["#FF7A3C", "#E8363D"] },
  { id: "trail_storm", slot: "trail", name: "Storm", coins: 700, colors: ["#C792FF", "#7A3FBF"] },
  { id: "banner_saffron", slot: "banner", name: "Saffron", colors: ["#FFE27A", "#E08A00"] },
  { id: "banner_royal", slot: "banner", name: "Royal", coins: 500, colors: ["#7D8BFF", "#2D3BCB"] },
  { id: "banner_neon", slot: "banner", name: "Neon", tokens: 5, colors: ["#5CFFC8", "#0A9A8A"] },
  { id: "banner_emerald", slot: "banner", name: "Jungle", coins: 900, colors: ["#8CF06A", "#2E8B57"] },
];

const DEFAULT: Record<KitSlot, string> = { crest: "crest_crimson", trail: "trail_gold", banner: "banner_saffron" };
export const isFree = (i: KitItem) => !i.coins && !i.tokens;
export const owns = (id: string) => { const i = KIT.find((k) => k.id === id); return !!i && (isFree(i) || (store.get().kit ?? []).includes(id)); };
export const equipped = (slot: KitSlot): KitItem => {
  const id = store.get().equip?.[slot] ?? DEFAULT[slot];
  return KIT.find((k) => k.id === id && owns(id)) ?? KIT.find((k) => k.id === DEFAULT[slot])!;
};
export const setDone = (slot: KitSlot) => KIT.filter((k) => k.slot === slot).every((k) => owns(k.id));

export function canAfford(i: KitItem): boolean {
  const s = store.get();
  return s.coins >= (i.coins ?? 0) && (s.tokens ?? 0) >= (i.tokens ?? 0);
}

/** Buy + equip. Returns the set bonus if this item completed its set (paid once), or null. */
export function buy(i: KitItem): { coins: number; tokens: number } | null {
  if (owns(i.id) || !canAfford(i)) return null;
  const s = store.get();
  store.set({
    coins: s.coins - (i.coins ?? 0), tokens: (s.tokens ?? 0) - (i.tokens ?? 0),
    kit: [...(s.kit ?? []), i.id], equip: { ...(s.equip ?? {}), [i.slot]: i.id },
  });
  const set = KIT_SETS.find((x) => x.slot === i.slot)!;
  if (setDone(i.slot) && !(store.get().kitSets ?? []).includes(i.slot)) {
    const t = store.get();
    store.set({ coins: t.coins + set.bonus.coins, tokens: (t.tokens ?? 0) + set.bonus.tokens, kitSets: [...(t.kitSets ?? []), i.slot] });
    return set.bonus;
  }
  return null;
}

export function equip(i: KitItem): void {
  if (!owns(i.id)) return;
  store.set({ equip: { ...(store.get().equip ?? {}), [i.slot]: i.id } });
}
