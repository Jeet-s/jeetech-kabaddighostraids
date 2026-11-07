/**
 * Auction Hall (from Home): an open, ascending auction for fixed, fully visible players (src/game/squad.ts
 * AUCTION_POOL) against 3 AI franchises, with an in-game purse only — no real money and nothing random. Each season
 * sells the next 4 unsigned players in order. Every franchise has a fixed top price per player (derived from his
 * stats); it raises by 5 while the price is below that, so the outcome depends only on how you bid.
 */
import { AUCTION_POOL, owned, ovr, player } from "./squad";
import { store } from "../modules/store";
import { totalStars } from "./meta";

export const BIDDERS = [
  { name: "You", color: "#FFC93C" },
  { name: "Lotus Lions", color: "#FF6A7A" },
  { name: "Monsoon Wolves", color: "#4FD3FF" },
  { name: "Royal Tigers", color: "#C79BFF" },
] as const;
export const LOTS_PER_SEASON = 4;
export const STEP = 5;

export const season = () => (store.get().auctions ?? 0) + 1;
/** The lots of this season: the next unsigned auction stars, in pool order. */
export const seasonLots = (): string[] => AUCTION_POOL.filter((p) => !owned(p.id)).slice(0, LOTS_PER_SEASON).map((p) => p.id);
export const unsignedLeft = () => AUCTION_POOL.filter((p) => !owned(p.id)).length;

/** Purse for a season: 100, +5 for every 9 campaign stars, capped at 150. Can't be bought. */
export const purseFor = () => Math.min(150, 100 + 5 * Math.floor(totalStars() / 9));

export const basePrice = (id: string) => 10 + Math.max(0, ovr(id) - 60);
/** A franchise's fixed top price for a player (between base + 8 and base + 31). */
export function aiMax(id: string, f: number, seasonNo: number): number {
  const sum = player(id).base.reduce((a, v) => a + v, 0);
  return basePrice(id) + 8 + ((sum * 7 + f * 11 + seasonNo * 5) % 24);
}
/** The market range shown on the lot card (the franchises' top prices all fall inside it). */
export const estimate = (id: string): [number, number] => [basePrice(id) + 8, basePrice(id) + 31];

/** The price a new leader pays: the base for the first bid, then +5. */
export const nextPrice = (price: number, lead: number) => (lead === -1 ? price : price + STEP);

/** Which franchise (1-3) raises next, or -1 when nobody wants the player at the next price. */
export function aiRaise(id: string, price: number, lead: number, seasonNo: number): number {
  const need = nextPrice(price, lead);
  let best = -1, top = -1;
  for (let f = 1; f < BIDDERS.length; f++) {
    if (f === lead) continue;
    const m = aiMax(id, f, seasonNo);
    if (m >= need && m > top) { best = f; top = m; }
  }
  return best;
}

/** You pass: the franchises bid it out among themselves. */
export function settleWithoutMe(id: string, price: number, lead: number, seasonNo: number): { lead: number; price: number } {
  let p = price, l = lead === 0 ? -1 : lead;
  for (let i = 0; i < 40; i++) {
    const r = aiRaise(id, p, l, seasonNo);
    if (r < 0) break;
    p = nextPrice(p, l);
    l = r;
  }
  return { lead: l, price: p };
}
