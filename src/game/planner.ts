import { EXERCISE_BY_ID } from '../data/exercises'
import type { Equipment, Exercise, Experience, Goal, Limitation, PlanDay, PlanExercise, Profile, TrainingPlan } from '../types'
import { RANKS } from './progression'
import { formatSeconds } from './util'

export const GOAL_LABEL: Record<Goal, string> = {
  muscle: 'Build muscle',
  fat_loss: 'Lose fat',
  strength: 'Get stronger',
  endurance: 'Improve endurance',
  general: 'General fitness',
}

export const EXPERIENCE_LABEL: Record<Experience, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  gym: 'Full gym',
  dumbbells: 'Home: dumbbells',
  none: 'No equipment',
}

export const LIMITATION_LABEL: Record<Limitation, string> = {
  knees: 'Knees',
  lower_back: 'Lower back',
  shoulders: 'Shoulders',
  wrists: 'Wrists',
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EQUIP_LEVEL: Record<Equipment, number> = { none: 0, dumbbells: 1, gym: 2 }

export function canDo(ex: Exercise, profile: Pick<Profile, 'equipment' | 'limitations'>): boolean {
  return (
    EQUIP_LEVEL[ex.needs] <= EQUIP_LEVEL[profile.equipment] &&
    !ex.avoidFor.some((l) => profile.limitations.includes(l))
  )
}

// ---------- Rule-based generator ----------

/** Movement slots, best option first. The first option you can do is used. */
const SLOTS = {
  squat: ['back_squat', 'goblet_squat', 'squat_bw', 'glute_bridge'],
  hinge: ['deadlift', 'rdl', 'glute_bridge', 'superman'],
  lunge: ['lunge', 'glute_bridge', 'calf_raise'],
  push_h: ['bench_press', 'db_bench', 'pushup', 'db_incline_press'],
  push_incline: ['db_incline_press', 'db_bench', 'pushup'],
  push_v: ['ohp', 'pike_pushup', 'lateral_raise'],
  pull_v: ['pullup', 'lat_pulldown', 'db_row', 'superman'],
  pull_h: ['barbell_row', 'db_row', 'superman'],
  shoulders_iso: ['lateral_raise', 'pike_pushup'],
  biceps: ['bicep_curl'],
  triceps: ['skull_crusher', 'tricep_dip_bench', 'dips'],
  calves: ['calf_raise'],
  core: ['plank', 'hanging_leg_raise', 'situp', 'mountain_climber', 'superman'],
  core2: ['hanging_leg_raise', 'situp', 'mountain_climber', 'plank'],
} as const

type Slot = keyof typeof SLOTS

const CARDIO_OPTIONS = ['run', 'cycling', 'jump_rope', 'walk']

const TEMPLATES: Record<string, Slot[]> = {
  'Full Body A': ['squat', 'push_h', 'pull_v', 'hinge', 'push_v', 'core', 'biceps'],
  'Full Body B': ['hinge', 'push_v', 'pull_h', 'lunge', 'push_incline', 'core2', 'triceps'],
  'Full Body C': ['squat', 'push_incline', 'pull_h', 'lunge', 'shoulders_iso', 'core', 'calves'],
  'Upper A': ['push_h', 'pull_v', 'push_v', 'pull_h', 'biceps', 'triceps', 'shoulders_iso'],
  'Lower A': ['squat', 'hinge', 'lunge', 'calves', 'core', 'core2'],
  'Upper B': ['push_incline', 'pull_h', 'push_v', 'pull_v', 'shoulders_iso', 'triceps', 'biceps'],
  'Lower B': ['hinge', 'squat', 'lunge', 'core2', 'calves', 'core'],
  Push: ['push_h', 'push_v', 'push_incline', 'shoulders_iso', 'triceps', 'core'],
  Pull: ['pull_v', 'pull_h', 'hinge', 'biceps', 'core2'],
  Legs: ['squat', 'hinge', 'lunge', 'calves', 'core'],
}

function splitFor(daysPerWeek: number): { name: string; days: string[] } {
  if (daysPerWeek <= 1) return { name: 'Full Body', days: ['Full Body A'] }
  if (daysPerWeek === 2) return { name: 'Full Body ×2', days: ['Full Body A', 'Full Body B'] }
  if (daysPerWeek === 3) return { name: 'Full Body ×3', days: ['Full Body A', 'Full Body B', 'Full Body C'] }
  if (daysPerWeek === 4) return { name: 'Upper / Lower', days: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] }
  if (daysPerWeek === 5) return { name: 'Push / Pull / Legs + Upper / Lower', days: ['Push', 'Pull', 'Legs', 'Upper A', 'Lower A'] }
  return { name: 'Push / Pull / Legs ×2', days: ['Push', 'Pull', 'Legs'] }
}

