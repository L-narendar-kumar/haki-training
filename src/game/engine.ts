import { EXERCISE_BY_ID } from '../data/exercises'
import type { GameEvent, GameState, StatKey, Workout, WorkoutSet } from '../types'
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from './achievements'
import { grantXp } from './progression'
import { clearBonusXp, generateDailyQuests, questProgress, regularQuests } from './quests'
import { addDays, localDate, uid } from './util'

export interface Result {
  state: GameState
  events: GameEvent[]
}

const WORKOUT_BASE_XP = 25
const WORKOUT_XP_PER_SET = 5
const WORKOUT_MAX_SETS_FOR_XP = 30

function canLift(s: GameState): boolean {
  return s.workouts.some((w) =>
    w.entries.some((e) => EXERCISE_BY_ID[e.exerciseId]?.mode === 'reps_weight' && e.sets.length > 0),
  )
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

export function newGame(name: string, now: number = Date.now()): GameState {
  const today = localDate(now)
  return {
    version: 1,
    createdAt: now,
    player: {
      name: name.trim() || 'Hunter',
      level: 1,
      xp: 0,
      totalXp: 0,
      statPoints: 0,
      stats: { str: 10, agi: 10, end: 10, vit: 10 },
      streak: 0,
      lastClearDate: null,
      title: null,
      penaltyActive: false,
    },
    workouts: [],
    daily: generateDailyQuests(today, 1, { penalty: false, canLift: false }),
    achievements: {},
    active: null,
  }
}

/**
 * Called on app open / focus. When the day has changed: judge the previous
 * day's quests (penalty if not cleared), break stale streaks, issue new quests.
 */
export function rollover(s: GameState, now: number = Date.now()): Result {
  const today = localDate(now)
  if (s.daily.date === today) return { state: s, events: [] }

  const events: GameEvent[] = []
  const yesterday = addDays(today, -1)
  const firstDay = s.daily.date === localDate(s.createdAt)
  const failed = !s.daily.bonusClaimed && !firstDay

  let penaltyActive = s.player.penaltyActive
  if (failed && !penaltyActive) {
    penaltyActive = true
    events.push({
      type: 'penalty',
      message:
        'Daily quests were not completed. A penalty quest has been issued. Workout XP is halved until it is cleared.',
    })
  }

  const streakAlive = s.player.lastClearDate === yesterday || s.player.lastClearDate === today
  const player = { ...s.player, penaltyActive, streak: streakAlive ? s.player.streak : 0 }

  return {
    state: {
      ...s,
      player,
      daily: generateDailyQuests(today, player.level, { penalty: penaltyActive, canLift: canLift(s) }),
    },
    events,
  }
}

// ---------- Active workout editing (no events) ----------

export function startWorkout(s: GameState, now: number = Date.now()): GameState {
  if (s.active) return s
  return { ...s, active: { startedAt: now, entries: [] } }
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
  const entries = s.active.entries.map((e, i) =>
    i === entryIndex ? { ...e, sets: [...e.sets, set] } : e,
  )
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

export function workoutXp(setCount: number, penaltyActive: boolean): number {
  const xp = WORKOUT_BASE_XP + Math.min(setCount, WORKOUT_MAX_SETS_FOR_XP) * WORKOUT_XP_PER_SET
  return penaltyActive ? Math.floor(xp / 2) : xp
}

export function finishWorkout(s: GameState, now: number = Date.now()): Result {
  if (!s.active) return { state: s, events: [] }
  const entries = s.active.entries.filter((e) => e.sets.length > 0)
  const setCount = entries.reduce((n, e) => n + e.sets.length, 0)
  if (setCount === 0) {
    return {
      state: s,
      events: [{ type: 'info', title: 'Nothing to log', message: 'Add at least one set before finishing.' }],
    }
  }

  const xp = workoutXp(setCount, s.player.penaltyActive)
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
  )
  const state: GameState = {
    ...s,
    player: granted.player,
    workouts: [...s.workouts, workout],
    active: null,
  }
  return checkAchievements({ state, events: granted.events }, now)
}

export function claimQuest(s: GameState, questId: string, now: number = Date.now()): Result {
  const quest = s.daily.quests.find((q) => q.id === questId)
  if (!quest || quest.claimed) return { state: s, events: [] }
  const progress = questProgress(quest, workoutsOn(s, s.daily.date))
  if (progress < quest.target) return { state: s, events: [] }

  let player = s.player
  const events: GameEvent[] = [{ type: 'questClear', title: quest.title, xp: quest.xp }]

  const g = grantXp(player, quest.xp, `Quest: ${quest.title}`)
  player = g.player
  events.push(...g.events)
  if (quest.penalty) player = { ...player, penaltyActive: false }

  let daily = {
    ...s.daily,
    quests: s.daily.quests.map((q) => (q.id === questId ? { ...q, claimed: true } : q)),
  }

  // Clear bonus when every regular quest is claimed.
  if (!daily.bonusClaimed && regularQuests(daily).every((q) => q.claimed)) {
    const today = daily.date
    const streak = player.lastClearDate === addDays(today, -1) ? player.streak + 1 : 1
    const bonus = clearBonusXp(player.level)
    events.push({
      type: 'info',
      title: 'DAILY QUESTS CLEARED',
      message: `Reward: +${bonus} XP, +1 stat point. Streak: ${streak} day${streak === 1 ? '' : 's'}.`,
    })
    const b = grantXp(player, bonus, 'Daily clear bonus')
    player = { ...b.player, statPoints: b.player.statPoints + 1, streak, lastClearDate: today }
    events.push(...b.events.filter((e) => e.type !== 'xp'))
    daily = { ...daily, bonusClaimed: true }
  }

  let r: Result = { state: { ...s, player, daily }, events }
  if (quest.penalty) r = unlock(r, 'penalty_clear', now)
  return checkAchievements(r, now)
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


export function isValidState(x: unknown): x is GameState {
  const s = x as GameState
  return !!s && s.version === 1 && !!s.player && Array.isArray(s.workouts) && !!s.daily
}
