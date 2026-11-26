import type { GameEvent, GameState, Player, Profile, StatKey, TrainingPlan, Workout, WorkoutSet } from '../types'
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from './achievements'
import { formatTarget, planDayFor, scaledTarget } from './planner'
import {
  TRIAL_STAT_POINTS,
  grantXp,
  rankMultiplier,
  rankName,
  trialAvailable,
  workoutStatGains,
  workoutXp,
} from './progression'
import { clearBonusXp, generateDailyQuests, questProgress, regularQuests, trialFor, trialProgress } from './quests'
import { addDays, localDate, uid } from './util'

export interface Result {
  state: GameState
  events: GameEvent[]
}

export function workoutsOn(s: GameState, date: string): Workout[] {
  return s.workouts.filter((w) => w.date === date)
}

/** Unlock any achievements whose condition is now met. */
function checkAchievements(r: Result, now: number): Result {
  const unlocked = { ...r.state.achievements }
  const events = [...r.events]
  for (const a of ACHIEVEMENTS) {
    if (!unlocked[a.id] && a.check(r.state)) {
      unlocked[a.id] = now
      events.push({ type: 'achievement', id: a.id, name: a.name, description: a.description })
    }
  }
  return { state: { ...r.state, achievements: unlocked }, events }
}

function unlock(r: Result, id: string, now: number): Result {
  if (r.state.achievements[id]) return r
  const a = ACHIEVEMENT_BY_ID[id]
  return {
    state: { ...r.state, achievements: { ...r.state.achievements, [id]: now } },
    events: [...r.events, { type: 'achievement', id, name: a.name, description: a.description }],
  }
}

export function newGame(profile: Profile, plan: TrainingPlan, now: number = Date.now()): GameState {
  const player = {
    name: profile.name.trim() || 'Hunter',
    level: 1,
    xp: 0,
    totalXp: 0,
    statPoints: 0,
    stats: { str: 10, agi: 10, end: 10, vit: 10 },
    rank: 0,
    trialUnlockedAt: null,
    streak: 0,
    lastClearDate: null,
    title: null,
    penaltyActive: false,
  }
  return {
    version: 2,
    createdAt: now,
    profile,
    plan,
    player,
    workouts: [],
    daily: generateDailyQuests(localDate(now), plan, player, { penalty: false }),
    achievements: {},
    active: null,
  }
}

/**
 * Called on app open / focus. When the day has changed: judge the previous
 * day's quests (penalty if a training day wasn't cleared; rest days are
 * forgiven), break stale streaks, issue new quests.
 */
export function rollover(s: GameState, now: number = Date.now()): Result {
  const today = localDate(now)
  if (s.daily.date === today) return { state: s, events: [] }

  const events: GameEvent[] = []
  const yesterday = addDays(today, -1)
  const prev = s.daily
  const firstDay = prev.date === localDate(s.createdAt)
  const player = { ...s.player }

  // An uncleared rest day is neutral: it neither breaks nor extends the streak.
  if (prev.restDay && !prev.bonusClaimed && player.lastClearDate === addDays(prev.date, -1)) {
    player.lastClearDate = prev.date
  }

  const failed = !prev.bonusClaimed && !prev.restDay && !firstDay
  if (failed && !player.penaltyActive) {
    player.penaltyActive = true
    events.push({
      type: 'penalty',
      message:
        'Training quests were not completed. A penalty quest has been issued. Workout XP is halved until it is cleared.',
    })
  }

  const streakAlive = player.lastClearDate === yesterday || player.lastClearDate === today
  if (!streakAlive) player.streak = 0

  return {
    state: {
      ...s,
      player,
      daily: generateDailyQuests(today, s.plan, player, { penalty: player.penaltyActive }),
    },
    events,
  }
}

// ---------- Active workout editing (no events) ----------

export function startWorkout(s: GameState, now: number = Date.now()): GameState {
  if (s.active) return s
  return { ...s, active: { startedAt: now, entries: [] } }
}

