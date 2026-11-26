# Haki Training ◆

A gym tracker that turns your workouts into an RPG. Log your sets, clear daily quests, earn XP, level up and work your way from **Rank E to Rank S**. It's an installable web app (PWA) built for phones.

**▶ Live app:** https://l-narendar-kumar.github.io/haki-training/

## Features

- **Workout logging.** Log sets with weight × reps, bodyweight reps, or timed holds/cardio. Start from scratch or from a training plan.
- **Daily quests.** Three new quests every day (always "Report for Training" plus two random objectives). Targets scale with your rank.
- **Penalty system.** Miss a day's quests and you get a penalty quest. Your workout XP is halved until you clear it.
- **XP, levels and ranks.** Level up to earn stat points (STR / AGI / END / VIT). Ranks E → D → C → B → A → S, and Haki tiers Dormant → Observation → Armament → Conqueror's.
- **Rewards.** Daily clear bonus, streaks, and unlockable titles you can equip.
- **Exercise guide.** 25 exercises with step-by-step form cues, tips, your personal bests, and three training plans.
- **Private and offline.** Everything is stored on your device (IndexedDB). No account and no server. Export/import a backup from *Records → Data*.

## Install on Android

1. Open the live link in **Chrome**.
2. Tap **⋮ → Add to Home screen → Install**.
3. Launch it from your home screen. It runs full screen and works offline.

## Development

```bash
npm install
npm run dev      # dev server (add --host to open it from your phone on the same Wi-Fi)
npm test         # game-logic tests (vitest)
npm run build    # production build
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, vite-plugin-pwa, idb-keyval.

Game rules live in [`src/game/`](src/game): `progression.ts` (XP/levels/ranks), `quests.ts` (daily quest generation and progress), `achievements.ts` (titles), and `engine.ts` (all state transitions).

Pushing to `main` deploys to GitHub Pages automatically through `.github/workflows/deploy.yml`.

---

*Fan-inspired by the "System" RPG aesthetic of anime and manhwa. All names, text and art in this project are original.*
