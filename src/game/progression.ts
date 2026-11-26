import type { GameEvent, Player } from '../types'

export const STAT_POINTS_PER_LEVEL = 3

export const RANKS = [
  { rank: 'E', minLevel: 1 },
  { rank: 'D', minLevel: 10 },
  { rank: 'C', minLevel: 20 },
  { rank: 'B', minLevel: 30 },
  { rank: 'A', minLevel: 45 },
  { rank: 'S', minLevel: 60 },
] as const

export type Rank = (typeof RANKS)[number]['rank']

export function rankIndex(level: number): number {
  let idx = 0
  RANKS.forEach((r, i) => {
    if (level >= r.minLevel) idx = i
  })
  return idx
}

export function rankFor(level: number): Rank {
  return RANKS[rankIndex(level)].rank
}

/** Quest targets and rewards scale up with rank. */
export function rankMultiplier(level: number): number {
  return 1 + rankIndex(level) * 0.25
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

/** Grant XP, handling multiple level-ups. Returns a new player and events. */
export function grantXp(
  player: Player,
  amount: number,
  reason: string,
): { player: Player; events: GameEvent[] } {
  const events: GameEvent[] = []
  if (amount <= 0) return { player, events }
  events.push({ type: 'xp', amount, reason })

  let { level, xp, statPoints } = player
  const startRank = rankFor(level)
  xp += amount
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level)
    level += 1
    statPoints += STAT_POINTS_PER_LEVEL
    events.push({ type: 'levelUp', level, points: STAT_POINTS_PER_LEVEL })
  }
  const endRank = rankFor(level)
  if (endRank !== startRank) events.push({ type: 'rankUp', rank: endRank })

  return {
    player: { ...player, level, xp, statPoints, totalXp: player.totalXp + amount },
    events,
  }
}
