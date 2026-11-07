/**
 * Squad: the Ghost Raiders' roster as a collection + progression meta (it does not change match results — the match
 * engine plays its own trial line-ups). 12 fictional starters (7 on the mat, 5 subs) plus 12 auction stars you can
 * sign at the Auction Hall (src/game/auctionHall.ts). Each player has a role and 5 skills; training raises one skill
 * by +3 a level (5 levels per skill) for a free training point or coins. Persistence: src/modules/store.ts.
 */
import { store } from "../modules/store";
import type { ArtId } from "../art";

export type SquadRole = "Raider" | "Corner" | "Cover" | "All-rounder";
export const SKILLS = ["Raid Reach", "Tackle Grip", "Speed", "Stamina", "Agility"] as const;
export interface Player { id: string; name: string; role: SquadRole; no: number; base: [number, number, number, number, number] }

const P = (id: string, name: string, role: SquadRole, no: number, base: Player["base"]): Player => ({ id, name, role, no, base });

/** The squad you start with: indices 0-6 on the mat, 7-11 subs. */
export const STARTERS: Player[] = [
  P("kiran", "Kiran Dhull", "Raider", 7, [72, 40, 70, 62, 68]),
  P("vikas", "Vikas Rana", "Raider", 10, [66, 38, 72, 58, 70]),
  P("sahil", "Sahil Bhatt", "All-rounder", 5, [58, 56, 60, 64, 57]),
  P("deepak", "Deepak Sandhu", "Corner", 2, [36, 70, 58, 60, 52]),
  P("manoj", "Manoj Kale", "Corner", 3, [38, 68, 55, 62, 50]),
  P("ravi", "Ravi Pawar", "Cover", 4, [40, 64, 60, 58, 56]),
  P("nitin", "Nitin Gill", "Cover", 6, [42, 62, 62, 56, 58]),
  P("ajay", "Ajay Tomar", "Raider", 11, [64, 36, 66, 55, 64]),
  P("harish", "Harish Naik", "Corner", 12, [34, 62, 52, 58, 48]),
  P("pradeep", "Pradeep Yadav", "Cover", 14, [38, 58, 56, 60, 54]),
  P("imran", "Imran Shaikh", "All-rounder", 8, [55, 52, 58, 60, 55]),
  P("lokesh", "Lokesh Rao", "Corner", 15, [35, 60, 54, 57, 49]),
];

/** Auction stars: fixed, fully visible players sold one by one at the Auction Hall, in this order. */
export const AUCTION_POOL: Player[] = [
  P("rohit", "Rohit Chahar", "Raider", 9, [84, 42, 80, 70, 78]),
  P("sunil", "Sunil Bairwa", "Corner", 21, [40, 82, 64, 72, 58]),
  P("faizal", "Faizal Khan", "Cover", 23, [44, 78, 70, 68, 64]),
  P("gurpreet", "Gurpreet Sidhu", "All-rounder", 17, [70, 66, 68, 74, 66]),
  P("tenzin", "Tenzin Wangdi", "Raider", 1, [78, 40, 84, 64, 82]),
  P("ashok", "Ashok Mane", "Corner", 25, [38, 80, 60, 76, 54]),
  P("vijay", "Vijay Kumaran", "Raider", 13, [80, 46, 74, 72, 74]),
  P("bilal", "Bilal Qureshi", "Cover", 27, [46, 76, 72, 64, 68]),
  P("kartik", "Kartik Joshi", "All-rounder", 18, [68, 64, 70, 70, 64]),
  P("mohit", "Mohit Lather", "Corner", 33, [42, 84, 62, 74, 56]),
  P("arjun", "Arjun Devadiga", "Raider", 77, [82, 44, 78, 66, 80]),
  P("sandeep", "Sandeep Hooda", "Cover", 44, [44, 80, 68, 70, 62]),
];

export const ALL_PLAYERS: Player[] = [...STARTERS, ...AUCTION_POOL];
const byId = new Map(ALL_PLAYERS.map((p) => [p.id, p]));
export const player = (id: string): Player => byId.get(id) ?? STARTERS[0];

export const ON_MAT = 7;
export const MAX_TRAIN = 5; // levels per skill
export const TRAIN_STEP = 3; // skill points per level
export const START_TRAIN_PTS = 3;

export const squadIds = (): string[] => store.get().squad ?? STARTERS.map((p) => p.id);
export const owned = (id: string) => squadIds().includes(id);
export const trainPts = () => store.get().trainPts ?? START_TRAIN_PTS;
export const trainLevels = (id: string): number[] => store.get().train?.[id] ?? [0, 0, 0, 0, 0];

export function skillsOf(id: string): number[] {
  const lv = trainLevels(id);
  return player(id).base.map((b, k) => Math.min(99, b + (lv[k] ?? 0) * TRAIN_STEP));
}
/** Overall rating: the role's two key skills count double. */
export function ovr(id: string, skills = skillsOf(id)): number {
  const p = player(id);
  const key = p.role === "Raider" ? [0, 2] : p.role === "All-rounder" ? [0, 1] : [1, 3];
  const w = skills.reduce((a, v, k) => a + v * (key.includes(k) ? 2 : 1), 0);
  return Math.round(w / 7);
}
export const teamRating = () => {
  const mat = squadIds().slice(0, ON_MAT);
  return Math.round(mat.reduce((a, id) => a + ovr(id), 0) / mat.length);
};

/** Coins for the next level of skill k (80, 120, 160, 200, 240), or null when maxed. */
export function trainCost(id: string, k: number): number | null {
  const l = trainLevels(id)[k] ?? 0;
  return l >= MAX_TRAIN ? null : 80 + 40 * l;
}

export type TrainResult = "pt" | "coins" | "max" | "poor";
/** Train skill k once: a free training point first, else coins. */
export function train(id: string, k: number): TrainResult {
  const cost = trainCost(id, k);
  if (cost === null) return "max";
  const s = store.get();
  const pts = trainPts();
  if (pts <= 0 && s.coins < cost) return "poor";
  const lv = [...trainLevels(id)];
  lv[k] = (lv[k] ?? 0) + 1;
  const all = { ...(s.train ?? {}), [id]: lv };
  if (pts > 0) { store.set({ trainPts: pts - 1, train: all }); return "pt"; }
  store.set({ coins: s.coins - cost, train: all });
  return "coins";
}

/** Swap two squad places (a sub onto the mat and the mat player to the bench). */
export function swap(a: string, b: string): void {
  const ids = [...squadIds()];
  const i = ids.indexOf(a), j = ids.indexOf(b);
  if (i < 0 || j < 0) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  store.set({ squad: ids });
}

/** A signed auction player joins the subs. */
export function sign(id: string): void {
  if (owned(id)) return;
  store.set({ squad: [...squadIds(), id] });
}

/** Art for a player card: my squad wears saffron, rival franchises' lots wear teal. */
export function artFor(p: Player, mine: boolean): ArtId {
  const raider = p.role === "Raider" || p.role === "All-rounder";
  return raider ? (mine ? "raider_saffron" : "raider_teal") : mine ? "defender_saffron" : "defender_teal";
}
export const ART_RATIO: Record<string, number> = { raider_saffron: 504 / 512, raider_teal: 463 / 512, defender_saffron: 463 / 512, defender_teal: 463 / 512 };
