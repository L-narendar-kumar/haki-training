import { Bar, SystemWindow } from '../components/ui'
import { ACHIEVEMENT_BY_ID, lifetimeVolume } from '../game/achievements'
import { allocateStat, currentTrial, workoutsOn } from '../game/engine'
import { GOAL_LABEL } from '../game/planner'
import { GOAL_STAT, hakiTier, levelCap, rankName, xpToNext } from '../game/progression'
import { questProgress } from '../game/quests'
import { useGame, useGameState } from '../store'
import type { StatKey } from '../types'

const STATS: { key: StatKey; label: string; hint: string }[] = [
  { key: 'str', label: 'STR', hint: 'Strength' },
  { key: 'agi', label: 'AGI', hint: 'Agility' },
  { key: 'end', label: 'END', hint: 'Endurance' },
  { key: 'vit', label: 'VIT', hint: 'Vitality' },
]

export function Status({ goTo }: { goTo: (tab: 'quests' | 'train') => void }) {
  const s = useGameState()
  const { act } = useGame()
  const p = s.player
  const rank = rankName(p.rank)
  const trial = currentTrial(s)
  const goalStat = GOAL_STAT[s.profile.goal]
  const title = p.title ? ACHIEVEMENT_BY_ID[p.title]?.name : null
  const today = workoutsOn(s, s.daily.date)
  const done = s.daily.quests.filter((q) => q.claimed || questProgress(q, today) >= q.target).length

  return (
    <div className="space-y-4">
      <SystemWindow title="Status" danger={p.penaltyActive}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-2xl font-bold">{p.name}</div>
            <div className="text-xs text-mute">
              Title: <span className={title ? 'text-gold' : ''}>{title ?? 'None'}</span>
            </div>
            <div className="text-xs text-mute">
              Haki: <span className="text-ink">{hakiTier(p.level)}</span>
            </div>
            <div className="text-xs text-mute">
              Goal: <span className="text-ink">{GOAL_LABEL[s.profile.goal]}</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded border border-sys/60 font-display text-3xl font-bold text-sys sys-glow">
              {rank}
            </div>
            <div className="mt-1 text-[10px] tracking-widest text-mute">RANK</div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="font-display">
            <span className="text-sm text-mute">LV.</span>
            <span className="ml-1 text-4xl font-bold text-sys sys-glow">{p.level}</span>
          </div>
          <div className="text-right text-xs text-mute">
            {trial ? 'LEVEL LOCKED' : `${p.xp} / ${xpToNext(p.level)} XP`}
            <div className="text-[10px]">Rank cap: Lv. {Number.isFinite(levelCap(p.rank)) ? levelCap(p.rank) : '∞'}</div>
          </div>
        </div>
        <div className="mt-2">
          <Bar value={p.xp} max={xpToNext(p.level)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded border border-edge px-2 py-1">
            🔥 Streak: <b className="text-gold">{p.streak}</b>
          </span>
          {trial && (
            <button onClick={() => goTo('quests')} className="rounded border border-gold/70 px-2 py-1 text-gold">
              ⚔ Rank-up trial: {trial.from} → {trial.to}
            </button>
          )}
          {p.penaltyActive && (
            <span className="rounded border border-blood/60 px-2 py-1 text-blood">
              ⚠ PENALTY: workout XP −50%
            </span>
          )}
        </div>
      </SystemWindow>

      <SystemWindow
        title="Stats"
        right={
          p.statPoints > 0 ? (
            <span className="text-xs font-semibold text-gold gold-glow">{p.statPoints} points available</span>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {STATS.map(({ key, label, hint }) => (
            <div key={key} className="flex items-center justify-between rounded border border-edge/70 px-3 py-2">
              <div>
                <div className="font-display text-sm font-bold tracking-widest text-mute">
                  {label}
                  {key === goalStat && <span className="ml-1 text-gold" title="Your goal's stat">★</span>}
                </div>
                <div className="font-display text-2xl font-bold">{p.stats[key]}</div>
              </div>
              {p.statPoints > 0 && (
                <button
                  aria-label={`Add point to ${hint}`}
                  className="btn-sys h-9 w-9 text-lg"
                  onClick={() => act((st) => allocateStat(st, key))}
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-mute">
          Stats also grow on their own from training: the stat you train most goes up, and your goal’s stat (★) gets
          an extra boost. Spend points from level-ups, daily clears and trials however you like.
        </p>
      </SystemWindow>

      <SystemWindow title="Daily Quest">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold">
              {done} / {s.daily.quests.length}
            </div>
            <div className="text-xs text-mute">
              {s.daily.bonusClaimed ? 'All cleared. Rest well.' : s.daily.restDay ? 'Rest day: recovery only' : 'objectives ready or done'}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-sys px-3 py-2 text-xs" onClick={() => goTo('quests')}>
              Quests
            </button>
            <button className="btn-sys px-3 py-2 text-xs" onClick={() => goTo('train')}>
              {s.active ? 'Resume' : 'Train'}
            </button>
          </div>
        </div>
      </SystemWindow>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Tile label="Workouts" value={s.workouts.length.toLocaleString()} />
        <Tile label="Volume (kg)" value={Math.round(lifetimeVolume(s)).toLocaleString()} />
        <Tile label="Total XP" value={p.totalXp.toLocaleString()} />
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="sys-window px-2 py-3">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] tracking-wider text-mute uppercase">{label}</div>
    </div>
  )
}
