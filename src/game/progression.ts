import { EXERCISE_BY_ID } from '../data/exercises'
import type { Category, GameEvent, Goal, Player, StatKey, WorkoutEntry } from '../types'

export const STAT_POINTS_PER_LEVEL = 3
export const TRIAL_STAT_POINTS = 5

export const RANKS = [
  { rank: 'E', minLevel: 1 },
  { rank: 'D', minLevel: 10 },
  { rank: 'C', minLevel: 20 },
  { rank: 'B', minLevel: 30 },
  { rank: 'A', minLevel: 45 },
  { rank: 'S', minLevel: 60 },
] as const

export type Rank = (typeof RANKS)[number]['rank']

export function rankName(rank: number): Rank {
  return RANKS[Math.min(rank, RANKS.length - 1)].rank
}

/** Highest level reachable at this rank. Passing the trial lifts the cap. */
export function levelCap(rank: number): number {
  const next = RANKS[rank + 1]
  return next ? next.minLevel : Infinity
}

/** Quest rewards scale with rank. */
export function rankMultiplier(rank: number): number {
  return 1 + rank * 0.25
}

export function hakiTier(level: number): string {
  if (level >= 50) return "Conqueror's Haki"
  if (level >= 25) return 'Armament Haki'
  if (level >= 10) return 'Observation Haki'
  return 'Dormant'
}

export function xpToNext(level: number): number {
  return 100 + (level - 1) * 30
}

export function trialAvailable(p: Player): boolean {
  return p.rank < RANKS.length - 1 && p.level >= levelCap(p.rank)
}

/**
 * Grant XP, handling multiple level-ups. Levels stop at the rank's cap; XP
 * then fills the bar but no further levels come until the trial is passed.
 */
export function grantXp(
  player: Player,
  amount: number,
  reason: string,
  now: number = Date.now(),
): { player: Player; events: GameEvent[] } {
  const events: GameEvent[] = []
  if (amount <= 0) return { player, events }
  events.push({ type: 'xp', amount, reason })

  const cap = levelCap(player.rank)
  let { level, xp, statPoints } = player
  xp += amount
  while (level < cap && xp >= xpToNext(level)) {
    xp -= xpToNext(level)
    level += 1
    statPoints += STAT_POINTS_PER_LEVEL
    events.push({ type: 'levelUp', level, points: STAT_POINTS_PER_LEVEL })
  }
  let trialUnlockedAt = player.trialUnlockedAt
  if (level >= cap) {
    xp = Math.min(xp, xpToNext(level))
    if (trialUnlockedAt === null) {
      trialUnlockedAt = now
      events.push({ type: 'trialReady', from: rankName(player.rank), to: rankName(player.rank + 1) })
    }
  }

  return {
    player: { ...player, level, xp, statPoints, trialUnlockedAt, totalXp: player.totalXp + amount },
    events,
  }
}

// ---------- Goal weighting ----------

/** XP multiplier per exercise category for each goal. */
const GOAL_WEIGHTS: Record<Goal, Partial<Record<Category, number>>> = {
  strength: { chest: 1.3, back: 1.3, legs: 1.3, shoulders: 1.2, arms: 1, core: 0.8, cardio: 0.6, mobility: 0.6 },
  muscle: { chest: 1.2, back: 1.2, legs: 1.2, shoulders: 1.2, arms: 1.2, core: 1, cardio: 0.6, mobility: 0.6 },
  fat_loss: { cardio: 1.5, core: 1.3, legs: 1.1, mobility: 0.8 },
  endurance: { cardio: 1.5, core: 1.2, legs: 1.1, mobility: 0.8, chest: 0.9, back: 0.9, shoulders: 0.9, arms: 0.9 },
  general: {},
}

export function goalWeight(goal: Goal, category: Category): number {
  return GOAL_WEIGHTS[goal][category] ?? 1
}

export const CATEGORY_STAT: Record<Category, StatKey> = {
  chest: 'str',
  back: 'str',
  shoulders: 'str',
  arms: 'str',
  legs: 'vit',
  core: 'agi',
  cardio: 'end',
  mobility: 'vit',
}

export const GOAL_STAT: Record<Goal, StatKey> = {
  strength: 'str',
  muscle: 'str',
  fat_loss: 'agi',
  endurance: 'end',
  general: 'vit',
}

/** Work units for an entry: one per set, or one per 5 minutes for timed cardio/mobility. */
export function entryUnits(e: WorkoutEntry): number {
  const ex = EXERCISE_BY_ID[e.exerciseId]
  if (!ex) return 0
  if (ex.mode === 'time' && (ex.category === 'cardio' || ex.category === 'mobility')) {
    const secs = e.sets.reduce((s, x) => s + x.reps, 0)
    return Math.max(e.sets.length > 0 ? 1 : 0, Math.round(secs / 300))
  }
  return e.sets.length
}

const WORKOUT_BASE_XP = 25
const XP_PER_UNIT = 5
const MAX_UNITS_FOR_XP = 30

export function workoutXp(entries: WorkoutEntry[], goal: Goal, penaltyActive: boolean): number {
  const units = entries.reduce((n, e) => n + entryUnits(e), 0)
  if (units === 0) return 0
  // Scale weighted units down proportionally if over the cap.
  const capScale = Math.min(1, MAX_UNITS_FOR_XP / units)
  const weighted = entries.reduce((sum, e) => {
    const ex = EXERCISE_BY_ID[e.exerciseId]
    return ex ? sum + entryUnits(e) * goalWeight(goal, ex.category) : sum
  }, 0)
  const xp = Math.round(WORKOUT_BASE_XP + weighted * capScale * XP_PER_UNIT)
  return penaltyActive ? Math.floor(xp / 2) : xp
}

/**
 * Stats grow from training: +1 to the stat you trained most (min 3 units),
 * and +1 to your goal's stat if you trained it seriously.
 */
export function workoutStatGains(entries: WorkoutEntry[], goal: Goal): Partial<Record<StatKey, number>> {
  const units: Record<StatKey, number> = { str: 0, agi: 0, end: 0, vit: 0 }
  for (const e of entries) {
    const ex = EXERCISE_BY_ID[e.exerciseId]
    if (ex) units[CATEGORY_STAT[ex.category]] += entryUnits(e)
  }
  const gains: Partial<Record<StatKey, number>> = {}
  const top = (Object.keys(units) as StatKey[]).reduce((a, b) => (units[b] > units[a] ? b : a))
  if (units[top] >= 3) gains[top] = 1
  const g = GOAL_STAT[goal]
  if (units[g] >= 3) gains[g] = (gains[g] ?? 0) + 1
  return gains
}
