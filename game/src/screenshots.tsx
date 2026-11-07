import { useState } from "react";
import { HomeScreen } from "./screens/HomeScreen";
import { LevelsScreen } from "./screens/LevelsScreen";
import { GameScreen } from "./screens/GameScreen";
import { ModesScreen } from "./screens/ModesScreen";
import { store } from "./modules/store";
import { today } from "./game/meta";

/**
 * Screenshot mode: the factory opens the app with <scheme>://shot/<id> on an emulator and captures the screen for
 * the store listing. Every scene renders a REAL state: the real screens, with real engine states reached by playing
 * seeded decisions on the real rules (the move lists below were found by playing the engine). Ads are off here.
 */
const noop = () => {};

export function ScreenshotScene({ id }: { id: string }) {
  // A player well into the campaign (chapter 3, stars, coins, a cup won) — not an empty profile.
  useState(() => {
    const stars: Record<string, number> = {};
    for (let t = 1; t <= 22; t++) stars[`t${t}`] = t % 5 === 0 ? 2 : 3;
    store.set({ level: 23, coins: 2480, tokens: 14, stars, tutorialDone: true, matches: 4, tourWins: 1, streak: 4, lastDaily: today() });
    return true;
  });
  switch (id) {
    case "home":
      return <HomeScreen onPlay={noop} onLevels={noop} onModes={noop} onShop={noop} onSettings={noop} onAlbum={noop} onSquad={noop} onAuction={noop} onPass={noop} onChants={noop} onRoadmap={noop} />;
    case "map":
      return <LevelsScreen onPlay={noop} onBack={noop} />;
    case "raid":
      // Trial 45 "Super Raid": two touches landed, the third defender targeted — the Super Raid is one touch away.
      return <GameScreen ctx={{ kind: "trial", trial: 45 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ seed: 1, moves: ["toe@0", "go", "hand@3", "go"], select: 5 }} />;
    case "superraid":
      // the referee calls the Super Raid: three touches and an escape from the hold
      return <GameScreen ctx={{ kind: "trial", trial: 45 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ seed: 1, moves: ["hand@0", "go", "hand@2", "go", "hand@4", "go", "pull", "go"], refEvents: true }} />;
    case "defend":
      // Trial 51 "Ghost Gate": a recorded ghost raider attacks, the cover beside his target selected for a chain.
      return <GameScreen ctx={{ kind: "trial", trial: 51 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ seed: 7, moves: [], select: 1 }} />;
    case "auction":
      return <GameScreen ctx={{ kind: "trial", trial: 34 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ seed: 3, moves: [] }} />;
    case "modes":
      return <ModesScreen onPlay={noop} onBack={noop} />;
    case "win":
    default:
      return <GameScreen ctx={{ kind: "trial", trial: 22 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ seed: 1, moves: [], result: "win" }} />;
  }
}
