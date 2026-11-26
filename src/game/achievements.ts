import { EXERCISE_BY_ID } from '../data/exercises'
import type { GameState } from '../types'

export interface Achievement {
  id: string
  name: string
  description: string
  /** Hidden ones show as ??? until unlocked. */
  hidden?: boolean
  check: (s: GameState) => boolean
}

export function lifetimeVolume(s: GameState): number {
  let total = 0
  for (const w of s.workouts)
    for (const e of w.entries)
      if (EXERCISE_BY_ID[e.exerciseId]?.mode === 'reps_weight')
        for (const set of e.sets) total += set.reps * set.weight
  return total
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    name: 'The Awakened',
    description: 'Log your first workout.',
    check: (s) => s.workouts.length >= 1,
  },
  {
    id: 'workouts_10',
    name: 'Iron Recruit',
    description: 'Log 10 workouts.',
    check: (s) => s.workouts.length >= 10,
  },
  {
    id: 'workouts_50',
    name: 'Relentless',
    description: 'Log 50 workouts.',
    check: (s) => s.workouts.length >= 50,
  },
  {
    id: 'workouts_100',
    name: 'Grand Line Veteran',
    description: 'Log 100 workouts.',
    check: (s) => s.workouts.length >= 100,
  },
  {
    id: 'streak_3',
    name: 'Disciplined',
    description: 'Clear all daily quests 3 days in a row.',
    check: (s) => s.player.streak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Will of Steel',
    description: 'Clear all daily quests 7 days in a row.',
    check: (s) => s.player.streak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Unbreakable',
    description: 'Clear all daily quests 30 days in a row.',
    check: (s) => s.player.streak >= 30,
  },
  {
    id: 'trial_1',
    name: 'Proven Worthy',
    description: 'Pass your first rank-up trial (Rank D).',
    check: (s) => s.player.rank >= 1,
  },
  {
    id: 'rank_c',
    name: 'Observation Awakened',
    description: 'Reach Rank C.',
    check: (s) => s.player.rank >= 2,
  },
  {
    id: 'rank_b',
    name: 'Armament Wielder',
    description: 'Reach Rank B.',
    check: (s) => s.player.rank >= 3,
  },
  {
    id: 'rank_a',
    name: 'Conqueror’s Spirit',
    description: 'Reach Rank A.',
    check: (s) => s.player.rank >= 4,
  },
  {
    id: 'rank_s',
    name: 'Peak of the World',
    description: 'Reach Rank S.',
    hidden: true,
    check: (s) => s.player.rank >= 5,
  },
  {
    id: 'volume_10t',
    name: 'Ten-Ton Lifter',
    description: 'Lift 10,000 kg of lifetime volume.',
    check: (s) => lifetimeVolume(s) >= 10_000,
  },
  {
    id: 'volume_100t',
    name: 'Mountain Mover',
    description: 'Lift 100,000 kg of lifetime volume.',
    check: (s) => lifetimeVolume(s) >= 100_000,
  },
  {
    id: 'penalty_clear',
    name: 'Survivor',
    description: 'Clear a penalty quest.',
    hidden: true,
    // Unlocked directly by the engine when a penalty quest is claimed.
    check: () => false,
  },
]

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)
