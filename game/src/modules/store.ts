import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Tiny persisted player state (entitlements + currency). Loaded once at boot;
 * reads are synchronous afterwards so gameplay code stays simple.
 */
export interface PlayerState {
  adsRemoved: boolean;
  coins: number;
  level: number;
  /** Settings — default on. */
  sound?: boolean;
  music?: boolean;
  haptics?: boolean;
  /** Best stars per level id (progress map). */
  stars?: Record<string, number>;
  tutorialDone?: boolean;
  /** Kabaddi Ghost Raids meta (src/game/meta.ts). */
  tokens?: number; // Chant Tokens
  matches?: number; // completed matches (Quick Match, cups, online, campaign match trials)
  tourWins?: number;
  champWins?: number;
  cup?: { id: "tournament" | "championship"; round: number } | null;
  streak?: number;
  lastDaily?: string; // yyyy-mm-dd of the last claimed daily reward
  ghostDay?: string; // yyyy-mm-dd of the last Daily Ghost win
  reminders?: boolean;
  leftHand?: boolean;
  reducedMotion?: boolean;
  cbMarks?: boolean;
  quickDiff?: 0 | 1 | 2;
  blitz?: boolean;
  wins?: number;
  hints?: number; // bought Coach hints (beyond the 3 free per trial)
  kit?: string[]; // owned Kit Album items (src/game/kit.ts)
  equip?: { crest?: string; trail?: string; banner?: string };
  kitSets?: string[]; // completed Kit Album sets (bonus paid once)
  /** Squad (src/game/squad.ts): player ids in order — the first 7 are on the mat, the rest are subs. */
  squad?: string[];
  train?: Record<string, number[]>; // training levels per player id, one per skill (0-5)
  trainPts?: number; // free training points (start with 3; Season Pass pays more)
  auctions?: number; // finished Auction Hall seasons
  /** Chant Studio (src/game/kit.ts CHANTS). */
  chants?: string[]; // owned chants
  chant?: string; // equipped chant id
  /** Free Season Pass (src/game/meta.ts PASS_TIERS): claimed tier numbers. */
  passClaimed?: number[];
  /** Season Pass Gold Track (bought once with coins, GOLD_PRICE): adds GOLD_TIERS rewards to every tier. */
  passGold?: boolean;
  /** Roadmap (src/game/meta.ts ROADMAP): ids this device voted for. */
  votes?: string[];
}

const KEY = "player_state_v1";
let state: PlayerState = { adsRemoved: false, coins: 0, level: 1, sound: true, music: true, haptics: true, stars: {}, tutorialDone: false };
const listeners = new Set<(s: PlayerState) => void>();

export const store = {
  async load(): Promise<PlayerState> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) state = { ...state, ...(JSON.parse(raw) as Partial<PlayerState>) };
    } catch {
      // first launch / corrupted → defaults
    }
    return state;
  },
  get(): PlayerState {
    return state;
  },
  set(patch: Partial<PlayerState>): void {
    state = { ...state, ...patch };
    listeners.forEach((l) => l(state));
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  },
  subscribe(l: (s: PlayerState) => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
