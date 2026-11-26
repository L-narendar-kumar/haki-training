import { describe, expect, it } from 'vitest'
import { EXERCISE_BY_ID } from '../data/exercises'
import type { GameState, Profile } from '../types'
import {
  addExercise,
  addSet,
  allocateStat,
  claimQuest,
  claimTrial,
  currentTrial,
  finishWorkout,
  newGame,
  rollover,
  setPlan,
  startPlannedWorkout,
  startWorkout,
} from './engine'
import { canDo, generateRulePlan, sanitizePlan, scaledTarget } from './planner'
import { grantXp, levelCap, rankName, workoutStatGains, workoutXp, xpToNext } from './progression'
import { generateDailyQuests, questProgress } from './quests'
import { localDate } from './util'

const DAY = 24 * 60 * 60 * 1000
// Thu 26 Nov 2026, 09:00 local
const T0 = new Date(2026, 10, 26, 9, 0).getTime()

const PROFILE: Profile = {
  name: 'Test',
  goal: 'muscle',
  experience: 'intermediate',
  age: 25,
  sex: 'male',
  heightCm: 175,
  weightKg: 72,
  targetWeightKg: null,
  equipment: 'gym',
  trainingDays: [1, 2, 3, 4, 5, 6, 0], // trimmed below; every day trains unless a test says otherwise
  sessionMinutes: 60,
  limitations: [],
}

function game(over: Partial<Profile> = {}, now = T0): GameState {
  const profile = { ...PROFILE, trainingDays: [1, 3, 4, 5], ...over }
  return newGame(profile, generateRulePlan(profile, now), now)
}

function logWorkout(s: GameState, exerciseId: string, sets: [number, number][], now: number) {
  let st = addExercise(startWorkout(s, now), exerciseId)
  for (const [reps, weight] of sets) st = addSet(st, 0, { reps, weight })
  return finishWorkout(st, now)
}