/** Start a session pre-filled with a plan day's exercises and current targets. */
export function startPlannedWorkout(s: GameState, dayIndex: number, now: number = Date.now()): GameState {
  const day = s.plan.days[dayIndex]
  if (s.active || !day) return s
  return {
    ...s,
    active: {
      startedAt: now,
      entries: day.exercises.map((pe) => ({
        exerciseId: pe.exerciseId,
        sets: [],
        target: formatTarget(scaledTarget(pe, s.player.level, s.player.rank)),
      })),
    },
  }
}

export function todaysPlanIndex(s: GameState, now: number = Date.now()): number | null {
  const day = planDayFor(s.plan, new Date(now).getDay())
  return day ? s.plan.days.indexOf(day) : null
}

export function cancelWorkout(s: GameState): GameState {
  return { ...s, active: null }
}

export function addExercise(s: GameState, exerciseId: string): GameState {
  if (!s.active) return s
  return { ...s, active: { ...s.active, entries: [...s.active.entries, { exerciseId, sets: [] }] } }
}

export function removeExercise(s: GameState, index: number): GameState {
  if (!s.active) return s
  return { ...s, active: { ...s.active, entries: s.active.entries.filter((_, i) => i !== index) } }
}

export function addSet(s: GameState, entryIndex: number, set: WorkoutSet): GameState {
  if (!s.active) return s
  const entries = s.active.entries.map((e, i) => (i === entryIndex ? { ...e, sets: [...e.sets, set] } : e))
  return { ...s, active: { ...s.active, entries } }
}

export function removeSet(s: GameState, entryIndex: number, setIndex: number): GameState {
  if (!s.active) return s
  const entries = s.active.entries.map((e, i) =>
    i === entryIndex ? { ...e, sets: e.sets.filter((_, j) => j !== setIndex) } : e,
  )
  return { ...s, active: { ...s.active, entries } }
}

// ---------- Actions that grant rewards ----------

export function finishWorkout(s: GameState, now: number = Date.now()): Result {
  if (!s.active) return { state: s, events: [] }
  const entries = s.active.entries.filter((e) => e.sets.length > 0)
  if (entries.length === 0) {
    return {
      state: s,
      events: [{ type: 'info', title: 'Nothing to log', message: 'Add at least one set before finishing.' }],
    }
  }

  const xp = workoutXp(entries, s.profile.goal, s.player.penaltyActive)
  const workout: Workout = {
    id: uid(),
    date: localDate(now),
    startedAt: s.active.startedAt,
    finishedAt: now,
    entries,
    xp,
  }
  const granted = grantXp(
    s.player,
    xp,
    s.player.penaltyActive ? 'Workout complete (penalty: XP halved)' : 'Workout complete',
    now,
  )
  const gains = workoutStatGains(entries, s.profile.goal)
  const stats = { ...granted.player.stats }
  for (const [k, v] of Object.entries(gains) as [StatKey, number][]) stats[k] += v
  const events = [...granted.events]
  if (Object.keys(gains).length > 0) events.push({ type: 'stat', gains })

  const state: GameState = {
    ...s,
    player: { ...granted.player, stats },
    workouts: [...s.workouts, workout],
    active: null,
  }
  return checkAchievements({ state, events }, now)
}

export function claimQuest(s: GameState, questId: string, now: number = Date.now()): Result {
  const q = s.daily.quests.find((x) => x.id === questId)
  if (!q || q.claimed) return { state: s, events: [] }
  if (questProgress(q, workoutsOn(s, s.daily.date)) < q.target) return { state: s, events: [] }

  const events: GameEvent[] = [{ type: 'questClear', title: q.title, xp: q.xp }]
  const g = grantXp(s.player, q.xp, `Quest: ${q.title}`, now)
  let player = g.player
  events.push(...g.events)
  if (q.penalty) player = { ...player, penaltyActive: false }

  let daily = { ...s.daily, quests: s.daily.quests.map((x) => (x.id === questId ? { ...x, claimed: true } : x)) }

  if (!daily.bonusClaimed && regularQuests(daily).every((x) => x.claimed)) {
    const today = daily.date
    const streak = player.lastClearDate === addDays(today, -1) ? player.streak + 1 : 1
    const bonus = clearBonusXp(player.rank)
    events.push({
      type: 'info',
      title: daily.restDay ? 'RECOVERY COMPLETE' : 'DAILY QUESTS CLEARED',
      message: `Reward: +${bonus} XP, +1 stat point. Streak: ${streak} day${streak === 1 ? '' : 's'}.`,
    })
    const b = grantXp(player, bonus, 'Daily clear bonus', now)
    player = { ...b.player, statPoints: b.player.statPoints + 1, streak, lastClearDate: today }
    events.push(...b.events.filter((e) => e.type !== 'xp'))
    daily = { ...daily, bonusClaimed: true }
  }

  let r: Result = { state: { ...s, player, daily }, events }
  if (q.penalty) r = unlock(r, 'penalty_clear', now)
  return checkAchievements(r, now)
}

