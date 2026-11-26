import { EXERCISE_BY_ID, EXERCISES } from '../data/exercises'
import type { DailyQuests, Goal, Profile, Quest, TrainingPlan, Workout } from '../types'
import { canDo, planDayFor, scaledTarget } from './planner'
import { rankMultiplier } from './progression'
import { formatSeconds, seededRandom } from './util'

const RECOVERY_IDS = ['walk', 'mobility_flow', 'cycling']
const CARDIO_IDS = ['run', 'cycling', 'jump_rope', 'walk']

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function quest(q: Omit<Quest, 'claimed'>): Quest {
  return { ...q, claimed: false }
}

const PENALTY = (mult: number): Quest =>
  quest({
    id: 'penalty',
    title: 'PENALTY: Atonement',
    description: `You failed your last quests. Hold a plank for ${formatSeconds(Math.round((120 * mult) / 15) * 15)} in total to lift the penalty.`,
    kind: 'time',
    target: Math.round((120 * mult) / 15) * 15,
    exerciseIds: ['plank'],
    xp: 0,
    penalty: true,
  })

/**
 * Training day: "report" + quests for up to 3 of today's planned exercises
 * (picked with the date as seed). Rest day: one light recovery quest.
 */
export function generateDailyQuests(
  date: string,
  plan: TrainingPlan,
  player: { level: number; rank: number },
  opts: { penalty: boolean },
): DailyQuests {
  const mult = rankMultiplier(player.rank)
  const day = planDayFor(plan, weekdayOf(date))
  const quests: Quest[] = []

  if (!day) {
    quests.push(
      quest({
        id: 'recovery',
        title: 'Active Recovery',
        description: 'Rest day. Walk, cycle easy or stretch for 10 minutes in total.',
        kind: 'time',
        target: 600,
        exerciseIds: RECOVERY_IDS,
        xp: Math.round(25 * mult),
      }),
    )
  } else {
    quests.push(
      quest({
        id: 'report',
        title: `Report for Training: ${day.name}`,
        description: `Finish and log today's session (${day.name}).`,
        kind: 'workouts',
        target: 1,
        xp: Math.round(30 * mult),
      }),
    )
    const rand = seededRandom(`haki-${date}`)
    const pool = [...day.exercises]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    for (const pe of pool.slice(0, 3)) {
      const ex = EXERCISE_BY_ID[pe.exerciseId]
      if (!ex) continue
      const t = scaledTarget(pe, player.level, player.rank)
      const xp = Math.round(40 * mult)
      if (ex.mode === 'reps_weight') {
        quests.push(
          quest({
            id: `ex-${ex.id}`,
            title: ex.name,
            description: `Complete ${t.sets} working sets of ${ex.name} (target ${t.reps} reps each).`,
            kind: 'sets',
            target: t.sets,
            exerciseIds: [ex.id],
            xp,
          }),
        )
      } else if (ex.mode === 'reps') {
        const total = t.sets * t.reps
        quests.push(
          quest({
            id: `ex-${ex.id}`,
            title: ex.name,
            description: `Do ${total} ${ex.name.toLowerCase()} reps in total (${t.sets} × ${t.reps}).`,
            kind: 'reps',
            target: total,
            exerciseIds: [ex.id],
            xp,
          }),
        )
      } else {
        const total = t.sets * t.reps
        quests.push(
          quest({
            id: `ex-${ex.id}`,
            title: ex.name,
            description: `${ex.name}: ${formatSeconds(total)} in total.`,
            kind: 'time',
            target: total,
            exerciseIds: [ex.id],
            xp,
          }),
        )
      }
    }
  }
  if (opts.penalty) quests.push(PENALTY(mult))
  return { date, restDay: !day, quests, bonusClaimed: false }
}

export function clearBonusXp(rank: number): number {
  return Math.round(50 * rankMultiplier(rank))
}

export function questProgress(q: Pick<Quest, 'kind' | 'exerciseIds'>, workouts: Workout[]): number {
  const entries = workouts
    .flatMap((w) => w.entries)
    .filter((e) => !q.exerciseIds || q.kind === 'workouts' || q.exerciseIds.includes(e.exerciseId))
  switch (q.kind) {
    case 'workouts':
      return workouts.length
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
      return entries.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.reps, 0), 0)
  }
}

/** The regular (non-penalty) quests are what count toward the daily clear. */
export function regularQuests(daily: DailyQuests): Quest[] {
  return daily.quests.filter((q) => !q.penalty)
}

// ---------- Rank-up trials ----------

export interface TrialChallenge {
  id: string
  description: string
  kind: Quest['kind']
  target: number
  exerciseIds?: string[]
}

function available(ids: string[], profile: Profile): string[] {
  return ids.filter((id) => EXERCISE_BY_ID[id] && canDo(EXERCISE_BY_ID[id], profile))
}

/**
 * Goal-based fitness test for moving from `rank` to `rank + 1`. Each challenge
 * must be met within a single workout logged after the trial unlocked.
 */
export function trialFor(profile: Profile, rank: number): TrialChallenge[] {
  const r = rank
  const cardio = available(CARDIO_IDS, profile)
  const lifts = profile.equipment !== 'none'
  const compounds = EXERCISES.filter((e) => e.compound && e.mode === 'reps_weight' && canDo(e, profile)).map((e) => e.id)
  const goal: Goal = profile.goal

  const sets = (n: number): TrialChallenge => ({
    id: 'sets',
    description: `Complete ${n} sets in one workout.`,
    kind: 'sets',
    target: n,
  })
  const cardioMin = (min: number): TrialChallenge => ({
    id: 'cardio',
    description: `Do ${min} minutes of cardio in one workout.`,
    kind: 'time',
    target: min * 60,
    exerciseIds: cardio,
  })

  switch (goal) {
    case 'strength':
      if (lifts && compounds.length > 0)
        return [
          {
            id: 'volume',
            description: `Lift ${(3000 * (1 + r)).toLocaleString()} kg total volume in one workout.`,
            kind: 'volume',
            target: 3000 * (1 + r),
          },
          {
            id: 'compound',
            description: `Complete ${5 + r} sets of big compound lifts in one workout.`,
            kind: 'sets',
            target: 5 + r,
            exerciseIds: compounds,
          },
        ]
      return [sets(14 + 2 * r), { id: 'variety', description: `Train ${4 + Math.floor(r / 2)} different exercises in one workout.`, kind: 'variety', target: 4 + Math.floor(r / 2) }]
    case 'muscle':
      return [
        sets(16 + 2 * r),
        { id: 'variety', description: `Train ${5 + Math.floor(r / 2)} different exercises in one workout.`, kind: 'variety', target: 5 + Math.floor(r / 2) },
      ]
    case 'fat_loss':
      return [cardioMin(20 + 5 * r), sets(10 + 2 * r)]
    case 'endurance':
      return [
        cardioMin(25 + 5 * r),
        { id: 'plank', description: `Hold a plank for ${3 + r} minutes in total in one workout.`, kind: 'time', target: (3 + r) * 60, exerciseIds: ['plank'] },
      ]
    case 'general':
      return [sets(14 + 2 * r), cardioMin(10 + 3 * r)]
  }
}

/** Best single-workout progress for each challenge since the trial unlocked. */
export function trialProgress(challenges: TrialChallenge[], workouts: Workout[], since: number): number[] {
  const recent = workouts.filter((w) => w.finishedAt >= since)
  return challenges.map((c) => recent.reduce((best, w) => Math.max(best, questProgress(c, [w])), 0))
}
