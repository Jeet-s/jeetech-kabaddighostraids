import { store } from "../modules/store";
import { haptic, play, type Sfx } from "../audio/sfx";

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

// ───────────────────────────── Chant Studio ─────────────────────────────

/**
 * Chant Studio: 8 fixed crowd chants (no random rewards). 6 are bought with coins or Chant Tokens, 2 come from the
 * free Season Pass (tiers 4 and 10). The equipped chant plays when you sign a player at the Auction Hall and when you
 * claim a Season Pass tier; Preview plays it any time.
 */
export interface Chant {
  id: string; name: string; line: string; coins?: number; tokens?: number; passTier?: number; colors: [string, string];
  /** Preview beat: [sound, ms after the previous beat]. */
  beat: [Sfx, number][];
}
export const CHANTS: Chant[] = [
  { id: "chant_kabaddi", name: "Kabaddi! Kabaddi!", line: "The classic two-beat raid call", colors: ["#FFD25A", "#E08A00"], beat: [["tap", 0], ["tap", 160], ["pop", 220], ["tap", 380], ["tap", 160], ["pop", 220]] },
  { id: "chant_dhol", name: "Dhol Drum Roll", line: "A rolling village drum that builds to a hit", coins: 300, colors: ["#FF8A3C", "#B3121C"], beat: [["move", 0], ["move", 110], ["move", 110], ["move", 110], ["move", 110], ["success", 160]] },
  { id: "chant_clap", name: "Thunder Clap", line: "The whole stand claps in slow, heavy time", coins: 500, colors: ["#7D8BFF", "#2D3BCB"], beat: [["pop", 0], ["pop", 420], ["pop", 420], ["pop", 300], ["pop", 140], ["star3", 200]] },
  { id: "chant_ghost", name: "Ghost Whisper", line: "A hush, then a roar as the raider crosses", tokens: 3, colors: ["#4FE3FF", "#6C5BFF"], beat: [["whoosh", 0], ["whoosh", 380], ["unlock", 420]] },
  { id: "chant_monsoon", name: "Monsoon Beat", line: "Fast rain-on-tin rhythm from the top rows", coins: 700, colors: ["#5CFFC8", "#0A7FA6"], beat: [["tap", 0], ["tap", 90], ["move", 90], ["tap", 90], ["tap", 90], ["move", 90], ["coin", 160]] },
  { id: "chant_victory", name: "Victory Dhol", line: "The big-final drum and horn fanfare", tokens: 5, colors: ["#FFE27A", "#C77700"], beat: [["move", 0], ["move", 150], ["star1", 180], ["star2", 180], ["star3", 180], ["success", 220]] },
  { id: "chant_anthem", name: "Season Anthem", line: "Season Pass chant: the league's own song", passTier: 4, colors: ["#C792FF", "#7A3FBF"], beat: [["star1", 0], ["star2", 240], ["star3", 240], ["unlock", 300]] },
  { id: "chant_roar", name: "Champion's Roar", line: "Season Pass chant: a full-stadium roar", passTier: 10, colors: ["#FF6A6F", "#A81E26"], beat: [["whoosh", 0], ["pop", 200], ["pop", 120], ["success", 200], ["coin", 260]] },
];
export const DEFAULT_CHANT = "chant_kabaddi";
export const chantOf = (id: string) => CHANTS.find((c) => c.id === id) ?? CHANTS[0];
export const ownsChant = (id: string) => {
  const c = CHANTS.find((x) => x.id === id);
  return !!c && ((!c.coins && !c.tokens && !c.passTier) || (store.get().chants ?? []).includes(id));
};
export const equippedChant = (): Chant => {
  const id = store.get().chant ?? DEFAULT_CHANT;
  return ownsChant(id) ? chantOf(id) : chantOf(DEFAULT_CHANT);
};
export const canAffordChant = (c: Chant) => !c.passTier && store.get().coins >= (c.coins ?? 0) && (store.get().tokens ?? 0) >= (c.tokens ?? 0);

/** Buy + equip a coin/token chant. */
export function buyChant(c: Chant): boolean {
  if (ownsChant(c.id) || !canAffordChant(c)) return false;
  const s = store.get();
  store.set({ coins: s.coins - (c.coins ?? 0), tokens: (s.tokens ?? 0) - (c.tokens ?? 0), chants: [...(s.chants ?? []), c.id], chant: c.id });
  return true;
}
/** Grant a chant (Season Pass reward). */
export function grantChant(id: string): void {
  const s = store.get();
  if (!(s.chants ?? []).includes(id)) store.set({ chants: [...(s.chants ?? []), id] });
}
export function equipChant(c: Chant): void {
  if (ownsChant(c.id)) store.set({ chant: c.id });
}

let chantTimers: ReturnType<typeof setTimeout>[] = [];
/** Play a chant's beat (respects the Sound / Vibration settings via play/haptic). */
export function playChant(c: Chant = equippedChant()): void {
  chantTimers.forEach(clearTimeout);
  chantTimers = [];
  let at = 0;
  for (const [sfx, gap] of c.beat) {
    at += gap;
    chantTimers.push(setTimeout(() => { play(sfx); haptic(sfx === "pop" || sfx === "move" ? "medium" : "light"); }, at));
  }
}
