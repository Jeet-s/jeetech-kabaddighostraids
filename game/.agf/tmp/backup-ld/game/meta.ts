/**
 * Player meta around the engine: what a context (campaign trial, Quick Match, cup round, Daily Ghost, online race)
 * plays, what it pays, and the mode gates. Persistence is src/modules/store.ts.
 */
import { CHAPTERS, MODES, UNITS, modeIndex } from "./units";
import { store } from "../modules/store";
import type { UnitDef } from "./types";
import { ALL_UNITS } from "./units";
import type { ArtId } from "../art";

export const TRIALS = UNITS.length; // 66

export type CupId = "tournament" | "championship";
export type Ctx =
  | { kind: "trial"; trial: number }
  | { kind: "quick"; key: string }
  | { kind: "cup"; cup: CupId; round: number }
  | { kind: "daily" }
  | { kind: "online"; bot: boolean; rival: string; seed: number };

export const CUPS: Record<CupId, { name: string; rounds: { key: string; name: string; rival: string }[]; coins: number; tokens: number }> = {
  tournament: {
    name: "District Tournament",
    rounds: [
      { key: "blitz_easy", name: "Quarter-final", rival: "Gaon Gladiators" },
      { key: "blitz_medium", name: "Semi-final", rival: "Nadi Nagas" },
      { key: "blitz_hard", name: "Final", rival: "Pahadi Panthers" },
    ],
    coins: 400, tokens: 3,
  },
  championship: {
    name: "Raid Championship",
    rounds: [
      { key: "blitz_medium", name: "Group Stage", rival: "Coastal Cobras" },
      { key: "blitz_hard", name: "Semi-final", rival: "Desert Falcons" },
      { key: "quick_hard", name: "Grand Final", rival: "Thunder Bulls" },
    ],
    coins: 900, tokens: 6,
  },
};

export const DIFFS = ["Easy", "Medium", "Hard"] as const;
export const quickKey = (diff: 0 | 1 | 2, blitz: boolean) => `${blitz ? "blitz" : "quick"}_${["easy", "medium", "hard"][diff]}`;

/** ALL_UNITS index a context plays. */
export function unitIndexOf(ctx: Ctx): number {
  switch (ctx.kind) {
    case "trial": return ctx.trial - 1;
    case "quick": return modeIndex(ctx.key);
    case "cup": return modeIndex(CUPS[ctx.cup].rounds[ctx.round].key);
    case "daily": return DAILY_GHOST_TRIAL - 1;
    case "online": return modeIndex("blitz_medium");
  }
}
export const unitOfCtx = (ctx: Ctx): UnitDef => ALL_UNITS[unitIndexOf(ctx)];

/** The Daily Ghost replays the recorded friend ghost's Ghost Duel (trial 21) with a fresh draw each day. */
export const DAILY_GHOST_TRIAL = 21;
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const daySeed = () => [...today()].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) | 0, 2166136261);

export const isMatch = (u: UnitDef) => u.flow === "alt" && !!u.clock && (u.type === "Full Match" || u.type === "Quick Match" || u.type === "Match");

/** Coins + Chant Tokens a won context pays. */
export function reward(ctx: Ctx, stars: number): { coins: number; tokens: number } {
  switch (ctx.kind) {
    case "trial": {
      const u = UNITS[ctx.trial - 1];
      const boss = u.role === "boss";
      return { coins: 30 + u.ch * 10 + stars * 10 + (boss ? 100 : 0), tokens: (stars === 3 ? 1 : 0) + (boss ? 2 : 0) };
    }
    case "quick": return { coins: [60, 90, 140][["easy", "medium", "hard"].findIndex((d) => ctx.key.endsWith(d))] ?? 60, tokens: ctx.key.endsWith("hard") ? 1 : 0 };
    case "cup": {
      const c = CUPS[ctx.cup];
      const last = ctx.round === c.rounds.length - 1;
      return { coins: last ? c.coins : 80 + ctx.round * 40, tokens: last ? c.tokens : 0 };
    }
    case "daily": return { coins: 150, tokens: 2 };
    case "online": return { coins: 120, tokens: 1 };
  }
}

