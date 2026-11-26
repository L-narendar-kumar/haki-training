import type { TrackMode, WorkoutSet } from '../types'

/** Local calendar date as YYYY-MM-DD. */
export function localDate(ts: number = Date.now()): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Shift a YYYY-MM-DD date by n days. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return localDate(dt.getTime())
}

/** Deterministic PRNG seeded by a string (so a day's quests never reshuffle). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export function formatSet(mode: TrackMode, set: WorkoutSet): string {
  if (mode === 'time') return formatSeconds(set.reps)
  if (mode === 'reps') return `${set.reps} reps`
  return `${set.weight} kg × ${set.reps}`
}