/** Sets and reps by goal: [compound sets, compound reps, accessory sets, accessory reps]. */
const VOLUME: Record<Goal, [number, number, number, number]> = {
  strength: [4, 5, 3, 8],
  muscle: [4, 10, 3, 12],
  fat_loss: [3, 12, 3, 15],
  endurance: [3, 15, 2, 20],
  general: [3, 10, 3, 12],
}

const HOLD_SECONDS: Record<Experience, number> = { beginner: 30, intermediate: 45, advanced: 60 }

/** Cardio finisher minutes by goal (0 = none). */
const FINISHER_MIN: Record<Goal, number> = { fat_loss: 15, endurance: 20, general: 10, muscle: 0, strength: 0 }

function exercisesPerSession(minutes: number): number {
  if (minutes <= 30) return 4
  if (minutes <= 45) return 5
  if (minutes <= 60) return 6
  return 7
}

export function prescribe(ex: Exercise, goal: Goal, experience: Experience): PlanExercise {
  const [cSets, cReps, aSets, aReps] = VOLUME[goal]
  let sets = ex.compound ? cSets : aSets
  if (experience === 'beginner') sets = Math.max(2, sets - 1)
  if (experience === 'advanced') sets = Math.min(5, sets + 1)
  if (ex.mode === 'time') return { exerciseId: ex.id, sets, reps: HOLD_SECONDS[experience] }
  let reps = ex.compound ? cReps : aReps
  // Bodyweight moves can't be loaded heavier, so use higher reps for strength.
  if (ex.mode === 'reps' && goal === 'strength') reps = 10
  return { exerciseId: ex.id, sets, reps }
}

export function scheduleFor(trainingDays: number[], dayCount: number): (number | null)[] {
  const schedule: (number | null)[] = Array(7).fill(null)
  ;[...trainingDays].sort((a, b) => a - b).forEach((wd, i) => {
    schedule[wd] = dayCount > 0 ? i % dayCount : null
  })
  return schedule
}

export function generateRulePlan(profile: Profile, now: number = Date.now()): TrainingPlan {
  const split = splitFor(profile.trainingDays.length)
  const finisher = FINISHER_MIN[profile.goal]
  const maxExercises = exercisesPerSession(profile.sessionMinutes) - (finisher > 0 ? 1 : 0)
  const cardio = CARDIO_OPTIONS.map((id) => EXERCISE_BY_ID[id]).find((e) => canDo(e, profile))

  const days: PlanDay[] = split.days.map((name) => {
    const used = new Set<string>()
    const exercises: PlanExercise[] = []
    for (const slot of TEMPLATES[name]) {
      if (exercises.length >= maxExercises) break
      const pick = SLOTS[slot].map((id) => EXERCISE_BY_ID[id]).find((e) => canDo(e, profile) && !used.has(e.id))
      if (!pick) continue
      used.add(pick.id)
      exercises.push(prescribe(pick, profile.goal, profile.experience))
    }
    if (finisher > 0 && cardio) {
      const mins = profile.sessionMinutes <= 30 ? Math.min(finisher, 10) : finisher
      exercises.push({ exerciseId: cardio.id, sets: 1, reps: mins * 60 })
    }
    return { name, exercises }
  })

  return {
    source: 'rules',
    createdAt: now,
    name: split.name,
    summary: `${GOAL_LABEL[profile.goal]} · ${EXPERIENCE_LABEL[profile.experience]} · ${EQUIPMENT_LABEL[profile.equipment]} · ${profile.trainingDays.length} days/week, ~${profile.sessionMinutes} min`,
    days,
    schedule: scheduleFor(profile.trainingDays, days.length),
  }
}

