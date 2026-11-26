import { useState } from 'react'
import { ExerciseList } from '../components/ExercisePicker'
import { Chip, Modal, SystemWindow } from '../components/ui'
import { PlanView } from '../components/PlanView'
import { CATEGORY_LABEL } from '../data/exercises'
import { addExercise, startPlannedWorkout } from '../game/engine'
import { useGame, useGameState } from '../store'
import type { Exercise, GameState } from '../types'
import { formatSet } from '../game/util'

function personalBest(s: GameState, ex: Exercise): string | null {
  const sets = s.workouts.flatMap((w) => w.entries.filter((e) => e.exerciseId === ex.id).flatMap((e) => e.sets))
  if (sets.length === 0) return null
  const best = sets.reduce((a, b) =>
    ex.mode === 'reps_weight' ? (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a) : b.reps > a.reps ? b : a,
  )
  return formatSet(ex.mode, best)
}

export function Guide({ goTrain }: { goTrain: () => void }) {
  const s = useGameState()
  const { act } = useGame()
  const [view, setView] = useState<'plan' | 'exercises'>('plan')
  const [open, setOpen] = useState<Exercise | null>(null)
  const [weekday] = useState(() => new Date().getDay())

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Chip active={view === 'plan'} onClick={() => setView('plan')}>
          My plan
        </Chip>
        <Chip active={view === 'exercises'} onClick={() => setView('exercises')}>
          Exercises
        </Chip>
      </div>

      {view === 'exercises' ? (
        <SystemWindow title="Exercise Guide">
          <ExerciseList onPick={setOpen} />
        </SystemWindow>
      ) : (
        <SystemWindow title="My Plan">
          <PlanView
            plan={s.plan}
            level={s.player.level}
            rank={s.player.rank}
            today={weekday}
            onExercise={setOpen}
            dayAction={(i) => (
              <button
                className="btn-sys px-3 py-1 text-xs"
                disabled={!!s.active}
                onClick={() => {
                  act((st) => startPlannedWorkout(st, i))
                  goTrain()
                }}
              >
                {s.active ? 'Running' : 'Start'}
              </button>
            )}
          />
          <p className="mt-4 text-[11px] text-mute">
            Targets rise as you level up and jump after each rank-up trial. Change your goal or schedule in Records →
            Profile.
          </p>
        </SystemWindow>
      )}

      {open && (
        <Modal onClose={() => setOpen(null)}>
          <SystemWindow title={open.name} right={<button onClick={() => setOpen(null)} className="text-mute" aria-label="Close">✕</button>}>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-edge px-2 py-0.5">{CATEGORY_LABEL[open.category]}</span>
              <span className="rounded border border-edge px-2 py-0.5">{open.equipment}</span>
            </div>
            <p className="mt-3 text-sm text-mute">
              Works: <span className="text-ink">{open.primary.join(', ')}</span>
            </p>
            {personalBest(s, open) && (
              <p className="mt-1 text-sm text-mute">
                Your best: <span className="font-semibold text-gold">{personalBest(s, open)}</span>
              </p>
            )}
            <h3 className="mt-4 font-display text-sm font-bold tracking-widest text-sys">HOW TO</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
              {open.steps.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
            <h3 className="mt-4 font-display text-sm font-bold tracking-widest text-sys">TIPS</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/85">
              {open.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            {s.active && (
              <button
                className="btn-sys mt-5 w-full py-2"
                onClick={() => {
                  act((st) => addExercise(st, open.id))
                  setOpen(null)
                  goTrain()
                }}
              >
                Add to current workout
              </button>
            )}
          </SystemWindow>
        </Modal>
      )}
    </div>
  )
}
