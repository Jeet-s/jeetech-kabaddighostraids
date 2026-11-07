/**
 * Content-unit (Raid Trial) definitions — data only. The engine (engine.ts) plays them on the rules (rules.ts).
 */

/** Opponent defender traits (what the player reads in the formation before a raid). */
export type Trait =
  | "o" // rookie — no special hold
  | "T" // thigh-holder: high reach, punishes Hand Touches and walking home; slow to the floor (Toe Touch, Dubki beat him)
  | "A" // ankle-catcher: low, punishes Toe Touches, bonus hops and Dubki; a Hand Touch or a Dash beats him
  | "B" // blocker: forms the wall at the midline — a Dash home runs into it; Dubki slips under
  | "R" // rusher: charges the raider — punishes bonus hops and slow touches; a Backward Kick tags him as he comes
  | "C" // chain link: two adjacent C's chain together — deadly against walking or dashing home; Dubki ducks under the chain
  | "K"; // rival captain (anchor): strong against everything except his one weakness (unit.kWeak)

/** My squad roles on defence (chapter 4 introduces the specialists). */
export type Role =
  | "o" // all-rounder
  | "A" // ankle-hold specialist (Ankle Hold ×1.25, Thigh ×0.85)
  | "T" // thigh-hold specialist (Thigh ×1.25, Ankle ×0.85)
  | "C" // cover (Chain ×1.2, Block ×1.1)
  | "K" // anchor (every hold ×1.15)
  | "R"; // rusher (Rush ×1.3)

export type TouchMove = "hand" | "toe" | "kick" | "bonus";
export type ReturnMove = "walk" | "dash" | "dubki";
export type EscapeMove = "pull" | "lunge";
export type DefMove = "ankle" | "thigh" | "chain" | "block" | "rush" | "hold";

/** Opponent raider (the CPU when it attacks the player's mat). */
export interface AIRaider {
  name: string;
  s: number; // skill 0..1 (touch reach, tackle evasion, escape)
  mv: TouchMove[]; // touch moves it uses
  ret: ReturnMove[]; // ways it goes home
  bluff: number; // chance the telegraphed move is a feint
  k: number; // max touches it goes for in one raid
  smart: 0 | 1 | 2; // 0 Easy (random, 40% mistakes), 1 Medium (counters specialists), 2 Hard (counters + do-or-die aware)
  bonusRate?: number; // how often it tries the bonus line when live
}

export interface Lot {
  name: string;
  role: "Raider" | "Corner" | "Cover" | "Anchor";
  trait: Role; // defensive role it gives the squad
  reach?: number; agility?: number; speed?: number; stamina?: number; // raider stats
  base: number; // opening price (lakh coins of purse)
  lo: number; hi: number; // the AI franchises' valuation range (shown as the "market estimate")
}

export interface Goal {
  pts?: number; // points my team scores during the trial
  margin?: number; // (me - opp) at the final whistle ≥ margin
  stops?: number; // successful tackles on the opponent raider
  maxOpp?: number; // lose when the opponent scores more than this during the trial
  maxTrail?: number; // lose when trailing by more than this at any time
  maxCaught?: number; // lose when my raider is out this many times
  minMat?: number; // lose when my side drops below this many on the mat
  fullSide?: boolean; // at the end my side must have all 7 on the mat
  need?: Partial<Record<NeedKey, number>>; // required events
  ghost?: boolean; // score more than the ghost's recorded points
}

export type NeedKey =
  | "escape" | "superTackle" | "superRaid" | "bonus" | "kick" | "dubki" | "toe" | "lowMove" // lowMove = toe or dubki
  | "allOut" | "drsWin" | "chain" | "dodWin" | "squad";

export type StarKey =
  | "noEmpty" // no empty raids
  | "noCaught" // my raider never out
  | "margin" // final margin ≥ v
  | "pts" // my points ≥ v
  | "oppMax" // opponent points ≤ v
  | "stops" // tackles ≥ v
  | "escapes" // escapes ≥ v
  | "bonus" // bonus points ≥ v
  | "fast" // won with ≤ v raids of mine
  | "superTackle" | "superRaid" | "chain" | "kick" | "dubki" | "allOut" | "drsWin"
  | "purse" // finished the auction with ≥ v purse left
  | "fullSide"; // all 7 on the mat at the end

export interface Star { k: StarKey; v: number; label: string }

export interface UnitDef {
  id: number;
  ch: number; // chapter 1..6
  name: string;
  type: "Quick Match" | "Raid Puzzle" | "Defend Stand" | "Comeback" | "Do-or-Die Drill" | "Revival Run" | "Super Challenge" | "Ghost Duel" | "Match" | "Full Match" | "Auction";
  role: "teach" | "practise" | "twist" | "combine" | "breather" | "spike" | "boss";
  intro: string[]; // mechanics introduced here
  mech: string[]; // mechanics in play
  intent: string;
  // setup
  op: string; // 7 chars: opponent defender traits by slot (left corner → right corner); '-' = out at start
  me?: string; // 7 chars: my roles; '-' = out at start
  kWeak?: TouchMove | ReturnMove; // the rival captain's one weakness
  g: number; // opponent defensive grip (tuning)
  read?: number; // how much the defence punishes repeating last raid's moves (default by chapter: 0 / 0 / .25 / .3 / .4 / .5)
  w?: number; // my tackle timing window (1 = normal)
  ai?: AIRaider;
  raider?: [number, number, number, number]; // my raider reach, agility, speed, stamina (1..10)
  raiders?: { name: string; st: [number, number, number, number] }[]; // rotation squad (fatigue units)
  moves: (TouchMove | ReturnMove | EscapeMove)[]; // my raid moves unlocked so far
  def?: DefMove[]; // my defensive moves unlocked so far
  flow: "raid" | "defend" | "alt" | "auction"; // auction = the auction is the whole trial
  first?: 0 | 1; // alt: who raids first (0 = me)
  raids?: number; // my raid budget (raid / alt flows)
  defs?: number; // opponent raid budget (defend / alt flows)
  clock?: [number, number]; // match clock segment [from, to] in game seconds (alt flow ends on the clock)
  half?: number; // half length in game seconds (default 20 min; Blitz = 10 min)
  score?: [number, number];
  empty?: [number, number]; // empty-raid counters at the start
  outQ?: [number[], number[]]; // who is out at the start (revival order) — derived from '-' when absent
  drs?: number; // DRS reviews available
  fatigue?: boolean;
  lots?: Lot[];
  purse?: number;
  needRoles?: Lot["role"][];
  ghost?: string; // id of the recorded ghost raid trace (ghosts.ts) whose score the player must beat
  gate?: string[]; // a recorded ghost raider's plans ("hand@2>dash", "bonus>walk", "toe@4,hand@5>dubki"), replayed as the opponent's raids
  goal: Goal;
  stars: [Star, Star]; // stars 2 and 3 (star 1 = win)
  theme: string; // environment / formation theme shown on the briefing
  aim?: number; // tuner target casual win rate
}