// ---------- Validation for AI-written plans ----------

export interface RawPlan {
  name: string
  summary: string
  days: { name: string; exercises: { exerciseId: string; sets: number; reps: number }[] }[]
}

/**
 * Keep only exercises the app knows and the player can safely do, clamp
 * numbers to sane ranges. Returns null if nothing usable remains.
 */
export function sanitizePlan(raw: RawPlan, profile: Profile, now: number = Date.now()): TrainingPlan | null {
  const maxDays = Math.max(1, profile.trainingDays.length)
  const days: PlanDay[] = []
  for (const d of raw.days ?? []) {
    if (days.length >= maxDays) break
    const seen = new Set<string>()
    const exercises: PlanExercise[] = []
    for (const pe of d.exercises ?? []) {
      const ex = EXERCISE_BY_ID[pe.exerciseId]
      if (!ex || !canDo(ex, profile) || seen.has(ex.id)) continue
      seen.add(ex.id)
      const sets = Math.min(6, Math.max(1, Math.round(Number(pe.sets) || 3)))
      const reps =
        ex.mode === 'time'
          ? Math.min(3600, Math.max(10, Math.round(Number(pe.reps) || 30)))
          : Math.min(50, Math.max(1, Math.round(Number(pe.reps) || 10)))
      exercises.push({ exerciseId: ex.id, sets, reps })
    }
    if (exercises.length > 0) days.push({ name: String(d.name || `Day ${days.length + 1}`).slice(0, 40), exercises })
  }
  if (days.length === 0) return null
  return {
    source: 'ai',
    createdAt: now,
    name: String(raw.name || 'Custom Plan').slice(0, 60),
    summary: String(raw.summary || '').slice(0, 400),
    days,
    schedule: scheduleFor(profile.trainingDays, days.length),
  }
}

// ---------- Progression: targets grow with rank and level ----------

/** Current target for a planned exercise, given the player's rank and level. */
export function scaledTarget(pe: PlanExercise, level: number, rank: number): PlanExercise {
  const ex = EXERCISE_BY_ID[pe.exerciseId]
  const sets = Math.min(6, pe.sets + Math.floor(rank / 2))
  if (!ex || ex.mode === 'reps_weight') return { ...pe, sets } // weighted lifts progress by adding weight
  const levelInRank = Math.max(0, level - RANKS[Math.min(rank, RANKS.length - 1)].minLevel)
  const factor = 1 + 0.08 * rank + 0.015 * levelInRank
  const round = ex.mode === 'time' ? (pe.reps >= 300 ? 60 : 5) : 1
  return { ...pe, sets, reps: Math.max(round, Math.round((pe.reps * factor) / round) * round) }
}

export function formatTarget(pe: PlanExercise): string {
  const ex = EXERCISE_BY_ID[pe.exerciseId]
  if (ex?.mode === 'time') return pe.sets === 1 ? formatSeconds(pe.reps) : `${pe.sets} × ${formatSeconds(pe.reps)}`
  return `${pe.sets} × ${pe.reps}`
}

export function planDayFor(plan: TrainingPlan, weekday: number): PlanDay | null {
  const idx = plan.schedule[weekday]
  return idx === null || idx === undefined ? null : (plan.days[idx] ?? null)
}

export function bmi(profile: Profile): number {
  const m = profile.heightCm / 100
  return m > 0 ? profile.weightKg / (m * m) : 0
}