export interface Gate { open: boolean; need: string; have: number; of: number }
/** Mode gates (GDD): every locked mode states its requirement with a progress counter. */
export function gates(): Record<"quick" | "tournament" | "championship" | "daily" | "online", Gate> {
  const s = store.get();
  const trial = Math.max(1, s.level);
  const m = s.matches ?? 0, tw = s.tourWins ?? 0;
  return {
    quick: { open: true, need: "", have: 1, of: 1 },
    online: { open: true, need: "", have: 1, of: 1 },
    tournament: { open: m >= 1, need: "Complete 1 match", have: Math.min(1, m), of: 1 },
    championship: { open: tw >= 1, need: "Win 1 Tournament", have: Math.min(1, tw), of: 1 },
    daily: { open: trial > 5, need: "Complete Trial 5", have: Math.min(5, trial - 1), of: 5 },
  };
}

export function chapterOf(trial: number) {
  return CHAPTERS.find((c) => trial >= c.from && trial <= c.to) ?? CHAPTERS[CHAPTERS.length - 1];
}

/** Background art per chapter (0 = Quick Match / cups: the night stadium). */
export function bgFor(ch: number): ArtId {
  return ch === 1 ? "bg_village_mat_far" : ch === 4 ? "bg_auction_hall" : "bg_night_stadium_far";
}

/** Mat surface per chapter: village mud, district clay, then lacquered royal-blue synthetic. */
export function matStyle(ch: number): { top: string; bottom: string; lobby: string; line: string; frame: string } {
  if (ch === 1) return { top: "#B9824E", bottom: "#8A5A30", lobby: "#6E4626", line: "#FFF6E2", frame: "#E0A93A" };
  if (ch === 2) return { top: "#C98B52", bottom: "#A0612F", lobby: "#7A4524", line: "#FFFFFF", frame: "#E8B840" };
  return { top: "#3B5BE0", bottom: "#1F33A8", lobby: "#E3B65A", line: "#FFFFFF", frame: "#FFC93C" };
}

export function ctxTitle(ctx: Ctx): string {
  switch (ctx.kind) {
    case "trial": return `Trial ${ctx.trial} · ${UNITS[ctx.trial - 1].name}`;
    case "quick": return MODES[ctx.key]?.name ?? "Quick Match";
    case "cup": return `${CUPS[ctx.cup].name} · ${CUPS[ctx.cup].rounds[ctx.round].name}`;
    case "daily": return "Daily Ghost Challenge";
    case "online": return ctx.bot ? "Online Raid Race · AI rival" : "Online Raid Race";
  }
}

/** Opponent franchise for the scoreboard (original fictional teams). */
const FRANCHISES = ["Gaon Gladiators", "Nadi Nagas", "Pahadi Panthers", "Coastal Cobras", "Desert Falcons", "Thunder Bulls", "Lotus Lions", "Monsoon Wolves", "Jungle Jaguars", "Saffron Tuskers", "Delta Sharks", "Royal Tigers"];
export function rivalName(ctx: Ctx): string {
  switch (ctx.kind) {
    case "trial": return FRANCHISES[(ctx.trial * 7 + Math.floor(ctx.trial / 11)) % FRANCHISES.length];
    case "quick": return ["Lotus Lions", "Monsoon Wolves", "Royal Tigers"][["easy", "medium", "hard"].findIndex((d) => ctx.key.endsWith(d))] ?? "Lotus Lions";
    case "cup": return CUPS[ctx.cup].rounds[ctx.round].rival;
    case "daily": return "Ghost of Arun";
    case "online": return ctx.rival;
  }
}
export const MY_TEAM = "Ghost Raiders";

/** Daily reward (login streak): day n of 7 pays 50·n coins, day 7 adds 3 Chant Tokens. */
export function dailyState(): { canClaim: boolean; day: number } {
  const s = store.get();
  if (s.lastDaily === today()) return { canClaim: false, day: s.streak ?? 1 };
  const y = new Date(Date.now() - 86400000);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  const cont = s.lastDaily === yesterday;
  return { canClaim: true, day: cont ? ((s.streak ?? 0) % 7) + 1 : 1 };
}
export const dailyPay = (day: number) => ({ coins: 50 * day, tokens: day === 7 ? 3 : 0 });

