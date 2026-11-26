import { EXERCISE_BY_ID } from '../data/exercises'
import type { DailyQuests, Quest, QuestKind, Workout } from '../types'
import { rankMultiplier } from './progression'
import { formatSeconds, seededRandom } from './util'

interface QuestTemplate {
  id: string
  kind: QuestKind
  base: number
  round: number
  xp: number
  exerciseIds?: string[]
  needsWeights?: boolean
  title: string
  describe: (target: number) => string
}

const REPORT: QuestTemplate = {
  id: 'report',
  kind: 'workouts',
  base: 1,
  round: 1,
  xp: 30,
  title: 'Report for Training',
  describe: () => 'Finish and log 1 workout today.',
}

const POOL: QuestTemplate[] = [
  {
    id: 'pushups',
    kind: 'reps',
    base: 40,
    round: 5,
    xp: 40,
    exerciseIds: ['pushup'],
    title: 'Push-up Protocol',
    describe: (n) => `Do ${n} push-ups in total.`,
  },
  {
    id: 'squats',
    kind: 'reps',
    base: 50,
    round: 5,
    xp: 40,
    exerciseIds: ['squat_bw', 'back_squat'],
    title: 'Grounded Stance',
    describe: (n) => `Do ${n} squats (bodyweight or barbell).`,
  },
  {
    id: 'core',
    kind: 'reps',
    base: 40,
    round: 5,
    xp: 40,
    exerciseIds: ['situp', 'hanging_leg_raise'],
    title: 'Iron Core',
    describe: (n) => `Do ${n} sit-ups or hanging leg raises.`,
  },
  {
    id: 'plank',
    kind: 'time',
    base: 120,
    round: 30,
    xp: 40,
    exerciseIds: ['plank'],
    title: 'Unshakable',
    describe: (n) => `Hold a plank for ${formatSeconds(n)} in total.`,
  },
  {
    id: 'pulls',
    kind: 'reps',
    base: 25,
    round: 5,
    xp: 45,
    exerciseIds: ['pullup', 'barbell_row', 'lat_pulldown'],
    title: 'Pulling Power',
    describe: (n) => `Do ${n} reps of pull-ups, rows or pulldowns.`,
  },
  {
    id: 'cardio',
    kind: 'time',
    base: 900,
    round: 60,
    xp: 50,
    exerciseIds: ['run', 'jump_rope', 'cycling'],
    title: 'Endless Voyage',
    describe: (n) => `Do ${formatSeconds(n)} of cardio (run, rope or bike).`,
  },
  {
    id: 'sets',
    kind: 'sets',
    base: 12,
    round: 1,
    xp: 40,
    title: 'Volume Discipline',
    describe: (n) => `Complete ${n} sets of anything.`,
  },
  {
    id: 'variety',
    kind: 'variety',
    base: 4,
    round: 1,
    xp: 40,
    title: 'Versatile Fighter',
    describe: (n) => `Train ${n} different exercises.`,
  },
  {
    id: 'volume',
    kind: 'volume',
    base: 2000,
    round: 250,
    xp: 50,
    needsWeights: true,
    title: 'Heavy Burden',
    describe: (n) => `Lift ${n.toLocaleString()} kg of total volume (reps × weight).`,
  },
]

const PENALTY: QuestTemplate = {
  id: 'penalty',
  kind: 'reps',
  base: 30,
  round: 5,
  xp: 0,
  exerciseIds: ['burpee'],
  title: 'PENALTY: Atonement',
  describe: (n) => `You failed yesterday's quests. Do ${n} burpees to lift the penalty.`,
}

function build(t: QuestTemplate, mult: number, extra: Partial<Quest> = {}): Quest {
  const target = Math.max(t.round, Math.round((t.base * (t.kind === 'workouts' || t.kind === 'variety' ? 1 : mult)) / t.round) * t.round)
  return {
    id: t.id,
    title: t.title,
    description: t.describe(target),
    kind: t.kind,
    target,
    exerciseIds: t.exerciseIds,
    xp: Math.round(t.xp * mult),
    claimed: false,
    ...extra,
  }
}

export function generateDailyQuests(
  date: string,
  level: number,
  opts: { penalty: boolean; canLift: boolean },
): DailyQuests {
  const mult = rankMultiplier(level)
  const rand = seededRandom(`haki-${date}`)
  const pool = POOL.filter((t) => !t.needsWeights || opts.canLift)
  // Fisher–Yates shuffle with the date seed, then take 2.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const quests = [build(REPORT, mult), ...pool.slice(0, 2).map((t) => build(t, mult))]
  if (opts.penalty) quests.push(build(PENALTY, mult, { penalty: true }))
  return { date, quests, bonusClaimed: false }
}

export function clearBonusXp(level: number): number {
  return Math.round(50 * rankMultiplier(level))
}

export function questProgress(quest: Quest, todaysWorkouts: Workout[]): number {
  const entries = todaysWorkouts.flatMap((w) => w.entries)
  switch (quest.kind) {
    case 'workouts':
      return todaysWorkouts.length
    case 'sets':
      return entries.reduce((n, e) => n + e.sets.length, 0)
    case 'variety':
      return new Set(entries.filter((e) => e.sets.length > 0).map((e) => e.exerciseId)).size
    case 'volume':
      return entries.reduce((sum, e) => {
        if (EXERCISE_BY_ID[e.exerciseId]?.mode !== 'reps_weight') return sum
        return sum + e.sets.reduce((s, set) => s + set.reps * set.weight, 0)
      }, 0)
    case 'reps':
    case 'time':
      return entries
        .filter((e) => quest.exerciseIds?.includes(e.exerciseId))
        .reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.reps, 0), 0)
  }
}

/** The regular (non-penalty) quests are what count toward the daily clear. */
export function regularQuests(daily: DailyQuests): Quest[] {
  return daily.quests.filter((q) => !q.penalty)
}