export function currentTrial(s: GameState) {
  if (!trialAvailable(s.player) || s.player.trialUnlockedAt === null) return null
  const challenges = trialFor(s.profile, s.player.rank)
  const progress = trialProgress(challenges, s.workouts, s.player.trialUnlockedAt)
  return {
    from: rankName(s.player.rank),
    to: rankName(s.player.rank + 1),
    challenges,
    progress,
    passed: challenges.every((c, i) => progress[i] >= c.target),
    xp: Math.round(200 * rankMultiplier(s.player.rank + 1)),
  }
}

/** Pass the rank-up trial: rank up, lift the level cap, plan moves up a tier. */
export function claimTrial(s: GameState, now: number = Date.now()): Result {
  const trial = currentTrial(s)
  if (!trial || !trial.passed) return { state: s, events: [] }
  let player: Player = {
    ...s.player,
    rank: s.player.rank + 1,
    trialUnlockedAt: null,
    statPoints: s.player.statPoints + TRIAL_STAT_POINTS,
  }
  const events: GameEvent[] = [
    { type: 'rankUp', rank: trial.to },
    {
      type: 'info',
      title: 'TRAINING INTENSIFIED',
      message: `Your plan has moved up a tier, so targets are higher from now on. +${TRIAL_STAT_POINTS} stat points.`,
    },
  ]
  const g = grantXp(player, trial.xp, `Rank-up trial: ${trial.from} → ${trial.to}`, now)
  player = g.player
  events.push(...g.events)
  return checkAchievements({ state: { ...s, player }, events }, now)
}

export function allocateStat(s: GameState, stat: StatKey): GameState {
  if (s.player.statPoints <= 0) return s
  return {
    ...s,
    player: {
      ...s.player,
      statPoints: s.player.statPoints - 1,
      stats: { ...s.player.stats, [stat]: s.player.stats[stat] + 1 },
    },
  }
}

export function equipTitle(s: GameState, id: string | null): GameState {
  if (id && !s.achievements[id]) return s
  return { ...s, player: { ...s.player, title: id } }
}

export function deleteWorkout(s: GameState, id: string): GameState {
  // XP already earned is kept; quests re-read progress from the remaining log.
  return { ...s, workouts: s.workouts.filter((w) => w.id !== id) }
}

/**
 * Replace profile + plan (retake assessment). Progress is kept. Today's
 * quests are re-issued from the new plan unless they were already cleared.
 */
export function setPlan(s: GameState, profile: Profile, plan: TrainingPlan): GameState {
  const claimed = new Set(s.daily.quests.filter((q) => q.claimed).map((q) => q.id))
  const daily = s.daily.bonusClaimed
    ? s.daily
    : generateDailyQuests(s.daily.date, plan, s.player, { penalty: s.player.penaltyActive })
  return {
    ...s,
    profile,
    plan,
    player: { ...s.player, name: profile.name.trim() || s.player.name },
    daily: { ...daily, quests: daily.quests.map((q) => (claimed.has(q.id) ? { ...q, claimed: true } : q)) },
  }
}

export function isValidState(x: unknown): x is GameState {
  const s = x as GameState
  return !!s && s.version === 2 && !!s.player && !!s.profile && !!s.plan && Array.isArray(s.workouts) && !!s.daily
}