/** Record a finished context in the meta (matches, cups, unlocks). Returns what newly opened. */
export function recordResult(ctx: Ctx, won: boolean, stars: number): { unlocked: string[] } {
  const before = gates();
  const s = store.get();
  const u = unitOfCtx(ctx);
  const patch: Partial<typeof s> = {};
  if (isMatch(u) || ctx.kind === "quick" || ctx.kind === "cup" || ctx.kind === "online") patch.matches = (s.matches ?? 0) + 1;
  if (won) {
    const r = reward(ctx, stars);
    patch.coins = s.coins + r.coins;
    patch.tokens = (s.tokens ?? 0) + r.tokens;
    patch.wins = (s.wins ?? 0) + 1;
  }
  if (ctx.kind === "trial" && won) {
    const id = `t${ctx.trial}`;
    patch.stars = { ...(s.stars ?? {}), [id]: Math.max(s.stars?.[id] ?? 0, stars) };
    patch.level = Math.max(s.level, ctx.trial + 1);
  }
  if (ctx.kind === "cup") {
    const last = ctx.round === CUPS[ctx.cup].rounds.length - 1;
    if (!won) patch.cup = { id: ctx.cup, round: ctx.round }; // knocked out of this round: retry it
    else if (last) {
      patch.cup = null;
      if (ctx.cup === "tournament") patch.tourWins = (s.tourWins ?? 0) + 1;
      else patch.champWins = (s.champWins ?? 0) + 1;
    } else patch.cup = { id: ctx.cup, round: ctx.round + 1 };
  }
  if (ctx.kind === "daily" && won) patch.ghostDay = today();
  store.set(patch);
  const after = gates();
  const unlocked = (Object.keys(after) as (keyof typeof after)[]).filter((k) => after[k].open && !before[k].open);
  return { unlocked: unlocked.map((k) => ({ tournament: "Tournament", championship: "Championship", daily: "Daily Ghost", quick: "Quick Match", online: "Online" })[k]) };
}

/** Player-facing coach tip for a unit: its designed "aha", else a line by flow. */
export function coachTip(u: UnitDef): string {
  const aha = /Aha: ([^.]*\.)/.exec(u.intent)?.[1];
  if (aha) return aha.charAt(0).toUpperCase() + aha.slice(1);
  if (u.flow === "auction") return "Price the whole squad, not the lot.";
  if (u.flow === "defend") return "Match the hold to his move and tackle with the cover beside his target.";
  if (u.flow === "raid") return "Read the gap: touch the defender who can't hold your move, then pick the safe way home.";
  return "Score on your raid, then stop his straight back — the rhythm wins matches.";
}

/** The trial's objective in player words (goal + how you lose). */
export function objectiveLines(u: UnitDef): { goal: string[]; lose: string[] } {
  const g = u.goal, goal: string[] = [], lose: string[] = [];
  const need: Record<string, string> = {
    escape: "escape a hold", superTackle: "land a Super Tackle", superRaid: "make a Super Raid", bonus: "earn a bonus point", kick: "score with a Backward Kick",
    dubki: "score and Dubki home", toe: "score with a Toe Touch", lowMove: "score with a Toe Touch or a Dubki", allOut: "inflict an all-out",
    drsWin: "win a DRS review", chain: "land a Chain Tackle", dodWin: "win the Do-or-Die raid", squad: "complete the squad",
  };
  if (g.pts) goal.push(`Score ${g.pts} point${g.pts > 1 ? "s" : ""}`);
  if (g.stops) goal.push(`Stop ${g.stops} raid${g.stops > 1 ? "s" : ""}`);
  if (g.margin !== undefined) goal.push(g.margin > 0 ? (g.margin === 1 ? "Win the match" : `Win by ${g.margin} or more`) : g.margin === 0 ? "Finish level or ahead" : `Finish within ${-g.margin} points`);
  if (g.ghost) goal.push("Beat the ghost's score");
  if (g.fullSide) goal.push("Finish with all 7 on the mat");
  for (const [k, v] of Object.entries(g.need ?? {})) goal.push(`${(v ?? 1) > 1 ? `${v}x ` : ""}${need[k] ?? k}`.replace(/^./, (c) => c.toUpperCase()));
  if (u.needRoles) goal.push(`Buy a ${[...new Set(u.needRoles)].join(", a ")}`);
  if (g.maxOpp !== undefined) lose.push(`They score more than ${g.maxOpp}`);
  if (g.maxTrail !== undefined) lose.push(`You trail by more than ${g.maxTrail}`);
  if (g.maxCaught !== undefined) lose.push(`Your raider is out ${g.maxCaught} times`);
  if (g.minMat !== undefined) lose.push(`Fewer than ${g.minMat} on your mat`);
  if (u.flow === "raid") lose.push(`${u.raids} raids run out`);
  if (u.flow === "defend") lose.push(`${u.defs} raids run out`);
  return { goal: goal.length ? goal : ["Complete the auction"], lose };
}

export const totalStars = () => Object.values(store.get().stars ?? {}).reduce((a, b) => a + b, 0);
export const starKey = (trial: number) => `t${trial}`;