describe('rule-based planner', () => {
  it('respects equipment and limitations', () => {
    const profile = { ...PROFILE, equipment: 'none' as const, limitations: ['knees' as const], trainingDays: [1, 3, 5] }
    const plan = generateRulePlan(profile, T0)
    const ids = plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(canDo(EXERCISE_BY_ID[id], profile)).toBe(true)
    expect(ids).not.toContain('squat_bw')
    expect(ids).not.toContain('bench_press')
  })

  it('picks a split by days per week and maps it onto chosen weekdays', () => {
    expect(generateRulePlan({ ...PROFILE, trainingDays: [1, 3, 5] }).days).toHaveLength(3)
    const ul = generateRulePlan({ ...PROFILE, trainingDays: [1, 2, 4, 5] })
    expect(ul.days.map((d) => d.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B'])
    expect(ul.schedule).toEqual([null, 0, 1, null, 2, 3, null])
  })

  it('adds a cardio finisher for fat loss and fits the session length', () => {
    const plan = generateRulePlan({ ...PROFILE, goal: 'fat_loss', sessionMinutes: 30, trainingDays: [1, 3, 5] })
    for (const d of plan.days) {
      expect(d.exercises.length).toBeLessThanOrEqual(4)
      expect(EXERCISE_BY_ID[d.exercises.at(-1)!.exerciseId].category).toBe('cardio')
    }
  })

  it('uses heavier, lower-rep work for strength', () => {
    const plan = generateRulePlan({ ...PROFILE, goal: 'strength', trainingDays: [1, 3, 5] })
    const squat = plan.days[0].exercises.find((e) => e.exerciseId === 'back_squat')!
    expect(squat.reps).toBe(5)
  })
})

describe('AI plan sanitising', () => {
  it('drops unknown or unsafe exercises and clamps numbers', () => {
    const profile = { ...PROFILE, equipment: 'dumbbells' as const, trainingDays: [1, 4] }
    const plan = sanitizePlan(
      {
        name: 'X',
        summary: 'Y',
        days: [
          {
            name: 'A',
            exercises: [
              { exerciseId: 'bench_press', sets: 3, reps: 8 }, // needs a gym
              { exerciseId: 'made_up', sets: 3, reps: 8 },
              { exerciseId: 'goblet_squat', sets: 99, reps: 500 },
            ],
          },
          { name: 'B', exercises: [{ exerciseId: 'plank', sets: 3, reps: 45 }] },
          { name: 'C (too many days)', exercises: [{ exerciseId: 'pushup', sets: 3, reps: 10 }] },
        ],
      },
      profile,
      T0,
    )!
    expect(plan.days).toHaveLength(2)
    expect(plan.days[0].exercises).toEqual([{ exerciseId: 'goblet_squat', sets: 6, reps: 50 }])
    expect(plan.source).toBe('ai')
  })

  it('returns null when nothing usable remains', () => {
    expect(sanitizePlan({ name: '', summary: '', days: [{ name: 'A', exercises: [] }] }, PROFILE)).toBeNull()
  })
})

describe('progression', () => {
  it('levels up and stops at the rank cap, unlocking the trial', () => {
    const s = game()
    let total = 0
    for (let l = 1; l < 15; l++) total += xpToNext(l)
    const { player, events } = grantXp(s.player, total, 'test', T0)
    expect(player.level).toBe(levelCap(0)) // 10
    expect(player.rank).toBe(0)
    expect(player.trialUnlockedAt).toBe(T0)
    expect(events.some((e) => e.type === 'trialReady')).toBe(true)
  })

  it('weights workout xp by goal', () => {
    const cardio = [{ exerciseId: 'run', sets: [{ reps: 1800, weight: 0 }] }]
    expect(workoutXp(cardio, 'endurance', false)).toBeGreaterThan(workoutXp(cardio, 'strength', false))
    const lift = [{ exerciseId: 'deadlift', sets: Array(5).fill({ reps: 5, weight: 100 }) }]
    expect(workoutXp(lift, 'strength', false)).toBeGreaterThan(workoutXp(lift, 'endurance', false))
  })

  it('grows the trained stat and the goal stat', () => {
    const entries = [{ exerciseId: 'bench_press', sets: Array(4).fill({ reps: 8, weight: 60 }) }]
    expect(workoutStatGains(entries, 'strength')).toEqual({ str: 2 })
    expect(workoutStatGains(entries, 'endurance')).toEqual({ str: 1 })
  })

  it('scales plan targets with rank and level', () => {
    const pe = { exerciseId: 'pushup', sets: 3, reps: 10 }
    expect(scaledTarget(pe, 1, 0)).toEqual(pe)
    const later = scaledTarget(pe, 25, 2)
    expect(later.sets).toBe(4)
    expect(later.reps).toBeGreaterThan(10)
    // weighted lifts keep reps (progress by adding weight) but gain sets
    expect(scaledTarget({ exerciseId: 'bench_press', sets: 3, reps: 8 }, 30, 2)).toEqual({ exerciseId: 'bench_press', sets: 4, reps: 8 })
  })
})

describe('daily quests', () => {
  it('come from the plan day on training days', () => {
    const s = game({}, T0) // Thursday is a training day in [1,3,4,5]
    expect(s.daily.restDay).toBe(false)
    expect(s.daily.quests[0].id).toBe('report')
    const dayIds = s.plan.days[s.plan.schedule[4]!].exercises.map((e) => e.exerciseId)
    for (const q of s.daily.quests.slice(1)) expect(dayIds).toContain(q.exerciseIds![0])
  })

  it('give a single recovery quest on rest days', () => {
    const s = game({ trainingDays: [1, 3] }, T0) // Thursday = rest
    expect(s.daily.restDay).toBe(true)
    expect(s.daily.quests.map((q) => q.id)).toEqual(['recovery'])
  })

  it('are stable for a date', () => {
    const s = game()
    const a = generateDailyQuests('2026-11-26', s.plan, s.player, { penalty: false })
    const b = generateDailyQuests('2026-11-26', s.plan, s.player, { penalty: false })
    expect(a).toEqual(b)
  })

  it('track rep progress for the right exercise only', () => {
    const s = game()
    const r = logWorkout(s, 'pushup', [[20, 0], [15, 0]], T0)
    expect(questProgress({ kind: 'reps', exerciseIds: ['pushup'] }, r.state.workouts)).toBe(35)
    expect(questProgress({ kind: 'reps', exerciseIds: ['situp'] }, r.state.workouts)).toBe(0)
  })
})

describe('engine', () => {
  it('finishing a workout grants xp, stats and the first achievement', () => {
    const s = game()
    const r = logWorkout(s, 'bench_press', [[8, 60], [8, 60], [8, 60]], T0)
    expect(r.state.workouts).toHaveLength(1)
    expect(r.state.player.totalXp).toBeGreaterThan(25)
    expect(r.state.player.stats.str).toBe(12) // trained STR, and STR is the muscle goal's stat
    expect(r.state.achievements.first_workout).toBeDefined()
  })

  it('starts a planned session with targets', () => {
    const s = startPlannedWorkout(game(), 0, T0)
    expect(s.active!.entries.length).toBe(s.plan.days[0].exercises.length)
    expect(s.active!.entries[0].target).toMatch(/×/)
  })

  it('clearing every quest gives the bonus and starts a streak', () => {
    let s = game()
    s = { ...s, daily: { ...s.daily, quests: [s.daily.quests[0]] } }
    s = logWorkout(s, 'pushup', [[10, 0]], T0).state
    const r = claimQuest(s, 'report', T0)
    expect(r.state.daily.bonusClaimed).toBe(true)
    expect(r.state.player.streak).toBe(1)
    expect(r.state.player.lastClearDate).toBe(localDate(T0))
  })

  it('penalises a failed training day but not a rest day or the first day', () => {
    // Training every day except Saturday (6).
    const s = game({ trainingDays: [0, 1, 2, 3, 4, 5] }, T0) // Thu
    const fri = rollover(s, T0 + DAY) // first day forgiven
    expect(fri.state.player.penaltyActive).toBe(false)
    const sat = rollover(fri.state, T0 + 2 * DAY) // Friday was a training day, failed
    expect(sat.state.player.penaltyActive).toBe(true)
    expect(sat.state.daily.restDay).toBe(true)

    const restFirst = game({ trainingDays: [1] }, T0) // Thu, Fri are rest days
    const r2 = rollover(rollover(restFirst, T0 + DAY).state, T0 + 2 * DAY)
    expect(r2.state.player.penaltyActive).toBe(false)
  })

  it('the penalty quest lifts the penalty', () => {
    const s0 = game({ trainingDays: [0, 1, 2, 3, 4, 5, 6] }, T0)
    let s = rollover(rollover(s0, T0 + DAY).state, T0 + 2 * DAY).state
    const now = T0 + 2 * DAY
    expect(s.player.penaltyActive).toBe(true)
    s = logWorkout(s, 'plank', [[60, 0], [60, 0]], now).state
    const r = claimQuest(s, 'penalty', now)
    expect(r.state.player.penaltyActive).toBe(false)
    expect(r.state.achievements.penalty_clear).toBeDefined()
  })

  it('rank-up trial: must be passed in one workout, then rank and cap rise', () => {
    let s = game({ goal: 'muscle' })
    let total = 0
    for (let l = 1; l < 12; l++) total += xpToNext(l)
    s = { ...s, player: grantXp(s.player, total, 'x', T0).player }
    const trial = currentTrial(s)!
    expect(trial.from).toBe('E')
    expect(claimTrial(s, T0).state.player.rank).toBe(0) // not passed yet

    // One big workout: 18 sets across 5 exercises.
    let st = startWorkout(s, T0 + 1000)
    const ids = ['bench_press', 'barbell_row', 'back_squat', 'ohp', 'bicep_curl']
    ids.forEach((id, i) => {
      st = addExercise(st, id)
      for (let k = 0; k < (i === 0 ? 6 : 3); k++) st = addSet(st, i, { reps: 8, weight: 40 })
    })
    s = finishWorkout(st, T0 + 2000).state
    expect(currentTrial(s)!.passed).toBe(true)

    const r = claimTrial(s, T0 + 3000)
    expect(rankName(r.state.player.rank)).toBe('D')
    expect(r.state.player.level).toBeGreaterThan(10) // cap lifted, stored XP flows into levels
    expect(r.state.achievements.trial_1).toBeDefined()
    expect(currentTrial(r.state)).toBeNull()
  })

  it('retaking the assessment keeps progress', () => {
    let s = logWorkout(game(), 'pushup', [[10, 0]], T0).state
    const profile = { ...s.profile, goal: 'endurance' as const }
    s = setPlan(s, profile, generateRulePlan(profile, T0))
    expect(s.profile.goal).toBe('endurance')
    expect(s.workouts).toHaveLength(1)
  })

  it('spends stat points', () => {
    let s = game()
    s = { ...s, player: { ...s.player, statPoints: 1 } }
    s = allocateStat(s, 'str')
    expect(s.player.stats.str).toBe(11)
    expect(allocateStat(s, 'str').player.stats.str).toBe(11)
  })
})
