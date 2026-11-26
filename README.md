# Haki Training ◆

A gym tracker that turns your workouts into an RPG. Log your sets, clear daily quests, earn XP, level up and work your way from **Rank E to Rank S**. It's an installable web app (PWA) built for phones.

**▶ Live app:** https://l-narendar-kumar.github.io/haki-training/

## Features

- **Assessment and personal plan.** On first launch you answer a short assessment: goal, experience, body stats, equipment, training days, session length, and injuries. The app then builds a weekly plan (full body, upper/lower or push/pull/legs) that fits it. Exercises that need equipment you don't have, or that stress an injured area, are left out.
- **Optional AI coach.** Paste your own Anthropic API key and Claude (`claude-haiku-5-5`) writes the plan instead. The key stays on your device and goes straight to Anthropic. The AI plan is checked against the app's exercise library, and the built-in plan is always available as a fallback.
- **Quests from your plan.** On training days the quests come from that day's planned exercises. Rest days have one light recovery quest, and skipping it never causes a penalty.
- **Goal-weighted rewards.** Your goal changes which training earns the most XP. Stats grow on their own: the stat you train most goes up, and your goal's stat gets an extra boost.
- **Rank-up trials.** Each rank has a level cap. To rank up (E → D → C → B → A → S) you pass a fitness test based on your goal, within a single workout. Passing it moves your plan up a tier.
- **Progressive targets.** Plan targets increase with your level and rank.
- **Penalty system.** Miss a training day's quests and you get a penalty quest. Your workout XP is halved until you clear it.
- **Rewards.** Daily clear bonus, streaks, stat points, and unlockable titles you can equip.
- **Exercise guide.** 33 exercises with step-by-step form cues, tips and your personal bests.
- **Private and offline.** Everything is stored on your device (IndexedDB), with no account and no server. Export/import a backup from *Records → Data*, and retake the assessment from *Records → Profile*.

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

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, vite-plugin-pwa, idb-keyval, and @anthropic-ai/sdk (loaded only when the AI coach is used).

Game rules live in [`src/game/`](src/game): `planner.ts` (assessment → plan, target scaling), `ai.ts` (optional Claude plan writer), `progression.ts` (XP, levels, rank caps, goal weighting), `quests.ts` (daily quests and rank-up trials), `achievements.ts` (titles), and `engine.ts` (all state transitions).

Pushing to `main` deploys to GitHub Pages automatically through `.github/workflows/deploy.yml`.

---

*Fan-inspired by the "System" RPG aesthetic of anime and manhwa. All names, text and art in this project are original.*
