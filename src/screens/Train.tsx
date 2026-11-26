import { useEffect, useState } from 'react'
import { ExerciseList } from '../components/ExercisePicker'
import { Modal, SystemWindow } from '../components/ui'
import { EXERCISE_BY_ID } from '../data/exercises'
import {
  addExercise,
  addSet,
  cancelWorkout,
  finishWorkout,
  removeExercise,
  removeSet,
  startPlannedWorkout,
  startWorkout,
  todaysPlanIndex,
} from '../game/engine'
import { workoutXp } from '../game/progression'
import { formatSet } from '../game/util'
import { useGame, useGameState } from '../store'
import type { WorkoutEntry, WorkoutSet } from '../types'

function useElapsed(since: number): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const secs = Math.max(0, Math.floor((now - since) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Train() {
  const s = useGameState()
  const { act } = useGame()

  if (!s.active) {
    const todayIdx = todaysPlanIndex(s)
    const today = todayIdx !== null ? s.plan.days[todayIdx] : null
    return (
      <div className="space-y-4">
        <SystemWindow title="Today">
          {today ? (
            <>
              <div className="font-display text-xl font-bold">{today.name}</div>
              <div className="mt-1 text-xs text-mute">
                {today.exercises.map((e) => EXERCISE_BY_ID[e.exerciseId]?.name).join(' · ')}
              </div>
              <button
                className="btn-sys mt-4 w-full py-3"
                onClick={() => act((st) => startPlannedWorkout(st, todayIdx!))}
              >
                Start today&rsquo;s session
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink/80">
                Rest day. Do a light walk or stretch for the recovery quest, or train anyway if you feel good.
              </p>
              <button
                className="btn-sys mt-4 w-full py-3"
                onClick={() =>
                  act((st) => addExercise(addExercise(startWorkout(st), 'walk'), 'mobility_flow'))
                }
              >
                Start recovery session
              </button>
            </>
          )}
        </SystemWindow>

        <SystemWindow title="Other sessions">
          <div className="space-y-2">
            {s.plan.days.map((day, i) =>
              i === todayIdx ? null : (
                <button
                  key={i}
                  className="w-full rounded border border-edge/70 p-3 text-left active:bg-sys/10"
                  onClick={() => act((st) => startPlannedWorkout(st, i))}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {String.fromCharCode(65 + i)} · {day.name}
                    </span>
                    <span className="text-xs text-sys">Start ›</span>
                  </div>
                </button>
              ),
            )}
            <button
              className="w-full rounded border border-dashed border-edge/70 p-3 text-left text-sm text-mute"
              onClick={() => act((st) => startWorkout(st))}
            >
              + Empty workout
            </button>
          </div>
        </SystemWindow>
      </div>
    )
  }

  return <ActiveWorkout />
}

function ActiveWorkout() {
  const s = useGameState()
  const { act } = useGame()
  const active = s.active!
  const elapsed = useElapsed(active.startedAt)
  const [picking, setPicking] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const sets = active.entries.reduce((n, e) => n + e.sets.length, 0)

  return (
    <div className="space-y-4 pb-4">
      <SystemWindow
        title="In Training"
        right={<span className="font-display text-lg font-bold tabular-nums text-sys sys-glow">{elapsed}</span>}
      >
        <div className="flex justify-between text-sm text-mute">
          <span>
            {active.entries.length} exercises · {sets} sets
          </span>
          <span>
            Reward:{' '}
            <span className="text-gold">+{workoutXp(active.entries, s.profile.goal, s.player.penaltyActive)} XP</span>
          </span>
        </div>
      </SystemWindow>

      {active.entries.map((entry, i) => (
        <EntryCard key={`${entry.exerciseId}-${i}`} entry={entry} index={i} />
      ))}

      <button className="btn-sys w-full py-3" onClick={() => setPicking(true)}>
        + Add exercise
      </button>

      <div className="grid grid-cols-3 gap-3">
        <button
          className="rounded border border-blood/50 py-3 text-sm font-semibold text-blood"
          onClick={() => setConfirmDiscard(true)}
        >
          Discard
        </button>
        <button
          className="btn-sys col-span-2 py-3"
          disabled={sets === 0}
          onClick={() => act((st) => finishWorkout(st))}
        >
          Finish workout
        </button>
      </div>

      {picking && (
        <Modal onClose={() => setPicking(false)}>
          <SystemWindow title="Add exercise">
            <ExerciseList
              actionLabel="Add +"
              onPick={(e) => {
                act((st) => addExercise(st, e.id))
                setPicking(false)
              }}
            />
          </SystemWindow>
        </Modal>
      )}

      {confirmDiscard && (
        <Modal onClose={() => setConfirmDiscard(false)}>
          <SystemWindow title="Discard workout?" danger>
            <p className="text-sm">All sets in this session will be lost and no XP will be granted.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn-sys py-2" onClick={() => setConfirmDiscard(false)}>
                Keep
              </button>
              <button
                className="rounded border border-blood py-2 font-semibold text-blood"
                onClick={() => {
                  act(cancelWorkout)
                  setConfirmDiscard(false)
                }}
              >
                Discard
              </button>
            </div>
          </SystemWindow>
        </Modal>
      )}
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: number
}) {
  return (
    <label className="flex-1">
      <span className="text-[10px] tracking-widest text-mute uppercase">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-edge bg-void/60 px-2 py-2 text-center text-lg tabular-nums outline-none focus:border-sys"
      />
    </label>
  )
}

function EntryCard({ entry, index }: { entry: WorkoutEntry; index: number }) {
  const { act } = useGame()
  const ex = EXERCISE_BY_ID[entry.exerciseId]
  const last = entry.sets.at(-1)
  const [reps, setReps] = useState(last ? String(ex.mode === 'time' ? 0 : last.reps) : '')
  const [weight, setWeight] = useState(last ? String(last.weight) : '')
  const [min, setMin] = useState(last && ex.mode === 'time' ? String(Math.floor(last.reps / 60)) : '')
  const [sec, setSec] = useState(last && ex.mode === 'time' ? String(last.reps % 60) : '')

  const value: WorkoutSet | null = (() => {
    if (ex.mode === 'time') {
      const total = Math.round((Number(min) || 0) * 60 + (Number(sec) || 0))
      return total > 0 ? { reps: total, weight: 0 } : null
    }
    const r = Math.round(Number(reps))
    if (!r || r <= 0) return null
    const w = ex.mode === 'reps_weight' ? Number(weight) || 0 : 0
    return { reps: r, weight: Math.max(0, w) }
  })()

  return (
    <SystemWindow>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg font-bold">{ex.name}</div>
          <div className="text-xs text-mute">{ex.primary.join(', ')}</div>
          {entry.target && (
            <div className="mt-1 text-xs">
              Target: <span className="font-semibold text-gold">{entry.target}</span>
              <span className="text-mute"> · {entry.sets.length} done</span>
            </div>
          )}
        </div>
        <button
          aria-label={`Remove ${ex.name}`}
          className="px-2 text-mute"
          onClick={() => act((st) => removeExercise(st, index))}
        >
          ✕
        </button>
      </div>

      {entry.sets.length > 0 && (
        <ol className="mt-3 space-y-1">
          {entry.sets.map((set, j) => (
            <li key={j} className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-1.5 text-sm">
              <span className="text-mute">Set {j + 1}</span>
              <span className="tabular-nums">{formatSet(ex.mode, set)}</span>
              <button
                aria-label={`Remove set ${j + 1}`}
                className="px-1 text-xs text-mute"
                onClick={() => act((st) => removeSet(st, index, j))}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex items-end gap-2">
        {ex.mode === 'time' ? (
          <>
            <NumField label="Min" value={min} onChange={setMin} />
            <NumField label="Sec" value={sec} onChange={setSec} />
          </>
        ) : (
          <>
            {ex.mode === 'reps_weight' && <NumField label="kg" value={weight} onChange={setWeight} step={0.5} />}
            <NumField label="Reps" value={reps} onChange={setReps} />
          </>
        )}
        <button
          className="btn-sys h-[46px] px-4 text-sm"
          disabled={!value}
          onClick={() => value && act((st) => addSet(st, index, value))}
        >
          + Set
        </button>
      </div>
    </SystemWindow>
  )
}
