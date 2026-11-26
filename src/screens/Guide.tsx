import { useState } from 'react'
import { ExerciseList } from '../components/ExercisePicker'
import { Chip, Modal, SystemWindow } from '../components/ui'
import { CATEGORY_LABEL, EXERCISE_BY_ID, PLANS } from '../data/exercises'
import { addExercise, startWorkout } from '../game/engine'
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
  const [view, setView] = useState<'exercises' | 'plans'>('exercises')
  const [open, setOpen] = useState<Exercise | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Chip active={view === 'exercises'} onClick={() => setView('exercises')}>
          Exercises
        </Chip>
        <Chip active={view === 'plans'} onClick={() => setView('plans')}>
          Training plans
        </Chip>
      </div>

      {view === 'exercises' ? (
        <SystemWindow title="Exercise Guide">
          <ExerciseList onPick={setOpen} />
        </SystemWindow>
      ) : (
        PLANS.map((plan) => (
          <SystemWindow key={plan.id} title={plan.name} right={<span className="text-xs text-mute">{plan.level}</span>}>
            <p className="text-sm text-ink/80">{plan.description}</p>
            <p className="mt-1 text-xs text-mute">Frequency: {plan.perWeek}</p>
            {plan.days.map((day) => (
              <div key={day.name} className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold tracking-wider text-sys">{day.name}</h3>
                  <button
                    className="btn-sys px-3 py-1 text-xs"
                    disabled={!!s.active}
                    onClick={() => {
                      act((st) => day.exercises.reduce((acc, ex) => addExercise(acc, ex.id), startWorkout(st)))
                      goTrain()
                    }}
                  >
                    {s.active ? 'Workout running' : 'Start'}
                  </button>
                </div>
                <ul className="mt-2 divide-y divide-edge/40 text-sm">
                  {day.exercises.map((e) => (
                    <li key={e.id}>
                      <button
                        className="flex w-full justify-between py-2 text-left"
                        onClick={() => setOpen(EXERCISE_BY_ID[e.id])}
                      >
                        <span>{EXERCISE_BY_ID[e.id].name}</span>
                        <span className="tabular-nums text-mute">
                          {e.sets} × {e.reps}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </SystemWindow>
        ))
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
