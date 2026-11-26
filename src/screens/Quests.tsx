import { useEffect, useState } from 'react'
import { Bar, SystemWindow } from '../components/ui'
import { claimQuest, claimTrial, currentTrial, workoutsOn } from '../game/engine'
import { clearBonusXp, questProgress } from '../game/quests'
import { formatSeconds } from '../game/util'
import { useGame, useGameState } from '../store'
import type { QuestKind } from '../types'

function fmt(q: { kind: QuestKind }, n: number): string {
  if (q.kind === 'time') return formatSeconds(n)
  if (q.kind === 'volume') return `${Math.round(n).toLocaleString()} kg`
  return n.toLocaleString()
}

function useTimeToMidnight(): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  const mid = new Date(now)
  mid.setHours(24, 0, 0, 0)
  const mins = Math.max(0, Math.floor((mid.getTime() - now) / 60_000))
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function Quests({ goTrain }: { goTrain: () => void }) {
  const s = useGameState()
  const { act } = useGame()
  const remaining = useTimeToMidnight()
  const today = workoutsOn(s, s.daily.date)
  const trial = currentTrial(s)

  return (
    <div className="space-y-4">
      <SystemWindow title="Daily Quest" right={<span className="text-xs text-mute">resets in {remaining}</span>}>
        <p className="text-sm text-ink/80">
          {s.daily.restDay
            ? 'Rest day. Recover so your body can grow stronger. Skipping recovery carries no penalty.'
            : "Today's quests come from your plan. Progress counts from workouts you finish today."}
        </p>
      </SystemWindow>

      {trial && (
        <SystemWindow title={`Rank-up Trial: ${trial.from} → ${trial.to}`} className="border-gold/60">
          <p className="text-sm text-ink/80">
            Your level is locked until you prove yourself. Each challenge must be met within <b>a single workout</b>.
          </p>
          <ul className="mt-3 space-y-3">
            {trial.challenges.map((c, i) => (
              <li key={c.id}>
                <div className="flex justify-between gap-3 text-sm">
                  <span>{c.description}</span>
                  <span className="shrink-0 text-xs tabular-nums text-mute">
                    {fmt(c, Math.min(trial.progress[i], c.target))} / {fmt(c, c.target)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar value={trial.progress[i]} max={c.target} />
                </div>
              </li>
            ))}
          </ul>
          <button
            className="btn-sys mt-4 w-full py-2.5"
            disabled={!trial.passed}
            onClick={() => act((st) => claimTrial(st))}
          >
            {trial.passed ? `Claim Rank ${trial.to}  (+${trial.xp} XP)` : 'Trial in progress'}
          </button>
        </SystemWindow>
      )}

      {s.daily.quests.map((q) => {
        const prog = questProgress(q, today)
        const ready = prog >= q.target
        return (
          <SystemWindow key={q.id} danger={q.penalty} className={q.claimed ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`font-display text-lg font-bold ${q.penalty ? 'text-blood' : ''}`}>{q.title}</div>
                <p className="text-sm text-ink/80">{q.description}</p>
              </div>
              <div className="shrink-0 text-right">
                {q.xp > 0 ? (
                  <span className="font-display font-bold text-gold">+{q.xp} XP</span>
                ) : (
                  <span className="text-xs text-blood">Lifts penalty</span>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <Bar value={prog} max={q.target} danger={q.penalty} />
              </div>
              <span className="w-28 text-right text-xs tabular-nums text-mute">
                {fmt(q, Math.min(prog, q.target))} / {fmt(q, q.target)}
              </span>
            </div>
            <div className="mt-3">
              {q.claimed ? (
                <div className="text-center font-display text-sm font-bold tracking-widest text-ok">✓ COMPLETE</div>
              ) : ready ? (
                <button className="btn-sys w-full py-2" onClick={() => act((st) => claimQuest(st, q.id))}>
                  Claim reward
                </button>
              ) : (
                <button className="w-full py-2 text-xs tracking-widest text-mute uppercase" onClick={goTrain}>
                  Go train →
                </button>
              )}
            </div>
          </SystemWindow>
        )
      })}

      <SystemWindow title="Clear Reward">
        {s.daily.bonusClaimed ? (
          <p className="text-sm text-ok">Received. Come back tomorrow for new quests.</p>
        ) : (
          <>
            <ul className="space-y-1 text-sm">
              <li>
                ◆ <span className="text-gold">+{clearBonusXp(s.player.rank)} XP</span>
              </li>
              <li>◆ +1 stat point</li>
              <li>◆ Streak +1</li>
            </ul>
            <p className="mt-3 text-xs text-blood/90">
              {s.daily.restDay
                ? 'Rest days never cause a penalty.'
                : '⚠ WARNING: Failing to clear the daily quests will result in a penalty.'}
            </p>
          </>
        )}
      </SystemWindow>
    </div>
  )
}
