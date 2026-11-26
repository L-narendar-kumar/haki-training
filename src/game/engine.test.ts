import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import {
  addExercise,
  addSet,
  allocateStat,
  claimQuest,
  finishWorkout,
  newGame,
  rollover,
  startWorkout,
} from './engine'
import { grantXp, rankFor, xpToNext } from './progression'
import { generateDailyQuests, questProgress } from './quests'
import { localDate } from './util'

const DAY = 24 * 60 * 60 * 1000
const T0 = new Date(2026, 10, 26, 9, 0).getTime() // 26 Nov 2026, 09:00 local

function logWorkout(s: GameState, exerciseId: string, sets: [number, number][], now: number) {
  let st = addExercise(startWorkout(s, now), exerciseId)
  for (const [reps, weight] of sets) st = addSet(st, 0, { reps, weight })
  return finishWorkout(st, now)
}

describe('progression', () => {
  it('levels up and carries over xp', () => {
    const s = newGame('Test', T0)
    const { player, events } = grantXp(s.player, xpToNext(1) + 10, 'test')
    expect(player.level).toBe(2)
    expect(player.xp).toBe(10)
    expect(player.statPoints).toBe(3)
    expect(events.some((e) => e.type === 'levelUp')).toBe(true)
  })

  it('maps levels to ranks', () => {
    expect(rankFor(1)).toBe('E')
    expect(rankFor(10)).toBe('D')
    expect(rankFor(60)).toBe('S')
  })
})

describe('quests', () => {
  it('are stable for a given date', () => {
    const a = generateDailyQuests('2026-11-26', 1, { penalty: false, canLift: true })
    const b = generateDailyQuests('2026-11-26', 1, { penalty: false, canLift: true })
    expect(a).toEqual(b)
    expect(a.quests).toHaveLength(3)
    expect(a.quests[0].id).toBe('report')
  })

  it('never issues a volume quest to someone who has not lifted', () => {
    for (let d = 1; d <= 28; d++) {
      const q = generateDailyQuests(`2026-02-${String(d).padStart(2, '0')}`, 1, { penalty: false, canLift: false })
      expect(q.quests.some((x) => x.kind === 'volume')).toBe(false)
    }
  })

  it('tracks rep progress from logged workouts', () => {
    const s = newGame('Test', T0)
    const r = logWorkout(s, 'pushup', [[20, 0], [15, 0]], T0)
    const quest = { ...s.daily.quests[0], kind: 'reps' as const, exerciseIds: ['pushup'], target: 30 }
    expect(questProgress(quest, r.state.workouts)).toBe(35)
  })
})

describe('engine', () => {
  it('finishing a workout grants xp and the first achievement', () => {
    const s = newGame('Test', T0)
    const r = logWorkout(s, 'pushup', [[10, 0], [10, 0]], T0)
    expect(r.state.workouts).toHaveLength(1)
    expect(r.state.player.totalXp).toBe(35)
    expect(r.state.achievements.first_workout).toBeDefined()
  })

  it('refuses to finish an empty workout', () => {
    const s = addExercise(startWorkout(newGame('Test', T0), T0), 'pushup')
    const r = finishWorkout(s, T0)
    expect(r.state.workouts).toHaveLength(0)
    expect(r.events[0].type).toBe('info')
  })

  it('claims the report quest after a workout, not before', () => {
    const s = newGame('Test', T0)
    expect(claimQuest(s, 'report', T0).state.daily.quests[0].claimed).toBe(false)
    const r = logWorkout(s, 'pushup', [[10, 0]], T0)
    expect(claimQuest(r.state, 'report', T0).state.daily.quests[0].claimed).toBe(true)
  })

  it('clearing every quest gives the bonus and starts a streak', () => {
    let s = newGame('Test', T0)
    // Force simple quests so the test controls them.
    s = {
      ...s,
      daily: {
        ...s.daily,
        quests: [{ ...s.daily.quests[0] }],
      },
    }
    s = logWorkout(s, 'pushup', [[10, 0]], T0).state
    const r = claimQuest(s, 'report', T0)
    expect(r.state.daily.bonusClaimed).toBe(true)
    expect(r.state.player.streak).toBe(1)
    expect(r.state.player.lastClearDate).toBe(localDate(T0))
  })

  it('issues a penalty after a failed day (but not after the first day)', () => {
    const s = newGame('Test', T0)
    const day2 = rollover(s, T0 + DAY)
    expect(day2.state.player.penaltyActive).toBe(false) // first day is forgiven
    const day3 = rollover(day2.state, T0 + 2 * DAY)
    expect(day3.state.player.penaltyActive).toBe(true)
    expect(day3.state.daily.quests.some((q) => q.penalty)).toBe(true)
  })

  it('halves workout xp while a penalty is active and clears it with the penalty quest', () => {
    let s = rollover(rollover(newGame('Test', T0), T0 + DAY).state, T0 + 2 * DAY).state
    const now = T0 + 2 * DAY
    const before = s.player.totalXp
    s = logWorkout(s, 'burpee', [[30, 0]], now).state
    expect(s.player.totalXp - before).toBe(15) // (25 + 5) / 2
    const r = claimQuest(s, 'penalty', now)
    expect(r.state.player.penaltyActive).toBe(false)
    expect(r.state.achievements.penalty_clear).toBeDefined()
  })

  it('spends stat points', () => {
    let s = newGame('Test', T0)
    s = { ...s, player: { ...s.player, statPoints: 1 } }
    s = allocateStat(s, 'str')
    expect(s.player.stats.str).toBe(11)
    expect(allocateStat(s, 'str').player.stats.str).toBe(11)
  })
})
